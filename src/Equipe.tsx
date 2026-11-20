import { useEffect, useState } from "react";
import { ErreurJeu, envoyerReponse, rpc, stockage, useSondage } from "./api";
import type { EtatEquipe, ResultatReponse } from "./types";
import { IndicateurSync, LIBELLE_STATUT, Minuteur, PARTIE_VERROUILLEE, fmt, fmtDelta, nomLieu, nouvelId } from "./util";
import { LIEUX } from "../supabase/functions/_shared/jeu/data.ts";
import Carte from "./Carte";
import Podium from "./Podium";
import JeuPixel from "./jeu/JeuPixel";

const MODE_CLASSIQUE = new URLSearchParams(window.location.search).has("classique");

type Attente = { id: string; lieu: string; reponse: string };
const CLE_ATTENTE = "sq_attente";

export default function Equipe({ token, onQuitter }: { token: string; onQuitter: () => void }) {
  const { data: etat, erreur, derniereSync, decalage, rafraichir } =
    useSondage<EtatEquipe>(() => rpc("etat_equipe", { p_token: token }), 2500);

  useEffect(() => { if (erreur?.code === "EQUIPE_INCONNUE") onQuitter(); }, [erreur, onQuitter]);

  if (!etat) {
    return (
      <main className="page centre">
        <div className="carte-blanche">{erreur ? <p className="erreur">{erreur.message}</p> : <p>Connexion au salon…</p>}</div>
      </main>
    );
  }
  const s = etat.session;
  /* Interface pixel art de la v3 par défaut ; l'ancienne interface « formulaire »
     reste accessible avec ?classique=1 (dépannage, accessibilité, petits écrans). */
  if (!MODE_CLASSIQUE) {
    return (
      <JeuPixel etat={etat} token={token} rafraichir={rafraichir} decalage={decalage}
        derniereSync={derniereSync} erreurSync={!!erreur} onQuitter={onQuitter}
        lobby={<Lobby etat={etat} token={token} rafraichir={rafraichir} />} />
    );
  }
  return (
    <main className="page">
      <Hud etat={etat} decalage={decalage} derniereSync={derniereSync} erreurSync={!!erreur} onQuitter={onQuitter} />
      {s.statut === "LOBBY" && <Lobby etat={etat} token={token} rafraichir={rafraichir} />}
      {(s.statut === "RUNNING" || s.statut === "PAUSED" || s.statut === "FINISHED") && <Jeu etat={etat} token={token} rafraichir={rafraichir} />}
      {(s.statut === "AWARDING" || s.statut === "PUBLISHED") && (
        <section className="carte-blanche">
          {s.statut === "AWARDING" && <p className="bandeau-info">Les équipes du podium présentent leur pitch. Le jury peut ajuster leur valorisation de -10 % à +10 % avant la publication du classement final.</p>}
          <Podium lignes={etat.classement} final={s.statut === "PUBLISHED"} regleEgalite={s.regle_egalite} />
        </section>
      )}
      {s.statut === "CANCELLED" && <section className="carte-blanche"><p>Cette partie a été annulée par l'animateur.</p></section>}
    </main>
  );
}

function Hud({ etat, decalage, derniereSync, erreurSync, onQuitter }: {
  etat: EtatEquipe; decalage: number; derniereSync: number | null; erreurSync: boolean; onQuitter: () => void;
}) {
  const s = etat.session, e = etat.equipe;
  const final = s.statut === "PUBLISHED";
  return (
    <header className="hud">
      <div className="hud-bloc">
        <span className="etiquette">{s.nom} · {LIBELLE_STATUT[s.statut]}</span>
        <span className="hud-entreprise">{e.entreprise}</span>
        <span className="hud-membres">{e.membres.join(" · ")}</span>
      </div>
      <div className="hud-bloc">
        <span className="etiquette">{final ? "Valorisation finale" : "Valorisation"}</span>
        <span className="hud-valo">{fmt(final ? e.valorisation_finale ?? e.valorisation : e.valorisation)}</span>
      </div>
      {s.statut !== "LOBBY" && (
        <div className="hud-bloc">
          <span className="etiquette">Rang</span>
          <span className="hud-rang">{e.rang}<small>/{etat.nb_equipes}</small></span>
        </div>
      )}
      <div className="hud-bloc">
        <span className="etiquette">Temps restant</span>
        <Minuteur session={s} decalage={decalage} />
      </div>
      <div className="hud-bloc hud-droite">
        <IndicateurSync derniereSync={derniereSync} erreur={erreurSync} />
        <button className="lien" onClick={() => { if (window.confirm("Quitter le salon sur cet appareil ? Vous pourrez revenir avec le même navigateur tant que vous ne videz pas ses données.")) onQuitter(); }}>Quitter</button>
      </div>
    </header>
  );
}

function Lobby({ etat, token, rafraichir }: { etat: EtatEquipe; token: string; rafraichir: () => void }) {
  const e = etat.equipe;
  const [edition, setEdition] = useState(false);
  const [f, setF] = useState({ entreprise: e.entreprise, membres: e.membres.join(", "), produit: e.produit, objectif: e.objectif });
  const [err, setErr] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const agir = async (fn: () => Promise<unknown>) => {
    if (envoi) return;
    setEnvoi(true); setErr(null);
    try { await fn(); rafraichir(); } catch (x) { setErr(x instanceof ErreurJeu ? x.message : "Erreur inattendue."); }
    finally { setEnvoi(false); }
  };
  const lien = window.location.origin + window.location.pathname + "?salon=" + etat.session.code_salon;

  return (
    <div className="grille-2">
      <section className="carte-blanche">
        <h2 className="titre-pixel">Lobby</h2>
        <p>En attente du lancement par l'animateur. Vous serez basculés automatiquement dans le jeu.</p>
        {!edition ? (
          <>
            <dl className="fiche">
              <dt>Entreprise</dt><dd>{e.entreprise}</dd>
              <dt>Membres</dt><dd>{e.membres.join(", ")}</dd>
              <dt>Produit</dt><dd>{e.produit || "–"}</dd>
              <dt>Objectif</dt><dd>{e.objectif || "–"}</dd>
            </dl>
            <div className="actions">
              <button className={"btn " + (e.prete ? "btn-secondaire" : "btn-primaire")} disabled={envoi}
                onClick={() => agir(() => rpc("equipe_prete", { p_token: token, p_prete: !e.prete }))}>
                {e.prete ? "Nous ne sommes plus prêts" : "Nous sommes prêts"}
              </button>
              <button className="btn btn-contour" onClick={() => setEdition(true)}>Modifier</button>
            </div>
          </>
        ) : (
          <div className="formulaire">
            <label>Nom de l'entreprise<input value={f.entreprise} maxLength={40} onChange={(x) => setF({ ...f, entreprise: x.target.value })} /></label>
            <label>Prénoms<input value={f.membres} onChange={(x) => setF({ ...f, membres: x.target.value })} /></label>
            <label>Produit<input value={f.produit} maxLength={200} onChange={(x) => setF({ ...f, produit: x.target.value })} /></label>
            <label>Objectif<input value={f.objectif} maxLength={300} onChange={(x) => setF({ ...f, objectif: x.target.value })} /></label>
            <div className="actions">
              <button className="btn btn-primaire" disabled={envoi} onClick={() => agir(async () => {
                await rpc("modifier_equipe", { p_token: token, p_entreprise: f.entreprise, p_membres: f.membres.split(/[,;\n]/).map((m) => m.trim()).filter(Boolean), p_produit: f.produit, p_objectif: f.objectif });
                setEdition(false);
              })}>Enregistrer</button>
              <button className="btn btn-contour" onClick={() => setEdition(false)}>Annuler</button>
            </div>
          </div>
        )}
        {err && <p className="erreur" role="alert">{err}</p>}
        <p className="note">Lien d'invitation : <code>{lien}</code></p>
      </section>
      <section className="carte-blanche">
        <h3>Équipes dans le salon ({etat.nb_equipes}/{etat.session.max_equipes})</h3>
        <ul className="liste-equipes">
          {etat.equipes.map((x) => (
            <li key={x.equipe_id} className={x.moi ? "moi" : ""}>
              <span className={"point " + (x.en_ligne ? "en-ligne" : "hors-ligne")} title={x.en_ligne ? "En ligne" : "Hors ligne"} />
              <strong>{x.entreprise}</strong> <span className="discret">{x.membres.join(", ")}</span>
              <span className={"badge " + (x.prete ? "badge-ok" : "badge-clair")}>{x.prete ? "Prête" : "En préparation"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Jeu({ etat, token, rafraichir }: { etat: EtatEquipe; token: string; rafraichir: () => void }) {
  const s = etat.session, e = etat.equipe;
  const verrouille = s.statut !== "RUNNING";
  const [lieuId, setLieuId] = useState<string | null>(e.lieu_courant);
  const [texte, setTexte] = useState("");
  const [attente, setAttente] = useState<Attente | null>(() => stockage.lire<Attente>(CLE_ATTENTE));
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<(ResultatReponse & { lieu: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const lieu = LIEUX.find((l) => l.id === lieuId) ?? null;
  const valide = lieu ? e.lieux_valides.includes(lieu.id) : false;
  const t = lieu ? (e.tentatives[lieu.id] ?? 0) : 0;

  const choisir = async (id: string) => {
    setLieuId(id); setResultat(null); setErr(null);
    if (!attente || attente.lieu !== id) setTexte("");
    try { await rpc("deplacer_equipe", { p_token: token, p_lieu: id }); rafraichir(); } catch { /* présence seulement */ }
  };

  // Envoi idempotent : l'identifiant est conservé jusqu'à confirmation du serveur,
  // si bien qu'un renvoi après coupure réseau ou rechargement ne compte jamais double.
  const envoyer = async (a: Attente) => {
    if (envoi) return;
    setEnvoi(true); setErr(null);
    try {
      const r = await envoyerReponse<ResultatReponse>({ token, client_action_id: a.id, lieu: a.lieu, reponse: a.reponse });
      setResultat({ ...r, lieu: a.lieu }); setTexte("");
      stockage.effacer(CLE_ATTENTE); setAttente(null);
      rafraichir();
    } catch (x) {
      const er = x instanceof ErreurJeu ? x : new ErreurJeu("RESEAU");
      setErr(er.message);
      if (er.code !== "RESEAU") { stockage.effacer(CLE_ATTENTE); setAttente(null); }
    } finally { setEnvoi(false); }
  };
  const soumettre = () => {
    if (!lieu || texte.trim() === "") return;
    const a = { id: nouvelId(), lieu: lieu.id, reponse: texte.trim() };
    stockage.ecrire(CLE_ATTENTE, a); setAttente(a);
    envoyer(a);
  };

  const question = lieu ? lieu.question.replace(/\{produit\}/g, e.produit || e.entreprise) : "";

  return (
    <div className="jeu">
      {s.statut === "PAUSED" && <div className="bandeau bandeau-pause">Partie en pause : l'animateur reprend la main. Le minuteur est arrêté.</div>}
      {s.statut === "FINISHED" && (
        <div className="voile" role="dialog" aria-modal="true">
          <div className="voile-carte">
            <h2 className="titre-pixel">Fin de partie</h2>
            <p>La partie est terminée. Vos réponses et votre valorisation sont verrouillées. Préparez-vous à découvrir le classement.</p>
            <p className="discret">{s.finished_reason === "TEMPS" ? "Le temps est écoulé." : "L'animateur a mis fin à la partie."}</p>
            <p className="hud-valo">{fmt(e.valorisation)} · rang {e.rang}/{etat.nb_equipes}</p>
          </div>
        </div>
      )}
      <div className="grille-jeu">
        <section className="carte-blanche zone-carte">
          <h2 className="titre-pixel petit">Le village</h2>
          <Carte equipes={etat.equipes} valides={e.lieux_valides} tentatives={e.tentatives} actif={lieuId} verrouille={verrouille} onChoisir={choisir} />
        </section>
        <aside className="colonne">
          <section className="carte-blanche">
            <h3>Classement {PARTIE_VERROUILLEE(s.statut) ? "provisoire" : "en direct"}</h3>
            <ol className="classement">
              {etat.classement.map((c) => (
                <li key={c.equipe_id} className={c.moi ? "moi" : ""}>
                  <span className="rang">{c.rang}</span><span className="nom">{c.entreprise}</span><span className="valo">{fmt(c.valorisation)}</span>
                </li>
              ))}
            </ol>
            {e.rang > 3 && <p className="note">Vous êtes {e.rang}e sur {etat.nb_equipes}.</p>}
          </section>
          {lieu && (
            <section className="carte-blanche">
              <span className="etiquette">{lieu.concept}</span>
              <h3>{lieu.nom}</h3>
              <p className="question">{question}</p>
              {valide ? (
                <p className="bandeau-ok">Lieu validé. Choisissez un autre lieu sur la carte.</p>
              ) : (
                <>
                  <p className="discret">Tentative {Math.min(t + 1, 3)}/3 · Max évalue votre réponse sur le serveur.</p>
                  <textarea rows={5} value={attente && attente.lieu === lieu.id ? attente.reponse : texte} disabled={verrouille || envoi || attente?.lieu === lieu.id}
                    onChange={(x) => setTexte(x.target.value)} placeholder="Votre réponse, en vraies phrases…" />
                  <div className="actions">
                    {attente && attente.lieu === lieu.id ? (
                      <button className="btn btn-primaire" disabled={envoi || verrouille} onClick={() => envoyer(attente)}>
                        {envoi ? "Envoi…" : "Renvoyer la réponse"}
                      </button>
                    ) : (
                      <button className="btn btn-primaire" disabled={verrouille || envoi || texte.trim() === ""} onClick={soumettre}>
                        {envoi ? "Max réfléchit…" : "Envoyer à Max"}
                      </button>
                    )}
                    {attente && attente.lieu === lieu.id && !envoi && <button className="btn btn-contour" onClick={() => { stockage.effacer(CLE_ATTENTE); setTexte(attente.reponse); setAttente(null); }}>Modifier</button>}
                  </div>
                </>
              )}
              {err && <p className="erreur" role="alert">{err}</p>}
              {resultat && resultat.lieu === lieu.id && <Retour r={resultat} />}
            </section>
          )}
          {!lieu && <section className="carte-blanche"><p>Choisissez un lieu sur la carte pour répondre à la question de Max. Vous voyez les autres équipes se déplacer en direct.</p></section>}
          <p className="note">Position actuelle : {nomLieu(e.lieu_courant)}</p>
        </aside>
      </div>
    </div>
  );
}

function Retour({ r }: { r: ResultatReponse }) {
  const d = r.details;
  const titre = r.verdict === "excellente" ? "Excellente réponse !" : r.verdict === "correcte" ? "Réponse correcte" : "Pas encore convaincant";
  return (
    <div className={"retour retour-" + r.verdict}>
      <div className="retour-tete">
        <strong>{titre}</strong>
        <span className={"delta " + (r.delta >= 0 ? "plus" : "moins")}>{fmtDelta(r.delta)}</span>
      </div>
      <p>Qualité : {r.score}/100 · tentative {r.tentative}/3{r.valide ? " · lieu validé" : ""}</p>
      {d.acquis && d.acquis.length > 0 && <p>Points forts : {d.acquis.join(", ")}.</p>}
      {d.manquant && <p>À renforcer : {d.manquant}</p>}
      {d.piege && <p>{d.piege}</p>}
      {d.garde && <p>{d.garde}</p>}
      {d.fil_rouge && <p>{d.fil_rouge.texte}</p>}
      {r.valide && d.explication && <p className="discret">{d.explication}</p>}
      {!r.valide && d.conseil && <p className="discret">Conseil : {d.conseil}</p>}
      {r.valide && r.verdict === "insuffisante" && d.piste && <p className="discret">Piste : {d.piste}</p>}
    </div>
  );
}
