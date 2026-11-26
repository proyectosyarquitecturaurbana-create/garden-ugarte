/* =========================================================
   DATOS DEL SHOWROOM
   Lee las pestañas publicadas de Google Sheets y devuelve los
   datos listos para usar. Uso:

     const datos = await Showroom.cargarDatos();
     datos.unidades   // 60 unidades, con números ya convertidos
     datos.pisos      // PB, 1…8, Terraza (ordenados de abajo hacia arriba)
     datos.proyecto   // { nombre, direccion, whatsapp, … }
     datos.origen     // "sheet" | "cache" | "respaldo"

   Orden de prioridad: Google Sheets → última copia guardada en
   este navegador → data/respaldo.json.
   ========================================================= */
(function () {
  const CFG = window.SHOWROOM_CONFIG;
  const CLAVE_CACHE = "showroom-ugarte-datos-v1";
  const ESTADOS = ["Disponible", "Reservado", "Vendido"];

  // ---------- CSV (RFC 4180: comillas, comas y saltos dentro de celdas) ----------
  function parseCSV(texto) {
    const filas = [];
    let fila = [], celda = "", enComillas = false;
    texto = texto.replace(/^﻿/, "");
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (enComillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; }
          else enComillas = false;
        } else celda += c;
      } else if (c === '"') enComillas = true;
      else if (c === ",") { fila.push(celda); celda = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && texto[i + 1] === "\n") i++;
        fila.push(celda); filas.push(fila); fila = []; celda = "";
      } else celda += c;
    }
    if (celda !== "" || fila.length) { fila.push(celda); filas.push(fila); }
    const [encabezado, ...resto] = filas.filter(f => f.some(v => v.trim() !== ""));
    if (!encabezado) return [];
    const cols = encabezado.map(h => h.trim());
    return resto.map(f => Object.fromEntries(cols.map((h, i) => [h, (f[i] ?? "").trim()])));
  }

  // ---------- Números escritos a mano en la planilla ----------
  // Acepta 222000, "222,000", "222.000", "659,3", "659.3", "USD 222.000".
  function numero(v) {
    if (v === null || v === undefined) return null;
    let s = String(v).replace(/[^\d.,-]/g, "");
    if (!s) return null;
    if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");   // separador de miles
    else s = s.replace(/\.(?=.*[.,])/g, "").replace(",", ".");             // coma decimal
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const siNo = v => /^s[ií]/i.test(String(v || "").trim());
  function estado(v) {
    const e = String(v || "").trim().toLowerCase();
    return ESTADOS.find(x => x.toLowerCase() === e) ||
           (e.startsWith("disp") ? "Disponible" : e.startsWith("res") ? "Reservado" : e.startsWith("vend") ? "Vendido" : "Reservado");
  }
  const urlValida = v => /^https?:\/\/\S+$/.test(v || "") && !/\.\.\./.test(v);

  // ---------- Normalización de cada pestaña ----------
  function normalizar(crudo) {
    const tipologias = crudo.tipologias.map(t => ({
      tipologia: t.tipologia, nombre: t.nombre, tipo: t.tipo, pisos: t.pisos,
      m2_aprox: numero(t.m2_aprox), descripcion: t.descripcion_corta,
      tour: urlValida(t.tour_kuula_url) ? t.tour_kuula_url : null
    }));
    const superficies = {};
    crudo.superficies
      .sort((a, b) => numero(a.orden) - numero(b.orden))
      .forEach(s => (superficies[s.tipologia] ||= []).push({ ambiente: s.ambiente, m2: numero(s.m2) }));
    const unidades = crudo.unidades.filter(u => u.codigo).map(u => {
      const cub = numero(u.m2_cubiertos) || 0, bal = numero(u.m2_balcon) || 0;
      return {
        codigo: u.codigo, piso: String(u.piso).trim(), tipologia: u.tipologia, tipo: u.tipo,
        estado: estado(u.estado), precio: numero(u.precio_usd), mostrarPrecio: siNo(u.mostrar_precio),
        m2_cubiertos: cub, m2_balcon: bal, m2_total: numero(u.m2_total) ?? cub + bal,
        ambientes: numero(u.ambientes), dormitorios: numero(u.dormitorios), banos: numero(u.banos),
        orientacion: u.orientacion || "", nota: u.nota_publica || "",
        x: numero(u.pos_x), y: numero(u.pos_y),
        ambientesDetalle: superficies[u.tipologia] || []
      };
    });
    const pisos = crudo.pisos
      .map(p => ({ piso: String(p.piso).trim(), etiqueta: p.etiqueta, orden: numero(p.orden), tipo: p.tipo, titulo: p.titulo, descripcion: p.descripcion }))
      .sort((a, b) => a.orden - b.orden)
      .map(p => ({ ...p, unidades: unidades.filter(u => u.piso === p.piso) }));
    const proyecto = {};
    crudo.proyecto.forEach(r => { if (r.clave) proyecto[r.clave] = r.valor; });
    ["lat", "lng", "superficie_terreno_m2", "m2_a_construir", "m2_residencial", "m2_comercial", "unidades_funcionales", "pisos"]
      .forEach(k => { if (k in proyecto) proyecto[k] = numero(proyecto[k]); });
    return { unidades, tipologias, superficies, pisos, proyecto };
  }

  // ---------- Descarga ----------
  async function descargar(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), (CFG.tiempoEspera || 8) * 1000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } finally { clearTimeout(t); }
  }
  async function desdeSheet() {
    const { base, pestañas } = CFG.sheet;
    const entradas = await Promise.all(Object.entries(pestañas).map(async ([nombre, gid]) => {
      const texto = await descargar(`${base}?gid=${gid}&single=true&output=csv`);
      if (/^\s*</.test(texto)) throw new Error(`La pestaña ${nombre} no está publicada como CSV`);
      return [nombre, parseCSV(texto)];
    }));
    const crudo = Object.fromEntries(entradas);
    if (!crudo.unidades.length || !("codigo" in crudo.unidades[0])) throw new Error("La pestaña Unidades no tiene la columna codigo");
    return crudo;
  }
  function leerCache() { try { return JSON.parse(localStorage.getItem(CLAVE_CACHE)); } catch { return null; } }
  function guardarCache(crudo) { try { localStorage.setItem(CLAVE_CACHE, JSON.stringify({ fecha: Date.now(), crudo })); } catch {} }

  async function cargarDatos() {
    try {
      const crudo = await desdeSheet();
      guardarCache(crudo);
      return { ...normalizar(crudo), origen: "sheet", fecha: new Date() };
    } catch (err) {
      console.warn("[Showroom] No se pudo leer Google Sheets:", err.message);
      const c = leerCache();
      if (c && c.crudo) return { ...normalizar(c.crudo), origen: "cache", fecha: new Date(c.fecha), error: err.message };
      const crudo = await (await fetch(CFG.respaldo)).json();
      return { ...normalizar(crudo), origen: "respaldo", fecha: null, error: err.message };
    }
  }

  window.Showroom = { cargarDatos, parseCSV, numero, ESTADOS };
})();
