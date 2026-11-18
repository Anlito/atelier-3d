// Contours d'une forme dessinée : suivi des bords d'un masque, simplification, et décalage
// (rentrer ou sortir un contour d'une épaisseur donnée, pour les parois d'une boîte de forme libre).
// Coordonnées « écran » : x vers la droite, y vers le bas.

export function area(l) { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += l[j][0] * l[i][1] - l[i][0] * l[j][1]; return a / 2; }

/** Contours (en pixels) des zones à 1 d'un masque w × h. */
export function traceMask(bin, w, h) {
  const VW = w + 1, filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && bin[y * w + x] === 1;
  const E = [], out = new Map();
  const add = (ax, ay, bx, by) => { const id = E.length / 4; E.push(ax, ay, bx, by); const k = ay * VW + ax; const l = out.get(k); l ? l.push(id) : out.set(k, [id]); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!bin[y * w + x]) continue;
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
export function simplifyClosed(l, eps) {
  let far = 0, fd = -1;
  for (let i = 1; i < l.length; i++) { const d = (l[i][0] - l[0][0]) ** 2 + (l[i][1] - l[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
  const a = rdp(l.slice(0, far + 1), eps), b = rdp(l.slice(far).concat([l[0]]), eps);
  return a.concat(b.slice(1, -1));
}

// Distance euclidienne exacte (Felzenszwalb & Huttenlocher) : pour chaque point, distance au point « source » le plus proche
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
}
function distanceTo(src, w, h) {
  const INF = 1e12, g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = src[i] ? 0 : INF;
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]); }
  return g;
}

/**
 * Décale un contour fermé (en mm) : d > 0 le rentre de d mm, d < 0 le sort de |d| mm.
 * Renvoie la liste des contours obtenus (une forme étroite peut se couper en plusieurs morceaux, ou disparaître).
 */
export function offsetLoop(loop, d) {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const [x, y] of loop) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const res = Math.max(0.12, Math.max(maxx - minx, maxy - miny) / 700); // mm par point
  const pad = Math.max(0, -d) + 4 * res;
  const w = Math.ceil((maxx - minx + 2 * pad) / res) + 1, h = Math.ceil((maxy - miny + 2 * pad) / res) + 1;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.beginPath();
  loop.forEach(([x, y], i) => { const X = (x - minx + pad) / res, Y = (y - miny + pad) / res; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
  g.closePath(); g.fill();
  const px = g.getImageData(0, 0, w, h).data, inside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = px[i * 4 + 3] > 127 ? 1 : 0;
  const keep = new Uint8Array(w * h);
  if (d > 0) { // rentrer : on garde les points de la forme assez loin du dehors
    const out = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) out[i] = 1 - inside[i];
    const dist = distanceTo(out, w, h);
    for (let i = 0; i < w * h; i++) keep[i] = inside[i] && (dist[i] - 0.5) * res >= d ? 1 : 0;
  } else { // sortir : la forme plus tout ce qui est assez près d'elle
    const dist = distanceTo(inside, w, h);
    for (let i = 0; i < w * h; i++) keep[i] = inside[i] || (dist[i] - 0.5) * res <= -d ? 1 : 0;
  }
  return traceMask(keep, w, h)
    .map(l => simplifyClosed(l, 0.6))
    .filter(l => l.length >= 3 && Math.abs(area(l)) > 4)
    .map(l => l.map(([x, y]) => [x * res - pad + minx, y * res - pad + miny]));
}
