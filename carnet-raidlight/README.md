# Carnet d’Endurance — Raidlight Ultralight 24–30 L

Nouvelle direction artistique de la page de test du Raidlight Ultralight 24–30 L.

- `index.html` : page autonome, prête à déposer sur n’importe quel hébergement statique (avec `style.css`, `app.js` et `assets/`).
- `page.html` : la même page sans l’enveloppe `<html>/<head>/<body>` (format d’aperçu Claude). Après une modification, lancer `./build.sh` pour régénérer `index.html`.
- `assets/hero-fg.webp` et `assets/nice-fg.webp` : sujets détourés posés au-dessus des photos pour faire passer les grands titres « derrière » (effet de profondeur).
- `assets/*-cut.webp` : packshots détourés pour les plaques studio.

Bibliothèques chargées depuis un CDN : GSAP 3.12.5 + ScrollTrigger (animations au scroll) et Lenis 1.1.13 (défilement fluide). Sans elles, la page reste complète et lisible, simplement sans animation.

## Fond « voyage » au scroll

- `#journey` (début de `page.html`) : un bandeau de paysage fixe derrière la page. Chaque section porte `data-scene` (le paysage) et `data-scene-o` (son intensité) ; le paysage change en fondu quand la section passe au milieu de l’écran, dans l’ordre de la GTA (Chablais à l’aube → mont Blanc → lacs de Haute-Savoie → crêtes du sud → Vanoise → lac d’Allos au crépuscule → nuit).
- `assets/j-*.webp` : tous les paysages passent par le même étalonnage (dégradé noir chaud → terre d’ombre → ocre → crème, plus doré au fil du parcours), ce qui assure la continuité des couleurs d’une section à l’autre.
- Photos Wikimedia Commons sous licence CC BY-SA 4.0 : auteurs et liens crédités dans le pied de page.
