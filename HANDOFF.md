# HANDOFF : état d'avancement de la session

> Fichier de reprise : si la session est interrompue, lire ce fichier, puis `docs/superpowers/plans/2026-07-18-le-village.md` (le plan, source de vérité des tâches) et `docs/superpowers/specs/2026-07-18-le-village-design.md` (la spec validée par Guillaume).

## Mission

Développer en autonomie « Le Village », PWA familiale gamifiée de gestion des tâches ménagères (couple + fils 3-5 ans), jusqu'à un état utilisable par la famille. Guillaume dort, il a validé la spec et donné carte blanche. Priorités : simplicité d'usage, aspect ludique, visuel parfait.

## Infos clés

- Déploiement : Cloudflare compte boka.reunion@gmail.com (wrangler déjà loggé), Worker `le-village`, URL prod : https://le-village.boka-reunion.workers.dev
- D1 : `village-db`, id `264d7adb-15c1-47d7-8fa3-67377d8bb3e6`
- Repo GitHub : git@github.com:yogeek/home-planner.git (branche main, push régulier demandé)
- Higgsfield AI dispo via Chrome (claude-in-chrome) pour générer des visuels si utile
- Chrome CDP dispo pour les tests E2E
- Timezone famille : Indian/Reunion (UTC+4). Crons UTC : 03:00 (matin 7h), 14:30 (soir 18h30), dim 14:00 (génération semaine)
- Erreurs d'auth Cloudflare transitoires observées : réessayer la commande wrangler suffit
- Syntaxe cron Cloudflare : utiliser `SUN`, pas `0`, pour dimanche
- Consignes utilisateur : tout en français, jamais de tirets cadratins, mettre à jour HANDOFF.md + AGENTS.md + README.md à chaque étape

## Avancement (14 tâches, voir plan)

- [x] Task 1 : Scaffold + pipeline (Vite app/, worker/, wrangler.jsonc, D1 créée, deploy OK, health OK, SPA servie)
- [ ] Task 2 : Schéma D1 + migration + tâches par défaut
- [ ] Task 3 : Domaine récurrence + distribution (TDD)
- [ ] Task 4 : Domaine village/équilibre/suggestions (TDD)
- [ ] Task 5 : API REST
- [ ] Task 6 : DO temps réel
- [ ] Task 7 : Crons + Web Push
- [ ] Task 8 : Fondations frontend
- [ ] Task 9 : Écran Village
- [ ] Task 10 : Aujourd'hui + Semaine
- [ ] Task 11 : Courses + offline
- [ ] Task 12 : Enfant + tablette + Équilibre
- [ ] Task 13 : PWA + push
- [ ] Task 14 : E2E Chrome + deploy final + guide famille + GitHub Actions

## Prochaine étape

Task 2 : écrire `migrations/0001_init.sql` (schéma complet dans le plan), l'appliquer en local et en remote, définir les task_defs par défaut dans `shared/defaults.ts` (seed à l'onboarding).
