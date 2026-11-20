// api/max.ts : relais entre le jeu et l'agent Dust "strat-produit-formation"
const DUST_API_URL = process.env.DUST_API_URL || "https://eu.dust.tt";
const WORKSPACE_ID = process.env.DUST_WORKSPACE_ID;
const AGENT_ID = process.env.DUST_AGENT_ID;
const API_KEY = process.env.DUST_API_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!API_KEY || !WORKSPACE_ID || !AGENT_ID) {
    return res.status(500).json({ error: "Configuration Dust manquante sur Vercel" });
  }

  const { message, conversationId, context, player } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message vide" });
  }

  // Ce que l'agent reçoit : le format attendu par l'app, l'état du jeu et le message du joueur
  const content = [
    "output_format=app",
    context ? `CONTEXTE_JEU: ${JSON.stringify(context)}` : "",
    `MESSAGE_JOUEUR: ${message}`,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = {
    content,
    mentions: [{ configurationId: AGENT_ID }],
    context: {
      username: String(player?.username || "joueur").slice(0, 50),
      fullName: player?.name ? String(player.name).slice(0, 80) : undefined,
      timezone: "Europe/Paris",
    },
  };

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
  const base = `${DUST_API_URL}/api/v1/w/${WORKSPACE_ID}/assistant/conversations`;

  try {
    let cId: string = conversationId;

    if (!cId) {
      // Premier message de l'équipe : on crée une conversation Dust
      const r = await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userMessage, title: "Start-up Quest", blocking: false }),
      });
      if (!r.ok) throw new Error(`Création conversation ${r.status} : ${await r.text()}`);
      const data = await r.json();
      cId = data.conversation.sId;
    } else {
      // Messages suivants : on reste dans la même conversation, Max garde la mémoire
      const r = await fetch(`${base}/${cId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(userMessage),
      });
      if (!r.ok) throw new Error(`Envoi message ${r.status} : ${await r.text()}`);
    }

    const raw = await waitForAgent(base, cId, headers);
    const { text, state } = parseMaxAnswer(raw);
    return res.status(200).json({ conversationId: cId, message: text, state });
  } catch (e: any) {
    console.error("[api/max]", e);
    return res.status(502).json({ error: "Max est indisponible", detail: String(e?.message || e) });
  }
}

// Attend que l'agent ait fini de répondre (vérification toutes les secondes, 55 s maximum)
async function waitForAgent(base: string, cId: string, headers: Record<string, string>) {
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));
    const r = await fetch(`${base}/${cId}`, { headers });
    if (!r.ok) throw new Error(`Lecture conversation ${r.status}`);
    const data = await r.json();
    const items = data.conversation?.content ?? [];
    const last = items[items.length - 1];
    const msg = Array.isArray(last) ? last[last.length - 1] : last;
    if (msg?.type === "agent_message") {
      if (msg.status === "succeeded") return String(msg.content ?? "");
      if (msg.status === "failed" || msg.status === "cancelled") {
        throw new Error(`Agent en échec : ${JSON.stringify(msg.error ?? msg.status)}`);
      }
    }
  }
  throw new Error("Délai dépassé : Max n'a pas répondu à temps");
}

// Sépare le texte affiché au joueur (MAX_MESSAGE) de l'état de jeu (MAX_STATE)
function parseMaxAnswer(raw: string) {
  const m = raw.match(/MAX_MESSAGE:\s*([\s\S]*?)\s*MAX_STATE:\s*([\s\S]*)$/);
  if (!m) return { text: raw.trim(), state: null };
  let state = null;
  try {
    state = JSON.parse(m[2].trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim());
  } catch {
    state = null;
  }
  return { text: m[1].trim(), state };
}
