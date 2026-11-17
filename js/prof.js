// Espace professeur : choisir, poste par poste, les outils permis aux élèves.
// Les réglages restent dans ce navigateur (localStorage). Le code n'est jamais écrit ici :
// on ne garde que son empreinte SHA-256, et on compare l'empreinte de ce qui est tapé.
const KEY = 'atelier3d-poste';
const CODE_HASH = '4a621015e5337e14270e11a5e4a3489864dad0aaed3673381c8973285467c5a4';
// Réglage de départ d'un poste : seul l'import d'image est fermé
const DEF = { allow: { import: false, comps: true, box: true }, profPC: false };
const $ = s => document.querySelector(s);

let cfg = load();
function load() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c && c.allow) return { allow: { ...DEF.allow, ...c.allow }, profPC: !!c.profPC };
  } catch { /* navigateur sans stockage : réglage de départ */ }
  return { allow: { ...DEF.allow }, profPC: false };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* rien */ } }

/** L'outil k est-il fermé aux élèves sur ce poste ? (import, comps, box) */
export const locked = k => !cfg.profPC && !cfg.allow[k];
export const isProfPC = () => cfg.profPC;

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim()));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** Branche la fenêtre « Espace professeur ». onChange est appelé quand les réglages changent. */
export function initProf(onChange) {
  const dlg = $('#dlg-prof');
  const showPanel = () => {
    $('#prof-login').hidden = true; $('#prof-panel').hidden = false;
    dlg.querySelectorAll('[data-allow]').forEach(c => { c.checked = !!cfg.allow[c.dataset.allow]; });
    $('#prof-pc').checked = cfg.profPC;
    syncPc();
  };
  const syncPc = () => dlg.querySelectorAll('[data-allow]').forEach(c => { c.disabled = $('#prof-pc').checked; });
  $('#btn-prof').addEventListener('click', () => {
    $('#prof-login').hidden = false; $('#prof-panel').hidden = true;
    $('#prof-code').value = ''; $('#prof-err').textContent = '';
    dlg.showModal(); $('#prof-code').focus();
  });
  const login = async () => {
    if (await hash($('#prof-code').value) === CODE_HASH) showPanel();
    else { $('#prof-err').textContent = 'Ce n’est pas le bon code.'; $('#prof-code').select(); }
  };
  $('#prof-go').addEventListener('click', login);
  $('#prof-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); login(); } });
  $('#prof-pc').addEventListener('change', syncPc);
  $('#prof-save').addEventListener('click', () => {
    dlg.querySelectorAll('[data-allow]').forEach(c => { cfg.allow[c.dataset.allow] = c.checked; });
    cfg.profPC = $('#prof-pc').checked;
    save(); dlg.close(); onChange?.();
  });
}
