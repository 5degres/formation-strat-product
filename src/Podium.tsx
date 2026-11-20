import type { LigneClassement } from "./types";
import { fmt } from "./util";

/** Podium (provisoire ou final) suivi du classement complet. */
export default function Podium({ lignes, final, regleEgalite }: { lignes: LigneClassement[]; final: boolean; regleEgalite: string }) {
  const top = lignes.filter((l) => l.rang <= 3);
  const ordre = [2, 1, 3];
  const valeur = (l: LigneClassement) => (final ? l.valorisation_finale ?? l.valorisation : l.valorisation);
  return (
    <div className="podium-bloc">
      <div className="podium-titre">
        <h2 className="titre-pixel">{final ? "Classement final" : "Podium provisoire"}</h2>
        {!final && <span className="badge badge-clair">Avant pitch et bonus du jury</span>}
      </div>
      <div className="podium">
        {ordre.map((r) => {
          const ex = top.filter((l) => l.rang === r);
          return (
            <div key={r} className={"marche-podium m" + r}>
              <div className="podium-equipes">
                {ex.length === 0 && <span className="vide">–</span>}
                {ex.map((l) => (
                  <div key={l.equipe_id} className={"podium-equipe" + (l.moi ? " moi" : "")}>
                    <div className="podium-nom">{l.entreprise}</div>
                    <div className="podium-membres">{l.membres.join(" · ")}</div>
                    <div className="podium-valo">{fmt(valeur(l))}</div>
                    {final && l.bonus_jury_pct !== null && (
                      <div className="podium-detail">Jeu {fmt(l.valorisation)} · jury {l.bonus_jury_pct > 0 ? "+" : ""}{l.bonus_jury_pct} %</div>
                    )}
                  </div>
                ))}
                {ex.length > 1 && <span className="badge">Égalité officielle</span>}
              </div>
              <div className="socle"><span>{r}</span></div>
            </div>
          );
        })}
      </div>
      <table className="tableau">
        <thead><tr><th>Rang</th><th>Entreprise</th><th>Membres</th><th className="num">Lieux</th><th className="num">{final ? "Valorisation finale" : "Valorisation"}</th></tr></thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.equipe_id} className={l.moi ? "moi" : ""}>
              <td>{l.rang}</td><td>{l.entreprise}</td><td>{l.membres.join(", ")}</td>
              <td className="num">{l.nb_lieux}</td><td className="num">{fmt(valeur(l))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Départage : {regleEgalite}</p>
    </div>
  );
}
