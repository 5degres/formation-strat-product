import { useEffect } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, Lock } from "lucide-react";
import { LIEUX } from "../../supabase/functions/_shared/jeu/data.ts";
import { QUARTIERS } from "../../supabase/functions/_shared/jeu/strategie.ts";
import { PIX, RAL, NUM, PANEL, FULL, fmt, Trophy } from "./ui";
import { Portrait } from "./habitants";
import type { EtatEquipe, LigneClassement } from "../types";

/* =========================================================
   Menu de la carte du village : fiche de la start-up et classement.
   Tout est calculé à partir de l'état serveur (etat_equipe) ;
   seules les réponses retenues viennent de l'historique local.
   ========================================================= */

export type Fenetre = "fiche" | "classement";

/* ---------- Icône pixel : carte d'identité ---------- */
export function IdCard({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="6" y="0" width="4" height="3" fill="var(--c-ink)" />
      <rect x="7" y="1" width="2" height="1" fill="var(--c-grey)" />
      <rect x="1" y="2" width="14" height="13" fill="var(--c-ink)" />
      <rect x="2" y="3" width="12" height="11" fill="var(--c-white)" />
      <rect x="2" y="3" width="12" height="2" fill="var(--c-teal)" />
      <rect x="3" y="6" width="5" height="6" fill="var(--c-ink)" />
      <rect x="4" y="7" width="3" height="4" fill="var(--c-mint)" />
      <rect x="5" y="7" width="1" height="2" fill="var(--c-fawn-700)" />
      <rect x="4" y="10" width="3" height="1" fill="var(--c-green)" />
      <rect x="9" y="7" width="4" height="1" fill="var(--c-ink)" />
      <rect x="9" y="9" width="4" height="1" fill="var(--c-ink)" />
      <rect x="9" y="11" width="3" height="1" fill="var(--c-ink)" />
    </svg>
  );
}

/* ---------- Boutons du menu (en haut à gauche de la carte) ---------- */
export function MenuCarte({ ouvert, onOuvrir }: { ouvert: Fenetre | null; onOuvrir: (f: Fenetre) => void }) {
  const bouton = (f: Fenetre, label: string, icone: ReactNode) => (
    <button type="button" className="sq-btn" onClick={() => onOuvrir(f)} aria-label={label} title={label} aria-pressed={ouvert === f}
      style={{ ...PANEL, ["--hover-bg" as string]: "var(--c-white)", width: 60, height: 60, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: ouvert === f ? "var(--c-mint)" : "var(--c-cream)" }}>
      <span style={{ width: 46, height: 46, border: "2px solid var(--c-green)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-fawn-300)" }}>{icone}</span>
    </button>
  );
  return (
    <motion.nav initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} aria-label="Menu"
      style={{ ...PANEL, position: "absolute", left: 14, top: 10, display: "flex", gap: 8, padding: 6, background: "var(--c-green)", zIndex: 45 }}>
      {bouton("fiche", "Fiche de la start-up", <IdCard size={34} />)}
      {bouton("classement", "Classement des équipes", <Trophy size={34} />)}
    </motion.nav>
  );
}

/* ---------- Fenêtre générique ---------- */
function Fenetre({ titre, icone, onFermer, children, largeur = 760 }: { titre: string; icone: ReactNode; onFermer: () => void; children: ReactNode; largeur?: number }) {
  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === "Escape") onFermer(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFermer]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={onFermer}
      style={{ ...FULL, background: "var(--veil)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}>
      <motion.div role="dialog" aria-modal="true" aria-label={titre} initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} transition={{ duration: 0.25 }}
        onClick={(ev) => ev.stopPropagation()} style={{ ...PANEL, width: largeur, maxHeight: 600, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ ...PIX, background: "var(--c-green)", color: "var(--c-cream)", fontSize: 20, fontWeight: 700, padding: "6px 10px 6px 14px", borderBottom: "3px solid var(--c-ink)", display: "flex", alignItems: "center", gap: 10, textShadow: "2px 2px 0 var(--c-ink)" }}>
          {icone}<span style={{ flex: 1 }}>{titre}</span>
          <button type="button" onClick={onFermer} aria-label="Fermer" autoFocus
            style={{ background: "var(--c-cream)", color: "var(--c-ink)", border: "3px solid var(--c-ink)", borderRadius: 5, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 0 var(--c-ink)", padding: 0 }}>
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        <div className="sq-scroll" style={{ overflowY: "auto", padding: "14px 18px 18px" }}>{children}</div>
      </motion.div>
    </motion.div>
  );
}

const Titre = ({ children }: { children: ReactNode }) => (
  <div style={{ ...PIX, fontSize: 15, fontWeight: 700, color: "var(--c-green)", margin: "14px 0 6px", textTransform: "uppercase" }}>{children}</div>
);
const Chiffre = ({ valeur, label, couleur = "var(--c-ink)" }: { valeur: ReactNode; label: string; couleur?: string }) => (
  <div style={{ flex: 1, background: "var(--c-white)", border: "2px solid var(--c-ink)", borderRadius: 5, padding: "8px 6px", textAlign: "center" }}>
    <div style={{ ...NUM, fontSize: 13, color: couleur, whiteSpace: "nowrap" }}>{valeur}</div>
    <div style={{ ...RAL, fontSize: 11.5, fontWeight: 700, color: "var(--c-muted)", marginTop: 5 }}>{label}</div>
  </div>
);

/* ---------- Fiche de présentation de la start-up ---------- */
function FicheStartup({ etat, reponses, onFermer }: { etat: EtatEquipe; reponses: Record<string, string>; onFermer: () => void }) {
  const e = etat.equipe, regles = etat.session.regles;
  const gain = e.valorisation - regles.depart;
  const nbValides = e.lieux_valides.length;
  const pct = Math.round((nbValides / LIEUX.length) * 100);
  const extrait = (t: string) => (t.length > 260 ? t.slice(0, 257).trimEnd() + "…" : t);
  return (
    <Fenetre titre="Fiche de la start-up" icone={<IdCard size={26} />} onFermer={onFermer}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Portrait id={e.equipe_id} size={64} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...PIX, fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{e.entreprise}</div>
          <div style={{ ...RAL, fontSize: 15, fontWeight: 600, color: "var(--c-green)", marginTop: 4 }}>{e.produit || "Produit à définir"}</div>
          <div style={{ ...RAL, fontSize: 13, fontWeight: 500, color: "var(--c-muted)", marginTop: 2 }}>Équipe : {e.membres.join(", ") || "–"}</div>
        </div>
      </div>
      {e.objectif ? (
        <div style={{ ...RAL, fontSize: 14, fontWeight: 500, marginTop: 12, background: "var(--c-fawn-300)", border: "2px solid var(--c-ink)", borderRadius: 5, padding: "6px 10px" }}>
          <strong>Objectif :</strong> {e.objectif}
        </div>
      ) : null}

      <Titre>Où en est la start-up</Titre>
      <div style={{ display: "flex", gap: 8 }}>
        <Chiffre valeur={fmt(e.valorisation)} label="Valorisation" couleur="var(--c-green)" />
        <Chiffre valeur={(gain >= 0 ? "+" : "−") + fmt(Math.abs(gain))} label="Depuis le départ" couleur={gain >= 0 ? "var(--c-green)" : "var(--c-fawn-700)"} />
        <Chiffre valeur={`${nbValides}/${LIEUX.length}`} label="Lieux validés" />
        <Chiffre valeur={e.rang ? `${e.rang}/${etat.nb_equipes}` : "–"} label="Rang" />
      </div>
      <div style={{ marginTop: 8, height: 12, background: "var(--c-white)", border: "2px solid var(--c-ink)", borderRadius: 4, overflow: "hidden" }} aria-label={`Parcours : ${pct} %`}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--c-teal)" }} />
      </div>

      <Titre>Le parcours de la start-up</Titre>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {QUARTIERS.map((qz) => {
          const fait = qz.lieux.filter((x) => e.lieux_valides.includes(x)).length;
          return (
            <div key={qz.id} style={{ background: "var(--c-white)", border: "2px solid var(--c-ink)", borderLeft: `8px solid ${qz.couleur}`, borderRadius: 5, padding: "6px 10px" }}>
              <div style={{ ...PIX, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>{qz.nom} <span style={{ ...RAL, fontSize: 12, fontWeight: 700, color: "var(--c-muted)" }}>· {qz.verbe}</span></span>
                <span style={{ ...NUM, fontSize: 10 }}>{fait}/{qz.lieux.length}</span>
              </div>
              {qz.lieux.map((id) => {
                const l = LIEUX.find((x) => x.id === id);
                if (!l) return null;
                const ok = e.lieux_valides.includes(id);
                const t = e.tentatives[id] ?? 0;
                const rep = reponses[id];
                return (
                  <div key={id} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: "1px dashed var(--c-grey)", marginTop: 4 }}>
                    <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: 4, border: "2px solid var(--c-ink)", background: ok ? "var(--px-up)" : "var(--c-cream)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      {ok ? <Check size={13} strokeWidth={3.5} /> : null}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ ...RAL, fontSize: 13.5, fontWeight: 700 }}>
                        {l.concept} <span style={{ fontWeight: 500, color: "var(--c-muted)" }}>· {l.nom}</span>
                      </div>
                      <div style={{ ...RAL, fontSize: 13, fontWeight: 500, color: ok ? "var(--c-ink)" : "var(--c-muted)", lineHeight: 1.4, marginTop: 1 }}>
                        {ok ? (rep ? `« ${extrait(rep)} »` : "Validé.") : t > 0 ? `En cours : tentative ${t}/${regles.max_tentatives}.` : "À explorer."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Fenetre>
  );
}

/* ---------- Classement de toutes les équipes ---------- */
function ClassementEquipes({ etat, onFermer }: { etat: EtatEquipe; onFermer: () => void }) {
  const s = etat.session, e = etat.equipe;
  const classes = etat.classement;
  const ids = new Set(classes.map((c) => c.equipe_id));
  const autres = etat.equipes.filter((x) => !ids.has(x.equipe_id));
  const lieuNom = (id: string | null) => (id ? LIEUX.find((l) => l.id === id)?.nom ?? "En exploration" : "Place du village");
  const enLigne = (id: string) => etat.equipes.find((x) => x.equipe_id === id)?.en_ligne ?? false;
  const couleurRang = (r: number) => (r === 1 ? "var(--px-gold)" : r === 2 ? "var(--px-step2)" : r === 3 ? "var(--px-step3)" : "var(--c-cream)");

  const ligne = (id: string, rang: ReactNode, couleur: string, nom: string, membres: string[], moi: boolean, droite: ReactNode, sous: string) => (
    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, background: moi ? "var(--c-mint)" : "var(--c-white)", border: `2px solid ${moi ? "var(--c-ink)" : "var(--c-grey)"}`, borderRadius: 5, padding: "6px 10px" }}>
      <span style={{ ...NUM, fontSize: 12, width: 34, height: 34, flexShrink: 0, borderRadius: 5, border: "2px solid var(--c-ink)", background: couleur, display: "flex", alignItems: "center", justifyContent: "center" }}>{rang}</span>
      <Portrait id={id} size={34} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...RAL, fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
          <span title={enLigne(id) ? "En ligne" : "Hors ligne"} style={{ width: 8, height: 8, borderRadius: 2, background: enLigne(id) ? "var(--px-up)" : "var(--c-grey)", border: "1px solid var(--c-ink)", flexShrink: 0 }} />
          {nom}{moi ? <span style={{ ...PIX, fontSize: 11, background: "var(--c-fawn-600)", color: "var(--c-cream)", border: "2px solid var(--c-ink)", borderRadius: 4, padding: "0 5px" }}>Vous</span> : null}
        </div>
        <div style={{ ...RAL, fontSize: 12, fontWeight: 500, color: "var(--c-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[membres.join(", "), sous].filter(Boolean).join(" · ")}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>{droite}</div>
    </div>
  );
  const valeur = (c: LigneClassement) => (
    <>
      <div style={{ ...NUM, fontSize: 11, color: "var(--c-green)" }}>{fmt(c.valorisation_finale ?? c.valorisation)}</div>
      <div style={{ ...RAL, fontSize: 11.5, fontWeight: 700, color: "var(--c-muted)", marginTop: 3 }}>{c.nb_lieux}/{LIEUX.length} lieux</div>
    </>
  );
  const presence = (id: string) => etat.equipes.find((x) => x.equipe_id === id)?.lieu_courant ?? null;

  return (
    <Fenetre titre="Classement des équipes" icone={<Trophy size={26} />} onFermer={onFermer} largeur={680}>
      <div style={{ ...RAL, fontSize: 13, fontWeight: 600, color: "var(--c-muted)", marginBottom: 10 }}>
        {etat.nb_equipes} équipe{etat.nb_equipes > 1 ? "s" : ""} dans la partie{s.nom ? ` « ${s.nom} »` : ""}. Le classement se met à jour en direct.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {classes.map((c) => ligne(c.equipe_id, c.rang, couleurRang(c.rang), c.entreprise, c.membres, !!c.moi || c.equipe_id === e.equipe_id, valeur(c), lieuNom(presence(c.equipe_id))))}
        {autres.map((x) => ligne(x.equipe_id, <Lock size={14} strokeWidth={3} />, "var(--c-cream)", x.entreprise, x.membres, x.moi, null, lieuNom(x.lieu_courant)))}
      </div>
      {autres.length > 0 ? (
        <div style={{ ...RAL, fontSize: 12.5, fontWeight: 600, color: "var(--c-muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={13} /> {s.visibilite === "AUCUN" ? "L'animateur a masqué les valorisations pendant la partie." : "Pendant la partie, seuls le podium et votre rang sont dévoilés."} Le classement complet sera révélé à la fin.
        </div>
      ) : null}
    </Fenetre>
  );
}

/* ---------- Fenêtres du menu ---------- */
export function FenetresMenu({ ouvert, etat, reponses, onFermer }: { ouvert: Fenetre | null; etat: EtatEquipe; reponses: Record<string, string>; onFermer: () => void }) {
  return (
    <AnimatePresence>
      {ouvert === "fiche" ? <FicheStartup key="fiche" etat={etat} reponses={reponses} onFermer={onFermer} /> : null}
      {ouvert === "classement" ? <ClassementEquipes key="classement" etat={etat} onFermer={onFermer} /> : null}
    </AnimatePresence>
  );
}
