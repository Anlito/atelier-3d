// Atelier Silhouette : dessin noir et blanc à l'échelle réelle -> contours -> pièce plate.
// La feuille est un carré de « sheet » mm ; tous les traits ont une épaisseur fixe en mm.
const $ = s => document.querySelector(s);
const W = 1280, H = 1280; // assez fin pour zoomer sur les détails (≈ 0,12 mm par point sur une feuille de 150 mm)
let cv, ctx, ov, octx, tool = 'free', sym = false, undo = [], orig = null, onDone = null, onDraw = null;
let drag = null;          // geste en cours : { tool, a, b, phase }
let cursor = null;        // dernière position de la souris (pour l'aperçu)
// Vue de la feuille : zoom à la molette, déplacement (clic droit, clic molette, Espace ou outil Main)
let gv, gctx, ovPending = false;
// Mémoire des remplissages : pour chaque point, le numéro du remplissage qui l'a noirci (0 = trait ou rien).
// Elle permet de « déremplir » une zone en gardant les traits. Copiée seulement quand elle change (l'historique en garde des versions).
let fm = new Uint8Array(W * H), fmShared = false, fillN = 0, maskDirty = false, mctx = null;
const fmw = () => { if (fmShared) { fm = fm.slice(); fmShared = false; } return fm; };
const fmReset = () => { fm = new Uint8Array(W * H); fmShared = false; };
const nextFill = () => (fillN = fillN % 255 + 1);
let picked = null; // dernière forme déplacée : { fc (noir), wc (blanc), x, y, w, h } pour les flèches du clavier et Suppr
let board, stage, zoom = 1, panX = 0, panY = 0, base = 600, pan = null, space = false;

// taille (mm) que représente la feuille dessinée ; elle ne change qu'avec setSheet(), qui redimensionne le dessin
let sheet = 150;
const sheetMm = () => sheet;
const readSheet = () => Math.max(20, Math.min(1000, +$('#sil-sheet').value || 150));
const mmPerPx = () => sheetMm() / W;
const strokePx = () => Math.max(0.5, +$('#sil-w').value || 1.7) / mmPerPx();
const snapOn = () => $('#sil-snap').checked;
const eraserPx = () => Math.max(strokePx() * 3, 3 / mmPerPx());

export function initSilhouette() {
  cv = $('#sil-canvas'); cv.width = W; cv.height = H;
  ctx = cv.getContext('2d');
  gv = $('#sil-gridc'); gv.width = W; gv.height = H; gctx = gv.getContext('2d');
  ov = $('#sil-overlay'); ov.width = W; ov.height = H; octx = ov.getContext('2d');
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H; mctx = mc.getContext('2d');
  clear();
  document.querySelectorAll('[data-sil-tool]').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.silTool; drag = null; picked = null;
    document.querySelectorAll('[data-sil-tool]').forEach(x => x.classList.toggle('on', x === b));
    setCursor(); overlay();
  }));
  $('#sil-sym').addEventListener('change', e => { sym = e.target.checked; overlay(); });
  for (const id of ['#sil-grid', '#sil-snap']) $(id).addEventListener('change', () => overlay());
  $('#sil-w').addEventListener('input', () => { overlay(); info(); });
  $('#sil-sheet').addEventListener('change', () => setSheet(readSheet()));
  $('#sil-sheet').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setSheet(readSheet()); } });
  $('#sil-undo').addEventListener('click', () => {
    const d = undo.pop(); if (!d) return; picked = null;
    ctx.putImageData(d.img, 0, 0);
    fm = d.fm; fmShared = undo.some(u => u.fm === fm); maskDirty = false; mctx?.clearRect(0, 0, W, H);
    if (d.sheet !== sheet) { sheet = d.sheet; $('#sil-sheet').value = sheet; gridKey = ''; overlay(); }
    info();
  });
  $('#sil-clear').addEventListener('click', () => { picked = null; pushUndo(); clear(); fmReset(); orig = null; $('#sil-imgopts').hidden = true; info(); });
  $('#sil-import').addEventListener('click', () => $('#sil-file').click());
  $('#sil-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) importImage(f); e.target.value = ''; });
  $('#sil-thr').addEventListener('input', applyThreshold);
  $('#sil-inv').addEventListener('change', applyThreshold);
  $('#sil-ok').addEventListener('click', finish);
  $('#sil-cancel').addEventListener('click', () => $('#dlg-sil').close());
  $('#dlg-sil').addEventListener('keydown', e => {
    if (e.key === 'Escape' && drag) { e.preventDefault(); drag = null; overlay(); }
    if (e.target.matches('input')) return;
    if (e.key === 'Escape' && drag?.tool === 'move') { e.preventDefault(); cancelMove(); return; }
    if (picked && tool === 'move' && !drag) {
      const st = (e.shiftKey ? 5 : 1) / mmPerPx(), dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (dir) { e.preventDefault(); pushUndo(); nudge(dir[0] * st, dir[1] * st); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); pushUndo(); ctx.drawImage(picked.wc, picked.x, picked.y); writeIds(picked, true); picked = null; overlay(); info(); onDraw?.(); return; }
    }
    if (e.code === 'Space') { e.preventDefault(); if (!space) { space = true; setCursor(); overlay(); } }
    if (e.key === '+' || e.key === '=') zoomAt(null, null, 1.25);
    if (e.key === '-') zoomAt(null, null, 1 / 1.25);
    if (e.key === '0') fitView();
  });
  $('#dlg-sil').addEventListener('keyup', e => { if (e.code === 'Space') { space = false; setCursor(); } });

  // ----- zoom et déplacement dans la feuille -----
  board = $('#sil-board'); stage = $('#sil-stage');
  new ResizeObserver(() => layout()).observe(board);
  board.addEventListener('wheel', e => {
    e.preventDefault();
    const r = board.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.0022));
  }, { passive: false });
  board.addEventListener('contextmenu', e => e.preventDefault());
  board.addEventListener('pointerdown', e => {
    if (e.target.closest('.sil-zoom')) return;
    if (!(e.button === 1 || e.button === 2 || space || tool === 'pan')) return;
    e.preventDefault(); e.stopPropagation();
    pan = { x: e.clientX, y: e.clientY, px: panX, py: panY };
    board.setPointerCapture(e.pointerId); board.classList.add('panning'); overlay();
  }, true);
  board.addEventListener('pointermove', e => {
    if (!pan) return;
    panX = pan.px + e.clientX - pan.x; panY = pan.py + e.clientY - pan.y; layout();
  });
  const endPan = () => { if (pan) { pan = null; board.classList.remove('panning'); } };
  board.addEventListener('pointerup', endPan); board.addEventListener('pointercancel', endPan);
  $('#sil-zin').addEventListener('click', () => zoomAt(null, null, 1.5));
  $('#sil-zout').addEventListener('click', () => zoomAt(null, null, 1 / 1.5));
  $('#sil-zfit').addEventListener('click', fitView);

  cv.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const p = pt(e, tool !== 'free' && tool !== 'eraser' && tool !== 'fill' && tool !== 'move');
    if (drag?.phase === 'bend') { // 3e temps de la courbe : on la pose
      pushUndo(); stroke(path('curve', drag.a, drag.b, p)); drag = null; overlay(); onDraw?.(); info(); return;
    }
    if (tool === 'move') { startMove(p, e.ctrlKey || e.altKey); if (drag) cv.setPointerCapture(e.pointerId); return; }
    if (tool === 'fill') { pushUndo(); fillAt(p[0] | 0, p[1] | 0); onDraw?.(); info(); return; }
    cv.setPointerCapture(e.pointerId);
    if (tool === 'free' || tool === 'eraser') { pushUndo(); drag = { tool, last: p }; stroke(path('line', p, p)); return; }
    drag = { tool, a: p, b: p, phase: 'drag' };
  });
  cv.addEventListener('pointermove', e => {
    if (drag?.tool === 'move') {
      const p = pt(e, false); cursor = p;
      let dx = p[0] - drag.start[0], dy = p[1] - drag.start[1];
      if (snapOn()) { const g = 5 / mmPerPx(); dx = Math.round(dx / g) * g; dy = Math.round(dy / g) * g; }
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; } // Maj : tout droit
      const q = drag.sel; // la forme reste sur la feuille
      dx = Math.max(-q.x, Math.min(W - q.x - q.w, dx)); dy = Math.max(-q.y, Math.min(H - q.y - q.h, dy));
      drag.dx = dx; drag.dy = dy;
      const mm = mmPerPx(), el = $('#sil-pos'), f = v => (Math.round(v * mm * 10) / 10).toLocaleString('fr-FR');
      el.hidden = false; el.textContent = `déplacé de ${f(dx)} ; ${f(dy)} mm`;
      requestOverlay(); return;
    }
    const snap = drag && drag.tool !== 'free' && drag.tool !== 'eraser' || tool === 'line' || tool === 'curve' || tool === 'rect' || tool === 'ellipse';
    const p = pt(e, snap); cursor = p;
    showPos(p);
    if (drag && (drag.tool === 'free' || drag.tool === 'eraser')) {
      const evs = e.getCoalescedEvents?.() || [];
      const pts = evs.length ? evs.map(ev => pt(ev, false)) : [p];
      stroke(g => { g.beginPath(); g.moveTo(drag.last[0], drag.last[1]); for (const q of pts) g.lineTo(q[0], q[1]); });
      drag.last = pts[pts.length - 1];
      requestOverlay(); return;
    }
    if (drag?.phase === 'drag') drag.b = constrain(drag.tool, drag.a, p, e.shiftKey);
    requestOverlay();
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return;
    if (drag.tool === 'move') { endMove(); return; }
    if (drag.tool === 'free' || drag.tool === 'eraser') { drag = null; onDraw?.(); info(); return; }
    if (drag.phase !== 'drag') return;
    const { a, b } = drag;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) { drag = null; overlay(); return; } // simple clic : rien
    if (drag.tool === 'curve') { drag.phase = 'bend'; overlay(); return; }    // 2e temps : courber
    pushUndo(); stroke(path(drag.tool, a, b)); drag = null; overlay(); onDraw?.(); info();
  });
  cv.addEventListener('pointerleave', () => { cursor = null; $('#sil-pos').hidden = true; overlay(); });
}

let leadHTML = null;
export function openSilhouette(opts, done, draw) {
  // mode « forme de boîte » : même atelier, autres consignes
  const box = opts.mode === 'box';
  leadHTML ??= $('#sil-lead').innerHTML;
  $('#sil-title span').textContent = box ? 'Forme de ta boîte (vue de dessus)' : 'Atelier Silhouette';
  $('#sil-lead').innerHTML = box
    ? 'Dessine le contour de l’<b>intérieur</b> de ta boîte, vu de dessus, puis <b>remplis</b>-le en noir. Le quadrillage donne les vraies mesures (un carreau = 5 mm). Si tu dessines plusieurs formes, seule la plus grande sert.'
    : leadHTML;
  $('#sil-t-wrap').hidden = box;
  onDone = done; onDraw = draw; undo = []; orig = null; drag = null;
  $('#sil-imgopts').hidden = true;
  sheet = opts.sheet || 150; $('#sil-sheet').value = sheet; gridKey = ''; picked = null;
  $('#sil-t').value = opts.thickness || 2;
  clear(); fmReset(); fillN = 0; maskDirty = false; mctx.clearRect(0, 0, W, H);
  if (opts.src) {
    const im = new Image();
    im.onload = () => {
      ctx.drawImage(im, 0, 0, W, H);
      if (opts.fills) { // la mémoire des remplissages, enregistrée dans une image (le rouge = numéro)
        const fi = new Image();
        fi.onload = () => {
          const c = document.createElement('canvas'); c.width = W; c.height = H;
          const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(fi, 0, 0, W, H);
          const d = g.getImageData(0, 0, W, H).data;
          for (let i = 0; i < W * H; i++) { fm[i] = d[i * 4]; if (d[i * 4] > fillN) fillN = d[i * 4]; }
        };
        fi.src = opts.fills;
      }
      // ancienne silhouette : on retrouve la taille de feuille qui redonne la même hauteur de pièce
      if (!opts.sheet && opts.fitHeight) { const { bh, empty } = binarize(); if (!empty) { sheet = Math.round(opts.fitHeight * W / bh); $('#sil-sheet').value = sheet; gridKey = ''; } }
      overlay(); info();
    };
    im.src = opts.src;
  }
  $('#sil-ok').textContent = box ? '✔ Utiliser cette forme' : opts.edit ? '✔ Mettre à jour la pièce' : '✔ Créer la pièce 3D';
  $('#sil-msg').textContent = '';
  $('#dlg-sil').showModal();
  space = false; setCursor(); fitView();
  overlay(); info();
}

/* ---------- vue : zoom et déplacement ---------- */
function layout() {
  if (!board) return;
  const bw = board.clientWidth, bh = board.clientHeight;
  if (!bw || !bh) return;
  base = Math.max(100, Math.min(bw - 28, bh - BAR - 14));
  // on garde toujours un bout de feuille visible
  const s = base * zoom, m = 60, [ox, oy] = origin(s);
  panX = Math.max(m - ox - s, Math.min(bw - m - ox, panX));
  panY = Math.max(m - oy - s, Math.min(bh - m - oy, panY));
  stage.style.width = stage.style.height = base + 'px';
  stage.style.transform = `translate(${ox + panX}px, ${oy + panY}px) scale(${zoom})`;
  $('#sil-zlvl').textContent = Math.round(zoom * 100) + ' %';
  overlay();
}
const BAR = 46; // place gardée en bas pour la barre de zoom
// coin haut-gauche de la feuille (de taille s à l'écran) quand elle n'est pas déplacée : centrée au-dessus de la barre de zoom
const origin = s => [(board.clientWidth - s) / 2, (board.clientHeight - BAR + 4 - s) / 2];
/** Zoome autour d'un point de la zone (en px), ou autour du centre. */
function zoomAt(mx, my, f) {
  const bw = board.clientWidth, bh = board.clientHeight;
  if (mx == null) { mx = bw / 2; my = bh / 2; }
  const z = Math.max(1, Math.min(16, zoom * f)); if (z === zoom) return;
  // le point de la feuille sous la souris reste sous la souris
  const [ox, oy] = origin(base * zoom), sx = (mx - ox - panX) / zoom, sy = (my - oy - panY) / zoom;
  zoom = z;
  const [nx, ny] = origin(base * z);
  panX = mx - sx * z - nx; panY = my - sy * z - ny;
  layout();
}
function fitView() { zoom = 1; panX = panY = 0; layout(); }
/* ---------- déplacer une forme : tout ce qui se touche bouge ensemble ---------- */
/** Trouve la forme sous le point p (avec un peu de tolérance), la retire du dessin (sauf copie) et la renvoie. */
function lift(p, copy) {
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  const lum = i => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2];
  const x0 = Math.round(p[0]), y0 = Math.round(p[1]);
  const R = Math.max(3, Math.round(5 * W / (base * zoom))); // ~5 pixels d'écran autour du clic
  let seed = -1;
  for (let r = 0; r <= R && seed < 0; r++) for (let dy = -r; dy <= r && seed < 0; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x >= 0 && y >= 0 && x < W && y < H && lum(y * W + x) < 384) { seed = y * W + x; break; }
  }
  if (seed < 0) return null;
  // tous les points pas blancs reliés au point cliqué (bords adoucis et diagonales compris)
  const seen = new Uint8Array(W * H), list = [], stack = [seed];
  let minx = W, miny = H, maxx = 0, maxy = 0;
  seen[seed] = 1;
  while (stack.length) {
    const i = stack.pop(); list.push(i);
    const x = i % W, y = (i / W) | 0;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx; if (!seen[j] && lum(j) < 735) { seen[j] = 1; stack.push(j); }
    }
  }
  const w = maxx - minx + 1, h = maxy - miny + 1;
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const fc = mk(), wc = mk(), fi = new ImageData(w, h), wi = new ImageData(w, h), ids = new Uint8Array(w * h);
  flushMask();
  const f = fmw(), renum = new Map(); // une copie reçoit ses propres numéros de remplissage
  for (const i of list) {
    const x = i % W - minx, y = ((i / W) | 0) - miny, o = (y * w + x) * 4;
    if (f[i]) {
      if (copy) { if (!renum.has(f[i])) renum.set(f[i], nextFill()); ids[y * w + x] = renum.get(f[i]); }
      else { ids[y * w + x] = f[i]; f[i] = 0; }
    }
    fi.data[o + 3] = 255 - lum(i) / 3;                                          // noir, avec ses bords adoucis
    wi.data[o] = wi.data[o + 1] = wi.data[o + 2] = 255; wi.data[o + 3] = 255;   // de quoi l'effacer
    if (!copy) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
  }
  fc.getContext('2d').putImageData(fi, 0, 0); wc.getContext('2d').putImageData(wi, 0, 0);
  if (!copy) ctx.putImageData(id, 0, 0);
  return { fc, wc, ids, x: minx, y: miny, w, h };
}
/** Écrit (ou efface) les numéros de remplissage de la forme à sa place actuelle. */
function writeIds(sel, erase) {
  const f = fmw();
  for (let y = 0; y < sel.h; y++) for (let x = 0; x < sel.w; x++) {
    const n = sel.ids[y * sel.w + x]; if (!n) continue;
    const X = sel.x + x, Y = sel.y + y; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    if (erase) { if (f[Y * W + X] === n) f[Y * W + X] = 0; } else f[Y * W + X] = n;
  }
}
function startMove(p, copy) {
  pushUndo();
  const sel = lift(p, copy);
  if (!sel) { undo.pop(); picked = null; overlay(); $('#sil-msg').textContent = 'Clique sur un trait ou une zone noire pour la déplacer.'; return; }
  $('#sil-msg').textContent = '';
  drag = { tool: 'move', start: p, sel, dx: 0, dy: 0, copy };
  overlay();
}
function endMove() {
  const { sel, dx, dy } = drag; drag = null;
  sel.x = Math.round(sel.x + dx); sel.y = Math.round(sel.y + dy);
  ctx.drawImage(sel.fc, sel.x, sel.y); writeIds(sel);
  if (!dx && !dy) undo.pop(); // simple clic : la forme est juste choisie
  picked = sel; overlay(); info(); onDraw?.();
}
function cancelMove() {
  const { sel, copy } = drag; drag = null;
  if (!copy) { ctx.drawImage(sel.fc, sel.x, sel.y); writeIds(sel); }
  undo.pop(); picked = null; overlay();
}
function nudge(dx, dy) {
  ctx.drawImage(picked.wc, picked.x, picked.y); writeIds(picked, true);
  picked.x = Math.max(0, Math.min(W - picked.w, Math.round(picked.x + dx))); picked.y = Math.max(0, Math.min(H - picked.h, Math.round(picked.y + dy)));
  ctx.drawImage(picked.fc, picked.x, picked.y); writeIds(picked);
  overlay(); info(); onDraw?.();
}
function setCursor() {
  if (!cv) return;
  board?.classList.toggle('can-pan', space || tool === 'pan');
  cv.style.cursor = space || tool === 'pan' ? 'grab' : tool === 'move' ? 'move' : tool === 'fill' ? 'cell' : tool === 'eraser' || tool === 'free' ? 'none' : 'crosshair';
}

/* ---------- coordonnées, aimant, contraintes ---------- */
function pt(e, snap) {
  const r = cv.getBoundingClientRect();
  let x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
  if (snap && snapOn()) { const g = 5 / mmPerPx(); x = Math.round(x / g) * g; y = Math.round(y / g) * g; }
  return [x, y];
}
function constrain(t, a, b, shift) {
  if (!shift) return b;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (t === 'rect' || t === 'ellipse') { const m = Math.max(Math.abs(dx), Math.abs(dy)); return [a[0] + Math.sign(dx || 1) * m, a[1] + Math.sign(dy || 1) * m]; }
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy); // 0°, 45°, 90°…
  return [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len];
}
function showPos(p) {
  const el = $('#sil-pos'), mm = mmPerPx();
  el.hidden = false;
  const f = v => zoom >= 3 ? (Math.round(v * 10) / 10).toLocaleString('fr-FR') : Math.round(v);
  let t = `x ${f(p[0] * mm)} · y ${f(p[1] * mm)} mm`;
  if (drag?.phase === 'drag' && drag.tool !== 'free' && drag.tool !== 'eraser') {
    const dx = Math.abs(drag.b[0] - drag.a[0]) * mm, dy = Math.abs(drag.b[1] - drag.a[1]) * mm;
    t = drag.tool === 'line' || drag.tool === 'curve' ? `longueur ${Math.round(Math.hypot(dx, dy))} mm` : `${Math.round(dx)} × ${Math.round(dy)} mm`;
  }
  el.textContent = t;
}

/* ---------- tracés ---------- */
// Chaque tracé est une fonction qui dessine le chemin dans un contexte, pour le dessin ET pour l'aperçu.
function path(t, a, b, c) {
  return g => {
    g.beginPath();
    if (t === 'line') { g.moveTo(a[0], a[1]); g.lineTo(b[0] + 0.01, b[1]); }
    else if (t === 'curve') { g.moveTo(a[0], a[1]); g.quadraticCurveTo(2 * c[0] - (a[0] + b[0]) / 2, 2 * c[1] - (a[1] + b[1]) / 2, b[0], b[1]); } // passe par le point c
    else if (t === 'rect') g.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    else if (t === 'ellipse') g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2);
  };
}
function paint(g, draw, color, width) {
  g.save(); g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g); g.stroke();
  if (sym) { g.translate(W, 0); g.scale(-1, 1); draw(g); g.stroke(); }
  g.restore();
}
function stroke(draw) {
  const eraser = drag?.tool === 'eraser' || (!drag && tool === 'eraser');
  paint(ctx, draw, eraser ? '#fff' : '#000', eraser ? eraserPx() : strokePx());
  if (!eraser && fillN) { paint(mctx, draw, '#000', strokePx() + 2); maskDirty = true; }
}
/** Les points couverts par les derniers traits ne font plus partie d'un remplissage. */
function flushMask() {
  if (!maskDirty) return; maskDirty = false;
  const d = mctx.getImageData(0, 0, W, H).data, f = fmw();
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3]) f[i] = 0;
  mctx.clearRect(0, 0, W, H);
}

/* ---------- calque d'aide : quadrillage, axe de symétrie, aperçu du tracé ---------- */
function requestOverlay() { // au plus une fois par image
  if (ovPending) return; ovPending = true;
  requestAnimationFrame(() => { ovPending = false; drawCursorLayer(); });
}
let gridKey = '';
function drawGrid() {
  const k = W / (base * zoom), key = [k, $('#sil-grid').checked, sym, sheetMm()].join();
  if (key === gridKey) return; gridKey = key;
  const octx = gctx; // même code de dessin, sur le calque du quadrillage
  octx.clearRect(0, 0, W, H);
  const line = (x0, y0, x1, y1) => { octx.beginPath(); octx.moveTo(x0, y0); octx.lineTo(x1, y1); octx.stroke(); };
  if ($('#sil-grid').checked) {
    const mm = 1 / mmPerPx();
    octx.lineWidth = k;
    if (mm / k >= 9) { // assez zoomé : on ajoute les millimètres
      octx.strokeStyle = 'rgba(59,130,246,.08)';
      for (let i = 0; i <= W + 0.5; i += mm) { line(i, 0, i, H); line(0, i, W, i); }
    }
    for (let i = 0, n = 0; i <= W + 0.5; i += 5 * mm, n++) {
      octx.strokeStyle = n % 2 ? 'rgba(59,130,246,.16)' : 'rgba(59,130,246,.36)';
      line(i, 0, i, H); line(0, i, W, i);
    }
  }
  if (sym) { octx.strokeStyle = 'rgba(147,51,234,.6)'; octx.lineWidth = 1.5 * k; octx.setLineDash([6 * k, 5 * k]); line(W / 2, 0, W / 2, H); octx.setLineDash([]); }
}
function overlay() { if (gctx) drawGrid(); drawCursorLayer(); }
function drawCursorLayer() {
  if (!octx) return;
  octx.clearRect(0, 0, W, H);
  const k = W / (base * zoom);
  if (drag && drag.phase) {
    const draw = drag.phase === 'bend' ? path('curve', drag.a, drag.b, cursor || drag.b) : path(drag.tool === 'curve' ? 'line' : drag.tool, drag.a, drag.b);
    paint(octx, draw, 'rgba(37,99,235,.75)', strokePx());
    if (drag.phase === 'bend') { octx.fillStyle = '#2563eb'; for (const p of [drag.a, drag.b]) { octx.beginPath(); octx.arc(p[0], p[1], 4 * k, 0, 7); octx.fill(); } }
  }
  const box = (x, y, w, h) => { // cadre pointillé autour de la forme choisie
    const m = 4 * k;
    octx.lineWidth = 1.5 * k; octx.setLineDash([5 * k, 4 * k]); octx.strokeStyle = '#2563eb';
    octx.strokeRect(x - m, y - m, w + 2 * m, h + 2 * m); octx.setLineDash([]);
  };
  if (drag?.tool === 'move') { const q = drag.sel; octx.globalAlpha = 0.85; octx.drawImage(q.fc, q.x + drag.dx, q.y + drag.dy); octx.globalAlpha = 1; box(q.x + drag.dx, q.y + drag.dy, q.w, q.h); }
  else if (picked && tool === 'move') box(picked.x, picked.y, picked.w, picked.h);
  if (!cursor || pan || space || tool === 'pan') return;
  if (tool === 'free' || tool === 'eraser') { // la taille réelle du trait ou de la gomme, sous la souris
    const er = tool === 'eraser', r = (er ? eraserPx() : strokePx()) / 2;
    const ring = x => {
      octx.beginPath(); octx.arc(x, cursor[1], r, 0, 7);
      if (er) { octx.fillStyle = 'rgba(254,226,226,.45)'; octx.fill(); }
      octx.lineWidth = 3 * k; octx.strokeStyle = '#fff'; octx.stroke();
      octx.lineWidth = 1.4 * k; octx.strokeStyle = er ? '#dc2626' : '#2563eb'; octx.stroke();
      octx.beginPath(); octx.arc(x, cursor[1], 1.3 * k, 0, 7); octx.fillStyle = er ? '#dc2626' : '#2563eb'; octx.fill();
    };
    ring(cursor[0]); if (sym) ring(W - cursor[0]);
  } else if (snapOn() && tool !== 'fill') { octx.fillStyle = '#f59e0b'; octx.beginPath(); octx.arc(cursor[0], cursor[1], 4 * k, 0, 7); octx.fill(); }
}

/* ---------- remplissage, image importée ---------- */
function clear() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
function pushUndo() { flushMask(); undo.push({ img: ctx.getImageData(0, 0, W, H), sheet, fm }); fmShared = true; if (undo.length > 30) undo.shift(); }
/**
 * Change la taille de la feuille SANS changer la taille réelle du dessin :
 * plus grande feuille = plus de place autour (le dessin paraît plus petit), et l'inverse.
 * Le dessin reste centré au même endroit par rapport au milieu de la feuille.
 */
function setSheet(v) {
  if (v === sheet) return;
  const k = sheet / v, b = binarize();
  if (!b.empty && k > 1) { // feuille plus petite : le dessin doit encore tenir dedans
    const fits = [b.minx, b.maxx + 1].every(x => (x - W / 2) * k + W / 2 >= 0 && (x - W / 2) * k + W / 2 <= W) &&
      [b.miny, b.maxy + 1].every(y => (y - H / 2) * k + H / 2 >= 0 && (y - H / 2) * k + H / 2 <= H);
    if (!fits) {
      const need = Math.ceil(2 * Math.max(W / 2 - b.minx, b.maxx + 1 - W / 2, H / 2 - b.miny, b.maxy + 1 - H / 2) * sheet / W);
      $('#sil-sheet').value = sheet;
      $('#sil-msg').textContent = `Ton dessin ne tiendrait plus sur la feuille : il faut au moins ${need} mm.`;
      return;
    }
  }
  $('#sil-msg').textContent = '';
  pushUndo(); picked = null;
  const rescale = c => {
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    const t = tmp.getContext('2d'); t.drawImage(c, 0, 0);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.drawImage(tmp, (W - W * k) / 2, (H - H * k) / 2, W * k, H * k);
  };
  rescale(cv);
  if (orig) rescale(orig);
  // le gris des bords adoucis redevient noir ou blanc, comme le reste du dessin
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v2 = d[i] + d[i + 1] + d[i + 2] < 384 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v2; d[i + 3] = 255; }
  ctx.putImageData(id, 0, 0);
  if (fm.some(Boolean)) { // même agrandissement / réduction pour la mémoire des remplissages
    const old = fm, nf = new Uint8Array(W * H), c0 = (W - W * k) / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = Math.floor((x + 0.5 - c0) / k), sy = Math.floor((y + 0.5 - c0) / k);
      if (sx >= 0 && sy >= 0 && sx < W && sy < H && d[(y * W + x) * 4] === 0) nf[y * W + x] = old[sy * W + sx];
    }
    fm = nf; fmShared = false;
  }
  sheet = v; $('#sil-sheet').value = v;
  overlay(); info(); onDraw?.();
}
/**
 * Clic avec Remplir :
 * - dans du blanc : remplit la zone de noir (et retient ce remplissage) ;
 * - dans une zone remplie : la « dérempli » et les traits réapparaissent ;
 * - dans du noir qui n'a jamais été rempli (trait, image importée) : vide toute la zone noire.
 */
function fillAt(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  flushMask();
  const i0 = y * W + x;
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  const dark = i => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384;
  if (dark(i0) && fm[i0]) {
    const n = fm[i0], f = fmw();
    for (let i = 0; i < W * H; i++) if (f[i] === n) { f[i] = 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
    ctx.putImageData(id, 0, 0);
    $('#sil-msg').textContent = '';
    return;
  }
  const n = dark(i0) ? 0 : nextFill();
  flood(x, y, n, id);
  if (sym) flood(W - 1 - x, y, n, id);
  ctx.putImageData(id, 0, 0);
}
function flood(x, y, n, id) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const d = id.data, f = fmw();
  const dark = i => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384;
  const start = y * W + x, target = dark(start), val = target ? 255 : 0; // blanc -> noir, ou noir -> blanc
  const seen = new Uint8Array(W * H), stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || dark(i) !== target) continue;
    seen[i] = 1; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = val; d[i * 4 + 3] = 255; f[i] = n;
    const px = i % W;
    if (px > 0) stack.push(i - 1);
    if (px < W - 1) stack.push(i + 1);
    if (i >= W) stack.push(i - W);
    if (i < W * (H - 1)) stack.push(i + W);
  }
}
function importImage(file) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    pushUndo();
    orig = document.createElement('canvas'); orig.width = W; orig.height = H;
    const o = orig.getContext('2d');
    o.fillStyle = '#fff'; o.fillRect(0, 0, W, H);
    const k = Math.min(W * 0.92 / img.width, H * 0.92 / img.height), w = img.width * k, h = img.height * k;
    o.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    URL.revokeObjectURL(url);
    $('#sil-imgopts').hidden = false;
    applyThreshold(); onDraw?.();
  };
  img.onerror = () => { $('#sil-msg').textContent = 'Cette image ne peut pas être ouverte. Essaie un fichier PNG ou JPG.'; };
  img.src = url;
}
function applyThreshold() {
  if (!orig) return;
  const thr = +$('#sil-thr').value, inv = $('#sil-inv').checked;
  const id = orig.getContext('2d').getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    let dark = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < thr;
    if (inv) dark = !dark;
    d[i] = d[i + 1] = d[i + 2] = dark ? 0 : 255; d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0); fmReset(); info();
}
function binarize() {
  const d = ctx.getImageData(0, 0, W, H).data, bin = new Uint8Array(W * H);
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let i = 0; i < W * H; i++) if (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384) {
    bin[i] = 1; const x = i % W, y = (i / W) | 0;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  return { bin, bw: maxx - minx + 1, bh: maxy - miny + 1, minx, miny, maxx, maxy, empty: maxx < 0 };
}

// Taille réelle du dessin et solidité du trait
function info() {
  const { bw, bh, empty } = binarize(), mm = mmPerPx(), w = +$('#sil-w').value || 1.7;
  $('#sil-info').innerHTML = (empty ? 'La feuille est vide.' : `Ton dessin mesure <b>${Math.round(bw * mm)} × ${Math.round(bh * mm)} mm</b>.`) +
    `<br>Trait : <b>${w.toLocaleString('fr-FR')} mm</b>` +
    (w < 1.5 ? ' <span class="bad">⚠️ trop fin, ça risque de casser.</span>' : ' <span class="good">👍 solide.</span>') +
    `<br><span class="muted">Un carreau du quadrillage = 5 mm.</span>`;
}

/* ---------- du dessin aux contours ---------- */
function trace(bin) {
  const VW = W + 1, filled = (x, y) => x >= 0 && y >= 0 && x < W && y < H && bin[y * W + x] === 1;
  const E = [], out = new Map();
  const add = (ax, ay, bx, by) => { const id = E.length / 4; E.push(ax, ay, bx, by); const k = ay * VW + ax; const l = out.get(k); l ? l.push(id) : out.set(k, [id]); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!bin[y * W + x]) continue;
    if (!filled(x, y - 1)) add(x, y, x + 1, y);
    if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!filled(x - 1, y)) add(x, y + 1, x, y);
  }
  const n = E.length / 4, used = new Uint8Array(n), loops = [];
  for (let s = 0; s < n; s++) {
    if (used[s]) continue;
    const loop = []; let cur = s;
    while (cur >= 0 && !used[cur]) {
      used[cur] = 1;
      const ax = E[cur * 4], ay = E[cur * 4 + 1], bx = E[cur * 4 + 2], by = E[cur * 4 + 3];
      loop.push([ax, ay]);
      const dx = bx - ax, dy = by - ay, l = out.get(by * VW + bx);
      let next = -1, best = 9;
      if (l) for (const c of l) {
        if (used[c]) continue;
        const ox = E[c * 4 + 2] - E[c * 4], oy = E[c * 4 + 3] - E[c * 4 + 1];
        const cr = dx * oy - dy * ox, rank = cr > 0 ? 0 : cr === 0 ? 1 : 2;
        if (rank < best) { best = rank; next = c; }
      }
      cur = next;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
}
const area = l => { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += l[j][0] * l[i][1] - l[i][0] * l[j][1]; return a / 2; };
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  if (!L) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i], pts[a], pts[b]); if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplifyClosed(l, eps) {
  let far = 0, fd = -1;
  for (let i = 1; i < l.length; i++) { const d = (l[i][0] - l[0][0]) ** 2 + (l[i][1] - l[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const a = rdp(l.slice(0, far + 1), eps), b = rdp(l.slice(far).concat([l[0]]), eps);
  return a.concat(b.slice(1, -1));
}

function finish() {
  if (drag) { drag = null; overlay(); }
  const { bin, bw, bh, empty } = binarize();
  if (empty) { $('#sil-msg').textContent = 'Dessine d’abord ta silhouette en noir 🙂'; return; }
  const eps = +$('#sil-smooth').value || 1.2;
  const loops = trace(bin).map(l => simplifyClosed(l, eps)).filter(l => l.length >= 3 && Math.abs(area(l)) > 6);
  if (!loops.length) { $('#sil-msg').textContent = 'Le dessin est trop fin pour devenir une pièce. Épaissis le trait.'; return; }
  const mm = mmPerPx(), t = Math.max(0.4, +$('#sil-t').value || 2);
  $('#dlg-sil').close();
  // la pièce garde la taille réelle du dessin sur la feuille
  flushMask();
  let fills = null;
  if (fm.some(Boolean)) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), im = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { im.data[i * 4] = fm[i]; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0); fills = c.toDataURL('image/png');
  }
  onDone?.({ loops, fills, mmPx: mm, src: cv.toDataURL('image/png'), w: bw * mm, h: bh * mm, thickness: t, sheet: sheetMm() });
}
