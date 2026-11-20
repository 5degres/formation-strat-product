import { useState } from "react";
import Accueil from "./Accueil";
import Equipe from "./Equipe";
import Admin from "./Admin";
import { configOk, stockage } from "./api";

export type Acces = { type: "equipe"; token: string } | { type: "admin"; code_salon: string; code_admin: string };

const CLE = "sq_acces";

export default function App() {
  const [acces, setAcces] = useState<Acces | null>(() => stockage.lire<Acces>(CLE));
  const entrer = (a: Acces) => { stockage.ecrire(CLE, a); setAcces(a); };
  const quitter = () => { stockage.effacer(CLE); stockage.effacer("sq_attente"); setAcces(null); };

  if (!configOk) {
    return (
      <main className="page centre">
        <div className="carte-blanche">
          <h1 className="titre-pixel">Configuration manquante</h1>
          <p>Renseignez <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> (voir le README).</p>
        </div>
      </main>
    );
  }
  if (acces?.type === "equipe") return <Equipe token={acces.token} onQuitter={quitter} />;
  if (acces?.type === "admin") return <Admin codeSalon={acces.code_salon} codeAdmin={acces.code_admin} onQuitter={quitter} />;
  return <Accueil onEntrer={entrer} />;
}
