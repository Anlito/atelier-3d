// Fabrication des formes (toutes les mesures sont en millimètres).
// Chaque forme est construite centrée sur l'origine, à la taille demandée.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg';
import { offsetLoop } from './contours.js';

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];
evaluator.useGroups = false;

let FONT = null;
export const setFont = f => { FONT = f; };
export const hasFont = () => !!FONT;

/** Géométries issues d'une fusion : id -> Float32Array (positions) */
export const geoStore = new Map();

const cache = new Map();
export const clearCache = () => cache.clear();

/* ---------- outils géométriques ---------- */

/** Rend une géométrie propre : sans index, uniquement position + normal,
 *  sans triangles plats, faces tournées vers l'extérieur. */
export function clean(geo) {
  if (geo.index) geo = geo.toNonIndexed();
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
  geo.morphAttributes = {};
  geo.clearGroups();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  const triCount = P.length / 9;
  const pos = [], nor = [];
  let vol = 0, dir = 0;
  for (let t = 0; t < triCount; t++) {
    const i = t * 9;
    const ax = P[i], ay = P[i + 1], az = P[i + 2];
    const bx = P[i + 3], by = P[i + 4], bz = P[i + 5];
    const cx = P[i + 6], cy = P[i + 7], cz = P[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (fx * fx + fy * fy + fz * fz < 1e-12) continue; // triangle plat
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    dir += fx * N[i] + fy * N[i + 1] + fz * N[i + 2];
    for (let k = 0; k < 9; k++) { pos.push(P[i + k]); nor.push(N[i + k]); }
  }
  if (vol < 0) { // faces à l'envers : on inverse l'ordre des sommets
    for (let i = 0; i < pos.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        let tmp = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = tmp;
        tmp = nor[i + 3 + k]; nor[i + 3 + k] = nor[i + 6 + k]; nor[i + 6 + k] = tmp;
      }
    }
    dir = -dir;
  }
  if (dir < 0) for (let i = 0; i < nor.length; i++) nor[i] = -nor[i];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Centre la géométrie et l'étire pour qu'elle mesure exactement s (si fourni). */
function fit(geo, s) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, c = new THREE.Vector3(), d = new THREE.Vector3();
  b.getCenter(c); b.getSize(d);
  geo.translate(-c.x, -c.y, -c.z);
  if (s) geo.scale(s.x / (d.x || 1), s.y / (d.y || 1), s.z / (d.z || 1));
  return geo;
}

function brush(g) { const b = new Brush(clean(g)); b.updateMatrixWorld(); return b; }
function csg(a, b, op) { return evaluator.evaluate(brush(a), brush(b), op).geometry; }

function flatExtrude(shapes, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments });
  g.rotateX(-Math.PI / 2); // couché sur le plateau, épaisseur vers le haut
  return g;
}

function area(l) { let a = 0; for (let i = 0, j = l.length - 1; i < l.length; j = i++) a += l[j][0] * l[i][1] - l[i][0] * l[j][1]; return a / 2; }
function pip(p, l) {
  let inside = false;
  for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const xi = l[i][0], yi = l[i][1], xj = l[j][0], yj = l[j][1];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Contours d'image (coordonnées écran, y vers le bas) -> formes THREE avec trous */
function loopsToShapes(loops) {
  const L = loops.map(pts => ({ pts, a: -area(pts) })); // y vers le bas : on inverse le signe
  // contour extérieur = sens horaire à l'écran = aire écran positive
  const outers = L.filter(l => l.a < 0).map(l => ({ ...l, sh: new THREE.Shape(l.pts.map(([x, y]) => new THREE.Vector2(x, -y))) }));
  for (const h of L.filter(l => l.a > 0)) {
    let best = null;
    for (const o of outers) if (pip(h.pts[0], o.pts) && (!best || Math.abs(o.a) < Math.abs(best.a))) best = o;
    if (best) best.sh.holes.push(new THREE.Path(h.pts.map(([x, y]) => new THREE.Vector2(x, -y))));
  }
  return outers.map(o => o.sh);
}

/* ---------- contours de boîte : rectangle, coins arrondis, rond/ovale, hexagone, octogone ---------- */
export const BOX_SHAPES = { rect: 'Rectangle', round: 'Coins arrondis', ellipse: 'Rond / ovale', hex: 'Hexagone', oct: 'Octogone', custom: 'Ma forme' };
// pour les polygones, rentrer la paroi d'une épaisseur w réduit un peu plus la largeur totale
const insetK = k => (k === 'hex' ? 1 / Math.cos(Math.PI / 6) : k === 'oct' ? 1 / Math.cos(Math.PI / 8) : 1);
function outline(k, W, D, r = 0) {
  const s = new THREE.Shape(), hw = W / 2, hd = D / 2;
  if (k === 'ellipse') { s.absellipse(0, 0, hw, hd, 0, Math.PI * 2, false); return s; }
  if (k === 'hex' || k === 'oct') {
    const n = k === 'hex' ? 6 : 8, off = k === 'hex' ? 0 : Math.PI / 8;
    const pts = Array.from({ length: n }, (_, i) => [Math.cos(off + i * 2 * Math.PI / n), Math.sin(off + i * 2 * Math.PI / n)]);
    const mx = Math.max(...pts.map(p => Math.abs(p[0]))), my = Math.max(...pts.map(p => Math.abs(p[1])));
    pts.forEach(([x, y], i) => (i ? s.lineTo : s.moveTo).call(s, x / mx * hw, y / my * hd));
    s.closePath(); return s;
  }
  r = k === 'round' ? Math.max(0, Math.min(r, hw - 0.05, hd - 0.05)) : 0;
  if (r < 0.05) { s.moveTo(-hw, -hd); s.lineTo(hw, -hd); s.lineTo(hw, hd); s.lineTo(-hw, hd); s.closePath(); return s; }
  s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hd - r); s.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hd); s.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hd + r); s.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
/**
 * Contour de boîte (W × D) rentré de « inset » mm, en formes THREE.
 * « Ma forme » (k = custom) : p.outline est le contour dessiné, ramené à un carré de 1 × 1 centré.
 */
function profile(k, W, D, inset, r, p) {
  if (k === 'custom' && p.outline?.length > 2) {
    const loop = p.outline.map(([x, y]) => [x * W, y * D]);
    const loops = inset > 0.01 ? offsetLoop(loop, inset) : [loop];
    return loopsToShapes(loops);
  }
  const K = insetK(k), w = W - 2 * inset * K, d = D - 2 * inset * K;
  return w > 0.2 && d > 0.2 ? [outline(k, w, d, Math.max(0, r - inset))] : [];
}
/** Bloc plein d'un contour, du niveau y0 jusqu'à y0 + h (null si le contour est vide). */
function prism(shapes, h, y0) {
  if (!shapes.length) return null;
  const g = new THREE.ExtrudeGeometry(shapes, { depth: h, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return g;
}

/* ---------- les formes ---------- */

const BUILD = {
  cube: () => new THREE.BoxGeometry(1, 1, 1),
  cylinder: (s, p) => new THREE.CylinderGeometry(0.5, 0.5, 1, p.seg || 64),
  cone: (s, p) => new THREE.CylinderGeometry(0, 0.5, 1, p.seg || 64),
  sphere: () => new THREE.SphereGeometry(0.5, 48, 32),
  pyramid: () => new THREE.CylinderGeometry(0, 0.5, 1, 4).rotateY(Math.PI / 4),
  hemisphere: () => {
    const pts = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * 0.5, Math.sin(a) * 0.5)); }
    pts[pts.length - 1].x = 0;
    return new THREE.LatheGeometry(pts, 48);
  },
  torus: (s, p) => new THREE.TorusGeometry(1, p.ratio || 0.3, 24, 64).rotateX(Math.PI / 2),
  tube: (s, p) => {
    const rx = s.x / 2, rz = s.z / 2;
    const w = Math.min(p.wall ?? 2, Math.min(rx, rz) - 0.3);
    const sh = new THREE.Shape(); sh.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false);
    if (w > 0.2) { const h = new THREE.Path(); h.absellipse(0, 0, rx - w, rz - w, 0, Math.PI * 2, true); sh.holes.push(h); }
    return flatExtrude(sh, 32);
  },
  star: (s, p) => {
    const n = Math.max(3, Math.min(16, p.n || 5)), sh = new THREE.Shape();
    for (let i = 0; i < 2 * n; i++) {
      const r = i % 2 ? (p.inner || 0.45) : 1, a = Math.PI / 2 + i * Math.PI / n;
      i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    return flatExtrude(sh);
  },
  heart: () => {
    const h = new THREE.Shape();
    h.moveTo(0, -1);
    h.bezierCurveTo(0.6, -0.4, 1.2, 0.1, 1.0, 0.55);
    h.bezierCurveTo(0.85, 1.0, 0.25, 1.05, 0, 0.6);
    h.bezierCurveTo(-0.25, 1.05, -0.85, 1.0, -1.0, 0.55);
    h.bezierCurveTo(-1.2, 0.1, -0.6, -0.4, 0, -1);
    return flatExtrude(h, 32);
  },
  text: (s, p) => {
    if (!FONT) return new THREE.BoxGeometry(30, 3, 10);
    const t = String(p.text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim() || '?';
    const g = new TextGeometry(t, { font: FONT, size: 10, height: 3, depth: 3, curveSegments: 5, bevelEnabled: false });
    if (!g.attributes.position || g.attributes.position.count === 0) return new THREE.BoxGeometry(10, 3, 10);
    if (!p.standing) g.rotateX(-Math.PI / 2);
    return g;
  },
  // Boîte creuse ouverte en haut : s = dimensions extérieures
  // Boîte creuse ouverte en haut. s = dimensions extérieures ; p.shape = contour, p.r = rayon des coins
  box: (s, p) => {
    const k = p.shape || 'rect', K = insetK(k), r = p.r || 0, P = i => profile(k, s.x, s.z, i, r, p);
    const w = Math.max(0.4, Math.min(p.wall ?? 2, s.x / (2 * K) - 0.5, s.z / (2 * K) - 0.5, s.y - 0.5));
    const outer = prism(P(0), s.y, -s.y / 2);
    const inner = prism(P(w), s.y, -s.y / 2 + w);
    return inner ? csg(outer, inner, SUBTRACTION) : outer;
  },
  // Couvercle, imprimé à l'envers : plaque en bas, éventuellement un bord extérieur (p.skirt),
  // et le rebord qui rentre dans la boîte (hauteur = ce qui reste de s.y)
  lid: (s, p) => {
    // le couvercle est imprimé à l'envers : une fois retourné (d'avant en arrière) pour fermer la boîte,
    // sa forme doit retomber sur celle de la boîte, donc on la dessine en miroir (et dans l'autre sens de parcours)
    if (p.shape === 'custom' && p.outline) p = { ...p, outline: p.outline.map(([x, y]) => [x, -y]).reverse() };
    const k = p.shape || 'rect', r = p.r || 0, P = i => profile(k, s.x, s.z, i, r, p);
    const w = p.wall ?? 2, clr = p.clr ?? 0.3, t = p.lipT ?? 1.6, y0 = -s.y / 2;
    const skirt = Math.max(0, Math.min(p.skirt || 0, s.y - w));
    let g = prism(P(0), w + skirt, y0);
    if (skirt > 0.2) { const cav = prism(P(w), skirt + 1, y0 + w); if (cav) g = csg(g, cav, SUBTRACTION); }
    const lipH = s.y - w - skirt;
    if (lipH < 0.4) return g;
    // le rebord qui rentre dans la boîte : une paroi d'épaisseur t, juste à l'intérieur de la paroi de la boîte (avec le jeu)
    // il part de la plaque (il traverse le bord extérieur) et dépasse de lipH
    const lo = prism(P(w + clr), skirt + lipH + 0.05, y0 + w - 0.05), li = prism(P(w + clr + t), skirt + lipH + 2, y0 + w - 1.05);
    if (!lo || !li) return g;
    return csg(g, csg(lo, li, SUBTRACTION), ADDITION);
  },
  silhouette: (s, p) => {
    const shapes = loopsToShapes(p.loops || []);
    if (!shapes.length) return new THREE.BoxGeometry(1, 1, 1);
    return flatExtrude(shapes, 1);
  },
  // Composant (repère) fait de plusieurs pavés / cylindres
  parts: (s, p) => mergeGeometries((p.parts || []).map(q => {
    const g = q.k === 'cyl' ? new THREE.CylinderGeometry(q.s[0] / 2, q.s[0] / 2, q.s[1], 32) : new THREE.BoxGeometry(...q.s);
    g.translate(...q.p);
    return clean(g);
  })),
  custom: (s, p) => {
    const a = geoStore.get(p.geoId);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a || new Float32Array(9), 3));
    g.computeVertexNormals();
    return g;
  },
};

/** Construit (ou reprend du cache) la géométrie d'un objet. s = null -> taille naturelle. */
export function buildGeometry(type, s, p = {}) {
  const key = type + '|' + JSON.stringify(s) + '|' + JSON.stringify(p, (k, v) => (k === 'src' ? undefined : v));
  if (cache.has(key)) return cache.get(key);
  let g;
  try { g = clean(BUILD[type](s, p)); }
  catch (e) { console.error('Forme impossible', type, e); g = clean(new THREE.BoxGeometry(1, 1, 1)); }
  fit(g, s);
  if (p.mirror) { g.scale(-1, 1, 1); g = clean(g); }
  g.computeBoundingBox(); g.computeBoundingSphere();
  cache.set(key, g);
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return g;
}

/** Fusionne : union des pièces de matière, moins l'union des trous (géométries en coordonnées monde). */
export function combine(solids, holes = []) {
  let acc = null;
  for (const g of solids) { const b = brush(g); acc = acc ? evaluator.evaluate(acc, b, ADDITION) : b; }
  if (!acc) return null;
  if (holes.length) {
    let h = null;
    for (const g of holes) { const b = brush(g); h = h ? evaluator.evaluate(h, b, ADDITION) : b; }
    acc = evaluator.evaluate(acc, h, SUBTRACTION);
  }
  return clean(acc.geometry);
}
