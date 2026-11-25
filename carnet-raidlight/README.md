# Carnet d’Endurance — Raidlight Ultralight 24–30 L

Nouvelle direction artistique de la page de test du Raidlight Ultralight 24–30 L.

- `index.html` : page autonome, prête à déposer sur n’importe quel hébergement statique (avec `style.css`, `app.js` et `assets/`).
- `page.html` : la même page sans l’enveloppe `<html>/<head>/<body>` (format d’aperçu Claude). Après une modification, lancer `./build.sh` pour régénérer `index.html`.
- `assets/hero-fg.webp` et `assets/nice-fg.webp` : sujets détourés posés au-dessus des photos pour faire passer les grands titres « derrière » (effet de profondeur).
- `assets/*-cut.webp` : packshots détourés pour les plaques studio.

Bibliothèques chargées depuis un CDN : GSAP 3.12.5 + ScrollTrigger (animations au scroll) et Lenis 1.1.13 (défilement fluide). Sans elles, la page reste complète et lisible, simplement sans animation.
