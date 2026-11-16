# Atelier 3D

Un atelier de modélisation 3D pour les collégiens, plus simple que Tinkercad, avec un assistant (Pixel) qui explique tout en direct.
On y fabrique des objets à imprimer en 3D, téléchargés en **STL** ou **OBJ**.

**En ligne :** https://anlito.github.io/atelier-3d/

## Ce qu'on peut faire

- **Formes** : cube, cylindre, sphère, demi-sphère, cône, pyramide, anneau, tube, étoile, cœur, texte 3D.
- **Matière / Trou / Repère** : un trou creuse automatiquement tout ce qu'il traverse (pas besoin de grouper) ; un repère n'est jamais imprimé.
- **Outils magiques**
  - **Percer** en un clic : LED, boutons, câble USB, vis, baguette… La profondeur se règle toute seule sur l'épaisseur de la paroi.
  - **Boîte** avec couvercle emboîtable, à partir des dimensions intérieures.
  - **Silhouette** : un dessin ou une image devient une pièce plate (théâtre d'ombre).
- **Composants repères** : Arduino Uno, micro:bit, boutons, LED, servo, capteur ultrason, piles…
- **Projets guidés** qui se cochent tout seuls : découverte, théâtre d'ombre, jeu Simon, déco de robot, escape game.
- **Aperçu final**, vérification avant impression, téléchargement STL / OBJ, sauvegarde automatique dans le navigateur et fichiers projet `.atelier3d`.

Tout fonctionne dans le navigateur : aucune installation, aucun compte, aucune donnée envoyée.

## Lancer en local

Les modules JavaScript ont besoin d'un petit serveur :

```bash
node serve.mjs
```

puis ouvrir http://localhost:8765

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `css/style.css` | la page et son style |
| `js/main.js` | vue 3D, souris, propriétés, assistant, export |
| `js/shapes.js` | fabrication des formes et opérations booléennes (three-bvh-csg) |
| `js/silhouette.js` | atelier Silhouette (dessin → contours → pièce) |
| `js/help.js` | textes d'aide, perçages tout prêts, composants, projets guidés |
| `img/` | icônes et mascotte ; `img/planches/` = planches d'origine |
| `tools/decoupe.html` | outil qui découpe les planches en icônes (`node tools/serveur-decoupe.mjs`) |
| `demande-visuels-chatgpt.md` | le brief utilisé pour générer les visuels |
