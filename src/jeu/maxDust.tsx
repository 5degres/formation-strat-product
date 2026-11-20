import type { ReactNode } from "react";

/* =========================================================
   Discussion libre avec Max via l'agent Dust "strat-produit-formation".
   Le navigateur appelle uniquement /api/max (fonction Vercel) :
   la clé API Dust reste côté serveur.
   La notation officielle (valorisation, tentatives) reste calculée
   par le serveur Supabase : cette discussion n'est jamais notée.
   ========================================================= */

const cleConversation = (equipeId: string) => "sq_max_conv_" + equipeId;

type ReponseApi = { conversationId?: string; message?: string; error?: string; detail?: string };

async function appelerApi(message: string, conversationId: string | null, contexte: Record<string, unknown>, entreprise: string) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 65_000);
  try {
    const r = await fetch("/api/max", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationId, context: contexte, player: { username: entreprise } }),
      signal: ctrl.signal,
    });
    const data = (await r.json().catch(() => ({}))) as ReponseApi;
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(minuteur);
  }
}

/** Envoie un message à Max (agent Dust) et renvoie sa réponse texte.
    Une conversation Dust est conservée par équipe pour que Max garde la mémoire de la partie. */
export async function demanderMax(p: { equipeId: string; entreprise: string; message: string; contexte: Record<string, unknown> }): Promise<string> {
  const cle = cleConversation(p.equipeId);
  let conversationId: string | null = null;
  try { conversationId = localStorage.getItem(cle); } catch { conversationId = null; }

  let res = await appelerApi(p.message, conversationId, p.contexte, p.entreprise);
  // Conversation Dust introuvable ou expirée : on en recrée une seule fois.
  if (!res.ok && conversationId && String(res.data.detail ?? "").includes("Envoi message")) {
    try { localStorage.removeItem(cle); } catch { /* stockage indisponible */ }
    res = await appelerApi(p.message, null, p.contexte, p.entreprise);
  }

  const texte = typeof res.data.message === "string" ? res.data.message.trim() : "";
  if (!res.ok || !texte) throw new Error(res.data.detail || res.data.error || `HTTP ${res.status}`);
  if (res.data.conversationId) {
    try { localStorage.setItem(cle, res.data.conversationId); } catch { /* stockage indisponible */ }
  }
  return texte;
}

/** Affiche le texte de Max : liens Markdown cliquables, gras, sauts de ligne. */
export function TexteMax({ text }: { text: string }) {
  const propre = text.replace(/^#{1,6}\s+/gm, "");
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;
  const morceaux: ReactNode[] = [];
  let dernier = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(propre)) !== null) {
    if (m.index > dernier) morceaux.push(propre.slice(dernier, m.index));
    if (m[1] && m[2]) {
      morceaux.push(<a key={i++} href={m[2]} target="_blank" rel="noreferrer" style={{ color: "var(--c-green)", fontWeight: 700, textDecoration: "underline" }}>{m[1]}</a>);
    } else if (m[3]) {
      morceaux.push(<strong key={i++}>{m[3]}</strong>);
    }
    dernier = re.lastIndex;
  }
  if (dernier < propre.length) morceaux.push(propre.slice(dernier));
  return <>{morceaux}</>;
}
