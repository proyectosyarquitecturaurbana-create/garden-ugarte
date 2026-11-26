# Showroom Virtual — Ugarte City Gardens

Sitio web de venta del edificio en Manuel Ugarte 1536 (Belgrano, CABA): recorrido 360°, plantas por piso con unidades cliqueables, fichas de cada unidad, menú con la información del proyecto, mapa y QR.

- **Hosting:** InfinityFree (`selecttoururbano.kesug.com`). Sitio estático: HTML, CSS y JS, sin build ni base MySQL.
- **Datos:** Google Sheets publicado como CSV. Disponibilidad, precios y superficies se editan en la planilla y el sitio los lee al abrirse (el cambio aparece en unos 5 minutos).
- **Imágenes:** fijas en el hosting, nombradas por código de unidad o tipología.

## Datos desde Google Sheets

| Pestaña | gid | Qué tiene |
|---|---|---|
| Unidades | 1049533963 | Una fila por unidad (60): estado, precio, m², ambientes, baños, posición en la planta |
| Tipologias | 2067474007 | A, B, C, D: nombre, descripción y link del tour de Kuula |
| Superficies | 914990239 | m² de cada ambiente por tipología |
| Pisos | 1692599186 | PB, 1–8 y Terraza |
| Proyecto | 608342405 | Dirección, coordenadas, financiación, contacto, URL del sitio |

Los links están en [`assets/js/config.js`](assets/js/config.js). La lectura y normalización está en [`assets/js/datos.js`](assets/js/datos.js):

```js
const datos = await Showroom.cargarDatos();
// datos.unidades, datos.pisos, datos.tipologias, datos.superficies, datos.proyecto
// datos.origen: "sheet" | "cache" | "respaldo"
```

Si Google no responde, se usa la última copia guardada en el navegador y, si no hay, [`data/respaldo.json`](data/respaldo.json).

Reglas de la planilla: no renombrar pestañas ni columnas, no cambiar los códigos de unidad y no cargar datos privados en las pestañas publicadas. Los números se aceptan con coma o punto (`222,000`, `222.000`, `659,3`).

## Probar

```
python3 -m http.server 8000
```

y abrir http://localhost:8000/prueba-datos.html: muestra de dónde vienen los datos, el conteo por estado y las unidades de cada piso con su ficha.

## Imágenes

Cuando lleguen los renders, se suben a estas carpetas y se activa el grupo en `imagenes` de `assets/js/config.js`:

```
assets/img/plantas/pb.webp, 1.webp … 8.webp, t.webp   (mismo encuadre y escala, 2054 × 2375 px)
assets/img/fachada/dia.webp, noche.webp               (misma cámara)
assets/img/tipologias/A … D/render-1.webp … render-3.webp
```

Mientras tanto el sitio dibuja un esquema de cada planta y muestra espacios marcados "pendiente".

## Estructura

```
index.html              Showroom: inicio, plantas, recorrido 360°, menú y QR
assets/css/showroom.css Estilos (paleta, tipografía, modo noche, responsive)
assets/js/app.js        Interfaz
assets/vendor/          Generador de QR (qrcode-generator 1.4.4, MIT)
assets/img/             Logo de la profesional y, más adelante, renders
prueba-datos.html       Página interna para verificar la conexión con el Sheet
assets/js/config.js     Links de las pestañas publicadas
assets/js/datos.js      Lectura de CSV, normalización y respaldo
data/respaldo.json      Copia de los datos para cuando Google no responde
```
