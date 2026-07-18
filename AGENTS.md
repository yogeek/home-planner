# AGENTS.md : instructions pour agents IA

## Projet

« Le Village » : PWA familiale gamifiée de gestion des tâches ménagères. Un village de créatures coopératif où chaque tâche réelle fait vivre une zone du village. Spec validée : `docs/superpowers/specs/2026-07-18-le-village-design.md`. Plan : `docs/superpowers/plans/2026-07-18-le-village.md`. État courant : `HANDOFF.md` (à maintenir à jour à chaque étape).

## Structure

- `app/` : frontend Vite + React 18 + TypeScript (package npm séparé, `cd app && npm install`)
- `worker/` : Cloudflare Worker (API + Durable Object + crons), bundlé par wrangler depuis la racine
- `shared/` : logique métier pure, importée par worker et app, testée avec Vitest
- `migrations/` : migrations SQL D1

## Commandes (racine)

- `npm test` : tests Vitest (shared + worker)
- `npm run typecheck` : tsc worker/shared + app
- `npm run build` : build frontend (app/dist)
- `npm run dev` : wrangler dev (sert app/dist + API, penser à builder avant)
- `npm run deploy` : build + wrangler deploy
- `npm run migrate:local` / `migrate:remote` : migrations D1

## Règles

- Tout le texte UI en français. Jamais de tirets cadratins (--) nulle part.
- Logique métier : fonctions pures dans `shared/`, déterministes (dates en paramètre, pas de Date.now() interne), TDD.
- Timezone famille : Indian/Reunion (UTC+4), constante `TZ` dans shared.
- Zones fixes : jardin, piscine, lessive, cuisine, courses, rangement.
- Auth : token familial unique (var `FAMILY_TOKEN`), Bearer ou `?k=`.
- Commits fréquents, push sur origin main (github.com/yogeek/home-planner).
- Mettre à jour `HANDOFF.md` (avancement) et `README.md` à chaque étape significative.
- Erreurs auth Cloudflare transitoires : réessayer la commande wrangler.
- Cron Cloudflare : `SUN` pour dimanche (pas `0`).

## Production

- URL : https://le-village.boka-reunion.workers.dev
- Compte Cloudflare : boka.reunion@gmail.com (wrangler loggé sur la machine)
- D1 : village-db (264d7adb-15c1-47d7-8fa3-67377d8bb3e6)
