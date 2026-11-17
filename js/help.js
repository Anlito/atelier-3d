// Contenus pédagogiques : perçages tout prêts, composants, modèles de boîtes,
// projets guidés, guide d'aide et messages de l'assistant.

/* ---------- Où les élèves doivent enregistrer (affiché avant chaque enregistrement) ---------- */
export const SAVE_PATH = ['Bureau', 'Classe', '4X (ta classe)', 'commun', 'Le projet en cours', 'Dossier de ton équipe'];

/* ---------- Perçages tout prêts (diamètres avec un petit jeu pour que ça rentre) ---------- */
export const DRILL_PRESETS = [
  { k: 'round', g: 'Sur mesure', label: 'Rond sur mesure', shape: 'round', d: 5 },
  { k: 'rect', g: 'Sur mesure', label: 'Rectangle sur mesure', shape: 'rect', w: 10, h: 6 },
  { k: 'led3', g: 'Électronique', label: 'LED 3 mm', shape: 'round', d: 3.2 },
  { k: 'led5', g: 'Électronique', label: 'LED 5 mm', shape: 'round', d: 5.2 },
  { k: 'led10', g: 'Électronique', label: 'LED 10 mm', shape: 'round', d: 10.2 },
  { k: 'btn12', g: 'Électronique', label: 'Bouton poussoir rond 12 mm', shape: 'round', d: 12.2 },
  { k: 'btn16', g: 'Électronique', label: 'Bouton poussoir rond 16 mm', shape: 'round', d: 16.2 },
  { k: 'btnsq', g: 'Électronique', label: 'Capuchon de bouton carré 12×12', shape: 'rect', w: 12.6, h: 12.6 },
  { k: 'btn24', g: 'Électronique', label: 'Bouton arcade 24 mm', shape: 'round', d: 24.2 },
  { k: 'btn30', g: 'Électronique', label: 'Bouton arcade 30 mm', shape: 'round', d: 30.2 },
  { k: 'usbb', g: 'Électronique', label: 'Câble USB-B (Arduino Uno)', shape: 'rect', w: 13, h: 12 },
  { k: 'microusb', g: 'Électronique', label: 'Câble micro-USB (micro:bit)', shape: 'rect', w: 11, h: 7 },
  { k: 'usbc', g: 'Électronique', label: 'Câble USB-C', shape: 'rect', w: 10, h: 5 },
  { k: 'jack', g: 'Électronique', label: 'Prise d’alimentation Arduino', shape: 'rect', w: 10, h: 12 },
  { k: 'switch', g: 'Électronique', label: 'Interrupteur à bascule', shape: 'rect', w: 19.2, h: 13.2 },
  { k: 'pot', g: 'Électronique', label: 'Potentiomètre (axe)', shape: 'round', d: 7.4 },
  { k: 'sound', g: 'Électronique', label: 'Petit trou pour le son (buzzer)', shape: 'round', d: 3 },
  { k: 'wire', g: 'Électronique', label: 'Passage de fils', shape: 'round', d: 6 },
  { k: 'm3', g: 'Fixations', label: 'Vis M3', shape: 'round', d: 3.4 },
  { k: 'm4', g: 'Fixations', label: 'Vis M4 (mBot, Meccano)', shape: 'round', d: 4.4 },
  { k: 'lego', g: 'Fixations', label: 'Tenon Lego (rond Ø4,8)', shape: 'round', d: 4.9 },
  { k: 'rod', g: 'Théâtre & déco', label: 'Baguette du théâtre d’ombre Ø4', shape: 'round', d: 4.3 },
  { k: 'split', g: 'Théâtre & déco', label: 'Attache parisienne (articulation) Ø3', shape: 'round', d: 3.2 },
  { k: 'string', g: 'Théâtre & déco', label: 'Ficelle / anneau de porte-clés Ø5', shape: 'round', d: 5 },
];

/* ---------- Composants : repères gris qui ne sont PAS imprimés ---------- */
const B = (s, p) => ({ k: 'box', s, p });
const C = (d, h, p) => ({ k: 'cyl', s: [d, h, d], p });
export const COMPONENTS = [
  { k: 'arduino', icon: '🟦', name: 'Arduino Uno', help: 'Carte Arduino Uno (68,6 × 53,3 mm). La prise USB et la prise d’alimentation dépassent à gauche : perce la paroi juste en face.',
    parts: [B([68.6, 1.6, 53.3], [0, 0.8, 0]), B([16, 11, 12], [-32.65, 7.1, 11]), B([14, 11, 9], [-29.3, 7.1, -16]),
      B([52, 8.5, 2.5], [8, 5.85, 25.1]), B([42, 8.5, 2.5], [11, 5.85, -25.1]), B([35, 4, 8], [8, 3.6, -4])] },
  { k: 'microbit', icon: '🟩', name: 'micro:bit', help: 'Carte micro:bit (52 × 42 mm). La prise micro-USB et la prise de piles sont au dos, sur le bord du haut.',
    parts: [B([52, 1.6, 42], [0, 0.8, 0]), B([8, 3, 6], [0, -1.5, -18]), B([7, 5, 8], [12, -2.5, -17])] },
  { k: 'breadboard', icon: '⬜', name: 'Mini plaque d’essai', help: 'Mini breadboard 47 × 35 mm, 8,5 mm de haut.', parts: [B([47, 8.5, 35], [0, 4.25, 0])] },
  { k: 'pushbtn', icon: '🔘', name: 'Bouton poussoir 12×12', help: 'Bouton poussoir 12 × 12 mm avec son capuchon rond.', parts: [B([12, 3.5, 12], [0, 1.75, 0]), C(11, 5, [0, 6, 0])] },
  { k: 'arcade', icon: '🔴', name: 'Bouton arcade 30 mm', help: 'Bouton d’arcade : il se monte dans un trou de 30 mm, la collerette reste au-dessus.',
    parts: [C(28, 28, [0, 14, 0]), C(33, 3, [0, 29.5, 0]), C(24, 4, [0, 33, 0])] },
  { k: 'led', icon: '💡', name: 'LED 5 mm', help: 'LED de 5 mm avec sa collerette : perce un trou de 5,2 mm.', parts: [C(5.8, 1, [0, 0.5, 0]), C(5, 7.6, [0, 4.8, 0])] },
  { k: 'led10', img: 'led', icon: '💡', name: 'LED 10 mm', help: 'Grosse LED de 10 mm avec sa collerette : perce un trou de 10,2 mm (perçage « LED 10 mm »).', parts: [C(11.2, 1.5, [0, 0.75, 0]), C(10, 12, [0, 7.5, 0])] },
  { k: 'buzzer', icon: '🔊', name: 'Buzzer', help: 'Buzzer rond Ø12 mm.', parts: [C(12, 9.5, [0, 4.75, 0])] },
  { k: 'servo', icon: '⚙️', name: 'Servomoteur SG90', help: 'Petit servomoteur SG90 avec ses deux oreilles de fixation.',
    parts: [B([23, 22.5, 12.5], [0, 11.25, 0]), B([32, 2.5, 12.5], [0, 16, 0]), C(5, 4, [6, 24.5, 0])] },
  { k: 'hcsr04', icon: '👀', name: 'Capteur ultrason', help: 'Capteur à ultrasons HC-SR04 : deux « yeux » de 16 mm espacés de 26 mm.',
    parts: [B([45, 20, 1.6], [0, 10, 0]), C(16, 12, [-13, 10, 6.8]), C(16, 12, [13, 10, 6.8])].map(q => q.k === 'cyl' ? { ...q, rotX: true } : q) },
  { k: 'bat9', icon: '🔋', name: 'Pile 9 V', help: 'Pile 9 V couchée (48,5 × 26,5 × 17,5 mm).', parts: [B([48.5, 17.5, 26.5], [0, 8.75, 0])] },
  { k: 'aa4', icon: '🪫', name: 'Boîtier 4 piles AA', help: 'Boîtier pour 4 piles AA (environ 62 × 58 × 15 mm).', parts: [B([62, 15, 58], [0, 7.5, 0])] },
];
// Les « yeux » du capteur ultrason pointent vers l'avant : on couche les cylindres.
for (const c of COMPONENTS) c.parts = c.parts.map(q => q.rotX ? { k: 'box', s: [q.s[0], q.s[0], q.s[1]], p: q.p } : q);

/* ---------- Modèles de boîtes (dimensions INTÉRIEURES) ---------- */
export const BOX_PRESETS = [
  { k: 'free', label: 'Boîte libre', L: 60, P: 40, H: 30 },
  { k: 'simon', label: 'Jeu Simon (Arduino Uno + 4 boutons)', L: 130, P: 130, H: 45 },
  { k: 'arduino', label: 'Boîtier pour Arduino Uno', L: 76, P: 58, H: 30 },
  { k: 'microbit', label: 'Boîtier pour micro:bit', L: 56, P: 46, H: 20 },
  { k: 'piles', label: 'Boîtier pour 4 piles AA', L: 66, P: 62, H: 20 },
  { k: 'escape', label: 'Coffret à secret (escape game)', L: 80, P: 60, H: 40 },
];

/* ---------- Projets guidés ---------- */
const solids = c => c.objs.filter(o => o.kind === 'solid');
const holes = c => c.objs.filter(o => o.kind === 'hole');
export const MISSIONS = [
  {
    id: 'decouverte', icon: '🚀', title: 'Découvrir l’atelier', desc: 'Les gestes de base en 10 minutes : poser, déplacer, redimensionner, trouer, télécharger.',
    steps: [
      { t: 'Pose un cube sur le plateau', h: 'Clique sur « Cube » dans la colonne de gauche.', sel: '[data-add="cube"]', ok: c => c.ev.has('add:cube') },
      { t: 'Fais tourner la vue', h: 'Clique dans le vide (à côté du cube), garde le bouton enfoncé et bouge la souris. La molette sert à zoomer, le clic droit à glisser la vue.', ok: c => c.ev.has('orbit') },
      { t: 'Déplace le cube', h: 'Clique sur le cube, garde le bouton enfoncé et fais-le glisser sur le plateau.', ok: c => c.ev.has('move') },
      { t: 'Donne-lui 40 mm de largeur', h: 'Sélectionne le cube, puis dans « Propriétés », tape 40 dans la case Largeur et appuie sur Entrée.', sel: '#f-sx', ok: c => c.objs.some(o => o.type === 'cube' && Math.abs(o.size.x - 40) < 0.6) },
      { t: 'Ajoute un cylindre et transforme-le en TROU', h: 'Pose un cylindre, puis clique sur le bouton « Trou » dans Propriétés : il devient rouge transparent.', sel: '[data-add="cylinder"]', ok: c => holes(c).length > 0 },
      { t: 'Place le trou pour qu’il traverse le cube', h: 'Fais glisser le cylindre rouge dans le cube. Astuce : avec les deux sélectionnés (Maj + clic), « Aligner » → Centre, Centre les centre parfaitement.', ok: c => holes(c).some(h => solids(c).some(s => c.touch(h, s))) },
      { t: 'Regarde le résultat final', h: 'Clique sur « Aperçu final » en haut : les trous creusent la matière, comme à l’impression.', sel: '#btn-preview', ok: c => c.ev.has('preview') },
      { t: 'Télécharge ton objet', h: 'Bouton « Télécharger » en haut à droite. Le fichier STL s’ouvre dans le logiciel de l’imprimante (Cura, PrusaSlicer, Bambu Studio…).', sel: '#btn-export', ok: c => c.ev.has('export') },
    ],
  },
  {
    id: 'ombre', icon: '🎭', title: 'Théâtre d’ombre : mon personnage', desc: 'Dessine ou importe une silhouette, elle devient une pièce de 2 mm d’épaisseur prête à imprimer.',
    steps: [
      { t: 'Ouvre l’atelier Silhouette', h: 'Clique sur « Silhouette » dans les Outils magiques.', sel: '#tool-silhouette', ok: c => c.ev.has('open:silhouette') },
      { t: 'Dessine ton personnage en noir (ou importe une image)', h: 'Trace le contour avec les outils Libre, Droit, Courbe ou Cercle (trait de 1,7 mm), puis « Remplir » l’intérieur. Tout ce qui est NOIR sera en plastique. Les zones blanches à l’intérieur deviennent des trous (yeux, décors…). Le quadrillage t’aide pour les tailles : un carreau = 5 mm.', ok: c => c.ev.has('draw') || c.ev.has('add:silhouette') },
      { t: 'Choisis 2 mm d’épaisseur et crée la pièce', h: 'Dans l’atelier, règle « Épaisseur » sur 2 mm puis clique sur « Créer la pièce 3D ».', ok: c => c.objs.some(o => o.type === 'silhouette') },
      { t: 'Vérifie la taille de ton personnage', h: 'Sélectionne-le : la « Profondeur » est sa hauteur sur l’écran du théâtre. Entre 80 et 200 mm, c’est bien. Coche « Garder les proportions » avant de changer un nombre.', ok: c => c.objs.some(o => o.type === 'silhouette' && Math.max(o.size.x, o.size.z) >= 60 && Math.max(o.size.x, o.size.z) <= 210) },
      { t: 'Perce le trou de la baguette', h: 'Outil « Percer » → choisis « Baguette du théâtre d’ombre », puis clique sur ton personnage, près du bas.', sel: '#tool-drill', ok: c => c.ev.has('drill') },
      { t: 'Bonus : un bras articulé', h: 'Fais une 2e silhouette (un bras), puis perce un trou « Attache parisienne » sur le bras ET sur le corps, au même endroit.', optional: true, ok: c => c.objs.filter(o => o.type === 'silhouette').length >= 2 },
      { t: 'Aperçu final puis téléchargement', h: '« Aperçu final » pour vérifier, puis « Télécharger ».', sel: '#btn-export', ok: c => c.ev.has('export') },
    ],
  },
  {
    id: 'simon', icon: '🎮', title: 'La boîte du jeu Simon', desc: 'Une boîte avec couvercle, percée pour les boutons, les LED et le câble USB de l’Arduino.',
    steps: [
      { t: 'Crée la boîte avec l’assistant', h: 'Outils magiques → « Boîte ». Choisis le modèle « Jeu Simon » et laisse le couvercle coché.', sel: '#tool-box', ok: c => c.objs.some(o => o.type === 'box') },
      { t: 'Place l’Arduino (repère gris) dans la boîte', h: 'Composants → « Arduino Uno ». Fais-le glisser dans la boîte, puis clique « Poser » : il descend au fond. Active « Rayons X » pour voir à travers.', sel: '[data-comp="arduino"]', ok: c => c.objs.some(a => a.params.comp === 'arduino' && c.objs.some(b => b.type === 'box' && c.inside(a, b))) },
      { t: 'Perce la sortie du câble USB', h: 'Outil « Percer » → « Câble USB-B (Arduino Uno) ». Clique sur la paroi de la boîte, juste en face de la prise USB de l’Arduino.', sel: '#tool-drill', ok: c => holes(c).some(h => h.params.preset === 'usbb') },
      { t: 'Perce 4 trous pour les boutons dans le couvercle', h: 'Percer → choisis ton bouton (arcade 30 mm, ou poussoir 12 mm…). Clique 4 fois sur la plaque du couvercle.', ok: c => holes(c).filter(h => /^btn/.test(h.params.preset || '')).length >= 4 },
      { t: 'Perce 4 trous pour les LED', h: 'Percer → « LED 5 mm » ou « LED 10 mm » selon tes LED. Une LED à côté de chaque bouton, de la même couleur !', ok: c => holes(c).filter(h => /^led/.test(h.params.preset || '')).length >= 4 },
      { t: 'Vérifie avec l’aperçu final', h: 'Tous les trous doivent traverser. S’il en manque un, retourne en édition.', sel: '#btn-preview', ok: c => c.ev.has('preview') },
      { t: 'Télécharge la boîte et le couvercle', h: 'Ils seront imprimés côte à côte, le couvercle à l’envers (plaque sur le plateau) : c’est normal !', sel: '#btn-export', ok: c => c.ev.has('export') },
    ],
  },
  {
    id: 'robot', icon: '🤖', title: 'Une déco pour mon robot', desc: 'Une plaque personnalisée avec ton prénom pour un mBot ou un robot micro:bit.',
    steps: [
      { t: 'Pose la base : un cube de 60 × 40 × 3 mm', h: 'Pose un cube, puis tape 60, 40 et 3 dans Largeur, Profondeur, Hauteur.', sel: '[data-add="cube"]', ok: c => c.objs.some(o => o.type === 'cube' && o.kind === 'solid' && o.size.y <= 6 && o.size.x >= 30) },
      { t: 'Ajoute ton prénom', h: 'Formes → « Texte », puis écris ton prénom dans Propriétés. Pose-le sur la base avec « Poser ».', sel: '[data-add="text"]', ok: c => c.objs.some(o => o.type === 'text') },
      { t: 'Ajoute des formes déco qui touchent la base', h: 'Étoile, cœur, demi-sphère (des yeux ?)… Elles doivent toucher la base pour tenir.', ok: c => solids(c).length >= 3 },
      { t: 'Fusionne tout en une seule pièce', h: 'Sélectionne tout (Ctrl + A), puis « Fusionner ». Les pièces deviennent un seul objet solide.', sel: '#btn-merge', ok: c => c.ev.has('merge') },
      { t: 'Perce les trous de fixation', h: 'Percer → « Vis M4 (mBot) » ou « Tenon Lego ». Mesure l’écart des trous sur ton robot avec une règle !', sel: '#tool-drill', ok: c => c.ev.has('drill') },
      { t: 'Télécharge ta déco', sel: '#btn-export', h: 'Bouton « Télécharger ».', ok: c => c.ev.has('export') },
    ],
  },
  {
    id: 'escape', icon: '🗝️', title: 'Objet d’énigme (escape game)', desc: 'Une plaque avec un code secret gravé, à transformer en clé ou en pièce de puzzle.',
    steps: [
      { t: 'Crée une plaque : cube 80 × 50 × 4 mm', h: 'Pose un cube et règle ses dimensions.', sel: '[data-add="cube"]', ok: c => c.objs.some(o => o.type === 'cube' && o.kind === 'solid' && o.size.y <= 8 && o.size.x >= 40) },
      { t: 'Écris le code secret avec l’outil Texte', h: 'Formes → « Texte ». Change « Bonjour » par ton code (ex. 4 8 1 5).', sel: '[data-add="text"]', ok: c => c.objs.some(o => o.type === 'text') },
      { t: 'Transforme le texte en TROU pour le graver', h: 'Texte sélectionné → bouton « Trou ». Il va creuser la plaque.', ok: c => c.objs.some(o => o.type === 'text' && o.kind === 'hole') },
      { t: 'Gravure à 1 mm de profondeur', h: 'Place le texte sur la plaque, puis monte-le avec la poignée ⇕ jusqu’à 3 mm (plaque de 4 mm − 1 mm). Pour être précis : Propriétés → « Position précise » → Z. Le texte dépasse au-dessus : c’est voulu, seul le bas creuse.', ok: c => c.objs.some(o => o.type === 'text' && o.kind === 'hole' && c.box(o).min.y > 0.4) },
      { t: 'Bonus : un trou pour accrocher la clé', h: 'Percer → « Ficelle / anneau de porte-clés ».', optional: true, ok: c => c.ev.has('drill') },
      { t: 'Aperçu final puis téléchargement', h: 'Vérifie la gravure avec l’aperçu final, puis télécharge.', sel: '#btn-export', ok: c => c.ev.has('export') },
    ],
  },
  {
    id: 'libre', icon: '🖨️', title: 'Mon projet libre', desc: 'Pour ton propre objet : les bonnes étapes, de l’idée au fichier pour l’imprimante.',
    steps: [
      { t: 'Dessine ton objet sur papier et note ses mesures', h: 'Une esquisse avec les mesures en millimètres (prends une règle !). Quand c’est fait, clique sur « Passer ».', optional: true, ok: () => false },
      { t: 'Pose les formes principales', h: 'Assemble au moins deux formes (colonne de gauche) ou utilise un outil magique : Boîte, Silhouette.', ok: c => solids(c).length >= 2 || c.objs.some(o => ['box', 'silhouette'].includes(o.type)) },
      { t: 'Ajoute un trou ou un perçage', h: 'Une forme en mode « Trou », ou l’outil « Percer » pour une LED, une vis, une ficelle…', sel: '#tool-drill', ok: c => holes(c).length > 0 },
      { t: 'Vérifie que rien ne flotte', h: 'Chaque pièce doit être posée sur le plateau ou sur une autre pièce. Sélectionne-la et clique « Poser » si Pixel affiche un avertissement.',
        ok: c => solids(c).length > 0 && solids(c).every(s => c.box(s).min.y <= 0.1 || solids(c).some(o => o !== s && c.touch(o, s))) },
      { t: 'Regarde l’aperçu final', h: 'Le bouton « Aperçu final » montre ce que l’imprimante va fabriquer.', sel: '#btn-preview', ok: c => c.ev.has('preview') },
      { t: 'Enregistre ton projet', h: 'Fichier → « Enregistrer sur l’ordinateur » : tu pourras le reprendre ou le rendre au professeur.', sel: '#btn-file', ok: c => c.ev.has('save') },
      { t: 'Télécharge le fichier pour l’imprimante', h: 'Bouton « Télécharger » en haut à droite, format STL.', sel: '#btn-export', ok: c => c.ev.has('export') },
    ],
  },
];

/* ---------- Guide complet ---------- */
export const GUIDE = [
  { t: '🖱️ Bouger la vue', h: `
    <p><b>Tourner autour :</b> clic gauche <i>dans le vide</i> + bouger la souris.</p>
    <p><b>Glisser la vue :</b> clic droit + bouger la souris.</p>
    <p><b>Zoomer :</b> molette de la souris.</p>
    <p>Les boutons en bas de la vue te ramènent à une vue simple : <b>Dessus</b>, <b>Face</b>, <b>Côté</b>. Le bouton <b>🎯 Cadrer</b> zoome sur ce que tu as sélectionné.</p>
    <p>Le mot <b>AVANT</b> écrit sur le plateau t’indique où est l’avant.</p>` },
  { t: '🧱 Poser et modifier une forme', h: `
    <p>Clique sur une forme à gauche : elle apparaît sur le plateau, <b>déjà sélectionnée</b> (cadre jaune).</p>
    <p><b>Déplacer :</b> clique dessus et glisse. Elle avance par pas de la grille (1 mm par défaut, réglable en bas).</p>
    <p><b>Taille :</b> tire les <b>petits carrés blancs</b> aux coins (ou les ronds sur les bords) pour agrandir ; le rond orange du dessus change la hauteur. Maintiens <b>Maj</b> pour garder les proportions. Tu peux aussi cliquer sur une mesure et la taper.</p><p><b>Déplacer sur un axe :</b> bouton ✥ <b>Flèches 3D</b> (touche M) : rouge = gauche ↔ droite, vert = monter / descendre, bleu = avant ↔ arrière.</p>
    <p><b>Hauteur :</b> la case Z dit à quelle hauteur est le bas de l’objet. <b>Poser</b> le fait descendre sur ce qui est en dessous (le plateau ou une autre pièce).</p>
    <p><b>Tourner :</b> bouton <b>Tourner en 3D</b> (touche R) : tire un des 3 anneaux, par pas de 15°. Le bouton ⤵ <b>Retourner</b> met l’objet la tête en bas (pour percer le fond d’une boîte). Pour des angles précis : Propriétés → Tourner.</p>` },
  { t: '🕳️ Matière, trou, repère', h: `
    <p>Chaque objet a un rôle :</p>
    <ul><li><b>🧱 Matière</b> : sera imprimé en plastique.</li>
    <li><b>🕳️ Trou</b> (rouge transparent) : creuse toutes les pièces qu’il traverse. Rien à fusionner : c’est fait automatiquement dans l’aperçu et au téléchargement.</li>
    <li><b>👻 Repère</b> (gris) : n’est jamais imprimé. Il sert à vérifier qu’une carte ou une pile rentre.</li></ul>
    <p>Un trou doit <b>dépasser un peu</b> des deux côtés de la paroi pour bien la traverser.</p>
    <p><b>Graver un texte :</b> mets le texte en Trou et ne l’enfonce que de 1 mm dans la pièce.</p>` },
  { t: '🔩 Percer en un clic', h: `
    <p>L’outil <b>Percer</b> fait le travail difficile à ta place :</p>
    <ol><li>Choisis ce que tu veux faire passer (LED, bouton, câble USB, vis…). Le diamètre est déjà réglé, avec un petit jeu pour que ça rentre.</li>
    <li>Survole une pièce : un trou rouge montre où il sera.</li>
    <li>Clique : c’est percé ! La profondeur est automatique, le trou traverse juste l’épaisseur de la paroi (pas le fond de la boîte derrière).</li></ol>
    <p>Tu peux percer plusieurs fois. <b>Échap</b> ou « Terminer » pour arrêter.</p>
    <p>Le trou percé est un objet comme les autres : tu peux le déplacer, changer son diamètre ou le supprimer.</p>` },
  { t: '📦 Boîte avec couvercle', h: `
    <p>Choisis la <b>forme</b> : rectangle, coins arrondis, rond / ovale, hexagone ou octogone.</p><p>Donne la place qu’il te faut <b>à l’intérieur</b> (par exemple la taille de ta carte Arduino + 5 mm de chaque côté). L’assistant ajoute les parois et le fond.</p>
    <p>Le <b>couvercle</b> a un rebord qui s’emboîte dans la boîte. Le <b>jeu</b> (0,3 mm) laisse un peu de place pour qu’il rentre sans forcer : augmente-le s’il est trop serré.</p>
    <p><b>Hauteur du couvercle</b> : 0 = couvercle plat ; plus grand = le couvercle a des bords, la boîte se ferme comme deux moitiés.</p><p>Le couvercle est posé à l’envers (plaque en bas) : c’est le bon sens pour l’imprimer.</p>
    <p>Pour placer tes composants, ajoute des <b>repères</b> (Arduino, boutons…) et active <b>Rayons X</b>.</p>` },
  { t: '✂️ Silhouette (théâtre d’ombre)', h: `
    <p>L’atelier Silhouette transforme un <b>dessin noir et blanc</b> en pièce plate, <b>à la taille réelle</b> de ton dessin sur la feuille.</p>
    <ul><li>Choisis l’<b>épaisseur du trait</b> en mm (1,7 mm, c’est bien) : tous tes traits auront exactement cette épaisseur.</li>
    <li><b>Libre</b> pour dessiner à main levée, <b>Droit</b> pour un trait droit (Maj : horizontal, vertical ou 45°), <b>Courbe</b> (glisse, puis bouge la souris pour courber, puis clique), <b>Cercle</b> et <b>Rectangle</b>.</li>
    <li><b>Remplir</b> : clique dans une zone fermée pour la noircir. Les zones blanches à l’intérieur deviennent des trous (yeux, motifs).</li>
    <li><b>Zoomer</b> avec la molette de la souris (là où est la souris) ; <b>se déplacer</b> en glissant avec le clic droit, ou Espace + glisser, ou l’outil <b>Déplacer</b>. Touche 0 : toute la feuille.</li>
    <li><b>Gomme</b> : le cercle rouge montre exactement ce qui sera effacé.</li>
    <li><b>Quadrillage</b> : un carreau = 5 mm (les millimètres apparaissent quand on zoome). <b>Aimanter</b> accroche les traits aux carreaux.</li>
    <li><b>Symétrie</b> : ce que tu dessines d’un côté apparaît aussi de l’autre côté.</li>
    <li><b>Importer une image</b> : règle le « Seuil » pour bien séparer le noir du blanc.</li></ul>
    <p>Pour corriger plus tard : <b>double-clic</b> sur la silhouette (ou bouton ✏️ <b>Modifier le dessin</b>).</p>` },
  { t: '🔗 Fusionner et aligner', h: `
    <p>Sélectionne plusieurs objets : <b>Maj + clic</b> sur chacun, ou <b>Ctrl + A</b> pour tout prendre.</p>
    <p><b>Fusionner</b> en fait une seule pièce : la matière se colle, les trous sélectionnés creusent. Pour les séparer plus tard : sélectionne la pièce et clique <b>Défusionner</b> (Ctrl + Maj + G) ; les objets reviennent à leur place.</p>
    <p><b>Aligner</b> : sur les 3 axes (gauche / centre / droite, arrière / centre / avant, bas / milieu / haut). Les pièces s’alignent sur la plus grande, qui ne bouge pas. Pratique pour centrer un trou dans un cylindre ou coller une pièce contre un bord !</p><p>Avec plusieurs pièces sélectionnées, les <b>flèches 3D</b> et les <b>anneaux 3D</b> les déplacent ou les tournent toutes ensemble.</p>` },
  { t: '🖨️ Télécharger et imprimer', h: `
    <p><b>STL</b> : le format le plus courant pour les imprimantes 3D. <b>OBJ</b> : accepté par la plupart des logiciels 3D.</p>
    <p>Ouvre le fichier dans le logiciel de l’imprimante (Cura, PrusaSlicer, Bambu Studio…). Les mesures sont en millimètres.</p>
    <p><b>Conseils pour que ça marche du premier coup :</b></p>
    <ul><li>Une grande face plate posée sur le plateau.</li>
    <li>Pas de partie qui flotte dans le vide.</li>
    <li>Parois d’au moins 1,2 mm (2 mm, c’est solide).</li>
    <li>Pour que deux pièces s’emboîtent, laisse 0,2 à 0,3 mm de jeu.</li>
    <li>Texte : au moins 5 mm de haut, gravé ou en relief de 1 mm.</li></ul>` },
  { t: '⌨️ Raccourcis clavier', h: `
    <table class="keys">
    <tr><td>Suppr</td><td>Supprimer</td></tr><tr><td>Ctrl + Z / Ctrl + Y</td><td>Annuler / Rétablir</td></tr>
    <tr><td>Ctrl + D</td><td>Dupliquer</td></tr><tr><td>Ctrl + A</td><td>Tout sélectionner</td></tr>
    <tr><td>Ctrl + G</td><td>Fusionner</td></tr><tr><td>Ctrl + Maj + G</td><td>Défusionner</td></tr><tr><td>M</td><td>Flèches 3D (déplacer sur un axe)</td></tr><tr><td>R</td><td>Anneaux 3D (tourner)</td></tr><tr><td>Flèches</td><td>Déplacer de 1 pas (Maj : 10 pas)</td></tr>
    <tr><td>Page ↑ / Page ↓</td><td>Monter / descendre</td></tr><tr><td>D</td><td>Poser</td></tr>
    <tr><td>H / S</td><td>Trou / Matière</td></tr><tr><td>P</td><td>Outil Percer</td></tr>
    <tr><td>Échap</td><td>Arrêter l’outil / désélectionner</td></tr></table>` },
];

export const TIPS = [
  'Un trou doit dépasser un peu des deux côtés pour bien traverser.',
  'L’imprimante met environ 1 minute par centimètre cube : une petite pièce s’imprime vite !',
  'Ajoute 0,2 à 0,3 mm de jeu quand deux pièces doivent s’emboîter.',
  'Une paroi de 2 mm est solide. En dessous de 1 mm, elle risque de casser.',
  'Pose toujours ta pièce sur sa plus grande face plate.',
  'Les repères gris ne sont jamais imprimés : utilise-les pour mesurer.',
  'Le mode Rayons X permet de voir ce qu’il y a dans une boîte.',
  'Pour graver un texte, mets-le en Trou et enfonce-le de 1 mm seulement.',
  'Une pièce qui flotte au-dessus du plateau ne peut pas s’imprimer : clique « Poser ».',
  'Les angles de plus de 45° dans le vide ont besoin de supports à l’impression.',
  'Mesure tes composants avec une règle ou un pied à coulisse avant de percer.',
  'Tu peux annuler n’importe quelle erreur avec Ctrl + Z.',
];

/* ---------- Message de l'assistant selon ce que fait l'élève ---------- */
const TYPE_TIPS = {
  box: 'C’est une <b>boîte creuse</b>. Pour les boutons, LED et câbles, utilise l’outil <b>🔩 Percer</b> : il traverse juste la paroi.',
  lid: 'C’est le <b>couvercle</b>, posé à l’envers pour l’impression. Perce les trous des boutons dans la plaque (à l’intérieur du rebord).',
  text: 'Change le texte dans Propriétés. Pour <b>graver</b> : mets-le en <b>Trou</b> et enfonce-le de 1 mm dans une pièce.',
  silhouette: 'Ta silhouette est prête. <b>✏️ Modifier le dessin</b> pour la corriger, <b>🔩 Percer</b> pour la baguette ou les articulations.',
  custom: 'C’est une pièce fusionnée : elle ne fait plus qu’un seul bloc. Pour revenir en arrière : ↶ Annuler.',
  tube: 'Un tube est creux : règle l’épaisseur de sa paroi dans Propriétés.',
};
export function contextTip(c) {
  if (c.preview) return '👁 <b>Aperçu final</b> : voici ton objet tel qu’il sera imprimé, les trous ont creusé la matière.<br>Clique dans la vue ou sur « Aperçu final » pour revenir à l’édition.';
  if (c.mode === 'drill') return '🔩 <b>Mode Percer</b> : choisis ce que tu veux faire passer dans le panneau en haut, survole une pièce et <b>clique</b> pour percer.<br>La profondeur est automatique : le trou traverse juste l’épaisseur de la paroi. <b>Échap</b> pour terminer.';
  if (!c.count) return '👋 <b>Bienvenue !</b> Choisis un point de départ au milieu de l’écran. Je suis là pour t’expliquer chaque bouton : passe simplement la souris dessus.';
  if (!c.sel.length) return '👆 Clique sur un objet pour le sélectionner, puis fais-le glisser pour le déplacer.<br><span class="muted">Clic gauche dans le vide : tourner · clic droit : glisser · molette : zoomer.</span>';
  if (c.sel.length > 1) return `🧩 <b>${c.sel.length} objets sélectionnés.</b> <b>Fusionner</b> en fait une seule pièce (les trous sélectionnés creusent la matière). <b>Centrer</b> les aligne entre eux.`;
  const o = c.sel[0];
  if (o.kind === 'hole') return '🕳️ <b>Ceci est un trou</b> (rouge). Il creusera toutes les pièces qu’il traverse, dans l’aperçu et au téléchargement. Il doit dépasser un peu de chaque côté pour bien percer.';
  if (o.kind === 'ghost') return '👻 <b>Ceci est un repère</b> : il ne sera <b>pas imprimé</b>. Il sert à vérifier que ton composant rentre. Active <b>Rayons X</b> pour le voir à travers les parois.' + (o.help ? `<br><span class="muted">${o.help}</span>` : '');
  return (TYPE_TIPS[o.type] || '🧱 <b>Matière</b> : cet objet sera imprimé. Glisse-le pour le déplacer, tape ses mesures dans Propriétés, ou mets-le en <b>Trou</b> pour qu’il creuse.');
}
