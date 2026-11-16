// Atelier Silhouette : dessin noir et blanc -> contours -> pièce plate.
const $ = s => document.querySelector(s);
const W = 640, H = 640;
let cv, ctx, tool = 'brush', size = 16, sym = false, undo = [], orig = null, onDone = null, onDraw = null, drawing = false, last = null;

export function initSilhouette() {
  cv = $('#sil-canvas'); cv.width = W; cv.height = H;
  ctx = cv.getContext('2d', { willReadFrequently: true });
  clear();
  document.querySelectorAll('[data-sil-tool]').forEach(b => b.addEventListener('click', () => {
    tool = b.dataset.silTool;
    document.querySelectorAll('[data-sil-tool]').forEach(x => x.classList.toggle('on', x === b));
  }));
  $('#sil-size').addEventListener('input', e => { size = +e.target.value; info(); });
  $('#sil-sym').addEventListener('change', e => { sym = e.target.checked; cv.classList.toggle('sym', sym); });
  $('#sil-undo').addEventListener('click', () => { const d = undo.pop(); if (d) ctx.putImageData(d, 0, 0); info(); });
  $('#sil-clear').addEventListener('click', () => { pushUndo(); clear(); orig = null; $('#sil-imgopts').hidden = true; info(); });
  $('#sil-import').addEventListener('click', () => $('#sil-file').click());
  $('#sil-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) importImage(f); e.target.value = ''; });
  $('#sil-thr').addEventListener('input', applyThreshold);
  $('#sil-inv').addEventListener('change', applyThreshold);
  $('#sil-h').addEventListener('input', info);
  $('#sil-ok').addEventListener('click', finish);
  $('#sil-cancel').addEventListener('click', () => $('#dlg-sil').close());

  cv.addEventListener('pointerdown', e => {
    const p = pt(e); pushUndo();
    if (tool === 'fill') { flood(p[0] | 0, p[1] | 0); if (sym) flood((W - 1 - p[0]) | 0, p[1] | 0); onDraw?.(); info(); return; }
    drawing = true; last = p; stroke(p, p); cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); stroke(last, p); last = p; });
  cv.addEventListener('pointerup', () => { if (drawing) { drawing = false; onDraw?.(); info(); } });
}

export function openSilhouette(opts, done, draw) {
  onDone = done; onDraw = draw; undo = []; orig = null;
  $('#sil-imgopts').hidden = true;
  clear();
  if (opts.src) { const im = new Image(); im.onload = () => { ctx.drawImage(im, 0, 0, W, H); info(); }; im.src = opts.src; }
  $('#sil-h').value = opts.height || 120;
  $('#sil-t').value = opts.thickness || 2;
  $('#sil-ok').textContent = opts.edit ? '✔ Mettre à jour la pièce' : '✔ Créer la pièce 3D';
  $('#sil-msg').textContent = '';
  $('#dlg-sil').showModal();
  info();
}

function pt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
function clear() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
function pushUndo() { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > 25) undo.shift(); }
function line(a, b) {
  ctx.strokeStyle = tool === 'eraser' ? '#fff' : '#000';
  ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] + 0.01, b[1]); ctx.stroke();
}
function stroke(a, b) { line(a, b); if (sym) line([W - a[0], a[1]], [W - b[0], b[1]]); }

function flood(x, y) {
  const id = ctx.getImageData(0, 0, W, H), d = id.data;
  const dark = i => d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 384;
  const start = y * W + x, target = dark(start);
  const val = target ? 255 : 0; // remplir du blanc en noir (ou l'inverse avec la gomme)
  if (tool === 'fill' && target) return; // déjà noir
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
    const k = Math.min(W * 0.92 / img.width, H * 0.92 / img.height);
    const w = img.width * k, h = img.height * k;
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

// Affiche l'échelle : combien de mm fait le pinceau à l'impression
function info() {
  const { bh, empty } = binarize();
  const h = +$('#sil-h').value || 120;
  const mmPerPx = h / (empty ? H : bh);
  const el = $('#sil-info');
  const brush = size * mmPerPx;
  el.innerHTML = `Ton pinceau fera environ <b>${brush.toFixed(1)} mm</b> de large à l’impression.` +
    (brush < 1.5 ? ' <span class="bad">⚠️ Trop fin, ça risque de casser : grossis le pinceau.</span>' : ' <span class="good">👍 Assez solide.</span>');
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
  const { bin, bw, bh, empty } = binarize();
  if (empty) { $('#sil-msg').textContent = 'Dessine d’abord ton personnage en noir 🙂'; return; }
  const eps = +$('#sil-smooth').value || 1.2;
  const loops = trace(bin).map(l => simplifyClosed(l, eps)).filter(l => l.length >= 3 && Math.abs(area(l)) > 6);
  if (!loops.length) { $('#sil-msg').textContent = 'Le dessin est trop fin pour devenir une pièce. Grossis le pinceau.'; return; }
  const h = Math.max(5, +$('#sil-h').value || 120), t = Math.max(0.4, +$('#sil-t').value || 2);
  $('#dlg-sil').close();
  onDone?.({ loops, src: cv.toDataURL('image/png'), aspect: bw / bh, height: h, thickness: t });
}
