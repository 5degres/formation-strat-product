import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Lock, Send, Map as MapIcon, BookOpen, ExternalLink, LogOut, Users, Pause, Flag, RotateCcw, ArrowRight, Check, X, TrendingUp } from "lucide-react";
import { LIEUX, FINAL, TABLEAU } from "../../supabase/functions/_shared/jeu/data.ts";
import type { Lieu } from "../../supabase/functions/_shared/jeu/data.ts";
import { QUARTIERS, ACCROCHES, CRITERES, quartierDe } from "../../supabase/functions/_shared/jeu/strategie.ts";
import { VILLAGE, INTERIOR, HALL, COUNTER, JURY, MAX_WALK, MAX_CAST, LAYOUT } from "./assets";
import {
  SW, SH, T, CSS, PIX, RAL, PANEL, FULL, NUM, fmt, fmtTime, WALK, IDLE, TALK, ROW,
  Sprite, Trophy, PxButton, DialogBox, NameTag, Bang, ValoGauge, Hearts, TopLeftCard, CoinRain, Ribbon, Stage,
} from "./ui";
import type { ValoAnim } from "./ui";
import { ErreurJeu, envoyerReponse, rpc, stockage } from "../api";
import type { EtatEquipe, LigneClassement, ResultatReponse } from "../types";
import { IndicateurSync, LIBELLE_STATUT, nouvelId, tempsRestant, useMaintenant } from "../util";
import { chatReply, routerMessage } from "./max";
import { parlerAMax } from "./maxDust";
import { Habitants } from "./habitants";
import "./theme.css";

/* =========================================================
   Start-up Quest multijoueur : interface pixel art de la v3
   branchée sur l'état serveur (Supabase).
   Le serveur reste la seule source de vérité : valorisation,
   tentatives, lieux validés, minuteur et classement viennent
   de etat_equipe. Seules la discussion libre avec Max (non notée)
   et l'historique affiché restent dans le navigateur.
   ========================================================= */

type Verdict = "excellente" | "correcte" | "insuffisante";
type Ecran = "intro" | "carte" | "lieu";
type Msg = { from: "max" | "duo"; text: string };
type Attente = { id: string; lieu: string; reponse: string };
type Resultat = {
  lieuId: string; verdict: Verdict; score: number; delta: number; potMin: number; potMax: number; k: number;
  reponse: string; valide: boolean; tentative: number; acquis: string[]; filRouge: { ok: boolean; texte: string } | null;
  parMax: boolean; criteres: { label: string; ok: boolean; conseil: string | null }[] | null; conseil: string | null;
  potSuivant: { correcte: number; excellente: number } | null;
};

const CLE_ATTENTE = "sq_attente";
const VERDICT_UI: Record<Verdict, { label: string; stars: number }> = {
  excellente: { label: "Excellente !", stars: 3 },
  correcte: { label: "Bonne réponse", stars: 2 },
  insuffisante: { label: "À retravailler", stars: 1 },
};
const ZONES: Record<string, { x: number; y: number; w: number; h: number }> = {
  reveurs: { x: 2.1, y: 0.7, w: 29.2, h: 7.8 },
  bricoleurs: { x: 1.9, y: 18.6, w: 17.9, h: 5.9 },
  ambitieux: { x: 20.4, y: 18.6, w: 15.2, h: 5.9 },
  compteurs: { x: 36.6, y: 10.2, w: 9.2, h: 14.3 },
};
const SOURCE_LINKS: Record<string, { label: string; url: string }[]> = {
  tour_vision: [{ label: "SVPG · Product vision", url: "https://www.svpg.com/product-vision/" }],
  cafe_utilisateurs: [{ label: "Harvard Business Review · Jobs to Be Done", url: "https://hbr.org/2016/09/know-your-customers-jobs-to-be-done" }],
  atelier_valeur: [{ label: "Strategyzer · Value Proposition Canvas", url: "https://www.strategyzer.com/library/the-value-proposition-canvas" }],
  observatoire: [{ label: "April Dunford · Positioning", url: "https://aprildunford.com/obviously-awesome" }],
  garage_mvp: [{ label: "The Lean Startup · MVP", url: "https://theleanstartup.com/principles" }],
  salle_des_choix: [{ label: "ProductPlan · MoSCoW", url: "https://www.productplan.com/glossary/moscow-prioritization/" }],
  salle_des_cartes: [{ label: "ProductPlan · Now / Next / Later", url: "https://www.productplan.com/glossary/now-next-later-roadmap/" }],
  tableau_de_bord: [{ label: "What Matters · OKR", url: "https://www.whatmatters.com/" }],
  marche: [{ label: "Sean Ellis · Product-market fit", url: "https://www.startup-marketing.com/the-startup-pyramid/" }],
  banque: [{ label: "Strategyzer · Business Model Canvas", url: "https://www.strategyzer.com/canvas/business-model-canvas" }],
  place_lancement: [{ label: "ProductPlan · Go-to-market", url: "https://www.productplan.com/glossary/go-to-market-strategy/" }],
};
const PLACE = { x: 740, y: 440 }; // place du village, à côté de Max
const signe = (n: number) => (n >= 0 ? "+" : "−") + fmt(Math.abs(n));

/* ---------- Composant racine du jeu côté équipe ---------- */
export default function JeuPixel({ etat, token, rafraichir, decalage, derniereSync, erreurSync, onQuitter, lobby }: {
  etat: EtatEquipe; token: string; rafraichir: () => void; decalage: number;
  derniereSync: number | null; erreurSync: boolean; onQuitter: () => void; lobby: ReactNode;
}) {
  const s = etat.session, e = etat.equipe;
  const enJeu = s.statut === "RUNNING" || s.statut === "PAUSED" || s.statut === "FINISHED";
  const cleIntro = "sq_intro_vue_" + e.equipe_id;
  const cleLog = "sq_log_" + e.equipe_id;

  const [ecran, setEcran] = useState<Ecran>(() => (stockage.lire<boolean>(cleIntro) ? "carte" : "intro"));
  const [introStep, setIntroStep] = useState(0);
  const [arrive, setArrive] = useState(false);
  const [lieuId, setLieuId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"intro" | "echange">("intro");
  const [logs, setLogs] = useState<Record<string, Msg[]>>(() => stockage.lire<Record<string, Msg[]>>(cleLog) ?? {});
  const [input, setInput] = useState("");
  const [attente, setAttente] = useState<Attente | null>(() => stockage.lire<Attente>(CLE_ATTENTE));
  const [envoi, setEnvoi] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [valoAnim, setValoAnim] = useState<ValoAnim | null>(null);
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  const [dialogCarte, setDialogCarte] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const saisieRef = useRef<HTMLTextAreaElement>(null);
  const [secours, setSecours] = useState(false);
  const [marche, setMarche] = useState<Marche | null>(null);
  const maintenant = useMaintenant(500);

  useEffect(() => { stockage.ecrire(cleLog, logs); }, [cleLog, logs]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [logs, lieuId, phase, resultat]);
  /* Une réponse restée en attente (coupure réseau, rechargement) rouvre directement son lieu. */
  useEffect(() => {
    if (attente && enJeu && stockage.lire<boolean>(cleIntro)) { setLieuId(attente.lieu); setPhase("echange"); setEcran("lieu"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const produit = e.produit || e.entreprise;
  const q = (l: Lieu) => l.question.replace(/\{produit\}/g, produit);
  const lieu = LIEUX.find((l) => l.id === lieuId) ?? null;
  const valides = e.lieux_valides;
  const nbValides = valides.length;
  const tentatives = (id: string) => e.tentatives[id] ?? 0;
  const regles = s.regles;
  const coef = (t: number) => regles.coef[Math.min(t - 1, regles.coef.length - 1)] ?? 1;
  const maxValo = regles.depart + LIEUX.length * regles.excellente;
  const verrouille = s.statut !== "RUNNING";
  const restantMs = tempsRestant(s, maintenant + decalage);
  const restant = restantMs === null ? s.duree_min * 60 : Math.ceil(restantMs / 1000);

  const prochain = (exclude?: string): Lieu | null => {
    for (const qz of QUARTIERS) {
      const id = qz.lieux.find((x) => !valides.includes(x) && x !== exclude);
      if (id) return LIEUX.find((l) => l.id === id) ?? null;
    }
    return null;
  };
  const reco = prochain();

  const introLines = useMemo(() => [
    "Bienvenue au Village by 5D, l'incubateur des start-ups ! Je suis Max, votre mentor en stratégie produit.",
    `${e.entreprise}, votre mission : faire de ${produit} une start-up capable de convaincre les investisseurs.`,
    "Le village compte 4 quartiers : les Rêveurs, les Bricoleurs, les Compteurs et les Ambitieux. Chaque lieu cache un concept clé, et vos réponses doivent se tenir de bout en bout.",
    `Vous n'êtes pas seuls : ${Math.max(0, etat.nb_equipes - 1)} autre(s) équipe(s) explorent le village en même temps. Vous verrez leurs personnages se déplacer et le classement évoluer en direct.`,
    "Attention, une réponse floue fait baisser votre valeur, et le chrono est le même pour tout le monde. Prêts ? Direction le village !",
  ], [e.entreprise, produit, etat.nb_equipes]);

  const finIntro = () => { stockage.ecrire(cleIntro, true); setEcran("carte"); setDialogCarte(true); };
  const ajouterLog = (id: string, ...m: Msg[]) => setLogs((x) => ({ ...x, [id]: [...(x[id] ?? []), ...m] }));

  const allerCarte = () => {
    setValoAnim(null); setResultat(null); setErr(null); setDialogCarte(true);
    setLieuId(null); setEcran("carte");
    if (!verrouille) rpc("deplacer_equipe", { p_token: token, p_lieu: null }).then(rafraichir, () => undefined);
  };

  /* Clic sur un bâtiment : Max marche jusqu'à l'entrée, puis le lieu s'ouvre. */
  const marcherVers = (l: Lieu) => {
    if (s.statut === "FINISHED" || marche) return;
    const chemin = cheminVers(l.id);
    if (!chemin) { ouvrirLieu(l); return; }
    setDialogCarte(false);
    setMarche({ lieuId: l.id, points: chemin });
  };
  const arriveeMarche = () => {
    const cible = marche ? LIEUX.find((x) => x.id === marche.lieuId) : undefined;
    setMarche(null);
    if (cible) ouvrirLieu(cible);
  };

  const ouvrirLieu = (l: Lieu) => {
    if (s.statut === "FINISHED") return;
    setLieuId(l.id); setInput(""); setValoAnim(null); setResultat(null); setErr(null);
    const deja = (logs[l.id] ?? []).length > 0;
    setPhase(deja ? "echange" : "intro");
    if (!deja) {
      const qz = quartierDe(l.id);
      const premier = qz ? qz.lieux.every((x) => (logs[x] ?? []).length === 0) : false;
      const accueil = qz && premier ? `${qz.accueil} ` : "";
      ajouterLog(l.id, { from: "max", text: `${accueil}${l.nom}, concept : ${l.concept}. ${ACCROCHES[l.id] ?? ""} ${q(l)}` });
    }
    setEcran("lieu");
    if (!verrouille) rpc("deplacer_equipe", { p_token: token, p_lieu: l.id }).then(rafraichir, () => undefined);
  };

  /* Texte court de Max à partir du verdict calculé par le serveur.
     Le détail (critères, barres, conseils) est affiché dans le bilan sous le message. */
  const texteMax = (l: Lieu, r: ResultatReponse) => {
    const d = r.details ?? {};
    const alerte = [d.garde, d.piege].filter(Boolean).join(" ");
    if (r.verdict === "excellente") return `Excellente réponse ! Votre start-up gagne ${signe(r.delta)}. ${d.explication ?? l.explication}`;
    if (r.verdict === "correcte") return `Bonne réponse, lieu validé : ${signe(r.delta)}. C'est solide, mais il manquait un peu de précision pour décrocher « Excellente ». Le bilan ci-dessous vous montre quoi.`;
    if (r.valide) return `Dernière tentative utilisée (${signe(r.delta)}). Le lieu est validé, sans gain. ${alerte} Voici une piste pour la suite : ${d.piste ?? l.piste}`;
    return `Pas encore convaincant : ${signe(r.delta)}. ${alerte} Regardez le bilan juste en dessous, il vous dit quoi ajouter pour gagner de l'argent à la prochaine tentative.`;
  };

  /* Envoi idempotent : l'identifiant est conservé jusqu'à confirmation du serveur,
     si bien qu'un renvoi après coupure réseau ou rechargement ne compte jamais double. */
  /* Affiche le résultat d'une réponse notée (par Max ou, en secours, par le moteur de règles). */
  const afficherResultat = (l: Lieu, a: Attente, r: ResultatReponse, texte: string, avant: number, t: number) => {
    ajouterLog(l.id, { from: "max", text: texte });
    const tt = r.tentative || t;
    const arr = (v: number) => Math.round(v / 1000) * 1000;
    const encore = !r.valide && tt < regles.max_tentatives;
    const d = r.details ?? {};
    setResultat({
      lieuId: l.id, verdict: r.verdict, score: r.score, delta: r.delta, k: Date.now(),
      potMin: arr((r.verdict === "insuffisante" ? 0 : regles.correcte) * coef(tt)),
      potMax: arr(regles.excellente * coef(tt)),
      reponse: a.reponse, valide: r.valide, tentative: tt, acquis: d.acquis ?? [], filRouge: d.fil_rouge ?? null,
      parMax: d.source === "max", criteres: d.source === "max" && d.criteres?.length ? d.criteres : null, conseil: d.source === "max" ? d.conseil ?? null : null,
      potSuivant: encore ? { correcte: arr(regles.correcte * coef(tt + 1)), excellente: arr(regles.excellente * coef(tt + 1)) } : null,
    });
    if (!r.deja_traite) { setValoAnim({ from: avant, to: r.valorisation, k: Date.now() }); setDelta({ v: r.delta, k: Date.now() }); }
  };

  /* Envoi d'un message : Max (Dust) décide s'il discute ou s'il note.
     S'il est indisponible, le moteur de règles prend le relais (secours). Idempotent grâce à a.id. */
  const envoyerServeur = async (a: Attente, relance = false) => {
    if (envoi) return;
    const l = LIEUX.find((x) => x.id === a.lieu);
    if (!l) return;
    setEnvoi(true); setErr(null); setResultat(null);
    if (!relance) ajouterLog(l.id, { from: "duo", text: a.reponse });
    setInput("");
    const avant = e.valorisation;
    const t = tentatives(l.id) + 1;
    try {
      const m = await parlerAMax({ token, equipeId: e.equipe_id, clientActionId: a.id, lieu: a.lieu, message: a.reponse });
      if (m && m.mode === "evaluation" && m.resultat) {
        setSecours(false);
        afficherResultat(l, a, m.resultat, m.texte, avant, t);
      } else if (m && m.mode === "a_noter") {
        setSecours(false);
        const r = await envoyerReponse<ResultatReponse>({ token, client_action_id: a.id, lieu: a.lieu, reponse: a.reponse });
        afficherResultat(l, a, r, texteMax(l, r), avant, t);
      } else if (m) {
        setSecours(false);
        ajouterLog(l.id, { from: "max", text: m.texte });
      } else {
        setSecours(true);
        const peutEvaluer = !valides.includes(l.id) && !verrouille;
        if (routerMessage(a.reponse, l, peutEvaluer) === "discuter") ajouterLog(l.id, { from: "max", text: chatReply(a.reponse, l) });
        else {
          const r = await envoyerReponse<ResultatReponse>({ token, client_action_id: a.id, lieu: a.lieu, reponse: a.reponse });
          afficherResultat(l, a, r, texteMax(l, r), avant, t);
        }
      }
      stockage.effacer(CLE_ATTENTE); setAttente(null);
      rafraichir();
    } catch (x) {
      const er = x instanceof ErreurJeu ? x : new ErreurJeu("RESEAU");
      setErr(er.message);
      if (er.code === "RESEAU") { stockage.ecrire(CLE_ATTENTE, a); setAttente(a); }
      else { stockage.effacer(CLE_ATTENTE); setAttente(null); setInput(a.reponse); }
    } finally { setEnvoi(false); }
  };

  const envoyerMessage = () => {
    if (!lieu || envoi || input.trim() === "" || s.statut === "FINISHED") return;
    void envoyerServeur({ id: nouvelId(), lieu: lieu.id, reponse: input.trim() });
  };

  /* ----- Éléments HUD partagés ----- */
  const startupCard = <TopLeftCard title={e.entreprise} subtitle={`${produit} · ${e.membres.join(", ")}`} />;
  const chrono = s.statut === "PAUSED" ? "PAUSE" : fmtTime(Math.max(0, restant));
  const timerCard = (contenu: ReactNode) => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      style={{ ...PANEL, position: "absolute", right: 14, top: 10, height: 66, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", boxSizing: "border-box" }}>
      <div style={{ ...NUM, background: s.statut === "PAUSED" ? "var(--c-fawn-700)" : restant <= 300 && s.statut === "RUNNING" ? "var(--c-fawn-600)" : "var(--c-ink)", color: "var(--c-cream)", borderRadius: 4, padding: "2px 10px", fontSize: 16, minWidth: 82, textAlign: "center" }} aria-label="Temps restant">{chrono}</div>
      {contenu}
    </motion.div>
  );
  const barreSync = (
    <div style={{ ...PANEL, ...RAL, position: "absolute", right: 14, top: 84, display: "flex", alignItems: "center", gap: 12, padding: "3px 10px", fontSize: 13, fontWeight: 600, zIndex: 40 }}>
      <IndicateurSync derniereSync={derniereSync} erreur={erreurSync} />
      <button type="button" onClick={() => { if (window.confirm("Quitter le salon sur cet appareil ? Vous pourrez revenir avec le même navigateur tant que vous ne videz pas ses données.")) onQuitter(); }}
        style={{ ...RAL, background: "none", border: "none", color: "var(--c-green)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}>
        <LogOut size={13} /> Quitter
      </button>
    </div>
  );
  const deltaFloat = (
    <AnimatePresence>
      {delta ? (
        <motion.div key={delta.k} initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -14 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
          onAnimationComplete={() => setTimeout(() => setDelta(null), 1200)}
          style={{ ...NUM, position: "absolute", left: 640, transform: "translateX(-50%)", top: 128, fontSize: 16, color: delta.v >= 0 ? "var(--px-up)" : "var(--c-fawn-600)", textShadow: "2px 2px 0 var(--c-ink)" }}>
          {signe(delta.v)}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
  const bandeauPause = s.statut === "PAUSED" ? (
    <div role="status" style={{ ...PIX, position: "absolute", left: "50%", transform: "translateX(-50%)", top: 92, zIndex: 60, background: "var(--c-fawn-600)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, padding: "4px 16px", fontSize: 17, fontWeight: 700, boxShadow: "3px 3px 0 0 var(--c-ink)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
      <Pause size={16} /> Partie en pause : l'animateur reprend la main
    </div>
  ) : null;
  const voileFin = s.statut === "FINISHED" ? (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{ ...FULL, background: "var(--veil)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }} role="dialog" aria-modal="true" aria-label="Fin de partie">
      <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ duration: 0.35 }} style={{ ...PANEL, width: 640, padding: "22px 28px", textAlign: "center" }}>
        <div style={{ ...PIX, fontSize: 32, fontWeight: 700, color: "var(--c-green)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><Flag size={28} /> Fin de partie</div>
        <p style={{ ...RAL, fontSize: 17, fontWeight: 600, margin: "12px 0" }}>Vos réponses et votre valorisation sont verrouillées. Préparez-vous à découvrir le classement.</p>
        <p style={{ ...RAL, fontSize: 14, color: "var(--c-muted)", margin: "0 0 14px" }}>{s.finished_reason === "TEMPS" ? "Le temps est écoulé." : "L'animateur a mis fin à la partie."}</p>
        <div style={{ ...NUM, fontSize: 22, color: "var(--c-green)", textShadow: "2px 2px 0 var(--c-ink)" }}>{fmt(e.valorisation)}</div>
        <div style={{ ...PIX, fontSize: 18, fontWeight: 700, marginTop: 8 }}>Rang {e.rang}/{etat.nb_equipes}</div>
      </motion.div>
    </motion.div>
  ) : null;

  let scene: ReactNode = null;

  /* ===== Hall : lobby, intro animée de Max, annulation ===== */
  const hall = (contenu: ReactNode, maxMarche: boolean, maxParle: boolean, titre: "grand" | "petit" = "petit") => {
    const g = titre === "grand";
    return (
    <>
      <img src={HALL} alt="Hall du Village by 5D" style={FULL} />
      {(
        <div aria-hidden="true" style={{ ...PIX, position: "absolute", left: g ? 690 : 900, top: g ? 112 : 130, width: g ? 560 : 370, textAlign: "center", fontSize: g ? 60 : 50, fontWeight: 700, lineHeight: 1, color: "var(--c-fawn-600)", textShadow: "3px 0 0 var(--c-ink), -3px 0 0 var(--c-ink), 0 3px 0 var(--c-ink), 0 -3px 0 var(--c-ink), 5px 5px 0 var(--c-ink)" }}>
          START-UP<br />QUEST
          <div style={{ fontSize: g ? 22 : 18, marginTop: 14, color: "var(--c-mint)", textShadow: "2px 2px 0 var(--c-ink)", letterSpacing: 1 }}>VILLAGE BY 5D</div>
        </div>
      )}
      {maxMarche || maxParle ? (
        <motion.div style={{ position: "absolute", top: 352 }} initial={{ left: SW }} animate={{ left: 900 }} transition={{ duration: 2.4, ease: "linear" }} onAnimationComplete={() => setArrive(true)}>
          <Sprite url={maxParle ? MAX_CAST : MAX_WALK} cols={maxParle ? 7 : 9} row={maxMarche ? ROW.left : ROW.down} frames={maxMarche ? WALK : TALK} fps={maxMarche ? 10 : 6} scale={3} label="Max, le mentor" />
        </motion.div>
      ) : (
        <div style={{ position: "absolute", left: 900, top: 352 }}><Sprite url={MAX_WALK} cols={9} row={ROW.down} frames={IDLE} fps={1} scale={3} label="Max, le mentor, derrière le comptoir" /></div>
      )}
      <img src={COUNTER} alt="" style={FULL} />
      {contenu}
    </>
    );
  };

  if (s.statut === "LOBBY") {
    scene = hall(
      <>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="sq-scroll sq-lobby" style={{ ...PANEL, position: "absolute", left: 24, top: 24, width: 850, maxHeight: 672, overflowY: "auto", padding: 16, boxSizing: "border-box" }}>
          <div style={{ ...PIX, fontSize: 26, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}><Users size={24} /> {s.nom} · salle d'attente</div>
          {lobby}
        </motion.div>
        <DialogBox text={`Bonjour ${e.entreprise} ! Je suis Max. Dès que l'animateur lance la partie, je vous fais visiter le village.`}
          style={{ left: 890, bottom: 16, width: 370 }} />
      </>,
      false, false,
    );
  } else if (s.statut === "CANCELLED") {
    scene = hall(
      <div style={{ ...PANEL, position: "absolute", left: 150, top: 300, width: 640, padding: 24, textAlign: "center" }}>
        <div style={{ ...PIX, fontSize: 24, fontWeight: 700 }}>Partie annulée</div>
        <p style={{ ...RAL, fontSize: 16, fontWeight: 600 }}>Cette partie a été annulée par l'animateur.</p>
        <PxButton size={16} onClick={onQuitter}>Quitter le salon</PxButton>
      </div>,
      false, false,
    );
  } else if (s.statut === "AWARDING" || s.statut === "PUBLISHED") {
    scene = <Podium etat={etat} />;
  } else if (enJeu && ecran === "intro") {
    scene = hall(
      <>
        {arrive ? (
          <DialogBox key={introStep} text={introLines[introStep]} nextLabel={introStep < introLines.length - 1 ? "Suite" : "Entrer dans le village"}
            onNext={() => (introStep < introLines.length - 1 ? setIntroStep(introStep + 1) : finIntro())}
            style={{ left: 200, bottom: 16, width: 880, minHeight: 96 }} />
        ) : null}
        <div style={{ position: "absolute", left: 14, bottom: 14 }}>
          <PxButton variant="cream" size={13} onClick={finIntro}>Passer l'intro</PxButton>
        </div>
      </>,
      !arrive, arrive, "grand",
    );
  } else if (enJeu && ecran === "lieu" && lieu) {
    /* ===== Lieu : introduction puis échange avec Max ===== */
    const log = logs[lieu.id] ?? [];
    const t = tentatives(lieu.id);
    const ok = valides.includes(lieu.id);
    const tentativeAff = ok ? Math.max(1, t) : Math.min(t + 1, regles.max_tentatives);
    const board = TABLEAU[lieu.id] ?? [lieu.concept];
    const nextReco = prochain(lieu.id);
    const res = resultat && resultat.lieuId === lieu.id ? resultat : null;
    const enAttente = attente && attente.lieu === lieu.id ? attente : null;

    if (phase === "intro") {
      scene = (
        <>
          <img src={INTERIOR} alt={`Intérieur : ${lieu.nom}`} style={FULL} />
          <div style={{ position: "absolute", left: 800, top: 48, width: 400, height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, boxSizing: "border-box" }}>
            <div style={{ ...PIX, fontSize: 19, fontWeight: 700, color: "var(--c-fawn-700)", textTransform: "uppercase", textAlign: "center" }}>{lieu.concept}</div>
            <div style={{ ...PIX, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "4px 8px", fontSize: board.length > 3 ? 22 : 25, fontWeight: 600, color: "var(--c-green)" }}>
              {board.map((w, i) => (
                <span key={w} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{w}{i < board.length - 1 ? <span style={{ color: "var(--c-ink)" }}>→</span> : null}</span>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", left: 870, top: 250 }}>
            <Sprite url={MAX_CAST} cols={7} row={ROW.down} frames={TALK} fps={5} scale={3} label="Max, le mentor, explique le concept" />
          </div>
          <Bang left={946} top={236} size={40} />
          <TopLeftCard title={lieu.nom} subtitle={`Concept : ${lieu.concept}`} />
          <ValoGauge valo={e.valorisation} anim={null} />
          {timerCard(<div><div style={{ ...PIX, fontSize: 14, fontWeight: 600, color: "var(--c-green)" }}>Tentative</div><Hearts used={Math.min(3, t)} /></div>)}
          <div style={{ position: "absolute", right: 14, top: 90 }}>
            <PxButton variant="cream" size={14} onClick={allerCarte}><MapIcon size={14} /> Retour au village</PxButton>
          </div>
          <DialogBox key={`intro-${lieu.id}`} text={log[0]?.text ?? q(lieu)} nextLabel="Répondre" onNext={() => setPhase("echange")}
            style={{ left: 150, bottom: 16, width: 980, minHeight: 96 }} />
          {bandeauPause}
        </>
      );
    } else {
      const parle = envoi || (log.length > 0 && log[log.length - 1].from === "max");
      const vu = res ? VERDICT_UI[res.verdict] : null;
      const finie = s.statut === "FINISHED";
      scene = (
        <>
          <img src={INTERIOR} alt={`Intérieur : ${lieu.nom}`} style={FULL} />
          <div style={{ ...FULL, background: "var(--veil)" }} />
          <div style={{ position: "absolute", left: 60, top: 560, width: 380, height: 30, borderRadius: "50%", background: "var(--veil)" }} />
          <div style={{ position: "absolute", left: 30, top: 150, width: 440, height: 430, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: (440 - 640) / 2, top: -110 }}>
              <Sprite url={parle ? MAX_CAST : MAX_WALK} cols={parle ? 7 : 9} row={ROW.down} frames={parle ? TALK : IDLE} fps={4} scale={10} label="Portrait de Max, le mentor" />
            </div>
          </div>
          <div style={{ ...PIX, position: "absolute", left: 70, top: 596, width: 360, textAlign: "center", background: "var(--c-green)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 6, padding: "4px 0", fontSize: 18, fontWeight: 700, boxShadow: "3px 3px 0 0 var(--c-ink)" }}>
            MAX <span style={{ color: "var(--c-fawn)" }}>·</span> <span style={{ fontWeight: 500, fontSize: 14 }}>Mentor · Village by 5D</span>
          </div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            style={{ ...PANEL, position: "absolute", left: 14, top: 10, width: 330, height: 66, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", boxSizing: "border-box" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...PIX, fontSize: 17, fontWeight: 700 }}>{ok ? "Lieu validé" : `Tentative ${tentativeAff}/${regles.max_tentatives}`}</div>
              <div style={{ ...RAL, fontSize: 13, fontWeight: 600, color: "var(--c-green)", maxWidth: 190, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lieu.nom}</div>
            </div>
            <div style={{ marginLeft: "auto" }}><Hearts used={Math.min(3, t)} /></div>
          </motion.div>
          <ValoGauge key={valoAnim?.k ?? 0} valo={valoAnim ? valoAnim.to : e.valorisation} anim={valoAnim} />
          <div style={{ position: "absolute", right: 14, top: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <PxButton variant="cream" size={14} onClick={allerCarte}><MapIcon size={14} /> Retour au village</PxButton>
            <div style={{ ...NUM, background: "var(--c-ink)", color: "var(--c-cream)", border: "2px solid var(--c-cream)", borderRadius: 5, padding: "2px 10px", fontSize: 12 }} aria-label="Temps restant et rang">{chrono} · rang {e.rang}/{etat.nb_equipes}</div>
          </div>
          {nextReco && !bandeauPause ? (
            <div style={{ ...RAL, position: "absolute", left: "50%", transform: "translateX(-50%)", top: 92, background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 999, padding: "3px 12px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--c-fawn)" }} />Lieu conseillé ensuite : <strong style={{ color: "var(--c-green)" }}>{nextReco.nom}</strong>
            </div>
          ) : null}
          {bandeauPause}

          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            style={{ ...PANEL, position: "absolute", left: 500, top: 130, width: 764, height: 576, display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
            <div ref={logRef} className="sq-scroll" aria-label="Historique des échanges" style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {log.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "duo" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", background: m.from === "duo" ? "var(--c-mint)" : "var(--c-white)", border: `2px solid ${m.from === "duo" ? "var(--c-teal)" : "var(--c-green)"}`, borderRadius: m.from === "duo" ? "10px 10px 2px 10px" : "10px 10px 10px 2px", padding: "6px 11px", boxShadow: "2px 2px 0 0 var(--veil-light)", overflowWrap: "anywhere" }}>
                    <div style={{ ...PIX, fontSize: 11, fontWeight: 700, color: m.from === "duo" ? "var(--c-ink)" : "var(--c-green)" }}>{m.from === "duo" ? e.entreprise : "Max"}</div>
                    <div style={{ ...RAL, fontSize: 13.5, lineHeight: 1.45, fontWeight: 500, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  </div>
                </div>
              ))}
              {res && vu ? (
                <Bilan res={res} vu={vu} lieu={lieu} regles={regles} maxValo={maxValo} valorisation={e.valorisation}
                  nextReco={nextReco} verrouille={verrouille}
                  onRetravailler={() => { setInput(res.reponse); setResultat(null); setTimeout(() => { saisieRef.current?.focus(); saisieRef.current?.setSelectionRange(res.reponse.length, res.reponse.length); }, 50); }}
                  onSuivant={(l) => ouvrirLieu(l)} onVillage={allerCarte} />
              ) : null}
              {envoi ? (
                <div style={{ ...RAL, alignSelf: "flex-start", fontSize: 12.5, fontWeight: 700, color: "var(--c-green)", background: "var(--c-white)", border: "2px solid var(--c-green)", borderRadius: "10px 10px 10px 2px", padding: "5px 11px" }}>
                  Max réfléchit <span className="sq-dot">●</span><span className="sq-dot">●</span><span className="sq-dot">●</span>
                </div>
              ) : null}
            </div>

            <div style={{ borderTop: "3px solid var(--c-ink)", background: "var(--c-mint)", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                <textarea ref={saisieRef} className="sq-input" value={enAttente ? enAttente.reponse : input} onChange={(x) => setInput(x.target.value)} rows={2} aria-label="Écrivez à Max"
                  disabled={!!enAttente || envoi || finie}
                  onKeyDown={(x) => { if (x.key === "Enter" && !x.shiftKey) { x.preventDefault(); envoyerMessage(); } }}
                  placeholder={ok ? "Lieu validé : vous pouvez encore discuter avec Max." : "Écrivez à Max : votre réponse, une question, une idée…"}
                  style={{ ...RAL, flex: 1, border: "2px solid var(--c-ink)", borderRadius: 5, padding: "7px 10px", fontSize: 14, lineHeight: 1.4, fontWeight: 500, resize: "none", background: "var(--c-white)", color: "var(--c-ink)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                  {enAttente ? (
                    <>
                      <PxButton onClick={() => void envoyerServeur(enAttente, true)} disabled={envoi || verrouille} size={14}><Send size={14} /> {envoi ? "Envoi…" : "Renvoyer"}</PxButton>
                      {!envoi ? <PxButton variant="cream" size={11} onClick={() => { stockage.effacer(CLE_ATTENTE); setInput(enAttente.reponse); setAttente(null); }}>Modifier</PxButton> : null}
                    </>
                  ) : (
                    <PxButton onClick={envoyerMessage} disabled={!input.trim() || envoi || finie} size={15}><Send size={14} /> Envoyer</PxButton>
                  )}
                </div>
              </div>
              {secours && !err ? <span style={{ ...RAL, fontSize: 11, fontWeight: 600, color: "var(--c-muted)" }}>Max (IA) ne répond pas pour l'instant : réponse automatique de secours.</span> : null}
              {err ? <span role="alert" style={{ ...RAL, fontSize: 12, fontWeight: 700, color: "var(--c-fawn-700)" }}>{err}</span> : null}
            </div>
          </motion.div>
          {deltaFloat}
        </>
      );
    }
  } else if (enJeu) {
    /* ===== Carte du village en pixel art ===== */
    const zone = (id: string, nom: string, concept: string, onClick: () => void, opts: { done?: boolean; reco?: boolean; locked?: boolean; desc?: string }) => {
      const b = LAYOUT[id];
      if (!b) return null;
      const below = b.y < 17;
      const t = tentatives(id);
      const ici = etat.equipes.filter((x) => x.lieu_courant === id && !x.moi).map((x) => x.entreprise);
      const labelLeft = Math.min(Math.max((b.x + b.w / 2) * T - 125, 8), SW - 258) - (b.x * T - 4);
      return (
        <button key={id} type="button" className="sq-zone" onClick={() => { if (!marche) onClick(); }}
          aria-label={`${nom}, ${concept}${opts.done ? ", validé" : ""}${opts.locked ? ", verrouillée" : ""}${opts.reco ? ", lieu conseillé" : ""}`}
          aria-disabled={opts.locked || marche !== null}
          style={{ position: "absolute", left: b.x * T - 4, top: b.y * T - 4, width: b.w * T + 8, height: b.h * T + 8, background: "transparent", border: "none", borderRadius: 8, cursor: opts.locked ? "not-allowed" : marche ? "wait" : "pointer", padding: 0 }}>
          <span className="sq-label" style={{ ...PIX, position: "absolute", left: labelLeft, top: below ? b.h * T + 12 : undefined, bottom: below ? undefined : b.h * T + 12, background: "var(--c-cream)", color: "var(--c-ink)", border: "3px solid var(--c-ink)", borderLeft: `8px solid ${quartierDe(id)?.couleur ?? "var(--px-gold)"}`, borderRadius: 5, padding: "6px 10px", fontSize: 13, fontWeight: 700, width: 250, boxSizing: "border-box", whiteSpace: "normal", boxShadow: "3px 3px 0 0 var(--c-ink)", textAlign: "left", lineHeight: 1.3, zIndex: 40 }}>
            {nom}
            <span style={{ ...RAL, display: "block", fontSize: 12, fontWeight: 800, color: "var(--c-green)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{concept}</span>
            <span style={{ ...RAL, display: "block", fontSize: 12, fontWeight: 500, marginTop: 4, lineHeight: 1.35 }}>{opts.desc ?? ACCROCHES[id] ?? ""}</span>
            {!opts.locked ? <span style={{ ...RAL, display: "block", fontSize: 12, fontWeight: 700, marginTop: 4, color: "var(--c-fawn-700)" }}>{opts.done ? "Validé ✓" : t > 0 ? `Tentative ${t}/${regles.max_tentatives}` : "À explorer"}</span> : null}
            {ici.length > 0 ? <span style={{ ...RAL, display: "block", fontSize: 12, fontWeight: 600, marginTop: 4, color: "var(--c-muted)" }}>Ici en ce moment : {ici.join(", ")}</span> : null}
          </span>
          {opts.done ? <span style={{ position: "absolute", right: -10, top: -12 }}><Star size={28} fill="var(--px-gold)" color="var(--c-ink)" strokeWidth={2.5} /></span> : null}
          {opts.reco ? (b.y < 5 ? <Bang left={b.w * T + 10} top={6} /> : <Bang left="50%" top={-42} />) : null}
          {opts.locked ? (
            <span style={{ position: "absolute", left: "50%", marginLeft: -18, bottom: 2, width: 36, height: 36, borderRadius: 6, background: "var(--px-gold)", color: "var(--c-ink)", border: "3px solid var(--c-ink)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 0 var(--c-ink)", boxSizing: "border-box" }}><Lock size={20} strokeWidth={3} /></span>
          ) : null}
        </button>
      );
    };
    const top3: LigneClassement[] = etat.classement.slice(0, 3);
    const texteCarte = (() => {
      if (s.statut === "PAUSED") return "Petite pause : l'animateur reprend la main. Vous pouvez relire vos échanges ; la notation reprendra avec la partie.";
      if (!reco) return "Bravo, tout est validé ! Préparez votre pitch : il se présente en salle, devant le jury, à la fin du temps.";
      const qz = quartierDe(reco.id);
      const fait = qz ? qz.lieux.filter((x) => valides.includes(x)).length : 0;
      return qz ? `${qz.nom} (${qz.verbe}) : ${fait}/${qz.lieux.length} lieux validés. Je vous conseille : ${reco.nom}. Dans un quartier, l'ordre est libre. Cliquez sur un bâtiment pour y entrer.` : `Je vous conseille : ${reco.nom}.`;
    })();
    scene = (
      <>
        <img src={VILLAGE} alt="Carte du Village by 5D" style={FULL} />
        {QUARTIERS.map((qz) => {
          const z = ZONES[qz.id];
          if (!z) return null;
          return <div key={`zone-${qz.id}`} aria-hidden="true" style={{ position: "absolute", left: z.x * T, top: z.y * T, width: z.w * T, height: z.h * T, border: `4px dashed ${qz.couleur}`, borderRadius: 18, background: `color-mix(in srgb, ${qz.couleur} 13%, transparent)`, boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${qz.couleur} 35%, transparent)`, pointerEvents: "none", boxSizing: "border-box" }} />;
        })}
        <div aria-label="Panneau : Village by 5D" style={{ position: "absolute", left: 24 * T, top: 2.2 * T, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", zIndex: 15 }}>
          <div style={{ ...PIX, background: "#8a5a32", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 4, padding: "3px 12px", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "inset 0 -3px 0 #6b4425, 3px 3px 0 0 var(--c-ink)", textShadow: "2px 2px 0 var(--c-ink)" }}>Village by 5D</div>
          <div style={{ display: "flex", gap: 46 }}><div style={{ width: 6, height: 14, background: "#6b4425", border: "2px solid var(--c-ink)", borderTop: "none" }} /><div style={{ width: 6, height: 14, background: "#6b4425", border: "2px solid var(--c-ink)", borderTop: "none" }} /></div>
        </div>
        {LIEUX.map((l) => zone(l.id, l.nom, l.concept, () => marcherVers(l), { done: valides.includes(l.id), reco: reco?.id === l.id }))}
        {zone(FINAL.id, FINAL.nom, FINAL.concept, () => undefined, { locked: true, desc: "Le pitch se présente en salle, devant le jury, une fois la partie terminée." })}
        {QUARTIERS.map((qz) => {
          const fait = qz.lieux.filter((x) => valides.includes(x)).length;
          const complet = fait === qz.lieux.length;
          return (
            <div key={qz.id} aria-label={`${qz.nom} : ${fait} sur ${qz.lieux.length} lieux validés`} style={{ ...PIX, position: "absolute", left: qz.panneau.x * T + 8, top: qz.panneau.y * T - 22, transform: "translateX(-50%)", background: qz.couleur, color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, padding: "2px 10px", fontSize: 16, zIndex: 20, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "3px 3px 0 0 var(--c-ink)", textShadow: "2px 2px 0 var(--c-ink)", display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
              {qz.nom}<span style={{ ...RAL, fontSize: 11, fontWeight: 800, background: "var(--c-cream)", color: "var(--c-ink)", borderRadius: 3, padding: "0 4px", textShadow: "none" }}>{complet ? "✓" : `${fait}/${qz.lieux.length}`}</span>
            </div>
          );
        })}
        {/* Personnages des équipes : devant le bâtiment où elles se trouvent, ou sur la place ; ils marchent quand une équipe change de lieu */}
        <Habitants equipes={etat.equipes} place={PLACE} />
        <MaxMarcheur marche={marche} onArrivee={arriveeMarche} />

        {startupCard}
        <ValoGauge key={valoAnim?.k ?? 0} valo={e.valorisation} anim={null} />
        {timerCard(
          <>
            <div style={{ ...NUM, fontSize: 14, lineHeight: 1.2, textAlign: "center" }}>{nbValides}/{LIEUX.length}<div style={{ ...PIX, fontSize: 14, fontWeight: 500, color: "var(--c-green)" }}>lieux</div></div>
            <div style={{ ...NUM, fontSize: 14, lineHeight: 1.2, textAlign: "center" }}>{e.rang}<span style={{ fontSize: 10 }}>/{etat.nb_equipes}</span><div style={{ ...PIX, fontSize: 14, fontWeight: 500, color: "var(--c-green)" }}>rang</div></div>
          </>,
        )}
        {barreSync}
        {bandeauPause}

        {s.visibilite !== "AUCUN" ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            style={{ ...PANEL, position: "absolute", right: 14, bottom: 14, width: 300, overflow: "hidden", zIndex: 40 }}>
            <div style={{ ...PIX, background: "var(--c-green)", color: "var(--c-cream)", fontSize: 15, fontWeight: 700, padding: "4px 10px", borderBottom: "3px solid var(--c-ink)", display: "flex", alignItems: "center", gap: 6 }}>
              <Star size={14} fill="var(--px-gold)" color="var(--c-ink)" /> Classement en direct
            </div>
            <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              {top3.map((c) => <LigneRang key={c.equipe_id} c={c} />)}
              {e.rang > 3 ? (
                <>
                  <div style={{ ...NUM, fontSize: 9, textAlign: "center", color: "var(--c-muted)" }}>· · ·</div>
                  <LigneRang c={{ equipe_id: e.equipe_id, rang: e.rang, entreprise: e.entreprise, membres: e.membres, valorisation: e.valorisation, valorisation_finale: null, bonus_jury_pct: null, nb_lieux: nbValides, moi: true }} />
                </>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {dialogCarte ? (
          <DialogBox key={`carte-${nbValides}-${s.statut}`} onNext={() => setDialogCarte(false)} nextLabel="Fermer" text={texteCarte}
            style={{ left: 250, bottom: 16, width: 600, maxHeight: 150 }} />
        ) : (
          <button type="button" onClick={() => setDialogCarte(true)} aria-label="Rouvrir le dialogue de Max" style={{ ...PIX, position: "absolute", left: 268, bottom: 16, background: "var(--c-green)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, padding: "1px 18px", fontSize: 18, fontWeight: 600, cursor: "pointer", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>Max</button>
        )}
        {deltaFloat}
      </>
    );
  }

  const hudSyncSeul = s.statut === "CANCELLED" || s.statut === "AWARDING" || s.statut === "PUBLISHED" || (enJeu && ecran === "intro");
  return (
    <div className="sq-root">
      <style>{CSS}</style>
      <Stage>
        {scene}
        {enJeu && ecran !== "intro" ? voileFin : null}
        {hudSyncSeul ? barreSync : null}
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} aria-live="polite">{LIBELLE_STATUT[s.statut]}</span>
      </Stage>
    </div>
  );
}

function LigneRang({ c }: { c: LigneClassement }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: c.moi ? "var(--c-mint)" : "var(--c-white)", border: `2px solid ${c.moi ? "var(--c-ink)" : "var(--c-grey)"}`, borderRadius: 5, padding: "3px 8px" }}>
      <span style={{ ...NUM, fontSize: 11, minWidth: 18, color: c.rang === 1 ? "var(--px-gold-dark)" : "var(--c-ink)" }}>{c.rang}</span>
      <span style={{ ...RAL, fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.entreprise}</span>
      <span style={{ ...NUM, fontSize: 10, color: "var(--c-green)", whiteSpace: "nowrap" }}>{fmt(c.valorisation)}</span>
    </div>
  );
}

/* ===== Podium : remise des prix et classement final ===== */
function Podium({ etat }: { etat: EtatEquipe }) {
  const s = etat.session, e = etat.equipe;
  const final = s.statut === "PUBLISHED";
  const val = (c: LigneClassement) => (final ? c.valorisation_finale ?? c.valorisation : c.valorisation);
  const parRang = (r: number) => etat.classement[r - 1];
  const confetti = Array.from({ length: 46 }, (_, i) => ({
    x: ((i * 197) % 1240) + 20, y: ((i * 89) % 330) + 90, r: (i * 37) % 90,
    c: ["var(--c-fawn-600)", "var(--c-teal)", "var(--px-gold)", "var(--c-mint)", "var(--px-coral)", "var(--c-fawn)"][i % 6],
  }));
  const step = (x: number, top: number, n: number, bg: string) => {
    const c = parRang(n);
    return (
      <div key={n}>
        <div style={{ position: "absolute", left: x, top, width: 170, height: 640 - top, background: bg, border: "3px solid var(--c-ink)", borderRadius: "4px 4px 0 0", boxShadow: "inset 0 6px 0 0 var(--halo), inset -6px 0 0 0 var(--veil-light)", display: "flex", justifyContent: "center", paddingTop: 12, boxSizing: "border-box" }}>
          <span style={{ ...PIX, fontSize: 46, fontWeight: 700, color: "var(--c-ink)" }}>{n}</span>
        </div>
        {c ? (
          <div style={{ ...PANEL, position: "absolute", left: x + 85, top: top - (n === 1 ? 160 : 58), transform: "translateX(-50%)", padding: "3px 10px", textAlign: "center", whiteSpace: "nowrap", maxWidth: 260, zIndex: 5 }}>
            <div style={{ ...PIX, fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{c.entreprise}</div>
            <div style={{ ...NUM, fontSize: 10, color: "var(--c-green)" }}>{fmt(val(c))}</div>
          </div>
        ) : null}
      </div>
    );
  };
  return (
    <>
      <img src={JURY} alt="Salle des investisseurs" style={FULL} />
      <div style={{ position: "absolute", left: 452, top: 150, width: 376, textAlign: "center" }}>
        <div style={{ ...PIX, fontSize: 30, fontWeight: 700, color: "var(--c-fawn)", textShadow: "2px 2px 0 var(--c-ink)" }}>START-UP QUEST</div>
        <div style={{ ...PIX, fontSize: 20, fontWeight: 500, color: "var(--c-mint)", textShadow: "2px 2px 0 var(--c-ink)" }}>{final ? "Classement final" : "Pitchs devant le jury"}</div>
      </div>
      {final ? confetti.map((c, i) => (
        <div key={i} aria-hidden="true" style={{ position: "absolute", left: c.x, top: c.y, width: i % 3 === 0 ? 6 : 10, height: i % 3 === 0 ? 14 : 8, background: c.c, transform: `rotate(${c.r}deg)` }} />
      )) : null}
      {step(400, 540, 2, "var(--px-step2)")}
      {step(740, 566, 3, "var(--px-step3)")}
      {step(570, 490, 1, "var(--c-cream)")}
      <div style={{ position: "absolute", left: 629, top: 420 }}><Trophy size={52} /></div>
      <div style={{ position: "absolute", left: 1090, top: 528, width: 192, height: 192, overflow: "hidden" }}>
        <Sprite url={MAX_CAST} cols={7} row={ROW.down} frames={TALK} fps={6} scale={3} label="Max applaudit" />
      </div>
      <TopLeftCard title={e.entreprise} subtitle={`Rang ${e.rang}/${etat.nb_equipes} · ${fmt(final ? e.valorisation_finale ?? e.valorisation : e.valorisation)}`} />

      <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
        style={{ ...PANEL, position: "absolute", left: 958, top: 120, width: 306, height: 400, display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ ...PIX, background: "var(--c-green)", color: "var(--c-cream)", textAlign: "center", fontSize: 18, fontWeight: 700, padding: "6px 0", borderBottom: "3px solid var(--c-ink)" }}>{final ? "CLASSEMENT FINAL" : "CLASSEMENT PROVISOIRE"}</div>
        <div className="sq-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
          {etat.classement.map((c) => (
            <div key={c.equipe_id}>
              <LigneRang c={{ ...c, valorisation: val(c) }} />
              {final && c.bonus_jury_pct !== null && c.bonus_jury_pct !== undefined ? (
                <div style={{ ...RAL, fontSize: 11, fontWeight: 700, color: "var(--c-fawn-700)", paddingLeft: 30 }}>Bonus jury : {c.bonus_jury_pct > 0 ? "+" : ""}{c.bonus_jury_pct} %</div>
              ) : null}
            </div>
          ))}
          {etat.classement.length === 0 ? <div style={{ ...RAL, fontSize: 13 }}>Le classement complet sera publié par l'animateur.</div> : null}
        </div>
        {s.regle_egalite ? <div style={{ ...RAL, fontSize: 10, fontWeight: 600, color: "var(--c-muted)", padding: "4px 10px", borderTop: "2px dashed var(--c-grey)" }}>Égalités : {s.regle_egalite}</div> : null}
      </motion.div>

      {!final ? (
        <div style={{ ...PIX, position: "absolute", left: 150, top: 656, width: 760, background: "var(--c-fawn-600)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, boxShadow: "3px 3px 0 0 var(--c-ink)", padding: "6px 14px", textAlign: "center", fontSize: 16, fontWeight: 700, boxSizing: "border-box" }}>
          Les équipes qualifiées présentent leur pitch. Le jury peut ajuster leur valorisation de -10 % à +10 %.
        </div>
      ) : null}
    </>
  );
}

/* ===== Bilan d'une réponse notée : qualité, argent gagné ou perdu, critères, suite ===== */
type Regles = EtatEquipe["session"]["regles"];
function Barre({ valeur, max, couleur, reperes, hauteur = 14 }: { valeur: number; max: number; couleur: string; reperes?: { v: number; label: string }[]; hauteur?: number }) {
  const pct = Math.max(0, Math.min(100, (valeur / Math.max(1, max)) * 100));
  return (
    <div style={{ position: "relative", paddingBottom: reperes ? 14 : 0 }}>
      <div style={{ position: "relative", height: hauteur, background: "var(--c-white)", border: "2px solid var(--c-ink)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ height: "100%", background: couleur, boxShadow: "inset 0 -3px 0 0 var(--veil-light)" }} />
        {(reperes ?? []).map((r) => <div key={r.v} style={{ position: "absolute", top: 0, bottom: 0, left: `${(r.v / max) * 100}%`, width: 2, background: "var(--c-ink)" }} />)}
      </div>
      {(reperes ?? []).map((r) => (
        <span key={r.v} style={{ ...RAL, position: "absolute", top: hauteur + 3, left: `${(r.v / max) * 100}%`, transform: "translateX(-50%)", fontSize: 9.5, fontWeight: 700, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{r.label}</span>
      ))}
    </div>
  );
}

function Bilan({ res, vu, lieu, regles, maxValo, valorisation, nextReco, verrouille, onRetravailler, onSuivant, onVillage }: {
  res: Resultat; vu: { label: string; stars: number }; lieu: Lieu; regles: Regles; maxValo: number; valorisation: number;
  nextReco: Lieu | null; verrouille: boolean; onRetravailler: () => void; onSuivant: (l: Lieu) => void; onVillage: () => void;
}) {
  /* Critères : ceux jugés par Max s'il a noté, sinon la grille du moteur de secours. */
  const criteres: { id: string; label: string; ok: boolean; conseil: string | null; poids: number | null }[] = res.criteres
    ? res.criteres.map((c, i) => ({ id: String(i), label: c.label, ok: c.ok, conseil: c.conseil, poids: null }))
    : (CRITERES[lieu.id] ?? []).map((c) => ({ id: c.id, label: c.label, ok: res.acquis.includes(c.label), conseil: c.manque, poids: c.poids }));
  const acquis = criteres.filter((c) => c.ok);
  const manquants = criteres.filter((c) => !c.ok);
  const couleurQualite = res.verdict === "excellente" ? "var(--px-up)" : res.verdict === "correcte" ? "var(--px-gold)" : "var(--px-coral)";
  const titre = (t: string) => <div style={{ ...PIX, fontSize: 11.5, fontWeight: 700, color: "var(--c-green)", textTransform: "uppercase", marginBottom: 4 }}>{t}</div>;
  const peutRetravailler = !res.valide && !!res.potSuivant && !verrouille;
  const gainPerdu = res.potMax - Math.max(0, res.delta);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      style={{ position: "relative", alignSelf: "stretch", background: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 6, boxShadow: "3px 3px 0 0 var(--c-ink)", padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}
      aria-label="Bilan de votre réponse">
      {res.delta > 0 ? <div style={{ position: "absolute", left: 220, top: 0 }}><CoinRain k={res.k} /></div> : null}

      {/* En-tête : verdict et montant */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: -2 }}>
            {[0, 1, 2].map((i) => <Star key={i} size={17} fill={i < vu.stars ? "var(--px-gold)" : "var(--c-grey)"} color="var(--c-ink)" strokeWidth={2.5} />)}
          </div>
          <Ribbon text={vu.label} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...NUM, fontSize: 22, color: res.delta >= 0 ? "var(--c-green)" : "var(--c-fawn-600)", textShadow: "2px 2px 0 var(--c-ink)", whiteSpace: "nowrap" }}>{signe(res.delta)}</div>
          <div style={{ ...RAL, fontSize: 11, fontWeight: 700, color: "var(--c-muted)" }}>Tentative {res.tentative}/{regles.max_tentatives} · valorisation : {fmt(valorisation)}</div>
        </div>
      </div>

      {/* Barre 1 : qualité */}
      <div>
        {titre(`Qualité de la réponse : ${res.score}/100`)}
        <Barre valeur={res.score} max={100} couleur={couleurQualite} reperes={[{ v: 50, label: "Bonne (50)" }, { v: 75, label: "Excellente (75)" }]} />
      </div>

      {/* Barre 2 : argent gagné sur ce lieu */}
      <div>
        {titre("Argent gagné sur ce lieu")}
        <Barre valeur={Math.max(0, res.delta)} max={res.potMax} couleur="var(--c-teal)" reperes={res.potMin > 0 ? [{ v: res.potMin, label: `Bonne ${signe(res.potMin)}` }] : undefined} />
        <div style={{ ...RAL, fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginTop: 2 }}>
          {res.delta < 0
            ? <>Réponse insuffisante : malus de {Math.round((regles.malus_pct ?? 0.05) * 100)} % sur votre valorisation, soit <strong style={{ color: "var(--c-fawn-700)" }}>{signe(res.delta)}</strong>. Une réponse « Excellente » vous aurait rapporté <strong>{signe(res.potMax)}</strong>.</>
            : gainPerdu > 0
              ? <>Vous avez gagné <strong style={{ color: "var(--c-green)" }}>{signe(res.delta)}</strong> sur {fmt(res.potMax)} possibles à cette tentative. Il vous manquait <strong>{fmt(gainPerdu)}</strong> pour le maximum.</>
              : <>Maximum atteint pour cette tentative : <strong style={{ color: "var(--c-green)" }}>{signe(res.delta)}</strong>.</>}
        </div>
        <div style={{ marginTop: 6 }}>
          <Barre valeur={valorisation - regles.depart} max={maxValo - regles.depart} couleur="var(--c-fawn)" hauteur={8} />
          <div style={{ ...RAL, fontSize: 10.5, fontWeight: 600, color: "var(--c-muted)" }}>Progression de la partie : {fmt(valorisation)} sur {fmt(maxValo)} possibles</div>
        </div>
      </div>

      {/* Pourquoi : critères */}
      {criteres.length > 0 ? (
        <div>
          {titre("Pourquoi cette note")}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {acquis.map((c) => (
              <div key={c.id} style={{ ...RAL, display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: 3, background: "var(--px-up)", border: "2px solid var(--c-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Check size={10} strokeWidth={4} /></span>
                <span>{c.label[0].toUpperCase() + c.label.slice(1)}{c.poids ? <span style={{ color: "var(--c-muted)" }}> (+{c.poids} pts)</span> : null}</span>
              </div>
            ))}
            {manquants.map((c) => (
              <div key={c.id} style={{ ...RAL, display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, fontWeight: 600 }}>
                <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: 3, background: "var(--px-coral)", border: "2px solid var(--c-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={10} strokeWidth={4} /></span>
                <span>{c.label[0].toUpperCase() + c.label.slice(1)}{c.poids ? <span style={{ color: "var(--c-muted)" }}> (+{c.poids} pts possibles)</span> : null}{c.conseil ? <> : <span style={{ fontWeight: 500 }}>{c.conseil}</span></> : null}</span>
              </div>
            ))}
            {res.filRouge ? <div style={{ ...RAL, fontSize: 12, fontWeight: 600, color: res.filRouge.ok ? "var(--c-green)" : "var(--c-fawn-700)" }}>{res.filRouge.texte}</div> : null}
            <div style={{ ...RAL, fontSize: 10.5, fontWeight: 600, color: "var(--c-muted)" }}>{res.parMax ? "Note attribuée par Max, selon son expertise produit appliquée à votre start-up." : "Notation automatique de secours. Bonus : +5 avec un chiffre, +5 si la réponse fait entre 15 et 120 mots."}</div>
          </div>
        </div>
      ) : null}

      {/* Comment faire mieux */}
      {res.verdict !== "excellente" ? (
        <div style={{ ...RAL, background: "var(--c-fawn-300)", border: "2px solid var(--c-fawn-700)", borderRadius: 5, padding: "6px 10px", fontSize: 12.5, lineHeight: 1.4, fontWeight: 600 }}>
          <span style={{ ...PIX, color: "var(--c-green)", display: "inline-flex", alignItems: "center", gap: 4 }}><TrendingUp size={13} /> Pour gagner plus :</span>{" "}
          {res.conseil ?? manquants[0]?.conseil ?? lieu.conseil}
          {res.potSuivant ? <> À la prochaine tentative : <strong>{signe(res.potSuivant.correcte)}</strong> pour une bonne réponse, <strong>{signe(res.potSuivant.excellente)}</strong> pour une excellente.</> : null}
          {res.verdict === "insuffisante" ? (
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              <span style={{ ...PIX, fontSize: 11, color: "var(--c-green)", display: "inline-flex", alignItems: "center", gap: 4 }}><BookOpen size={12} /> Source :</span>
              {(SOURCE_LINKS[lieu.id] ?? []).map((src) => <a key={src.url} href={src.url} target="_blank" rel="noreferrer" style={{ color: "var(--c-green)", fontSize: 12, fontWeight: 700, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>{src.label} <ExternalLink size={11} /></a>)}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Et maintenant ? */}
      <div style={{ borderTop: "2px dashed var(--c-teal)", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ ...PIX, fontSize: 13, fontWeight: 700 }}>
          {peutRetravailler ? "Voulez-vous retravailler votre réponse ?" : res.valide ? "Lieu validé ! On continue ?" : "Plus de tentative sur ce lieu."}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {peutRetravailler ? (
            <>
              <PxButton size={12} onClick={onRetravailler}><RotateCcw size={12} /> Retravailler</PxButton>
              <PxButton size={12} variant="cream" onClick={onVillage}>Plus tard</PxButton>
            </>
          ) : (
            <>
              {nextReco ? <PxButton size={12} variant="green" onClick={() => onSuivant(nextReco)}>{nextReco.nom} <ArrowRight size={12} /></PxButton> : null}
              <PxButton size={12} variant="cream" onClick={onVillage}><MapIcon size={12} /> Village</PxButton>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}


/* =========================================================
   Déplacement de Max sur la carte du village
   ========================================================= */

type Point = { x: number; y: number };
type Marche = { lieuId: string; points: Point[] };

/* Position de Max au repos sur la place (coin haut gauche du sprite 64x64). */
const MAX_DEPART: Point = { x: 664, y: 386 };
/* Allée principale du village, empruntée avant de bifurquer vers un bâtiment. */
const ALLEE_Y = 402;
const VITESSE = 260; // px par seconde

const borne = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const direction = (a: Point, b: Point) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ROW.right : ROW.left;
  return dy >= 0 ? ROW.down : ROW.up;
};

/* Point d'arrivée devant l'entrée du bâtiment, côté place. */
function entree(id: string): Point | null {
  const b = LAYOUT[id];
  if (!b) return null;
  const cx = borne((b.x + b.w / 2) * T - 32, 24, SW - 88);
  const cy = borne((b.y + b.h / 2) * T - 32, 74, SH - 90);
  if (b.y < 10) return { x: cx, y: (b.y + b.h + 0.8) * T - 32 };
  if (b.y > 17) return { x: cx, y: (b.y - 0.8) * T - 32 };
  if (b.x > 34) return { x: (b.x - 0.9) * T - 32, y: cy };
  return { x: (b.x + b.w + 0.9) * T - 32, y: cy };
}

/* Chemin en L : rejoindre l'allée, la suivre, puis monter ou descendre jusqu'à l'entrée. */
function cheminVers(id: string): Point[] | null {
  const fin = entree(id);
  if (!fin) return null;
  const brut = [MAX_DEPART, { x: MAX_DEPART.x, y: ALLEE_Y }, { x: fin.x, y: ALLEE_Y }, fin];
  return brut.filter((p, i) => i === 0 || distance(p, brut[i - 1]) > 4);
}

function MaxMarcheur({ marche, onArrivee }: { marche: Marche | null; onArrivee: () => void }) {
  const [etape, setEtape] = useState(1);
  const arriveeRef = useRef(onArrivee);
  arriveeRef.current = onArrivee;

  useEffect(() => { setEtape(1); }, [marche]);

  const points = marche?.points ?? [MAX_DEPART];
  const enMarche = marche !== null && etape < points.length;
  const cible = enMarche ? points[etape] : points[Math.min(etape, points.length) - 1] ?? MAX_DEPART;
  const depuis = enMarche ? points[etape - 1] : cible;
  const sens = enMarche ? direction(depuis, cible) : ROW.down;
  const duree = enMarche ? Math.max(0.15, distance(depuis, cible) / VITESSE) : 0;

  const finSegment = () => {
    if (!marche) return;
    if (etape + 1 < points.length) { setEtape(etape + 1); return; }
    setEtape(points.length);
    window.setTimeout(() => arriveeRef.current(), 150);
  };

  return (
    <motion.div
      initial={false}
      animate={{ x: cible.x, y: cible.y }}
      transition={enMarche ? { duration: duree, ease: "linear" } : { duration: 0 }}
      onAnimationComplete={enMarche ? finSegment : undefined}
      style={{ position: "absolute", left: 0, top: 0, zIndex: 25, pointerEvents: "none" }}
    >
      <motion.div animate={enMarche ? { y: 0 } : { y: [0, -2, 0] }} transition={enMarche ? { duration: 0 } : { duration: 1.2, repeat: Infinity, delay: 0.8 }}>
        <Sprite url={MAX_WALK} cols={9} row={sens} frames={WALK} fps={enMarche ? 10 : 5} scale={1} label="Max" />
      </motion.div>
      <NameTag name="Max" x={32} y={-6} />
    </motion.div>
  );
}
