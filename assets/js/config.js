/* =========================================================
   CONFIGURACIÓN DEL SHOWROOM — Ugarte City Gardens
   Lo único que hay que tocar para cambiar de planilla.
   Cada link es una pestaña de Google Sheets publicada como CSV
   (Archivo › Compartir › Publicar en la web › pestaña › .csv).
   ========================================================= */
window.SHOWROOM_CONFIG = {
  sheet: {
    base: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWCkeaDU0VmuIulKedKPXPVPgrX9jV7iZAX2i4NCX9lRGch7SdtIGdDoJH2nCfG0hC6rHgQfAQL81J/pub",
    pestañas: {
      unidades:    "1049533963",
      tipologias:  "2067474007",
      superficies: "914990239",
      pisos:       "1692599186",
      proyecto:    "608342405"
    }
  },
  // Copia local que se usa si Google no responde.
  respaldo: "data/respaldo.json",
  // Segundos de espera antes de pasar al respaldo.
  tiempoEspera: 8,

  // Imágenes fijas del sitio. Cuando subas cada grupo, cambiá su false por true.
  //   plantas:  assets/img/plantas/pb.webp, 1.webp … 8.webp, t.webp (todas con el mismo encuadre)
  //   fachada:  assets/img/fachada/dia.webp y noche.webp (misma cámara)
  //   renders:  assets/img/tipologias/A/render-1.webp … render-3.webp (A, B, C y D)
  imagenes: { plantas: false, fachada: false, renders: false },

  // Puntos de amenities en PB y Terraza (posición en % de la planta).
  amenities: {
    PB: [
      { nombre: "SUM · 160 m²", x: 32.41, y: 27.46 },
      { nombre: "Local comercial · 90 m²", x: 24.88, y: 66.17 },
      { nombre: "Hall de acceso", x: 41.0, y: 65.47 }
    ],
    T: [
      { nombre: "Huerta comunitaria", x: 38.11, y: 28.86 },
      { nombre: "Vestuario y baños", x: 22.75, y: 60.22 },
      { nombre: "Solárium y piscina", x: 38.41, y: 67.03 },
      { nombre: "Vestuario y baños", x: 54.21, y: 60.11 }
    ]
  }
};
