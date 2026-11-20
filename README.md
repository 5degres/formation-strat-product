# Start-up Quest · Mode multijoueur

Implémentation du **PRD Multijoueur v0.1**, première livraison : prototype technique (PRD §19) branché sur les vrais lieux et le vrai moteur d'évaluation de Start-up Quest v3.

- **Front** : React + Vite, hébergé sur GitHub Pages.
- **Back** : Supabase (Postgres + une Edge Function), source de vérité unique de la partie.

## Ce qui est couvert

| Bloc PRD | Couvert |
|---|---|
| Salons séparés | Chaque salon a son code (6 caractères) et son code admin (10 caractères). Plusieurs formations peuvent tourner en parallèle sans se voir. |
| Accès sécurisé | Seuls les détenteurs du **code organisateur** 5 Degrés peuvent créer un salon. Les équipes entrent avec le code salon, l'animateur avec le code admin. |
| Lobby (F-MP-01 à 09) | Création d'entreprise, prénoms, produit, objectif, statut « prête », modification avant lancement, refus des noms en double, salon complet, lien d'invitation `?salon=CODE`. |
| Lancement synchronisé (F-MP-10 à 14) | Même heure de fin serveur pour toutes les équipes, lancement idempotent, reprise après rechargement (jeton conservé dans le navigateur). |
| Valorisation et scoring (F-MP-15 à 19) | Calcul **côté serveur uniquement** avec `evaluerV3` (moteur de Max identique à la v3). Barème de la v3 : +150 k€ / +75 k€, coefficients 1 / 0,6 / 0,3 selon la tentative, malus de 5 %, 3 tentatives maximum. |
| Classement et carte (F-MP-20 à 25) | Rang de l'équipe + top 3 pendant le jeu, classement complet après la fin. Position des autres équipes sur la carte, sans leur valorisation ni leurs réponses. Indicateur de synchronisation. |
| Supervision animateur (F-MP-26 à 34) | Statut, connexion, position, lieux validés, valorisation, dernière réponse, alerte d'inactivité (5 min). Pause / reprise, +5 min, fin de partie confirmée. Historique horodaté avec l'auteur. |
| Fin de partie (F-MP-35) | Verrouillage serveur immédiat (manuel ou au minuteur). Écran de fin bloquant côté équipes, qui persiste au rechargement. |
| Podium et jury (F-MP-36 à 42) | Podium provisoire, bonus jury pour le top 3 (-10 % à +10 %), publication du classement final, valorisations finale et de jeu, égalités officielles. |
| Export (F-MP-43) | Résultats (CSV), réponses et verdicts (CSV), tout (JSON). |
| Robustesse (§9) | Actions idempotentes (`client_action_id` et `action_id`), réponse en attente conservée et renvoyée avec le même identifiant après une coupure réseau, aucun accès direct aux tables, codes et jetons stockés hachés. |

**Règle des réponses en cours (PRD §6.4)** : une réponse n'est comptée que si le serveur la reçoit avant le verrouillage (fin de partie, pause ou minuteur). Une réponse refusée ne consomme pas de tentative.

**Pas encore intégré** (prochaine itération, une fois le prototype validé en conditions réelles) : la carte pixel art animée de la v3, les coups de théâtre, la révision post-événement, la salle des investisseurs dans l'application (le pitch se fait en salle), la vidéo d'intro et le guide Max.

## Mise en place (environ 20 minutes)

### 1. Supabase

1. Créez un projet sur le compte Supabase dédié (région UE, par exemple Paris).
2. **SQL Editor** : collez et exécutez `supabase/migrations/20261120000000_multijoueur.sql`.
3. Toujours dans le SQL Editor, définissez le code organisateur 5 Degrés (10 caractères minimum, à garder en interne) :
   ```sql
   select jeu.definir_code_organisateur('VotreCodeOrganisateurSecret');
   ```
4. Déployez la fonction de scoring avec la CLI Supabase :
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>
   npx supabase functions deploy repondre --no-verify-jwt
   ```
   Optionnel : `npx supabase secrets set ALLOWED_ORIGIN=https://<compte>.github.io` pour restreindre l'appel à votre site.
5. Notez l'**URL du projet** et la **clé anon** (Settings > API).

### 2. GitHub

1. Sur le compte GitHub dédié, créez un dépôt (par exemple `startup-quest`) et poussez-y le contenu de ce dossier.
2. **Settings > Secrets and variables > Actions** : ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. **Settings > Pages** : choisissez « GitHub Actions » comme source.
4. Chaque push sur `main` lance les tests de la base, construit le site et le publie sur `https://<compte>.github.io/startup-quest/`.

### 3. Tester en local

```bash
cp .env.example .env    # puis renseignez les deux valeurs
npm install
npm run test:db         # 21 tests de la base (Postgres embarqué, sans Supabase)
npm run dev
```

## Déroulé d'une session

1. **Créer un salon** (onglet « Créer un salon », code organisateur requis). L'application affiche le code salon et le code admin. Notez le code admin : il n'est affiché qu'une fois.
2. Donnez le code salon (ou le lien `?salon=CODE`) aux équipes, qui créent leur entreprise dans le lobby.
3. L'animateur lance la partie, la supervise, la met en pause si besoin, puis clique sur « Fin de partie » (ou laisse le minuteur la terminer).
4. « Lancer la remise des prix » : le podium provisoire s'affiche, le top 3 pitche, l'animateur saisit les bonus jury puis publie le classement final.
5. Exportez les données pour le débrief.

## Architecture

```
supabase/
  migrations/…multijoueur.sql   schéma privé « jeu », machine d'état, RPC, droits
  functions/repondre/           Edge Function : évaluation + enregistrement atomique
  functions/_shared/jeu/        moteur, lieux et quartiers de la v3 (partagés avec le front)
src/
  Accueil.tsx                   rejoindre / animer / créer un salon
  Equipe.tsx                    lobby, jeu, fin de partie, podium (vue équipe)
  Admin.tsx                     supervision animateur, jury, export
  Carte.tsx, Podium.tsx         carte des quartiers avec pions, podium
  api.ts                        appels RPC, rafraîchissement toutes les 2,5 s, messages d'erreur
tests/db.test.mjs               scénarios du PRD §15 sur la base
```

- **Synchronisation** : chaque écran interroge l'état toutes les 2,5 s (le PRD accepte moins de 5 s). Avec 12 équipes, cela représente environ 5 requêtes par seconde, ce qui tient largement dans l'offre gratuite de Supabase.
- **Minuteur** : l'heure de fin est fixée par le serveur. Chaque client corrige le décalage de son horloge à chaque synchronisation. La fin au minuteur est appliquée par le serveur dès le premier appel qui suit l'échéance, sans tâche planifiée.
- **Machine d'état** : `LOBBY → RUNNING ⇄ PAUSED → FINISHED → AWARDING → PUBLISHED`, plus `CANCELLED`. `ROUVRIR` ramène `FINISHED` ou `AWARDING` à `RUNNING` (et efface les bonus jury). Après la publication, plus rien n'est modifiable.
- **Départage** : valorisation finale, puis valorisation de jeu, puis nombre de lieux validés. Si l'égalité persiste, les équipes ont le même rang (égalité officielle).
