import { useState } from "react";
import { ErreurJeu, rpc, stockage, useSondage } from "./api";
import type { EtatAdmin, LigneClassement } from "./types";
import { IndicateurSync, LIBELLE_STATUT, Minuteur, fmt, ilYa, nomLieu, nouvelId, telecharger, useMaintenant, versCsv } from "./util";
import { LIEUX } from "../supabase/functions/_shared/jeu/data.ts";
import Podium from "./Podium";

const INACTIVITE_MS = 5 * 60 * 1000;

export default function Admin({ codeSalon, codeAdmin, onQuitter }: { codeSalon: string; codeAdmin: string; onQuitter: () => void }) {
  const creds = { p_code_salon: codeSalon, p_code_admin: codeAdmin };
  const { data: etat, erreur, derniereSync, decalage, rafraichir } =
    useSondage<EtatAdmin>(() => rpc("etat_admin", creds), 2500);
  const [auteur, setAuteur] = useState(() => stockage.lire<string>("sq_auteur") ?? "");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dureeLancement, setDureeLancement] = useState<number | null>(null);
  const [bonus, setBonus] = useState<Record<string, number>>({});
  const maintenant = useMaintenant(5000);

  if (!etat) {
    return (
      <main className="page centre">
        <div className="carte-blanche">
          {erreur ? <><p className="erreur">{erreur.message}</p><button className="btn btn-contour" onClick={onQuitter}>Retour</button></> : <p>Chargement de la supervision…</p>}
        </div>
      </main>
    );
  }
  const s = etat.session;

  const action = async (type: string, payload: Record<string, unknown> = {}, confirmation?: string) => {
    if (enCours) return;
    if (confirmation && !window.confirm(confirmation)) return;
    setEnCours(type); setErr(null);
    try {
      await rpc("action_admin", { ...creds, p_action_id: nouvelId(), p_type: type, p_payload: payload, p_auteur: auteur || "Animateur" });
      rafraichir();
    } catch (x) { setErr(x instanceof ErreurJeu ? x.message : "Erreur inattendue."); }
    finally { setEnCours(null); }
  };

  const exporter = async (format: "json" | "resultats" | "evenements") => {
    try {
      const x = await rpc<{ resultats: Record<string, unknown>[]; evenements: Record<string, unknown>[] }>("exporter_salon", creds);
      const base = `startup-quest_${s.code_salon}_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`;
      if (format === "json") telecharger(base + ".json", JSON.stringify(x, null, 2), "application/json");
      else if (format === "resultats") telecharger(base + "_resultats.csv", versCsv(x.resultats), "text/csv");
      else telecharger(base + "_evenements.csv", versCsv(x.evenements.map((v) => ({ ...v, details: JSON.stringify(v.details) }))), "text/csv");
    } catch (x) { setErr(x instanceof ErreurJeu ? x.message : "Export impossible."); }
  };

  const lien = window.location.origin + window.location.pathname + "?salon=" + s.code_salon;
  const prets = etat.equipes.filter((e) => e.prete).length;
  const lignesPodium: LigneClassement[] = etat.equipes.map((e) => ({
    equipe_id: e.equipe_id, rang: e.rang, entreprise: e.entreprise, membres: e.membres, valorisation: e.valorisation,
    valorisation_finale: e.valorisation_finale, bonus_jury_pct: e.bonus_jury_pct, nb_lieux: e.lieux_valides.length,
  }));
  const occupe = enCours !== null;

  return (
    <main className="page">
      <header className="hud">
        <div className="hud-bloc">
          <span className="etiquette">Animateur · {LIBELLE_STATUT[s.statut]}</span>
          <span className="hud-entreprise">{s.nom}</span>
        </div>
        <div className="hud-bloc">
          <span className="etiquette">Code salon</span>
          <span className="code-geant petit">{s.code_salon}</span>
        </div>
        <div className="hud-bloc">
          <span className="etiquette">Temps restant</span>
          <Minuteur session={s} decalage={decalage} />
        </div>
        <div className="hud-bloc hud-droite">
          <IndicateurSync derniereSync={derniereSync} erreur={!!erreur} />
          <button className="lien" onClick={onQuitter}>Quitter</button>
        </div>
      </header>

      <section className="carte-blanche barre-actions">
        <label className="auteur">Votre prénom (historique)
          <input value={auteur} maxLength={60} onChange={(x) => { setAuteur(x.target.value); stockage.ecrire("sq_auteur", x.target.value); }} placeholder="Animateur" />
        </label>
        <div className="actions">
          {s.statut === "LOBBY" && (
            <>
              <label className="champ-court">Durée (min)
                <input type="number" min={1} max={600} value={dureeLancement ?? s.duree_min} onChange={(x) => setDureeLancement(Number(x.target.value))} />
              </label>
              <button className="btn btn-primaire" disabled={occupe || etat.equipes.length === 0}
                onClick={() => action("LANCER", { duree_min: dureeLancement ?? s.duree_min },
                  prets < etat.equipes.length ? `${etat.equipes.length - prets} équipe(s) ne sont pas prêtes. Lancer quand même ?` : undefined)}>
                Lancer la partie
              </button>
            </>
          )}
          {s.statut === "RUNNING" && <button className="btn btn-secondaire" disabled={occupe} onClick={() => action("PAUSE")}>Pause</button>}
          {s.statut === "PAUSED" && <button className="btn btn-primaire" disabled={occupe} onClick={() => action("REPRENDRE")}>Reprendre</button>}
          {(s.statut === "RUNNING" || s.statut === "PAUSED") && (
            <>
              <button className="btn btn-contour" disabled={occupe} onClick={() => action("PROLONGER", { minutes: 5 })}>+5 min</button>
              <button className="btn btn-danger" disabled={occupe}
                onClick={() => action("TERMINER", {}, "Terminer la partie maintenant ? Toutes les équipes seront verrouillées immédiatement.")}>
                Fin de partie
              </button>
            </>
          )}
          {s.statut === "FINISHED" && (
            <button className="btn btn-primaire" disabled={occupe} onClick={() => action("REMISE_DES_PRIX")}>Lancer la remise des prix</button>
          )}
          {(s.statut === "FINISHED" || s.statut === "AWARDING") && (
            <button className="btn btn-contour" disabled={occupe}
              onClick={() => action("ROUVRIR", { minutes: 5 }, "Rouvrir la partie pour 5 minutes ? Les équipes pourront de nouveau jouer et les bonus jury déjà saisis seront effacés.")}>
              Rouvrir (+5 min)
            </button>
          )}
          {s.statut === "AWARDING" && (
            <button className="btn btn-primaire" disabled={occupe}
              onClick={() => action("PUBLIER", {}, "Publier le classement final ? Il sera affiché à toutes les équipes et ne pourra plus être modifié.")}>
              Publier le classement final
            </button>
          )}
          {s.statut !== "PUBLISHED" && s.statut !== "CANCELLED" && (
            <button className="btn btn-lien-danger" disabled={occupe} onClick={() => action("ANNULER", {}, "Annuler définitivement cette partie ?")}>Annuler la partie</button>
          )}
        </div>
        {err && <p className="erreur" role="alert">{err}</p>}
      </section>

      {s.statut === "LOBBY" && (
        <section className="carte-blanche">
          <p>Donnez aux équipes le code <strong>{s.code_salon}</strong> ou ce lien : <code>{lien}</code></p>
          <p className="discret">{etat.equipes.length}/{s.max_equipes} équipes · {prets} prête(s)</p>
        </section>
      )}

      {s.statut === "AWARDING" && (
        <section className="carte-blanche">
          <h3>Bonus du jury (équipes qualifiées pour le pitch)</h3>
          <div className="bonus-grille">
            {etat.equipes.filter((e) => e.qualifie).map((e) => (
              <div key={e.equipe_id} className="bonus-ligne">
                <strong>{e.entreprise}</strong>
                <span className="discret">jeu {fmt(e.valorisation)}</span>
                <input type="number" min={-10} max={10} value={bonus[e.equipe_id] ?? e.bonus_jury_pct ?? 0}
                  onChange={(x) => setBonus({ ...bonus, [e.equipe_id]: Number(x.target.value) })} aria-label={"Bonus jury " + e.entreprise} />
                <span>%</span>
                <button className="btn btn-contour" disabled={occupe}
                  onClick={() => action("BONUS_JURY", { equipe_id: e.equipe_id, pct: bonus[e.equipe_id] ?? e.bonus_jury_pct ?? 0 })}>
                  Appliquer
                </button>
                <span className="discret">final {fmt(e.valorisation_finale)}{e.bonus_jury_pct !== null ? ` (${e.bonus_jury_pct > 0 ? "+" : ""}${e.bonus_jury_pct} %)` : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(s.statut === "FINISHED" || s.statut === "AWARDING" || s.statut === "PUBLISHED") && (
        <section className="carte-blanche">
          <Podium lignes={lignesPodium} final={s.statut === "PUBLISHED"} regleEgalite={s.regle_egalite} />
        </section>
      )}

      <section className="carte-blanche">
        <h3>Équipes ({etat.equipes.length})</h3>
        <div className="defilement">
          <table className="tableau">
            <thead>
              <tr><th>Rang</th><th>Entreprise</th><th>Membres</th><th>Connexion</th><th>Position</th><th className="num">Lieux</th><th className="num">Valorisation</th><th>Dernière réponse</th></tr>
            </thead>
            <tbody>
              {etat.equipes.map((e) => {
                const ref = e.derniere_action_at ?? s.started_at;
                const inactive = s.statut === "RUNNING" && ref !== null && maintenant + decalage - new Date(ref).getTime() > INACTIVITE_MS;
                return (
                  <tr key={e.equipe_id}>
                    <td>{e.rang}</td>
                    <td><strong>{e.entreprise}</strong>{s.statut === "LOBBY" && <span className={"badge " + (e.prete ? "badge-ok" : "badge-clair")}>{e.prete ? "Prête" : "En préparation"}</span>}</td>
                    <td>{e.membres.join(", ")}</td>
                    <td><span className={"point " + (e.en_ligne ? "en-ligne" : "hors-ligne")} /> {e.en_ligne ? "En ligne" : "Hors ligne " + ilYa(e.last_seen_at, maintenant + decalage)}</td>
                    <td>{nomLieu(e.lieu_courant)}</td>
                    <td className="num">{e.lieux_valides.length}/{LIEUX.length}</td>
                    <td className="num">{fmt(e.valorisation)}</td>
                    <td>{ilYa(e.derniere_action_at, maintenant + decalage)}{inactive && <span className="badge badge-alerte">Inactive</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grille-2">
        <section className="carte-blanche">
          <h3>Export pour le débrief</h3>
          <div className="actions">
            <button className="btn btn-contour" onClick={() => exporter("resultats")}>Résultats (CSV)</button>
            <button className="btn btn-contour" onClick={() => exporter("evenements")}>Réponses et verdicts (CSV)</button>
            <button className="btn btn-contour" onClick={() => exporter("json")}>Tout (JSON)</button>
          </div>
        </section>
        <section className="carte-blanche">
          <h3>Historique des actions</h3>
          <ul className="historique">
            {etat.actions.map((a, i) => (
              <li key={i}><span className="discret">{new Date(a.created_at).toLocaleTimeString("fr-FR")}</span> {a.type} · {a.auteur}
                {a.type === "BONUS_JURY" && typeof a.payload.pct === "number" ? ` (${etat.equipes.find((e) => e.equipe_id === a.payload.equipe_id)?.entreprise ?? "équipe"} : ${a.payload.pct} %)` : ""}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
