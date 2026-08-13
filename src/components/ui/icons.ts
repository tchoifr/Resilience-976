export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'plus'
  | 'printer'
  | 'download'
  | 'trash'
  | 'search'
  | 'play'
  | 'refresh'
  | 'external-link'
  | 'box'

// Traces ecrites dans le projet plutot qu'importees d'une bibliotheque :
// la CSP interdit toute ressource externe, et dix icones ne justifient pas
// une dependance. Toutes sont dessinees sur une grille 24x24, en traits
// (pas en aplats) pour rester lisibles a petite taille dans les deux themes.
export const iconPaths: Record<IconName, string[]> = {
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  check: ['M20 6L9 17l-5-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  printer: ['M6 9V3h12v6', 'M6 18H4v-7h16v7h-2', 'M6 14h12v7H6z'],
  download: ['M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  trash: ['M3 6h18', 'M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2', 'M19 6l-1 15H6L5 6'],
  search: ['M11 19a8 8 0 100-16 8 8 0 000 16z', 'M21 21l-4.3-4.3'],
  play: ['M7 4l12 8-12 8V4z'],
  refresh: ['M21 12a9 9 0 11-2.6-6.4', 'M21 3v6h-6'],
  'external-link': [
    'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6',
    'M15 3h6v6',
    'M10 14L21 3',
  ],
  // Carton ferme, pour le kit d'urgence : le rabat central le distingue d'un
  // simple rectangle a la taille d'une icone de bouton.
  box: ['M3 7l9-4 9 4v10l-9 4-9-4V7z', 'M3 7l9 4 9-4', 'M12 11v10'],
}
