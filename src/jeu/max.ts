import type { Lieu } from "../../supabase/functions/_shared/jeu/data.ts";

/* Discussion libre avec Max (non notée), reprise telle quelle de Start-up Quest v3. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'");
const HORS_SUJET: { re: RegExp; reponse: (l: Lieu) => string }[] = [
  { re: /(meteo|il fait|pluie|pleut|soleil|neige|temperature|chaud|froid|orage)/, reponse: (l) => `Côté météo : je ne vois pas la fenêtre, mais j'ai une prévision fiable, 100 % de chances que les investisseurs vous demandent des preuves. Bref, sortez le parapluie et revenons à ${l.concept}.` },
  { re: /(foot|match|psg|om |rugby|tennis|sport|ligue|coupe du monde)/, reponse: (l) => `Le sport, j'adore : une équipe, un objectif, un tableau de score. Exactement ce qui manque à votre réponse sur ${l.concept}. Allez, on retourne sur le terrain.` },
  { re: /(manger|faim|dejeuner|diner|pizza|cafe|restaurant|apero|burger)/, reponse: (l) => `Moi aussi j'ai faim. Mais les investisseurs ne financent pas les pauses déjeuner. Répondez sur ${l.concept} et je vous offre un café virtuel.` },
  { re: /(week-?end|vacances|soiree|netflix|serie|film|musique|chanson)/, reponse: (l) => `Excellente nouvelle pour votre vie perso, très mauvaise pour votre valorisation, qui ne bouge pas pendant qu'on papote. On revient à ${l.concept} ?` },
  { re: /(blague|raconte|drole|humour|rigol)/, reponse: (l) => `Une blague ? « Nous n'avons aucun concurrent. » Elle fait rire tous les investisseurs. Maintenant, sérieusement : ${l.question.split("?")[0]} ?` },
  { re: /(t'es qui|tu es qui|qui es-tu|ton age|tu as quel age|tu es un robot|t'es un robot|tu es une ia)/, reponse: (l) => `Je suis Max, mentor au Village by 5D, 30 ans de pitchs ratés à mon actif (pas les miens, enfin presque). Mon seul hobby : vous faire progresser sur ${l.concept}.` },
  { re: /(je sais pas|je ne sais pas|aucune idee|j'ai pas d'idee|on sait pas|aide|indice|bloque)/, reponse: (l) => `Pas de panique, c'est le métier qui rentre. Un indice : ${l.indice} Essayez une première version, même imparfaite : je note les idées, pas l'orthographe.` },
];

const QUESTION_RE = /^(comment|pourquoi|quel|quelle|quels|quelles|peut|peux|pouvez|est-ce|est ce|c'est quoi|qu'est|que |quoi|combien|ou |quand|tu |vous |dis|explique)/;

export function routerMessage(text: string, lieu: Lieu, peutEvaluer: boolean): "evaluer" | "discuter" {
  if (!peutEvaluer) return "discuter";
  const t = norm(text);
  const mots = t.split(/\s+/).filter(Boolean).length;
  if (HORS_SUJET.some((h) => h.re.test(t)) && mots < 25) return "discuter";
  if (/\?\s*$/.test(text.trim()) || QUESTION_RE.test(t)) return "discuter";
  if (mots < 6) return "discuter";
  const groupes = lieu.positifs.filter((g) => g.some((k) => t.includes(norm(k)))).length;
  if (groupes >= 1 || mots >= 12) return "evaluer";
  return "discuter";
}

export function chatReply(text: string, lieu: Lieu): string {
  const t = norm(text);
  const hs = HORS_SUJET.find((h) => h.re.test(t));
  if (hs) return hs.reponse(lieu);
  if (/(meteo|temps|pluie|soleil|temperature|degre)/.test(t)) {
    return "Je pourrais vous parler de la météo, mais je ne suis pas Météo-France. Et sauf si votre produit vend des parapluies, revenons à la question : quelle hypothèse produit voulez-vous tester ?";
  }
  if (/(bonjour|salut|merci|coucou)/.test(t)) {
    return `Bonjour ! Max au rapport. On peut discuter librement, mais je vous ramènerai toujours à ${lieu.concept} : les investisseurs adorent les idées, ils financent surtout les preuves.`;
  }
  if (t.includes("mvp")) {
    return "Un MVP n'est pas une petite version de tout. C'est le plus petit dispositif qui permet d'apprendre sur une hypothèse risquée. Si vous avez déjà prévu 42 fonctionnalités, vous avez probablement construit un buffet, pas un test.";
  }
  if (t.includes("concurrent") || t.includes("concurrence")) {
    return "Un concurrent peut être Excel, un processus manuel ou le choix de ne rien faire. Dire « nous n'avons pas de concurrent » est généralement une façon élégante de dire « nous n'avons pas encore regardé ».";
  }
  if (t.includes("persona") || t.includes("utilisateur") || t.includes("client")) {
    return "Commencez par une personne précise, dans une situation précise, avec une douleur observable. « Tout le monde » n'est pas une cible, c'est une fuite en avant avec un joli costume.";
  }
  if (t.includes("valorisation") || t.includes("score") || t.includes("note")) {
    return `La valorisation récompense la qualité des preuves, pas le volume de mots. Ici, vous pouvez me poser vos questions sans être noté, puis m'envoyer votre vraie réponse sur ${lieu.concept} : je saurai la reconnaître et la noter.`;
  }
  if (text.includes("?") || /^(comment|pourquoi|quel|quelle|quels|quelles|peut|peux|est ce|c'est quoi)/.test(t)) {
    return `Bonne question. Pour ${lieu.concept}, retenez ceci : ${lieu.explication} Maintenant, essayez de relier cette idée à votre start-up, sans me réciter Wikipédia avec un casque de chantier.`;
  }
  return `Je vous ai compris, mais ce message ne répond pas encore à la question du lieu. On peut continuer à discuter sans notation. Si c'était votre réponse, développez-la : pour qui, quel problème, quelle preuve. Dès qu'elle tient debout, je la note sur 100 avec un verdict et une piste pour progresser.`;
}

