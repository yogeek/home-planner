# Le Village 🏡🦊

Application familiale ludique de gestion des tâches ménagères. Votre foyer devient un petit village de créatures : chaque tâche accomplie (jardin, piscine, lessive, cuisine, courses, rangement) fait vivre sa zone du village, rapporte des glands et fait monter le village de niveau, avec des embellissements permanents à débloquer. Coopératif, bienveillant, pensé pour deux adultes et un enfant de 3-5 ans.

**Production** : https://le-village.boka-reunion.workers.dev

**Statut** : v1 déployée et testée E2E (mobile, tablette, temps réel, hors ligne). Guide d'utilisation : `docs/GUIDE-FAMILLE.md`.

## Fonctionnalités (v1)

- Village SVG animé qui reflète l'état réel de la maison (fraîcheur par zone)
- Distribution automatique et équilibrée des tâches chaque semaine, ajustable
- Écran « Aujourd'hui » : cocher, reporter, proposer à l'autre
- Liste de courses partagée temps réel avec suggestions apprises, mode magasin hors ligne
- Mode enfant sans texte avec validation parentale
- Mode tableau de bord pour tablette murale
- Balançoire d'équilibre et statistiques positives
- Rappels doux (résumé matin, rappel soir) en Web Push
- PWA installable, gratuite, sans compte ni mot de passe (token familial)

## Stack

React + Vite (PWA) · Cloudflare Workers + D1 + Durable Objects (WebSocket temps réel) · Vitest (logique métier en TDD).

## Développement

```bash
npm install && cd app && npm install && cd ..
npm test              # tests logique métier
npm run build         # build du frontend
npm run dev           # serveur local (API + app)
npm run deploy        # déploiement Cloudflare
```

Docs : spec dans `docs/superpowers/specs/`, plan dans `docs/superpowers/plans/`, état de session dans `HANDOFF.md`, guide famille dans `docs/GUIDE-FAMILLE.md`. CI/CD : `.github/workflows/deploy.yml` (déploiement auto si le secret `CLOUDFLARE_API_TOKEN` est configuré sur le repo).
