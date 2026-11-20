-- =====================================================================
-- Start-up Quest : mode multijoueur (PRD Multijoueur v0.1)
-- Source de vérité de la partie : machine d'état, équipes, scoring,
-- classement, fin de partie, jury, podium, export.
--
-- Sécurité :
--   * les tables vivent dans le schéma privé « jeu », non exposé par l'API ;
--   * RLS activée sans aucune policy : aucun accès direct aux tables ;
--   * les clients (clé anon) n'appellent que des fonctions RPC contrôlées ;
--   * le scoring (enregistrer_reponse) n'est exécutable que par la
--     fonction serveur « repondre » (service_role) : une équipe ne peut
--     jamais fixer elle-même son verdict ni sa valorisation ;
--   * codes admin et jetons d'équipe stockés uniquement sous forme hachée.
-- =====================================================================

create schema if not exists jeu;
revoke all on schema jeu from public;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table if not exists jeu.config (
  cle    text primary key,
  valeur text not null
);

create table if not exists jeu.sessions (
  id                 uuid primary key default gen_random_uuid(),
  nom                text not null check (char_length(nom) between 1 and 80),
  code_salon         text not null unique,
  admin_sel          text not null,
  admin_hash         text not null,
  statut             text not null default 'LOBBY'
                     check (statut in ('LOBBY','RUNNING','PAUSED','FINISHED','AWARDING','PUBLISHED','CANCELLED')),
  max_equipes        int  not null default 12 check (max_equipes between 1 and 50),
  duree_min          int  not null default 55 check (duree_min between 1 and 600),
  regles             jsonb not null,
  visibilite         text not null default 'TOP3' check (visibilite in ('TOP3','COMPLET','AUCUN')),
  autoriser_doublons boolean not null default false,
  qualifies          uuid[] not null default '{}',
  started_at         timestamptz,
  deadline           timestamptz,
  paused_at          timestamptz,
  finished_at        timestamptz,
  finished_reason    text,
  awarding_at        timestamptz,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  rules_version      text not null default 'v0.1'
);

create table if not exists jeu.equipes (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references jeu.sessions(id) on delete cascade,
  entreprise         text not null check (char_length(entreprise) between 1 and 40),
  entreprise_norm    text not null,
  membres            text[] not null default '{}',
  produit            text not null default '',
  objectif           text not null default '',
  token_hash         text not null unique,
  prete              boolean not null default false,
  lieu_courant       text,
  valorisation       bigint not null,
  bonus_jury_pct     int check (bonus_jury_pct between -10 and 10),
  valorisation_finale bigint,
  lieux_valides      text[] not null default '{}',
  tentatives         jsonb not null default '{}'::jsonb,
  reponses           jsonb not null default '{}'::jsonb,
  last_seen_at       timestamptz not null default now(),
  derniere_action_at timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists equipes_session_idx on jeu.equipes(session_id);

create table if not exists jeu.evenements (
  id                bigserial primary key,
  session_id        uuid not null references jeu.sessions(id) on delete cascade,
  equipe_id         uuid not null references jeu.equipes(id) on delete cascade,
  client_action_id  uuid not null,
  type              text not null,
  lieu              text,
  tentative         int,
  verdict           text,
  score             int,
  reponse           text,
  details           jsonb not null default '{}'::jsonb,
  delta             bigint not null default 0,
  valorisation_apres bigint not null,
  created_at        timestamptz not null default now(),
  unique (equipe_id, client_action_id)
);
create index if not exists evenements_session_idx on jeu.evenements(session_id, created_at);

create table if not exists jeu.actions_admin (
  id         bigserial primary key,
  session_id uuid not null references jeu.sessions(id) on delete cascade,
  action_id  uuid not null,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  auteur     text not null default 'Animateur',
  created_at timestamptz not null default now(),
  unique (session_id, action_id)
);

alter table jeu.config        enable row level security;
alter table jeu.sessions      enable row level security;
alter table jeu.equipes       enable row level security;
alter table jeu.evenements    enable row level security;
alter table jeu.actions_admin enable row level security;

-- ---------------------------------------------------------------------
-- Utilitaires internes (non exposés)
-- ---------------------------------------------------------------------
create or replace function jeu._hash(p_sel text, p_secret text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(p_sel || ':' || p_secret, 'UTF8')), 'hex')
$$;

-- Code lisible (sans I, O, 0, 1), tiré d'un générateur cryptographique.
create or replace function jeu._code(p_len int) returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  res text := '';
  b bytea;
  i int;
begin
  for i in 1..p_len loop
    b := uuid_send(gen_random_uuid());
    res := res || substr(alphabet, (get_byte(b, 0) % 32) + 1, 1);
  end loop;
  return res;
end $$;

create or replace function jeu._jeton() returns text
language sql volatile as $$
  select encode(uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()), 'hex')
$$;

create or replace function jeu._norm(p text) returns text
language sql immutable as $$
  select lower(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'))
$$;

create or replace function jeu._erreur(p_code text) returns void
language plpgsql as $$
begin
  raise exception '%', p_code using errcode = 'P0001';
end $$;

-- Fin automatique au minuteur : appliquée à chaque appel (pas de cron nécessaire).
create or replace function jeu._maj_temps(p_session uuid) returns void
language plpgsql as $$
declare s jeu.sessions; n int;
begin
  select * into s from jeu.sessions where id = p_session;
  if s.statut = 'RUNNING' and s.deadline is not null and now() >= s.deadline then
    update jeu.sessions
       set statut = 'FINISHED', finished_at = s.deadline, finished_reason = 'TEMPS'
     where id = p_session and statut = 'RUNNING' and now() >= deadline;
    get diagnostics n = row_count;
    if n = 0 then return; end if;
    insert into jeu.actions_admin(session_id, action_id, type, auteur)
    values (p_session, gen_random_uuid(), 'FIN_AUTO_MINUTEUR', 'Système');
  end if;
end $$;

create or replace function jeu._session_admin(p_code_salon text, p_code_admin text) returns jeu.sessions
language plpgsql as $$
declare s jeu.sessions;
begin
  select * into s from jeu.sessions where code_salon = upper(trim(p_code_salon)) for update;
  if not found or s.admin_hash <> jeu._hash(s.admin_sel, upper(trim(coalesce(p_code_admin, '')))) then
    perform jeu._erreur('ACCES_ADMIN_REFUSE');
  end if;
  perform jeu._maj_temps(s.id);
  select * into s from jeu.sessions where id = s.id;
  return s;
end $$;

create or replace function jeu._equipe(p_token text) returns jeu.equipes
language plpgsql as $$
declare e jeu.equipes;
begin
  select * into e from jeu.equipes
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
  if not found then perform jeu._erreur('EQUIPE_INCONNUE'); end if;
  return e;
end $$;

-- Gain jury arrondi au millier, sur la valorisation de jeu.
create or replace function jeu._finale(p_valo bigint, p_pct int) returns bigint
language sql immutable as $$
  select p_valo + (round(p_valo * coalesce(p_pct, 0) / 100.0 / 1000.0) * 1000)::bigint
$$;

-- Classement : valorisation finale, puis valorisation de jeu, puis lieux validés.
-- Égalité persistante = même rang (égalité officielle, tranchée par le jury).
create or replace function jeu._classement(p_session uuid, p_avec_jury boolean)
returns table(equipe_id uuid, rang bigint, entreprise text, membres text[],
              valorisation bigint, valorisation_finale bigint, bonus_jury_pct int, nb_lieux int)
language sql stable as $$
  select e.id,
         rank() over (order by
            (case when p_avec_jury then jeu._finale(e.valorisation, e.bonus_jury_pct) else e.valorisation end) desc,
            e.valorisation desc,
            cardinality(e.lieux_valides) desc),
         e.entreprise, e.membres, e.valorisation,
         case when p_avec_jury then jeu._finale(e.valorisation, e.bonus_jury_pct) else null end,
         case when p_avec_jury then e.bonus_jury_pct else null end,
         cardinality(e.lieux_valides)
    from jeu.equipes e
   where e.session_id = p_session
$$;

create or replace function jeu._session_json(s jeu.sessions) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'nom', s.nom, 'code_salon', s.code_salon, 'statut', s.statut,
    'max_equipes', s.max_equipes, 'duree_min', s.duree_min, 'regles', s.regles,
    'visibilite', s.visibilite, 'qualifies', to_jsonb(s.qualifies),
    'started_at', s.started_at, 'deadline', s.deadline, 'paused_at', s.paused_at,
    'finished_at', s.finished_at, 'finished_reason', s.finished_reason,
    'awarding_at', s.awarding_at, 'published_at', s.published_at,
    'rules_version', s.rules_version,
    'regle_egalite', 'Valorisation finale, puis valorisation de jeu, puis nombre de lieux validés. Égalité persistante : égalité officielle, tranchée par le jury.'
  )
$$;

-- ---------------------------------------------------------------------
-- RPC publiques
-- ---------------------------------------------------------------------

-- Création d'un salon : réservée aux détenteurs du code organisateur 5 Degrés.
create or replace function public.creer_salon(
  p_code_organisateur text,
  p_nom text,
  p_max_equipes int default 12,
  p_duree_min int default 55,
  p_valo_depart bigint default 500000,
  p_autoriser_doublons boolean default false
) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare
  v_sel text; v_hash text; v_code text; v_admin text; v_sel_admin text; v_id uuid; i int;
begin
  select valeur into v_sel  from jeu.config where cle = 'organisateur_sel';
  select valeur into v_hash from jeu.config where cle = 'organisateur_hash';
  if v_hash is null or jeu._hash(v_sel, coalesce(p_code_organisateur, '')) <> v_hash then
    perform jeu._erreur('CODE_ORGANISATEUR_INVALIDE');
  end if;
  if coalesce(trim(p_nom), '') = '' then perform jeu._erreur('NOM_SALON_REQUIS'); end if;
  if p_valo_depart is null or p_valo_depart < 0 or p_valo_depart > 100000000 then perform jeu._erreur('PARAMETRE_INVALIDE'); end if;

  for i in 1..20 loop
    v_code := jeu._code(6);
    exit when not exists (select 1 from jeu.sessions where code_salon = v_code);
  end loop;
  v_admin := jeu._code(10);
  v_sel_admin := jeu._jeton();

  insert into jeu.sessions(nom, code_salon, admin_sel, admin_hash, max_equipes, duree_min, regles, autoriser_doublons)
  values (trim(p_nom), v_code, v_sel_admin, jeu._hash(v_sel_admin, v_admin),
          coalesce(p_max_equipes, 12), coalesce(p_duree_min, 55),
          jsonb_build_object('depart', p_valo_depart, 'excellente', 150000, 'correcte', 75000,
                             'malus_pct', 0.05, 'coef', jsonb_build_array(1, 0.6, 0.3),
                             'max_tentatives', 3, 'bonus_jury_min', -10, 'bonus_jury_max', 10),
          coalesce(p_autoriser_doublons, false))
  returning id into v_id;

  insert into jeu.actions_admin(session_id, action_id, type, payload, auteur)
  values (v_id, gen_random_uuid(), 'CREER_SALON', jsonb_build_object('nom', trim(p_nom)), 'Organisateur');

  return jsonb_build_object('code_salon', v_code, 'code_admin', v_admin);
end $$;

-- Rejoindre un salon : renvoie un jeton secret propre à l'équipe (reprise après rechargement).
create or replace function public.rejoindre_salon(
  p_code_salon text, p_entreprise text, p_membres text[], p_produit text default '', p_objectif text default ''
) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare
  s jeu.sessions; v_token text; v_id uuid; v_membres text[];
begin
  select * into s from jeu.sessions where code_salon = upper(trim(coalesce(p_code_salon, ''))) for update;
  if not found then perform jeu._erreur('SALON_INTROUVABLE'); end if;
  perform jeu._maj_temps(s.id);
  select * into s from jeu.sessions where id = s.id;
  if s.statut not in ('LOBBY', 'RUNNING', 'PAUSED') then perform jeu._erreur('SALON_FERME'); end if;
  if char_length(trim(coalesce(p_entreprise, ''))) not between 1 and 40 then perform jeu._erreur('NOM_ENTREPRISE_INVALIDE'); end if;

  select coalesce(array_agg(left(trim(m), 40)), '{}') into v_membres
    from unnest(coalesce(p_membres, '{}')) m where trim(m) <> '';
  if cardinality(v_membres) < 1 or cardinality(v_membres) > 6 then perform jeu._erreur('MEMBRES_INVALIDES'); end if;

  if (select count(*) from jeu.equipes where session_id = s.id) >= s.max_equipes then
    perform jeu._erreur('SALON_COMPLET');
  end if;
  if not s.autoriser_doublons and exists (
       select 1 from jeu.equipes where session_id = s.id and entreprise_norm = jeu._norm(p_entreprise)) then
    perform jeu._erreur('NOM_ENTREPRISE_PRIS');
  end if;

  v_token := jeu._jeton();
  insert into jeu.equipes(session_id, entreprise, entreprise_norm, membres, produit, objectif, token_hash, valorisation)
  values (s.id, trim(p_entreprise), jeu._norm(p_entreprise), v_membres,
          left(trim(coalesce(p_produit, '')), 200), left(trim(coalesce(p_objectif, '')), 300),
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
          (s.regles->>'depart')::bigint)
  returning id into v_id;

  return jsonb_build_object('token', v_token, 'equipe_id', v_id);
end $$;

-- Modifier son entreprise : seulement dans le lobby.
create or replace function public.modifier_equipe(
  p_token text, p_entreprise text, p_membres text[], p_produit text, p_objectif text
) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare e jeu.equipes; s jeu.sessions; v_membres text[];
begin
  e := jeu._equipe(p_token);
  select * into s from jeu.sessions where id = e.session_id for update;
  if s.statut <> 'LOBBY' then perform jeu._erreur('MODIFICATION_FERMEE'); end if;
  if char_length(trim(coalesce(p_entreprise, ''))) not between 1 and 40 then perform jeu._erreur('NOM_ENTREPRISE_INVALIDE'); end if;
  select coalesce(array_agg(left(trim(m), 40)), '{}') into v_membres
    from unnest(coalesce(p_membres, '{}')) m where trim(m) <> '';
  if cardinality(v_membres) < 1 or cardinality(v_membres) > 6 then perform jeu._erreur('MEMBRES_INVALIDES'); end if;
  if not s.autoriser_doublons and exists (
       select 1 from jeu.equipes where session_id = s.id and id <> e.id and entreprise_norm = jeu._norm(p_entreprise)) then
    perform jeu._erreur('NOM_ENTREPRISE_PRIS');
  end if;
  update jeu.equipes
     set entreprise = trim(p_entreprise), entreprise_norm = jeu._norm(p_entreprise), membres = v_membres,
         produit = left(trim(coalesce(p_produit, '')), 200), objectif = left(trim(coalesce(p_objectif, '')), 300)
   where id = e.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.equipe_prete(p_token text, p_prete boolean) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare e jeu.equipes; s jeu.sessions;
begin
  e := jeu._equipe(p_token);
  select * into s from jeu.sessions where id = e.session_id;
  if s.statut <> 'LOBBY' then perform jeu._erreur('LOBBY_FERME'); end if;
  update jeu.equipes set prete = coalesce(p_prete, false), last_seen_at = now() where id = e.id;
  return jsonb_build_object('ok', true);
end $$;

-- Déplacement sur la carte (présence uniquement, sans effet sur le score).
create or replace function public.deplacer_equipe(p_token text, p_lieu text) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare e jeu.equipes; s jeu.sessions;
begin
  e := jeu._equipe(p_token);
  perform jeu._maj_temps(e.session_id);
  select * into s from jeu.sessions where id = e.session_id;
  if s.statut <> 'RUNNING' then perform jeu._erreur('PARTIE_VERROUILLEE'); end if;
  if p_lieu is not null and p_lieu !~ '^[a-z_]{2,40}$' then perform jeu._erreur('LIEU_INVALIDE'); end if;
  update jeu.equipes set lieu_courant = p_lieu, last_seen_at = now() where id = e.id;
  return jsonb_build_object('ok', true);
end $$;

-- État vu par une équipe (sert aussi de signal de présence).
create or replace function public.etat_equipe(p_token text) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare
  e jeu.equipes; s jeu.sessions; v_avec_jury boolean; v_mon_rang bigint;
  v_classement jsonb; v_equipes jsonb; v_complet boolean;
begin
  e := jeu._equipe(p_token);
  perform jeu._maj_temps(e.session_id);
  update jeu.equipes set last_seen_at = now() where id = e.id;
  select * into s from jeu.sessions where id = e.session_id;
  select * into e from jeu.equipes where id = e.id;

  v_avec_jury := s.statut = 'PUBLISHED';
  -- Pendant le jeu : top 3 + son propre rang. Après la fin : classement complet.
  v_complet := s.statut in ('FINISHED', 'AWARDING', 'PUBLISHED') or s.visibilite = 'COMPLET';

  select rang into v_mon_rang from jeu._classement(s.id, v_avec_jury) where equipe_id = e.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'equipe_id', c.equipe_id, 'rang', c.rang, 'entreprise', c.entreprise,
           'membres', to_jsonb(c.membres), 'valorisation', c.valorisation,
           'valorisation_finale', c.valorisation_finale, 'bonus_jury_pct', c.bonus_jury_pct,
           'nb_lieux', c.nb_lieux, 'moi', c.equipe_id = e.id)
         order by c.rang, c.entreprise), '[]'::jsonb)
    into v_classement
    from jeu._classement(s.id, v_avec_jury) c
   where v_complet or (s.visibilite <> 'AUCUN' and (c.rang <= 3 or c.equipe_id = e.id));

  -- Présence des autres équipes (sans valorisation ni réponses).
  select coalesce(jsonb_agg(jsonb_build_object(
           'equipe_id', x.id, 'entreprise', x.entreprise, 'membres', to_jsonb(x.membres),
           'prete', x.prete, 'lieu_courant', x.lieu_courant,
           'en_ligne', x.last_seen_at > now() - interval '20 seconds',
           'moi', x.id = e.id)
         order by x.created_at), '[]'::jsonb)
    into v_equipes
    from jeu.equipes x where x.session_id = s.id;

  return jsonb_build_object(
    'serveur_now', now(),
    'session', jeu._session_json(s),
    'equipe', jsonb_build_object(
      'equipe_id', e.id, 'entreprise', e.entreprise, 'membres', to_jsonb(e.membres),
      'produit', e.produit, 'objectif', e.objectif, 'prete', e.prete,
      'lieu_courant', e.lieu_courant, 'valorisation', e.valorisation,
      'bonus_jury_pct', case when v_avec_jury then e.bonus_jury_pct end,
      'valorisation_finale', case when v_avec_jury then e.valorisation_finale end,
      'lieux_valides', to_jsonb(e.lieux_valides), 'tentatives', e.tentatives,
      'rang', v_mon_rang),
    'equipes', v_equipes,
    'nb_equipes', jsonb_array_length(v_equipes),
    'classement', v_classement
  );
end $$;

-- Contexte nécessaire à l'évaluation (fonction serveur uniquement).
create or replace function public.contexte_equipe(p_token text) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare e jeu.equipes;
begin
  e := jeu._equipe(p_token);
  return jsonb_build_object('equipe_id', e.id, 'produit', e.produit, 'objectif', e.objectif,
                            'reponses', e.reponses, 'tentatives', e.tentatives,
                            'lieux_valides', to_jsonb(e.lieux_valides));
end $$;

-- Enregistrement d'une réponse évaluée (fonction serveur uniquement).
-- Règle des réponses en cours : seule une réponse reçue par le serveur
-- avant le verrouillage (fin manuelle, pause ou minuteur) est comptée ;
-- une réponse refusée ne consomme pas de tentative.
create or replace function public.enregistrer_reponse(
  p_token text, p_client_action_id uuid, p_lieu text, p_reponse text,
  p_verdict text, p_score int, p_details jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare
  e jeu.equipes; s jeu.sessions; ev jeu.evenements;
  t int; coef numeric; d bigint; v_valide boolean; r jsonb; n int;
begin
  e := jeu._equipe(p_token);
  perform jeu._maj_temps(e.session_id);
  select * into s from jeu.sessions where id = e.session_id;
  select * into e from jeu.equipes where id = e.id for update;

  -- Idempotence : une même action n'est jamais comptée deux fois.
  select * into ev from jeu.evenements where equipe_id = e.id and client_action_id = p_client_action_id;
  if found then
    return jsonb_build_object('deja_traite', true, 'tentative', ev.tentative, 'verdict', ev.verdict,
      'score', ev.score, 'delta', ev.delta, 'valorisation', ev.valorisation_apres,
      'valide', p_lieu = any(e.lieux_valides), 'details', ev.details);
  end if;

  if s.statut <> 'RUNNING' or now() >= s.deadline then perform jeu._erreur('PARTIE_VERROUILLEE'); end if;
  if p_lieu is null or p_lieu !~ '^[a-z_]{2,40}$' then perform jeu._erreur('LIEU_INVALIDE'); end if;
  if p_lieu = any(e.lieux_valides) then perform jeu._erreur('LIEU_DEJA_VALIDE'); end if;
  if p_verdict not in ('excellente', 'correcte', 'insuffisante') then perform jeu._erreur('VERDICT_INVALIDE'); end if;
  if coalesce(trim(p_reponse), '') = '' then perform jeu._erreur('REPONSE_VIDE'); end if;

  r := s.regles;
  t := coalesce((e.tentatives->>p_lieu)::int, 0) + 1;
  n := jsonb_array_length(r->'coef');
  coef := (r->'coef'->>(least(t, n) - 1))::numeric;

  if p_verdict in ('excellente', 'correcte') then
    d := (round(((r->>p_verdict)::numeric * coef) / 1000) * 1000)::bigint;
    v_valide := true;
  else
    d := -(round((e.valorisation * (r->>'malus_pct')::numeric) / 1000) * 1000)::bigint;
    v_valide := t >= coalesce((r->>'max_tentatives')::int, 3);
  end if;

  update jeu.equipes
     set valorisation = valorisation + d,
         tentatives = tentatives || jsonb_build_object(p_lieu, t),
         lieux_valides = case when v_valide then array_append(lieux_valides, p_lieu) else lieux_valides end,
         reponses = reponses || jsonb_build_object(p_lieu, left(p_reponse, 4000)),
         lieu_courant = p_lieu, derniere_action_at = now(), last_seen_at = now()
   where id = e.id
  returning * into e;

  insert into jeu.evenements(session_id, equipe_id, client_action_id, type, lieu, tentative, verdict,
                             score, reponse, details, delta, valorisation_apres)
  values (s.id, e.id, p_client_action_id, 'REPONSE_EVALUEE', p_lieu, t, p_verdict,
          p_score, left(p_reponse, 4000), coalesce(p_details, '{}'::jsonb), d, e.valorisation);

  return jsonb_build_object('deja_traite', false, 'tentative', t, 'verdict', p_verdict, 'score', p_score,
                            'delta', d, 'valorisation', e.valorisation, 'valide', v_valide,
                            'details', coalesce(p_details, '{}'::jsonb));
end $$;

-- Vue animateur : supervision complète.
create or replace function public.etat_admin(p_code_salon text, p_code_admin text) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare s jeu.sessions; v_avec_jury boolean; v_equipes jsonb; v_actions jsonb;
begin
  s := jeu._session_admin(p_code_salon, p_code_admin);
  v_avec_jury := s.statut in ('AWARDING', 'PUBLISHED');

  select coalesce(jsonb_agg(jsonb_build_object(
           'equipe_id', e.id, 'entreprise', e.entreprise, 'membres', to_jsonb(e.membres),
           'produit', e.produit, 'objectif', e.objectif, 'prete', e.prete,
           'lieu_courant', e.lieu_courant, 'valorisation', e.valorisation,
           'bonus_jury_pct', e.bonus_jury_pct,
           'valorisation_finale', coalesce(e.valorisation_finale, jeu._finale(e.valorisation, e.bonus_jury_pct)),
           'lieux_valides', to_jsonb(e.lieux_valides), 'tentatives', e.tentatives,
           'rang', c.rang, 'rang_jeu', cj.rang,
           'en_ligne', e.last_seen_at > now() - interval '20 seconds',
           'last_seen_at', e.last_seen_at, 'derniere_action_at', e.derniere_action_at,
           'qualifie', e.id = any(s.qualifies))
         order by c.rang, e.entreprise), '[]'::jsonb)
    into v_equipes
    from jeu.equipes e
    join jeu._classement(s.id, v_avec_jury) c on c.equipe_id = e.id
    join jeu._classement(s.id, false) cj on cj.equipe_id = e.id
   where e.session_id = s.id;

  select coalesce(jsonb_agg(jsonb_build_object('type', a.type, 'payload', a.payload, 'auteur', a.auteur, 'created_at', a.created_at)
         order by a.created_at desc), '[]'::jsonb)
    into v_actions
    from (select * from jeu.actions_admin where session_id = s.id order by created_at desc limit 30) a;

  return jsonb_build_object('serveur_now', now(), 'session', jeu._session_json(s),
                            'equipes', v_equipes, 'actions', v_actions);
end $$;

-- Actions de l'animateur : machine d'état idempotente.
create or replace function public.action_admin(
  p_code_salon text, p_code_admin text, p_action_id uuid, p_type text,
  p_payload jsonb default '{}'::jsonb, p_auteur text default 'Animateur'
) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare
  s jeu.sessions; v_auteur text; v_min int; v_pct int; v_eq uuid; v_deja boolean := false;
begin
  s := jeu._session_admin(p_code_salon, p_code_admin);
  v_auteur := left(coalesce(nullif(trim(p_auteur), ''), 'Animateur'), 60);
  p_payload := coalesce(p_payload, '{}'::jsonb);

  if exists (select 1 from jeu.actions_admin where session_id = s.id and action_id = p_action_id) then
    return jsonb_build_object('ok', true, 'deja_traite', true, 'statut', s.statut);
  end if;

  case p_type
  when 'LANCER' then
    if s.statut = 'RUNNING' then v_deja := true;
    elsif s.statut <> 'LOBBY' then perform jeu._erreur('TRANSITION_INTERDITE');
    elsif not exists (select 1 from jeu.equipes where session_id = s.id) then perform jeu._erreur('AUCUNE_EQUIPE');
    else
      v_min := coalesce((p_payload->>'duree_min')::int, s.duree_min);
      if v_min not between 1 and 600 then perform jeu._erreur('PARAMETRE_INVALIDE'); end if;
      update jeu.sessions set statut = 'RUNNING', started_at = now(), duree_min = v_min,
             deadline = now() + make_interval(mins => v_min) where id = s.id;
    end if;

  when 'PAUSE' then
    if s.statut = 'PAUSED' then v_deja := true;
    elsif s.statut <> 'RUNNING' then perform jeu._erreur('TRANSITION_INTERDITE');
    else update jeu.sessions set statut = 'PAUSED', paused_at = now() where id = s.id;
    end if;

  when 'REPRENDRE' then
    if s.statut = 'RUNNING' then v_deja := true;
    elsif s.statut <> 'PAUSED' then perform jeu._erreur('TRANSITION_INTERDITE');
    else update jeu.sessions set statut = 'RUNNING', deadline = deadline + (now() - paused_at), paused_at = null where id = s.id;
    end if;

  when 'PROLONGER' then
    v_min := coalesce((p_payload->>'minutes')::int, 5);
    if v_min not between 1 and 120 then perform jeu._erreur('PARAMETRE_INVALIDE'); end if;
    if s.statut not in ('RUNNING', 'PAUSED') then perform jeu._erreur('TRANSITION_INTERDITE'); end if;
    update jeu.sessions set deadline = deadline + make_interval(mins => v_min) where id = s.id;

  when 'TERMINER' then
    if s.statut in ('FINISHED', 'AWARDING', 'PUBLISHED') then v_deja := true;
    elsif s.statut not in ('RUNNING', 'PAUSED') then perform jeu._erreur('TRANSITION_INTERDITE');
    else
      update jeu.sessions set statut = 'FINISHED', finished_at = now(), finished_reason = 'ANIMATEUR', paused_at = null
       where id = s.id;
    end if;

  when 'ROUVRIR' then
    if s.statut not in ('FINISHED', 'AWARDING') then perform jeu._erreur('TRANSITION_INTERDITE'); end if;
    v_min := coalesce((p_payload->>'minutes')::int, 5);
    if v_min not between 1 and 120 then perform jeu._erreur('PARAMETRE_INVALIDE'); end if;
    update jeu.sessions set statut = 'RUNNING', deadline = now() + make_interval(mins => v_min),
           finished_at = null, finished_reason = null, awarding_at = null, qualifies = '{}' where id = s.id;
    update jeu.equipes set bonus_jury_pct = null where session_id = s.id;

  when 'REMISE_DES_PRIX' then
    if s.statut = 'AWARDING' then v_deja := true;
    elsif s.statut <> 'FINISHED' then perform jeu._erreur('TRANSITION_INTERDITE');
    else
      update jeu.sessions set statut = 'AWARDING', awarding_at = now(),
             qualifies = coalesce((select array_agg(equipe_id) from jeu._classement(s.id, false) where rang <= 3), '{}')
       where id = s.id;
    end if;

  when 'BONUS_JURY' then
    if s.statut <> 'AWARDING' then perform jeu._erreur('TRANSITION_INTERDITE'); end if;
    v_eq := (p_payload->>'equipe_id')::uuid;
    v_pct := (p_payload->>'pct')::int;
    if v_pct is null or v_pct not between -10 and 10 then perform jeu._erreur('BONUS_INVALIDE'); end if;
    if v_eq is null or not (v_eq = any(s.qualifies)) then perform jeu._erreur('EQUIPE_NON_QUALIFIEE'); end if;
    update jeu.equipes set bonus_jury_pct = v_pct where id = v_eq and session_id = s.id;

  when 'PUBLIER' then
    if s.statut = 'PUBLISHED' then v_deja := true;
    elsif s.statut <> 'AWARDING' then perform jeu._erreur('TRANSITION_INTERDITE');
    else
      update jeu.equipes set valorisation_finale = jeu._finale(valorisation, bonus_jury_pct) where session_id = s.id;
      update jeu.sessions set statut = 'PUBLISHED', published_at = now() where id = s.id;
    end if;

  when 'ANNULER' then
    if s.statut = 'CANCELLED' then v_deja := true;
    elsif s.statut = 'PUBLISHED' then perform jeu._erreur('TRANSITION_INTERDITE');
    else update jeu.sessions set statut = 'CANCELLED', paused_at = null where id = s.id;
    end if;

  else
    perform jeu._erreur('ACTION_INCONNUE');
  end case;

  if not v_deja then
    insert into jeu.actions_admin(session_id, action_id, type, payload, auteur)
    values (s.id, p_action_id, p_type, p_payload, v_auteur);
  end if;

  select * into s from jeu.sessions where id = s.id;
  return jsonb_build_object('ok', true, 'deja_traite', v_deja, 'statut', s.statut);
end $$;

-- Export pour le débrief : identification, événements de jeu, résultats.
create or replace function public.exporter_salon(p_code_salon text, p_code_admin text) returns jsonb
language plpgsql security definer set search_path = jeu, public, pg_temp as $$
declare s jeu.sessions; v_avec_jury boolean;
begin
  s := jeu._session_admin(p_code_salon, p_code_admin);
  v_avec_jury := s.statut in ('AWARDING', 'PUBLISHED');
  return jsonb_build_object(
    'exporte_le', now(),
    'session', jeu._session_json(s),
    'equipes', (select coalesce(jsonb_agg(jsonb_build_object(
        'equipe_id', id, 'entreprise', entreprise, 'membres', to_jsonb(membres),
        'produit', produit, 'objectif', objectif, 'created_at', created_at) order by created_at), '[]'::jsonb)
        from jeu.equipes where session_id = s.id),
    'evenements', (select coalesce(jsonb_agg(jsonb_build_object(
        'event_id', v.id, 'equipe_id', v.equipe_id, 'entreprise', q.entreprise, 'type', v.type,
        'lieu', v.lieu, 'tentative', v.tentative, 'verdict', v.verdict, 'score', v.score,
        'reponse', v.reponse, 'details', v.details, 'valuation_delta', v.delta,
        'valuation_after', v.valorisation_apres, 'created_at', v.created_at) order by v.created_at, v.id), '[]'::jsonb)
        from jeu.evenements v join jeu.equipes q on q.id = v.equipe_id where v.session_id = s.id),
    'actions_admin', (select coalesce(jsonb_agg(jsonb_build_object(
        'type', type, 'payload', payload, 'auteur', auteur, 'created_at', created_at) order by created_at, id), '[]'::jsonb)
        from jeu.actions_admin where session_id = s.id),
    'resultats', (select coalesce(jsonb_agg(jsonb_build_object(
        'rang', c.rang, 'equipe_id', c.equipe_id, 'entreprise', c.entreprise, 'membres', to_jsonb(c.membres),
        'valorisation_jeu', c.valorisation, 'bonus_jury_pct', c.bonus_jury_pct,
        'valorisation_finale', c.valorisation_finale, 'nb_lieux_valides', c.nb_lieux) order by c.rang, c.entreprise), '[]'::jsonb)
        from jeu._classement(s.id, v_avec_jury) c)
  );
end $$;

-- Définir le code organisateur (à exécuter une fois depuis l'éditeur SQL Supabase).
create or replace function jeu.definir_code_organisateur(p_code text) returns void
language plpgsql as $$
declare v_sel text := jeu._jeton();
begin
  if char_length(coalesce(p_code, '')) < 10 then
    raise exception 'Le code organisateur doit faire au moins 10 caractères';
  end if;
  insert into jeu.config(cle, valeur) values ('organisateur_sel', v_sel)
    on conflict (cle) do update set valeur = excluded.valeur;
  insert into jeu.config(cle, valeur) values ('organisateur_hash', jeu._hash(v_sel, p_code))
    on conflict (cle) do update set valeur = excluded.valeur;
end $$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
revoke all on all tables in schema jeu from public, anon, authenticated;
revoke all on all functions in schema jeu from public, anon, authenticated;

revoke execute on function public.creer_salon(text, text, int, int, bigint, boolean) from public;
revoke execute on function public.rejoindre_salon(text, text, text[], text, text) from public;
revoke execute on function public.modifier_equipe(text, text, text[], text, text) from public;
revoke execute on function public.equipe_prete(text, boolean) from public;
revoke execute on function public.deplacer_equipe(text, text) from public;
revoke execute on function public.etat_equipe(text) from public;
revoke execute on function public.contexte_equipe(text) from public;
revoke execute on function public.enregistrer_reponse(text, uuid, text, text, text, int, jsonb) from public;
revoke execute on function public.etat_admin(text, text) from public;
revoke execute on function public.action_admin(text, text, uuid, text, jsonb, text) from public;
revoke execute on function public.exporter_salon(text, text) from public;

grant execute on function public.creer_salon(text, text, int, int, bigint, boolean) to anon, authenticated;
grant execute on function public.rejoindre_salon(text, text, text[], text, text) to anon, authenticated;
grant execute on function public.modifier_equipe(text, text, text[], text, text) to anon, authenticated;
grant execute on function public.equipe_prete(text, boolean) to anon, authenticated;
grant execute on function public.deplacer_equipe(text, text) to anon, authenticated;
grant execute on function public.etat_equipe(text) to anon, authenticated;
grant execute on function public.etat_admin(text, text) to anon, authenticated;
grant execute on function public.action_admin(text, text, uuid, text, jsonb, text) to anon, authenticated;
grant execute on function public.exporter_salon(text, text) to anon, authenticated;

-- Supabase accorde par défaut l'exécution des nouvelles fonctions à anon et
-- authenticated : on retire explicitement ce droit sur les fonctions de scoring.
revoke execute on function public.contexte_equipe(text) from anon, authenticated;
revoke execute on function public.enregistrer_reponse(text, uuid, text, text, text, int, jsonb) from anon, authenticated;

-- Scoring : uniquement la fonction serveur « repondre ».
grant usage on schema jeu to service_role;
grant execute on function public.contexte_equipe(text) to service_role;
grant execute on function public.enregistrer_reponse(text, uuid, text, text, text, int, jsonb) to service_role;
