import { QUARTIERS } from "../supabase/functions/_shared/jeu/strategie.ts";
import { LIEUX } from "../supabase/functions/_shared/jeu/data.ts";
import type { Presence } from "./types";

const initiales = (n: string) => n.split(/\s+/).map((m) => m[0]).join("").slice(0, 2).toUpperCase();
const PALETTE = ["#FA8A54", "#4BB4B6", "#F8D786", "#B7DEDE", "#EF9278", "#7BE495", "#C0CBDC", "#F7B17D", "#DB7B4B", "#FCDAC2", "#005953", "#B0885A"];

/** Carte simplifiée du village : quartiers, lieux et position des équipes. */
export default function Carte({ equipes, valides, tentatives, actif, verrouille, onChoisir }: {
  equipes: Presence[]; valides: string[]; tentatives: Record<string, number>;
  actif: string | null; verrouille: boolean; onChoisir: (lieu: string) => void;
}) {
  const couleur = (id: string) => PALETTE[equipes.findIndex((e) => e.equipe_id === id) % PALETTE.length];
  const pions = (lieu: string | null) => equipes.filter((e) => (e.lieu_courant ?? null) === lieu);
  const Pions = ({ lieu }: { lieu: string | null }) => (
    <div className="pions">
      {pions(lieu).map((e) => (
        <span key={e.equipe_id} className={"pion" + (e.moi ? " pion-moi" : "") + (e.en_ligne ? "" : " pion-absent")}
          style={{ background: couleur(e.equipe_id) }} title={e.entreprise + (e.en_ligne ? "" : " (hors ligne)")}>
          {initiales(e.entreprise)}
        </span>
      ))}
    </div>
  );
  return (
    <div className="carte-village">
      <div className="place">
        <span className="etiquette">Place du village</span>
        <Pions lieu={null} />
      </div>
      <div className="quartiers">
        {QUARTIERS.map((q) => (
          <div key={q.id} className="quartier">
            <div className="quartier-nom">{q.nom} <span className="verbe">{q.verbe}</span></div>
            <div className="lieux">
              {q.lieux.map((id) => {
                const l = LIEUX.find((x) => x.id === id);
                if (!l) return null;
                const ok = valides.includes(id);
                const t = tentatives[id] ?? 0;
                return (
                  <button key={id} className={"lieu" + (ok ? " valide" : "") + (actif === id ? " actif" : "")}
                    disabled={verrouille} onClick={() => onChoisir(id)}>
                    <span className="lieu-nom">{l.nom}</span>
                    <span className="lieu-concept">{l.concept}</span>
                    <span className="lieu-etat">{ok ? "Validé ✓" : t > 0 ? `Tentative ${t}/3` : "À explorer"}</span>
                    <Pions lieu={id} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
