/* Référentiel des lieux pour la route /api/max.
   Généré depuis supabase/functions/_shared/jeu (data.ts + strategie.ts). Le préfixe « _ » empêche Vercel d'en faire une route.
   Si vous modifiez une question ou un critère dans le jeu, régénérez ce fichier. */
export const LIEUX = {
  "tour_vision": {
    "nom": "La Tour de la Vision",
    "concept": "Vision produit",
    "question": "Dans 5 ans, quel changement {produit} aura-t-il apporté à la vie de vos utilisateurs ?",
    "explication": "La vision fixe le cap à 2-5 ans ; la stratégie dit comment l'atteindre (Marty Cagan, SVPG).",
    "conseil": "Gardez une phrase courte, qui donne envie, et que toute l'équipe peut répéter.",
    "piste": "Essayez : « Dans 5 ans, [cible] ne [problème] plus jamais, grâce à [produit]. »",
    "indice": "Une vision décrit le monde que vous voulez créer pour vos utilisateurs, pas vos fonctionnalités ni votre chiffre d'affaires.",
    "criteres": [
      {
        "label": "un horizon de temps",
        "poids": 20,
        "manque": "Situez votre vision dans le futur (dans 3 à 5 ans, à terme…)."
      },
      {
        "label": "un bénéficiaire précis",
        "poids": 25,
        "manque": "Pour qui le monde change-t-il ? Nommez un bénéficiaire."
      },
      {
        "label": "un changement concret",
        "poids": 25,
        "manque": "Décrivez ce qui sera différent pour eux, pas ce que fait l'outil."
      },
      {
        "label": "une ambition qui donne du sens",
        "poids": 15,
        "manque": "Rendez-la inspirante : quel impact sur leur vie ou leur travail ?"
      }
    ],
    "pieges": [
      "Une vision n'est pas un objectif financier : décrivez le monde que vous changez.",
      "Attention, vous décrivez des fonctionnalités, pas un futur."
    ],
    "fil_rouge": null
  },
  "cafe_utilisateurs": {
    "nom": "Le Café des utilisateurs",
    "concept": "Persona et problème",
    "question": "Qui est l'utilisateur principal de {produit}, et quel problème vit-il aujourd'hui ?",
    "explication": "Les clients « embauchent » un produit pour accomplir une tâche (Jobs To Be Done, Christensen).",
    "conseil": "Allez parler à 5 vrais utilisateurs : un problème vérifié vaut plus qu'une intuition.",
    "piste": "Formule : « [Rôle précis] qui [situation] perd [temps/argent/énergie] parce que [cause]. »",
    "indice": "Soyez précis : qui exactement (rôle, contexte) et quelle douleur concrète vit-il, avant même votre produit ?",
    "criteres": [
      {
        "label": "un utilisateur précis",
        "poids": 30,
        "manque": "Décrivez une personne précise (métier, âge, situation), pas « tout le monde »."
      },
      {
        "label": "un problème vécu",
        "poids": 30,
        "manque": "Quel problème vit-elle aujourd'hui ? Ce qui l'agace, lui coûte ou lui fait perdre du temps."
      },
      {
        "label": "une situation concrète",
        "poids": 25,
        "manque": "Dans quelle situation le problème apparaît-il, et comment le savez-vous (entretiens, observation) ?"
      }
    ],
    "pieges": [
      "« Tout le monde » n'est pas une cible : choisissez une personne précise."
    ],
    "fil_rouge": null
  },
  "atelier_valeur": {
    "nom": "L'Atelier de la valeur",
    "concept": "Proposition de valeur",
    "question": "Pourquoi votre utilisateur choisirait-il {produit} plutôt que de continuer comme aujourd'hui ?",
    "explication": "La proposition de valeur relie les douleurs et gains du client à ce que vous offrez (Strategyzer).",
    "conseil": "Un bénéfice chiffré (« 15 minutes au lieu de 2 jours ») est bien plus convaincant.",
    "piste": "Formule : « Avec [produit], [cible] obtient [bénéfice] au lieu de [situation actuelle]. »",
    "indice": "Parlez du bénéfice pour l'utilisateur, relié à sa douleur, et comparez avec ce qu'il fait aujourd'hui.",
    "criteres": [
      {
        "label": "une comparaison avec l'existant",
        "poids": 25,
        "manque": "Comparez avec ce qu'elle fait aujourd'hui : « au lieu de… », « plus besoin de… »."
      },
      {
        "label": "un bénéfice concret",
        "poids": 35,
        "manque": "Quel gain concret : du temps, de l'argent, de la tranquillité ?"
      },
      {
        "label": "un lien avec le problème",
        "poids": 25,
        "manque": "Expliquez pourquoi ce bénéfice règle SON problème (« grâce à… », « ce qui… »)."
      }
    ],
    "pieges": [],
    "fil_rouge": {
      "sources": [
        "cafe_utilisateurs"
      ],
      "quoi": "votre cible et son problème"
    }
  },
  "observatoire": {
    "nom": "L'Observatoire",
    "concept": "Concurrence",
    "question": "Qui ou quoi résout déjà ce problème aujourd'hui, et qu'est-ce qui différencie {produit} ?",
    "explication": "On se positionne face aux alternatives réelles du client (April Dunford, Obviously Awesome).",
    "conseil": "Listez ce que vos utilisateurs feraient si votre produit n'existait pas : ce sont vos vrais concurrents.",
    "piste": "Formule : « Aujourd'hui ils utilisent [alternative] ; nous seuls [différence qui compte pour eux]. »",
    "indice": "Il y a toujours une alternative, même « faire à la main » ou « ne rien faire ». Et votre différence doit compter pour la cible.",
    "criteres": [
      {
        "label": "des alternatives identifiées",
        "poids": 30,
        "manque": "Citez qui ou quoi résout déjà le problème, même un tableur, un prestataire ou « ne rien faire »."
      },
      {
        "label": "votre différence",
        "poids": 30,
        "manque": "En quoi êtes-vous différent ou meilleur qu'eux ?"
      },
      {
        "label": "une différence qui compte pour la cible",
        "poids": 25,
        "manque": "Reliez votre différence à ce qui compte pour votre cible."
      }
    ],
    "pieges": [
      "« Aucun concurrent » est toujours faux : au minimum, vos utilisateurs bricolent une solution."
    ],
    "fil_rouge": {
      "sources": [
        "cafe_utilisateurs",
        "atelier_valeur"
      ],
      "quoi": "votre cible ou votre promesse"
    }
  },
  "garage_mvp": {
    "nom": "Le Garage",
    "concept": "MVP",
    "question": "Quelle est la plus petite version de {produit} qui permet de tester votre idée ?",
    "explication": "Le MVP maximise l'apprentissage validé avec un minimum d'effort (Eric Ries).",
    "conseil": "Le meilleur MVP est parfois sans code : un formulaire, un tableur ou un service fait à la main.",
    "piste": "Formule : « On teste [hypothèse] avec [version minimale] auprès de [N] personnes ; succès si [critère]. »",
    "indice": "Un MVP sert à apprendre vite : quelle hypothèse testez-vous, avec quoi de minimal, et comment saurez-vous si c'est réussi ?",
    "criteres": [
      {
        "label": "une hypothèse à tester",
        "poids": 25,
        "manque": "Que voulez-vous apprendre ? Formulez l'hypothèse à vérifier."
      },
      {
        "label": "une version vraiment minimale",
        "poids": 30,
        "manque": "Quelle est la plus petite version possible ? Un formulaire, une maquette, un service fait à la main…"
      },
      {
        "label": "un critère de succès",
        "poids": 30,
        "manque": "Comment saurez-vous que c'est réussi ? Un seuil, un chiffre, un comportement observé."
      }
    ],
    "pieges": [
      "Un MVP n'est pas le produit complet : visez l'apprentissage, pas la perfection."
    ],
    "fil_rouge": {
      "sources": [
        "cafe_utilisateurs",
        "atelier_valeur"
      ],
      "quoi": "le problème ou la promesse à tester"
    }
  },
  "salle_des_choix": {
    "nom": "La Salle des choix",
    "concept": "Priorisation",
    "question": "Parmi vos idées de fonctionnalités pour {produit}, lesquelles sont « Must have », et lesquelles mettez-vous de côté ?",
    "explication": "MoSCoW (Must, Should, Could, Won't) ou RICE (Reach x Impact x Confiance / Effort) aident à choisir.",
    "conseil": "Pas plus de 60 % de l'effort en « Must have », conseille la méthode DSDM.",
    "piste": "Formule : « Must : [1 ou 2 éléments], car [lien au problème]. Won't pour l'instant : [éléments]. »",
    "indice": "Prioriser, c'est renoncer : gardez peu de « Must », justifiez-les et assumez ce que vous ne faites pas.",
    "criteres": [
      {
        "label": "des « Must » clairs",
        "poids": 30,
        "manque": "Dites ce qui est indispensable maintenant."
      },
      {
        "label": "des renoncements assumés",
        "poids": 30,
        "manque": "Prioriser, c'est renoncer : qu'est-ce que vous ne faites PAS maintenant ?"
      },
      {
        "label": "une justification",
        "poids": 25,
        "manque": "Justifiez vos choix : impact pour l'utilisateur, effort, lien avec le problème."
      }
    ],
    "pieges": [
      "Si tout est prioritaire, rien ne l'est."
    ],
    "fil_rouge": {
      "sources": [
        "garage_mvp",
        "atelier_valeur"
      ],
      "quoi": "votre MVP ou votre promesse"
    }
  },
  "salle_des_cartes": {
    "nom": "La Salle des cartes",
    "concept": "Roadmap",
    "question": "Que livrez-vous pour {produit} dans 3 mois, 6 mois et 1 an ?",
    "explication": "Le format Now / Next / Later reste flexible et orienté résultats (Product School, Melissa Perri).",
    "conseil": "Formulez chaque étape en résultat attendu plutôt qu'en liste de fonctionnalités.",
    "piste": "Formule : « 3 mois : [valider le MVP]. 6 mois : [étendre]. 1 an : [passer à l'échelle]. »",
    "indice": "Une roadmap raconte une progression : une étape claire maintenant, puis ensuite, puis plus tard, reliée à vos priorités.",
    "criteres": [
      {
        "label": "une étape « maintenant »",
        "poids": 25,
        "manque": "Que livrez-vous dans les 3 prochains mois ?"
      },
      {
        "label": "une étape « ensuite »",
        "poids": 20,
        "manque": "Et à 6 mois ?"
      },
      {
        "label": "une étape « plus tard »",
        "poids": 20,
        "manque": "Et dans un an ?"
      },
      {
        "label": "des étapes en résultats",
        "poids": 20,
        "manque": "Formulez au moins une étape comme un résultat attendu (valider, atteindre, convaincre…)."
      }
    ],
    "pieges": [
      "Une roadmap qui livre tout tout de suite n'est pas une roadmap."
    ],
    "fil_rouge": {
      "sources": [
        "garage_mvp",
        "salle_des_choix"
      ],
      "quoi": "votre MVP et vos « Must »"
    }
  },
  "tableau_de_bord": {
    "nom": "Le Tableau de bord",
    "concept": "OKR et KPI",
    "question": "Quel indicateur prouvera que {produit} fonctionne vraiment ?",
    "explication": "Un OKR = un Objectif inspirant + des Résultats clés mesurables (John Doerr, Measure What Matters).",
    "conseil": "Méfiez-vous des indicateurs de vanité (téléchargements, likes) : regardez l'usage réel.",
    "piste": "Formule : « [X] % de [cible] font [action de valeur] d'ici [date]. »",
    "indice": "Un bon indicateur se mesure, a une cible chiffrée et une échéance, et reflète la valeur pour l'utilisateur.",
    "criteres": [
      {
        "label": "un indicateur mesurable",
        "poids": 30,
        "manque": "Choisissez un indicateur qu'on peut compter : un taux, un temps, un nombre."
      },
      {
        "label": "une cible chiffrée",
        "poids": 25,
        "manque": "Donnez une cible chiffrée (40 %, 3 jours, 200 utilisateurs…)."
      },
      {
        "label": "une échéance",
        "poids": 15,
        "manque": "Quand ? Ajoutez une échéance (d'ici 6 mois, par mois…)."
      },
      {
        "label": "un reflet de la valeur pour l'utilisateur",
        "poids": 15,
        "manque": "Votre indicateur doit refléter l'usage réel ou la valeur pour l'utilisateur."
      }
    ],
    "pieges": [
      "C'est un indicateur de vanité : il flatte mais ne prouve pas la valeur."
    ],
    "fil_rouge": {
      "sources": [
        "atelier_valeur",
        "tour_vision",
        "garage_mvp"
      ],
      "quoi": "la valeur promise"
    }
  },
  "marche": {
    "nom": "Le Marché",
    "concept": "Product-market fit",
    "question": "Comment saurez-vous que le marché veut vraiment {produit} ?",
    "explication": "Le product-market fit, c'est un bon marché avec un produit qui le satisfait vraiment.",
    "conseil": "Le test de Sean Ellis : si 40 % des utilisateurs seraient « très déçus » sans votre produit, c'est bon signe.",
    "piste": "Formule : « Après [durée], on demande : seriez-vous très déçu sans [produit] ? Objectif : 40 %. »",
    "indice": "L'enthousiasme ne suffit pas : cherchez un signal mesurable d'utilisateurs qui ne veulent plus s'en passer.",
    "criteres": [
      {
        "label": "un signal fort d'attachement",
        "poids": 35,
        "manque": "Cherchez un signal que les utilisateurs ne veulent plus s'en passer : ils reviennent, paient, recommandent."
      },
      {
        "label": "une mesure",
        "poids": 25,
        "manque": "Comment le mesurez-vous ? Un taux, un sondage, une question précise."
      },
      {
        "label": "le bon moment et les bons utilisateurs",
        "poids": 25,
        "manque": "Auprès de qui et après combien de temps d'usage ?"
      }
    ],
    "pieges": [
      "L'enthousiasme de vos proches n'est pas un signal de marché."
    ],
    "fil_rouge": {
      "sources": [
        "tableau_de_bord",
        "cafe_utilisateurs"
      ],
      "quoi": "votre indicateur ou votre cible"
    }
  },
  "banque": {
    "nom": "La Banque",
    "concept": "Business model",
    "question": "Qui paie pour {produit}, combien, et comment gagnez-vous de l'argent ?",
    "explication": "Le business model décrit comment on crée, délivre et capte la valeur (Business Model Canvas, Strategyzer).",
    "conseil": "Pensez aux coûts principaux : un modèle rentable gagne plus qu'il ne dépense.",
    "piste": "Formule : « [Payeur] paie [prix] par [unité] ; nos coûts principaux sont [coûts]. »",
    "indice": "Précisez qui paie (pas forcément l'utilisateur), combien et sous quelle forme.",
    "criteres": [
      {
        "label": "qui paie",
        "poids": 30,
        "manque": "Qui paie ? Ce n'est pas toujours l'utilisateur (employeur, mairie, annonceur…)."
      },
      {
        "label": "un prix et une forme de revenu",
        "poids": 30,
        "manque": "Combien et sous quelle forme : abonnement, licence, commission, prix unitaire ?"
      },
      {
        "label": "les coûts et la rentabilité",
        "poids": 25,
        "manque": "Quels sont vos coûts principaux, et le modèle les couvre-t-il ?"
      }
    ],
    "pieges": [
      "« On verra plus tard » n'est pas un business model."
    ],
    "fil_rouge": {
      "sources": [
        "cafe_utilisateurs",
        "atelier_valeur"
      ],
      "quoi": "votre cible"
    }
  },
  "place_lancement": {
    "nom": "La Place du lancement",
    "concept": "Go-to-market",
    "question": "Comment allez-vous trouver les 100 premiers clients de {produit} ?",
    "explication": "Le go-to-market définit comment atteindre et convaincre vos premiers clients (Lenny Rachitsky, Crossing the Chasm).",
    "conseil": "Au début, faites des choses qui « ne passent pas à l'échelle » : démos une par une, appels, rencontres.",
    "piste": "Formule : « On démarre avec [segment], via [canal], en proposant [offre pilote]. »",
    "indice": "Commencez petit : un segment précis, un ou deux canaux où se trouve votre cible, et une action concrète.",
    "criteres": [
      {
        "label": "un ou deux canaux précis",
        "poids": 30,
        "manque": "Par quel canal atteindre votre cible : LinkedIn, salon, partenaire, terrain… ?"
      },
      {
        "label": "un segment de départ",
        "poids": 30,
        "manque": "Commencez petit : quel segment ou quelle zone en premier ?"
      },
      {
        "label": "une action ou une offre concrète",
        "poids": 25,
        "manque": "Quelle action concrète ou quelle offre de lancement ?"
      }
    ],
    "pieges": [
      "Pas de campagne grand public au départ : un segment précis, un canal précis."
    ],
    "fil_rouge": {
      "sources": [
        "cafe_utilisateurs",
        "banque"
      ],
      "quoi": "votre cible ou votre payeur"
    }
  }
};
