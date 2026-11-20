import { useState } from "react";
import type { Acces } from "./App";
import { ErreurJeu, rpc } from "./api";

type Onglet = "rejoindre" | "animer" | "creer";

export default function Accueil({ onEntrer }: { onEntrer: (a: Acces) => void }) {
  const salonUrl = new URLSearchParams(window.location.search).get("salon") ?? "";
  const [onglet, setOnglet] = useState<Onglet>("rejoindre");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [codeSalon, setCodeSalon] = useState(salonUrl.toUpperCase());
  const [entreprise, setEntreprise] = useState("");
  const [membres, setMembres] = useState("");
  const [produit, setProduit] = useState("");
  const [objectif, setObjectif] = useState("");

  const [codeAdmin, setCodeAdmin] = useState("");

  const [codeOrga, setCodeOrga] = useState("");
  const [nomSalon, setNomSalon] = useState("");
  const [maxEquipes, setMaxEquipes] = useState(12);
  const [duree, setDuree] = useState(55);
  const [valoDepart, setValoDepart] = useState(500000);
  const [cree, setCree] = useState<{ code_salon: string; code_admin: string } | null>(null);

  const agir = async (f: () => Promise<void>) => {
    if (envoi) return;
    setEnvoi(true); setErreur(null);
    try { await f(); } catch (e) { setErreur(e instanceof ErreurJeu ? e.message : "Erreur inattendue."); }
    finally { setEnvoi(false); }
  };

  const rejoindre = () => agir(async () => {
    const r = await rpc<{ token: string }>("rejoindre_salon", {
      p_code_salon: codeSalon, p_entreprise: entreprise,
      p_membres: membres.split(/[,;\n]/).map((m) => m.trim()).filter(Boolean),
      p_produit: produit, p_objectif: objectif,
    });
    onEntrer({ type: "equipe", token: r.token });
  });

  const animer = () => agir(async () => {
    await rpc("etat_admin", { p_code_salon: codeSalon, p_code_admin: codeAdmin });
    onEntrer({ type: "admin", code_salon: codeSalon.trim().toUpperCase(), code_admin: codeAdmin.trim().toUpperCase() });
  });

  const creer = () => agir(async () => {
    const r = await rpc<{ code_salon: string; code_admin: string }>("creer_salon", {
      p_code_organisateur: codeOrga, p_nom: nomSalon, p_max_equipes: maxEquipes,
      p_duree_min: duree, p_valo_depart: valoDepart, p_autoriser_doublons: false,
    });
    setCree(r);
  });

  return (
    <main className="page centre">
      <div className="accueil">
        <header className="accueil-entete">
          <div className="logo-pixel">START-UP<br />QUEST</div>
          <p className="sous-titre">Mode multijoueur · 5 Degrés</p>
        </header>

        <nav className="onglets" role="tablist">
          {([["rejoindre", "Rejoindre"], ["animer", "Animer"], ["creer", "Créer un salon"]] as [Onglet, string][]).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={onglet === k} className={"onglet" + (onglet === k ? " actif" : "")}
              onClick={() => { setOnglet(k); setErreur(null); }}>{l}</button>
          ))}
        </nav>

        <section className="carte-blanche">
          {onglet === "rejoindre" && (
            <div className="formulaire">
              <h2>Créer votre entreprise</h2>
              <label>Code du salon
                <input className="code" value={codeSalon} maxLength={6} onChange={(e) => setCodeSalon(e.target.value.toUpperCase())} placeholder="EX. K7M2QX" />
              </label>
              <label>Nom de l'entreprise
                <input value={entreprise} maxLength={40} onChange={(e) => setEntreprise(e.target.value)} placeholder="GreenBox" />
              </label>
              <label>Prénoms des membres (séparés par des virgules)
                <input value={membres} onChange={(e) => setMembres(e.target.value)} placeholder="Léa, Karim" />
              </label>
              <label>Votre produit en une phrase
                <input value={produit} maxLength={200} onChange={(e) => setProduit(e.target.value)} placeholder="Une box de produits locaux livrée chaque semaine" />
              </label>
              <label>Votre objectif
                <input value={objectif} maxLength={300} onChange={(e) => setObjectif(e.target.value)} placeholder="Atteindre 500 abonnés en 6 mois" />
              </label>
              <button className="btn btn-primaire" disabled={envoi || !codeSalon || !entreprise.trim() || !membres.trim()} onClick={rejoindre}>
                {envoi ? "Connexion…" : "Rejoindre le salon"}
              </button>
            </div>
          )}

          {onglet === "animer" && (
            <div className="formulaire">
              <h2>Espace animateur</h2>
              <label>Code du salon
                <input className="code" value={codeSalon} maxLength={6} onChange={(e) => setCodeSalon(e.target.value.toUpperCase())} />
              </label>
              <label>Code admin
                <input className="code" type="password" value={codeAdmin} maxLength={10} onChange={(e) => setCodeAdmin(e.target.value.toUpperCase())} />
              </label>
              <button className="btn btn-primaire" disabled={envoi || !codeSalon || !codeAdmin} onClick={animer}>
                {envoi ? "Vérification…" : "Ouvrir la supervision"}
              </button>
            </div>
          )}

          {onglet === "creer" && !cree && (
            <div className="formulaire">
              <h2>Nouveau salon</h2>
              <label>Code organisateur 5 Degrés
                <input type="password" value={codeOrga} onChange={(e) => setCodeOrga(e.target.value)} />
              </label>
              <label>Nom du salon
                <input value={nomSalon} maxLength={80} onChange={(e) => setNomSalon(e.target.value)} placeholder="Formation Strat produit · 20 nov. matin" />
              </label>
              <div className="ligne-champs">
                <label>Équipes max
                  <input type="number" min={1} max={50} value={maxEquipes} onChange={(e) => setMaxEquipes(Number(e.target.value))} />
                </label>
                <label>Durée (min)
                  <input type="number" min={1} max={600} value={duree} onChange={(e) => setDuree(Number(e.target.value))} />
                </label>
                <label>Valorisation de départ (€)
                  <input type="number" min={0} step={10000} value={valoDepart} onChange={(e) => setValoDepart(Number(e.target.value))} />
                </label>
              </div>
              <button className="btn btn-primaire" disabled={envoi || !codeOrga || !nomSalon.trim()} onClick={creer}>
                {envoi ? "Création…" : "Créer le salon"}
              </button>
            </div>
          )}

          {onglet === "creer" && cree && (
            <div className="formulaire">
              <h2>Salon créé</h2>
              <div className="codes">
                <div><span className="etiquette">Code salon (à donner aux équipes)</span><span className="code-geant">{cree.code_salon}</span></div>
                <div><span className="etiquette">Code admin (à garder pour vous)</span><span className="code-geant secret">{cree.code_admin}</span></div>
              </div>
              <p className="alerte">Notez le code admin maintenant : il ne sera plus jamais affiché.</p>
              <button className="btn btn-primaire" onClick={() => onEntrer({ type: "admin", code_salon: cree.code_salon, code_admin: cree.code_admin })}>
                Ouvrir la supervision
              </button>
            </div>
          )}

          {erreur && <p className="erreur" role="alert">{erreur}</p>}
        </section>
      </div>
    </main>
  );
}
