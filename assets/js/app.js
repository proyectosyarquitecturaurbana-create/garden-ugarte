/* =========================================================
   SHOWROOM VIRTUAL — Ugarte City Gardens
   Recorrido: Inicio → Masterplan (fachada día/noche) → Pisos
   (planta con zoom y unidades) → Unidad modelo (galería, vistas,
   plano 3D, tour 360°, terminaciones, comparador).
   Menú: Amenities, Avances de obra, Financiación, Ubicación, Contacto.
   Los datos vienen de Google Sheets (datos.js).
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SHOWROOM_CONFIG;
  const IMG = CFG.imagenes || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n == null || n === "" ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };

  const S = { datos: null, vista: null, piso: null, unidad: null, unidadModelo: null, panel: "tour", render: 1, comp: [] };
  const nombrePiso = p => p === "PB" ? "Planta baja" : p === "T" ? "Terraza" : `Piso ${p}`;
  const unidad = c => S.datos.unidades.find(u => u.codigo === c);
  const tipologia = u => S.datos.tipologias.find(t => t.tipologia === u.tipologia) || {};
  const disponibles = lista => lista.filter(u => u.estado === "Disponible").length;
  const ESTADO_TXT = { Disponible: "Disponible", Reservado: "Reservada", Vendido: "Vendida" };

  // =========================================================
  // CONTACTO
  // =========================================================
  function linkWA(texto) {
    const n = String(S.datos?.proyecto.whatsapp || "").replace(/\D/g, "");
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
  }
  function telefono(n) {
    const d = String(n || "").replace(/\D/g, "");
    const m = d.match(/^54(9)(\d{4})(\d{2})(\d{4})$/);
    return m ? `+54 ${m[1]} ${m[2]} ${m[3]}-${m[4]}` : "+" + d;
  }
  const IC = {
    wa: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    ig: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16.8" cy="7.2" r="1" fill="currentColor"/></svg>`,
    pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    cerrar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`
  };
  const igUser = () => String(S.datos.proyecto.instagram || "").replace(/^@/, "");
  function mapsQ() { const p = S.datos.proyecto; return p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.direccion || ""); }

  // =========================================================
  // FACHADA DIBUJADA (hasta que lleguen los renders)
  // Edificio de PB + 8 pisos + terraza con balcones verdes.
  // Cada nivel es cliqueable y lleva a su planta.
  // =========================================================
  function fachadaSVG({ interactiva = true, noche = false } = {}) {
    const W = 300, PB = 44, H = 28, base = 330, top = base - PB - 8 * H;
    const c = noche
      ? { muro: "#2A302C", losa: "#3A423C", vidrio: "#1B2420", luz: "#F1D58F", marco: "#0F1411", hoja: ["#1D3324", "#24402C", "#2F5236"], suelo: "#151C17", vereda: "#222A24", txt: "#EEF1EC" }
      : { muro: "#ECE8DF", losa: "#D3CDBF", vidrio: "#9DB3AC", luz: "#C9D8D2", marco: "#3A403B", hoja: ["#3F6B3A", "#527F47", "#6C9A5A"], suelo: "#C9C3B5", vereda: "#DEDACF", txt: "#1E2420" };
    let semilla = 7; const azar = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
    const follaje = (x, y, w) => { let h = ""; for (let i = 0; i < w / 3.2; i++) { const cx = x + 1.6 + i * 3.2 + azar() * 1.2, r = 1.7 + azar() * 1.3; h += `<circle cx="${cx.toFixed(1)}" cy="${(y - azar() * 1.5).toFixed(1)}" r="${r.toFixed(1)}" fill="${c.hoja[i % 3]}"/>`; } return h; };
    let s = `<defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.vidrio}" stop-opacity=".95"/><stop offset="1" stop-color="${c.vidrio}" stop-opacity=".7"/></linearGradient></defs>`;
    // suelo, vereda y árboles de calle
    s += `<rect x="-80" y="${base}" width="${W + 160}" height="40" fill="${c.suelo}"/><rect x="-80" y="${base}" width="${W + 160}" height="5" fill="${c.vereda}"/>`;
    [[-46, 0.9], [W + 40, 1]].forEach(([x, k]) => { s += `<rect x="${x - 1.5}" y="${base - 40 * k}" width="3" height="${40 * k}" fill="${c.marco}"/>`; for (let i = 0; i < 9; i++) s += `<circle cx="${(x + (azar() - .5) * 34 * k).toFixed(1)}" cy="${(base - 44 * k - azar() * 34 * k).toFixed(1)}" r="${(8 + azar() * 7) * k}" fill="${c.hoja[i % 3]}" opacity=".95"/>`; });
    // volumen
    s += `<rect x="0" y="${top - 6}" width="${W}" height="${base - top + 6}" fill="${c.muro}"/>`;
    // pisos 1 a 8
    for (let p = 1; p <= 8; p++) {
      const y = base - PB - p * H;
      s += `<rect x="-4" y="${y + H - 3}" width="${W + 8}" height="3" fill="${c.losa}"/>`;
      for (let b = 0; b < 6; b++) {
        const x = 8 + b * 48.5, enc = noche ? azar() < .62 : false;
        s += `<rect x="${x}" y="${y + 3}" width="42" height="${H - 9}" fill="${enc ? c.luz : "url(#gv)"}" stroke="${c.marco}" stroke-width=".8"/>`;
        s += `<line x1="${x + 21}" y1="${y + 3}" x2="${x + 21}" y2="${y + H - 6}" stroke="${c.marco}" stroke-width=".6"/>`;
        if (enc) s += `<rect x="${x}" y="${y + 3}" width="42" height="${H - 9}" fill="#fff" opacity=".12"/>`;
      }
      s += `<rect x="-4" y="${y + H - 7}" width="${W + 8}" height="4" fill="${c.losa}" opacity=".9"/>` + follaje(-4, y + H - 7, W + 8);
    }
    // planta baja: vidriado, acceso y local
    const yb = base - PB;
    s += `<rect x="6" y="${yb + 6}" width="${W - 12}" height="${PB - 6}" fill="${noche ? c.luz : "url(#gv)"}" opacity="${noche ? .85 : 1}" stroke="${c.marco}" stroke-width="1"/>`;
    for (let i = 1; i < 6; i++) s += `<line x1="${6 + i * (W - 12) / 6}" y1="${yb + 6}" x2="${6 + i * (W - 12) / 6}" y2="${base}" stroke="${c.marco}" stroke-width=".8"/>`;
    s += `<rect x="${W / 2 - 22}" y="${yb + 2}" width="44" height="4" fill="${c.marco}"/><text x="${W / 2}" y="${yb + 18}" font-family="Manrope, sans-serif" font-size="6" font-weight="700" letter-spacing="1.5" text-anchor="middle" fill="${noche ? "#1E2420" : c.marco}">1536</text>`;
    // terraza: baranda, pérgola y verde
    s += `<rect x="0" y="${top - 6}" width="${W}" height="3" fill="${c.losa}"/>`;
    s += `<rect x="4" y="${top - 26}" width="${W - 8}" height="20" fill="${c.vidrio}" opacity=".35" stroke="${c.marco}" stroke-width=".6"/>`;
    for (let i = 0; i < 9; i++) s += `<rect x="${40 + i * 25}" y="${top - 40}" width="2" height="34" fill="${c.marco}" opacity=".8"/>`;
    s += `<rect x="36" y="${top - 42}" width="${W - 72}" height="3" fill="${c.marco}" opacity=".85"/>`;
    s += follaje(4, top - 8, 70) + follaje(W - 74, top - 8, 70);
    for (let i = 0; i < 5; i++) s += `<circle cx="${20 + i * 64 + azar() * 10}" cy="${top - 30 - azar() * 10}" r="${7 + azar() * 4}" fill="${c.hoja[i % 3]}"/>`;
    // niveles interactivos
    if (interactiva && S.datos) {
      const niveles = [{ p: "T", y: top - 44, h: 44 + 0 }].concat([8, 7, 6, 5, 4, 3, 2, 1].map(n => ({ p: String(n), y: base - PB - n * H, h: H }))).concat([{ p: "PB", y: yb, h: PB }]);
      niveles.forEach(n => {
        const piso = S.datos.pisos.find(x => x.piso === n.p); if (!piso) return;
        const d = disponibles(piso.unidades);
        const etq = piso.unidades.length ? `${nombrePiso(n.p)} · ${d} disp.` : nombrePiso(n.p);
        const w = etq.length * 3.6 + 16;
        s += `<g class="nivel" data-piso="${esc(n.p)}" tabindex="0" role="button" aria-label="${esc(etq)}">
          <rect class="banda" x="-6" y="${n.y}" width="${W + 12}" height="${n.h}"/>
          <g class="etq"><rect x="${W + 14}" y="${n.y + n.h / 2 - 8}" width="${w}" height="16" rx="8" fill="#2D5C32"/>
          <text x="${W + 22}" y="${n.y + n.h / 2 + 3.2}" font-family="Manrope, sans-serif" font-size="8.5" font-weight="700" fill="#fff">${esc(etq)}</text></g></g>`;
      });
    }
    return `<svg class="edificio" viewBox="-90 ${top - 70} ${W + 220} ${base - top + 120}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fachada de Ugarte City Gardens">${s}</svg>`;
  }

  // =========================================================
  // VISTAS Y NAVEGACIÓN
  // #inicio · #masterplan · #pisos/3 · #pisos/3-02 · #unidad/3-02 · #amenities · #obra · #financiacion · #ubicacion · #contacto
  // =========================================================
  const INMERSIVAS = ["inicio", "masterplan", "pisos", "unidad"];
  const SECCIONES = ["amenities", "obra", "financiacion", "ubicacion", "contacto"];
  let vistaAnterior = "masterplan";

  function ruta() {
    let [v, arg] = (location.hash.slice(1) || "inicio").split("/");
    arg = arg ? decodeURIComponent(arg) : "";
    if (![...INMERSIVAS, ...SECCIONES].includes(v)) v = "inicio";
    if (S.vista && INMERSIVAS.includes(S.vista) && S.vista !== "inicio") vistaAnterior = S.vista;
    S.vista = v;
    document.body.dataset.vista = v;
    if (v !== "pisos") document.body.classList.remove("con-tarjeta");
    $$(".vista").forEach(s => s.classList.toggle("activa", s.id === "vista-" + v));
    $$("#menuLista a").forEach(a => a.getAttribute("href") === "#" + v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    cerrarQR();
    barra(v);
    if (!S.datos) return;
    if (v === "masterplan") pintarExterior();
    if (v === "pisos") {
      const u = unidad(arg);
      const piso = u ? u.piso : (S.datos.pisos.some(p => p.piso.toLowerCase() === arg.toLowerCase()) ? S.datos.pisos.find(p => p.piso.toLowerCase() === arg.toLowerCase()).piso : (S.piso || primerPiso()));
      elegirPiso(piso);
      if (u) abrirTarjeta(u); else cerrarTarjeta(false);
    }
    if (v === "unidad") {
      S.unidadModelo = unidad(arg) || S.unidad || S.unidadModelo || S.datos.unidades.find(u => u.estado === "Disponible") || S.datos.unidades[0];
      pintarUnidad();
    }
    if (SECCIONES.includes(v)) { pintarSeccion(v); $("#vista-" + v).scrollTop = 0; }
  }
  const primerPiso = () => (S.datos.pisos.find(p => p.unidades.length) || S.datos.pisos[0]).piso;

  function barra(v) {
    const inm = INMERSIVAS.includes(v);
    $("#btnQR").hidden = v === "inicio";
    $("#btnVolver").hidden = !(v === "pisos" || SECCIONES.includes(v));
    $("#btnFicha").hidden = v !== "unidad";
    $("#diaNoche").hidden = v !== "masterplan";
    $("#btnVolverPisos").hidden = v !== "unidad";
    $("#btnPantalla").hidden = !document.fullscreenEnabled;
    $("#marca").hidden = !inm || v === "inicio";
    $("#marcaTag").textContent = v === "pisos" && S.piso ? nombrePiso(S.piso) : v === "unidad" && S.unidadModelo ? `Unidad ${S.unidadModelo.codigo}` : "";
  }

  // =========================================================
  // DÍA / NOCHE
  // =========================================================
  function setModo(modo) {
    document.documentElement.dataset.modo = modo;
    $$("#diaNoche button").forEach(b => b.setAttribute("aria-pressed", b.dataset.modo === modo));
    guardar("showroom-modo", modo);
    if (S.datos && S.vista === "masterplan") pintarExterior();
  }

  // =========================================================
  // INICIO
  // =========================================================
  function pintarInicio() {
    const d = S.datos, p = d.proyecto;
    $("#inicioLema").textContent = p.lema || "";
    $("#inicioFondo").innerHTML = IMG.fachada ? "" : fachadaSVG({ interactiva: false, noche: true });
    if (IMG.fachada) $("#inicioFondo").style.backgroundImage = "url(assets/img/fachada/noche.webp)";
    const niveles = d.pisos.length;
    $("#inicioDatos").innerHTML =
      `<div><dt>Unidades</dt><dd>${d.unidades.length}</dd></div>` +
      `<div><dt>Disponibles</dt><dd>${disponibles(d.unidades)}</dd></div>` +
      `<div><dt>Niveles</dt><dd>${niveles}</dd></div>`;
  }

  // =========================================================
  // MASTERPLAN
  // =========================================================
  let zExt;
  function pintarExterior() {
    const noche = document.documentElement.dataset.modo === "noche";
    const caja = $("#exterior");
    if (IMG.fachada) {
      caja.innerHTML = `<img src="assets/img/fachada/${noche ? "noche" : "dia"}.webp" alt="Fachada de Ugarte City Gardens de ${noche ? "noche" : "día"}">` + fachadaSVG({ noche }).replace('class="edificio"', 'class="edificio" style="opacity:0"');
    } else caja.innerHTML = fachadaSVG({ noche });
  }

  // =========================================================
  // PISOS
  // =========================================================
  const K = 2375 / 2054;
  const X4 = [15.02, 29.15, 38.75, 48.35, 62.48];
  const X3 = [15.02, 31.01, 47.01, 62.48];
  const Y = [17.06, 42.73, 54.83, 81.46];
  const col = (x, xs) => { for (let i = 0; i < xs.length - 2; i++) if (x <= xs[i + 1]) return i; return xs.length - 2; };
  const y = v => +(v * K).toFixed(2);
  let zPlano;

  function pintarRiel() {
    const pisos = [...S.datos.pisos].reverse();
    $("#riel").innerHTML = pisos.map(p => {
      const d = disponibles(p.unidades);
      const sub = p.unidades.length ? `${d} disp.` : p.piso === "T" ? "Amenities" : "Acceso";
      return `<button data-piso="${esc(p.piso)}" aria-label="${esc(nombrePiso(p.piso))}${p.unidades.length ? `, ${d} disponibles` : ""}"><b>${p.piso === "T" ? "T" : esc(p.etiqueta)}</b><small>${sub}</small></button>`;
    }).join("");
  }

  function elegirPiso(piso) {
    const p = S.datos.pisos.find(x => x.piso === piso); if (!p) return;
    const cambio = S.piso !== piso || !$("#plano").childElementCount;
    S.piso = piso;
    $$("#riel button").forEach(b => b.setAttribute("aria-current", b.dataset.piso === piso));
    $(`#riel button[data-piso="${CSS.escape(piso)}"]`)?.scrollIntoView({ block: "nearest" });
    $("#marcaTag").textContent = nombrePiso(piso);
    if (cambio) { dibujarPlano(p); zPlano && zPlano.reset(); }
  }

  function dibujarPlano(p) {
    const svg = $("#plano");
    const conImg = !!IMG.plantas;
    svg.classList.toggle("con-imagen", conImg);
    svg.setAttribute("viewBox", conImg ? `0 0 100 ${y(100)}` : `9 ${y(9)} 59.5 ${y(87) - y(9)}`);
    let h = "";
    if (conImg) h += `<image href="assets/img/plantas/${esc(p.piso.toLowerCase())}.webp" x="0" y="0" width="100" height="${y(100)}" preserveAspectRatio="xMidYMid meet"/>`;
    // hoja de dibujo, ejes, contorno y cajetín
    h += `<rect class="hoja" x="10" y="${y(10)}" width="57.5" height="${y(86) - y(10)}" rx=".6"/>`;
    [X4[0], X4[4]].forEach(x => h += `<line class="eje" x1="${x}" y1="${y(12.5)}" x2="${x}" y2="${y(84)}"/>`);
    [Y[0], Y[3]].forEach(v => h += `<line class="eje" x1="12" y1="${y(v)}" x2="65.5" y2="${y(v)}"/>`);
    h += `<rect class="muro" x="${X4[0]}" y="${y(Y[0])}" width="${X4[4] - X4[0]}" height="${+(y(Y[3]) - y(Y[0])).toFixed(2)}"/>`;
    h += `<text class="cajetin-t" x="12.5" y="${y(85)}">${esc(nombrePiso(p.piso))}</text>`;
    h += `<text class="cajetin" x="65" y="${y(85)}" text-anchor="end">UGARTE CITY GARDENS · ESQUEMA DE PLANTA</text>`;
    h += `<g transform="translate(63.6 ${y(13.4)})"><circle r="1.6" fill="none" stroke="#7A817B" stroke-width=".12"/><path d="M0 -1.3 L.55 .6 L0 .25 L-.55 .6Z" fill="#1E2420"/><text class="cajetin" y="-1.9" text-anchor="middle">N</text></g>`;
    if (p.unidades.length) {
      const xs = p.unidades.length <= 6 ? X3 : X4;
      h += `<rect class="nucleo" x="${X4[0]}" y="${y(Y[1])}" width="${X4[4] - X4[0]}" height="${+(y(Y[2]) - y(Y[1])).toFixed(2)}"/>`;
      h += `<text class="rotulo" x="${(X4[0] + X4[4]) / 2}" y="${+(y((Y[1] + Y[2]) / 2) + .45).toFixed(2)}">CIRCULACIÓN · NÚCLEO</text>`;
      h += p.unidades.map(u => {
        const c = col(u.x, xs), arriba = u.y < 50;
        const x0 = xs[c], x1 = xs[c + 1], y0 = arriba ? Y[0] : Y[2], y1 = arriba ? Y[1] : Y[3];
        const px = conImg ? u.x : (x0 + x1) / 2, py = conImg ? y(u.y) : y((y0 + y1) / 2);
        const w = 7.4;
        return `<g class="u ${esc(u.estado)}" data-c="${esc(u.codigo)}" tabindex="0" role="button" aria-label="Unidad ${esc(u.codigo)}, ${esc(u.tipo)}, ${fmt(u.m2_total)} m², ${esc(ESTADO_TXT[u.estado])}">
          <rect class="zona" x="${x0}" y="${y(y0)}" width="${+(x1 - x0).toFixed(2)}" height="${+(y(y1) - y(y0)).toFixed(2)}"/>
          <rect class="chip" x="${(px - w / 2).toFixed(2)}" y="${(py - 1.4).toFixed(2)}" width="${w}" height="2.8" rx="1.4"/>
          <circle class="pto" cx="${(px - w / 2 + 1.35).toFixed(2)}" cy="${py}" r=".62"/>
          <text class="cod" x="${(px - w / 2 + 2.35).toFixed(2)}" y="${(py + .46).toFixed(2)}">${esc(u.codigo)}</text></g>`;
      }).join("");
    } else {
      ((CFG.amenities || {})[p.piso] || []).forEach(a => {
        h += `<circle class="amen" cx="${a.x}" cy="${y(a.y)}" r=".9"/><text class="amen-t" x="${a.x}" y="${(y(a.y) + 2.6).toFixed(2)}">${esc(a.nombre)}</text>`;
      });
    }
    svg.innerHTML = h;
    marcarSeleccion();
  }
  function marcarSeleccion() { $$("#plano .u").forEach(g => g.classList.toggle("sel", !!S.unidad && g.dataset.c === S.unidad.codigo)); }

  // ---------- Tarjeta (vista previa) ----------
  function abrirTarjeta(u) {
    S.unidad = u; S.render = 1;
    const t = tipologia(u), nombre = S.datos.proyecto.nombre || "Ugarte City Gardens";
    const wa = linkWA(`Hola, quiero información sobre la unidad ${u.codigo} (${u.tipo}, ${nombrePiso(u.piso).toLowerCase()}) de ${nombre}.`);
    const precio = u.estado === "Vendido" ? "Vendida"
      : u.mostrarPrecio && u.precio ? `USD ${fmt(u.precio)}` : "Consultar";
    const tj = $("#tarjeta");
    tj.innerHTML = `
      <div class="tarjeta-render" id="tjRender">${renderTarjeta(u)}
        <button class="cerrar" aria-label="Cerrar">${IC.cerrar}</button>
        ${IMG.renders ? `<div class="miniaturas">${[1, 2, 3].map(n => `<button data-r="${n}" aria-label="Render ${n}" aria-pressed="${n === 1}"></button>`).join("")}</div>` : ""}
      </div>
      <div class="tarjeta-cuerpo">
        <div class="tarjeta-cab"><div><h3>Unidad ${esc(u.codigo)}</h3><p class="tarjeta-sub">${esc(u.tipo)} · ${esc(nombrePiso(u.piso))}</p></div>
          <span class="estado ${esc(u.estado)}">${esc(ESTADO_TXT[u.estado])}</span></div>
        <div class="precio"><small>Valor</small>${esc(precio)}</div>
        ${wa && u.estado !== "Vendido" ? `<a class="solicitar" href="${esc(wa)}" target="_blank" rel="noopener">${IC.mail}Solicitar información</a>` : ""}
        <dl class="datos">
          <div><dt>Superficie total</dt><dd>${fmt(u.m2_total)} m²</dd></div>
          <div><dt>Ambientes</dt><dd>${fmt(u.ambientes)}</dd></div>
          <div><dt>Dormitorios</dt><dd>${u.dormitorios ? fmt(u.dormitorios) : "—"}</dd></div>
          <div><dt>Baños</dt><dd>${fmt(u.banos)}</dd></div>
          <div><dt>Piso</dt><dd>${esc(u.piso === "PB" ? "PB" : u.piso + "°")}</dd></div>
          <div><dt>Balcón</dt><dd>${u.m2_balcon ? fmt(u.m2_balcon) + " m²" : "—"}</dd></div>
        </dl>
        <div class="tarjeta-acc"><button data-acc="ficha">Ver ficha</button><button class="prim" data-acc="tour">Tour 360°</button></div>
      </div>`;
    tj.hidden = false; tj.scrollTop = 0; document.body.classList.add("con-tarjeta");
    marcarSeleccion();
    history.replaceState(null, "", `#pisos/${encodeURIComponent(u.codigo)}`);
  }
  function renderTarjeta(u) {
    return IMG.renders
      ? `<img src="assets/img/tipologias/${esc(u.tipologia)}/render-${S.render}.webp" alt="Render de ${esc(tipologia(u).nombre || u.tipo)}">`
      : `<div class="pendiente"><span>Render · ${esc(tipologia(u).nombre || u.tipo)}</span></div>`;
  }
  function cerrarTarjeta(hash = true) {
    $("#tarjeta").hidden = true; S.unidad = null; marcarSeleccion(); document.body.classList.remove("con-tarjeta");
    if (hash && S.piso) history.replaceState(null, "", `#pisos/${encodeURIComponent(S.piso)}`);
  }

  // =========================================================
  // ZOOM (planta y fachada)
  // =========================================================
  function crearZoom(lienzo, mov, alClic) {
    const Z = { s: 1, x: 0, y: 0 };
    const aplicar = () => {
      const r = lienzo.getBoundingClientRect();
      Z.s = Math.min(5, Math.max(1, Z.s));
      Z.x = Math.min(0, Math.max(r.width * (1 - Z.s), Z.x));
      Z.y = Math.min(0, Math.max(r.height * (1 - Z.s), Z.y));
      mov.style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
    };
    const en = (f, cx, cy) => { const ns = Math.min(5, Math.max(1, Z.s * f)); Z.x = cx - (cx - Z.x) * (ns / Z.s); Z.y = cy - (cy - Z.y) * (ns / Z.s); Z.s = ns; aplicar(); };
    const centro = () => { const r = lienzo.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
    const ptrs = new Map(); let ini = null, movido = false, pinch = null;
    lienzo.addEventListener("wheel", e => { e.preventDefault(); const r = lienzo.getBoundingClientRect(); en(Math.exp(-e.deltaY * .0018), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    lienzo.addEventListener("pointerdown", e => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { ini = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y }; movido = false; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: Z.s }; movido = true; }
    });
    lienzo.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = lienzo.getBoundingClientRect();
      if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; en((pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) / Z.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
      else if (ptrs.size === 1 && ini) {
        const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
        if (!movido && Math.hypot(dx, dy) > 6 && Z.s > 1) { movido = true; lienzo.classList.add("arrastrando"); lienzo.setPointerCapture(e.pointerId); }
        if (movido) { Z.x = ini.zx + dx; Z.y = ini.zy + dy; aplicar(); }
      }
    });
    const fin = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { lienzo.classList.remove("arrastrando"); ini = null; setTimeout(() => (movido = false), 0); } };
    lienzo.addEventListener("pointerup", fin); lienzo.addEventListener("pointercancel", fin);
    lienzo.addEventListener("click", e => { if (!movido) alClic(e); });
    lienzo.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { if (e.target.matches("[role=button]")) { e.preventDefault(); alClic(e); } } });
    window.addEventListener("resize", aplicar);
    return { mas: () => en(1.4, ...centro()), menos: () => en(1 / 1.4, ...centro()), reset: () => { Z.s = 1; Z.x = 0; Z.y = 0; aplicar(); } };
  }

  // =========================================================
  // UNIDAD MODELO
  // =========================================================
  const esKuula = u => { try { return /(^|\.)kuula\.co$/.test(new URL(u).hostname); } catch { return false; } };
  const prox = (sobre, titulo, texto) => `<div class="prox"><div><p class="sobre">${sobre}</p><h3>${titulo}</h3><p>${texto}</p></div></div>`;
  function pintarUnidad() {
    const u = S.unidadModelo, t = tipologia(u), nom = esc(t.nombre || u.tipo);
    $("#marcaTag").textContent = `Unidad ${u.codigo}`;
    $$("#paneles button").forEach(b => b.setAttribute("aria-pressed", b.dataset.panel === S.panel));
    let h = "";
    switch (S.panel) {
      case "tour":
        h = (CFG.tours || {})[u.tipologia]
          ? `<div class="panel-u"><iframe src="tour.html?t=${encodeURIComponent(CFG.tours[u.tipologia])}&incrustado=1" title="Tour 360° · ${nom}" allow="gyroscope; accelerometer; fullscreen" allowfullscreen></iframe></div>`
          : t.tour && esKuula(t.tour)
          ? `<div class="panel-u"><iframe src="${esc(t.tour)}" title="Tour 360° · ${nom}" allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen" allowfullscreen></iframe></div>`
          : `<div class="panel-u">${prox("Tour 360° · " + nom, "Recorrido virtual", "Estamos terminando las panorámicas de esta tipología. Muy pronto vas a poder recorrerla por dentro.")}</div>`;
        break;
      case "galeria":
        h = IMG.renders
          ? `<div class="panel-u"><img id="galImg" src="assets/img/tipologias/${esc(u.tipologia)}/render-1.webp" alt="Render de ${nom}">
             <div class="tira">${[1, 2, 3].map(n => `<button data-g="${n}" aria-pressed="${n === 1}" aria-label="Render ${n}"><img src="assets/img/tipologias/${esc(u.tipologia)}/render-${n}.webp" alt=""></button>`).join("")}</div></div>`
          : `<div class="panel-u">${prox("Galería · " + nom, "Interiores", "Los renders de esta tipología se están produciendo y se publicarán en esta galería.")}</div>`;
        break;
      case "vistas":
        h = `<div class="panel-u">${prox("Vistas · Unidad " + esc(u.codigo), "Lo que vas a ver", "Vistas reales desde la unidad y el balcón, según su piso y orientación.")}</div>`; break;
      case "plano":
        h = IMG.renders
          ? `<div class="panel-u claro"><img src="assets/img/tipologias/${esc(u.tipologia)}/planta-3d.webp" alt="Planta 3D amoblada de ${nom}" style="max-width:100%;max-height:100%;border-radius:18px;box-shadow:var(--sombra)"></div>`
          : `<div class="panel-u">${prox("Plano 3D · " + nom, "Planta amoblada", "Planta 3D con el equipamiento sugerido de cada ambiente.")}</div>`;
        break;
      case "terminaciones":
        h = `<div class="panel-u claro"><div class="terminaciones">
          <figure><div class="foto"><div class="pendiente"><span>Próximamente</span></div></div><figcaption><b>Estándar</b><span>Pisos, revestimientos y carpinterías incluidos.</span></figcaption></figure>
          <figure><div class="foto"><div class="pendiente"><span>Próximamente</span></div></div><figcaption><b>Premium</b><span>Mejoras opcionales de materiales y equipamiento.</span></figcaption></figure></div></div>`;
        break;
      case "comparador":
        if (!S.comp.length) S.comp = [u.codigo, (S.datos.unidades.find(x => x.tipologia !== u.tipologia && x.estado === "Disponible") || S.datos.unidades[1]).codigo];
        h = `<div class="panel-u claro"><div class="compara"><h3>Comparar unidades</h3>${comparador()}</div></div>`;
        break;
    }
    $("#unidadPanel").innerHTML = h;
    history.replaceState(null, "", `#unidad/${encodeURIComponent(u.codigo)}`);
  }
  function comparador() {
    const opts = sel => S.datos.unidades.map(x => `<option value="${esc(x.codigo)}"${x.codigo === sel ? " selected" : ""}>${esc(x.codigo)} · ${esc(x.tipo)}</option>`).join("");
    const [a, b] = S.comp.map(unidad);
    const filas = [["Tipo", x => x.tipo], ["Piso", x => nombrePiso(x.piso)], ["Estado", x => ESTADO_TXT[x.estado]],
      ["Valor", x => x.estado === "Vendido" ? "—" : x.mostrarPrecio && x.precio ? "USD " + fmt(x.precio) : "Consultar"],
      ["Superficie total", x => fmt(x.m2_total) + " m²"], ["Cubierta", x => fmt(x.m2_cubiertos) + " m²"], ["Balcón", x => x.m2_balcon ? fmt(x.m2_balcon) + " m²" : "—"],
      ["Ambientes", x => fmt(x.ambientes)], ["Dormitorios", x => x.dormitorios ? fmt(x.dormitorios) : "—"], ["Baños", x => fmt(x.banos)]];
    return `<div class="compara-sel"><select id="compA" aria-label="Primera unidad">${opts(a.codigo)}</select><select id="compB" aria-label="Segunda unidad">${opts(b.codigo)}</select></div>
      <table>${filas.map(([k, f]) => `<tr><th>${k}</th><td>${esc(f(a))}</td><td>${esc(f(b))}</td></tr>`).join("")}</table>`;
  }

  // =========================================================
  // FICHA TÉCNICA
  // =========================================================
  function abrirFicha(u) {
    if (!u) return;
    const t = tipologia(u);
    const fila = (k, v) => `<div class="fila"><span>${k}</span><b>${esc(v)}</b></div>`;
    const amb = u.ambientesDetalle || [];
    const wa = linkWA(`Hola, quiero información sobre la unidad ${u.codigo} de ${S.datos.proyecto.nombre || "Ugarte City Gardens"}.`);
    $("#fichaTitulo").textContent = `Unidad ${u.codigo}`;
    $("#fichaCuerpo").innerHTML =
      fila("Tipología", t.nombre || u.tipo) + fila("Piso", nombrePiso(u.piso)) + fila("Estado", ESTADO_TXT[u.estado]) +
      fila("Valor", u.estado === "Vendido" ? "—" : u.mostrarPrecio && u.precio ? "USD " + fmt(u.precio) : "Consultar") +
      fila("Superficie total", fmt(u.m2_total) + " m²") + fila("Superficie cubierta", fmt(u.m2_cubiertos) + " m²") +
      fila("Balcón", u.m2_balcon ? fmt(u.m2_balcon) + " m²" : "—") + fila("Ambientes", fmt(u.ambientes)) +
      fila("Dormitorios", u.dormitorios ? fmt(u.dormitorios) : "—") + fila("Baños", fmt(u.banos)) +
      (u.orientacion ? fila("Orientación", u.orientacion) : "") +
      (amb.length ? `<h4>Superficie por ambiente</h4>${amb.map(a => fila(a.ambiente, a.m2 != null ? fmt(a.m2) + " m²" : "—")).join("")}
        ${amb.some(a => a.m2 != null) ? "" : `<p class="nota">Medidas por ambiente a confirmar.</p>`}` : "") +
      (u.nota ? `<p class="nota">${esc(u.nota)}</p>` : "") +
      `<p class="nota">Valores y superficies sujetos a modificación. ${esc(S.datos.proyecto.direccion || "")}</p>
       <div class="sec-acc"><button class="boton sec2" data-imprimir>Descargar ficha</button>${wa ? `<a class="boton" href="${esc(wa)}" target="_blank" rel="noopener">${IC.wa}Consultar</a>` : ""}</div>`;
    $("#ficha").showModal();
  }

  // =========================================================
  // SECCIONES DEL MENÚ
  // =========================================================
  const foto = (txt, sub = "", cls = "") => `<figure class="${cls}"><div class="foto"><div class="pendiente"><span>Próximamente</span></div></div><figcaption>${esc(txt)}${sub ? `<small>${esc(sub)}</small>` : ""}</figcaption></figure>`;
  function pintarSeccion(v) {
    const d = S.datos, p = d.proyecto, el = $("#vista-" + v);
    let h = "";
    if (v === "amenities") {
      const t = d.pisos.find(x => x.piso === "T"), pb = d.pisos.find(x => x.piso === "PB");
      const nombres = [...new Set([...(CFG.amenities.T || []), ...(CFG.amenities.PB || [])].map(a => a.nombre))];
      h = `<p class="sobre">Rooftop · Planta baja</p><h2 id="t-amen">Amenities</h2>
        <p class="sec-desc">${esc([t && t.descripcion, pb && pb.descripcion].filter(Boolean).join(" "))}</p>
        <div class="tarjetas">${nombres.map(n => foto(n)).join("")}</div>
        <div class="sec-acc"><a class="boton" href="#pisos/T">Ver terraza en planta</a><a class="boton sec2" href="#pisos/PB">Ver planta baja</a></div>`;
    }
    if (v === "obra") {
      const etapas = ["Excavación", "Estructura", "Mampostería", "Terminaciones"];
      const act = String(p.etapa_actual || "").trim().toLowerCase();
      const i = etapas.findIndex(e => e.toLowerCase() === act);
      h = `<p class="sobre">Etapa actual · ${esc(p.etapa_actual || "Proyecto")}</p><h2 id="t-obra">Avances de obra</h2>
        <p class="sec-desc">${i < 0 ? "Proyecto en etapa de desarrollo. Próximamente publicaremos fotos y videos actualizados del progreso de construcción." : "Seguí el avance de la construcción etapa por etapa."}${p.entrega_estimada ? ` Entrega estimada: ${esc(p.entrega_estimada)}.` : ""}</p>
        <div class="tarjetas">${etapas.map((e, k) => foto(e, k < i ? "Completa" : k === i ? "En curso" : "", k === i ? "actual" : "")).join("")}</div>`;
    }
    if (v === "financiacion") {
      const wa = linkWA(`Hola, quiero conocer las opciones de financiación de ${p.nombre || "Ugarte City Gardens"}.`);
      const extra = [["Anticipo", p.financiacion_anticipo], ["Cuotas", p.financiacion_cuotas]].filter(x => x[1]);
      h = `<p class="sobre">Plan de pagos</p><h2 id="t-fin">Financiación</h2>
        <p class="sec-desc">${esc(p.financiacion_texto || "Las condiciones de pago se definen según la unidad elegida.")}</p>
        ${extra.length ? `<div class="cercanias">${extra.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join("")}</div>` : ""}
        ${wa ? `<div class="sec-acc"><a class="boton" href="${esc(wa)}" target="_blank" rel="noopener">${IC.wa}Consultar financiación</a></div>` : ""}`;
    }
    if (v === "ubicacion") {
      h = `<p class="sobre">${esc(p.direccion || "")}</p><h2 id="t-ubi">Ubicación</h2>
        <p class="sec-desc">A media cuadra de Av. del Libertador, con excelente conectividad y cercanía a espacios verdes, universidades y polos gastronómicos.</p>
        <div class="mapa"><iframe title="Mapa de ubicación de Ugarte City Gardens" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${mapsQ()}&z=16&output=embed"></iframe></div>
        <div class="sec-acc"><a class="boton" href="https://www.google.com/maps/search/?api=1&query=${mapsQ()}" target="_blank" rel="noopener">${IC.pin}Abrir en Google Maps</a>
        <a class="boton sec2" href="https://www.google.com/maps/dir/?api=1&destination=${mapsQ()}" target="_blank" rel="noopener">Cómo llegar</a></div>`;
    }
    if (v === "contacto") {
      const opts = d.unidades.filter(u => u.estado !== "Vendido").map(u => `<option value="${esc(u.codigo)}"${S.unidad && S.unidad.codigo === u.codigo ? " selected" : ""}>${esc(u.codigo)} · ${esc(u.tipo)}</option>`).join("");
      h = `<p class="sobre">Atención personalizada</p><h2 id="t-con">Contacto</h2>
        <p class="sec-desc">Dejá tus datos y te contactamos con disponibilidad, precios y condiciones de pago.</p>
        <div class="contacto">
          <form class="formulario" id="formContacto" novalidate>
            <label for="cNombre">Nombre completo<input id="cNombre" name="nombre" autocomplete="name" required></label>
            <label for="cTel">WhatsApp<input id="cTel" name="tel" type="tel" autocomplete="tel" inputmode="tel" required></label>
            <label for="cMail">Email<input id="cMail" name="mail" type="email" autocomplete="email"></label>
            <label for="cUnidad">Unidad de interés<select id="cUnidad" name="unidad"><option value="">Todavía no sé</option>${opts}</select></label>
            <label for="cMsj">Mensaje<textarea id="cMsj" name="msj" rows="3"></textarea></label>
            <button class="boton" type="submit">${IC.wa}Enviar consulta por WhatsApp</button>
          </form>
          <div class="datos-contacto">
            <p>${IC.pin}${esc(p.direccion || "")}</p>
            ${p.whatsapp ? `<a href="${esc(linkWA("Hola, quiero información sobre " + (p.nombre || "Ugarte City Gardens") + "."))}" target="_blank" rel="noopener">${IC.wa}${esc(telefono(p.whatsapp))}</a>` : ""}
            ${igUser() ? `<a href="https://www.instagram.com/${esc(igUser())}" target="_blank" rel="noopener">${IC.ig}@${esc(igUser())}</a>` : ""}
            ${p.email ? `<a href="mailto:${esc(p.email)}">${IC.mail}${esc(p.email)}</a>` : ""}
            <div class="firma"><img src="assets/img/logo-julieta-acuna.svg" alt="Julieta Acuña, arquitecta"><div><small>Proyecto a cargo de</small><b>${esc(p.profesional_nombre || "")}</b></div></div>
          </div>
        </div>`;
    }
    el.innerHTML = `<div class="sec">${h}</div>`;
  }

  // =========================================================
  // QR (solo para escanear y compartir el link)
  // =========================================================
  function urlSitio() { const u = S.datos && S.datos.proyecto.url_sitio; return /^https?:\/\//.test(u || "") ? u : location.origin + location.pathname; }
  function qrSVG(texto) {
    const q = qrcode(0, "M"); q.addData(texto); q.make();
    const n = q.getModuleCount(), m = 1; let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" role="img" aria-label="Código QR del showroom"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1E2420"/></svg>`;
  }
  function abrirQR() {
    const url = urlSitio();
    $("#qrCaja").innerHTML = qrSVG(url);
    $("#qrUrl").textContent = url.replace(/^https?:\/\//, "");
    $("#qrCompartir").hidden = !navigator.share;
    $("#qrPop").hidden = false; $("#btnQR").setAttribute("aria-expanded", "true");
  }
  function cerrarQR() { $("#qrPop").hidden = true; $("#btnQR").setAttribute("aria-expanded", "false"); }
  function copiar(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => avisar("Link copiado"), () => avisar(t, 6000)); }

  // =========================================================
  // MENÚ, AVISOS Y EVENTOS
  // =========================================================
  function abrirMenu(abrir) {
    const m = $("#menu");
    m.classList.toggle("abierto", abrir); m.setAttribute("aria-hidden", !abrir); m.inert = !abrir;
    $("#velo").hidden = !abrir; $("#btnMenu").setAttribute("aria-expanded", abrir);
    if (abrir) { cerrarQR(); setTimeout(() => $("#menuLista a").focus(), 50); }
  }
  let tAviso;
  function avisar(txt, ms = 3200) { const a = $("#aviso"); a.textContent = txt; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => (a.hidden = true), ms); }
  function pantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => avisar("Tu navegador no permite pantalla completa"));
  }

  function eventos() {
    $("#btnMenu").onclick = () => abrirMenu(true);
    $("#cerrarMenu").onclick = $("#velo").onclick = () => abrirMenu(false);
    $("#menuLista").addEventListener("click", e => { if (e.target.closest("a")) abrirMenu(false); });
    $("#btnPantalla").onclick = pantallaCompleta;
    $("#btnQR").onclick = e => { e.stopPropagation(); $("#qrPop").hidden ? (S.datos && abrirQR()) : cerrarQR(); };
    $("#qrCopiar").onclick = () => copiar(urlSitio());
    $("#qrCompartir").onclick = () => navigator.share({ title: S.datos.proyecto.nombre || "Ugarte City Gardens", url: urlSitio() }).catch(() => {});
    document.addEventListener("click", e => { if (!$("#qrPop").hidden && !e.target.closest("#qrPop,#btnQR")) cerrarQR(); });
    $("#btnVolver").onclick = () => { location.hash = S.vista === "pisos" ? "masterplan" : vistaAnterior; };
    $("#btnVolverPisos").onclick = () => { location.hash = `pisos/${encodeURIComponent(S.unidadModelo.codigo)}`; };
    $("#btnFicha").onclick = () => abrirFicha(S.unidadModelo);
    $$("#diaNoche button").forEach(b => b.onclick = () => setModo(b.dataset.modo));

    zExt = crearZoom($("#lienzoExt"), $("#movExt"), e => { const n = e.target.closest(".nivel"); if (n) location.hash = `pisos/${encodeURIComponent(n.dataset.piso)}`; });
    zPlano = crearZoom($("#lienzoPlano"), $("#movPlano"), e => { const g = e.target.closest(".u"); if (g) abrirTarjeta(unidad(g.dataset.c)); });
    $$(".zoom").forEach(z => z.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      const zz = z.dataset.lienzo === "Ext" ? zExt : zPlano;
      b.dataset.z === "+" ? zz.mas() : b.dataset.z === "-" ? zz.menos() : zz.reset();
    }));
    $("#riel").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { cerrarTarjeta(false); elegirPiso(b.dataset.piso); history.replaceState(null, "", `#pisos/${encodeURIComponent(b.dataset.piso)}`); } });
    $("#tarjeta").addEventListener("click", e => {
      if (e.target.closest(".cerrar")) return cerrarTarjeta();
      const r = e.target.closest("[data-r]");
      if (r) { S.render = +r.dataset.r; $("#tjRender img").src = `assets/img/tipologias/${S.unidad.tipologia}/render-${S.render}.webp`; $$("#tarjeta [data-r]").forEach(x => x.setAttribute("aria-pressed", x === r)); }
      const a = e.target.closest("[data-acc]"); if (!a) return;
      if (a.dataset.acc === "ficha") abrirFicha(S.unidad);
      if (a.dataset.acc === "tour") { S.panel = "tour"; location.hash = `unidad/${encodeURIComponent(S.unidad.codigo)}`; }
    });
    $("#paneles").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { S.panel = b.dataset.panel; pintarUnidad(); } });
    $("#unidadPanel").addEventListener("click", e => {
      const g = e.target.closest("[data-g]");
      if (g) { $("#galImg").src = g.querySelector("img").src; $$("#unidadPanel [data-g]").forEach(x => x.setAttribute("aria-pressed", x === g)); }
    });
    $("#unidadPanel").addEventListener("change", e => {
      if (e.target.id === "compA") S.comp[0] = e.target.value;
      if (e.target.id === "compB") S.comp[1] = e.target.value;
      if (e.target.matches("select")) $(".compara").innerHTML = `<h3>Comparar unidades</h3>${comparador()}`;
    });
    $("#ficha").addEventListener("click", e => {
      if (e.target === $("#ficha") || e.target.closest("[data-cerrar]")) $("#ficha").close();
      if (e.target.closest("[data-imprimir]")) window.print();
    });
    document.addEventListener("submit", e => {
      if (e.target.id !== "formContacto") return;
      e.preventDefault();
      const f = e.target, nom = f.nombre.value.trim(), tel = f.tel.value.trim();
      if (!nom || !tel) { avisar("Completá tu nombre y tu WhatsApp"); (nom ? f.tel : f.nombre).focus(); return; }
      const partes = [`Hola, soy ${nom}.`, f.unidad.value ? `Me interesa la unidad ${f.unidad.value}.` : "Quiero información sobre Ugarte City Gardens.", f.msj.value.trim(), `Mi WhatsApp: ${tel}`, f.mail.value.trim() ? `Email: ${f.mail.value.trim()}` : ""].filter(Boolean);
      const wa = linkWA(partes.join("\n"));
      if (wa) window.open(wa, "_blank", "noopener");
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if ($("#menu").classList.contains("abierto")) abrirMenu(false);
      else if (!$("#qrPop").hidden) cerrarQR();
      else if (!$("#tarjeta").hidden && !$("#ficha").open) cerrarTarjeta();
    });
    window.addEventListener("hashchange", ruta);
  }

  async function iniciar() {
    setModo(leer("showroom-modo") === "noche" ? "noche" : "dia");
    eventos();
    ruta();
    S.datos = await Showroom.cargarDatos();
    const p = S.datos.proyecto;
    pintarInicio();
    pintarRiel();
    $("#menuDir").textContent = p.direccion || "";
    $("#menuRedes").innerHTML =
      (linkWA("Hola") ? `<a href="${esc(linkWA("Hola, quiero información sobre " + (p.nombre || "Ugarte City Gardens") + "."))}" target="_blank" rel="noopener" aria-label="WhatsApp">${IC.wa}</a>` : "") +
      (igUser() ? `<a href="https://www.instagram.com/${esc(igUser())}" target="_blank" rel="noopener" aria-label="Instagram">${IC.ig}</a>` : "") +
      `<a href="#ubicacion" aria-label="Ubicación">${IC.pin}</a>`;
    const wa = linkWA(`Hola, quiero información sobre ${p.nombre || "Ugarte City Gardens"}.`);
    if (wa) { $("#waFlotante").href = wa; $("#waFlotante").hidden = false; }
    ruta();
    if (S.datos.origen !== "sheet") avisar("Mostrando datos guardados: la planilla no respondió.", 5000);
  }
  iniciar();
})();
