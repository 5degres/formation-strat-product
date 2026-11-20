import { useEffect, useMemo, useRef, useState } from "react";
import type { Presence } from "../types";
import { LAYOUT } from "./assets";
import { CALQUES } from "./calques";
import { T, PIX, RAL, NUM, WALK, IDLE, ROW, Sprite } from "./ui";

/* =========================================================
   Habitants du village : un personnage pixel art par équipe.
   - L'apparence est tirée au hasard à partir de l'identifiant
     de l'équipe (UUID aléatoire créé avec l'équipe) : chaque
     navigateur calcule donc le même personnage, sans rien
     stocker de plus dans Supabase.
   - Les personnages attendent devant le bâtiment où se trouve
     l'équipe et marchent sur les chemins du village quand elle
     change de lieu.
   Calques : Liberated Pixel Cup (LPC), voir src/jeu/CREDITS_PERSONNAGES.md.
   ========================================================= */

type Rgb = [number, number, number];
type Pt = { x: number; y: number };

const couche = (nom: string) => CALQUES[nom];

/* ---------- Palettes (les calques LPC utilisent des rampes de couleurs fixes) ---------- */
const PEAU_SRC: Rgb[] = [[153, 66, 60], [204, 134, 101], [228, 164, 124], [249, 213, 186], [250, 236, 231]];
const CHEVEUX_SRC: Rgb[] = [[106, 17, 8], [164, 38, 0], [191, 64, 0], [229, 86, 0], [255, 138, 0]];
const TISSU_SRC: Rgb[] = [[77, 74, 93], [149, 128, 128], [196, 181, 159], [229, 230, 199], [255, 255, 255]];
const YEUX_SRC: Rgb[] = [[42, 60, 73], [86, 134, 174], [87, 206, 228]];

const PEAUX: Rgb[][] = [
  PEAU_SRC,
  [[150, 80, 70], [214, 150, 120], [236, 180, 145], [250, 222, 200], [252, 238, 228]],
  [[120, 70, 45], [180, 120, 80], [205, 150, 105], [230, 190, 150], [240, 210, 180]],
  [[100, 55, 40], [160, 100, 65], [185, 125, 85], [215, 165, 120], [228, 190, 150]],
  [[70, 38, 30], [120, 72, 48], [145, 92, 62], [180, 125, 90], [200, 150, 115]],
  [[45, 25, 22], [85, 50, 38], [105, 65, 48], [140, 95, 70], [165, 120, 92]],
];
const CHEVEUX_COULEURS: Rgb[][] = [
  [[20, 18, 24], [35, 30, 38], [50, 44, 52], [68, 60, 70], [90, 80, 92]], // noir
  [[45, 25, 15], [70, 40, 22], [90, 55, 30], [115, 72, 40], [140, 95, 55]], // brun
  [[80, 45, 20], [115, 70, 35], [140, 90, 45], [170, 115, 60], [200, 145, 80]], // châtain
  [[150, 105, 40], [195, 150, 70], [220, 180, 95], [240, 210, 130], [252, 235, 170]], // blond
  CHEVEUX_SRC, // roux
  [[90, 90, 95], [130, 130, 135], [160, 160, 165], [190, 190, 195], [220, 220, 225]], // gris
];
const YEUX: Rgb[][] = [
  [[40, 28, 24], [90, 60, 40], [130, 90, 60]], // marron
  YEUX_SRC, // bleu
  [[30, 55, 40], [70, 120, 80], [110, 170, 110]], // vert
  [[50, 35, 20], [120, 85, 40], [165, 125, 60]], // noisette
];
const COIFFURES = ["afro", "bangs", "bob", "buzzcut", "curly_short", "flat_top_fade", "long", "messy1", "parted", "pixie", "plain"];
const HAUTS = ["#FA8A54", "#4BB4B6", "#E5C25A", "#7BE495", "#EF6F6C", "#6C8EEF", "#B07BE4", "#2F6B5E", "#F7B17D", "#3D4B7A", "#E07BB0", "#C0CBDC"];
const BAS = ["#3D4B7A", "#4A4A55", "#6B4E3A", "#2F6B5E", "#8A8A95", "#1F2A44", "#B0885A"];
const CHAUSSURES = ["#3A2A22", "#222228", "#7A5A3A", "#F2F2F2"];

/** Rampe de 5 teintes (sombre vers clair) à partir d'une couleur de base. */
function rampe(hex: string): Rgb[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [0.45, 0.7, 0.85, 1, 1.18].map((f) => {
    const L = Math.min(0.95, l * f), C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = L - C / 2;
    const [a, b2, c] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    return [Math.round((a + m) * 255), Math.round((b2 + m) * 255), Math.round((c + m) * 255)] as Rgb;
  });
}

/* ---------- Tirage aléatoire reproductible à partir de l'identifiant d'équipe ---------- */
function graine(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function hasard(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Recolor = { src: Rgb[]; dst: Rgb[] };
type Couche = { url: string; recolor: Recolor[] };

export function apparence(id: string): Couche[] {
  const r = hasard(graine(id));
  const choix = <X,>(l: X[]) => l[Math.floor(r() * l.length)];
  const sexe = r() < 0.5 ? "male" : "female";
  const peau = choix(PEAUX);
  const coiffure = choix(COIFFURES);
  const cheveux = choix(CHEVEUX_COULEURS);
  const yeux = choix(YEUX);
  const haut = r() < 0.5 ? "long" : "court";
  const cHaut = rampe(choix(HAUTS)), cBas = rampe(choix(BAS)), cChaussures = rampe(choix(CHAUSSURES));
  return [
    { url: couche(`corps_${sexe}`), recolor: [{ src: PEAU_SRC, dst: peau }] },
    { url: couche(`chaussures_${sexe}`), recolor: [{ src: TISSU_SRC, dst: cChaussures }] },
    { url: couche(`bas_${sexe}`), recolor: [{ src: TISSU_SRC, dst: cBas }] },
    { url: couche(`haut_${haut}_${sexe}`), recolor: [{ src: TISSU_SRC, dst: cHaut }] },
    { url: couche(`tete_${sexe}`), recolor: [{ src: PEAU_SRC, dst: peau }, { src: YEUX_SRC, dst: yeux }] },
    { url: couche(`cheveux_${coiffure}`), recolor: [{ src: CHEVEUX_SRC, dst: cheveux }] },
  ].filter((c) => !!c.url);
}

const images = new Map<string, Promise<HTMLImageElement>>();
function charger(url: string) {
  let p = images.get(url);
  if (!p) {
    p = new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    images.set(url, p);
  }
  return p;
}

const planches = new Map<string, Promise<string>>();
/** Assemble les calques recolorés en une planche LPC (9 x 4 images de 64 px). */
export function planche(id: string): Promise<string> {
  let p = planches.get(id);
  if (p) return p;
  p = (async () => {
    const couches = apparence(id);
    const imgs = await Promise.all(couches.map((c) => charger(c.url)));
    const W = 576, H = 256;
    const sortie = document.createElement("canvas"); sortie.width = W; sortie.height = H;
    const ctx = sortie.getContext("2d")!;
    const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
    couches.forEach((c, k) => {
      tctx.clearRect(0, 0, W, H);
      tctx.drawImage(imgs[k], 0, 0);
      const data = tctx.getImageData(0, 0, W, H);
      const px = data.data;
      const memo = new Map<number, Rgb | null>();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        const cle = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
        let cible: Rgb | null | undefined = memo.get(cle);
        if (cible === undefined) {
          cible = null;
          let best = 400;
          for (const rc of c.recolor) {
            for (let j = 0; j < rc.src.length; j++) {
              const s = rc.src[j];
              const d = (s[0] - px[i]) ** 2 + (s[1] - px[i + 1]) ** 2 + (s[2] - px[i + 2]) ** 2;
              if (d < best) { best = d; cible = rc.dst[j] ?? null; }
            }
          }
          memo.set(cle, cible);
        }
        if (cible) { px[i] = cible[0]; px[i + 1] = cible[1]; px[i + 2] = cible[2]; }
      }
      tctx.putImageData(data, 0, 0);
      ctx.drawImage(tmp, 0, 0);
    });
    return sortie.toDataURL("image/png");
  })();
  planches.set(id, p);
  return p;
}

function usePlanche(id: string) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivant = true;
    planche(id).then((u) => { if (vivant) setUrl(u); }, () => undefined);
    return () => { vivant = false; };
  }, [id]);
  return url;
}

/* ---------- Chemins du village (en tuiles de 16 px) ---------- */
const ROUTE_HAUT = 8.6, ROUTE_MILIEU = 16.6, ROUTE_BAS = 24.4;
const LIAISONS_HAUT_MILIEU = [13.6, 33.6]; // allées verticales entre la route du haut et celle du milieu
const LIAISONS_MILIEU_BAS = [20.4, 27.5]; // passages dans l'herbe, de part et d'autre de la Place du lancement
const routeDe = (yTuile: number) =>
  [ROUTE_HAUT, ROUTE_MILIEU, ROUTE_BAS].reduce((a, b) => (Math.abs(b - yTuile) < Math.abs(a - yTuile) ? b : a));

/** Porte d'un lieu : centre du bâtiment, sur la route qui passe devant. */
function porte(lieu: string | null, place: Pt): { x: number; y: number; versLaDroite: boolean } {
  const b = lieu ? LAYOUT[lieu] : undefined;
  if (!b) return { x: place.x + 40, y: ROUTE_MILIEU * T, versLaDroite: true };
  return { x: (b.x + b.w / 2) * T, y: routeDe(b.y + b.h + 0.6) * T, versLaDroite: false };
}

const ECART = 26; // px entre deux personnages
const MAX_PAR_LIEU = 6;
function decalage(rang: number, versLaDroite: boolean) {
  if (versLaDroite) return rang * ECART;
  return rang === 0 ? 0 : (rang % 2 === 1 ? -1 : 1) * Math.ceil(rang / 2) * ECART;
}

/** Itinéraire en suivant les routes : départ -> route -> allée(s) -> route d'arrivée -> emplacement. */
function itineraire(de: Pt, a: Pt): Pt[] {
  const r1 = routeDe(de.y / T), r2 = routeDe(a.y / T);
  const pts: Pt[] = [];
  if (Math.abs(de.y - r1 * T) > 2) pts.push({ x: de.x, y: r1 * T });
  const via = (xTuile: number, ya: number, yb: number) => { pts.push({ x: xTuile * T, y: ya * T }, { x: xTuile * T, y: yb * T }); };
  const meilleure = (liaisons: number[], x0: number, x1: number) =>
    liaisons.reduce((m, c) => (Math.abs(x0 - c * T) + Math.abs(x1 - c * T) < Math.abs(x0 - m * T) + Math.abs(x1 - m * T) ? c : m));
  if (r1 !== r2) {
    const ordre = [ROUTE_HAUT, ROUTE_MILIEU, ROUTE_BAS];
    const sens = ordre.indexOf(r2) > ordre.indexOf(r1) ? 1 : -1;
    let x = de.x, y = r1;
    while (y !== r2) {
      const suivante = ordre[ordre.indexOf(y) + sens];
      const liaisons = Math.min(ordre.indexOf(y), ordre.indexOf(suivante)) === 0 ? LIAISONS_HAUT_MILIEU : LIAISONS_MILIEU_BAS;
      const c = meilleure(liaisons, x, a.x);
      via(c, y, suivante);
      x = c * T; y = suivante;
    }
  }
  pts.push({ x: a.x, y: r2 * T }, a);
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.5);
}

type Mobile = { x: number; y: number; chemin: Pt[]; dir: number; cle: string };
const VITESSE = 210; // px par seconde

/* ---------- Composant : tous les personnages de la carte ---------- */
export function Habitants({ equipes, place }: { equipes: Presence[]; place: Pt }) {
  // Emplacements cibles : chaque lieu aligne ses personnages devant la porte (votre équipe d'abord)
  const cibles = useMemo(() => {
    const parLieu = new Map<string, Presence[]>();
    for (const e of equipes) {
      const k = e.lieu_courant ?? "";
      parLieu.set(k, [...(parLieu.get(k) ?? []), e]);
    }
    const res = new Map<string, Pt & { cle: string }>();
    const surplus: { lieu: string; n: number; pt: Pt }[] = [];
    parLieu.forEach((liste, lieu) => {
      const p = porte(lieu || null, place);
      const tri = [...liste].sort((a, b) => Number(b.moi) - Number(a.moi) || a.equipe_id.localeCompare(b.equipe_id));
      tri.forEach((e, rang) => {
        const r = Math.min(rang, MAX_PAR_LIEU - 1);
        res.set(e.equipe_id, { x: p.x + decalage(r, p.versLaDroite), y: p.y + 6, cle: `${lieu}#${r}` });
      });
      if (tri.length > MAX_PAR_LIEU) surplus.push({ lieu, n: tri.length - MAX_PAR_LIEU + 1, pt: { x: p.x + decalage(MAX_PAR_LIEU - 1, p.versLaDroite), y: p.y + 6 } });
    });
    return { res, surplus, visibles: new Set(Array.from(parLieu.values()).flatMap((l) => [...l].sort((a, b) => Number(b.moi) - Number(a.moi) || a.equipe_id.localeCompare(b.equipe_id)).slice(0, l.length > MAX_PAR_LIEU ? MAX_PAR_LIEU - 1 : MAX_PAR_LIEU).map((e) => e.equipe_id))) };
  }, [equipes, place]);

  const mobiles = useRef(new Map<string, Mobile>());
  const [, setTic] = useState(0);
  const anim = useRef<number | null>(null);

  useEffect(() => {
    const m = mobiles.current;
    for (const id of Array.from(m.keys())) if (!cibles.res.has(id)) m.delete(id);
    cibles.res.forEach((c, id) => {
      const cur = m.get(id);
      if (!cur) { m.set(id, { x: c.x, y: c.y, chemin: [], dir: ROW.down, cle: c.cle }); return; }
      if (cur.cle !== c.cle) { cur.chemin = itineraire({ x: cur.x, y: cur.y }, c); cur.cle = c.cle; }
    });
    setTic((t) => t + 1);
    if (anim.current !== null) return;
    let avant = performance.now();
    const pas = (now: number) => {
      const dt = Math.min(0.05, (now - avant) / 1000); avant = now;
      let bouge = false;
      m.forEach((p) => {
        let reste = VITESSE * dt;
        while (reste > 0 && p.chemin.length > 0) {
          const c = p.chemin[0];
          const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
          if (d > 0.01) p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? ROW.right : ROW.left) : (dy > 0 ? ROW.down : ROW.up);
          if (d <= reste) { p.x = c.x; p.y = c.y; p.chemin.shift(); reste -= d; }
          else { p.x += (dx / d) * reste; p.y += (dy / d) * reste; reste = 0; }
        }
        if (p.chemin.length > 0) bouge = true; else p.dir = ROW.down;
      });
      setTic((t) => t + 1);
      anim.current = bouge ? requestAnimationFrame(pas) : null;
    };
    anim.current = requestAnimationFrame(pas);
  }, [cibles]);

  useEffect(() => () => { if (anim.current !== null) cancelAnimationFrame(anim.current); }, []);

  const liste = equipes
    .filter((e) => cibles.visibles.has(e.equipe_id) || (mobiles.current.get(e.equipe_id)?.chemin.length ?? 0) > 0)
    .map((e) => ({ e, p: mobiles.current.get(e.equipe_id) }))
    .filter((x): x is { e: Presence; p: Mobile } => !!x.p)
    .sort((a, b) => a.p.y - b.p.y);

  return (
    <>
      {liste.map(({ e, p }) => <Habitant key={e.equipe_id} equipe={e} x={p.x} y={p.y} dir={p.dir} marche={p.chemin.length > 0} />)}
      {cibles.surplus.map((s) => (
        <div key={`plus-${s.lieu}`} title={`${s.n} équipes de plus ici`} style={{ ...NUM, position: "absolute", left: s.pt.x, top: s.pt.y - 22, transform: "translateX(-50%)", zIndex: 26, background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 999, padding: "3px 6px", fontSize: 9, boxShadow: "2px 2px 0 0 var(--c-ink)", pointerEvents: "none" }}>
          +{s.n}
        </div>
      ))}
    </>
  );
}

const ECHELLE = 0.75; // 64 px LPC -> 48 px à l'écran

function Habitant({ equipe, x, y, dir, marche }: { equipe: Presence; x: number; y: number; dir: number; marche: boolean }) {
  const url = usePlanche(equipe.equipe_id);
  const s = 64 * ECHELLE;
  const nom = equipe.moi ? `${equipe.entreprise} (vous)` : equipe.entreprise;
  return (
    <div className="sq-perso" title={nom + (equipe.en_ligne ? "" : " (hors ligne)")}
      style={{ position: "absolute", left: x - s / 2, top: y - s * 0.94, width: s, height: s, zIndex: 26, opacity: equipe.en_ligne ? 1 : 0.5 }}>
      <div aria-hidden="true" style={{ position: "absolute", left: s / 2 - 11, top: s * 0.86, width: 22, height: 7, borderRadius: "50%", background: "rgba(0,0,0,.25)" }} />
      {url ? <Sprite url={url} cols={9} row={dir} frames={marche ? WALK : IDLE} fps={10} scale={ECHELLE} label={`Personnage de l'équipe ${equipe.entreprise}`} /> : null}
      {equipe.moi ? (
        <div style={{ ...PIX, position: "absolute", left: s / 2, top: -8, transform: "translateX(-50%)", background: "var(--c-fawn-600)", color: "var(--c-cream)", border: "2px solid var(--c-ink)", borderRadius: 4, padding: "0 5px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>
          Vous
        </div>
      ) : (
        <div className="sq-perso-nom" style={{ ...RAL, position: "absolute", left: s / 2, top: -6, transform: "translateX(-50%)", background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 4, padding: "0 5px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
          {equipe.entreprise}
        </div>
      )}
    </div>
  );
}
