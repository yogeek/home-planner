import type { Aisle } from './types';

/** Mots-clés (sans accents, minuscules) → rayon. Premier match gagne. */
const KEYWORDS: [Aisle, string[]][] = [
  // Boissons d'abord : « jus de mangue » est une boisson, pas un fruit
  ['boissons', ['eau', 'jus', 'soda', 'cola', 'limonade', 'sirop', 'biere', 'vin', 'rhum', 'cidre', 'boisson']],
  [
    'fruits & légumes',
    ['pomme', 'banane', 'orange', 'citron', 'mangue', 'ananas', 'letchi', 'litchi', 'fraise', 'raisin', 'poire', 'peche', 'abricot', 'melon', 'pasteque', 'kiwi', 'avocat', 'tomate', 'salade', 'laitue', 'carotte', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'echalote', 'pomme de terre', 'patate', 'brede', 'chouchou', 'concombre', 'brocoli', 'chou', 'epinard', 'haricot vert', 'champignon', 'gingembre', 'persil', 'coriandre', 'basilic', 'menthe', 'legume', 'fruit'],
  ],
  [
    'frais',
    ['lait', 'beurre', 'creme', 'yaourt', 'yoghourt', 'fromage', 'camembert', 'emmental', 'gruyere', 'mozzarella', 'parmesan', 'oeuf', 'jambon', 'lardon', 'poulet', 'boeuf', 'steak', 'viande', 'saucisse', 'porc', 'canard', 'poisson', 'saumon', 'crevette', 'thon frais', 'tofu', 'rougail saucisse', 'charcuterie', 'surimi', 'dessert'],
  ],
  [
    'épicerie',
    ['pain', 'baguette', 'riz', 'pate', 'spaghetti', 'nouille', 'farine', 'sucre', 'sel', 'poivre', 'huile', 'vinaigre', 'conserve', 'thon', 'sardine', 'tomate pelee', 'sauce', 'ketchup', 'mayonnaise', 'moutarde', 'cereale', 'muesli', 'confiture', 'miel', 'nutella', 'chocolat', 'biscuit', 'gateau', 'chips', 'cacahuete', 'lentille', 'pois', 'grain', 'cari', 'curcuma', 'epice', 'massale', 'bouillon', 'soupe', 'compote', 'cafe', 'the ', 'tisane', 'cacao', 'brioche', 'surgele', 'glace', 'pizza'],
  ],
  [
    'hygiène',
    ['savon', 'gel douche', 'shampoing', 'shampooing', 'dentifrice', 'brosse a dent', 'deodorant', 'rasoir', 'mousse a raser', 'coton', 'couche', 'lingette', 'mouchoir', 'papier toilette', 'pq', 'serviette hygienique', 'tampon', 'creme solaire', 'moustique'],
  ],
  [
    'maison',
    ['lessive', 'adoucissant', 'liquide vaisselle', 'eponge', 'essuie-tout', 'sopalin', 'javel', 'nettoyant', 'desinfectant', 'sac poubelle', 'aluminium', 'film etirable', 'pile', 'ampoule', 'allumette', 'bougie', 'croquette', 'litiere'],
  ],
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Devine le rayon d'un article à partir de son nom ; « autre » si inconnu.
 * Matching par mots entiers (« sel » ne matche pas « vaisselle ») avec pluriels simples. */
export function guessAisle(label: string): Aisle {
  const n = normalize(label);
  for (const [aisle, words] of KEYWORDS) {
    for (const w of words) {
      const re = new RegExp(`(^|[^a-z])${normalize(w).replace(/ /g, '[ -]')}(s|x)?($|[^a-z])`);
      if (re.test(n)) return aisle;
    }
  }
  return 'autre';
}
