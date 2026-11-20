/* Moteur de notation v3 de Max : critères pondérés, fil rouge entre les lieux, garde-fous anti « salade de mots-clés ». */
import { CRITERES, FIL_ROUGE, MOTS_PERSONNES, PIEGES } from "./strategie.ts";
import type { Critere } from "./strategie.ts";

export const normV3 = (s: string) =>
  " " + s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'`\-]/g, " ").replace(/[^a-z0-9%€/ ]+/g, " ").replace(/\s+/g, " ").trim() + " ";

const STOP = new Set(["avec", "pour", "dans", "plus", "sont", "nous", "vous", "leur", "leurs", "cette", "elle", "elles", "mais", "donc", "comme", "tout", "tous", "toute", "toutes", "faire", "fait", "avoir", "etre", "sera", "seront", "aussi", "tres", "bien", "chaque", "quand", "parce", "notre", "votre", "temps", "avant", "apres", "encore", "entre", "depuis", "alors", "ainsi", "celle", "celui", "ceux", "autre", "autres", "meme", "moins", "puis", "ensuite", "enfin", "pouvoir", "peuvent", "permet", "mieux", "aujourd", "produit", "solution", "application", "service", "personne", "personnes", "veulent", "voulons", "allons"]);
const OUTILS = new Set(["le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "et", "a", "en", "que", "qui", "pour", "est", "sont", "on", "nous", "ils", "elle", "elles", "il", "au", "aux", "par", "sur", "dans", "avec", "ne", "pas", "plus", "se", "sa", "son", "ses", "leur", "leurs", "ce", "cette", "ces", "si", "car", "mais", "ou", "y", "qu", "s", "n", "j", "c", "va", "vont", "sera", "seront", "peut", "doit"]);
const REMPLISSAGE = ["bla", "blabla", "etc", "truc", "machin", "chose", "choses", "lol", "xxx", "azerty", "test test", "kikou"];

export const motsContenu = (texte: string): string[] => {
  const sigles = (texte.match(/\b[A-Z]{2,5}\b/g) ?? []).map((w) => w.toLowerCase());
  const mots = normV3(texte).split(" ").filter((w) => w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w));
  return Array.from(new Set([...sigles, ...mots]));
};

const trouve = (t: string, mots: string[]) => mots.filter((m) => t.includes(" " + normV3(m).trim() + (m.endsWith(" ") ? " " : "")) || (m === "%" && t.includes("%")) || (m === "€" && t.includes("€")));

export type ContexteDuo = { produit: string; objectif: string; reponses: Record<string, string> };

export type ResultatV3 = {
  verdict: "excellente" | "correcte" | "insuffisante";
  score: number;
  acquis: Critere[];
  manquants: Critere[];
  piege: string | null;
  garde: string | null; // garde-fou anti-triche déclenché
  filRouge: { ok: boolean; texte: string } | null;
};

function nomsPropres(brut: string): string[] {
  const out: string[] = [];
  const re = /\b[A-Z][a-zA-Z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(brut)) !== null) {
    const avant = brut.slice(0, m.index).trimEnd();
    if (avant === "" || /[.!?:;\n]$/.test(avant)) continue;
    out.push(m[0]);
  }
  return out;
}

export function evaluerV3(lieuId: string, brut: string, ctx: ContexteDuo): ResultatV3 {
  const t = normV3(brut);
  const tokens = t.trim().split(" ").filter(Boolean);
  const nbMots = tokens.length;
  const cafe = ctx.reponses["cafe_utilisateurs"] ?? "";
  const cibleMots = motsContenu(cafe).slice(0, 12);
  const criteres = CRITERES[lieuId] ?? [];

  const ok = (c: Critere): boolean => {
    if (c.special === "chiffre" && c.mots.length === 0) return /\d/.test(brut);
    if (trouve(t, c.mots).length > 0) return true;
    if (c.special === "chiffre") return /\d/.test(brut);
    if (c.special === "cible") return cibleMots.some((m) => t.includes(" " + m.slice(0, 6))) || trouve(t, MOTS_PERSONNES).length > 0;
    if (c.special === "nom_propre") return nomsPropres(brut).filter((n) => n !== ctx.produit).length > 0;
    return false;
  };

  const acquis = criteres.filter(ok);
  const manquants = criteres.filter((c) => !acquis.includes(c));
  let score = acquis.reduce((s, c) => s + c.poids, 0);
  if (/\d/.test(brut)) score += 5;
  if (nbMots >= 15 && nbMots <= 120) score += 5;

  /* Fil rouge : la réponse reprend-elle des éléments des lieux sources ? */
  let filRouge: ResultatV3["filRouge"] = null;
  const fr = FIL_ROUGE[lieuId];
  if (fr) {
    const sources = fr.sources.filter((s) => (ctx.reponses[s] ?? "").trim() !== "");
    if (sources.length > 0) {
      const motsSources = Array.from(new Set(sources.flatMap((s) => motsContenu(ctx.reponses[s]))));
      const communs = motsSources.filter((m) => m.length <= 5 ? t.includes(" " + m + " ") || t.includes(" " + m + "s ") : t.includes(" " + m.slice(0, Math.max(5, m.length - 2))));
      if (communs.length > 0) {
        score += 10;
        filRouge = { ok: true, texte: "Fil rouge ✓ : vous reprenez « " + communs.slice(0, 3).join(", ") + " » de vos réponses précédentes. +10 de cohérence !" };
      } else {
        filRouge = { ok: false, texte: "Fil rouge : je ne retrouve pas " + fr.quoi + " dans cette réponse. Une stratégie produit doit se tenir de bout en bout." };
      }
    }
  }
  score = Math.min(100, score);

  /* Pièges métier */
  const p = (PIEGES[lieuId] ?? []).find((x) => trouve(t, x.mots).length > 0);
  const piege = p ? p.message : null;
  if (piege) score = Math.min(score, 45);

  /* Garde-fous anti-triche */
  let garde: string | null = null;
  const uniques = new Set(tokens).size;
  const outils = tokens.filter((w) => OUTILS.has(w)).length;
  const remplissage = trouve(t, REMPLISSAGE).length;
  if (nbMots < 6) { garde = "C'est un peu court : faites au moins une vraie phrase."; score = Math.min(score, 30); }
  else if (remplissage > 0) { garde = "Je sens du remplissage… Max ne se laisse pas avoir par les « bla bla » !"; score = Math.min(score, 40); }
  else if (nbMots >= 10 && uniques / nbMots < 0.5) { garde = "Beaucoup de répétitions : dites-le une fois, mais précisément."; score = Math.min(score, 40); }
  else if (nbMots >= 8 && outils / nbMots < 0.12) { garde = "On dirait une liste de mots-clés : faites des phrases, comme si vous parliez à un client."; score = Math.min(score, 45); }
  else if (acquis.length >= 3 && nbMots < 12) { score = Math.min(score, 74); }

  score = Math.max(8, Math.round(score));
  const verdict = score >= 75 ? "excellente" : score >= 50 ? "correcte" : "insuffisante";
  return { verdict, score, acquis, manquants, piege, garde, filRouge };
}
