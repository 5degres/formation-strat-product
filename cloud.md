# Start-up Quest, état de référence

Dernière mise à jour : 20 novembre 2026

## Production

- Application : https://formation-strat-product.vercel.app/
- Dépôt : https://github.com/5degres/formation-strat-product/
- Branche de production : `main`
- Hébergement : Vercel, équipe `practice-product-tls`
- Application : React + Vite

## Services

- Supabase : projet `Village by 5D`
- Référence Supabase : `vpckaoksntzrajzczrbu`
- URL Supabase : `https://vpckaoksntzrajzczrbu.supabase.co`
- Dust : workspace `TKnpzhPefR`
- API Dust : `https://eu.dust.tt`
- Agent Max : `JgO59wusmM`

Aucune clé secrète ne doit être enregistrée dans ce fichier, dans GitHub ou dans le frontend. Les clés Dust et Supabase côté serveur doivent rester dans les variables d'environnement Vercel.

## Architecture

```text
Utilisateur
  -> application React/Vite sur Vercel
  -> routes serveur /api
  -> Supabase pour les salons, équipes, états et résultats
  -> Edge Function Supabase pour l'évaluation et l'enregistrement atomique
```

La Frame `Start-up Quest v3/` conservée dans le Pod reste la référence visuelle et pédagogique. La version de production est celle du présent dépôt.

## Workflow

1. Développer sur une branche dédiée ou une pull request.
2. Tester la preview Vercel.
3. Fusionner dans `main` après validation.
4. Vérifier le déploiement sur l'URL de production.
5. Pour toute modification Supabase, appliquer la migration ou redéployer l'Edge Function séparément.
6. Mettre à jour ce fichier et le `cloud.md` du Pod lors d'un changement d'URL, de dépôt, de branche ou d'architecture.

## Références

- Le `README.md` décrit l'installation, l'architecture et le déroulé du jeu.
- Le Pod Dust contient les PRD, la base de connaissance Mentor, les crédits et les sources graphiques.
- Ne jamais supprimer une migration, une fonction Supabase ou un asset sans vérifier qu'il n'est pas utilisé par la production.
