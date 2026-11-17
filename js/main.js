import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { buildGeometry, combine, setFont, hasFont, geoStore, clearCache, BOX_SHAPES } from './shapes.js';
import { initSilhouette, openSilhouette } from './silhouette.js';
import * as H from './help.js';
import { ic, hydrateIcons } from './icons.js';
import { initProf, locked, isProfPC } from './prof.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const r2 = v => Math.round(v * 100) / 100;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

const PLATE = 220, MAXH = 250;
const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#facc15', '#64748b', '#111827', '#f8fafc'];
const DEF = {
  cube: { name: 'Cube', size: [20, 20, 20] },
  cylinder: { name: 'Cylindre', size: [20, 20, 20], params: { seg: 64 } },
  sphere: { name: 'Sphère', size: [20, 20, 20] },
  hemisphere: { name: 'Demi-sphère', size: [20, 10, 20] },
  cone: { name: 'Cône', size: [20, 20, 20], params: { seg: 64 } },
  pyramid: { name: 'Pyramide', size: [20, 20, 20] },
  torus: { name: 'Anneau', size: [30, 7, 30], params: { ratio: 0.3 } },
  tube: { name: 'Tube', size: [20, 20, 20], params: { wall: 2 } },
  star: { name: 'Étoile', size: [30, 4, 30], params: { n: 5 } },
  heart: { name: 'Cœur', size: [30, 4, 28] },
  text: { name: 'Texte', size: null, params: { text: 'Bonjour', standing: false } },
  box: { name: 'Boîte' }, lid: { name: 'Couvercle' }, silhouette: { name: 'Silhouette' }, custom: { name: 'Pièce fusionnée' },
};

const state = { objects: [], selected: new Set(), mode: 'select', grid: 1, rotStep: 90, preview: false, xray: false, events: new Set(), lock: false };
let uid = 1, colorIdx = 0;

/* ================= Scène 3D ================= */
const view = $('#view');
// Viser les pièces à la souris reste rapide même avec des milliers de facettes (silhouettes, pièces fusionnées)
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
view.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8eef5);
const camera = new THREE.PerspectiveCamera(40, 1, 1, 8000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.25; controls.rotateSpeed = 0.9;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.maxDistance = 2500; controls.minDistance = 10;
let orbitMoved = false;
controls.addEventListener('start', () => { orbitMoved = false; });
controls.addEventListener('change', () => { orbitMoved = true; });
controls.addEventListener('end', () => { if (orbitMoved && !state.events.has('orbit')) emit('orbit'); });

scene.add(new THREE.HemisphereLight(0xffffff, 0x8796aa, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(120, 260, 170); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-180, 90, -140); scene.add(fill);

const plate = new THREE.Mesh(new THREE.PlaneGeometry(PLATE, PLATE), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
plate.rotation.x = -Math.PI / 2; plate.position.y = -0.06; scene.add(plate);
const grid5 = new THREE.GridHelper(PLATE, PLATE / 5, 0xd5dde8, 0xdde4ed); grid5.position.y = -0.03; scene.add(grid5);
const grid10 = new THREE.GridHelper(PLATE, PLATE / 10, 0x6b8bb3, 0xb3c3d6); grid10.position.y = -0.02; scene.add(grid10);
{ // mot AVANT sur le plateau
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#6b8bb3'; g.font = 'bold 44px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('AVANT', 128, 48);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0, PLATE / 2 + 9); scene.add(m);
}

function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(view);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); updateOverlays(); });

const selMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
const KI = { solid: '<img class="ki" src="img/outils/kind-solid.png" alt="">', hole: '<img class="ki" src="img/outils/kind-hole.png" alt="">', ghost: '<img class="ki" src="img/outils/kind-ghost.png" alt="">' };

/* ================= Objets ================= */
function nextColor() { return COLORS[colorIdx++ % 8]; }
function uniqueName(base) { let n = 1; while (state.objects.some(o => o.name === `${base} ${n}`)) n++; return `${base} ${n}`; }
function natSize(type, params) { const g = buildGeometry(type, null, params); const v = new THREE.Vector3(); g.boundingBox.getSize(v); return { x: r2(v.x), y: r2(v.y), z: r2(v.z) }; }

function newObj(type, o = {}) {
  const d = DEF[type] || {};
  const params = { ...(d.params || {}), ...(o.params || {}) };
  const size = o.size ? { ...o.size } : d.size ? { x: d.size[0], y: d.size[1], z: d.size[2] } : natSize(type, params);
  return { id: uid++, name: o.name || uniqueName(d.name || 'Objet'), type, kind: o.kind || 'solid', color: o.color || nextColor(), size, pos: { x: 0, y: size.y / 2, z: 0 }, quat: [0, 0, 0, 1], params, help: o.help };
}

function makeMaterial(o) {
  if (o.kind === 'hole') return new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, roughness: 0.6 });
  if (o.kind === 'ghost') return new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
  const m = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.55, metalness: 0.02, side: THREE.DoubleSide });
  if (state.xray) { m.transparent = true; m.opacity = 0.3; m.depthWrite = false; }
  return m;
}
function syncMesh(o) {
  if (!o.mesh) { o.mesh = new THREE.Mesh(); o.mesh.userData.obj = o; scene.add(o.mesh); }
  const m = o.mesh;
  m.geometry = buildGeometry(o.type, o.size, o.params);
  if (!m.geometry.boundsTree) try { m.geometry.computeBoundsTree(); } catch { /* visée classique */ }
  m.material?.dispose?.(); m.material = makeMaterial(o);
  m.renderOrder = o.kind === 'solid' ? 0 : 2;
  for (const c of [...m.children]) { m.remove(c); c.geometry.dispose(); }
  if (o.kind !== 'solid') m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), new THREE.LineBasicMaterial({ color: o.kind === 'hole' ? 0xbe123c : 0x475569 })));
  o.outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size.x + 1, o.size.y + 1, o.size.z + 1)), selMat);
  o.outline.visible = state.selected.has(o);
  m.add(o.outline);
  syncTransform(o);
}
function syncTransform(o) { o.mesh.position.set(o.pos.x, o.pos.y, o.pos.z); o.mesh.quaternion.fromArray(o.quat); o.mesh.updateMatrixWorld(true); }

const _v = new THREE.Vector3();
function worldBox(o, box = new THREE.Box3()) {
  const m = o.mesh; m.updateMatrixWorld(true); box.makeEmpty();
  const p = m.geometry.attributes.position;
  const step = Math.max(1, Math.floor(p.count / 6000)); // assez précis, même pour les grosses pièces
  for (let i = 0; i < p.count; i += step) box.expandByPoint(_v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  return box;
}
function setMinY(o, y) { const b = worldBox(o); o.pos.y = r2(o.pos.y + y - b.min.y); syncTransform(o); }
const touch = (a, b) => worldBox(a).intersectsBox(worldBox(b));
const inside = (a, b) => { const A = worldBox(a), B = worldBox(b); return A.min.x >= B.min.x - 0.5 && A.max.x <= B.max.x + 0.5 && A.min.z >= B.min.z - 0.5 && A.max.z <= B.max.z + 0.5; };

function addObject(o, { place = true, select = true } = {}) {
  state.objects.push(o); syncMesh(o);
  if (place) { // place libre la plus proche du centre, sur le plateau
    o.pos.x = 0; o.pos.z = 0; syncTransform(o); setMinY(o, 0);
    const b0 = worldBox(o), others = state.objects.filter(x => x !== o).map(x => worldBox(x).expandByScalar(2));
    const half = PLATE / 2, b = new THREE.Box3();
    let best = null;
    for (let x = -half; x <= half; x += 5) for (let z = -half; z <= half; z += 5) {
      b.copy(b0).translate(new THREE.Vector3(x, 0, z));
      if (b.min.x < -half || b.max.x > half || b.min.z < -half || b.max.z > half) continue;
      if (others.some(ob => ob.intersectsBox(b))) continue;
      const d = x * x + z * z; if (!best || d < best.d) best = { x, z, d };
    }
    if (best) { o.pos.x = best.x; o.pos.z = best.z; syncTransform(o); }
  }
  if (select) { state.selected.clear(); state.selected.add(o); }
  emit('add:' + o.type, false);
  pushHistory(); refreshUI();
  return o;
}
function removeObjects(list) {
  for (const o of list) { scene.remove(o.mesh); o.mesh.material.dispose(); state.selected.delete(o); }
  state.objects = state.objects.filter(o => !list.includes(o));
}
function clearScene() { removeObjects([...state.objects]); }
const ser = o => { const { mesh, outline, _bk, _bb, ...r } = o; return JSON.parse(JSON.stringify(r)); };
const baked = o => { o.mesh.updateMatrixWorld(true); return o.mesh.geometry.clone().applyMatrix4(o.mesh.matrixWorld); };

/* ================= Historique et sauvegarde ================= */
const hist = { stack: [], i: -1 };
function snapshot() { return JSON.stringify(state.objects.map(ser)); }
function pushHistory() {
  const s = snapshot();
  if (hist.stack[hist.i] === s) return;
  hist.stack.splice(hist.i + 1); hist.stack.push(s);
  if (hist.stack.length > 80) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  autosave(); updateUndo();
}
function restoreObjects(list) {
  clearScene();
  for (const r of list) { const o = { ...r }; state.objects.push(o); syncMesh(o); uid = Math.max(uid, o.id + 1); }
  refreshUI();
}
function undoRedo(d) {
  const j = hist.i + d; if (j < 0 || j >= hist.stack.length) return;
  hist.i = j; restoreObjects(JSON.parse(hist.stack[j])); autosave(); updateUndo();
}
function updateUndo() { $('#btn-undo').disabled = hist.i <= 0; $('#btn-redo').disabled = hist.i >= hist.stack.length - 1; }

const f32ToB64 = a => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const b64ToF32 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer); };
function projectData() {
  const geos = {};
  // les pièces fusionnées, y compris celles cachées dans une fusion (pour pouvoir défusionner)
  const walk = list => { for (const o of list) { if (o.type === 'custom' && geoStore.has(o.params.geoId)) geos[o.params.geoId] = f32ToB64(geoStore.get(o.params.geoId)); if (o.params?.src) walk(o.params.src); } };
  walk(state.objects);
  return { app: 'atelier3d', version: 1, name: $('#proj-name').value, objects: state.objects.map(ser), geos, mission: mission ? { id: mission.def.id, i: mission.i } : null };
}
function loadProject(d) {
  for (const [k, v] of Object.entries(d.geos || {})) geoStore.set(k, b64ToF32(v));
  $('#proj-name').value = d.name || 'mon-objet';
  restoreObjects(d.objects || []);
  hist.stack = []; hist.i = -1; pushHistory();
  if (d.mission) { const def = H.MISSIONS.find(m => m.id === d.mission.id); if (def) mission = { def, i: d.mission.i }; }
  updateAssistant();
}
let saveWarned = false;
function autosave() {
  try { localStorage.setItem('atelier3d-autosave', JSON.stringify(projectData())); }
  catch (e) { if (!saveWarned) { saveWarned = true; toast('⚠️ Sauvegarde automatique impossible (projet trop gros) : pense à « Enregistrer ».'); } }
}

/* ================= Sélection ================= */
function refreshUI() {
  for (const o of state.objects) if (o.outline) o.outline.visible = state.selected.has(o);
  renderProps(); renderOutliner(); renderCtxbar(); syncGizmo(); updateAssistant();
  $('#empty').hidden = state.objects.length > 0;
  $('#obj-count').textContent = state.objects.length;
}

/* ================= Commandes dans la vue : barre d'actions, mesures, poignée ================= */
function renderCtxbar() {
  const sel = [...state.selected], el = $('#ctxbar');
  if (!sel.length) { el.innerHTML = ''; return; }
  if (sel.length > 1) {
    el.innerHTML = `<span class="cb-label">${sel.length} objets</span>
      <button data-act="merge" class="primary" data-title="Fusionner" data-help="Colle toutes les pièces sélectionnées en une seule. Les trous sélectionnés creusent la matière.">${ic('merge')} Fusionner</button>
      <span class="cb-sep"></span>
      <button data-act="gizmo:translate" class="${gizmo === 'translate' ? 'on' : ''}" data-title="✥ Flèches 3D (M)" data-help="Déplace toutes les pièces ensemble, sur un seul axe : rouge = gauche ↔ droite, vert = monter / descendre, bleu = avant ↔ arrière.">${ic('move')}</button>
      <button data-act="gizmo:rotate" class="${gizmo === 'rotate' ? 'on' : ''}" data-title="⟲ Tourner en 3D (R)" data-help="Fait tourner toutes les pièces ensemble autour de leur centre.">${ic('rot3')}</button>
      <button data-act="alignpop" class="${alignPop ? 'on' : ''}" data-title="Aligner" data-help="Aligne les pièces sur la plus grande : à gauche, au centre, à droite, devant, derrière, en bas, en haut…">${ic('alignx')} Aligner</button>
      <button data-act="del" class="danger" data-title="Supprimer" data-help="Supprime les objets sélectionnés (Ctrl + Z pour les récupérer).">${ic('trash')}</button>
      ${alignPop ? `<div class="cb-pop">${alignGrid()}</div>` : ''}`;
    return;
  }
  const o = sel[0];
  el.innerHTML = `<div class="cb-kind">
      <button data-act="kind:solid" class="${o.kind === 'solid' ? 'on' : ''}" data-title="🧱 Matière" data-help="Sera imprimé en plastique. (touche S)">${KI.solid}Matière</button>
      <button data-act="kind:hole" class="${o.kind === 'hole' ? 'on' : ''}" data-title="🕳️ Trou" data-help="Creuse toutes les pièces qu’il traverse. (touche H)">${KI.hole}Trou</button>
      <button data-act="kind:ghost" class="${o.kind === 'ghost' ? 'on' : ''}" data-title="👻 Repère" data-help="N’est jamais imprimé : sert à mesurer ou vérifier que tout rentre.">${KI.ghost}</button></div>
    <button data-act="drop" data-title="⬇ Poser (D)" data-help="Fait descendre l’objet sur ce qu’il y a en dessous : le plateau ou une autre pièce.">${ic('drop')}</button>
    <span class="cb-sep"></span>
    <button data-act="gizmo:translate" class="${gizmo === 'translate' ? 'on' : ''}" data-title="✥ Flèches 3D (M)" data-help="Affiche 3 flèches : <b style=&quot;color:#dc2626&quot;>rouge</b> = gauche ↔ droite, <b style=&quot;color:#16a34a&quot;>vert</b> = monter ↕ descendre, <b style=&quot;color:#2563eb&quot;>bleu</b> = avant ↔ arrière. Tire une flèche pour bouger sur un seul axe.">${ic('move')}</button>
    <button data-act="gizmo:rotate" class="${gizmo === 'rotate' ? 'on' : ''}" data-title="⟲ Tourner en 3D (R)" data-help="Affiche 3 anneaux de couleur : tire un anneau pour faire tourner l’objet dans ce sens, par pas de 15°.">${ic('rot3')}</button>
    <button data-act="flip" data-title="⤵ Retourner" data-help="Met l’objet la tête en bas (demi-tour). Pratique pour percer le fond d’une boîte ou le dessus d’un couvercle.">${ic('flip')}</button>
    <span class="cb-sep"></span>
    <button data-act="dup" data-title="⧉ Dupliquer (Ctrl + D)" data-help="Fait une copie juste à côté.">${ic('copy')}</button>
    ${o.kind === 'solid' ? `<button data-act="drill" data-title="🔩 Percer" data-help="Ouvre l’outil Percer pour faire un trou dans cette pièce."><img class="ki" src="img/outils/drill.png" alt=""></button>` : ''}
    ${o.type === 'silhouette' ? `<button data-act="edit-sil" data-title="✏️ Modifier le dessin" data-help="Rouvre l’atelier Silhouette avec ton dessin pour le corriger. Astuce : double-clic sur la pièce.">${ic('pencil')}</button>` : ''}
    ${o.type === 'custom' && o.params.src ? `<button data-act="unmerge" data-title="✂️ Défusionner (Ctrl + Maj + G)" data-help="Sépare la pièce fusionnée : les objets d’origine reviennent, à leur place.">${ic('unmerge')}</button>` : ''}
    <button data-act="del" class="danger" data-title="🗑 Supprimer (Suppr)" data-help="Supprime l’objet. Ctrl + Z pour le récupérer.">${ic('trash')}</button>`;
}
function cachedBox(o) {
  const k = o.mesh.geometry.uuid + o.mesh.matrixWorld.elements.join(',');
  if (o._bk !== k) { o._bk = k; o._bb = worldBox(o); }
  return o._bb;
}
function toScreen(v) {
  const p = v.clone().project(camera), c = renderer.domElement;
  return { x: (p.x + 1) / 2 * c.clientWidth, y: (1 - p.y) / 2 * c.clientHeight, ok: p.z < 1 };
}
const clampX = (x, w) => Math.max(8 + w / 2, Math.min(view.clientWidth - 8 - w / 2, x));
let lift = null, editingDim = null;
function place(el, s, dx = 0, dy = 0) { // on ne touche à la page que si la position a changé
  const t = `translate(${Math.round(s.x + dx)}px, ${Math.round(s.y + dy)}px) translate(-50%, -50%)`, v = s.ok ? '' : 'hidden';
  if (el._t !== t) { el._t = t; el.style.transform = t; }
  if (el._v !== v) { el._v = v; el.style.visibility = v; }
}
// taille de la barre d'actions, mesurée seulement quand elle change (pas à chaque image : la vue reste fluide)
const barSize = { w: 0, h: 0 };
new ResizeObserver(() => { const el = $('#ctxbar'); barSize.w = el.offsetWidth; barSize.h = el.offsetHeight; }).observe($('#ctxbar'));
function updateOverlays() {
  const sel = [...state.selected], bar = $('#ctxbar'), dims = $('#dims');
  const show = sel.length > 0 && !state.preview && state.mode !== 'drill';
  bar.hidden = !show;
  dims.hidden = !(show && sel.length === 1);
  const hd = $('#handles'); hd.hidden = !(show && sel.length === 1 && gizmo !== 'rotate');
  if (!show) return;
  const b = new THREE.Box3(); sel.forEach(o => b.union(cachedBox(o)));
  // barre d'actions au-dessus de l'objet entier tel qu'on le voit à l'écran (les 8 coins de sa boîte),
  // pour qu'elle ne cache jamais la pièce ; s'il n'y a pas la place au-dessus, elle passe en dessous
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 8; i++) {
    const c = toScreen(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
    if (c.ok) { minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y); }
  }
  const top = toScreen(new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2));
  if (minY === Infinity) minY = maxY = top.y;
  const one = sel.length === 1, bw = barSize.w || bar.offsetWidth, bh = barSize.h || bar.offsetHeight;
  let by = minY - (one ? 52 : 14) - bh;
  if (by < 8) by = Math.min(view.clientHeight - bh - 8, maxY + (one ? 48 : 16));
  const bt = `translate(${Math.round(clampX(top.x, bw) - bw / 2)}px, ${Math.round(by)}px)`;
  if (bar._t !== bt) { bar._t = bt; bar.style.transform = bt; }
  if (sel.length !== 1) return;
  // mesures sur les arêtes qui font face à la caméra
  const o = sel[0], m = o.mesh, s = o.size;
  const cam = m.worldToLocal(camera.position.clone());
  const sx = cam.x >= 0 ? 1 : -1, sz = cam.z >= 0 ? 1 : -1;
  const pts = {
    sx: new THREE.Vector3(0, -s.y / 2, sz * s.z / 2), sy: new THREE.Vector3(sx * s.x / 2, -s.y / 2, 0), sz: new THREE.Vector3(sx * s.x / 2, 0, sz * s.z / 2),
  };
  const val = { sx: s.x, sy: s.z, sz: s.y }, pre = { sx: '↔', sy: '⤢', sz: '↕' };
  for (const el of $$('.dim', dims)) {
    const k = el.dataset.dim;
    place(el, toScreen(m.localToWorld(pts[k].clone())), k === 'sz' ? 30 : 0, k === 'sz' ? 0 : 22);
    if (editingDim !== el) { const t = `${pre[k]} ${r2(val[k])}`; if (el.textContent !== t) el.textContent = t; }
  }
  if (!hd.hidden) {
    const hs = $$('.hdl', hd);
    HANDLES.forEach((h, i) => {
      const v = h === 'top' ? new THREE.Vector3(0, s.y / 2, 0) : new THREE.Vector3(h[0] * s.x / 2, -s.y / 2, h[1] * s.z / 2);
      // pendant un agrandissement, la taille affichée suit l'échelle provisoire
      place(hs[i], toScreen(m.localToWorld(v)));
    });
  }
  const lb = $('#lift'), t = `⇕ ${r2(b.min.y)} mm`;
  place(lb, { x: top.x, y: minY, ok: top.ok }, 0, -26);
  if (lb.textContent !== t) lb.textContent = t;
  lb.classList.toggle('up', b.min.y > 0.05);
}
// Cliquer sur une mesure pour la taper
$('#dims').addEventListener('click', e => {
  const el = e.target.closest('.dim'); if (!el || editingDim) return;
  const o = [...state.selected][0]; if (!o) return;
  const k = el.dataset.dim, cur = { sx: o.size.x, sy: o.size.z, sz: o.size.y }[k];
  editingDim = el; el.classList.add('editing');
  el.innerHTML = `<input type="number" step="any" value="${r2(cur)}"> mm`;
  const inp = el.querySelector('input'); inp.focus(); inp.select();
  const done = ok => {
    if (editingDim !== el) return;
    editingDim = null; el.classList.remove('editing'); el.textContent = '';
    if (ok && +inp.value > 0 && Math.abs(+inp.value - cur) > 1e-6) { applyField(o, k, { value: inp.value }); emit('resize'); }
  };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); ev.stopPropagation(); });
  inp.addEventListener('blur', () => done(true));
});
// Poignée pour monter / descendre
$('#lift').addEventListener('pointerdown', e => {
  const o = [...state.selected][0]; if (!o) return;
  e.preventDefault(); $('#lift').setPointerCapture(e.pointerId);
  const c = cachedBox(o).getCenter(new THREE.Vector3());
  const mmPerPx = 2 * camera.position.distanceTo(c) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / view.clientHeight;
  lift = { o, y: e.clientY, start: worldBox(o).min.y, mmPerPx };
});
$('#lift').addEventListener('pointermove', e => {
  if (!lift) return;
  const g = state.grid, v = Math.round((lift.start + (lift.y - e.clientY) * lift.mmPerPx) / g) * g;
  setMinY(lift.o, r2(v));
});
$('#lift').addEventListener('pointerup', () => { if (!lift) return; lift = null; emit('lift', false); pushHistory(); refreshUI(); });

/* ----- Flèches 3D (déplacer sur un axe) et anneaux 3D (tourner sur un axe) ----- */
let gizmo = null, tcStart = null, group = null;
const tc = new TransformControls(camera, renderer.domElement);
tc.setSize(0.95); tc.setSpace('world'); tc.setRotationSnap(THREE.MathUtils.degToRad(15));
scene.add(tc);
// Plusieurs pièces : les flèches et anneaux tiennent un point invisible au centre du groupe
const pivot = new THREE.Object3D(); scene.add(pivot);
const groupBox = objs => { const b = new THREE.Box3(); objs.forEach(o => b.union(worldBox(o))); return b; };
function prepGroup() {
  pivot.updateMatrixWorld(true);
  group.inv = pivot.matrixWorld.clone().invert();
  group.mats = group.objs.map(o => { o.mesh.updateMatrixWorld(true); return o.mesh.matrixWorld.clone(); });
}
const gizmoObjs = () => (group ? group.objs : tc.object?.userData.obj ? [tc.object.userData.obj] : []);
tc.addEventListener('dragging-changed', e => {
  controls.enabled = !e.value;
  const objs = gizmoObjs(); if (!objs.length) return;
  if (e.value) { tcStart = groupBox(objs).min.y; if (group) prepGroup(); return; }
  if (!group) { const o = objs[0]; o.pos = { x: r2(o.mesh.position.x), y: r2(o.mesh.position.y), z: r2(o.mesh.position.z) }; o.quat = o.mesh.quaternion.toArray(); syncTransform(o); }
  if (gizmo === 'rotate') { // après une rotation, le bas reste à la même hauteur
    const dy = tcStart - groupBox(objs).min.y;
    objs.forEach(o => { o.pos.y = r2(o.pos.y + dy); syncTransform(o); });
  }
  emit(gizmo === 'rotate' ? 'rotate' : 'move', false); pushHistory(); refreshUI();
});
tc.addEventListener('objectChange', () => {
  if (group) {
    const D = pivot.matrixWorld.clone().multiply(group.inv), P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    group.objs.forEach((o, i) => {
      D.clone().multiply(group.mats[i]).decompose(P, Q, S);
      o.pos = { x: r2(P.x), y: r2(P.y), z: r2(P.z) }; o.quat = Q.toArray(); syncTransform(o);
    });
    return;
  }
  const o = tc.object?.userData.obj; if (!o) return;
  o.pos = { x: r2(o.mesh.position.x), y: r2(o.mesh.position.y), z: r2(o.mesh.position.z) }; o.quat = o.mesh.quaternion.toArray();
});
function setGizmo(mode) {
  gizmo = gizmo === mode ? null : mode;
  syncGizmo(); renderCtxbar(); updateAssistant();
  if (gizmo) { emit('gizmo:' + gizmo, false); flash(gizmo === 'translate'
    ? '✥ <b>Flèches 3D</b> : tire la flèche <b style="color:#dc2626">rouge</b> (gauche ↔ droite), <b style="color:#16a34a">verte</b> (monter / descendre) ou <b style="color:#2563eb">bleue</b> (avant ↔ arrière). Reclique sur le bouton pour les cacher.'
    : '⟲ <b>Tourner en 3D</b> : tire un anneau pour faire tourner l’objet dans ce sens (par pas de 15°). Le bouton ⤵ <b>Retourner</b> le met directement la tête en bas.'); }
}
function syncGizmo() {
  const sel = [...state.selected];
  if (!gizmo || !sel.length || state.preview || state.mode === 'drill') { tc.detach(); group = null; return; }
  if (sel.length === 1) { group = null; if (tc.object !== sel[0].mesh) tc.attach(sel[0].mesh); }
  else {
    pivot.position.copy(groupBox(sel).getCenter(new THREE.Vector3())); pivot.quaternion.identity();
    group = { objs: sel }; prepGroup();
    if (tc.object !== pivot) tc.attach(pivot);
  }
  tc.setMode(gizmo); tc.setTranslationSnap(state.grid);
}

/* ----- Poignées : tirer un coin ou un bord pour agrandir, le dessus pour la hauteur ----- */
const HANDLES = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, 0], [1, 0], [0, -1], [0, 1], 'top'];
let rs = null;
$('#handles').innerHTML = HANDLES.map((h, i) => {
  const kind = h === 'top' ? 'top' : h[0] && h[1] ? 'corner' : 'edge';
  const help = kind === 'top' ? 'Tire vers le haut ou le bas pour changer la hauteur. Le bas de l’objet ne bouge pas.'
    : `Tire ce ${kind === 'corner' ? 'coin' : 'bord'} pour agrandir ou rétrécir : le côté opposé ne bouge pas. Maintiens <b>Maj</b> pour garder les proportions.`;
  return `<button class="hdl ${kind}" data-i="${i}" data-title="${kind === 'top' ? 'Poignée de hauteur' : 'Poignée d’agrandissement'}" data-help="${help}" aria-label="${kind === 'top' ? 'Changer la hauteur' : 'Agrandir'}"></button>`;
}).join('');
$('#handles').addEventListener('pointerdown', e => {
  const b = e.target.closest('.hdl'), o = [...state.selected][0]; if (!b || !o) return;
  e.preventDefault(); b.setPointerCapture(e.pointerId);
  const h = HANDLES[+b.dataset.i]; o.mesh.updateMatrixWorld(true);
  const M = o.mesh.matrixWorld.clone(), s0 = { ...o.size };
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).normalize();
  let plane;
  if (h === 'top') { // plan vertical tourné vers la caméra
    const d = camera.getWorldDirection(new THREE.Vector3());
    plane = new THREE.Plane().setFromNormalAndCoplanarPoint(d.sub(up.clone().multiplyScalar(d.dot(up))).normalize(), new THREE.Vector3().applyMatrix4(M));
  } else plane = new THREE.Plane().setFromNormalAndCoplanarPoint(up, new THREE.Vector3(0, -s0.y / 2, 0).applyMatrix4(M));
  rs = { o, h, M, Minv: M.clone().invert(), s0, plane, n: null };
});
$('#handles').addEventListener('pointermove', e => {
  if (!rs) return;
  setRay(e); const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(rs.plane, p)) return;
  const L = p.applyMatrix4(rs.Minv), { s0, h } = rs, g = state.grid, sn = v => Math.max(g, Math.round(v / g) * g);
  const keep = e.shiftKey || state.lock;
  let nx = s0.x, ny = s0.y, nz = s0.z, cx = 0, cz = 0;
  if (h === 'top') { ny = sn(L.y + s0.y / 2); if (keep) { const f = ny / s0.y; nx = r2(s0.x * f); nz = r2(s0.z * f); } }
  else {
    [cx, cz] = h;
    if (cx) nx = sn(cx * L.x + s0.x / 2);
    if (cz) nz = sn(cz * L.z + s0.z / 2);
    if (keep) { const f = cx && cz ? Math.max(nx / s0.x, nz / s0.z) : cx ? nx / s0.x : nz / s0.z; nx = r2(s0.x * f); nz = r2(s0.z * f); ny = r2(s0.y * f); }
  }
  // le côté opposé et le bas restent fixes
  const c = new THREE.Vector3(cx ? -cx * s0.x / 2 + cx * nx / 2 : 0, -s0.y / 2 + ny / 2, cz ? -cz * s0.z / 2 + cz * nz / 2 : 0).applyMatrix4(rs.M);
  const m = rs.o.mesh; m.position.copy(c); m.scale.set(nx / s0.x, ny / s0.y, nz / s0.z); m.updateMatrixWorld(true);
  rs.n = { nx, ny, nz, c };
  const tip = $('#draginfo'); tip.hidden = false;
  tip.style.left = (e.clientX + 16) + 'px'; tip.style.top = (e.clientY + 12) + 'px';
  tip.innerHTML = `Largeur <b>${r2(nx)}</b> · Profondeur <b>${r2(nz)}</b> · Hauteur <b>${r2(ny)}</b> mm${keep ? '<br><small>proportions gardées</small>' : '<br><small>Maj : garder les proportions</small>'}`;
});
$('#handles').addEventListener('pointerup', () => {
  if (!rs) return;
  const { o, n } = rs; rs = null; $('#draginfo').hidden = true;
  o.mesh.scale.set(1, 1, 1);
  if (!n) { syncTransform(o); return; }
  o.size = { x: r2(n.nx), y: r2(n.ny), z: r2(n.nz) }; o.pos = { x: r2(n.c.x), y: r2(n.c.y), z: r2(n.c.z) };
  syncMesh(o); linkLid(o); emit('resize', false); pushHistory(); refreshUI();
});
function selectOnly(o) { state.selected.clear(); if (o) state.selected.add(o); refreshUI(); }

function renderOutliner() {
  const el = $('#outliner');
  if (!state.objects.length) { el.innerHTML = '<li class="muted">Rien pour l’instant</li>'; return; }
  const ic = KI;
  el.innerHTML = state.objects.map(o => `<li data-id="${o.id}" class="${state.selected.has(o) ? 'on' : ''}"><span>${ic[o.kind]}</span>${o.kind === 'solid' ? `<i style="background:${o.color}"></i>` : ''}${esc(o.name)}</li>`).join('');
}
$('#outliner').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]'); if (!li) return;
  const o = state.objects.find(x => x.id === +li.dataset.id);
  if (e.shiftKey || e.ctrlKey) { state.selected.has(o) ? state.selected.delete(o) : state.selected.add(o); refreshUI(); } else selectOnly(o);
});

/* ================= Souris dans la vue ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
function pick(e, filter) {
  setRay(e);
  const list = state.objects.filter(o => o.mesh.visible && (!filter || filter(o)));
  const hits = ray.intersectObjects(list.map(o => o.mesh), false);
  if (!hits.length) return null;
  if (state.xray) { const h = hits.find(h => h.object.userData.obj.kind !== 'solid'); if (h) return h; }
  return hits[0];
}

let press = null, hoverObj = null;
// Double-clic sur une silhouette : on rouvre son dessin
view.addEventListener('dblclick', e => {
  if (e.target !== renderer.domElement || state.mode === 'drill') return;
  const h = pick(e), o = h?.object.userData.obj;
  if (o?.type === 'silhouette') editSilhouette(o);
  else if (o?.type === 'custom' && o.params.src?.some(s => s.type === 'silhouette')) toast('Cette silhouette a été fusionnée : clique d’abord sur « Défusionner », puis double-clique sur la silhouette.');
});
view.addEventListener('pointerdown', e => {
  if (e.target !== renderer.domElement || e.button !== 0) return;
  if (tc.object && tc.axis) { controls.enabled = false; return; } // on attrape une flèche ou un anneau 3D
  if (state.preview) setPreview(false);
  if (state.mode === 'drill') {
    const h = pick(e, o => o.kind === 'solid');
    if (h) { controls.enabled = false; press = { x: e.clientX, y: e.clientY, drill: h }; }
    return;
  }
  const h = pick(e);
  if (!h) { press = { x: e.clientX, y: e.clientY, empty: true }; return; }
  const o = h.object.userData.obj;
  controls.enabled = false;
  if (e.shiftKey || e.ctrlKey) { state.selected.has(o) ? state.selected.delete(o) : state.selected.add(o); refreshUI(); press = { x: e.clientX, y: e.clientY }; return; }
  if (!state.selected.has(o)) selectOnly(o);
  const objs = [...state.selected];
  press = { x: e.clientX, y: e.clientY, drag: { objs, lead: o, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -h.point.y), start: h.point.clone(), starts: objs.map(x => ({ ...x.pos })), moved: false } };
}, true);

window.addEventListener('pointermove', e => {
  if (press?.drag) {
    const d = press.drag;
    if (!d.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 4) return;
    d.moved = true; setRay(e);
    const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(d.plane, p)) return;
    const ls = d.starts[d.objs.indexOf(d.lead)], g = state.grid;
    const dx = Math.round((ls.x + p.x - d.start.x) / g) * g - ls.x, dz = Math.round((ls.z + p.z - d.start.z) / g) * g - ls.z;
    d.objs.forEach((o, i) => { o.pos.x = r2(d.starts[i].x + dx); o.pos.z = r2(d.starts[i].z + dz); syncTransform(o); });
    const tip = $('#draginfo'); tip.hidden = false;
    tip.style.left = (e.clientX + 16) + 'px'; tip.style.top = (e.clientY + 12) + 'px';
    tip.innerHTML = `X <b>${r2(d.lead.pos.x)}</b> · Y <b>${r2(-d.lead.pos.z)}</b> mm<br><small>déplacé de ${r2(dx)} ; ${r2(-dz)}</small>`;
    return;
  }
  if (press) return;
  if (e.target !== renderer.domElement) { setHover(null); drillPrev.visible = false; return; }
  if (state.mode === 'drill') {
    const h = pick(e, o => o.kind === 'solid');
    setHover(h ? h.object.userData.obj : null);
    if (h) { const s = drillSpec(h); drillPrev.geometry = drill.shape === 'round' ? cylGeo : boxGeo; drillPrev.position.copy(s.center); drillPrev.quaternion.copy(s.q); drillPrev.scale.set(s.size.x, s.size.y, s.size.z); drillPrev.visible = true; $('#drill-depth-info').textContent = `Épaisseur traversée : ${r2(s.t)} mm`; }
    else drillPrev.visible = false;
    return;
  }
  const h = pick(e); setHover(h ? h.object.userData.obj : null);
});

window.addEventListener('pointerup', e => {
  if (!press) return;
  const p = press; press = null; controls.enabled = true; $('#draginfo').hidden = true;
  const click = Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5;
  if (p.drag?.moved) { emit('move', false); pushHistory(); refreshUI(); }
  else if (p.empty && click && !e.shiftKey && state.selected.size) selectOnly(null);
  else if (p.drill && click) drillAt(p.drill);
});

function setHover(o) {
  if (hoverObj === o) return;
  if (hoverObj?.mesh?.material?.emissive) hoverObj.mesh.material.emissive.setHex(0);
  hoverObj = o;
  if (o?.mesh?.material?.emissive) o.mesh.material.emissive.setHex(o.kind === 'solid' ? 0x202020 : 0x400010);
  renderer.domElement.style.cursor = state.mode === 'drill' ? (o ? 'crosshair' : 'default') : (o ? 'grab' : 'default');
}

/* ================= Outil Percer ================= */
const drill = { preset: 'led5', shape: 'round', d: 5.2, w: 10, h: 6, auto: true, depth: 3 };
const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 40), boxGeo = new THREE.BoxGeometry(1, 1, 1);
const drillPrev = new THREE.Mesh(cylGeo, new THREE.MeshStandardMaterial({ color: 0xe11d48, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false }));
drillPrev.renderOrder = 5; drillPrev.visible = false; scene.add(drillPrev);

function drillSpec(hit) {
  const mesh = hit.object;
  const n = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  if (n.dot(ray.ray.direction) > 0) n.negate();
  const p = hit.point.clone(), g = state.grid;
  for (const k of ['x', 'y', 'z']) if (Math.abs(n[k]) < 0.02) p[k] = Math.round(p[k] / g) * g;
  let len, center, t;
  if (drill.auto) {
    const rc = new THREE.Raycaster(p.clone().addScaledVector(n, -0.02), n.clone().negate(), 0, 3000);
    const hs = rc.intersectObject(mesh, false);
    t = hs.length ? hs[0].distance + 0.02 : 5;
    len = t + 2; center = p.clone().addScaledVector(n, -t / 2);
  } else { t = drill.depth; len = t + 1; center = p.clone().addScaledVector(n, 1 - len / 2); }
  const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const zA = up.sub(n.clone().multiplyScalar(up.dot(n))).normalize(), xA = new THREE.Vector3().crossVectors(n, zA);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, n, zA));
  const size = drill.shape === 'round' ? { x: drill.d, y: len, z: drill.d } : { x: drill.w, y: len, z: drill.h };
  return { center, q, size, t };
}
function drillAt(hit) {
  const s = drillSpec(hit), pr = H.DRILL_PRESETS.find(p => p.k === drill.preset);
  const label = pr && !['round', 'rect'].includes(pr.k) ? pr.label : drill.shape === 'round' ? `Ø${drill.d}` : `${drill.w}×${drill.h}`;
  const o = newObj(drill.shape === 'round' ? 'cylinder' : 'cube', { kind: 'hole', size: { x: r2(s.size.x), y: r2(s.size.y), z: r2(s.size.z) }, params: { seg: 48, preset: drill.preset }, name: uniqueName('Trou ' + label) });
  o.pos = { x: r2(s.center.x), y: r2(s.center.y), z: r2(s.center.z) };
  o.quat = s.q.toArray();
  emit('drill', false); emit('hole', false);
  flash(`✅ Trou percé : <b>${label}</b>, ${r2(s.t)} mm d’épaisseur traversée. Clique encore pour en percer un autre, ou <b>Échap</b> pour terminer.`);
  addObject(o, { place: false });
}
function setMode(m) {
  queueMicrotask(syncGizmo);
  state.mode = m;
  $('#drill-panel').hidden = m !== 'drill';
  $('#tool-drill').classList.toggle('on', m === 'drill');
  document.body.classList.toggle('drilling', m === 'drill');
  drillPrev.visible = false; setHover(null);
  if (m === 'drill') { if (state.preview) setPreview(false); emit('open:drill'); }
  updateAssistant();
}
function initDrillPanel() {
  const sel = $('#drill-preset'), groups = {};
  for (const p of H.DRILL_PRESETS) (groups[p.g] ||= []).push(p);
  sel.innerHTML = Object.entries(groups).map(([g, l]) => `<optgroup label="${g}">${l.map(p => `<option value="${p.k}">${p.label}${p.d && !['round'].includes(p.k) ? ` (Ø${p.d})` : p.w && p.k !== 'rect' ? ` (${p.w}×${p.h})` : ''}</option>`).join('')}</optgroup>`).join('');
  sel.value = drill.preset;
  const apply = () => {
    const p = H.DRILL_PRESETS.find(x => x.k === sel.value); drill.preset = p.k; drill.shape = p.shape;
    if (p.d) drill.d = p.d; if (p.w) { drill.w = p.w; drill.h = p.h; }
    $('#drill-d').value = drill.d; $('#drill-w').value = drill.w; $('#drill-h').value = drill.h;
    $('#drill-round').hidden = drill.shape !== 'round'; $('#drill-rect').hidden = drill.shape !== 'rect';
  };
  sel.addEventListener('change', apply); apply();
  $('#drill-d').addEventListener('change', e => { drill.d = Math.max(0.5, +e.target.value || 5); });
  $('#drill-w').addEventListener('change', e => { drill.w = Math.max(0.5, +e.target.value || 10); });
  $('#drill-h').addEventListener('change', e => { drill.h = Math.max(0.5, +e.target.value || 6); });
  $('#drill-auto').addEventListener('change', e => { drill.auto = e.target.checked; $('#drill-depth').disabled = drill.auto; });
  $('#drill-depth').addEventListener('change', e => { drill.depth = Math.max(0.2, +e.target.value || 3); });
  $('#drill-done').addEventListener('click', () => setMode('select'));
}

/* ================= Panneau Propriétés ================= */
const num = (id, label, v, help) => `<label class="num" data-help="${help}" data-title="${label}"><span>${label}</span><input id="f-${id}" data-f="${id}" type="number" step="any" value="${r2(v)}"></label>`;
function typeParams(o) {
  const p = o.params;
  switch (o.type) {
    case 'text': return `<h4>Texte</h4><input class="wide" data-f="text" value="${esc(p.text)}" maxlength="40">
      <label class="chk"><input type="checkbox" data-f="standing" ${p.standing ? 'checked' : ''}> Debout (sinon couché à plat)</label>
      <p class="muted small">Les accents sont retirés (É → E) pour l’impression.</p>`;
    case 'cylinder': case 'cone': return `<h4>Forme</h4>${num('seg', 'Nombre de côtés', p.seg || 64, '3 = prisme triangulaire, 6 = hexagone, 64 = bien rond.')}`;
    case 'star': return `<h4>Forme</h4>${num('n', 'Branches', p.n || 5, 'Nombre de branches de l’étoile (3 à 16).')}`;
    case 'tube': return `<h4>Forme</h4>${num('wall', 'Épaisseur de paroi', p.wall ?? 2, 'Épaisseur du tour du tube, en mm.')}`;
    case 'box': return `<h4>Boîte</h4>${shapeSelect(p)}${num('wall', 'Épaisseur des parois', p.wall ?? 2, 'Parois et fond. 2 mm, c’est solide.')}
      <p class="muted small">Les dimensions ci-dessous sont celles de l’extérieur. Le couvercle suit les changements de forme et de taille.</p>`;
    case 'lid': return `<h4>Couvercle</h4>${num('skirt', 'Hauteur des bords (0 = plat)', p.skirt || 0, 'Hauteur des bords extérieurs du couvercle. Plus grand = la boîte se ferme comme deux moitiés.')}
      ${num('clr', 'Jeu (mm)', p.clr ?? 0.3, 'Espace laissé pour que le couvercle rentre sans forcer. Trop serré ? Mets 0,4 ou 0,5.')}
      <p class="muted small">La hauteur ci-dessous = plaque + bords + rebord qui rentre dans la boîte.</p>`;
    case 'silhouette': return `<button class="wide" data-act="edit-sil">${ic('pencil')} Modifier le dessin</button>`;
    default: return '';
  }
}
const openSecs = new Set();
$('#props').addEventListener('toggle', e => { const d = e.target.closest?.('details[data-sec]'); if (d) d.open ? openSecs.add(d.dataset.sec) : openSecs.delete(d.dataset.sec); }, true);
function shapeSelect(p) {
  return `<label class="num" data-title="Forme de la boîte" data-help="Le contour de la boîte vue de dessus."><span>Forme</span><select data-f="bshape">${Object.entries(BOX_SHAPES).map(([k, l]) => `<option value="${k}" ${(p.shape || 'rect') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${p.shape === 'round' ? num('radius', 'Rayon des coins', p.r || 0, 'Plus le rayon est grand, plus les coins sont arrondis.') : ''}`;
}
function renderProps() {
  const el = $('#props'), sel = [...state.selected];
  if (!sel.length) { el.innerHTML = `<h3>Propriétés</h3><p class="muted">Sélectionne un objet pour voir et changer ses mesures.</p>`; return; }
  if (sel.length > 1) {
    el.innerHTML = `<h3>${sel.length} objets sélectionnés</h3>
      <button id="btn-merge" class="primary wide" data-act="merge" data-title="Fusionner" data-help="Colle toutes les pièces sélectionnées en une seule. Les trous sélectionnés creusent la matière.">${ic('merge')} Fusionner en une pièce</button>
      <h4>${ic('alignx')} Aligner sur les 3 axes</h4>${alignGrid()}
      <h4>Rôle de tous</h4><div class="seg">
      <button data-act="kind:solid">${KI.solid}Matière</button><button data-act="kind:hole">${KI.hole}Trou</button><button data-act="kind:ghost">${KI.ghost}Repère</button></div>
      <div class="acts"><button data-act="dup">${ic('copy')} Dupliquer</button><button data-act="del" class="danger">${ic('trash')} Supprimer</button></div>`;
    return;
  }
  const o = sel[0], b = worldBox(o);
  el.innerHTML = `
    <input class="name" data-f="name" value="${esc(o.name)}" data-title="Nom" data-help="Donne un nom à ton objet pour le retrouver dans « Mes objets ».">
    <div class="seg kind">
      <button data-act="kind:solid" class="${o.kind === 'solid' ? 'on' : ''}" data-title="🧱 Matière" data-help="L’objet sera imprimé en plastique. Raccourci : S">${KI.solid}Matière</button>
      <button data-act="kind:hole" class="${o.kind === 'hole' ? 'on' : ''}" data-title="🕳️ Trou" data-help="L’objet devient un trou qui creuse toutes les pièces qu’il traverse. Raccourci : H">${KI.hole}Trou</button>
      <button data-act="kind:ghost" class="${o.kind === 'ghost' ? 'on' : ''}" data-title="👻 Repère" data-help="L’objet n’est jamais imprimé : il sert juste à mesurer ou à vérifier que tout rentre.">${KI.ghost}Repère</button>
    </div>
    ${o.kind === 'solid' ? `<div class="colors">${COLORS.map(c => `<button data-act="color:${c}" style="background:${c}" class="${c === o.color ? 'on' : ''}" aria-label="Couleur ${c}"></button>`).join('')}</div>` : ''}
    ${typeParams(o)}
    <h4>Dimensions <small>en mm</small></h4>
    <div class="row3">${num('sx', 'Largeur', o.size.x, 'Taille de gauche à droite.')}${num('sy', 'Profondeur', o.size.z, 'Taille de l’avant vers l’arrière.')}${num('sz', 'Hauteur', o.size.y, 'Taille de bas en haut.')}</div>
    <label class="chk" data-title="Garder les proportions" data-help="Si c’est coché, changer une mesure agrandit (ou réduit) tout l’objet sans le déformer."><input type="checkbox" id="f-lock" ${state.lock ? 'checked' : ''}> Garder les proportions</label>
    <details data-sec="pos" ${openSecs.has('pos') ? 'open' : ''}><summary>${ic('move')} Position précise <small>en mm</small></summary>
    <div class="row3">${num('px', 'X ↔', o.pos.x, 'Position de gauche à droite (0 = centre du plateau).')}${num('py', 'Y ↕', -o.pos.z, 'Position de l’avant vers l’arrière (0 = centre du plateau).')}${num('pz', 'Z ↑', b.min.y, 'Hauteur du BAS de l’objet au-dessus du plateau. 0 = posé sur le plateau.')}</div>
    </details>
    <details data-sec="rot" ${openSecs.has('rot') ? 'open' : ''}><summary>${ic('rotl')} Tourner</summary>
    <label class="chk">Angle : <select id="f-rotstep">${[90, 45, 15, 5].map(a => `<option ${a === state.rotStep ? 'selected' : ''}>${a}</option>`).join('')}</select> °</label>
    <div class="rot">
      <span>À plat</span><button data-act="rot:y:1" data-title="Tourner à plat" data-help="Tourne l’objet sur lui-même, comme une toupie.">${ic('rotl')}</button><button data-act="rot:y:-1">${ic('rotr')}</button>
      <span>Vers l’avant</span><button data-act="rot:x:1" data-title="Basculer" data-help="Fait basculer l’objet vers l’avant ou vers l’arrière.">${ic('rotl')}</button><button data-act="rot:x:-1">${ic('rotr')}</button>
      <span>Sur le côté</span><button data-act="rot:z:1" data-title="Coucher sur le côté" data-help="Fait basculer l’objet vers la gauche ou vers la droite.">${ic('rotl')}</button><button data-act="rot:z:-1">${ic('rotr')}</button>
    </div></details>
    <div class="acts">
      <button data-act="drop" data-title="Poser (D)" data-help="Fait descendre l’objet sur ce qu’il y a en dessous : le plateau ou une autre pièce.">${ic('drop')} Poser</button>
      <button data-act="dup" data-title="Dupliquer (Ctrl + D)" data-help="Fait une copie juste à côté.">${ic('copy')} Dupliquer</button>
      <button data-act="mirror" data-title="Miroir" data-help="Retourne l’objet comme dans un miroir (gauche ↔ droite). Utile pour faire la paire : bras gauche et bras droit.">${ic('mirror')} Miroir</button>
      <button data-act="del" class="danger" data-title="Supprimer (Suppr)" data-help="Supprime l’objet. Ctrl + Z pour le récupérer.">${ic('trash')} Supprimer</button>
    </div>`;
}
$('#props').addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'f-lock') { state.lock = t.checked; return; }
  if (t.id === 'f-rotstep') { state.rotStep = +t.value; return; }
  const f = t.dataset.f; if (!f) return;
  const o = [...state.selected][0]; if (o) applyField(o, f, t);
});
/** Applique une valeur tapée (panneau Propriétés ou étiquette dans la vue). */
function applyField(o, f, t) {
  const v = +t.value, b0 = worldBox(o).min.y;
  switch (f) {
    case 'name': o.name = t.value.trim() || o.name; break;
    case 'sx': case 'sy': case 'sz': {
      if (!(v > 0)) break;
      const k = { sx: 'x', sy: 'z', sz: 'y' }[f], val = Math.max(0.2, v);
      if (state.lock) { const r = val / o.size[k]; for (const a of ['x', 'y', 'z']) o.size[a] = r2(o.size[a] * r); } else o.size[k] = val;
      syncMesh(o); setMinY(o, b0); linkLid(o); emit('resize', false); break;
    }
    case 'px': o.pos.x = v; syncTransform(o); break;
    case 'py': o.pos.z = -v; syncTransform(o); break;
    case 'pz': setMinY(o, v); break;
    case 'text': {
      const old = natSize('text', o.params), nat = natSize('text', { ...o.params, text: t.value });
      const st = o.params.standing, k = st ? o.size.y / old.y : o.size.z / old.z;
      o.params.text = t.value;
      o.size = st ? { x: r2(nat.x * k), y: r2(nat.y * k), z: o.size.z } : { x: r2(nat.x * k), y: o.size.y, z: r2(nat.z * k) };
      syncMesh(o); setMinY(o, b0); emit('text', false); break;
    }
    case 'standing': o.params.standing = t.checked; o.size = { x: o.size.x, y: o.size.z, z: o.size.y }; syncMesh(o); setMinY(o, b0); break;
    case 'seg': o.params.seg = Math.max(3, Math.min(128, Math.round(v) || 64)); syncMesh(o); break;
    case 'n': o.params.n = Math.max(3, Math.min(16, Math.round(v) || 5)); syncMesh(o); break;
    case 'wall': o.params.wall = Math.max(0.4, v || 2); syncMesh(o); setMinY(o, b0); linkLid(o); break;
    case 'clr': o.params.clr = Math.max(0, Math.min(2, v)); syncMesh(o); break;
    case 'bshape': o.params.shape = t.value; syncMesh(o); linkLid(o); break;
    case 'radius': o.params.r = Math.max(0, v || 0); syncMesh(o); linkLid(o); break;
    case 'skirt': { const old = o.params.skirt || 0; o.params.skirt = Math.max(0, v || 0); o.size.y = r2(o.size.y + o.params.skirt - old); syncMesh(o); setMinY(o, b0); break; }
  }
  pushHistory(); refreshUI();
}
$('#props').addEventListener('click', onActClick);
$('#ctxbar').addEventListener('click', onActClick);
function onActClick(e) {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const [a, x, y] = btn.dataset.act.split(':'), sel = [...state.selected];
  if (a === 'kind') return setKind(sel, x);
  if (a === 'color') { sel.forEach(o => { o.color = x.startsWith('#') ? x : '#' + x; syncMesh(o); }); pushHistory(); return refreshUI(); }
  if (a === 'rot') return rotateSel(x, +y);
  if (a === 'drop') return dropSel();
  if (a === 'dup') return duplicateSel();
  if (a === 'del') return deleteSel();
  if (a === 'mirror') { sel.forEach(o => { o.params.mirror = !o.params.mirror; syncMesh(o); }); pushHistory(); return refreshUI(); }
  if (a === 'merge') return mergeSel();
  if (a === 'align') return alignSel(x, y || 'mid');
  if (a === 'alignpop') { alignPop = !alignPop; return renderCtxbar(); }
  if (a === 'edit-sil') return editSilhouette(sel[0]);
  if (a === 'drill') return setMode('drill');
  if (a === 'gizmo') return setGizmo(x);
  if (a === 'flip') return rotateSel('x', 1, 180);
  if (a === 'unmerge') return unmergeSel();
}
function linkLid(box) {
  if (box.type !== 'box') return;
  for (const l of state.objects.filter(o => o.type === 'lid' && o.params.boxId === box.id)) {
    const b0 = worldBox(l).min.y; l.size.x = box.size.x; l.size.z = box.size.z;
    l.params.wall = box.params.wall; l.params.shape = box.params.shape; l.params.r = box.params.r;
    syncMesh(l); setMinY(l, b0);
    // s'il a grandi jusqu'à chevaucher la boîte, le couvercle se pousse à côté
    const B = worldBox(box), Lb = worldBox(l);
    if (B.intersectsBox(Lb)) { l.pos.x = r2(l.pos.x + (B.max.x + 6 - Lb.min.x)); syncTransform(l); }
  }
}
function setKind(list, k) {
  list.forEach(o => { o.kind = k; syncMesh(o); emit('kind:' + k, false); });
  if (k === 'hole') emit('hole', false);
  pushHistory(); refreshUI();
}
function rotateSel(axis, sign, deg = state.rotStep) {
  const ax = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }[axis];
  const q = new THREE.Quaternion().setFromAxisAngle(ax, sign * deg * Math.PI / 180);
  for (const o of state.selected) { const b0 = worldBox(o).min.y; o.quat = new THREE.Quaternion().fromArray(o.quat).premultiply(q).normalize().toArray(); syncTransform(o); setMinY(o, b0); }
  emit('rotate', false); pushHistory(); refreshUI();
}
function dropSel() {
  const down = new THREE.Vector3(0, -1, 0);
  for (const o of state.selected) {
    const b = worldBox(o), others = state.objects.filter(x => x !== o && x.kind === 'solid' && !state.selected.has(x)).map(x => x.mesh);
    let top = 0;
    for (const [fx, fz] of [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) {
      const org = new THREE.Vector3(b.min.x + (b.max.x - b.min.x) * fx, b.max.y + 0.01, b.min.z + (b.max.z - b.min.z) * fz);
      for (const h of new THREE.Raycaster(org, down).intersectObjects(others, false)) {
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
        if (Math.abs(n.y) > 0.3) { top = Math.max(top, h.point.y); break; }
      }
    }
    setMinY(o, r2(top));
  }
  emit('drop', false); pushHistory(); refreshUI();
}
function duplicateSel() {
  const copies = [...state.selected].map(o => {
    const c = { ...ser(o), id: uid++, name: uniqueName(o.name.replace(/ \d+$/, '')) };
    c.pos.x = r2(c.pos.x + Math.max(5, Math.round(worldBox(o).max.x - worldBox(o).min.x) + 5));
    state.objects.push(c); syncMesh(c); return c;
  });
  state.selected = new Set(copies); emit('dup', false); pushHistory(); refreshUI();
}
function deleteSel() { if (!state.selected.size) return; removeObjects([...state.selected]); pushHistory(); refreshUI(); }
/** Grille d'alignement : 3 axes × (début, centre, fin). Repère = la plus grande pièce. */
function alignGrid() {
  const rows = [['x', '↔ Gauche – droite', ['Gauche', 'Centre', 'Droite']], ['z', '⤢ Arrière – avant', ['Arrière', 'Centre', 'Avant']], ['y', '↕ Hauteur', ['Bas', 'Milieu', 'Haut']]];
  return `<div class="align-grid">${rows.map(([a, label, ws]) => `<span>${label}</span>${['min', 'mid', 'max'].map((w, i) =>
    `<button data-act="align:${a}:${w}" data-title="Aligner : ${ws[i]}" data-help="${w === 'mid' ? 'Met le centre de chaque pièce au centre de la plus grande pièce, sur cet axe.' : `Colle chaque pièce contre le côté « ${ws[i]} » de la plus grande pièce (les bords sont alignés).`}">${ws[i]}</button>`).join('')}`).join('')}</div>
    <p class="muted small">Les pièces s’alignent sur la plus grande (elle ne bouge pas).</p>`;
}
let alignPop = false;
function alignSel(axis, where = 'mid') {
  const sel = [...state.selected]; if (sel.length < 2) return;
  const boxes = new Map(sel.map(o => [o, worldBox(o)]));
  const vol = b => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
  const ref = sel.reduce((a, o) => (vol(boxes.get(o)) > vol(boxes.get(a)) ? o : a), sel[0]), R = boxes.get(ref);
  const target = where === 'min' ? R.min[axis] : where === 'max' ? R.max[axis] : (R.min[axis] + R.max[axis]) / 2;
  for (const o of sel) {
    if (o === ref) continue;
    const b = boxes.get(o), cur = where === 'min' ? b.min[axis] : where === 'max' ? b.max[axis] : (b.min[axis] + b.max[axis]) / 2;
    o.pos[axis] = r2(o.pos[axis] + target - cur); syncTransform(o);
  }
  emit('align', false); pushHistory(); refreshUI();
}
async function mergeSel() {
  const sel = [...state.selected].filter(o => o.kind !== 'ghost');
  if (sel.length < 2) return toast('Sélectionne au moins 2 objets (Maj + clic) pour les fusionner.');
  const solids = sel.filter(o => o.kind === 'solid'), holes = sel.filter(o => o.kind === 'hole');
  busy(true, 'Fusion en cours…'); await nextFrame();
  let geo;
  try { geo = solids.length ? combine(solids.map(baked), holes.map(baked)) : combine(holes.map(baked)); }
  catch (e) { console.error(e); busy(false); return toast('Oups, la fusion n’a pas marché avec ces formes. Essaie de les déplacer un tout petit peu.'); }
  busy(false);
  if (!geo || !geo.attributes.position.count) return toast('Le résultat est vide : les trous ont tout creusé !');
  geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3()), s = geo.boundingBox.getSize(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);
  const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  geoStore.set(id, new Float32Array(geo.attributes.position.array));
  const size = { x: r2(s.x), y: r2(s.y), z: r2(s.z) };
  // On garde les objets d'origine et la position de départ : « Défusionner » pourra les remettre
  const o = newObj('custom', { kind: solids.length ? 'solid' : 'hole', color: solids[0]?.color, size, params: { geoId: id, src: sel.map(ser), frame: { pos: { x: c.x, y: c.y, z: c.z }, size: { ...size } } } });
  o.pos = { x: c.x, y: c.y, z: c.z };
  removeObjects(sel);
  emit('merge', false);
  addObject(o, { place: false });
  flash('🔗 Fusion réussie : c’est maintenant une seule pièce. Tu pourras la séparer avec « Défusionner ».');
}
function unmergeSel() {
  const o = [...state.selected][0];
  if (!o || o.type !== 'custom') return toast('Sélectionne une pièce fusionnée pour la défusionner.');
  if (!o.params.src?.length) return toast('Cette pièce a été fusionnée avec une ancienne version : on ne peut plus la séparer (essaie ↶ Annuler).');
  const f = o.params.frame;
  // déplacement / rotation / agrandissement subis par la pièce depuis la fusion
  const T = new THREE.Matrix4().compose(new THREE.Vector3(o.pos.x, o.pos.y, o.pos.z), new THREE.Quaternion().fromArray(o.quat),
    new THREE.Vector3(o.size.x / f.size.x, o.size.y / f.size.y, o.size.z / f.size.z))
    .multiply(new THREE.Matrix4().makeTranslation(-f.pos.x, -f.pos.y, -f.pos.z));
  const back = o.params.src.map(r => {
    const c = { ...JSON.parse(JSON.stringify(r)), id: uid++ };
    const m = T.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(c.pos.x, c.pos.y, c.pos.z), new THREE.Quaternion().fromArray(c.quat), new THREE.Vector3(1, 1, 1)));
    const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(); m.decompose(P, Q, S);
    c.pos = { x: r2(P.x), y: r2(P.y), z: r2(P.z) }; c.quat = Q.toArray();
    if (Math.abs(S.x - 1) + Math.abs(S.y - 1) + Math.abs(S.z - 1) > 1e-3) c.size = { x: r2(c.size.x * S.x), y: r2(c.size.y * S.y), z: r2(c.size.z * S.z) };
    return c;
  });
  removeObjects([o]);
  for (const c of back) { state.objects.push(c); syncMesh(c); }
  state.selected = new Set(back);
  emit('unmerge', false); pushHistory(); refreshUI();
  flash(`✂️ Pièce séparée : les ${back.length} objets d’origine sont revenus, à leur place.`);
}

/* ================= Aperçu final et téléchargement ================= */
let previewMeshes = [];
function holesFor(solids) { const hs = state.objects.filter(o => o.kind === 'hole'); return hs.filter(h => solids.some(s => touch(h, s))); }
async function setPreview(on) {
  for (const m of previewMeshes) { scene.remove(m); m.geometry.dispose(); }
  previewMeshes = [];
  state.preview = on; $('#btn-preview').classList.toggle('on', on); $('#btn-edit').classList.toggle('on', !on);
  document.body.classList.toggle('previewing', on);
  syncGizmo();
  if (!on) { state.objects.forEach(o => { o.mesh.visible = true; }); syncGizmo(); updateAssistant(); return; }
  if (state.mode === 'drill') setMode('select');
  const solids = state.objects.filter(o => o.kind === 'solid');
  if (!solids.length) { state.preview = false; $('#btn-preview').classList.remove('on'); $('#btn-edit').classList.add('on'); document.body.classList.remove('previewing'); return toast('Il n’y a encore aucune pièce en matière à montrer.'); }
  busy(true, 'Calcul de l’aperçu…'); await nextFrame();
  try {
    for (const s of solids) {
      const hs = holesFor([s]);
      const g = hs.length ? combine([baked(s)], hs.map(baked)) : baked(s);
      if (g) { const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.5, side: THREE.DoubleSide })); scene.add(m); previewMeshes.push(m); }
    }
  } catch (e) { console.error(e); toast('Le calcul de l’aperçu a échoué pour une des pièces.'); }
  busy(false);
  state.objects.forEach(o => { o.mesh.visible = false; });
  emit('preview');
}
function checks(solids) {
  const out = [], all = new THREE.Box3();
  if (!solids.length) return [{ lvl: 'bad', t: 'Il n’y a aucune pièce en <b>Matière</b> à télécharger.' }];
  for (const s of solids) {
    const b = worldBox(s); all.union(b);
    const sz = b.getSize(new THREE.Vector3());
    if (b.min.y > 0.1 && !solids.some(x => x !== s && touch(x, s))) out.push({ lvl: 'warn', t: `« ${esc(s.name)} » flotte à ${r2(b.min.y)} mm du plateau. Sélectionne-le et clique « Poser ».` });
    if (b.min.y < -0.1) out.push({ lvl: 'warn', t: `« ${esc(s.name)} » s’enfonce de ${r2(-b.min.y)} mm sous le plateau. L’imprimante remettra tout au niveau du plateau : vérifie que c’est voulu.` });
    if (Math.min(sz.x, sz.y, sz.z) < 0.8) out.push({ lvl: 'warn', t: `« ${esc(s.name)} » est très fin (${r2(Math.min(sz.x, sz.y, sz.z))} mm) : il risque de ne pas s’imprimer.` });
  }
  const as = all.getSize(new THREE.Vector3());
  if (as.x > PLATE || as.z > PLATE || as.y > MAXH) out.push({ lvl: 'bad', t: `L’ensemble mesure ${r2(as.x)} × ${r2(as.z)} × ${r2(as.y)} mm : c’est plus grand que l’imprimante (${PLATE} × ${PLATE} × ${MAXH} mm).` });
  for (const h of state.objects.filter(o => o.kind === 'hole')) if (!state.objects.some(s => s.kind === 'solid' && touch(h, s))) out.push({ lvl: 'info', t: `Le trou « ${esc(h.name)} » ne touche aucune pièce : il ne creusera rien.` });
  if (state.objects.some(o => o.kind === 'ghost')) out.push({ lvl: 'info', t: 'Les repères gris (composants) ne sont pas téléchargés : c’est normal.' });
  if (!out.length) out.push({ lvl: 'good', t: 'Tout a l’air prêt pour l’impression 👍' });
  out.push({ lvl: 'info', t: `Taille totale : ${r2(as.x)} × ${r2(as.z)} × ${r2(as.y)} mm.` });
  return out;
}
function openExport() {
  const hasSel = [...state.selected].some(o => o.kind === 'solid');
  $('#exp-sel').disabled = !hasSel; if (!hasSel) $('#exp-all').checked = true;
  $('#exp-name').value = $('#proj-name').value;
  renderExportChecks();
  $('#dlg-export').showModal();
}
function exportSolids() { return state.objects.filter(o => o.kind === 'solid' && ($('#exp-sel').checked ? state.selected.has(o) : true)); }
function renderExportChecks() { $('#exp-checks').innerHTML = checks(exportSolids()).map(c => `<div class="chk-${c.lvl}">${{ bad: '⛔', warn: '⚠️', info: 'ℹ️', good: '✅' }[c.lvl]} ${c.t}</div>`).join(''); }
$$('input[name="exp-what"]').forEach(r => r.addEventListener('change', renderExportChecks));
$('#exp-go').addEventListener('click', async () => {
  const solids = exportSolids(); if (!solids.length) return toast('Rien à télécharger.');
  const fmt = $('input[name="exp-fmt"]:checked').value, name = ($('#exp-name').value.trim() || 'mon-objet').replace(/[\\/:*?"<>|]/g, '-');
  busy(true, 'Préparation du fichier…'); await nextFrame();
  try {
    const hs = holesFor(solids);
    const g = (solids.length === 1 && !hs.length) ? baked(solids[0]) : combine(solids.map(baked), hs.map(baked));
    g.rotateX(Math.PI / 2); // l'imprimante compte la hauteur sur l'axe Z
    g.computeBoundingBox(); g.translate(0, 0, -g.boundingBox.min.z);
    const mesh = new THREE.Mesh(g);
    const data = fmt === 'stl' ? new STLExporter().parse(mesh, { binary: true }) : new OBJExporter().parse(mesh);
    busy(false);
    $('#dlg-export').close();
    askSave(new Blob([data], { type: fmt === 'stl' ? 'model/stl' : 'text/plain' }), `${name}.${fmt}`, fmt, where => {
      emit('export');
      flash(`⬇ <b>${name}.${fmt}</b> est enregistré ${where}. Ouvre-le dans le logiciel de l’imprimante.`);
    });
    return;
  } catch (e) { console.error(e); toast('Le fichier n’a pas pu être fabriqué. Essaie d’exporter les pièces une par une.'); }
  busy(false);
});
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

/* ----- Enregistrer : rappel du dossier de classe, puis fenêtre « Enregistrer sous » ----- */
const FILE_TYPES = {
  atelier3d: { description: 'Projet Atelier 3D', accept: { 'application/json': ['.atelier3d'] } },
  stl: { description: 'Fichier STL (impression 3D)', accept: { 'model/stl': ['.stl'] } },
  obj: { description: 'Fichier OBJ', accept: { 'text/plain': ['.obj'] } },
};
let pendingSave = null;
$('#save-path').innerHTML = H.SAVE_PATH.map((p, i) => `<li>${ic('folder')}<span>${esc(p)}</span></li>`).join('');
function askSave(blob, filename, type, done) {
  pendingSave = { blob, type, done, ext: '.' + type };
  $('#save-name').value = filename.replace(/\.[^.]+$/, '');
  $('#save-ext').textContent = '.' + type;
  $('#save-kind').textContent = type === 'atelier3d' ? 'ton projet (pour le reprendre plus tard)' : `le fichier ${type.toUpperCase()} pour l’imprimante`;
  $('#save-fallback').hidden = !!window.showSaveFilePicker;
  $('#dlg-save').showModal();
}
$('#save-go').addEventListener('click', async () => {
  if (!pendingSave) return;
  const { blob, type, done, ext } = pendingSave;
  const name = (($('#save-name').value.trim() || 'mon-objet').replace(/[\\/:*?"<>|]/g, '-')) + ext;
  if (window.showSaveFilePicker) {
    try {
      // « id » : le navigateur se souvient du dernier dossier choisi (le dossier d'équipe)
      const h = await window.showSaveFilePicker({ suggestedName: name, id: 'atelier3d-' + (type === 'atelier3d' ? 'projet' : 'impression'), startIn: 'desktop', types: [FILE_TYPES[type]] });
      const w = await h.createWritable(); await w.write(blob); await w.close();
      $('#dlg-save').close(); pendingSave = null;
      done?.(`sous le nom <b>${esc(h.name)}</b>, dans le dossier que tu as choisi`);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // fenêtre fermée : on reste sur le rappel du chemin
      console.warn(e);
    }
  }
  // navigateur sans fenêtre « Enregistrer sous » : téléchargement classique
  download(blob, name);
  $('#dlg-save').close(); pendingSave = null;
  done?.(`dans <b>Téléchargements</b> (${esc(name)}) : déplace-le dans le dossier de ton équipe`);
});

/* ================= Outils magiques ================= */
function initBoxDialog() {
  const sel = $('#box-preset');
  sel.innerHTML = H.BOX_PRESETS.map(p => `<option value="${p.k}">${p.label}</option>`).join('');
  // choix de la forme, avec un petit dessin de chaque contour
  const SH = { rect: '<rect x="4" y="7" width="24" height="18" rx="1"/>', round: '<rect x="4" y="7" width="24" height="18" rx="6"/>', ellipse: '<ellipse cx="16" cy="16" rx="12" ry="9"/>',
    hex: '<path d="M4 16 10 6h12l6 10-6 10H10z"/>', oct: '<path d="M11 5h10l7 7v8l-7 7H11l-7-7v-8z"/>' };
  let shape = 'rect';
  $('#box-shapes').innerHTML = Object.entries(BOX_SHAPES).map(([k, label]) => `<button type="button" data-shape="${k}" class="${k === 'rect' ? 'on' : ''}" role="radio" aria-checked="${k === 'rect'}"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">${SH[k]}</svg>${label}</button>`).join('');
  const K = () => (shape === 'hex' ? 1 / Math.cos(Math.PI / 6) : shape === 'oct' ? 1 / Math.cos(Math.PI / 8) : 1);
  const upd = () => {
    const L = +$('#box-L').value, P = +$('#box-P').value, Hh = +$('#box-H').value, w = +$('#box-wall').value, k = K();
    const lid = $('#box-lid').checked, skirt = Math.max(0, +$('#box-skirt').value || 0), lip = Math.max(0, +$('#box-lip').value || 0);
    const ox = L + 2 * w * k, oz = P + 2 * w * k, closed = Hh + w + (lid ? w + skirt : 0);
    $('#box-lid-opts').hidden = !lid;
    $('#box-r-wrap').hidden = shape !== 'round';
    $('#box-info').innerHTML = `Boîte : <b>${r2(ox)} × ${r2(oz)} × ${r2(Hh + w)} mm</b>` +
      (lid ? `<br>Couvercle : ${r2(w + skirt)} mm de haut${skirt ? ' (bords compris)' : ' (plat)'} + rebord de ${r2(lip)} mm qui rentre` : '') +
      `<br>Hauteur totale, boîte fermée : <b>${r2(closed)} mm</b>` +
      (ox > PLATE || oz > PLATE ? '<br><span class="bad">⚠️ Trop grand pour l’imprimante !</span>' : '');
  };
  $('#box-shapes').addEventListener('click', e => {
    const b = e.target.closest('[data-shape]'); if (!b) return;
    shape = b.dataset.shape;
    $$('#box-shapes button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    upd();
  });
  sel.addEventListener('change', () => { const p = H.BOX_PRESETS.find(x => x.k === sel.value); $('#box-L').value = p.L; $('#box-P').value = p.P; $('#box-H').value = p.H; upd(); });
  $$('#dlg-box input').forEach(i => i.addEventListener('input', upd));
  sel.dispatchEvent(new Event('change'));
  $('#box-ok').addEventListener('click', () => {
    const L = +$('#box-L').value, P = +$('#box-P').value, Hh = +$('#box-H').value, w = Math.max(0.8, +$('#box-wall').value), clr = +$('#box-clr').value;
    const skirt = Math.max(0, +$('#box-skirt').value || 0), lip = Math.max(0, +$('#box-lip').value || 0), r = shape === 'round' ? Math.max(0, +$('#box-r').value || 0) : 0, k = K();
    if (!(L > 2 && P > 2 && Hh > 2)) return toast('Donne des dimensions intérieures plus grandes que 2 mm.');
    const color = nextColor();
    const box = newObj('box', { size: { x: r2(L + 2 * w * k), y: r2(Hh + w), z: r2(P + 2 * w * k) }, params: { wall: w, shape, r }, color });
    state.objects.push(box); syncMesh(box);
    box.pos.x = -(box.size.x / 2 + 6) * ($('#box-lid').checked ? 1 : 0); syncTransform(box); setMinY(box, 0);
    if ($('#box-lid').checked) {
      const lid = newObj('lid', { size: { x: box.size.x, y: r2(w + skirt + lip), z: box.size.z }, params: { wall: w, clr, boxId: box.id, shape, r, skirt }, color });
      state.objects.push(lid); syncMesh(lid); lid.pos.x = box.size.x / 2 + 6; syncTransform(lid); setMinY(lid, 0);
    }
    state.selected = new Set([box]);
    $('#dlg-box').close();
    emit('box', false); pushHistory(); refreshUI(); setView('home');
    flash('📦 Ta boîte est prête ! À gauche la boîte, à droite le couvercle (posé à l’envers pour l’impression). Utilise <b>🔩 Percer</b> pour les trous.' +
      (2 * box.size.x + 12 > PLATE ? '<br>Ensemble, ils sont trop grands pour le plateau : au moment de télécharger, prends-les l’un après l’autre (« Seulement la sélection »).' : ''));
  });
}
function newSilhouette() {
  emit('open:silhouette');
  openSilhouette({}, r => {
    const o = newObj('silhouette', { size: { x: r2(r.w), y: r.thickness, z: r2(r.h) }, params: { loops: r.loops, src: r.src, sheet: r.sheet, fills: r.fills } });
    addObject(o); setView('home');
    flash(`🎭 Ta silhouette mesure ${r2(o.size.x)} × ${r2(o.size.z)} mm et ${r.thickness} mm d’épaisseur. Perce le trou de la baguette avec <b>🔩 Percer</b>. Pour la corriger : double-clic dessus.`);
  }, () => emit('draw'));
}
function editSilhouette(o) {
  emit('open:silhouette');
  // anciennes silhouettes (sans taille de feuille) : la hauteur du dessin donnait la hauteur de la pièce
  openSilhouette({ src: o.params.src, fills: o.params.fills, sheet: o.params.sheet, fitHeight: o.params.sheet ? null : o.size.z, thickness: o.size.y, edit: true }, r => {
    o.params.loops = r.loops; o.params.src = r.src; o.params.sheet = r.sheet; o.params.fills = r.fills;
    o.size = { x: r2(r.w), y: r.thickness, z: r2(r.h) };
    const b0 = worldBox(o).min.y; syncMesh(o); setMinY(o, b0); pushHistory(); refreshUI();
    flash('✏️ Silhouette mise à jour. Les trous percés dessus sont restés à leur place : vérifie qu’ils tombent toujours au bon endroit.');
  }, () => emit('draw'));
}
function addComponent(k) {
  const c = H.COMPONENTS.find(x => x.k === k);
  addObject(newObj('parts', { name: uniqueName(c.name), kind: 'ghost', params: { parts: c.parts, comp: c.k }, help: c.help }));
}

/* ================= Assistant et projets guidés ================= */
let mission = null, hoverHelp = null, flashMsg = null, flashTimer = 0, tipIdx = Math.floor(Math.random() * H.TIPS.length);
function emit(ev, update = true) { state.events.add(ev); if (update) updateAssistant(); }
function flash(html) { flashMsg = html; cheer(); clearTimeout(flashTimer); flashTimer = setTimeout(() => { flashMsg = null; updateAssistant(); }, 7000); updateAssistant(); }
function objWarnings(o) {
  const w = [], b = worldBox(o), s = b.getSize(new THREE.Vector3());
  if (o.kind === 'solid') {
    if (b.min.y > 0.1 && !state.objects.some(x => x !== o && x.kind === 'solid' && touch(x, o))) w.push(`Il flotte à ${r2(b.min.y)} mm au-dessus du plateau : il ne pourra pas s’imprimer. Clique « Poser » (touche D).`);
    if (b.min.y < -0.1) w.push(`Il s’enfonce de ${r2(-b.min.y)} mm sous le plateau. Clique « Poser » pour le remonter.`);
    if (Math.min(s.x, s.y, s.z) < 0.8) w.push('Il est très fin (moins de 0,8 mm) : l’imprimante risque de ne pas y arriver.');
    if (s.x > PLATE || s.z > PLATE || s.y > MAXH) w.push('Il est plus grand que le plateau de l’imprimante.');
  }
  if (o.kind === 'hole' && !state.objects.some(x => x.kind === 'solid' && touch(x, o))) w.push('Ce trou ne touche aucune pièce : il ne creusera rien. Fais-le glisser dans une pièce.');
  return w;
}
function updateAssistant() {
  const sel = [...state.selected];
  $('#as-hover').hidden = !hoverHelp;
  if (hoverHelp) $('#as-hover').innerHTML = `<b>${esc(hoverHelp.title)}</b><br>${hoverHelp.text}`;
  $('#as-msg').innerHTML = flashMsg || H.contextTip({ mode: state.mode, sel, count: state.objects.length, preview: state.preview });
  $('#as-warn').innerHTML = sel.length === 1 && !state.preview ? objWarnings(sel[0]).map(t => `<div class="warn">⚠️ ${t}</div>`).join('') : '';
  renderMission();
  setBot();
}
/* Humeur de Pixel, la mascotte : elle réagit à ce qui se passe */
let isBusy = false, cheerUntil = 0;
function setBot() {
  const mood = isBusy ? 'thinking'
    : Date.now() < cheerUntil ? 'bravo'
    : $('#as-warn').children.length ? 'warning'
    : hoverHelp ? 'explain'
    : mission && mission.i < mission.def.steps.length && stepsOf(mission.def)[mission.i].sel ? 'point'
    : 'neutral';
  const el = $('#as-bot'), src = `img/mascotte/${mood}.png`;
  if (!el.src.endsWith(src)) { el.src = src; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
}
function cheer(ms = 3500) { cheerUntil = Date.now() + ms; setTimeout(setBot, ms + 50); }
function missionCtx() { return { objs: state.objects, ev: state.events, touch, inside, box: o => worldBox(o) }; }
// Étapes d'un projet guidé, adaptées aux outils fermés sur ce poste
const stepsOf = def => def.steps.map(s => s.lock && s.alt && locked(s.lock) ? { ...s, ...s.alt } : s);
/** Cache les outils que le professeur a fermés sur ce poste. */
function applyLocks() {
  const imp = locked('import');
  $('#sil-import').hidden = imp; $('#sil-import').previousElementSibling.hidden = imp;
  if (imp) $('#sil-imgopts').hidden = true;
  const ct = $('.ltabs [data-tab="comps"]');
  ct.hidden = locked('comps');
  if (ct.hidden && ct.classList.contains('on')) showTab('shapes');
  $('#tool-box').hidden = locked('box'); $('[data-empty="box"]').hidden = locked('box');
  $('#prof-badge').hidden = !isProfPC();
  updateAssistant();
}
function renderMission() {
  const el = $('#as-mission');
  if (!mission) { el.innerHTML = `<button class="wide soft" data-mact="choose">🎯 Choisir un projet guidé</button><div class="tip">💡 <b>Le savais-tu ?</b> ${H.TIPS[tipIdx]}</div>`; return; }
  const st = stepsOf(mission.def), ctx = missionCtx();
  let advanced = false;
  while (mission.i < st.length) { let ok = false; try { ok = st[mission.i].ok(ctx); } catch (e) { } if (!ok) break; mission.i++; advanced = true; }
  if (advanced) { autosave(); cheer(); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  const done = mission.i >= st.length;
  el.innerHTML = `<div class="m-head"><span><img class="m-ic" src="img/projets/${mission.def.id}.png" alt=""> ${esc(mission.def.title)}</span><button class="x" data-mact="quit" title="Arrêter ce projet">✕</button></div>
    <div class="m-bar"><i style="width:${Math.round(mission.i / st.length * 100)}%"></i></div>
    <ol class="steps">${st.map((s, i) => `<li class="${i < mission.i ? 'done' : i === mission.i ? 'cur' : ''}"><span>${s.t}${s.optional ? ' <em>(bonus)</em>' : ''}</span>
      ${i === mission.i ? `<p>${s.h || ''}</p><div class="m-acts">${s.sel ? `<button data-mact="show">👉 Montre-moi</button>` : ''}<button data-mact="skip" class="ghost">Passer</button></div>` : ''}</li>`).join('')}</ol>
    ${done ? '<div class="m-done">🎉 Bravo, projet terminé ! Tu peux lancer l’impression.</div>' : ''}`;
}
$('#assistant').addEventListener('click', e => {
  const b = e.target.closest('[data-mact]'); if (!b) return;
  const a = b.dataset.mact;
  if (a === 'choose') openMissions();
  if (a === 'quit') { mission = null; autosave(); updateAssistant(); }
  if (a === 'skip') { mission.i++; autosave(); updateAssistant(); }
  if (a === 'show') {
    const t = $(stepsOf(mission.def)[mission.i].sel);
    if (!t) return toast('Ce bouton apparaît quand tu as sélectionné le bon objet (ou plusieurs objets).');
    const pane = t.closest('.lpane'); if (pane) showTab(pane.dataset.pane);
    t.scrollIntoView({ block: 'nearest' }); t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse');
    setTimeout(() => t.classList.remove('pulse'), 3200);
  }
});
function openMissions() {
  $('#mission-list').innerHTML = H.MISSIONS.map(m => `<button class="mcard" data-mid="${m.id}"><img class="mi" src="img/projets/${m.id}.png" alt=""><b>${m.title}</b><small>${m.desc}</small><small class="muted">${m.steps.length} étapes</small></button>`).join('');
  $('#dlg-missions').showModal();
}
$('#mission-list').addEventListener('click', e => {
  const b = e.target.closest('[data-mid]'); if (!b) return;
  mission = { def: H.MISSIONS.find(m => m.id === b.dataset.mid), i: 0 };
  state.events.clear(); $('#dlg-missions').close(); autosave(); updateAssistant();
});
// aide au survol de n'importe quel bouton
document.addEventListener('mouseover', e => {
  const t = e.target.closest?.('[data-help]');
  const next = t ? { title: t.dataset.title || t.textContent.trim(), text: t.dataset.help } : null;
  if (JSON.stringify(next) === JSON.stringify(hoverHelp)) return;
  hoverHelp = next;
  $('#as-hover').hidden = !hoverHelp;
  if (hoverHelp) $('#as-hover').innerHTML = `<b>${esc(hoverHelp.title)}</b><br>${hoverHelp.text}`;
  setBot();
});

function openGuide(i = 0) {
  $('#guide-tabs').innerHTML = H.GUIDE.map((g, j) => `<button data-g="${j}" class="${j === i ? 'on' : ''}">${g.t}</button>`).join('');
  $('#guide-body').innerHTML = `<h3>${H.GUIDE[i].t}</h3>${H.GUIDE[i].h}`;
  if (!$('#dlg-help').open) $('#dlg-help').showModal();
}
$('#guide-tabs').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) openGuide(+b.dataset.g); });

/* ================= Vues ================= */
function setView(kind) {
  const t = new THREE.Vector3(); let r = 260;
  const list = state.selected.size && kind === 'frame' ? [...state.selected] : state.objects;
  if (list.length) { const b = new THREE.Box3(); list.forEach(o => b.union(worldBox(o))); b.getCenter(t); r = Math.max(50, b.getSize(new THREE.Vector3()).length() * 1.15); }
  const dirs = { home: [0.5, 0.65, 0.9], frame: [0.5, 0.65, 0.9], top: [0, 1, 0.002], front: [0, 0.2, 1], side: [1, 0.2, 0] };
  camera.position.copy(t).addScaledVector(new THREE.Vector3(...dirs[kind]).normalize(), r * 1.5);
  controls.target.copy(t); controls.update();
}

/* ================= Petits outils d'interface ================= */
let toastTimer = 0;
function toast(t) { const el = $('#toast'); el.innerHTML = t; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 4500); }
function busy(on, t = 'Calcul…') { $('#busy').hidden = !on; $('#busy span').textContent = t; isBusy = on; setBot(); }

/* ================= Boutons et clavier ================= */
$$('[data-add]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.add === 'text' && !hasFont()) return toast('La police de caractères se charge encore, réessaie dans une seconde.');
  addObject(newObj(b.dataset.add));
}));
$$('[data-comp]').forEach(b => b.addEventListener('click', () => addComponent(b.dataset.comp)));
$('#tool-drill').addEventListener('click', () => setMode(state.mode === 'drill' ? 'select' : 'drill'));
initProf(() => { applyLocks(); toast('Réglages enregistrés pour ce poste.'); });
applyLocks();
$('#tool-box').addEventListener('click', () => { emit('open:box'); $('#dlg-box').showModal(); });
$('#tool-silhouette').addEventListener('click', newSilhouette);
$('#btn-preview').addEventListener('click', () => { if (!state.preview) setPreview(true); });
$('#btn-edit').addEventListener('click', () => { if (state.preview) setPreview(false); });
// Fichier ▾
$('#btn-file').addEventListener('click', e => { e.stopPropagation(); $('#file-pop').hidden = !$('#file-pop').hidden; });
document.addEventListener('click', e => { if (!e.target.closest('.menu')) $('#file-pop').hidden = true; });
$('#file-pop').addEventListener('click', () => { $('#file-pop').hidden = true; });
// Onglets de la colonne gauche
function showTab(name) {
  $$('.ltabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.lpane').forEach(p => { p.hidden = p.dataset.pane !== name; });
}
$$('.ltabs [data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
// Écran d'accueil
$('#empty').addEventListener('click', e => {
  const b = e.target.closest('[data-empty]'); if (!b) return;
  const a = b.dataset.empty;
  if (a === 'mission') openMissions();
  if (a === 'cube') { showTab('shapes'); addObject(newObj('cube')); flash('🧊 Voici un cube ! Glisse-le pour le déplacer, clique sur ses mesures pour les changer, ou essaie les autres formes à gauche.'); }
  if (a === 'box') { emit('open:box'); $('#dlg-box').showModal(); }
  if (a === 'sil') newSilhouette();
});
$('#btn-xray').addEventListener('click', () => { state.xray = !state.xray; $('#btn-xray').classList.toggle('on', state.xray); state.objects.forEach(o => { o.mesh.material.dispose(); o.mesh.material = makeMaterial(o); }); emit('xray'); });
$('#btn-export').addEventListener('click', openExport);
$('#btn-undo').addEventListener('click', () => undoRedo(-1));
$('#btn-redo').addEventListener('click', () => undoRedo(1));
$('#btn-help').addEventListener('click', () => openGuide(0));
$('#btn-missions').addEventListener('click', openMissions);
$('#btn-new').addEventListener('click', () => {
  if (state.objects.length && !confirm('Tout effacer pour commencer un nouveau projet ?\n(Pense à « Enregistrer » avant si tu veux garder ton travail.)')) return;
  clearScene(); mission = null; state.events.clear(); $('#proj-name').value = 'mon-objet'; pushHistory(); refreshUI(); setView('home');
});
$('#btn-save').addEventListener('click', () => {
  const name = ($('#proj-name').value.trim() || 'mon-objet').replace(/[\\/:*?"<>|]/g, '-');
  askSave(new Blob([JSON.stringify(projectData())], { type: 'application/json' }), `${name}.atelier3d`, 'atelier3d', where => {
    emit('save');
    toast(`💾 Projet enregistré ${where}. Pour le reprendre : Fichier → « Ouvrir ».`);
  });
});
$('#btn-open').addEventListener('click', () => $('#file-open').click());
$('#file-open').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (d.app !== 'atelier3d') throw 0; loadProject(d); setView('home'); toast('📂 Projet ouvert.'); }
  catch { toast('Ce fichier n’est pas un projet Atelier 3D (fichier .atelier3d).'); }
});
$('#proj-name').addEventListener('change', autosave);
$$('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('#grid-step').addEventListener('change', e => { state.grid = +e.target.value; syncGizmo(); });
$$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

let kbTimer = 0;
window.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea, select') || $('dialog[open]')) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey, sel = [...state.selected];
  if (ctrl && k === 'z') { e.preventDefault(); return undoRedo(e.shiftKey ? 1 : -1); }
  if (ctrl && k === 'y') { e.preventDefault(); return undoRedo(1); }
  if (ctrl && k === 'a') { e.preventDefault(); state.selected = new Set(state.objects.filter(o => o.kind !== 'ghost')); return refreshUI(); }
  if (ctrl && k === 'd') { e.preventDefault(); return duplicateSel(); }
  if (ctrl && e.shiftKey && k === 'g') { e.preventDefault(); return unmergeSel(); }
  if (ctrl && k === 'g') { e.preventDefault(); return mergeSel(); }
  if (k === 'escape') { if (gizmo) { gizmo = null; syncGizmo(); renderCtxbar(); return; } if (state.mode === 'drill') return setMode('select'); if (state.preview) return setPreview(false); return selectOnly(null); }
  if (k === 'p' && !ctrl) return setMode(state.mode === 'drill' ? 'select' : 'drill');
  if (k === 'm' && !ctrl && sel.length) return setGizmo('translate');
  if (k === 'r' && !ctrl && sel.length) return setGizmo('rotate');
  if (!sel.length) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); return deleteSel(); }
  if (k === 'd' && !ctrl) return dropSel();
  if (k === 'h' && !ctrl) return setKind(sel, 'hole');
  if (k === 's' && !ctrl) return setKind(sel, 'solid');
  const st = state.grid * (e.shiftKey ? 10 : 1);
  const mv = { arrowleft: ['x', -st], arrowright: ['x', st], arrowup: ['z', -st], arrowdown: ['z', st], pageup: ['y', st], pagedown: ['y', -st] }[k];
  if (mv) {
    e.preventDefault();
    sel.forEach(o => { o.pos[mv[0]] = r2(o.pos[mv[0]] + mv[1]); syncTransform(o); });
    emit('move', false); updateAssistant();
    clearTimeout(kbTimer); kbTimer = setTimeout(() => { pushHistory(); renderProps(); }, 350);
  }
});

/* ================= Démarrage ================= */
hydrateIcons(); initSilhouette(); initDrillPanel(); initBoxDialog();
$('#comp-list').innerHTML = H.COMPONENTS.map(c => `<button data-comp="${c.k}" data-title="${c.name} (repère)" data-help="${esc(c.help)} Il ne sera pas imprimé."><img src="img/composants/${c.img || c.k}.png" alt="">${c.name}</button>`).join('');
$$('[data-comp]').forEach(b => b.addEventListener('click', () => addComponent(b.dataset.comp)));

new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', f => {
  setFont(f); clearCache();
  state.objects.filter(o => o.type === 'text').forEach(o => syncMesh(o));
}, undefined, () => toast('La police du texte n’a pas pu être chargée (connexion Internet ?).'));

try {
  const saved = JSON.parse(localStorage.getItem('atelier3d-autosave') || 'null');
  if (saved?.objects?.length) { loadProject(saved); toast('👋 Ton travail précédent a été récupéré.'); }
} catch (e) { console.warn(e); }
if (hist.i < 0) pushHistory();
updateUndo(); refreshUI(); setView('home');
window.__atelier = { state, H }; // pour le débogage
