# Visuels de l'Atelier 3D : brief pour ChatGPT

## Mode d'emploi (pour toi, ne pas copier)

1. Ouvre une **nouvelle conversation** ChatGPT, avec un modèle qui sait générer des images **et** exécuter du code Python.
2. Copie **tout le bloc gris ci-dessous** (de « BRIEF » jusqu'à « FIN DU BRIEF ») et colle-le en un seul message.
3. ChatGPT va générer les planches, te les montrer, puis fabriquer une archive **`atelier3d-visuels.zip`**.
4. Si une icône ne te plaît pas, dis-lui par exemple : « refais uniquement `composants/servo.png`, même style, puis refais le zip ».
5. Envoie-moi le zip (ou dépose-le dans le dossier de l'Atelier 3D) : je remplace les émojis par ces images.

Si ChatGPT s'arrête en cours de route (c'est long : 7 images à générer), écris simplement « continue ».

---

```
BRIEF — VISUELS POUR « ATELIER 3D »

Contexte : je crée « Atelier 3D », un logiciel web de modélisation 3D pour collégiens (11-15 ans), en français, pour fabriquer des objets à imprimer en 3D. J'ai besoin de TOUS les visuels ci-dessous, livrés à la fin dans UNE SEULE archive ZIP. Fais tout d'un coup, sans me demander de validation entre les étapes (sauf blocage réel).

========================================
1. STYLE COMMUN (valable pour toutes les images)
========================================
- Style : icônes 3D douces façon « pâte à modeler / clay », formes arrondies, légère ombre douce sous l'objet, éclairage venant d'en haut à gauche. Moderne, propre, sympathique, pas enfantin.
- Vue : légère perspective de trois-quarts (isométrique douce) pour les objets.
- Palette : bleu #3B82F6, violet #8B5CF6, vert #22C55E, orange #F59E0B, rose-rouge #E11D48, gris ardoise #64748B, blanc cassé. Couleurs franches, pas fluo.
- Fond : transparent. Aucun décor, aucun sol, aucun cadre.
- AUCUN texte, lettre ou chiffre dans les images (une seule exception : l'icône « texte », voir plus bas).
- Aucune marque, aucun logo existant.
- Silhouettes simples, lisibles en tout petit (32 × 32 pixels).
- Toutes les icônes d'une même famille ont la même taille visuelle et le même éclairage.

========================================
2. MÉTHODE DE TRAVAIL
========================================
Étape A — Génère les 7 planches ci-dessous, au format paysage 1536 × 1024 (le logo en 1024 × 1024). Chaque planche = une grille régulière, cases de même taille, SANS traits de séparation, une icône centrée par case. Montre-moi chaque planche une fois générée.

Étape B — Avec Python (Pillow) :
  1. Découpe chaque planche selon sa grille (lecture de gauche à droite, puis de haut en bas).
  2. Si le fond n'est pas transparent, rends-le transparent (suppression du fond uni à partir des bords, sans abîmer l'objet).
  3. Recadre chaque icône au plus près de l'objet, puis replace-la centrée dans un carré transparent avec une marge vide de 10 % de chaque côté.
  4. Redimensionne aux tailles demandées (rééchantillonnage LANCZOS).
  5. Enregistre en PNG avec transparence, avec EXACTEMENT les noms et dossiers indiqués (minuscules, sans accents, sans espaces).

Étape C — Crée l'archive « atelier3d-visuels.zip » contenant :
  - tous les fichiers de la section 4 ;
  - un dossier « planches/ » avec les 7 planches d'origine ;
  - un fichier « apercu.png » : une planche-contact qui affiche toutes les icônes finales sur fond gris clair, avec leur nom de fichier en dessous ;
  - un fichier « contenu.txt » listant chaque fichier avec sa taille en pixels.

Étape D — Vérifie avec Python que les 51 fichiers de la section 4 sont présents, au bon nom et à la bonne taille, et que leurs coins sont bien transparents. Corrige ce qui manque, puis donne-moi le lien de téléchargement du ZIP.

========================================
3. LES PLANCHES À GÉNÉRER
========================================

PLANCHE 1 — LES FORMES (grille 4 colonnes × 3 lignes)
 1. un cube bleu
 2. un cylindre bleu debout
 3. une sphère bleue
 4. une demi-sphère bleue posée à plat (dôme)
 5. un cône bleu
 6. une pyramide bleue à base carrée
 7. un anneau bleu (tore, donut sans décor) couché à plat
 8. un tube bleu : cylindre creux, on voit le trou au centre
 9. une étoile à 5 branches épaisse, couchée et un peu inclinée, jaune-orange
10. un cœur épais, rose-rouge
11. trois lettres en relief « Abc », épaisses, bleues (seule exception autorisée pour le texte)
12. case vide

PLANCHE 2 — OUTILS ET RÔLES (grille 3 colonnes × 2 lignes)
 1. « Percer » : une perceuse sans fil compacte et sympathique, orange et gris, avec un petit foret
 2. « Boîte » : une boîte en plastique bleue, dont le couvercle se soulève légèrement
 3. « Silhouette » : des ciseaux qui découpent une petite silhouette de personnage noire
 4. « Matière » : un bloc plein bleu, bien solide
 5. « Trou » : le même bloc, traversé par un trou rond souligné en rose-rouge
 6. « Repère » : le même bloc, en fil de fer gris pointillé et semi-transparent (comme un fantôme technique)

PLANCHE 3 — COMPOSANTS ÉLECTRONIQUES (grille 4 colonnes × 3 lignes, objets simplifiés mais reconnaissables, sans marque)
 1. une carte électronique type Arduino Uno, bleu-vert, avec une prise USB carrée argentée sur le côté
 2. une petite carte type micro:bit, verte et noire, avec une grille de 5 × 5 petites LED sur le dessus
 3. une mini plaque d'essai (breadboard) blanche avec ses petits trous
 4. un bouton poussoir carré noir avec un capuchon rond coloré
 5. un gros bouton d'arcade rond rouge
 6. une LED de 5 mm rouge avec ses deux pattes
 7. un petit buzzer rond noir
 8. un petit servomoteur bleu avec son bras blanc
 9. un capteur à ultrasons avec deux « yeux » ronds argentés
10. une pile 9 volts
11. un boîtier contenant 4 piles AA
12. case vide

PLANCHE 4 — LA MASCOTTE (grille 3 colonnes × 2 lignes)
Un petit robot sympathique et rond : tête arrondie, grands yeux expressifs affichés sur un écran, petite antenne, corps compact, bleu clair et blanc avec une touche de violet. C'est EXACTEMENT le même personnage dans les 6 cases, vu de face, en buste ; seule l'expression change :
 1. neutre et souriant (accueil)
 2. il explique : il lève un doigt, l'air intéressé
 3. il montre quelque chose sur sa droite, bras tendu
 4. bravo : il fait la fête, bras levés, petites étoiles autour
 5. attention : l'air un peu inquiet, un petit panneau triangulaire orange à côté de lui
 6. il réfléchit : la main sous le menton, petits engrenages au-dessus de la tête

PLANCHE 5 — PROJETS GUIDÉS (grille 3 colonnes × 2 lignes, petites illustrations un peu plus riches que des icônes)
 1. une fusée qui décolle au-dessus d'un petit cube bleu
 2. une marionnette-silhouette noire de personnage, tenue par une baguette, devant un écran lumineux jaune (théâtre d'ombre)
 3. un boîtier de jeu avec 4 gros boutons de couleur : rouge, vert, bleu, jaune (jeu Simon)
 4. un petit robot éducatif à roues décoré d'une étoile en plastique
 5. une vieille clé et un petit coffre fermé par un cadenas à code (escape game)
 6. une imprimante 3D en train d'imprimer un petit objet

PLANCHE 6 — OUTILS DE DESSIN (grille 3 colonnes × 2 lignes)
 1. un pinceau
 2. une gomme
 3. un pot de peinture qui se renverse
 4. une image (cadre photo avec une montagne)
 5. un papillon parfaitement symétrique
 6. une flèche ronde de retour en arrière

PLANCHE 7 — LOGO (une seule image 1024 × 1024, pas de grille)
Icône d'application : un cube 3D arrondi en dégradé du bleu au violet, avec un petit éclat lumineux, sur un fond carré aux coins très arrondis. Pas de texte. Lisible en 32 × 32.

========================================
4. FICHIERS FINAUX ATTENDUS DANS LE ZIP (51 fichiers)
========================================
(numéro de case de la planche → nom de fichier, taille finale en pixels)

formes/ — 256 × 256 (planche 1)
 1 → cube.png | 2 → cylinder.png | 3 → sphere.png | 4 → hemisphere.png
 5 → cone.png | 6 → pyramid.png | 7 → torus.png | 8 → tube.png
 9 → star.png | 10 → heart.png | 11 → text.png

outils/ — 256 × 256 (planche 2)
 1 → drill.png | 2 → box.png | 3 → silhouette.png
 4 → kind-solid.png | 5 → kind-hole.png | 6 → kind-ghost.png

composants/ — 256 × 256 (planche 3)
 1 → arduino.png | 2 → microbit.png | 3 → breadboard.png | 4 → pushbtn.png
 5 → arcade.png | 6 → led.png | 7 → buzzer.png | 8 → servo.png
 9 → hcsr04.png | 10 → bat9.png | 11 → aa4.png

mascotte/ — 512 × 512 (planche 4)
 1 → neutral.png | 2 → explain.png | 3 → point.png
 4 → bravo.png | 5 → warning.png | 6 → thinking.png

projets/ — 512 × 512 (planche 5)
 1 → decouverte.png | 2 → ombre.png | 3 → simon.png
 4 → robot.png | 5 → escape.png | 6 → libre.png

dessin/ — 256 × 256 (planche 6)
 1 → brush.png | 2 → eraser.png | 3 → fill.png
 4 → image.png | 5 → symmetry.png | 6 → undo.png

logo/ (planche 7)
 logo.png (1024 × 1024) | logo-512.png (512 × 512) | logo-192.png (192 × 192)
 favicon-64.png (64 × 64) | favicon-32.png (32 × 32)

Total : 11 + 6 + 11 + 6 + 6 + 6 + 5 = 51 fichiers.
(En plus dans le ZIP : le dossier planches/, apercu.png et contenu.txt.)

FIN DU BRIEF
```

---

## Ce que je ferai à la réception du zip

- Je remplace les émojis par ces images (formes, outils, rôles, composants, projets, atelier Silhouette).
- La mascotte change d'expression selon la situation : accueil, explication, « Montre-moi », bravo quand une étape est réussie, attention quand un objet flotte, réflexion pendant les calculs.
- Le logo devient l'icône de l'onglet du navigateur.
- Pour les petits boutons d'action (annuler, supprimer, tourner, vues…), j'utilise un jeu d'icônes au trait gratuit et libre de droits (Lucide), plus net à petite taille. Pas besoin de ChatGPT pour ceux-là.
