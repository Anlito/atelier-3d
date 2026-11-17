// Petites icônes au trait pour les boutons d'action (dessinées pour l'Atelier 3D, style « ligne »).
const P = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  new: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>',
  open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1"/><path d="M3 19 6 11h16l-3 8z"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.4-3 4.5"/><path d="M12 17.6v.01"/>',
  target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
  pencil: '<path d="M16.5 3.5a2.6 2.6 0 0 1 3.7 3.7L8 19.5 3 21l1.5-5z"/><path d="m14.5 5.5 4 4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  frame: '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><circle cx="12" cy="12" r="3.5"/>',
  drop: '<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M4 20h16"/>',
  rotl: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  rotr: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1l2.6 2.6"/><path d="M20.5 3.5v5h-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 4.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h.5"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2"/><path d="M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14M10 11v6M14 11v6"/>',
  mirror: '<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M8.5 7 3.5 12l5 5z"/><path d="M15.5 7l5 5-5 5z"/>',
  merge: '<rect x="3" y="3" width="11" height="11" rx="2"/><rect x="10" y="10" width="11" height="11" rx="2"/>',
  alignx: '<path d="M12 2.5v19"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
  alignz: '<path d="M2.5 12h19"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
  alignb: '<path d="M3 21h18"/><rect x="5" y="9" width="5" height="10" rx="1"/><rect x="14" y="4" width="5" height="15" rx="1"/>',
  rot3: '<ellipse cx="12" cy="12" rx="9.5" ry="4"/><ellipse cx="12" cy="12" rx="4" ry="9.5"/><circle cx="12" cy="12" r="1.3"/>',
  flip: '<path d="M7 3v15M3.5 14.5 7 18l3.5-3.5"/><path d="M17 21V6M13.5 9.5 17 6l3.5 3.5"/>',
  unmerge: '<rect x="2.5" y="2.5" width="9" height="9" rx="2"/><rect x="12.5" y="12.5" width="9" height="9" rx="2"/><path d="M15 3.5h5.5V9M9 20.5H3.5V15"/>',
  line: '<path d="M4 20 20 4"/><circle cx="4" cy="20" r="1.6"/><circle cx="20" cy="4" r="1.6"/>',
  curve: '<path d="M4 19C6 8 18 16 20 5"/><circle cx="4" cy="19" r="1.6"/><circle cx="20" cy="5" r="1.6"/>',
  rect: '<rect x="3.5" y="5.5" width="17" height="13" rx="1"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
  magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4M10 3v8a2 2 0 0 0 4 0V3"/>',
  move: '<path d="M12 2.5v19M2.5 12h19M9 5.5l3-3 3 3M9 18.5l3 3 3-3M5.5 9l-3 3 3 3M18.5 9l3 3-3 3"/>',
};
/** Une icône en SVG (à mettre dans un gabarit HTML). */
export const ic = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
/** Remplace les <i data-ic="nom"></i> de la page par leur icône. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-ic]').forEach(el => { el.outerHTML = ic(el.dataset.ic); });
}
