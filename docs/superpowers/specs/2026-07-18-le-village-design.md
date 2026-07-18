# Le Village : design de l'application familiale de tâches ménagères

Date : 2026-07-18
Statut : validé par Guillaume (concept, écrans, architecture)

## 1. Objectif

Aider un couple (et leur fils de 3-5 ans) à organiser les tâches de la maison (courses, lessives, nettoyage, rangement, cuisine, entretien piscine, entretien jardin) de façon ludique et engageante. L'application doit :

- réduire la charge mentale, jamais en ajouter (simplicité d'utilisation prioritaire),
- permettre de suivre l'avancement, saisir ce que chacun a fait, voir ce qu'a fait l'autre,
- distribuer les tâches automatiquement et équitablement,
- envoyer des rappels doux,
- donner envie d'avancer, comme un jeu, avec un rendu visuel soigné,
- inclure de petites missions pour l'enfant.

Utilisation : sur les deux téléphones (saisie, rappels) et sur une tablette commune à la maison (tableau de bord familial affiché en continu).

## 2. Concept de jeu : « Le Village »

### Univers

Le foyer est un petit village dans une clairière. Chaque membre de la famille est représenté par une créature attachante choisie à la création du profil (renard, chouette, panda roux, hérisson, etc.). Chaque créature a sa maison, ses animations d'humeur, et réagit aux tâches accomplies.

### Zones du village

Le village est découpé en zones correspondant aux domaines réels de tâches :

| Zone | Domaine |
|---|---|
| Le potager | Jardin |
| La source | Piscine |
| Le lavoir | Lessives |
| La grande table | Cuisine |
| Le marché | Courses |
| L'atelier | Rangement et nettoyage |

Une tâche accomplie anime joliment sa zone (le lavoir fume, le potager fleurit, des lucioles apparaissent). Un domaine négligé plusieurs jours voit sa zone se ternir doucement (herbe haute, couleurs passées) : rappel visuel poétique, jamais punitif ni chiffré. Taper sur une zone montre les tâches du domaine.

### Progression collective

Chaque tâche rapporte des « glands » (monnaie du village), pondérés par la pénibilité de la tâche. Les glands remplissent une jauge commune qui fait monter le village de niveau. Chaque niveau débloque un embellissement permanent visible par tous (fontaine, pont, lampions, ours voyageur...). L'effort de chacun profite au décor de tous : mécanique coopérative.

### Progression personnelle légère

Chaque créature garde trace de ses séries (« 5 jours d'affilée ! ») et gagne des accessoires cosmétiques (chapeau, écharpe) sur des jalons personnels. Pas de niveaux individuels comparés : on reste coopératif, pas compétitif.

### La part de l'enfant (3-5 ans)

L'enfant a sa créature et 1 à 3 missions du jour illustrées sans texte (ranger les jouets, mettre ses chaussures au placard, arroser une plante), présentées comme des images à toucher. Un parent valide d'un tap ; la créature de l'enfant fait une danse de joie avec confettis. Ses réussites rapportent des glands au village : il contribue pour de vrai.

### Équilibre bienveillant

Une balançoire à bascule dans le village représente l'équilibre pondéré de la semaine entre les deux adultes. Si elle penche, c'est une invitation visuelle à rééquilibrer, avec un bouton « proposer d'échanger une tâche ». Les chiffres détaillés vivent dans un écran secondaire.

## 3. Écrans et fonctionnalités

### Écran « Village » (accueil)

Vue du village animé : état des zones, jauge de niveau, balançoire d'équilibre, créatures animées. Point d'entrée émotionnel de l'application.

### Écran « Aujourd'hui »

L'écran le plus utilisé. Ma liste du jour en grosses cartes illustrées triées par importance. Un tap pour marquer fait (célébration en retour). Un geste pour reporter à demain ou proposer la tâche à l'autre. En bas, aperçu de ce que l'autre a déjà fait aujourd'hui.

### Écran « Semaine »

Répartition proposée automatiquement chaque dimanche soir à partir des récurrences définies une fois pour toutes (lessive 2 fois par semaine, piscine 1 fois par semaine l'été, poubelles le mardi...). Glisser-déposer pour réassigner une tâche à une personne ou un jour. L'algorithme équilibre selon la pénibilité et fait tourner les corvées impopulaires. Ajout d'une tâche ponctuelle en 5 secondes : titre + domaine, le reste optionnel.

### Écran « Courses » (le marché)

Liste partagée en temps réel, groupée par rayon. Chacun ajoute au fil de l'eau. Suggestions intelligentes basées sur les habitudes (« vous prenez du lait chaque semaine, l'ajouter ? ») et raccourcis vers les articles fréquents. En magasin : mode grandes cases à cocher, fonctionne hors ligne, se synchronise au retour du réseau.

### Mode enfant

Accessible depuis le profil de l'enfant : plein écran, gros visuels, zéro texte nécessaire, missions du jour en images. Validation parentale par un tap discret.

### Mode tablette (tableau du foyer)

Sur grand écran, l'application affiche une vue tableau de bord : village en grand, tâches du jour de chacun, liste de courses, mises à jour en temps réel. Pensé pour rester affiché en continu dans la cuisine.

### Rappels et notifications

- Résumé doux le matin (« 2 missions pour toi aujourd'hui »).
- Rappel le soir uniquement s'il reste une tâche importante.
- Rappel précis à heure fixe optionnel sur les tâches critiques (poubelles...).
- Web Push standard, silencieux, préférences par personne, désactivable.

### Écran « Équilibre » (secondaire)

Statistiques détaillées : répartition pondérée sur la semaine et le mois, historique de qui a fait quoi, séries. Présentation positive (« vous avez accompli 23 missions ensemble cette semaine »).

## 4. Architecture technique

### Vue d'ensemble

- **Client** : React (Vite), PWA installable, interface en français. Village dessiné en SVG animé (animations CSS + spring). Cache hors ligne, notamment pour la liste de courses en magasin.
- **API** : un Cloudflare Worker unique.
- **Données** : Cloudflare D1 (SQLite géré).
- **Temps réel** : un Durable Object diffuse les mises à jour par WebSocket (cocher une tâche anime le village chez les autres et sur la tablette instantanément).
- **Crons Cloudflare** :
  - dimanche soir : génération et répartition équilibrée de la semaine,
  - chaque matin : notification résumé,
  - chaque soir : rappel si nécessaire et mise à jour de la fraîcheur des zones.
- **Notifications** : Web Push standard (VAPID), sans service tiers. Sur iOS (16.4+), nécessite l'ajout à l'écran d'accueil.
- **Accès** : URL avec jeton secret familial ; au premier lancement, choix du profil (créature), mémorisé sur l'appareil. Pas de mot de passe. Application familiale non sensible.
- **Coût** : 0 €, offre gratuite Cloudflare largement suffisante pour un usage familial.

### Modèle de données (principales tables D1)

- `members` : profils (nom, créature, rôle adulte/enfant, préférences de notification, abonnements push).
- `task_defs` : définitions de tâches récurrentes (titre, domaine/zone, récurrence, pénibilité en glands, saisonnalité, rappel précis optionnel, éligibilité enfant).
- `task_occurrences` : occurrences planifiées (date, assigné, statut : à faire / fait / reporté / échangé, validé par pour l'enfant).
- `shopping_items` : articles (libellé, rayon, statut, ajouté par, fréquence apprise pour les suggestions).
- `village_state` : glands cumulés, niveau, embellissements débloqués, fraîcheur par zone.
- `member_progress` : séries, jalons, accessoires cosmétiques.

### Logique métier clé

- **Répartition** : algorithme qui équilibre la charge hebdomadaire pondérée par pénibilité entre les deux adultes, fait tourner les corvées impopulaires, respecte les assignations fixes (ex. poubelles mardi) et les ajustements manuels.
- **Pondération** : chaque tâche a un poids en glands défini à la création (modifiable), utilisé pour la jauge du village et la balançoire d'équilibre.
- **Suggestions de courses** : fréquence d'achat apprise par article ; suggestion quand l'intervalle habituel est écoulé.
- **Fraîcheur des zones** : décroît avec les jours sans tâche accomplie dans le domaine, remonte à chaque complétion.

### Gestion des erreurs

- Hors ligne : les actions (cocher, ajouter un article) sont mises en file localement et synchronisées au retour du réseau ; résolution simple « dernière écriture gagne », suffisante pour 3 utilisateurs.
- WebSocket coupé : repli sur re-synchronisation à la reconnexion ; l'interface reste utilisable.
- Push refusé ou non supporté : l'application fonctionne intégralement sans notifications.

### Tests

Logique métier (répartition, pondération, suggestions, niveaux, fraîcheur) développée en TDD avec tests unitaires (Vitest). Tests d'intégration sur l'API Worker. Le rendu du village est vérifié visuellement.

## 5. Hors périmètre (v1)

- Multi-foyers, comptes publics, inscription ouverte.
- Application native / stores.
- Récompenses réelles ou argent de poche.
- Intégrations externes (calendriers, domotique, drive de courses).
- Plus de 6 zones ou domaines personnalisables (les 6 zones couvrent les besoins exprimés ; extensible plus tard).
