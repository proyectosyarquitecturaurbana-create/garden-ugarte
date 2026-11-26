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
  tiempoEspera: 8
};
