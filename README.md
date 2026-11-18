# Le Village 🏡🦊

Application familiale ludique de gestion des tâches ménagères. Votre foyer devient un petit village de créatures : chaque tâche accomplie (jardin, piscine, lessive, cuisine, courses, rangement) fait vivre sa zone du village, rapporte des noisettes et fait monter le village de niveau, avec des embellissements permanents à débloquer. Coopératif, bienveillant, pour tous les foyers (couple, parent solo, colocation, famille nombreuse) et tous les âges (adultes, ados, petits).

**Production** : https://le-village.boka-reunion.workers.dev

**Statut** : v1 déployée et testée E2E (mobile, tablette, temps réel, hors ligne). Guide d'utilisation : `docs/GUIDE-FAMILLE.md`.

## Fonctionnalités (v1)

- Village SVG animé qui reflète l'état réel de la maison : 7 zones (potager, source, lavoir, grande table, marché, atelier, clairière) avec fraîcheur, ciel à l'heure réelle, 18 embellissements à débloquer
- Distribution automatique et équilibrée des tâches chaque semaine (pondération par pénibilité, rotation des corvées), ajustable par tap
- Écran « Aujourd'hui » : cocher (célébration + noisettes), annuler, reporter, proposer à l'autre, supprimer
- Semaine : déplacer une tâche (jour/personne), modifier, supprimer, ajout rapide, rééquilibrage
- Catégories personnalisables (sport, sorties...) en plus des 6 ménagères, rattachées à une zone du village (clairière par défaut)
- Réglages : CRUD complet des tâches récurrentes (rythme, pénibilité, assignation fixe ou rotation, mission enfant, saison, pause) et des catégories
- Liste de courses partagée temps réel avec suggestions apprises, mode magasin hors ligne
- Mode enfant sans texte avec validation parentale et confettis
- Mode tableau de bord pour tablette murale (opt-in, mémorisé par appareil)
- Récolte de la semaine avec message d'entraide équitable (basé sur le retard réel, jamais avant jeudi) et objectif de famille avec récompense
- Foyer v2 : rôle ado (tâches légères, part réduite), absences et jours chargés, mode vacances, tâches « à prendre » (premier qui la prend), moment de la journée et rappel à heure précise
- Entraide : « merci » 💛 sur les tâches des autres, confier une tâche (avec annulation), échanges de tâches acceptés ou refusés
- Missions en retard regroupées dans « Aujourd'hui », semaine prochaine visible et ajustable dès le dimanche soir, bilan de la semaine
- Mode enfant par enfant, lecture à voix haute, code parent (validation, sortie, récompenses), tirelire de noisettes et récompenses définies par les parents
- Courses : rayons boulangerie, surgelés, bébé, animaux ; terminer les courses coche la tâche « courses »
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
