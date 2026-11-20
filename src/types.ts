export type Statut = "LOBBY" | "RUNNING" | "PAUSED" | "FINISHED" | "AWARDING" | "PUBLISHED" | "CANCELLED";

export type Session = {
  nom: string; code_salon: string; statut: Statut; max_equipes: number; duree_min: number;
  regles: { depart: number; excellente: number; correcte: number; malus_pct: number; coef: number[]; max_tentatives: number };
  visibilite: "TOP3" | "COMPLET" | "AUCUN"; qualifies: string[];
  started_at: string | null; deadline: string | null; paused_at: string | null;
  finished_at: string | null; finished_reason: "ANIMATEUR" | "TEMPS" | null;
  awarding_at: string | null; published_at: string | null; regle_egalite: string;
};

export type LigneClassement = {
  equipe_id: string; rang: number; entreprise: string; membres: string[];
  valorisation: number; valorisation_finale: number | null; bonus_jury_pct: number | null;
  nb_lieux: number; moi?: boolean;
};

export type Presence = {
  equipe_id: string; entreprise: string; membres: string[]; prete: boolean;
  lieu_courant: string | null; en_ligne: boolean; moi: boolean;
};

export type EtatEquipe = {
  serveur_now: string; session: Session;
  equipe: {
    equipe_id: string; entreprise: string; membres: string[]; produit: string; objectif: string;
    prete: boolean; lieu_courant: string | null; valorisation: number;
    bonus_jury_pct: number | null; valorisation_finale: number | null;
    lieux_valides: string[]; tentatives: Record<string, number>; rang: number;
  };
  equipes: Presence[]; nb_equipes: number; classement: LigneClassement[];
};

export type EquipeAdmin = {
  equipe_id: string; entreprise: string; membres: string[]; produit: string; objectif: string;
  prete: boolean; lieu_courant: string | null; valorisation: number; bonus_jury_pct: number | null;
  valorisation_finale: number; lieux_valides: string[]; tentatives: Record<string, number>;
  rang: number; rang_jeu: number; en_ligne: boolean; last_seen_at: string;
  derniere_action_at: string | null; qualifie: boolean;
};

export type EtatAdmin = {
  serveur_now: string; session: Session; equipes: EquipeAdmin[];
  actions: { type: string; payload: Record<string, unknown>; auteur: string; created_at: string }[];
};

export type ResultatReponse = {
  deja_traite: boolean; tentative: number; verdict: "excellente" | "correcte" | "insuffisante";
  score: number; delta: number; valorisation: number; valide: boolean;
  details: {
    acquis?: string[]; manquant?: string | null; piege?: string | null; garde?: string | null;
    fil_rouge?: { ok: boolean; texte: string } | null; explication?: string; conseil?: string; piste?: string;
    /* Présents quand c'est Max (agent Dust) qui a noté la réponse */
    source?: "max"; criteres?: { label: string; ok: boolean; conseil: string | null }[]; points_forts?: string[]; commentaire?: string;
  };
};
