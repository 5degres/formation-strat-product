import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CLE_SB = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configOk = Boolean(URL_SB && CLE_SB);
const sb = configOk ? createClient(URL_SB!, CLE_SB!, { auth: { persistSession: false } }) : null;

export const MESSAGES: Record<string, string> = {
  CODE_ORGANISATEUR_INVALIDE: "Code organisateur incorrect.",
  NOM_SALON_REQUIS: "Donnez un nom au salon.",
  PARAMETRE_INVALIDE: "Un paramètre est hors des limites autorisées.",
  SALON_INTROUVABLE: "Aucun salon ne correspond à ce code.",
  SALON_FERME: "Ce salon n'accepte plus de nouvelles équipes.",
  SALON_COMPLET: "Ce salon est complet.",
  NOM_ENTREPRISE_INVALIDE: "Le nom d'entreprise doit faire entre 1 et 40 caractères.",
  NOM_ENTREPRISE_PRIS: "Ce nom d'entreprise est déjà pris dans ce salon.",
  MEMBRES_INVALIDES: "Indiquez entre 1 et 6 prénoms.",
  MODIFICATION_FERMEE: "La partie a commencé : l'entreprise ne peut plus être modifiée.",
  LOBBY_FERME: "La partie a déjà commencé.",
  EQUIPE_INCONNUE: "Équipe introuvable. Rejoignez à nouveau le salon.",
  ACCES_ADMIN_REFUSE: "Code salon ou code admin incorrect.",
  PARTIE_VERROUILLEE: "La partie n'est pas en cours : votre action n'a pas été prise en compte.",
  LIEU_INVALIDE: "Lieu inconnu.",
  LIEU_DEJA_VALIDE: "Ce lieu est déjà validé.",
  REPONSE_VIDE: "La réponse est vide.",
  TRANSITION_INTERDITE: "Cette action n'est pas possible dans l'état actuel de la partie.",
  AUCUNE_EQUIPE: "Aucune équipe n'a rejoint le salon.",
  BONUS_INVALIDE: "Le bonus jury doit être compris entre -10 % et +10 %.",
  EQUIPE_NON_QUALIFIEE: "Le bonus jury ne s'applique qu'aux équipes qualifiées pour le pitch.",
  RESEAU: "Connexion au serveur impossible. Vérifiez le réseau puis réessayez.",
  CONFIG: "L'application n'est pas configurée (variables Supabase manquantes).",
};

export class ErreurJeu extends Error {
  code: string;
  constructor(code: string) { super(MESSAGES[code] ?? "Erreur inattendue (" + code + ")."); this.code = code; }
}

const extraire = (msg: string) => msg.match(/[A-Z_]{6,}/)?.[0] ?? "ERREUR_SERVEUR";

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!sb) throw new ErreurJeu("CONFIG");
  let res;
  try { res = await sb.rpc(fn, args); } catch { throw new ErreurJeu("RESEAU"); }
  if (res.error) throw new ErreurJeu(res.error.message?.includes("Failed to fetch") ? "RESEAU" : extraire(res.error.message));
  return res.data as T;
}

export async function envoyerReponse<T>(body: { token: string; client_action_id: string; lieu: string; reponse: string }): Promise<T> {
  if (!sb) throw new ErreurJeu("CONFIG");
  const { data, error } = await sb.functions.invoke("repondre", { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try { const j = await ctx.json(); throw new ErreurJeu(j.erreur ?? "ERREUR_SERVEUR"); }
      catch (e) { if (e instanceof ErreurJeu) throw e; }
    }
    throw new ErreurJeu("RESEAU");
  }
  return data as T;
}

/** Rafraîchissement périodique de l'état partagé (classement, présence, phase). */
export function useSondage<T extends { serveur_now: string }>(charger: () => Promise<T>, intervalleMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [erreur, setErreur] = useState<ErreurJeu | null>(null);
  const [derniereSync, setDerniereSync] = useState<number | null>(null);
  const [decalage, setDecalage] = useState(0); // horloge serveur - horloge locale
  const ref = useRef(charger);
  ref.current = charger;

  const rafraichir = useCallback(async () => {
    try {
      const t0 = Date.now();
      const d = await ref.current();
      const t1 = Date.now();
      setDecalage(new Date(d.serveur_now).getTime() - (t0 + t1) / 2);
      setData(d); setErreur(null); setDerniereSync(t1);
    } catch (e) {
      setErreur(e instanceof ErreurJeu ? e : new ErreurJeu("RESEAU"));
    }
  }, []);

  useEffect(() => {
    rafraichir();
    const id = window.setInterval(rafraichir, intervalleMs);
    const visible = () => { if (document.visibilityState === "visible") rafraichir(); };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", visible); };
  }, [rafraichir, intervalleMs]);

  return { data, erreur, derniereSync, decalage, rafraichir };
}

export const stockage = {
  lire: <T,>(cle: string): T | null => { try { const v = localStorage.getItem(cle); return v ? (JSON.parse(v) as T) : null; } catch { return null; } },
  ecrire: (cle: string, v: unknown) => localStorage.setItem(cle, JSON.stringify(v)),
  effacer: (cle: string) => localStorage.removeItem(cle),
};
