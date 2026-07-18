import type { TaskDef } from './types';

/**
 * Tâches par défaut créées à l'onboarding.
 * fixed_assignee reste vide (résolu plus tard dans l'app si besoin).
 * Jours : 0 = lundi ... 6 = dimanche.
 */
export const DEFAULT_TASK_DEFS: Omit<TaskDef, 'id'>[] = [
  // Cuisine
  { title: 'Préparer les repas', zone: 'cuisine', weight: 3, recurrence: { timesPerWeek: 7 }, childTask: false, season: 'all', active: true },
  { title: 'Vaisselle & plan de travail', zone: 'cuisine', weight: 2, recurrence: { timesPerWeek: 7 }, childTask: false, season: 'all', active: true },
  { title: 'Nettoyer le frigo', zone: 'cuisine', weight: 3, recurrence: { timesPerWeek: 0.25 }, childTask: false, season: 'all', active: true },

  // Lessive
  { title: 'Lancer une lessive', zone: 'lessive', weight: 2, recurrence: { timesPerWeek: 3 }, childTask: false, season: 'all', active: true },
  { title: 'Étendre / plier le linge', zone: 'lessive', weight: 3, recurrence: { timesPerWeek: 3 }, childTask: false, season: 'all', active: true },
  { title: 'Changer les draps', zone: 'lessive', weight: 3, recurrence: { timesPerWeek: 0.5 }, childTask: false, season: 'all', active: true },

  // Rangement / nettoyage
  { title: 'Aspirateur / sols', zone: 'rangement', weight: 4, recurrence: { timesPerWeek: 2 }, childTask: false, season: 'all', active: true },
  { title: 'Nettoyer la salle de bain', zone: 'rangement', weight: 4, recurrence: { timesPerWeek: 1 }, childTask: false, season: 'all', active: true },
  { title: 'Sortir les poubelles', zone: 'rangement', weight: 1, recurrence: { daysOfWeek: [1] }, reminderTime: '19:00', childTask: false, season: 'all', active: true },
  { title: 'Ranger le salon', zone: 'rangement', weight: 2, recurrence: { timesPerWeek: 2 }, childTask: false, season: 'all', active: true },

  // Courses
  { title: 'Faire les courses', zone: 'courses', weight: 4, recurrence: { timesPerWeek: 1 }, childTask: false, season: 'all', active: true },

  // Jardin
  { title: 'Tondre la pelouse', zone: 'jardin', weight: 5, recurrence: { timesPerWeek: 0.5 }, childTask: false, season: 'all', active: true },
  { title: 'Arroser les plantes', zone: 'jardin', weight: 2, recurrence: { timesPerWeek: 2 }, childTask: false, season: 'all', active: true },
  { title: 'Désherber / entretenir', zone: 'jardin', weight: 4, recurrence: { timesPerWeek: 0.5 }, childTask: false, season: 'all', active: true },

  // Piscine
  { title: 'Vérifier pH & chlore', zone: 'piscine', weight: 2, recurrence: { timesPerWeek: 1 }, childTask: false, season: 'all', active: true },
  { title: 'Nettoyer filtre & skimmers', zone: 'piscine', weight: 3, recurrence: { timesPerWeek: 1 }, childTask: false, season: 'all', active: true },
  { title: 'Passer le robot / épuisette', zone: 'piscine', weight: 3, recurrence: { timesPerWeek: 1 }, childTask: false, season: 'summer', active: true },

  // Missions du petit
  { title: 'Ranger mes jouets', zone: 'rangement', weight: 1, recurrence: { timesPerWeek: 5 }, childTask: true, season: 'all', active: true },
  { title: 'Mettre mes chaussures au placard', zone: 'rangement', weight: 1, recurrence: { timesPerWeek: 3 }, childTask: true, season: 'all', active: true },
  { title: 'Arroser ma plante', zone: 'jardin', weight: 1, recurrence: { timesPerWeek: 2 }, childTask: true, season: 'all', active: true },
  { title: 'Aider à mettre la table', zone: 'cuisine', weight: 1, recurrence: { timesPerWeek: 3 }, childTask: true, season: 'all', active: true },
];

/** Récurrence fractionnaire : timesPerWeek 0.5 = toutes les 2 semaines, 0.25 = 1 fois par mois. */
