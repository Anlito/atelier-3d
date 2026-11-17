// Atelier Silhouette : dessin noir et blanc à l'échelle réelle -> contours -> pièce plate.
// La feuille est un carré de « sheet » mm ; tous les traits ont une épaisseur fixe en mm.
const $ = s => document.querySelector(s);
const W = 1280, H = 1280; // assez fin pour zoomer sur les détails (≈ 0,12 mm par point sur une feuille de 150 mm)
let cv, ctx, ov, octx, tool = 'free', sym = false, undo = [], orig = null, onDone = null, onDraw = null;
let drag = null;          // geste en cours : { tool, a, b, phase }
let cursor = null;        // dernière position de la souris (pour l'aperçu)
// Vue de la feuille : zoom à la molette, déplacement (clic droit, clic molette, Espace ou outil Main)
let board, stage, zoom = 1, panX = 0, panY = 0, base = 600, pan = null, space = false;

const sheetMm = () => Math.max(20, +$('#sil-sheet').value || 150);
const mmPerPx = () => sheetMm() / W;
const strokePx = () => Math.max(0.5, +$('#sil-w').value || 1.7) / mmPerPx();
const snapOn = () => $('#sil-snap').checked;
const eraserPx = () => Math.max(strokePx() * 3, 3 / mmPerPx());

export function initSilhouette() {
  cv = $('#sil-canvas'); cv.width = W; cv.height = H;
  ctx = cv.getContext('2d', { willReadFrequently: true });
  ov = $('#sil-overlay'); ov.width = W; ov.height = H; octx = ov.getContext('2d');
  clear();
  document.querySelectorAll('[data-sil-tool]').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.silTool; drag = null;
    document.querySelectorAll('[data-sil-tool]').forEach(x => x.classList.toggle('on', x === b));
    setCursor(); overlay();
  }));
  $('#sil-sym').addEventListener('change', e => { sym = e.target.checked; overlay(); });
  for (const id of ['#sil-grid', '#sil-snap']) $(id).addEventListener('change', () => overlay());
  for (const id of ['#sil-w', '#sil-sheet']) $(id).addEventListener('input', () => { overlay(); info(); });
  $('#sil-undo').addEventListener('click', () => { const d = undo.pop(); if (d) ctx.putImageData(d, 0, 0); info(); });
  $('#sil-clear').addEventListener('click', () => { pushUndo(); clear(); orig = null; $('#sil-imgopts').hidden = true; info(); });
  $('#sil-import').addEventListener('click', () => $('#sil-file').click());
  $('#sil-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) importImage(f); e.target.value = ''; });
  $('#sil-thr').addEventListener('input', applyThreshold);
  $('#sil-inv').addEventListener('change', applyThreshold);
  $('#sil-ok').addEventListener('click', finish);
  $('#sil-cancel').addEventListener('click', () => $('#dlg-sil').close());
  $('#dlg-sil').addEventListener('keydown', e => {
    if (e.key === 'Escape' && drag) { e.preventDefault(); drag = null; overlay(); }
    if (e.target.matches('input')) return;
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
    const p = pt(e, tool !== 'free' && tool !== 'eraser' && tool !== 'fill');
    if (drag?.phase === 'bend') { // 3e temps de la courbe : on la pose
      pushUndo(); stroke(path('curve', drag.a, drag.b, p)); drag = null; overlay(); onDraw?.(); info(); return;
    }
    if (tool === 'fill') { pushUndo(); flood(p[0] | 0, p[1] | 0); if (sym) flood((W - 1 - p[0]) | 0, p[1] | 0); onDraw?.(); info(); return; }
    cv.setPointerCapture(e.pointerId);
    if (tool === 'free' || tool === 'eraser') { pushUndo(); drag = { tool, last: p }; stroke(path('line', p, p)); return; }
    drag = { tool, a: p, b: p, phase: 'drag' };
  });
  cv.addEventListener('pointermove', e => {
    const snap = drag && drag.tool !== 'free' && drag.tool !== 'eraser' || tool === 'line' || tool === 'curve' || tool === 'rect' || tool === 'ellipse';
    const p = pt(e, snap); cursor = p;
    showPos(p);
    if (drag && (drag.tool === 'free' || drag.tool === 'eraser')) { stroke(path('line', drag.last, p)); drag.last = p; return; }
    if (drag?.phase === 'drag') drag.b = constrain(drag.tool, drag.a, p, e.shiftKey);
    overlay();
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return;
    if (drag.tool === 'free' || drag.tool === 'eraser') { drag = null; onDraw?.(); info(); return; }
    if (drag.phase !== 'drag') return;
    const { a, b } = drag;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) { drag = null; overlay(); return; } // simple clic : rien
    if (drag.tool === 'curve') { drag.phase = 'bend'; overlay(); return; }    // 2e temps : courber
    pushUndo(); stroke(path(drag.tool, a, b)); drag = null; overlay(); onDraw?.(); info();
  });
  cv.addEventListener('pointerleave', () => { cursor = null; $('#sil-pos').hidden = true; overlay(); });
}

export function openSilhouette(opts, done, draw) {
  onDone = done; onDraw = draw; undo = []; orig = null; drag = null;
  $('#sil-imgopts').hidden = true;
  $('#sil-sheet').value = opts.sheet || 150;
  $('#sil-t').value = opts.thickness || 2;
  clear();
  if (opts.src) {
    const im = new Image();
    im.onload = () => {
      ctx.drawImage(im, 0, 0, W, H);
      // ancienne silhouette : on retrouve la taille de feuille qui redonne la même hauteur de pièce
      if (!opts.sheet && opts.fitHeight) { const { bh, empty } = binarize(); if (!empty) $('#sil-sheet').value = Math.round(opts.fitHeight * W / bh); }
      overlay(); info();
    };
    im.src = opts.src;
  }
  $('#sil-ok').textContent = opts.edit ? '✔ Mettre à jour la pièce' : '✔ Créer la pièce 3D';
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
function setCursor() {
  if (!cv) return;
  board?.classList.toggle('can-pan', space || tool === 'pan');
  cv.style.cursor = space || tool === 'pan' ? 'grab' : tool === 'fill' ? 'cell' : tool === 'eraser' || tool === 'free' ? 'none' : 'crosshair';
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
  let t = `x ${Math.round(p[0] * mm)} · y ${Math.round(p[1] * mm)} mm`;
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
}

/* ---------- calque d'aide : quadrillage, axe de symétrie, aperçu du tracé ---------- */
function overlay() {
  if (!octx) return;
  octx.clearRect(0, 0, W, H);
  const k = W / (base * zoom); // points de la feuille par pixel d'écran : les aides gardent la même finesse à tous les zooms
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
  if (drag && drag.phase) {
    const draw = drag.phase === 'bend' ? path('curve', drag.a, drag.b, cursor || drag.b) : path(drag.tool === 'curve' ? 'line' : drag.tool, drag.a, drag.b);
    paint(octx, draw, 'rgba(37,99,235,.75)', strokePx());
    if (drag.phase === 'bend') { octx.fillStyle = '#2563eb'; for (const p of [drag.a, drag.b]) { octx.beginPath(); octx.arc(p[0], p[1], 4 * k, 0, 7); octx.fill(); } }
  }
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
function pushUndo() { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > 30) undo.shift(); }
function flood(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  const dark = i => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384;
  const start = y * W + x, target = dark(start), val = target ? 255 : 0; // blanc -> noir, ou noir -> blanc
  const seen = new Uint8Array(W * H), stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || dark(i) !== target) continue;
    seen[i] = 1; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = val; d[i * 4 + 3] = 255;
    const px = i % W;
    if (px > 0) stack.push(i - 1);
    if (px < W - 1) stack.push(i + 1);
    if (i >= W) stack.push(i - W);
    if (i < W * (H - 1)) stack.push(i + W);
  }
  ctx.putImageData(id, 0, 0);
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
  ctx.putImageData(id, 0, 0); info();
}
function binarize() {
  const d = ctx.getImageData(0, 0, W, H).data, bin = new Uint8Array(W * H);
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let i = 0; i < W * H; i++) if (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384) {
    bin[i] = 1; const x = i % W, y = (i / W) | 0;
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  return { bin, bw: maxx - minx + 1, bh: maxy - miny + 1, empty: maxx < 0 };
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
  onDone?.({ loops, src: cv.toDataURL('image/png'), w: bw * mm, h: bh * mm, thickness: t, sheet: sheetMm() });
}
