# HANDOFF : état de la session

> Reprise : lire ce fichier, puis `docs/superpowers/plans/2026-07-18-le-village.md` et `docs/superpowers/specs/2026-07-18-le-village-design.md`.

## Statut : ✅ v1 DÉPLOYÉE + retours utilisateur intégrés (19/07)

Les 14 tâches du plan sont faites, plus deux vagues de retours de Guillaume (mode tableau opt-in + réglages ; catégories personnalisées + clairière + CRUD complet). En cours : boucle d'évaluation par agents « famille » (documentée ci-dessous si interrompue).

- **URL prod** : https://le-village.boka-reunion.workers.dev
- **Lien famille (secret)** : voir `docs/GUIDE-FAMILLE.md` (jeton `FAMILY_TOKEN` en secret Cloudflare)
- La base prod est vierge : la famille fera son onboarding elle-même (écran « Fonder notre village »).

## Vérifié par audit E2E (Chrome + Playwright mobile 390x844)

Onboarding complet, choix de profils, écran Village (scène animée, jauge, balançoire), complétion avec célébration et glands, réassignation dans Semaine (flag manual préservé à la régénération), courses (ajout, coche, checkout → historique → suggestions), file hors ligne (503 simulé puis resynchronisation), mode enfant (mission illustrée, validation parentale, confettis), mode tablette (>=1024px), temps réel entre 2 clients via WebSocket, double-done idempotent, auth 401.

## Corrections issues de l'audit (toutes appliquées)

1. Libellé de la balançoire inversé → utilise `balance.ratio`.
2. `generateWeek(env, weekStart, fromDate)` : plus de tâches créées dans le passé (onboard et regenerate passent `today`, le cron hebdo prend la semaine entière).
3. Titre « Journée libre ! » quand 0 mission (au lieu de « Tout est fait, bravo ! »).
4. Journal du village crédite l'assigné (pas celui qui a coché sur la tablette).
5. Pluriels corrigés.
6. Onboarding : créatures bloquées uniquement par les habitants déjà validés + auto-réassignation.

## Config Cloudflare

- Worker `le-village`, compte boka.reunion@gmail.com. D1 `village-db` (264d7adb-...), migrations 0001+0002 appliquées local+remote.
- Secrets prod : `FAMILY_TOKEN`, `VAPID_PUBLIC`, `VAPID_PRIVATE` (dev : `.dev.vars`, non commité ; le jeton famille est aussi dans `/tmp/family-token.txt` et dans le guide).
- Crons UTC : `0 3 * * *` (résumé 7h), `30 14 * * *` (rappel 18h30), `0 14 * * SUN` (génération semaine, dim 18h). Syntaxe : `SUN`, pas `0`.
- `nodejs_compat` requis (lib web-push).

## CI/CD

`.github/workflows/deploy.yml` : tests + typecheck + build à chaque push ; déploiement automatique si le secret GitHub `CLOUDFLARE_API_TOKEN` est configuré (à créer par Guillaume : Cloudflare dashboard → My Profile → API Tokens → modèle « Edit Cloudflare Workers » + permission D1:Edit, puis GitHub repo → Settings → Secrets → Actions). Sans le secret, la CI passe et saute le déploiement (warning). Déploiement local : `npm run deploy`.

## Points en suspens (non bloquants)

- Push non testé de bout en bout sur un vrai téléphone (l'abonnement et l'envoi sont implémentés ; à valider quand la famille active les notifications).
- Rappels à heure précise (`reminder_time`) : mentionnés dans les pushes matin/soir, pas de push à l'heure exacte (choix v1).
- Écran « Régler les tâches » ajouté suite aux retours de Guillaume (19/07 matin) : CRUD complet des task_defs dans l'UI.
- Catégories personnalisées (19/07, 2e retour) : table `categories` (migration 0003), le champ `zone` des tâches est devenu un id de catégorie, 7 catégories intégrées mappées sur les zones de la scène dont la nouvelle « La clairière » (loisirs). CRUD catégories dans les réglages (custom uniquement pour suppression, tâches réaffectées aux loisirs). CRUD complet des occurrences (PUT/DELETE /occurrences/:id, DELETE /tasks/:id, /categories).
- Rayon des articles : « autre » par défaut, appris via l'historique d'achats ; pas de sélecteur manuel (v1).
- QR code du lien famille non généré (pas d'outil dispo) ; le bouton « Inviter » de l'app partage le lien.

## Idées v2 (si la famille accroche)

Visuels générés par Higgsfield AI pour enrichir la scène, accessoires cosmétiques des créatures (les jalons existent côté données), personnalisation des tâches dans l'UI, historique long terme, récompenses réelles pour le petit.
