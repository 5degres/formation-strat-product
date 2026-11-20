import { useEffect, useState } from "react";
import type { Session, Statut } from "./types";
import { LIEUX } from "../supabase/functions/_shared/jeu/data.ts";

export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "–" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";

export const fmtDelta = (n: number) => (n >= 0 ? "+" : "−") + fmt(Math.abs(n));

export const nomLieu = (id: string | null | undefined) => (id ? LIEUX.find((l) => l.id === id)?.nom ?? id : "Place du village");

export const LIBELLE_STATUT: Record<Statut, string> = {
  LOBBY: "Lobby", RUNNING: "En cours", PAUSED: "En pause", FINISHED: "Terminée",
  AWARDING: "Remise des prix", PUBLISHED: "Classement publié", CANCELLED: "Annulée",
};

export const PARTIE_VERROUILLEE = (s: Statut) => s === "FINISHED" || s === "AWARDING" || s === "PUBLISHED" || s === "CANCELLED";

export function ilYa(iso: string | null, maintenant: number): string {
  if (!iso) return "jamais";
  const s = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h ${m % 60} min`;
}

export function useMaintenant(ms = 1000) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setT(Date.now()), ms); return () => window.clearInterval(id); }, [ms]);
  return t;
}

/** Temps restant calculé depuis l'heure de fin serveur (même référence pour toutes les équipes). */
export function tempsRestant(s: Session, maintenantServeur: number): number | null {
  if (!s.deadline) return null;
  if (s.statut === "PAUSED" && s.paused_at) return new Date(s.deadline).getTime() - new Date(s.paused_at).getTime();
  if (s.statut !== "RUNNING") return 0;
  return Math.max(0, new Date(s.deadline).getTime() - maintenantServeur);
}

export function Minuteur({ session, decalage }: { session: Session; decalage: number }) {
  const t = useMaintenant(500);
  const r = tempsRestant(session, t + decalage);
  if (r === null) return <span className="minuteur">{String(session.duree_min).padStart(2, "0")}:00</span>;
  const tot = Math.ceil(r / 1000);
  const h = Math.floor(tot / 3600), m = Math.floor((tot % 3600) / 60), s = tot % 60;
  const txt = (h > 0 ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(s).padStart(2, "0");
  return (
    <span className={"minuteur" + (tot <= 300 && session.statut === "RUNNING" ? " urgent" : "") + (session.statut === "PAUSED" ? " pause" : "")}
      aria-label={"Temps restant " + txt}>
      {txt}
    </span>
  );
}

export function IndicateurSync({ derniereSync, erreur }: { derniereSync: number | null; erreur: boolean }) {
  const t = useMaintenant(1000);
  const age = derniereSync ? (t - derniereSync) / 1000 : Infinity;
  const etat = erreur && age > 8 ? "ko" : age > 8 ? "lent" : "ok";
  const txt = etat === "ok" ? "Synchronisé" : etat === "lent" ? "Synchronisation…" : "Hors connexion";
  return <span className={"sync sync-" + etat} title={txt}><span className="point" />{txt}</span>;
}

export const nouvelId = () => crypto.randomUUID();

export function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function versCsv(lignes: Record<string, unknown>[]): string {
  if (lignes.length === 0) return "";
  const cols = Array.from(new Set(lignes.flatMap((l) => Object.keys(l))));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "\uFEFF" + [cols.join(";"), ...lignes.map((l) => cols.map((c) => esc(l[c])).join(";"))].join("\r\n");
}
