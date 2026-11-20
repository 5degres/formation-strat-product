// Tests de la base multijoueur avec PGlite (Postgres en WebAssembly).
// Lancer : npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role;`);
// Reproduit les droits par défaut de Supabase sur le schéma public.
await db.exec(`alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`);
await db.exec(readFileSync(new URL("../supabase/migrations/20261120000000_multijoueur.sql", import.meta.url), "utf8"));
await db.exec(`select jeu.definir_code_organisateur('ORGA-5DEGRES-TEST')`);

let ok = 0;
const rpc = async (fn, args, role = "anon") => {
  const keys = Object.keys(args);
  const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
  await db.exec(`set role ${role}`);
  try { return (await db.query(sql, Object.values(args))).rows[0].r; }
  finally { await db.exec(`reset role`); }
};
const erreur = async (code, p) => {
  await assert.rejects(p, (e) => { assert.match(e.message, new RegExp(code)); return true; });
};
const test = async (nom, f) => { await f(); ok++; console.log("  ✓ " + nom); };

console.log("Scénario PRD §15");
let salon, admin, A, B, C;
const adm = (type, payload = {}, action_id = randomUUID()) =>
  rpc("action_admin", { p_code_salon: salon, p_code_admin: admin, p_action_id: action_id, p_type: type, p_payload: JSON.stringify(payload), p_auteur: "Lucas" });
const repondre = (token, lieu, verdict, id = randomUUID()) =>
  rpc("enregistrer_reponse", { p_token: token, p_client_action_id: id, p_lieu: lieu, p_reponse: "réponse de test", p_verdict: verdict, p_score: 80, p_details: "{}" }, "service_role");

await test("Code organisateur requis pour créer un salon", async () => {
  await erreur("CODE_ORGANISATEUR_INVALIDE", rpc("creer_salon", { p_code_organisateur: "faux", p_nom: "X" }));
});
await test("Création d'un salon : code salon 6 car. + code admin 10 car.", async () => {
  const r = await rpc("creer_salon", { p_code_organisateur: "ORGA-5DEGRES-TEST", p_nom: "Formation matin", p_max_equipes: 12, p_duree_min: 55 });
  salon = r.code_salon; admin = r.code_admin;
  assert.match(salon, /^[A-Z2-9]{6}$/); assert.match(admin, /^[A-Z2-9]{10}$/);
});
await test("Mauvais code admin refusé", async () => {
  await erreur("ACCES_ADMIN_REFUSE", rpc("etat_admin", { p_code_salon: salon, p_code_admin: "AAAAAAAAAA" }));
});
await test("Trois équipes rejoignent ; nom d'entreprise en double refusé", async () => {
  A = (await rpc("rejoindre_salon", { p_code_salon: salon.toLowerCase(), p_entreprise: "GreenBox", p_membres: ["Léa", "Karim"], p_produit: "Box locale", p_objectif: "x" })).token;
  B = (await rpc("rejoindre_salon", { p_code_salon: salon, p_entreprise: "Fleeto", p_membres: ["Ana"], p_produit: "", p_objectif: "" })).token;
  C = (await rpc("rejoindre_salon", { p_code_salon: salon, p_entreprise: "Mediloc", p_membres: ["Tom", "Zoé"], p_produit: "", p_objectif: "" })).token;
  await erreur("NOM_ENTREPRISE_PRIS", rpc("rejoindre_salon", { p_code_salon: salon, p_entreprise: "  greenbox ", p_membres: ["X"], p_produit: "", p_objectif: "" }));
  await erreur("SALON_INTROUVABLE", rpc("rejoindre_salon", { p_code_salon: "ZZZZZZ", p_entreprise: "Y", p_membres: ["X"], p_produit: "", p_objectif: "" }));
  const st = await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin });
  assert.equal(st.equipes.length, 3); assert.equal(st.session.statut, "LOBBY");
});
await test("Équipe prête, visible par l'animateur", async () => {
  await rpc("equipe_prete", { p_token: A, p_prete: true });
  const st = await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin });
  assert.equal(st.equipes.find((e) => e.entreprise === "GreenBox").prete, true);
  assert.equal(st.equipes.find((e) => e.entreprise === "GreenBox").en_ligne, true);
});
await test("Aucune action de jeu avant le lancement", async () => {
  await erreur("PARTIE_VERROUILLEE", repondre(A, "tour_vision", "excellente"));
});
await test("Lancement idempotent (double clic) ; même heure de fin pour tous", async () => {
  const id = randomUUID();
  await adm("LANCER", {}, id);
  const r2 = await adm("LANCER", {}, id);
  assert.equal(r2.deja_traite, true);
  const r3 = await adm("LANCER");
  assert.equal(r3.deja_traite, true);
  const a = await rpc("etat_equipe", { p_token: A }), b = await rpc("etat_equipe", { p_token: B });
  assert.equal(a.session.statut, "RUNNING");
  assert.equal(a.session.deadline, b.session.deadline);
  const n = (await db.query(`select count(*)::int n from jeu.actions_admin where type='LANCER'`)).rows[0].n;
  assert.equal(n, 1);
});
await test("Modification du lobby fermée après lancement", async () => {
  await erreur("MODIFICATION_FERMEE", rpc("modifier_equipe", { p_token: A, p_entreprise: "Autre", p_membres: ["Léa"], p_produit: "", p_objectif: "" }));
});
await test("Scoring serveur : barème, coefficient de tentative et malus", async () => {
  let r = await repondre(A, "tour_vision", "excellente");
  assert.equal(r.delta, 150000); assert.equal(r.valorisation, 650000); assert.equal(r.valide, true);
  r = await repondre(B, "tour_vision", "insuffisante");
  assert.equal(r.delta, -25000); assert.equal(r.valide, false);
  r = await repondre(B, "tour_vision", "correcte");          // 2e tentative : 75 000 × 0,6
  assert.equal(r.delta, 45000); assert.equal(r.tentative, 2);
  r = await repondre(C, "cafe_utilisateurs", "insuffisante");
  r = await repondre(C, "cafe_utilisateurs", "insuffisante");
  r = await repondre(C, "cafe_utilisateurs", "insuffisante"); // 3e échec : lieu validé quand même
  assert.equal(r.valide, true); assert.equal(r.tentative, 3);
  await erreur("LIEU_DEJA_VALIDE", repondre(A, "tour_vision", "excellente"));
});
await test("Idempotence : une action rejouée ne crée pas de double gain", async () => {
  const id = randomUUID();
  const r1 = await repondre(A, "atelier_valeur", "correcte", id);
  const r2 = await repondre(A, "atelier_valeur", "correcte", id);
  assert.equal(r2.deja_traite, true); assert.equal(r1.valorisation, r2.valorisation);
  const a = await rpc("etat_equipe", { p_token: A });
  assert.equal(a.equipe.valorisation, 725000);
});
await test("Une équipe ne peut pas appeler le scoring ni lire les tables", async () => {
  await erreur("permission denied", rpc("enregistrer_reponse", { p_token: A, p_client_action_id: randomUUID(), p_lieu: "marche", p_reponse: "x", p_verdict: "excellente", p_score: 100, p_details: "{}" }));
  await db.exec("set role anon");
  await assert.rejects(db.query("select * from jeu.equipes"));
  await db.exec("reset role");
});
await test("Classement en jeu : top 3 + son rang ; aucune valorisation dans la présence", async () => {
  const a = await rpc("etat_equipe", { p_token: A });
  assert.equal(a.equipe.rang, 1);
  assert.deepEqual(a.classement.map((c) => c.entreprise), ["GreenBox", "Fleeto", "Mediloc"]);
  assert.equal(a.equipes[0].valorisation, undefined);
});
await test("Déplacement sur la carte visible par les autres", async () => {
  await rpc("deplacer_equipe", { p_token: B, p_lieu: "garage_mvp" });
  const a = await rpc("etat_equipe", { p_token: A });
  assert.equal(a.equipes.find((e) => e.entreprise === "Fleeto").lieu_courant, "garage_mvp");
});
await test("Pause : actions refusées, minuteur décalé à la reprise", async () => {
  const avant = (await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin })).session.deadline;
  await adm("PAUSE");
  await erreur("PARTIE_VERROUILLEE", repondre(A, "marche", "excellente"));
  await new Promise((r) => setTimeout(r, 1100));
  await adm("REPRENDRE");
  const apres = (await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin })).session.deadline;
  assert.ok(new Date(apres) > new Date(avant));
});
await test("Fin de partie : verrouillage serveur, idempotente, persistante", async () => {
  const id = randomUUID();
  await adm("TERMINER", {}, id); await adm("TERMINER", {}, id); await adm("TERMINER");
  await erreur("PARTIE_VERROUILLEE", repondre(A, "marche", "excellente"));
  await erreur("PARTIE_VERROUILLEE", rpc("deplacer_equipe", { p_token: A, p_lieu: "marche" }));
  const c = await rpc("etat_equipe", { p_token: C }); // « rechargement »
  assert.equal(c.session.statut, "FINISHED"); assert.equal(c.session.finished_reason, "ANIMATEUR");
  assert.equal(c.classement.length, 3); // classement complet après la fin
});
await test("Remise des prix : top 3 qualifié, bonus jury limité au top 3 et à ±10 %", async () => {
  await adm("REMISE_DES_PRIX");
  const st = await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin });
  assert.equal(st.session.qualifies.length, 3);
  const id = (n) => st.equipes.find((e) => e.entreprise === n).equipe_id;
  await erreur("BONUS_INVALIDE", adm("BONUS_JURY", { equipe_id: id("Mediloc"), pct: 25 }));
  await adm("BONUS_JURY", { equipe_id: id("Mediloc"), pct: 10 });
  await adm("BONUS_JURY", { equipe_id: id("GreenBox"), pct: -10 });
  const a = await rpc("etat_equipe", { p_token: A });
  assert.equal(a.equipe.bonus_jury_pct, null); // bonus non visibles avant publication
});
await test("Publication : classement final recalculé et verrouillé", async () => {
  await adm("PUBLIER");
  const a = await rpc("etat_equipe", { p_token: A });
  assert.equal(a.session.statut, "PUBLISHED");
  const g = a.classement.find((c) => c.entreprise === "GreenBox");
  assert.equal(g.valorisation, 725000); assert.equal(g.valorisation_finale, 652000);
  await erreur("TRANSITION_INTERDITE", adm("ROUVRIR"));
  await erreur("TRANSITION_INTERDITE", adm("BONUS_JURY", { equipe_id: g.equipe_id, pct: 5 }));
});
await test("Export : identification, événements, actions admin, résultats", async () => {
  const x = await rpc("exporter_salon", { p_code_salon: salon, p_code_admin: admin });
  assert.equal(x.equipes.length, 3); assert.equal(x.evenements.length, 7);
  assert.ok(x.actions_admin.some((a) => a.type === "BONUS_JURY" && a.auteur === "Lucas"));
  assert.equal(x.resultats.length, 3);
});

console.log("Minuteur, réouverture, égalités, capacité");
let salon2, admin2;
await test("Fin automatique quand le minuteur atteint zéro", async () => {
  const r = await rpc("creer_salon", { p_code_organisateur: "ORGA-5DEGRES-TEST", p_nom: "Après-midi", p_max_equipes: 10, p_duree_min: 30 });
  salon2 = r.code_salon; admin2 = r.code_admin; salon = salon2; admin = admin2;
  const toks = [];
  for (let i = 1; i <= 10; i++) toks.push((await rpc("rejoindre_salon", { p_code_salon: salon2, p_entreprise: "Equipe " + i, p_membres: ["P" + i], p_produit: "", p_objectif: "" })).token);
  await erreur("SALON_COMPLET", rpc("rejoindre_salon", { p_code_salon: salon2, p_entreprise: "Equipe 11", p_membres: ["P"], p_produit: "", p_objectif: "" }));
  await adm("LANCER");
  await repondre(toks[0], "tour_vision", "correcte");
  await repondre(toks[1], "tour_vision", "correcte");
  await db.exec(`update jeu.sessions set deadline = now() - interval '1 second' where code_salon = '${salon2}'`);
  await erreur("PARTIE_VERROUILLEE", repondre(toks[2], "tour_vision", "excellente"));
  const e = await rpc("etat_equipe", { p_token: toks[2] });
  assert.equal(e.session.statut, "FINISHED"); assert.equal(e.session.finished_reason, "TEMPS");
  // égalité : Equipe 1 et 2 ont le même rang
  assert.equal(e.classement[0].rang, 1); assert.equal(e.classement[1].rang, 1);
  assert.equal(e.classement.length, 10);
  globalThis.toks = toks;
});
await test("Réouverture après erreur : la partie repart, les bonus sont remis à zéro", async () => {
  await adm("REMISE_DES_PRIX");
  await adm("ROUVRIR", { minutes: 3 });
  const st = await rpc("etat_admin", { p_code_salon: salon, p_code_admin: admin });
  assert.equal(st.session.statut, "RUNNING"); assert.deepEqual(st.session.qualifies, []);
  const r = await repondre(globalThis.toks[2], "tour_vision", "excellente");
  assert.equal(r.delta, 150000);
});
await test("Salons isolés : un jeton d'équipe ne voit que son salon", async () => {
  const e = await rpc("etat_equipe", { p_token: globalThis.toks[0] });
  assert.equal(e.session.code_salon, salon2); assert.equal(e.nb_equipes, 10);
});

console.log(`\n${ok} tests réussis`);
