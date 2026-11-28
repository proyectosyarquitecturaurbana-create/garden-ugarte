# Recorridos 360° propios

El tour corre en `tour.html?t=<id>` (Pannellum 2.5.6, MIT, en `assets/vendor/pannellum/`)
y lo arma `assets/js/tour360.js` a partir de `data/tours/<id>.json`.
Las imágenes van en `assets/tours/<id>/<escena>/` (6 caras del cubo + `mini.jpg`).

## Pasos

1. Preparar cada panorámica (JPG equirectangular 2:1, idealmente 8000×4000):
   `python3 tools/tour/preparar.py <pano.jpg> <escena> --tour <id>`
   Genera las caras de 2048 px y una grilla en `tools/tour/_grillas/` para leer yaw/pitch.
2. Leer en la grilla dónde va cada punto: yaw = columna (−180 a 180), pitch = fila (90 arriba, −90 abajo).
   Puntos de paso: sobre el piso, delante de la puerta o el paso (pitch −25 a −40).
3. Escribir `data/tours/<id>.json` (ver campos abajo).
4. Verificar: `node tools/tour/verificar.js <id> <carpeta>` saca capturas de cada escena y punto.
5. Activarlo en el sitio: `assets/js/config.js` → `tours: { C: "<id>" }`.

## Campos del JSON

Tour: `titulo`, `inicio` (escena), `transicion` ("acercar" | "fundido"), `duracion` (ms del fundido),
`autorrotar` (grados/s, negativo = a la izquierda, 0 = apagado), `esperaRotar` (ms sin tocar),
`entrada` (true: arranca mirando el piso y sube), `duracionEntrada`, `clicEnCualquierLado`, `radioClic` (grados),
`tira` (miniaturas abajo), `plano` { `imagen`, `giro` }.

Escena: `titulo`, `yaw`/`pitch`/`hfov` (cámara inicial), `zoom` {min,max} (hfov), `inclinacion` {min,max} (pitch),
`norte` (para orientación sincronizada), `horizonte` {pitch, roll} (corrige panorámicas torcidas),
`filtro` {brillo, contraste, saturacion, calidez 0–1, nitidez 0–1}, `sol` {yaw, pitch, intensidad},
`mapa` {x, y} (% sobre el plano), `carpeta` (si no es `<escena>/`), `equirect` (usar una imagen 2:1 en vez de cubo).

Puntos (`puntos`):
- `paso`: `yaw`, `pitch`, `destino`, `texto`, `llegada` {yaw, pitch, hfov}, `estilo` ("piso" | "plano"),
  `direccion` (giro de la flecha), `tamano`, `opacidad`, `pulso`, `soloAlPasar`, `transicion`.
- `info`: `yaw`, `pitch`, `titulo`, `texto`, `icono` ("info" | "mas"), `soloAlPasar`, `lado` ("abajo"), `color`, `fondo`.
- `texto`: `yaw`, `pitch`, `texto`, `color`, `fondo`, `tamano`, `rotacion`.
- `imagen`: `yaw`, `pitch`, `src` (relativa a la carpeta del tour), `ancho`.
Todos aceptan `escalaConZoom`.
