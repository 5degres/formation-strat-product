export type Verdict = "excellente" | "correcte" | "insuffisante";

export type Lieu = {
  id: string;
  nom: string;
  concept: string;
  question: string; // {produit} est remplacé par le nom du produit
  positifs: string[][]; // groupes de mots-clés : chaque groupe trouvé = 1 point
  negatifs: string[];
  indice: string; // ce qui manque (sans donner la réponse)
  conseil: string;
  explication: string;
  piste: string; // donnée après 3 échecs
  toit: string; // variable CSS de couleur du toit
};

export const LIEUX: Lieu[] = [
  {
    id: "tour_vision", nom: "La Tour de la Vision", concept: "Vision produit",
    question: "Dans 5 ans, quel changement {produit} aura-t-il apporté à la vie de vos utilisateurs ?",
    positifs: [["dans 5 ans", "dans cinq ans", "d'ici", "avenir", "futur", "demain"], ["utilisateur", "client", "salarie", "manager", "collaborateur", "personne", "equipe", "candidat"], ["plus", "aucun", "chaque", "tous", "sans", "enfin", "change"]],
    negatifs: ["chiffre d'affaires", "gagner de l'argent", "leader du marche", "rentable"],
    indice: "Une vision décrit le monde que vous voulez créer pour vos utilisateurs, pas vos fonctionnalités ni votre chiffre d'affaires.",
    conseil: "Gardez une phrase courte, qui donne envie, et que toute l'équipe peut répéter.",
    explication: "La vision fixe le cap à 2-5 ans ; la stratégie dit comment l'atteindre (Marty Cagan, SVPG).",
    piste: "Essayez : « Dans 5 ans, [cible] ne [problème] plus jamais, grâce à [produit]. »",
    toit: "--chart-2",
  },
  {
    id: "cafe_utilisateurs", nom: "Le Café des utilisateurs", concept: "Persona et problème",
    question: "Qui est l'utilisateur principal de {produit}, et quel problème vit-il aujourd'hui ?",
    positifs: [["manager", "rh", "salarie", "etudiant", "parent", "commercial", "responsable", "freelance", "recruteur", "client", "ans"], ["probleme", "perd", "difficile", "galere", "frustr", "temps", "oubli", "stress", "manque", "douleur"], ["entretien", "interview", "observ", "sondage", "questionn", "chaque", "par semaine", "par mois", "souvent"]],
    negatifs: ["tout le monde", "n'importe qui", "pas encore notre"],
    indice: "Soyez précis : qui exactement (rôle, contexte) et quelle douleur concrète vit-il, avant même votre produit ?",
    conseil: "Allez parler à 5 vrais utilisateurs : un problème vérifié vaut plus qu'une intuition.",
    explication: "Les clients « embauchent » un produit pour accomplir une tâche (Jobs To Be Done, Christensen).",
    piste: "Formule : « [Rôle précis] qui [situation] perd [temps/argent/énergie] parce que [cause]. »",
    toit: "--chart-4",
  },
  {
    id: "atelier_valeur", nom: "L'Atelier de la valeur", concept: "Proposition de valeur",
    question: "Pourquoi votre utilisateur choisirait-il {produit} plutôt que de continuer comme aujourd'hui ?",
    positifs: [["au lieu de", "plutot que", "contrairement", "aujourd'hui", "actuellement", "sans"], ["gagne", "economise", "reduit", "evite", "simplifie", "rassure", "minutes", "heures", "%"], ["parce que", "car", "grace a"]],
    negatifs: ["fonctionnalites", "il y a un bouton"],
    indice: "Parlez du bénéfice pour l'utilisateur, relié à sa douleur, et comparez avec ce qu'il fait aujourd'hui.",
    conseil: "Un bénéfice chiffré (« 15 minutes au lieu de 2 jours ») est bien plus convaincant.",
    explication: "La proposition de valeur relie les douleurs et gains du client à ce que vous offrez (Strategyzer).",
    piste: "Formule : « Avec [produit], [cible] obtient [bénéfice] au lieu de [situation actuelle]. »",
    toit: "--chart-5",
  },
  {
    id: "observatoire", nom: "L'Observatoire", concept: "Concurrence",
    question: "Qui ou quoi résout déjà ce problème aujourd'hui, et qu'est-ce qui différencie {produit} ?",
    positifs: [["concurrent", "excel", "papier", "a la main", "manuel", "outil", "application", "solution", "existe", "rien faire"], ["different", "difference", "unique", "seul", "contrairement", "mieux", "alors que"], ["pour", "utilisateur", "cible", "parce que", "car"]],
    negatifs: ["pas de concurrent", "aucun concurrent", "personne ne fait"],
    indice: "Il y a toujours une alternative, même « faire à la main » ou « ne rien faire ». Et votre différence doit compter pour la cible.",
    conseil: "Listez ce que vos utilisateurs feraient si votre produit n'existait pas : ce sont vos vrais concurrents.",
    explication: "On se positionne face aux alternatives réelles du client (April Dunford, Obviously Awesome).",
    piste: "Formule : « Aujourd'hui ils utilisent [alternative] ; nous seuls [différence qui compte pour eux]. »",
    toit: "--chart-3",
  },
  {
    id: "garage_mvp", nom: "Le Garage", concept: "MVP",
    question: "Quelle est la plus petite version de {produit} qui permet de tester votre idée ?",
    positifs: [["tester", "test", "verifier", "valider", "hypothese", "apprendre"], ["maquette", "prototype", "formulaire", "landing", "page", "excel", "manuel", "email", "simple", "seule", "une fonctionnalite"], ["si ", "succes", "objectif", "%", "utilisateurs", "mesur", "semaines", "mois"]],
    negatifs: ["toutes les fonctionnalites", "application complete", "tout le produit"],
    indice: "Un MVP sert à apprendre vite : quelle hypothèse testez-vous, avec quoi de minimal, et comment saurez-vous si c'est réussi ?",
    conseil: "Le meilleur MVP est parfois sans code : un formulaire, un tableur ou un service fait à la main.",
    explication: "Le MVP maximise l'apprentissage validé avec un minimum d'effort (Eric Ries).",
    piste: "Formule : « On teste [hypothèse] avec [version minimale] auprès de [N] personnes ; succès si [critère]. »",
    toit: "--chart-1",
  },
  {
    id: "salle_des_choix", nom: "La Salle des choix", concept: "Priorisation",
    question: "Parmi vos idées de fonctionnalités pour {produit}, lesquelles sont « Must have », et lesquelles mettez-vous de côté ?",
    positifs: [["must", "indispensable", "essentiel", "priorit"], ["won't", "wont", "pas maintenant", "plus tard", "de cote", "renonce", "could", "should"], ["parce que", "car", "impact", "effort", "valeur", "probleme"]],
    negatifs: ["tout est important", "tout est must", "toutes"],
    indice: "Prioriser, c'est renoncer : gardez peu de « Must », justifiez-les et assumez ce que vous ne faites pas.",
    conseil: "Pas plus de 60 % de l'effort en « Must have », conseille la méthode DSDM.",
    explication: "MoSCoW (Must, Should, Could, Won't) ou RICE (Reach x Impact x Confiance / Effort) aident à choisir.",
    piste: "Formule : « Must : [1 ou 2 éléments], car [lien au problème]. Won't pour l'instant : [éléments]. »",
    toit: "--chart-2",
  },
  {
    id: "salle_des_cartes", nom: "La Salle des cartes", concept: "Roadmap",
    question: "Que livrez-vous pour {produit} dans 3 mois, 6 mois et 1 an ?",
    positifs: [["3 mois", "trois mois", "now", "maintenant", "d'abord"], ["6 mois", "six mois", "next", "ensuite", "puis"], ["1 an", "un an", "later", "plus tard", "enfin"], ["objectif", "resultat", "pour que", "afin", "valider", "utilisateurs"]],
    negatifs: ["tout en meme temps", "tout livrer"],
    indice: "Une roadmap raconte une progression : une étape claire maintenant, puis ensuite, puis plus tard, reliée à vos priorités.",
    conseil: "Formulez chaque étape en résultat attendu plutôt qu'en liste de fonctionnalités.",
    explication: "Le format Now / Next / Later reste flexible et orienté résultats (Product School, Melissa Perri).",
    piste: "Formule : « 3 mois : [valider le MVP]. 6 mois : [étendre]. 1 an : [passer à l'échelle]. »",
    toit: "--chart-4",
  },
  {
    id: "tableau_de_bord", nom: "Le Tableau de bord", concept: "OKR et KPI",
    question: "Quel indicateur prouvera que {produit} fonctionne vraiment ?",
    positifs: [["%", "taux", "nombre", "nps", "note", "/5", "retention", "utilisateurs actifs", "satisf"], ["d'ici", "par mois", "par semaine", "fin", "en ", "mois", "trimestre"], ["objectif", "cible", "atteindre", "au moins", "plus de"]],
    negatifs: ["telechargements", "likes", "lancer l'appli", "followers"],
    indice: "Un bon indicateur se mesure, a une cible chiffrée et une échéance, et reflète la valeur pour l'utilisateur.",
    conseil: "Méfiez-vous des indicateurs de vanité (téléchargements, likes) : regardez l'usage réel.",
    explication: "Un OKR = un Objectif inspirant + des Résultats clés mesurables (John Doerr, Measure What Matters).",
    piste: "Formule : « [X] % de [cible] font [action de valeur] d'ici [date]. »",
    toit: "--chart-3",
  },
  {
    id: "marche", nom: "Le Marché", concept: "Product-market fit",
    question: "Comment saurez-vous que le marché veut vraiment {produit} ?",
    positifs: [["decu", "40", "retention", "reviennent", "rachet", "recommand", "bouche", "payent", "paient", "reabonn"], ["%", "taux", "mesur", "sondage", "question", "chiffre"], ["utilisateurs", "clients", "apres", "mois", "semaines"]],
    negatifs: ["s'ils aiment l'idee", "mes amis", "ma famille", "on le sent"],
    indice: "L'enthousiasme ne suffit pas : cherchez un signal mesurable d'utilisateurs qui ne veulent plus s'en passer.",
    conseil: "Le test de Sean Ellis : si 40 % des utilisateurs seraient « très déçus » sans votre produit, c'est bon signe.",
    explication: "Le product-market fit, c'est un bon marché avec un produit qui le satisfait vraiment.",
    piste: "Formule : « Après [durée], on demande : seriez-vous très déçu sans [produit] ? Objectif : 40 %. »",
    toit: "--chart-5",
  },
  {
    id: "banque", nom: "La Banque", concept: "Business model",
    question: "Qui paie pour {produit}, combien, et comment gagnez-vous de l'argent ?",
    positifs: [["paie", "payer", "achete", "finance", "client", "entreprise", "drh"], ["€", "euro", "euros", "prix", "par mois", "par an", "abonnement", "licence", "commission", "freemium"], ["cout", "marge", "depense", "serveur", "equipe"]],
    negatifs: ["on verra", "plus tard", "gratuit pour toujours"],
    indice: "Précisez qui paie (pas forcément l'utilisateur), combien et sous quelle forme.",
    conseil: "Pensez aux coûts principaux : un modèle rentable gagne plus qu'il ne dépense.",
    explication: "Le business model décrit comment on crée, délivre et capte la valeur (Business Model Canvas, Strategyzer).",
    piste: "Formule : « [Payeur] paie [prix] par [unité] ; nos coûts principaux sont [coûts]. »",
    toit: "--chart-1",
  },
  {
    id: "place_lancement", nom: "La Place du lancement", concept: "Go-to-market",
    question: "Comment allez-vous trouver les 100 premiers clients de {produit} ?",
    positifs: [["linkedin", "salon", "evenement", "demo", "bouche", "partenari", "reseau", "email", "communaute", "ambassadeur", "agence", "terrain"], ["premiers", "d'abord", "commencer", "pilote", "segment", "ville", "100"], ["parce que", "car", "ou se trouve", "cible", "message"]],
    negatifs: ["se vendra tout seul", "pub tele", "tout le monde"],
    indice: "Commencez petit : un segment précis, un ou deux canaux où se trouve votre cible, et une action concrète.",
    conseil: "Au début, faites des choses qui « ne passent pas à l'échelle » : démos une par une, appels, rencontres.",
    explication: "Le go-to-market définit comment atteindre et convaincre vos premiers clients (Lenny Rachitsky, Crossing the Chasm).",
    piste: "Formule : « On démarre avec [segment], via [canal], en proposant [offre pilote]. »",
    toit: "--chart-2",
  },
];

export const FINAL = { id: "salle_investisseurs", nom: "La Salle des investisseurs", concept: "Pitch" };

export const BAREME = { depart: 500000, excellente: 150000, correcte: 75000, malusPct: 0.05, coef: [1, 0.6, 0.3] };

export const CREDITS =
  "Sprites : Universal LPC Spritesheet Character Generator (liberatedpixelcup.github.io). Auteurs : bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike), Manuel Riecke (MrBeast), Joe White, Thane Brimhall (pennomi), laetissima et contributeurs LPC. Licences : CC-BY-SA 3.0 / OGA-BY 3.0 / GPL 3.0. Polices : Press Start 2P (CodeMan38), VT323 (Peter Hull), Raleway, via Google Fonts (OFL).";

/* Texte écrit sur le tableau blanc de chaque lieu (couche visuelle v2). */
export const TABLEAU: Record<string, string[]> = {
  tour_vision: ["Où ?", "Pour qui ?", "Pourquoi ?"],
  cafe_utilisateurs: ["Persona", "Problème", "Besoin"],
  atelier_valeur: ["Problème", "Solution", "Bénéfice"],
  observatoire: ["Concurrents", "Alternatives", "Différence"],
  garage_mvp: ["Idée", "Prototype", "Test", "Apprendre"],
  salle_des_choix: ["Must", "Should", "Could", "Won't"],
  salle_des_cartes: ["Now", "Next", "Later"],
  tableau_de_bord: ["Objectif", "Résultats clés", "KPI"],
  marche: ["Cible", "Usage", "Rétention"],
  banque: ["Valeur", "Revenus", "Coûts"],
  place_lancement: ["Cible", "Canal", "Message", "Lancement"],
};
