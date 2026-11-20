import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";

/* =========================================================
   Start-up Quest v2 : composants visuels (pixel art + panneaux)
   ========================================================= */

export type ValoAnim = { from: number; to: number; k: number };

export const SW = 1280;
export const SH = 720;
export const T = SW / 48; // une tuile du village (16 px) dans la scène 1280x720

export const CSS =
  "@keyframes sqblink{0%,49%{opacity:1}50%,100%{opacity:0}}" +
  ".sq-btn{transition:background-color .15s}" +
  ".sq-btn:hover:not(:disabled){background-color:var(--hover-bg)!important}" +
  ".sq-btn:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 0 var(--c-ink)!important}" +
  ".sq-zone{transition:background-color .15s,box-shadow .15s}" +
  ".sq-zone:hover,.sq-zone:focus-visible{background-color:var(--halo);box-shadow:0 0 0 3px var(--halo);outline:none}" +
  ".sq-zone:hover,.sq-zone:focus-visible{z-index:30}.sq-zone .sq-label{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s}" +
  ".sq-zone:hover .sq-label,.sq-zone:focus-visible .sq-label{opacity:1;visibility:visible}" +
  
  ".sq-scroll::-webkit-scrollbar{width:10px}.sq-scroll::-webkit-scrollbar-thumb{background:var(--c-green);border-radius:4px;border:2px solid var(--c-cream)}" +
  ".sq-perso .sq-perso-nom{opacity:0;transition:opacity .15s}.sq-perso:hover{z-index:35!important}.sq-perso:hover .sq-perso-nom{opacity:1}" +
  ".sq-input::placeholder{color:var(--c-muted);opacity:.8}" +
  ".sq-input:focus{outline:3px solid var(--c-fawn-600);outline-offset:1px}" +
  "@keyframes sqdots{0%,20%{opacity:.2}50%{opacity:1}100%{opacity:.2}}.sq-dot{animation:sqdots 1.2s infinite}.sq-dot:nth-child(2){animation-delay:.2s}.sq-dot:nth-child(3){animation-delay:.4s}";

export const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Press+Start+2P&family=Raleway:wght@400;500;600;700&display=swap";

export const PIX: CSSProperties = { fontFamily: "var(--font-serif)" };
/** Chiffres (valorisation, minuteur, scores) : Press Start 2P, 2 et 5 sans ambiguïté */
export const NUM: CSSProperties = { fontFamily: "var(--font-mono)", letterSpacing: 0 };
export const RAL: CSSProperties = { fontFamily: "var(--font-sans)" };
export const PANEL: CSSProperties = {
  background: "var(--c-cream)",
  border: "3px solid var(--c-ink)",
  borderRadius: 5,
  boxShadow: "3px 3px 0 0 var(--c-ink), inset 0 0 0 2px var(--c-white)",
  color: "var(--c-ink)",
};
export const FULL: CSSProperties = { position: "absolute", left: 0, top: 0, width: SW, height: SH, imageRendering: "pixelated" };

export const fmt = (n: number) => n.toLocaleString("fr-FR") + " €";
export const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/* ---------- Sprites LPC (9 colonnes x 4 directions) ---------- */
export const WALK = [1, 2, 3, 4, 5, 6, 7, 8];
export const IDLE = [0];
export const TALK = [0, 1, 2, 3, 2, 1];
export const ROW = { up: 0, left: 1, down: 2, right: 3 };

type SpriteProps = { url: string; cols: number; row: number; frames: number[]; fps: number; scale: number; label: string };
export function Sprite({ url, cols, row, frames, fps, scale, label }: SpriteProps) {
  const [i, setI] = useState(0);
  const key = frames.join(",");
  useEffect(() => {
    setI(0);
    if (frames.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fps]);
  const s = 64 * scale;
  const f = frames[i % frames.length] ?? 0;
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: s,
        height: s,
        backgroundImage: `url(${url})`,
        backgroundSize: `${cols * s}px ${4 * s}px`,
        backgroundPosition: `-${f * s}px -${row * s}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
}

/* ---------- Icônes pixel (SVG) ---------- */
export function PixelIcon({ rows, size, fill, outline }: { rows: string[]; size: number; fill: string; outline?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  const cells: { x: number; y: number }[] = [];
  rows.forEach((r, y) => r.split("").forEach((c, x) => { if (c === "1") cells.push({ x, y }); }));
  return (
    <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} width={(size * (w + 2)) / (h + 2)} height={size} shapeRendering="crispEdges" aria-hidden="true">
      {outline ? cells.map((c) => <rect key={`o${c.x}-${c.y}`} x={c.x - 1} y={c.y - 1} width={3} height={3} fill={outline} />) : null}
      {cells.map((c) => <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={fill} />)}
    </svg>
  );
}
export const HEART = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
export const ARROW = ["0001000", "0001100", "1111110", "1111111", "1111110", "0001100", "0001000"];

export function Cube({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      <polygon points="8,1 15,4 8,7 1,4" fill="var(--c-mint)" stroke="var(--c-ink)" strokeWidth="0.8" />
      <polygon points="1,4 8,7 8,15 1,12" fill="var(--c-green)" stroke="var(--c-ink)" strokeWidth="0.8" />
      <polygon points="15,4 8,7 8,15 15,12" fill="var(--c-teal)" stroke="var(--c-ink)" strokeWidth="0.8" />
    </svg>
  );
}

export function Coin({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="4" height="8" fill="var(--c-ink)" />
      <rect x="0" y="2" width="8" height="4" fill="var(--c-ink)" />
      <rect x="1" y="1" width="6" height="6" fill="var(--c-ink)" />
      <rect x="2" y="1" width="4" height="6" fill="var(--px-gold)" />
      <rect x="1" y="2" width="6" height="4" fill="var(--px-gold)" />
      <rect x="3" y="2" width="2" height="4" fill="var(--px-gold-dark)" />
    </svg>
  );
}

export function CoinBag({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="9" y="3" width="6" height="3" fill="var(--c-ink)" />
      <rect x="10" y="4" width="4" height="2" fill="var(--px-sack-dark)" />
      <rect x="8" y="6" width="8" height="2" fill="var(--c-fawn-700)" />
      <rect x="5" y="8" width="14" height="13" fill="var(--c-ink)" />
      <rect x="3" y="11" width="18" height="9" fill="var(--c-ink)" />
      <rect x="6" y="9" width="12" height="11" fill="var(--px-sack)" />
      <rect x="4" y="12" width="16" height="7" fill="var(--px-sack)" />
      <rect x="15" y="10" width="3" height="9" fill="var(--px-sack-dark)" />
      <rect x="9" y="12" width="6" height="5" fill="var(--px-gold)" />
      <rect x="11" y="13" width="2" height="3" fill="var(--px-gold-dark)" />
      <rect x="0" y="19" width="6" height="4" fill="var(--c-ink)" />
      <rect x="1" y="19" width="4" height="3" fill="var(--px-gold)" />
      <rect x="18" y="19" width="6" height="4" fill="var(--c-ink)" />
      <rect x="19" y="19" width="4" height="3" fill="var(--px-gold)" />
    </svg>
  );
}

export function Trophy({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="1" width="10" height="7" fill="var(--c-ink)" />
      <rect x="4" y="2" width="8" height="6" fill="var(--px-gold)" />
      <rect x="1" y="2" width="3" height="4" fill="var(--c-ink)" />
      <rect x="12" y="2" width="3" height="4" fill="var(--c-ink)" />
      <rect x="2" y="3" width="2" height="2" fill="var(--px-gold)" />
      <rect x="12" y="3" width="2" height="2" fill="var(--px-gold)" />
      <rect x="5" y="8" width="6" height="2" fill="var(--c-ink)" />
      <rect x="6" y="8" width="4" height="1" fill="var(--px-gold-dark)" />
      <rect x="7" y="10" width="2" height="2" fill="var(--c-ink)" />
      <rect x="4" y="12" width="8" height="3" fill="var(--c-ink)" />
      <rect x="5" y="13" width="6" height="1" fill="var(--c-fawn-700)" />
      <rect x="9" y="3" width="2" height="4" fill="var(--px-gold-dark)" />
    </svg>
  );
}

/* ---------- Hooks ---------- */
export function useTypewriter(text: string, speed = 18) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((x) => { if (x >= text.length) { clearInterval(id); return x; } return x + 1; }), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) };
}

function useCountUp(anim: ValoAnim | null) {
  const [v, setV] = useState(anim ? anim.from : 0);
  useEffect(() => {
    if (!anim) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round((anim.from + (anim.to - anim.from) * e) / 1000) * 1000);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim]);
  return v;
}

/* ---------- Boutons ---------- */
type BtnVariant = "orange" | "green" | "cream";
const BTN_COLORS: Record<BtnVariant, { bg: string; hover: string; fg: string }> = {
  orange: { bg: "var(--c-fawn-600)", hover: "var(--c-fawn-700)", fg: "var(--c-cream)" },
  green: { bg: "var(--c-green)", hover: "var(--c-ink)", fg: "var(--c-cream)" },
  cream: { bg: "var(--c-cream)", hover: "var(--c-mint)", fg: "var(--c-ink)" },
};
export function PxButton({ children, onClick, variant = "orange", disabled, label, size = 18, style }: { children: ReactNode; onClick: () => void; variant?: BtnVariant; disabled?: boolean; label?: string; size?: number; style?: CSSProperties }) {
  const c = BTN_COLORS[variant];
  return (
    <button
      type="button"
      aria-label={label}
      className="sq-btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...PIX,
        ["--hover-bg" as string]: c.hover,
        background: c.bg,
        color: c.fg,
        border: "3px solid var(--c-ink)",
        borderRadius: 5,
        boxShadow: "0 3px 0 0 var(--c-ink), inset 0 -3px 0 0 var(--veil-light)",
        padding: size >= 20 ? "10px 28px" : "6px 14px",
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
        ...style,
      } as CSSProperties}
    >
      {children}
    </button>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...PIX, position: "absolute", left: 18, bottom: 14, background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 4, padding: "2px 10px", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "2px 2px 0 0 var(--c-ink)" }}>
      {children}
    </button>
  );
}

/* ---------- Boîte de dialogue de Max ---------- */
export function DialogBox({ text, onNext, nextLabel, style }: { text: string; onNext?: () => void; nextLabel?: string; style: CSSProperties }) {
  const { shown, done, skip } = useTypewriter(text);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      tabIndex={0}
      role="button"
      aria-label="Boîte de dialogue de Max, cliquer pour continuer"
      onClick={() => (done ? onNext?.() : skip())}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (done) onNext?.(); else skip(); } }}
      style={{ ...PANEL, position: "absolute", padding: "18px 22px 14px", cursor: "pointer", maxHeight: 220, boxSizing: "border-box", ...style }}
    >
      <span style={{ ...PIX, position: "absolute", left: 18, top: -19, background: "var(--c-green)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", borderRadius: 5, padding: "1px 14px", fontSize: 15, fontWeight: 600 }}>Max</span>
      <p aria-live="polite" className="sq-scroll" style={{ ...RAL, margin: 0, fontSize: 15, lineHeight: 1.45, fontWeight: 500, color: "var(--c-ink)", paddingRight: 84, maxHeight: 176, overflowY: "auto" }}>{shown}</p>
      {done ? (
        <div style={{ position: "absolute", right: 14, bottom: 8, display: "flex", alignItems: "center", gap: 8, animation: "sqblink 1s steps(1) infinite" }}>
          {nextLabel ? <span style={{ ...PIX, fontSize: 13, color: "var(--c-green)", fontWeight: 600 }}>{nextLabel}</span> : null}
          <svg width="16" height="12" viewBox="0 0 4 3" shapeRendering="crispEdges" aria-hidden="true"><polygon points="0,0 4,0 2,3" fill="var(--c-green)" /></svg>
        </div>
      ) : null}
    </motion.div>
  );
}

export function NameTag({ name, x, y }: { name: string; x: number; y: number }) {
  return (
    <div style={{ ...PIX, position: "absolute", left: x, top: y, transform: "translateX(-50%)", background: "var(--c-cream)", color: "var(--c-ink)", border: "2px solid var(--c-ink)", borderRadius: 4, padding: "0 6px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{name}</div>
  );
}

export function Bang({ left, top, size = 34 }: { left: number | string; top: number; size?: number }) {
  return (
    <motion.span
      aria-hidden="true"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
      style={{ ...PIX, position: "absolute", left, marginLeft: typeof left === "string" ? -size / 2 : 0, top, width: size, height: size, borderRadius: 999, background: "var(--c-fawn-600)", color: "var(--c-cream)", border: "3px solid var(--c-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.7, fontWeight: 700, boxShadow: "2px 2px 0 0 var(--c-ink)" }}
    >
      !
    </motion.span>
  );
}

/* ---------- HUD ---------- */
export function ValoGauge({ valo, anim }: { valo: number; anim: ValoAnim | null }) {
  const counted = useCountUp(anim);
  const pill = (v: number, faded?: boolean) => (
    <div style={{ ...NUM, background: faded ? "var(--c-ink)" : "var(--c-green)", color: faded ? "var(--c-mint)" : "var(--c-white)", border: "3px solid var(--c-ink)", borderRadius: 8, padding: "1px 16px", fontSize: faded ? 14 : 20, minWidth: faded ? 0 : 176, textAlign: "center", boxShadow: "inset 0 3px 0 0 var(--c-teal)" }}>{fmt(v)}</div>
  );
  return (
    <div style={{ position: "absolute", left: "50%", top: 6, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }} aria-label={`Valorisation : ${fmt(valo)}`}>
      <div style={{ ...PIX, position: "relative", zIndex: 1, background: "var(--c-cream)", color: "var(--c-ink)", border: "3px solid var(--c-ink)", borderBottom: "none", borderRadius: "6px 6px 0 0", padding: "1px 18px 0", fontSize: 16, fontWeight: 600, marginBottom: -3 }}>Valorisation</div>
      <div style={{ ...PANEL, display: "flex", alignItems: "center", gap: 8, padding: "5px 8px" }}>
        {anim ? (
          <>
            {pill(anim.from, true)}
            <PixelIcon rows={ARROW} size={22} fill="var(--px-up)" outline="var(--c-ink)" />
            {pill(counted)}
          </>
        ) : (
          pill(valo)
        )}
        <PixelIcon rows={ARROW} size={28} fill="var(--px-up)" outline="var(--c-ink)" />
      </div>
    </div>
  );
}

export function Hearts({ used }: { used: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }} aria-label={`${3 - used} tentative(s) restante(s) sur 3`}>
      {[0, 1, 2].map((i) => <PixelIcon key={i} rows={HEART} size={20} fill={i < 3 - used ? "var(--c-fawn-600)" : "var(--c-grey)"} outline="var(--c-ink)" />)}
    </div>
  );
}

export function TopLeftCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
      style={{ ...PANEL, position: "absolute", left: 14, top: 10, width: 330, height: 66, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", boxSizing: "border-box" }}>
      <Cube />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...PIX, fontSize: 18, fontWeight: 700, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 }}>{title}</div>
        <div style={{ ...RAL, fontSize: 13, fontWeight: 600, color: "var(--c-green)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 }}>{subtitle}</div>
      </div>
    </motion.div>
  );
}

/* ---------- Résultat ---------- */
export function CoinRain({ k }: { k: number }) {
  const coins = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: ((i * 53) % 300) - 20, d: (i % 5) * 0.08 + Math.floor(i / 5) * 0.15, s: 14 + (i % 3) * 4 })), []);
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, width: 280, height: 150, pointerEvents: "none" }}>
      {coins.map((c, i) => (
        <motion.div key={`${k}-${i}`} initial={{ y: -70, opacity: 0, rotate: 0 }} animate={{ y: 110, opacity: [0, 1, 1, 0], rotate: 180 }} transition={{ duration: 1.3, delay: c.d, ease: "easeIn" }} style={{ position: "absolute", left: c.x }}>
          <Coin size={c.s} />
        </motion.div>
      ))}
    </div>
  );
}

export function Ribbon({ text }: { text: string }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width="208" height="37" viewBox="0 0 130 23" shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block" }}>
        <polygon points="0,6 12,6 12,22 0,22 5,14" fill="var(--c-ink)" />
        <polygon points="130,6 118,6 118,22 130,22 125,14" fill="var(--c-ink)" />
        <polygon points="2,8 12,8 12,20 2,20 6,14" fill="var(--c-green)" />
        <polygon points="128,8 118,8 118,20 128,20 124,14" fill="var(--c-green)" />
        <rect x="9" y="1" width="112" height="18" fill="var(--c-ink)" />
        <rect x="11" y="3" width="108" height="14" fill="var(--c-green)" />
        <rect x="11" y="3" width="108" height="2" fill="var(--c-teal)" />
      </svg>
      <span style={{ ...PIX, position: "absolute", left: 0, right: 0, top: 5, textAlign: "center", color: "var(--c-cream)", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{text}</span>
    </div>
  );
}

/* ---------- Crédits (rendu Markdown minimal) ---------- */
export function renderMd(md: string) {
  const link = (s: string, key: string) => {
    const parts = s.replace(/`/g, "").replace(/\*\*/g, "").split(/(https?:\/\/[^\s)]+)/g);
    return (
      <span key={key}>
        {parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: "var(--c-green)", textDecoration: "underline", wordBreak: "break-all" }}>{p}</a> : p))}
      </span>
    );
  };
  return md.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return null;
    if (line.startsWith("#")) return <h3 key={i} style={{ ...PIX, fontSize: 18, fontWeight: 700, margin: "14px 0 6px", color: "var(--c-green)" }}>{line.replace(/^#+\s*/, "")}</h3>;
    if (/^\s*[-*] /.test(line)) return <p key={i} style={{ ...RAL, fontSize: 14, margin: "0 0 4px", paddingLeft: 16, textIndent: -10 }}>· {link(line.replace(/^\s*[-*] /, ""), `l${i}`)}</p>;
    if (!line.trim()) return null;
    return <p key={i} style={{ ...RAL, fontSize: 14, margin: "6px 0" }}>{link(line, `l${i}`)}</p>;
  });
}

/* ---------- Scène 16:9 mise à l'échelle ---------- */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.7);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* La scène 1280x720 tient toujours entièrement dans la fenêtre visible (barres du navigateur, zoom, barre des tâches). */
    const upd = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.visualViewport?.height || window.innerHeight;
      setS(Math.max(0.2, Math.min(w / SW, h / SH)));
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    window.addEventListener("resize", upd);
    window.visualViewport?.addEventListener("resize", upd);
    return () => { ro.disconnect(); window.removeEventListener("resize", upd); window.visualViewport?.removeEventListener("resize", upd); };
  }, []);
  return (
    <div ref={ref} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--c-ink)" }}>
      <div style={{ width: SW * s, height: SH * s, position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: SW, height: SH, position: "absolute", left: 0, top: 0, transform: `scale(${s})`, transformOrigin: "0 0", overflow: "hidden" }}>{children}</div>
      </div>
    </div>
  );
}
