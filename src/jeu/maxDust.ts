/* Appel de Max (agent Dust) via la route serveur Vercel /api/max.
   Max décide lui-même si le message est une discussion ou une réponse à noter.
   Renvoie null si Max est indisponible (route absente, non configurée, trop lente) :
   le jeu bascule alors sur la notation automatique de secours, sans bloquer l'équipe. */
import { ErreurJeu, stockage } from "../api";
import type { ResultatReponse } from "../types";

export type ReponseMax = { mode: "discussion" | "evaluation" | "a_noter"; texte: string; resultat?: ResultatReponse };

export async function parlerAMax(p: { token: string; equipeId: string; clientActionId: string; lieu: string; message: string }): Promise<ReponseMax | null> {
  const cle = "sq_dust_conv_" + p.equipeId;
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 62000);
  let r: Response;
  try {
    r = await fetch("/api/max", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: p.token, client_action_id: p.clientActionId, lieu: p.lieu, message: p.message, conversationId: stockage.lire<string>(cle) }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(minuteur);
    if ((e as Error)?.name === "AbortError") return null; // trop lent : secours
    throw new ErreurJeu("RESEAU");
  }
  clearTimeout(minuteur);
  let j: { mode?: ReponseMax["mode"]; texte?: string; resultat?: ResultatReponse; conversationId?: string; erreur?: string } = {};
  try { j = await r.json(); } catch { /* page 404 HTML, etc. */ }
  if (r.status === 404 || r.status === 405 || r.status >= 500) {
    console.warn("[Max] indisponible, notation de secours", r.status, j?.erreur);
    return null;
  }
  if (!r.ok) throw new ErreurJeu(j?.erreur ?? "ERREUR_SERVEUR");
  if (j.conversationId) stockage.ecrire(cle, j.conversationId);
  if (j.mode === "a_noter") return { mode: "a_noter", texte: "" }; // Max a reconnu une réponse : notation par le moteur de secours
  if (!j.texte) return null;
  return { mode: j.mode === "evaluation" && j.resultat ? "evaluation" : "discussion", texte: j.texte, resultat: j.resultat };
}
