import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Lock, Send, Map as MapIcon, BookOpen, ExternalLink, LogOut, Users, Pause, Flag } from "lucide-react";
import { LIEUX, FINAL, TABLEAU } from "../../supabase/functions/_shared/jeu/data.ts";
import type { Lieu } from "../../supabase/functions/_shared/jeu/data.ts";
import { QUARTIERS, ACCROCHES, quartierDe } from "../../supabase/functions/_shared/jeu/strategie.ts";
import { VILLAGE, INTERIOR, HALL, COUNTER, JURY, MAX_WALK, MAX_CAST, LAYOUT } from "./assets";
import {
  SW, T, CSS, PIX, RAL, PANEL, FULL, NUM, fmt, fmtTime, WALK, IDLE, TALK, ROW,
  Sprite, Trophy, PxButton, DialogBox, NameTag, Bang, ValoGauge, Hearts, TopLeftCard, CoinRain, Ribbon, Stage,
} from "./ui";
import type { ValoAnim } from "./ui";
import { ErreurJeu, envoyerReponse, rpc, stockage } from "../api";
import type { EtatEquipe, LigneClassement, Presence, ResultatReponse } from "../types";
import { IndicateurSync, LIBELLE_STATUT, nouvelId, tempsRestant, useMaintenant } from "../util";
import { chatReply, routerMessage } from "./max";
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
type Resultat = { lieuId: string; verdict: Verdict; score: number; delta: number; potMin: number; potMax: number; k: number };

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
const PALETTE = ["#FA8A54", "#4BB4B6", "#F8D786", "#B7DEDE", "#EF9278", "#7BE495", "#C0CBDC", "#F7B17D", "#DB7B4B", "#FCDAC2", "#B0885A", "#FFFFFF"];
const initiales = (n: string) => n.split(/\s+/).filter(Boolean).map((m) => m[0]).join("").slice(0, 2).toUpperCase();
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
  const [route, setRoute] = useState<"evaluer" | "discuter" | null>(null);
  const [dialogCarte, setDialogCarte] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const maintenant = useMaintenant(500);

  useEffect(() => { stockage.ecrire(cleLog, logs); }, [cleLog, logs]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [logs, lieuId, phase, resultat]);
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
    `Vous n'êtes pas seuls : ${Math.max(0, etat.nb_equipes - 1)} autre(s) équipe(s) explorent le village en même temps. Vous verrez leurs pions se déplacer et le classement évoluer en direct.`,
    "Attention, une réponse floue fait baisser votre valeur, et le chrono est le même pour tout le monde. Prêts ? Direction le village !",
  ], [e.entreprise, produit, etat.nb_equipes]);

  const finIntro = () => { stockage.ecrire(cleIntro, true); setEcran("carte"); setDialogCarte(true); };
  const ajouterLog = (id: string, ...m: Msg[]) => setLogs((x) => ({ ...x, [id]: [...(x[id] ?? []), ...m] }));

  const allerCarte = () => {
    setValoAnim(null); setResultat(null); setErr(null); setDialogCarte(true);
    setLieuId(null); setEcran("carte");
    if (!verrouille) rpc("deplacer_equipe", { p_token: token, p_lieu: null }).then(rafraichir, () => undefined);
  };

  const ouvrirLieu = (l: Lieu) => {
    if (s.statut === "FINISHED") return;
    setLieuId(l.id); setInput(""); setValoAnim(null); setResultat(null); setErr(null); setRoute(null);
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

  /* Texte de Max à partir du verdict calculé par le serveur */
  const texteMax = (l: Lieu, r: ResultatReponse) => {
    const d = r.details ?? {};
    const bilan = [
      d.acquis && d.acquis.length > 0 ? `Points forts : ${d.acquis.join(", ")}.` : "",
      d.manquant ? `À renforcer : ${d.manquant}` : "",
      d.piege ?? "", d.garde ?? "", d.fil_rouge?.texte ?? "",
    ].filter(Boolean).join(" ");
    const next = prochain(l.id);
    const suite = next ? ` Prochaine étape conseillée : ${next.nom}.` : " Tous les lieux sont validés : préparez votre pitch pour la Salle des investisseurs !";
    if (r.verdict === "excellente") return `Excellente réponse ! Qualité : ${r.score}/100. ${signe(r.delta)}. ${bilan} ${d.explication ?? l.explication}${suite}`;
    if (r.verdict === "correcte") return `Réponse correcte, qualité : ${r.score}/100. Lieu validé : ${signe(r.delta)}. ${bilan}${suite}`;
    if (r.valide) return `À retravailler, qualité : ${r.score}/100 (${signe(r.delta)}). ${bilan} Voici une piste : ${d.piste ?? l.piste} Retenez : ${d.explication ?? l.explication}${suite}`;
    return `Pas encore convaincant, qualité : ${r.score}/100 (${signe(r.delta)}). ${bilan} ${d.conseil ? `Conseil : ${d.conseil} ` : ""}Reformulez, ou discutez avec moi sans notation avant de retenter.`;
  };

  /* Envoi idempotent : l'identifiant est conservé jusqu'à confirmation du serveur,
     si bien qu'un renvoi après coupure réseau ou rechargement ne compte jamais double. */
  const envoyerServeur = async (a: Attente) => {
    if (envoi) return;
    const l = LIEUX.find((x) => x.id === a.lieu);
    if (!l) return;
    setEnvoi(true); setErr(null);
    const avant = e.valorisation;
    const t = tentatives(l.id) + 1;
    try {
      const r = await envoyerReponse<ResultatReponse>({ token, client_action_id: a.id, lieu: a.lieu, reponse: a.reponse });
      ajouterLog(l.id, { from: "duo", text: a.reponse }, { from: "max", text: texteMax(l, r) });
      const tt = r.tentative || t;
      setResultat({
        lieuId: l.id, verdict: r.verdict, score: r.score, delta: r.delta, k: Date.now(),
        potMin: Math.round(((r.verdict === "insuffisante" ? 0 : regles.correcte) * coef(tt)) / 1000) * 1000,
        potMax: Math.round((regles.excellente * coef(tt)) / 1000) * 1000,
      });
      if (!r.deja_traite) { setValoAnim({ from: avant, to: r.valorisation, k: Date.now() }); setDelta({ v: r.delta, k: Date.now() }); }
      stockage.effacer(CLE_ATTENTE); setAttente(null); setInput("");
      rafraichir();
    } catch (x) {
      const er = x instanceof ErreurJeu ? x : new ErreurJeu("RESEAU");
      setErr(er.message);
      if (er.code !== "RESEAU") { stockage.effacer(CLE_ATTENTE); setAttente(null); setInput(a.reponse); }
    } finally { setEnvoi(false); }
  };

  const envoyerMessage = () => {
    if (!lieu || envoi || input.trim() === "" || s.statut === "FINISHED") return;
    const texte = input.trim();
    const peutEvaluer = !valides.includes(lieu.id) && !verrouille;
    const r = routerMessage(texte, lieu, peutEvaluer);
    setRoute(r);
    if (r === "discuter") {
      setResultat(null);
      ajouterLog(lieu.id, { from: "duo", text: texte }, { from: "max", text: chatReply(texte, lieu) });
      setInput("");
      return;
    }
    const a = { id: nouvelId(), lieu: lieu.id, reponse: texte };
    stockage.ecrire(CLE_ATTENTE, a); setAttente(a);
    void envoyerServeur(a);
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
          style={{ left: 890, top: 590, width: 370, minHeight: 104, boxSizing: "border-box" }} />
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
            style={{ left: 200, top: 590, width: 880, minHeight: 104, boxSizing: "border-box" }} />
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
            style={{ left: 150, top: 572, width: 980, minHeight: 118, boxSizing: "border-box" }} />
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
          <div style={{ ...PIX, position: "absolute", left: 70, top: 596, width: 360, textAlign: "center", background: "var(--c-green)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 6, padding: "4px 0", fontSize: 22, fontWeight: 700, boxShadow: "3px 3px 0 0 var(--c-ink)" }}>
            MAX <span style={{ color: "var(--c-fawn)" }}>·</span> <span style={{ fontWeight: 500, fontSize: 18 }}>Mentor · Village by 5D</span>
          </div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            style={{ ...PANEL, position: "absolute", left: 14, top: 10, width: 330, height: 66, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", boxSizing: "border-box" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...PIX, fontSize: 20, fontWeight: 700 }}>{ok ? "Lieu validé" : `Tentative ${tentativeAff}/${regles.max_tentatives}`}</div>
              <div style={{ ...RAL, fontSize: 13, fontWeight: 600, color: "var(--c-green)", maxWidth: 190, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lieu.nom}</div>
            </div>
            <div style={{ marginLeft: "auto" }}><Hearts used={Math.min(3, t)} /></div>
          </motion.div>
          <ValoGauge key={valoAnim?.k ?? 0} valo={valoAnim ? valoAnim.to : e.valorisation} anim={valoAnim} />
          <div style={{ position: "absolute", right: 14, top: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <PxButton variant="cream" size={16} onClick={allerCarte}><MapIcon size={16} /> Retour au village</PxButton>
            <div style={{ ...NUM, background: "var(--c-ink)", color: "var(--c-cream)", border: "2px solid var(--c-cream)", borderRadius: 5, padding: "2px 10px", fontSize: 12 }} aria-label="Temps restant et rang">{chrono} · rang {e.rang}/{etat.nb_equipes}</div>
          </div>
          {nextReco && !bandeauPause ? (
            <div style={{ ...RAL, position: "absolute", left: "50%", transform: "translateX(-50%)", top: 92, background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 999, padding: "3px 14px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--c-fawn)" }} />Lieu conseillé ensuite : <strong style={{ color: "var(--c-green)" }}>{nextReco.nom}</strong>
            </div>
          ) : null}
          {bandeauPause}

          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            style={{ ...PANEL, position: "absolute", left: 500, top: 132, width: 764, height: 574, display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
            <div ref={logRef} className="sq-scroll" aria-label="Historique des échanges" style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {log.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "duo" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", background: m.from === "duo" ? "var(--c-mint)" : "var(--c-white)", border: `2px solid ${m.from === "duo" ? "var(--c-teal)" : "var(--c-green)"}`, borderRadius: m.from === "duo" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "8px 12px", boxShadow: "2px 2px 0 0 var(--veil-light)" }}>
                    <div style={{ ...PIX, fontSize: 14, fontWeight: 700, color: m.from === "duo" ? "var(--c-ink)" : "var(--c-green)" }}>{m.from === "duo" ? e.entreprise : "Max"}</div>
                    <div style={{ ...RAL, fontSize: 15, lineHeight: 1.45, fontWeight: 500 }}>{m.text}</div>
                  </div>
                </div>
              ))}
              {envoi ? <div style={{ ...RAL, fontSize: 14, fontWeight: 700, color: "var(--c-green)" }}>Max réfléchit… (évaluation sur le serveur)</div> : null}
            </div>

            {res ? (
              <div style={{ position: "relative", borderTop: "3px solid var(--c-ink)", background: "var(--c-cream)", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, padding: "10px 16px", minHeight: 142, flexWrap: "wrap" }}>
                {res.delta > 0 ? <div style={{ position: "absolute", left: 260, top: 0 }}><CoinRain k={res.k} /></div> : null}
                {vu ? (
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: -2 }}>
                      {[0, 1, 2].map((i) => <Star key={i} size={22} fill={i < vu.stars ? "var(--px-gold)" : "var(--c-grey)"} color="var(--c-ink)" strokeWidth={2.5} />)}
                    </div>
                    <Ribbon text={vu.label} />
                    <div style={{ ...NUM, marginTop: 5, fontSize: 12, color: "var(--c-green)" }}>Qualité : {res.score}/100</div>
                  </motion.div>
                ) : null}
                <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.15 }} style={{ textAlign: "center" }}>
                  <div style={{ ...NUM, fontSize: 32, color: res.delta >= 0 ? "var(--c-green)" : "var(--c-fawn-600)", textShadow: "3px 3px 0 var(--c-ink)", whiteSpace: "nowrap" }}>{signe(res.delta)}</div>
                  <div style={{ ...RAL, fontSize: 12, fontWeight: 700, color: "var(--c-ink)" }}>Potentiel sur ce lieu : {fmt(res.potMin)} à {fmt(res.potMax)}</div>
                  <div style={{ ...RAL, fontSize: 11, fontWeight: 600, color: "var(--c-muted)" }}>Valorisation totale possible : {fmt(regles.depart)} à {fmt(maxValo)}</div>
                </motion.div>
                {res.verdict === "insuffisante" ? (
                  <div style={{ flexBasis: "100%", borderTop: "2px dashed var(--c-teal)", paddingTop: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{ ...RAL, width: "100%", boxSizing: "border-box", background: "var(--c-fawn-300)", border: "2px solid var(--c-fawn-700)", borderRadius: 5, padding: "5px 9px", fontSize: 12, lineHeight: 1.35, fontWeight: 700, color: "var(--c-ink)" }}>
                      <span style={{ ...PIX, color: "var(--c-green)" }}>Piste :</span> {lieu.piste}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 7 }}>
                      <span style={{ ...PIX, fontSize: 13, fontWeight: 700, color: "var(--c-green)", display: "inline-flex", alignItems: "center", gap: 5 }}><BookOpen size={15} /> Source pour progresser :</span>
                      {(SOURCE_LINKS[lieu.id] ?? []).map((src) => <a key={src.url} href={src.url} target="_blank" rel="noreferrer" style={{ ...RAL, color: "var(--c-green)", fontSize: 12, fontWeight: 700, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 3 }}>{src.label} <ExternalLink size={12} /></a>)}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div style={{ borderTop: "3px solid var(--c-ink)", background: "var(--c-mint)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "stretch" }}>
              <textarea className="sq-input" value={enAttente ? enAttente.reponse : input} onChange={(x) => setInput(x.target.value)} rows={2} aria-label="Écrivez à Max"
                disabled={!!enAttente || envoi || finie}
                onKeyDown={(x) => { if (x.key === "Enter" && !x.shiftKey) { x.preventDefault(); envoyerMessage(); } }}
                placeholder={ok ? "Lieu validé : vous pouvez encore discuter avec Max (sans notation)." : "Écrivez à Max : votre réponse, une question, ou ce qui vous passe par la tête…"}
                style={{ ...RAL, flex: 1, border: "2px solid var(--c-ink)", borderRadius: 5, padding: "8px 12px", fontSize: 16, fontWeight: 500, resize: "none", background: "var(--c-white)", color: "var(--c-ink)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                {enAttente ? (
                  <>
                    <PxButton onClick={() => void envoyerServeur(enAttente)} disabled={envoi || verrouille} size={16}><Send size={15} /> {envoi ? "Envoi…" : "Renvoyer"}</PxButton>
                    {!envoi ? <PxButton variant="cream" size={12} onClick={() => { stockage.effacer(CLE_ATTENTE); setInput(enAttente.reponse); setAttente(null); }}>Modifier</PxButton> : null}
                  </>
                ) : (
                  <PxButton onClick={envoyerMessage} disabled={!input.trim() || envoi || finie} size={18}><Send size={16} /> {envoi ? "Max réfléchit…" : "Envoyer"}</PxButton>
                )}
                <span role="status" style={{ ...RAL, maxWidth: 190, fontSize: 11, lineHeight: 1.2, fontWeight: 600, color: err ? "var(--c-fawn-700)" : "var(--c-ink)" }}>
                  {err ?? (enAttente ? "Réponse en attente de confirmation du serveur." : s.statut === "PAUSED" ? "Partie en pause : discussion possible, notation suspendue." : route === "evaluer" ? "Max a évalué votre dernier message (calcul serveur)." : route === "discuter" ? "Discussion libre : ni note, ni impact sur la valorisation." : "Max décide seul : réponse à noter ou simple discussion.")}
                </span>
              </div>
            </div>
          </motion.div>
          {deltaFloat}
        </>
      );
    }
  } else if (enJeu) {
    /* ===== Carte du village en pixel art ===== */
    const pionsPar = (lieuCourant: string | null): Presence[] => etat.equipes.filter((x) => (x.lieu_courant ?? null) === lieuCourant);
    const couleur = (id: string) => PALETTE[Math.max(0, etat.equipes.findIndex((x) => x.equipe_id === id)) % PALETTE.length];
    const pions = (cle: string, liste: Presence[], cx: number, cy: number) => liste.length === 0 ? null : (
      <div key={`pions-${cle}`} aria-hidden="true" style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", display: "flex", gap: 3, zIndex: 25, pointerEvents: "none" }}>
        {liste.slice(0, 6).map((p) => (
          <motion.span key={p.equipe_id} layoutId={`pion-${p.equipe_id}`} transition={{ duration: 0.8 }} title={p.entreprise}
            style={{ ...NUM, width: p.moi ? 30 : 24, height: p.moi ? 30 : 24, borderRadius: 999, background: couleur(p.equipe_id), color: "var(--c-ink)", border: `3px solid ${p.moi ? "var(--c-fawn-600)" : "var(--c-ink)"}`, outline: p.moi ? "2px solid var(--c-ink)" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, boxShadow: "2px 2px 0 0 var(--c-ink)", opacity: p.en_ligne ? 1 : 0.45, boxSizing: "border-box" }}>
            {initiales(p.entreprise)}
          </motion.span>
        ))}
        {liste.length > 6 ? <span style={{ ...NUM, fontSize: 9, color: "var(--c-cream)", textShadow: "1px 1px 0 var(--c-ink)", alignSelf: "center" }}>+{liste.length - 6}</span> : null}
      </div>
    );
    const zone = (id: string, nom: string, concept: string, onClick: () => void, opts: { done?: boolean; reco?: boolean; locked?: boolean; desc?: string }) => {
      const b = LAYOUT[id];
      if (!b) return null;
      const below = b.y < 17;
      const t = tentatives(id);
      const ici = etat.equipes.filter((x) => x.lieu_courant === id && !x.moi).map((x) => x.entreprise);
      const labelLeft = Math.min(Math.max((b.x + b.w / 2) * T - 135, 8), SW - 278) - (b.x * T - 4);
      return (
        <button key={id} type="button" className="sq-zone" onClick={onClick}
          aria-label={`${nom}, ${concept}${opts.done ? ", validé" : ""}${opts.locked ? ", verrouillée" : ""}${opts.reco ? ", lieu conseillé" : ""}`}
          aria-disabled={opts.locked}
          style={{ position: "absolute", left: b.x * T - 4, top: b.y * T - 4, width: b.w * T + 8, height: b.h * T + 8, background: "transparent", border: "none", borderRadius: 8, cursor: opts.locked ? "not-allowed" : "pointer", padding: 0 }}>
          <span className="sq-label" style={{ ...PIX, position: "absolute", left: labelLeft, top: below ? b.h * T + 12 : undefined, bottom: below ? undefined : b.h * T + 12, background: "var(--c-cream)", color: "var(--c-ink)", border: "3px solid var(--c-ink)", borderLeft: `8px solid ${quartierDe(id)?.couleur ?? "var(--px-gold)"}`, borderRadius: 5, padding: "6px 10px", fontSize: 15, fontWeight: 700, width: 270, boxSizing: "border-box", whiteSpace: "normal", boxShadow: "3px 3px 0 0 var(--c-ink)", textAlign: "left", lineHeight: 1.3, zIndex: 40 }}>
            {nom}
            <span style={{ ...RAL, display: "block", fontSize: 12, fontWeight: 800, color: "var(--c-green)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{concept}</span>
            <span style={{ ...RAL, display: "block", fontSize: 13, fontWeight: 500, marginTop: 4 }}>{opts.desc ?? ACCROCHES[id] ?? ""}</span>
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
        {LIEUX.map((l) => zone(l.id, l.nom, l.concept, () => ouvrirLieu(l), { done: valides.includes(l.id), reco: reco?.id === l.id }))}
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
        {/* Pions des équipes : sous le bâtiment où elles se trouvent, ou sur la place */}
        {LIEUX.map((l) => {
          const b = LAYOUT[l.id];
          return b ? pions(l.id, pionsPar(l.id), (b.x + b.w / 2) * T, (b.y + b.h) * T + 16) : null;
        })}
        {pions("place", pionsPar(null), PLACE.x, PLACE.y)}
        <div style={{ position: "absolute", left: 664, top: 386 }}>
          <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}>
            <Sprite url={MAX_WALK} cols={9} row={ROW.down} frames={WALK} fps={5} scale={1} label="Max" />
          </motion.div>
          <NameTag name="Max" x={32} y={-6} />
        </div>

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
            style={{ left: 250, top: 630, width: 680, minHeight: 76, boxSizing: "border-box" }} />
        ) : (
          <button type="button" onClick={() => setDialogCarte(true)} aria-label="Rouvrir le dialogue de Max" style={{ ...PIX, position: "absolute", left: 268, top: 676, background: "var(--c-green)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, padding: "1px 18px", fontSize: 18, fontWeight: 600, cursor: "pointer", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>Max</button>
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
