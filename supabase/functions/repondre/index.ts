// Fonction serveur « repondre » : évalue la réponse d'une équipe avec le moteur
// de Max (evaluerV3, identique à Start-up Quest v3), puis enregistre le résultat
// de façon atomique et idempotente. Le client n'envoie jamais de verdict ni de score.
import { createClient } from "npm:@supabase/supabase-js@2";
import { evaluerV3 } from "../_shared/jeu/moteur.ts";
import { LIEUX } from "../_shared/jeu/data.ts";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "METHODE_INTERDITE" }, 405);

  let body: { token?: string; client_action_id?: string; lieu?: string; reponse?: string };
  try { body = await req.json(); } catch { return json({ erreur: "REQUETE_INVALIDE" }, 400); }
  const { token, client_action_id, lieu, reponse } = body;
  if (!token || !client_action_id || !UUID.test(client_action_id) || !lieu || typeof reponse !== "string")
    return json({ erreur: "REQUETE_INVALIDE" }, 400);
  const texte = reponse.trim().slice(0, 4000);
  if (texte.length === 0) return json({ erreur: "REPONSE_VIDE" }, 400);
  const l = LIEUX.find((x) => x.id === lieu);
  if (!l) return json({ erreur: "LIEU_INVALIDE" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const ctx = await sb.rpc("contexte_equipe", { p_token: token });
  if (ctx.error) return json({ erreur: code(ctx.error.message) }, 400);
  const c = ctx.data as { produit: string; objectif: string; reponses: Record<string, string> };

  const ev = evaluerV3(lieu, texte, { produit: c.produit ?? "", objectif: c.objectif ?? "", reponses: c.reponses ?? {} });
  const details = {
    acquis: ev.acquis.map((x) => x.label),
    manquant: ev.manquants[0]?.manque ?? null,
    piege: ev.piege,
    garde: ev.garde,
    fil_rouge: ev.filRouge,
    explication: l.explication,
    conseil: l.conseil,
    piste: l.piste,
  };

  const res = await sb.rpc("enregistrer_reponse", {
    p_token: token, p_client_action_id: client_action_id, p_lieu: lieu, p_reponse: texte,
    p_verdict: ev.verdict, p_score: ev.score, p_details: details,
  });
  if (res.error) return json({ erreur: code(res.error.message) }, 409);
  return json(res.data);
});

function code(message: string): string {
  const m = message.match(/[A-Z_]{6,}/);
  return m ? m[0] : "ERREUR_SERVEUR";
}
