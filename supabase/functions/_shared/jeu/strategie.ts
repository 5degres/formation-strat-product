/* Start-up Quest v3 : quartiers, fil rouge, critères de notation et événements surprise. */

export type QuartierId = "reveurs" | "bricoleurs" | "compteurs" | "ambitieux";
export type Quartier = {
  id: QuartierId; nom: string; verbe: string; couleur: string; lieux: string[];
  accueil: string; cloture: string;
  /* position du panneau sur la carte, en tuiles (48 x 27) */
  panneau: { x: number; y: number };
};

export const QUARTIERS: Quartier[] = [
  {
    id: "reveurs", nom: "Le Quartier des Rêveurs", verbe: "Comprendre", couleur: "var(--c-fawn-600)",
    lieux: ["tour_vision", "cafe_utilisateurs", "atelier_valeur", "observatoire"],
    accueil: "Vous entrez dans le Quartier des Rêveurs ! Ici, on prend le temps de comprendre avant de foncer : votre cap, vos utilisateurs, votre promesse et vos concurrents. Visitez les lieux dans l'ordre qui vous plaît.",
    cloture: "Le Quartier des Rêveurs est bouclé : vous savez pour qui vous travaillez et pourquoi on vous choisira. Direction la Zone des Bricoleurs pour passer à l'action.",
    panneau: { x: 16.6, y: 9.25 },
  },
  {
    id: "bricoleurs", nom: "La Zone des Bricoleurs", verbe: "Tester", couleur: "var(--c-green)",
    lieux: ["garage_mvp", "salle_des_choix", "salle_des_cartes"],
    accueil: "Ah, la Zone des Bricoleurs ! Ici, on retrousse ses manches : on construit petit, on fait des choix et on planifie la suite. Gardez bien en tête la cible et la promesse trouvées chez les Rêveurs.",
    cloture: "La Zone des Bricoleurs est validée : MVP, priorités et roadmap racontent la même histoire. Montez au Belvédère des Compteurs pour prouver que ça marche.",
    panneau: { x: 10.8, y: 19.3 },
  },
  {
    id: "compteurs", nom: "Le Belvédère des Compteurs", verbe: "Mesurer", couleur: "var(--c-teal)",
    lieux: ["tableau_de_bord", "marche"],
    accueil: "Vous voilà au Belvédère des Compteurs ! Ici, fini l'intuition, ce sont les chiffres qui parlent. Votre défi : prouver que votre produit crée vraiment de la valeur.",
    cloture: "Vos compteurs sont réglés : vous saurez si le marché vous veut. Dernier quartier, le Port des Ambitieux, pour gagner de l'argent et trouver vos premiers clients.",
    panneau: { x: 41.2, y: 10.9 },
  },
  {
    id: "ambitieux", nom: "Le Port des Ambitieux", verbe: "Vendre", couleur: "var(--px-gold-dark)",
    lieux: ["banque", "place_lancement"],
    accueil: "Le Port des Ambitieux, enfin ! Il est temps de larguer les amarres : on va parler argent et premiers clients.",
    cloture: "Le Port des Ambitieux est prêt : votre start-up peut vivre et se lancer. La Salle des investisseurs vous attend pour le pitch final !",
    panneau: { x: 25.0, y: 19.3 },
  },
];

export const quartierDe = (lieuId: string): Quartier | undefined => QUARTIERS.find((q) => q.lieux.includes(lieuId));

/* Accroches du fil rouge : pourquoi ce lieu compte dans le parcours (indépendantes de l'ordre de visite). */
export const ACCROCHES: Record<string, string> = {
  tour_vision: "La vision, c'est le cap : tout ce que vous construirez ensuite devra la servir.",
  cafe_utilisateurs: "Avant de construire quoi que ce soit, on rencontre les vrais utilisateurs et leur problème du quotidien. Leur portrait sera votre fil rouge.",
  atelier_valeur: "Votre cible a un problème. Ici, on forge la raison pour laquelle elle vous choisira, vous plutôt qu'autre chose.",
  observatoire: "Depuis l'Observatoire, on regarde l'horizon : qui d'autre résout déjà ce problème, même avec un simple tableur ?",
  garage_mvp: "Au Garage, on passe à l'action : quelle est la plus petite chose à construire pour apprendre vite, sans tout développer ?",
  salle_des_choix: "Les idées fusent. Dans la Salle des choix, on apprend l'art de renoncer pour se concentrer sur l'essentiel.",
  salle_des_cartes: "La Salle des cartes déroule vos priorités dans le temps : une progression crédible, pas une liste de souhaits.",
  tableau_de_bord: "Le Tableau de bord dira si vous avancez vraiment : un chiffre utile vaut mieux que dix chiffres flatteurs.",
  marche: "Au Marché, on pose LA question des investisseurs : le marché veut-il vraiment de vous ?",
  banque: "À la Banque, on vérifie que votre start-up peut vivre : qui paie, combien, et pour quels coûts ?",
  place_lancement: "Sur la Place du lancement, on prépare le décollage : comment trouver vos 100 premiers clients, concrètement ?",
};

/* Présentations de Max à l'entrée de chaque lieu : accueil chaleureux + le concept expliqué simplement. */
export const INTROS: Record<string, string> = {
  tour_vision: "Bienvenue en haut de la Tour de la Vision ! D'ici, on voit loin. La vision produit, c'est le changement que vous voulez apporter dans quelques années. Pas ce que fait votre appli, mais ce qui sera différent dans la vie de vos utilisateurs grâce à elle.",
  cafe_utilisateurs: "Installez-vous, le café est pour moi ! Ici, on parle de ceux qui comptent le plus : vos utilisateurs. Avant de construire quoi que ce soit, il faut savoir pour qui on travaille et quel vrai problème cette personne vit au quotidien. C'est ce portrait qu'on appelle le persona.",
  atelier_valeur: "Bienvenue à l'Atelier, attention aux copeaux ! Ici, on fabrique votre proposition de valeur : la raison toute simple pour laquelle quelqu'un vous choisira, vous, plutôt que de continuer à faire comme avant.",
  observatoire: "Bienvenue à l'Observatoire ! Ici, on garde un œil sur nos rivaux les plus tenaces. Et un concurrent, ce n'est pas seulement une autre start-up : c'est aussi le bon vieux tableur, le collègue débrouillard ou l'habitude de ne rien changer. Le but : savoir ce qui vous rend vraiment différent.",
  garage_mvp: "Bienvenue au Garage ! Ça sent l'huile de moteur et les idées pas finies, et c'est voulu. Ici, on construit le MVP : la plus petite version de votre produit qui permet de vérifier que votre idée tient la route, avant d'y passer des mois.",
  salle_des_choix: "Entrez dans la Salle des choix ! Vous avez sûrement plein d'idées de fonctionnalités, et c'est très bien. Mais on ne peut pas tout faire en même temps : prioriser, c'est choisir ce qui compte maintenant et assumer de mettre le reste de côté.",
  salle_des_cartes: "Bienvenue dans la Salle des cartes ! Ici, on trace la route. La roadmap, c'est le plan de votre produit dans le temps : ce que vous livrez d'abord, ensuite et plus tard, et surtout ce que chaque étape doit permettre d'obtenir.",
  tableau_de_bord: "Bienvenue au Tableau de bord ! Ici, les impressions ne suffisent plus. Un KPI, c'est un chiffre qui vous dit si votre produit marche vraiment. Un OKR, c'est un objectif accompagné de résultats chiffrés pour savoir si vous l'avez atteint.",
  marche: "Bienvenue au Marché, ça grouille de monde ! C'est ici qu'on cherche le product-market fit : le moment où vos clients ne veulent plus se passer de vous. Ils reviennent, ils paient et ils en parlent autour d'eux.",
  banque: "Bienvenue à la Banque, asseyez-vous : on va parler argent ! Le business model, c'est la façon dont votre start-up gagne sa vie : qui paie, combien, et est-ce que ça couvre vos coûts. Petit piège : celui qui paie n'est pas toujours celui qui utilise.",
  place_lancement: "Bienvenue sur la Place du lancement ! Votre produit est prêt, il faut maintenant le faire connaître. Le go-to-market, c'est votre plan pour aller chercher vos premiers clients : par quel canal, avec quel message, et dans quel ordre.",
};

/* Petite relance avant la question, pour garder un ton de conversation. */
export const RELANCES: Record<string, string> = {
  tour_vision: "Alors, fermez les yeux et projetez-vous :",
  cafe_utilisateurs: "Racontez-moi :",
  atelier_valeur: "Dites-moi franchement :",
  observatoire: "Sortons la longue-vue :",
  garage_mvp: "À vos outils :",
  salle_des_choix: "Allez, on tranche :",
  salle_des_cartes: "Dépliez la carte :",
  tableau_de_bord: "Alors, dites-moi :",
  marche: "Question piège des investisseurs :",
  banque: "Parlons chiffres :",
  place_lancement: "Concrètement :",
};

/* Critères pondérés (total 85) : le reste vient des bonus (chiffre, précision, fil rouge). */
export type Critere = { id: string; label: string; manque: string; poids: number; mots: string[]; special?: "chiffre" | "cible" | "nom_propre" };

const PERSONNES = ["salarie", "collaborat", "employe", "manager", "rh ", "drh", "recruteur", "consultant", "client", "utilisateur", "usager", "parent", "famille", "etudiant", "eleve", "senior", "retraite", "jeune", "femme", "homme", "enfant", "patient", "medecin", "infirmi", "soignant", "commercant", "artisan", "independant", "freelance", "entrepreneur", "dirigeant", "pme", "tpe", "entreprise", "startup", "start up", "association", "habitant", "citadin", "voyageur", "touriste", "sportif", "candidat", "nouvel arrivant", "nouveaux arrivants", "nouveau collaborateur", "equipe", "agent", "technicien", "vendeur", "acheteur", "proprietaire", "locataire", "agriculteur", "restaurat", "particulier", "professionnel", "personne", "gens", "public", "foyer", "menage", "commune", "mairie", "ecole", "chercheur", "developpeur", "chef de projet", "business manager", "talent", "alternant", "stagiaire", "aidant", "cadre", "ouvrier", "conducteur", "livreur", "chauffeur", "commerciaux", "commercial", "acheteur", "propriet"];
export const MOTS_PERSONNES = PERSONNES;

export const CRITERES: Record<string, Critere[]> = {
  tour_vision: [
    { id: "horizon", label: "un horizon de temps", manque: "Situez votre vision dans le futur (dans 3 à 5 ans, à terme…).", poids: 20, mots: ["dans 2", "dans 3", "dans 5", "dans 10", "dans cinq", "dans trois", "dans dix", "d ici", "a terme", "avenir", "futur", "demain", "un jour", "bientot", "annees", "sera ", "seront ", "pourra", "pourront", "deviendra", "deviendront", "aura ", "auront", "n aura", "ne sera"] },
    { id: "cible", label: "un bénéficiaire précis", manque: "Pour qui le monde change-t-il ? Nommez un bénéficiaire.", poids: 25, mots: PERSONNES, special: "cible" },
    { id: "changement", label: "un changement concret", manque: "Décrivez ce qui sera différent pour eux, pas ce que fait l'outil.", poids: 25, mots: ["plus jamais", "ne plus", "plus aucun", "plus aucune", "aucun", "aucune", "sans ", "enfin", "chaque", "tous les", "toutes les", "change", "transform", "libere", "simplifi", "facilit", "permett", "permet", "pouvoir", "peut ", "peuvent", "reussi", "accede", "acces", "devien", "operationnel", "autonom", "serein", "en un", "en une"] },
    { id: "sens", label: "une ambition qui donne du sens", manque: "Rendez-la inspirante : quel impact sur leur vie ou leur travail ?", poids: 15, mots: ["monde", "vie", "quotidien", "societe", "planete", "seul", "serein", "confiance", "sens", "bien etre", "bien-etre", "heureux", "temps", "libre", "egal", "fier", "sante", "avenir", "travail", "metier", "plaisir", "stress", "dignit", "inclusi", "durable", "accueil", "premier jour"] },
  ],
  cafe_utilisateurs: [
    { id: "qui", label: "un utilisateur précis", manque: "Décrivez une personne précise (métier, âge, situation), pas « tout le monde ».", poids: 30, mots: PERSONNES },
    { id: "probleme", label: "un problème vécu", manque: "Quel problème vit-elle aujourd'hui ? Ce qui l'agace, lui coûte ou lui fait perdre du temps.", poids: 30, mots: ["probleme", "perd", "perte", "difficile", "difficulte", "galere", "frustr", "oubli", "stress", "manque", "douleur", "peine", "mal a", "n arrive pas", "ne sait pas", "ne trouve pas", "compliqu", "long", "trop cher", "cher", "seul", "isole", "inquiet", "peur", "gaspill", "attente", "attend", "retard", "erreur", "perdu", "perdent", "fatigu", "deborde", "complexe", "lourd", "penible", "ennui", "mal ", "risque", "crainte"] },
    { id: "contexte", label: "une situation concrète", manque: "Dans quelle situation le problème apparaît-il, et comment le savez-vous (entretiens, observation) ?", poids: 25, mots: ["quand", "lorsque", "chaque", "tous les", "toutes les", "par semaine", "par mois", "par jour", "souvent", "entretien", "interview", "observ", "sondage", "questionn", "aujourd hui", "actuellement", "au quotidien", "le matin", "le soir", "au travail", "premier jour", "premiere semaine", "pendant", "au moment", "des qu", "a chaque", "parce qu", "car "] },
  ],
  atelier_valeur: [
    { id: "comparaison", label: "une comparaison avec l'existant", manque: "Comparez avec ce qu'elle fait aujourd'hui : « au lieu de… », « plus besoin de… ».", poids: 25, mots: ["au lieu", "plutot que", "contrairement", "aujourd hui", "actuellement", "sans ", "fini ", "finis ", "plus besoin", "alors que", "mieux que", "par rapport", "plus de ", "ne plus", "fini les", "terminee", "plus jamais"] },
    { id: "benefice", label: "un bénéfice concret", manque: "Quel gain concret : du temps, de l'argent, de la tranquillité ?", poids: 35, mots: ["gagne", "economis", "reduit", "reduire", "reduction", "evite", "simplifi", "rassure", "minute", "heure", "jour", "%", "plus vite", "rapide", "moins cher", "facile", "serein", "tranquill", "confiance", "fiable", "automatique", "en un clic", "en 1 clic", "immediat", "sans effort", "economie", "moins de", "plus de temps", "meilleur", "accompagn", "garanti"] },
    { id: "lien", label: "un lien avec le problème", manque: "Expliquez pourquoi ce bénéfice règle SON problème (« grâce à… », « ce qui… »).", poids: 25, mots: ["parce que", "car ", "grace a", "puisque", "ce qui", "donc", "permet", "pour que", "afin", "pour ", "qui leur", "qui lui"] },
  ],
  observatoire: [
    { id: "alternative", label: "des alternatives identifiées", manque: "Citez qui ou quoi résout déjà le problème, même un tableur, un prestataire ou « ne rien faire ».", poids: 30, mots: ["concurren", "excel", "tableur", "papier", "a la main", "manuel", "outil", "application", "appli", "solution", "existe", "ne rien faire", "statu quo", "mail", "whatsapp", "teams", "slack", "prestataire", "cabinet", "agence", "google", "linkedin", "plateforme", "logiciel", "site", "service"], special: "nom_propre" },
    { id: "difference", label: "votre différence", manque: "En quoi êtes-vous différent ou meilleur qu'eux ?", poids: 30, mots: ["different", "difference", "unique", "seul ", "seuls", "contrairement", "mieux", "alors que", "specialis", "dedie", "plus simple", "plus rapide", "moins cher", "sur mesure", "personnalis", "nous ", "notre ", "eux ", "ils ne", "ne font pas", "ne proposent pas", "pas de "] },
    { id: "pour_cible", label: "une différence qui compte pour la cible", manque: "Reliez votre différence à ce qui compte pour votre cible.", poids: 25, mots: ["pour les", "pour le", "pour la", "utilisateur", "cible", "client", "parce que", "car ", "qui compte", "important pour", "attendent", "besoin"], special: "cible" },
  ],
  garage_mvp: [
    { id: "hypothese", label: "une hypothèse à tester", manque: "Que voulez-vous apprendre ? Formulez l'hypothèse à vérifier.", poids: 25, mots: ["tester", "test", "verifier", "valider", "hypothese", "apprendre", "savoir si", "voir si", "prouver", "comprendre si", "est ce que", "regarder si", "observer si", "confirmer"] },
    { id: "minimal", label: "une version vraiment minimale", manque: "Quelle est la plus petite version possible ? Un formulaire, une maquette, un service fait à la main…", poids: 30, mots: ["maquette", "prototype", "formulaire", "landing", "page", "excel", "tableur", "manuel", "a la main", "email", "mail", "simple", "seule", "une fonctionnalite", "une seule", "sans code", "no code", "pilote", "beta", "video", "demo", "kit", "papier", "concierge", "quelques", "petit", "groupe test", "10 ", "20 ", "5 "] },
    { id: "succes", label: "un critère de succès", manque: "Comment saurez-vous que c'est réussi ? Un seuil, un chiffre, un comportement observé.", poids: 30, mots: ["si ", "succes", "objectif", "%", "mesur", "combien", "taux", "reviennent", "achete", "payent", "paient", "s inscri", "utilisent", "au moins", "regarde", "ouvrent", "repond", "renouvel", "commande", "reussi"], special: "chiffre" },
  ],
  salle_des_choix: [
    { id: "must", label: "des « Must » clairs", manque: "Dites ce qui est indispensable maintenant.", poids: 30, mots: ["must", "indispensable", "essentiel", "priorit", "d abord", "en premier", "vital", "cle ", "obligatoire", "il faut", "on garde", "on fait"] },
    { id: "renoncement", label: "des renoncements assumés", manque: "Prioriser, c'est renoncer : qu'est-ce que vous ne faites PAS maintenant ?", poids: 30, mots: ["won t", "wont", "pas maintenant", "plus tard", "de cote", "renonc", "could", "should", "ne fera pas", "on ne fait pas", "pas tout de suite", "abandonn", "report", "attendr", "pas de ", "on laisse", "on oublie", "v2", "version 2", "ensuite"] },
    { id: "justification", label: "une justification", manque: "Justifiez vos choix : impact pour l'utilisateur, effort, lien avec le problème.", poids: 25, mots: ["parce que", "car ", "impact", "effort", "valeur", "probleme", "utilisateur", "cible", "cout", "risque", "puisque", "rice", "moscow", "pour tester", "pour valider", "sans quoi", "sinon"] },
  ],
  salle_des_cartes: [
    { id: "now", label: "une étape « maintenant »", manque: "Que livrez-vous dans les 3 prochains mois ?", poids: 25, mots: ["3 mois", "trois mois", "now", "maintenant", "d abord", "court terme", "premier", "immediat", "t1", "q1", "tout de suite", "dans un premier"] },
    { id: "next", label: "une étape « ensuite »", manque: "Et à 6 mois ?", poids: 20, mots: ["6 mois", "six mois", "next", "ensuite", "puis", "moyen terme", "apres", "dans un second", "deuxieme"] },
    { id: "later", label: "une étape « plus tard »", manque: "Et dans un an ?", poids: 20, mots: ["1 an", "un an", "12 mois", "douze mois", "later", "plus tard", "enfin", "long terme", "a terme", "fin d annee", "annee prochaine"] },
    { id: "resultat", label: "des étapes en résultats", manque: "Formulez au moins une étape comme un résultat attendu (valider, atteindre, convaincre…).", poids: 20, mots: ["objectif", "resultat", "pour que", "afin", "valider", "utilisateurs", "clients", "%", "atteindre", "prouver", "signer", "retention", "chiffre", "convaincre", "deployer", "etendre", "passer a"] },
  ],
  tableau_de_bord: [
    { id: "mesurable", label: "un indicateur mesurable", manque: "Choisissez un indicateur qu'on peut compter : un taux, un temps, un nombre.", poids: 30, mots: ["%", "taux", "nombre", "nps", "note", "/5", "/10", "retention", "utilisateurs actifs", "satisf", "temps moyen", "temps", "duree", "delai", "frequence", "part de", "ratio", "chiffre d affaires", "panier", "combien", "mesure", "pourcentage", "moyenne", "score"] },
    { id: "chiffre", label: "une cible chiffrée", manque: "Donnez une cible chiffrée (40 %, 3 jours, 200 utilisateurs…).", poids: 25, mots: [], special: "chiffre" },
    { id: "echeance", label: "une échéance", manque: "Quand ? Ajoutez une échéance (d'ici 6 mois, par mois…).", poids: 15, mots: ["d ici", "par mois", "par semaine", "fin ", "mois", "trimestre", " an", "semaine", "jours", "2026", "2027", "2028", "passe de", "en 1", "en un"] },
    { id: "usage", label: "un reflet de la valeur pour l'utilisateur", manque: "Votre indicateur doit refléter l'usage réel ou la valeur pour l'utilisateur.", poids: 15, mots: ["utilis", "actif", "reviennent", "autonom", "realis", "accompl", "recommand", "renouvel", "reussi", "chaque", "usage", "mission", "satisf", "fidel", "retention", "resolu", "gagne", "economis"] },
  ],
  marche: [
    { id: "signal", label: "un signal fort d'attachement", manque: "Cherchez un signal que les utilisateurs ne veulent plus s'en passer : ils reviennent, paient, recommandent.", poids: 35, mots: ["decu", "40", "retention", "reviennent", "revenir", "rachet", "recommand", "bouche", "payent", "paient", "paye", "payer", "reabonn", "renouvel", "precommand", "liste d attente", "s en passer", "utilisent encore", "fidele", "redemand", "reutilis", "continuent"] },
    { id: "mesure", label: "une mesure", manque: "Comment le mesurez-vous ? Un taux, un sondage, une question précise.", poids: 25, mots: ["%", "taux", "mesur", "sondage", "question", "chiffre", "combien", "nombre", "enquete", "statistique", "suivi"], special: "chiffre" },
    { id: "qui_quand", label: "le bon moment et les bons utilisateurs", manque: "Auprès de qui et après combien de temps d'usage ?", poids: 25, mots: ["utilisateurs", "clients", "apres", "mois", "semaines", "premiers", "cohorte", "testeurs", "beta", "pilote"], special: "cible" },
  ],
  banque: [
    { id: "payeur", label: "qui paie", manque: "Qui paie ? Ce n'est pas toujours l'utilisateur (employeur, mairie, annonceur…).", poids: 30, mots: ["paie", "payer", "paye", "achete", "finance", "client", "entreprise", "drh", "employeur", "mairie", "parents", "abonne", "utilisateur", "annonceur", "marque", "assureur", "mutuelle", "etat", "collectivit", "ecole"], special: "cible" },
    { id: "prix", label: "un prix et une forme de revenu", manque: "Combien et sous quelle forme : abonnement, licence, commission, prix unitaire ?", poids: 30, mots: ["€", "euro", "prix", "par mois", "par an", "abonnement", "licence", "commission", "freemium", "par utilisateur", "par salarie", "forfait", "tarif", "par box", "par commande", "par vente", "a l unite", "premium"], special: "chiffre" },
    { id: "couts", label: "les coûts et la rentabilité", manque: "Quels sont vos coûts principaux, et le modèle les couvre-t-il ?", poids: 25, mots: ["cout", "marge", "depense", "serveur", "equipe", "salaire", "rentab", "couvre", "benefice", "achat", "fabrication", "livraison", "acquisition", "charges", "frais", "hebergement", "stock"] },
  ],
  place_lancement: [
    { id: "canal", label: "un ou deux canaux précis", manque: "Par quel canal atteindre votre cible : LinkedIn, salon, partenaire, terrain… ?", poids: 30, mots: ["linkedin", "salon", "evenement", "demo", "bouche", "partenari", "partenaire", "reseau", "email", "mail", "communaute", "ambassadeur", "agence", "terrain", "porte a porte", "appel", "telephon", "webinar", "instagram", "tiktok", "newsletter", "prescripteur", "association", "ecole", "mairie", "rencontre", "meetup", "conference"] },
    { id: "segment", label: "un segment de départ", manque: "Commencez petit : quel segment ou quelle zone en premier ?", poids: 30, mots: ["premiers", "d abord", "commencer", "commence", "pilote", "segment", "ville", "100", "region", "quartier", "beta", "early", "niche", "en premier", "lyon", "paris", "bordeaux", "lille", "nantes", "toulouse", "marseille"], special: "cible" },
    { id: "action", label: "une action ou une offre concrète", manque: "Quelle action concrète ou quelle offre de lancement ?", poids: 25, mots: ["offre", "gratuit", "essai", "remise", "demo", "rendez vous", "rencontr", "presente", "parrain", "message", "atelier", "invit", "contact", "appel", "propos", "pilote"] },
  ],
};

/* Pièges : la réponse est plafonnée (au mieux « à retravailler »). */
export const PIEGES: Record<string, { mots: string[]; message: string }[]> = {
  tour_vision: [{ mots: ["chiffre d affaires", "gagner de l argent", "leader du marche", "numero 1", "licorne", "millions d euros", "etre rentable"], message: "Une vision n'est pas un objectif financier : décrivez le monde que vous changez." }, { mots: ["fonctionnalite", "bouton", "un chatbot", "une appli qui"], message: "Attention, vous décrivez des fonctionnalités, pas un futur." }],
  cafe_utilisateurs: [{ mots: ["tout le monde", "n importe qui", "toute la population", "tous les gens", "tous les francais"], message: "« Tout le monde » n'est pas une cible : choisissez une personne précise." }],
  atelier_valeur: [],
  observatoire: [{ mots: ["pas de concurrent", "aucun concurrent", "personne ne fait", "pas de concurrence", "aucune concurrence"], message: "« Aucun concurrent » est toujours faux : au minimum, vos utilisateurs bricolent une solution." }],
  garage_mvp: [{ mots: ["toutes les fonctionnalites", "application complete", "tout le produit", "version complete", "produit fini"], message: "Un MVP n'est pas le produit complet : visez l'apprentissage, pas la perfection." }],
  salle_des_choix: [{ mots: ["tout est important", "tout est must", "tout est prioritaire", "on fait tout", "tout en must"], message: "Si tout est prioritaire, rien ne l'est." }],
  salle_des_cartes: [{ mots: ["tout en meme temps", "tout livrer", "tout des le debut"], message: "Une roadmap qui livre tout tout de suite n'est pas une roadmap." }],
  tableau_de_bord: [{ mots: ["telechargement", "likes", "followers", "abonnes instagram", "nombre de visites", "vues"], message: "C'est un indicateur de vanité : il flatte mais ne prouve pas la valeur." }],
  marche: [{ mots: ["s ils aiment l idee", "mes amis", "ma famille", "on le sent", "ils adorent l idee", "les gens aiment"], message: "L'enthousiasme de vos proches n'est pas un signal de marché." }],
  banque: [{ mots: ["on verra", "gratuit pour toujours", "on trouvera", "plus tard on verra"], message: "« On verra plus tard » n'est pas un business model." }],
  place_lancement: [{ mots: ["se vendra tout seul", "pub tele", "publicite tele", "campagne nationale", "tout le monde"], message: "Pas de campagne grand public au départ : un segment précis, un canal précis." }],
};

/* Fil rouge : quels lieux précédents doivent se retrouver dans la réponse. */
export const FIL_ROUGE: Record<string, { sources: string[]; quoi: string }> = {
  atelier_valeur: { sources: ["cafe_utilisateurs"], quoi: "votre cible et son problème" },
  observatoire: { sources: ["cafe_utilisateurs", "atelier_valeur"], quoi: "votre cible ou votre promesse" },
  garage_mvp: { sources: ["cafe_utilisateurs", "atelier_valeur"], quoi: "le problème ou la promesse à tester" },
  salle_des_choix: { sources: ["garage_mvp", "atelier_valeur"], quoi: "votre MVP ou votre promesse" },
  salle_des_cartes: { sources: ["garage_mvp", "salle_des_choix"], quoi: "votre MVP et vos « Must »" },
  tableau_de_bord: { sources: ["atelier_valeur", "tour_vision", "garage_mvp"], quoi: "la valeur promise" },
  marche: { sources: ["tableau_de_bord", "cafe_utilisateurs"], quoi: "votre indicateur ou votre cible" },
  banque: { sources: ["cafe_utilisateurs", "atelier_valeur"], quoi: "votre cible" },
  place_lancement: { sources: ["cafe_utilisateurs", "banque"], quoi: "votre cible ou votre payeur" },
};

/* ---------- Événements surprise (banque construite à l'avance, tirage selon le jeu du duo) ---------- */
export type CtxEvt = {
  type: string;
  valides: string[];
  note: (lieuId: string) => number | null; // dernière note /100, null si jamais évalué
  reponse: (lieuId: string) => string;
  nbValides: number;
};
export type ChoixEvt = { label: string; effet: number; retour: string; revisite?: string; bon: boolean };
export type Evenement = { id: string; titre: string; texte: string; specifique: boolean; cond: (c: CtxEvt) => boolean; choix: ChoixEvt[] };

const has = (c: CtxEvt, id: string) => c.valides.includes(id);
const faible = (c: CtxEvt, id: string) => { const n = c.note(id); return n !== null && n < 60; };

export const EVENEMENTS: Evenement[] = [
  {
    id: "testeurs_sans_probleme", specifique: true, titre: "Vos testeurs haussent les épaules",
    texte: "Vos 10 premiers testeurs de {produit} sont polis… mais aucun ne semble avoir vraiment le problème que vous pensiez résoudre.",
    cond: (c) => has(c, "cafe_utilisateurs") && (faible(c, "cafe_utilisateurs") || has(c, "garage_mvp")),
    choix: [
      { label: "On retourne interviewer 5 utilisateurs avant d'aller plus loin", effet: 40000, bon: true, revisite: "cafe_utilisateurs", retour: "Bon réflexe : revenir au problème coûte moins cher que construire pour personne. Retournez au Café pour affiner votre cible : bonus si vous la précisez !" },
      { label: "On ajoute des fonctionnalités pour les convaincre", effet: -50000, bon: false, retour: "Aïe : plus de fonctionnalités ne créent pas un problème qui n'existe pas. C'est le piège classique de la « feature factory »." },
      { label: "On change de cible sans vérifier", effet: -20000, bon: false, retour: "Changer de cible peut être juste, mais sans nouvelle vérification, vous pariez à l'aveugle." },
    ],
  },
  {
    id: "concurrent_leve", specifique: true, titre: "Un concurrent lève 10 M€",
    texte: "Les Échos l'annoncent : un concurrent de {produit} vient de lever 10 millions d'euros et promet de « tout faire ».",
    cond: (c) => has(c, "observatoire"),
    choix: [
      { label: "On copie leurs fonctionnalités au plus vite", effet: -40000, bon: false, retour: "Courir derrière un concurrent mieux financé, c'est perdu d'avance. Votre force, c'est votre différence." },
      { label: "On creuse notre différence pour notre cible", effet: 50000, bon: true, revisite: "observatoire", retour: "Exactement : un concurrent qui « fait tout » laisse de la place à celui qui fait mieux une chose précise. Repassez à l'Observatoire pour aiguiser votre différence !" },
      { label: "On divise nos prix par deux", effet: -20000, bon: false, retour: "Une guerre des prix contre plus riche que vous épuise votre trésorerie avant la leur." },
    ],
  },
  {
    id: "budget_coupe", specifique: true, titre: "Budget coupé de 30 %",
    texte: "Votre business angel réduit son ticket : il vous manque 30 % du budget prévu pour {produit}.",
    cond: (c) => has(c, "garage_mvp") || has(c, "salle_des_choix"),
    choix: [
      { label: "On ne garde que les « Must » et on décale le reste", effet: 50000, bon: true, revisite: "salle_des_choix", retour: "Bravo : la contrainte est la meilleure amie de la priorisation. Passez à la Salle des choix vérifier que vos « Must » tiennent dans le nouveau budget." },
      { label: "On garde tout, on livrera en retard", effet: -40000, bon: false, retour: "Livrer tout en retard, c'est apprendre trop tard. Les investisseurs détestent ça." },
      { label: "On cherche une levée de fonds en urgence", effet: -10000, bon: false, retour: "Lever en urgence, sans preuve, c'est négocier en position de faiblesse." },
    ],
  },
  {
    id: "grand_compte", specifique: true, titre: "Un grand compte veut du sur-mesure",
    texte: "Un grand groupe veut acheter {produit}… à condition d'ajouter 15 fonctionnalités spécifiques à ses process.",
    cond: (c) => (c.type === "Plateforme" || c.type === "Application" || c.type === "Service") && (has(c, "salle_des_cartes") || has(c, "banque") || has(c, "salle_des_choix")),
    choix: [
      { label: "On accepte tout : c'est un gros chèque", effet: -40000, bon: false, retour: "Vous voilà ESN de ce client : votre roadmap ne vous appartient plus." },
      { label: "On accepte seulement ce qui sert notre vision et nos autres clients", effet: 50000, bon: true, revisite: "salle_des_cartes", retour: "C'est la bonne posture produit : chaque demande est filtrée par la vision. Mettez à jour votre roadmap à la Salle des cartes !" },
      { label: "On refuse poliment", effet: 10000, bon: false, retour: "Prudent, mais vous ratez peut-être un vrai signal : écoutez le besoin derrière la demande." },
    ],
  },
  {
    id: "fournisseur", specifique: true, titre: "Votre fournisseur double ses délais",
    texte: "Le fabricant de {produit} annonce 4 mois de retard sur les premiers exemplaires.",
    cond: (c) => c.type === "Objet",
    choix: [
      { label: "On teste sans l'objet : précommandes et prototype maison", effet: 50000, bon: true, revisite: "garage_mvp", retour: "Excellent : on peut valider la demande sans l'objet final. Repassez au Garage pour ajuster votre MVP !" },
      { label: "On attend tranquillement", effet: -40000, bon: false, retour: "Attendre, c'est 4 mois sans rien apprendre." },
      { label: "On change de fournisseur, même deux fois plus cher", effet: -15000, bon: false, retour: "Possible, mais vous brûlez votre marge avant même d'avoir prouvé la demande." },
    ],
  },
  {
    id: "bug_demo", specifique: true, titre: "Bug géant en pleine démo",
    texte: "En pleine démo devant 30 prospects, {produit} plante. Les captures circulent déjà sur LinkedIn.",
    cond: (c) => c.type === "Application" || c.type === "Plateforme",
    choix: [
      { label: "On explique, on corrige et on mesure l'impact sur l'usage", effet: 40000, bon: true, revisite: "tableau_de_bord", retour: "Transparence et mesure : regardez si l'usage réel baisse, pas seulement le bruit. Le Tableau de bord vous dira la vérité !" },
      { label: "On fait comme si de rien n'était", effet: -30000, bon: false, retour: "Le silence alimente la rumeur. Vos premiers clients veulent sentir qu'on les écoute." },
      { label: "On gèle toutes les nouveautés pendant 3 mois", effet: -15000, bon: false, retour: "Trop radical : stabiliser oui, s'arrêter d'apprendre non." },
    ],
  },
  {
    id: "talent_part", specifique: true, titre: "Votre meilleure intervenante démissionne",
    texte: "Sophie, qui assure la moitié des prestations de {produit}, part chez un concurrent.",
    cond: (c) => c.type === "Service",
    choix: [
      { label: "On documente et on standardise le service", effet: 45000, bon: true, retour: "Bien vu : un service qui dépend d'une seule personne n'est pas un produit. Standardiser, c'est pouvoir passer à l'échelle." },
      { label: "On la remplace au plus vite par n'importe qui", effet: -30000, bon: false, retour: "La qualité va chuter et vos premiers clients le verront." },
      { label: "On réduit le nombre de clients servis", effet: -10000, bon: false, retour: "Ça limite la casse, mais vous reculez sans régler le problème de fond." },
    ],
  },
  {
    id: "poule_oeuf", specifique: true, titre: "La plateforme est vide",
    texte: "{produit} est en ligne… mais côté offre, il n'y a presque personne. Côté demande, les visiteurs repartent aussitôt.",
    cond: (c) => c.type === "Plateforme",
    choix: [
      { label: "On amorce un côté à la main sur une zone précise", effet: 50000, bon: true, revisite: "place_lancement", retour: "C'est la méthode des grandes plateformes : remplir un côté à la main, sur un petit périmètre. Repassez par la Place du lancement !" },
      { label: "On lance une grosse campagne pour attirer tout le monde", effet: -40000, bon: false, retour: "Attirer des visiteurs sur une plateforme vide, c'est les perdre pour toujours." },
      { label: "On attend que le bouche-à-oreille fasse effet", effet: -20000, bon: false, retour: "Le bouche-à-oreille ne démarre pas sur du vide." },
    ],
  },
  {
    id: "vanite", specifique: true, titre: "Les inscriptions explosent… et après ?",
    texte: "5 000 inscriptions sur {produit} en une semaine ! Mais seuls 3 % reviennent la semaine suivante.",
    cond: (c) => has(c, "tableau_de_bord") || has(c, "marche"),
    choix: [
      { label: "On fête ça et on communique sur les 5 000 inscrits", effet: -40000, bon: false, retour: "C'est un indicateur de vanité : 97 % de vos inscrits sont déjà partis." },
      { label: "On creuse pourquoi 97 % ne reviennent pas", effet: 50000, bon: true, revisite: "marche", retour: "Oui ! La rétention dit la vérité. Repassez au Marché pour revoir votre signal de product-market fit." },
      { label: "On achète de la pub pour doubler les inscriptions", effet: -30000, bon: false, retour: "Remplir un seau percé ne règle pas la fuite." },
    ],
  },
  {
    id: "sean_ellis", specifique: true, titre: "Sondage : 22 % « très déçus »",
    texte: "Vous avez posé la question de Sean Ellis : seulement 22 % des utilisateurs de {produit} seraient très déçus sans lui. Le seuil, c'est 40 %.",
    cond: (c) => has(c, "marche"),
    choix: [
      { label: "On étudie les 22 % et on resserre la cible sur eux", effet: 55000, bon: true, revisite: "cafe_utilisateurs", retour: "C'est exactement la méthode de Superhuman : partir de ceux qui adorent pour redéfinir la cible. Retournez au Café préciser votre persona !" },
      { label: "On lance le marketing quand même", effet: -45000, bon: false, retour: "Accélérer avant le product-market fit, c'est brûler votre argent." },
      { label: "On pivote complètement", effet: -15000, bon: false, retour: "Un peu tôt : 22 %, c'est un début de signal, pas un échec." },
    ],
  },
  {
    id: "influenceur", specifique: false, titre: "Un influenceur parle de vous",
    texte: "Un influenceur avec 800 000 abonnés vient de citer {produit}. Votre boîte mail déborde.",
    cond: (c) => c.nbValides >= 4,
    choix: [
      { label: "On ouvre à tout le monde tout de suite", effet: -30000, bon: false, retour: "Votre produit n'est pas prêt pour tout le monde : vous risquez de décevoir en masse." },
      { label: "On crée une liste d'attente et on sélectionne notre cible", effet: 45000, bon: true, retour: "Malin : vous transformez le buzz en signal mesurable, sans perdre votre focus." },
      { label: "On ignore, ce n'est pas notre cible", effet: 0, bon: false, retour: "Prudent, mais une liste d'attente vous aurait offert des données gratuites." },
    ],
  },
  {
    id: "investisseur_modele", specifique: false, titre: "Un investisseur vous appelle",
    texte: "Une investisseuse veut un appel demain sur {produit}. Sa première question : « Qui paie, et pourquoi ? »",
    cond: (c) => c.nbValides >= 5 && !has(c, "banque"),
    choix: [
      { label: "On improvise un chiffre ambitieux", effet: -35000, bon: false, retour: "Les investisseurs détectent l'improvisation en 30 secondes." },
      { label: "On présente 2 hypothèses de prix et comment on va les tester", effet: 50000, bon: true, retour: "Parfait : à ce stade, une hypothèse claire et un plan de test valent mieux qu'une certitude inventée. La Banque vous attend !" },
      { label: "On repousse l'appel de 3 mois", effet: -10000, bon: false, retour: "Elle aura peut-être trouvé une autre start-up d'ici là." },
    ],
  },
];


