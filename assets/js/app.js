/* =========================================================
   SHOWROOM VIRTUAL — Ugarte City Gardens
   Interfaz: inicio, plantas con zoom y unidades cliqueables,
   recorrido 360°, menú, QR y modo día/noche.
   Los datos vienen de Google Sheets (ver datos.js).
   ========================================================= */
(function () {
  "use strict";
  const CFG = window.SHOWROOM_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = n => n == null ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: 1 });
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };

  const S = { datos: null, piso: null, unidad: null, tipo: "", soloDisp: false, tour: null };

  // ---------- Geometría de la planta (en % de la imagen de planta, 2054 × 2375 px) ----------
  const K = 2375 / 2054;                      // alto/ancho de la imagen
  const X4 = [15.02, 29.15, 38.75, 48.35, 62.48]; // 4 columnas: esquina · mono · mono · esquina
  const X3 = [15.02, 31.01, 47.01, 62.48];        // 3 columnas: pisos de 6 unidades
  const Y = [17.06, 42.73, 54.83, 81.46];         // frente · circulación · contrafrente
  const VISTA_ESQUEMA = `12 ${14 * K} 53.5 ${70.5 * K}`;
  const VISTA_IMAGEN = `0 0 100 ${100 * K}`;
  const col = (x, xs) => { for (let i = 0; i < xs.length - 2; i++) if (x <= xs[i + 1]) return i; return xs.length - 2; };
  const corto = t => ({ "Monoambiente": "Mono", "1 Dormitorio": "1 dorm.", "2 Dormitorios": "2 dorm.", "3 Dormitorios": "3 dorm." }[t] || t);

  // =========================================================
  // TEMA DÍA / NOCHE
  // =========================================================
  function setModo(modo) {
    document.documentElement.dataset.modo = modo;
    $$(".diaNoche button").forEach(b => b.setAttribute("aria-pressed", b.dataset.modo === modo));
    $('meta[name="theme-color"]').content = modo === "noche" ? "#101411" : "#2D5C32";
    guardar("showroom-modo", modo);
    pintarHeroRender();
  }

  // =========================================================
  // NAVEGACIÓN ENTRE VISTAS  (#inicio, #plantas, #plantas/3, #unidad/3-02, #recorrido)
  // =========================================================
  function ruta() {
    const [vista, arg] = (location.hash.slice(1) || "inicio").split("/");
    const v = vista === "unidad" ? "plantas" : (["inicio", "plantas", "recorrido"].includes(vista) ? vista : "inicio");
    $$(".vista").forEach(s => s.classList.toggle("activa", s.id === "vista-" + v));
    $$("[data-vista]").forEach(a => a.dataset.vista === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    if (!S.datos) return;
    if (v === "plantas") {
      if (vista === "unidad" && arg) {
        const u = S.datos.unidades.find(x => x.codigo === decodeURIComponent(arg));
        if (u) { elegirPiso(u.piso, false); abrirFicha(u); return; }
      }
      const p = arg ? S.datos.pisos.find(x => x.piso.toLowerCase() === decodeURIComponent(arg).toLowerCase()) : null;
      elegirPiso(p ? p.piso : (S.piso || primerPisoConUnidades()), false);
      ajustarZoom();
    }
    if (v === "recorrido") pintarRecorrido();
  }
  const primerPisoConUnidades = () => (S.datos.pisos.find(p => p.unidades.length) || S.datos.pisos[0]).piso;

  // =========================================================
  // INICIO
  // =========================================================
  function pintarHero() {
    const d = S.datos, p = d.proyecto;
    $("#heroTitulo").textContent = p.nombre || "Ugarte City Gardens";
    $("#heroLema").textContent = p.lema || "";
    const disp = d.unidades.filter(u => u.estado === "Disponible").length;
    $("#heroDatos").innerHTML =
      `<div><b>${disp}</b><span>unidades disponibles</span></div>` +
      `<div><b>${d.unidades.length}</b><span>unidades en total</span></div>` +
      `<div><b>${d.tipologias.length}</b><span>tipologías</span></div>`;
    pintarHeroRender();
  }
  function pintarHeroRender() {
    const noche = document.documentElement.dataset.modo === "noche";
    const caja = $("#heroRender");
    if (CFG.imagenes && CFG.imagenes.fachada) {
      caja.innerHTML = `<img src="assets/img/fachada/${noche ? "noche" : "dia"}.webp" alt="Fachada de Ugarte City Gardens de ${noche ? "noche" : "día"}">`;
    } else {
      caja.innerHTML = `<div class="pendiente"><span>Render de fachada · ${noche ? "noche" : "día"}</span></div>`;
    }
  }

  // =========================================================
  // PLANTAS
  // =========================================================
  function pintarRiel() {
    const pisos = [...S.datos.pisos].reverse(); // Terraza arriba, PB abajo
    $("#riel").innerHTML = pisos.map(p => {
      const disp = p.unidades.filter(u => u.estado === "Disponible").length;
      const sub = p.unidades.length ? `${disp} disp.` : (p.piso === "PB" ? "Acceso" : "Amenities");
      const et = p.piso === "T" ? "T" : esc(p.etiqueta);
      return `<button data-piso="${esc(p.piso)}" aria-label="${esc(p.titulo)}${p.unidades.length ? `, ${disp} unidades disponibles` : ""}"><b>${et}</b><small>${sub}</small></button>`;
    }).join("");
  }

  function elegirPiso(piso, actualizarHash = true) {
    const p = S.datos.pisos.find(x => x.piso === piso);
    if (!p) return;
    const cambio = S.piso !== piso;
    S.piso = piso;
    $$("#riel button").forEach(b => b.setAttribute("aria-current", b.dataset.piso === piso));
    const sel = $(`#riel button[data-piso="${CSS.escape(piso)}"]`);
    if (sel) sel.scrollIntoView({ block: "nearest", inline: "nearest" });
    $("#pisoSobre").textContent = p.unidades.length ? `${p.unidades.length} unidades` : "Espacios comunes";
    $("#pisoTitulo").textContent = p.piso === "PB" ? "Planta baja" : p.piso === "T" ? "Terraza" : `Piso ${p.piso}`;
    $("#filtros").style.visibility = p.unidades.length ? "visible" : "hidden";
    if (cambio) { cerrarFicha(false); dibujarPlano(p); resetZoom(); }
    if (actualizarHash) history.replaceState(null, "", `#plantas/${encodeURIComponent(piso)}`);
  }

  function dibujarPlano(p) {
    const svg = $("#plano");
    const conImagen = !!(CFG.imagenes && CFG.imagenes.plantas);
    svg.classList.toggle("con-imagen", conImagen);
    svg.setAttribute("viewBox", conImagen ? VISTA_IMAGEN : VISTA_ESQUEMA);
    const y = v => (v * K).toFixed(2);
    let h = "";
    if (conImagen) {
      const archivo = p.piso.toLowerCase();
      h += `<image href="assets/img/plantas/${esc(archivo)}.webp" x="0" y="0" width="100" height="${y(100)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    // contorno del edificio
    h += `<rect class="muro" x="${X4[0]}" y="${y(Y[0])}" width="${X4[4] - X4[0]}" height="${y(Y[3] - Y[0])}" rx=".4"/>`;
    if (p.unidades.length) {
      const xs = p.unidades.length <= 6 ? X3 : X4;
      h += `<rect class="nucleo" x="${X4[0]}" y="${y(Y[1])}" width="${X4[4] - X4[0]}" height="${y(Y[2] - Y[1])}"/>`;
      h += `<text class="nucleo-txt" x="${(X4[0] + X4[4]) / 2}" y="${y((Y[1] + Y[2]) / 2) * 1 + .5}">CIRCULACIÓN · NÚCLEO</text>`;
      h += p.unidades.map(u => {
        const c = col(u.x, xs), arriba = u.y < 50;
        const x0 = xs[c], x1 = xs[c + 1], y0 = arriba ? Y[0] : Y[2], y1 = arriba ? Y[1] : Y[3];
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const pinX = conImagen ? u.x : cx, pinY = conImagen ? u.y : cy - 2.2;
        return `<g class="u ${esc(u.estado)}" data-c="${esc(u.codigo)}" tabindex="0" role="button"
                  aria-label="Unidad ${esc(u.codigo)}, ${esc(u.tipo)}, ${fmt(u.m2_total)} metros cuadrados, ${esc(u.estado)}">
          <rect class="zona" x="${x0}" y="${y(y0)}" width="${x1 - x0}" height="${y(y1 - y0)}"/>
          <circle class="pin" cx="${pinX}" cy="${y(pinY)}" r="1.15"/>
          <text class="cod" x="${pinX}" y="${(+y(pinY) + 3.3).toFixed(2)}">${esc(u.codigo)}</text>
          <text class="tip" x="${pinX}" y="${(+y(pinY) + 4.9).toFixed(2)}">${esc(corto(u.tipo))} · ${fmt(u.m2_total)} m²</text>
        </g>`;
      }).join("");
    } else {
      const puntos = (CFG.amenities && CFG.amenities[p.piso]) || [];
      h += puntos.map(a => `<circle class="amen-pin" cx="${a.x}" cy="${y(a.y)}" r="1"/>
        <text class="amen-txt" x="${a.x}" y="${(+y(a.y) + 3).toFixed(2)}">${esc(a.nombre)}</text>`).join("");
    }
    svg.innerHTML = h;
    aplicarFiltros();
    const desc = $("#pisoDesc");
    desc.textContent = !p.unidades.length && p.descripcion ? p.descripcion : "";
    desc.hidden = !desc.textContent;
  }

  function aplicarFiltros() {
    $$("#plano .u").forEach(g => {
      const u = S.datos.unidades.find(x => x.codigo === g.dataset.c);
      const ok = (!S.tipo || u.tipo === S.tipo) && (!S.soloDisp || u.estado === "Disponible");
      g.classList.toggle("atenuada", !ok);
      g.classList.toggle("sel", !!S.unidad && S.unidad.codigo === u.codigo);
    });
  }

  // ---------- Zoom y desplazamiento ----------
  const Z = { s: 1, x: 0, y: 0 };
  const lienzo = () => $("#lienzo");
  function aplicarZoom() {
    const r = lienzo().getBoundingClientRect();
    Z.s = Math.min(5, Math.max(1, Z.s));
    Z.x = Math.min(0, Math.max(r.width * (1 - Z.s), Z.x));
    Z.y = Math.min(0, Math.max(r.height * (1 - Z.s), Z.y));
    $("#lienzoMov").style.transform = `translate(${Z.x}px,${Z.y}px) scale(${Z.s})`;
  }
  function zoomEn(f, cx, cy) {
    const ns = Math.min(5, Math.max(1, Z.s * f));
    Z.x = cx - (cx - Z.x) * (ns / Z.s); Z.y = cy - (cy - Z.y) * (ns / Z.s); Z.s = ns;
    aplicarZoom();
  }
  function resetZoom() { Z.s = 1; Z.x = 0; Z.y = 0; aplicarZoom(); }
  function ajustarZoom() { aplicarZoom(); }
  function centro() { const r = lienzo().getBoundingClientRect(); return [r.width / 2, r.height / 2]; }

  function initZoom() {
    const el = lienzo();
    const ptrs = new Map();
    let inicio = null, movido = false, pinch = null;
    el.addEventListener("wheel", e => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomEn(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    el.addEventListener("pointerdown", e => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { inicio = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y }; movido = false; }
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: Z.s };
        movido = true;
      }
    });
    el.addEventListener("pointermove", e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = el.getBoundingClientRect();
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomEn((pinch.s * d / pinch.d) / Z.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      } else if (ptrs.size === 1 && inicio) {
        const dx = e.clientX - inicio.x, dy = e.clientY - inicio.y;
        if (!movido && Math.hypot(dx, dy) > 6) { movido = true; el.classList.add("arrastrando"); el.setPointerCapture(e.pointerId); }
        if (movido) { Z.x = inicio.zx + dx; Z.y = inicio.zy + dy; aplicarZoom(); }
      }
    });
    const fin = e => {
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) { el.classList.remove("arrastrando"); inicio = null; setTimeout(() => (movido = false), 0); }
    };
    el.addEventListener("pointerup", fin);
    el.addEventListener("pointercancel", fin);
    el.addEventListener("click", e => {
      if (movido) return;
      const g = e.target.closest(".u");
      if (g) abrirFicha(S.datos.unidades.find(u => u.codigo === g.dataset.c));
    });
    el.addEventListener("keydown", e => {
      const g = e.target.closest && e.target.closest(".u");
      if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirFicha(S.datos.unidades.find(u => u.codigo === g.dataset.c)); }
    });
    $("#zoomMas").onclick = () => zoomEn(1.4, ...centro());
    $("#zoomMenos").onclick = () => zoomEn(1 / 1.4, ...centro());
    $("#zoomReset").onclick = resetZoom;
    window.addEventListener("resize", aplicarZoom);
  }

  // ---------- Ficha (vista previa de la unidad) ----------
  function linkWhatsApp(texto) {
    const n = String(S.datos.proyecto.whatsapp || "").replace(/\D/g, "");
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
  }
  function abrirFicha(u) {
    if (!u) return;
    S.unidad = u;
    const t = S.datos.tipologias.find(x => x.tipologia === u.tipologia) || {};
    const nombre = S.datos.proyecto.nombre || "Ugarte City Gardens";
    const precio = u.estado === "Vendido" ? `<div class="precio">Unidad vendida</div>`
      : u.mostrarPrecio && u.precio ? `<div class="precio"><small>Precio</small>USD ${fmt(u.precio)}</div>`
      : `<div class="precio"><small>Precio</small>Consultar</div>`;
    const conM2 = u.ambientesDetalle.some(a => a.m2 != null);
    const ambientes = u.ambientesDetalle.length ? `<div class="ambientes"><h4>Superficie por ambiente</h4><ul>
        ${u.ambientesDetalle.map(a => `<li><span>${esc(a.ambiente)}</span><span>${a.m2 != null ? fmt(a.m2) + " m²" : "—"}</span></li>`).join("")}
      </ul>${conM2 ? "" : `<p style="font-size:12px;color:var(--tinta-2);margin:6px 0 0">Medidas por ambiente a confirmar.</p>`}</div>` : "";
    const rend = CFG.imagenes && CFG.imagenes.renders;
    const galeria = `<div class="galeria"><h4>Renders · ${esc(t.nombre || u.tipo)}</h4><div class="tiras">${[1, 2, 3].map(n => rend
      ? `<button class="tira" data-render="assets/img/tipologias/${esc(u.tipologia)}/render-${n}.webp" aria-label="Ampliar render ${n}"><img loading="lazy" src="assets/img/tipologias/${esc(u.tipologia)}/render-${n}.webp" alt="Render ${n} de la tipología ${esc(t.nombre || u.tipo)}"></button>`
      : `<div class="tira"><div class="pendiente"><span>Render ${n}</span></div></div>`).join("")}</div></div>`;
    const wa = linkWhatsApp(`Hola, me interesa la unidad ${u.codigo} (${u.tipo}, piso ${u.piso}) de ${nombre}.`);
    const f = $("#ficha");
    f.innerHTML = `
      <div class="ficha-cab">
        <div><p class="sobre">Unidad</p><h3>${esc(u.codigo)}</h3><p>${esc(u.tipo)} · Piso ${esc(u.piso)}</p></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <button class="icono cerrarFicha" aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          <span class="estado ${esc(u.estado)}">${esc(u.estado)}</span>
        </div>
      </div>
      <div class="ficha-cuerpo">
        ${precio}
        <dl class="specs">
          <div><dt>Superficie total</dt><dd>${fmt(u.m2_total)} m²</dd></div>
          <div><dt>Cubierta</dt><dd>${fmt(u.m2_cubiertos)} m²</dd></div>
          <div><dt>Balcón</dt><dd>${u.m2_balcon ? fmt(u.m2_balcon) + " m²" : "—"}</dd></div>
          <div><dt>Ambientes</dt><dd>${fmt(u.ambientes)}</dd></div>
          <div><dt>Dormitorios</dt><dd>${u.dormitorios ? fmt(u.dormitorios) : "—"}</dd></div>
          <div><dt>Baños</dt><dd>${fmt(u.banos)}</dd></div>
        </dl>
        ${u.nota ? `<p style="margin:0;font-size:14px">${esc(u.nota)}</p>` : ""}
        ${ambientes}
        ${galeria}
        <div class="ficha-acciones">
          ${wa && u.estado !== "Vendido" ? `<a class="btn primario" href="${esc(wa)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            Consultar por esta unidad</a>` : ""}
          ${t.tour ? `<a class="btn secundario" href="#recorrido" data-tour="${esc(t.tipologia)}">Recorrido 360° de la tipología</a>` : ""}
          <button class="btn secundario" data-copiar-unidad>Copiar link de la unidad</button>
        </div>
      </div>`;
    f.hidden = false;
    f.scrollTop = 0;
    aplicarFiltros();
    history.replaceState(null, "", `#unidad/${encodeURIComponent(u.codigo)}`);
  }
  function cerrarFicha(actualizarHash = true) {
    $("#ficha").hidden = true;
    S.unidad = null;
    if (S.datos) aplicarFiltros();
    if (actualizarHash && S.piso) history.replaceState(null, "", `#plantas/${encodeURIComponent(S.piso)}`);
  }

  // =========================================================
  // RECORRIDO 360°
  // =========================================================
  const esKuula = u => { try { const h = new URL(u).hostname; return /(^|\.)kuula\.co$/.test(h); } catch { return false; } };
  function pintarRecorrido() {
    const tours = S.datos.tipologias.filter(t => t.tour && esKuula(t.tour));
    const sel = $("#recorridoSel"), marco = $("#recorridoMarco");
    if (!tours.length) {
      sel.hidden = true;
      marco.innerHTML = `<div class="vacio"><div><p class="sobre">Recorrido 360°</p><h3>Muy pronto</h3>
        <p>Estamos terminando las panorámicas del edificio. Mientras tanto, podés recorrer las plantas y ver cada unidad.</p>
        <a class="btn primario" href="#plantas">Ver plantas</a></div></div>`;
      return;
    }
    sel.hidden = false;
    if (!S.tour || !tours.some(t => t.tipologia === S.tour)) S.tour = tours[0].tipologia;
    sel.innerHTML = tours.map(t => `<button data-t="${esc(t.tipologia)}" aria-pressed="${t.tipologia === S.tour}">${esc(t.nombre)}</button>`).join("");
    const t = tours.find(x => x.tipologia === S.tour);
    const actual = marco.querySelector("iframe");
    if (!actual || actual.dataset.t !== t.tipologia) {
      marco.innerHTML = `<iframe data-t="${esc(t.tipologia)}" src="${esc(t.tour)}" title="Recorrido 360° · ${esc(t.nombre)}"
        allow="xr-spatial-tracking; gyroscope; accelerometer; fullscreen" allowfullscreen loading="lazy"></iframe>`;
    }
  }

  // =========================================================
  // MENÚ Y SECCIONES
  // =========================================================
  function abrirMenu(abrir) {
    $("#menu").classList.toggle("abierto", abrir);
    $("#menu").setAttribute("aria-hidden", !abrir);
    $("#velo").hidden = !abrir;
    $("#btnMenu").setAttribute("aria-expanded", abrir);
    if (abrir) $("#menu .menu-lista button").focus();
  }
  const ICONOS = {
    wa: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    ig: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16.8" cy="7.2" r="1" fill="currentColor"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`
  };
  function contactos() {
    const p = S.datos.proyecto, l = [];
    const wa = linkWhatsApp(`Hola, quiero información sobre ${p.nombre || "Ugarte City Gardens"}.`);
    if (wa) l.push(`<a class="contacto-link" href="${esc(wa)}" target="_blank" rel="noopener">${ICONOS.wa}WhatsApp ${esc(telefono(p.whatsapp))}</a>`);
    if (p.instagram) l.push(`<a class="contacto-link" href="https://instagram.com/${esc(String(p.instagram).replace(/^@/, ""))}" target="_blank" rel="noopener">${ICONOS.ig}@${esc(String(p.instagram).replace(/^@/, ""))}</a>`);
    if (p.email) l.push(`<a class="contacto-link" href="mailto:${esc(p.email)}">${ICONOS.mail}${esc(p.email)}</a>`);
    return l.join("");
  }
  function telefono(n) {
    const d = String(n || "").replace(/\D/g, "");
    const m = d.match(/^54(9)(\d{4})(\d{2})(\d{4})$/);
    return m ? `+54 ${m[1]} ${m[2]} ${m[3]}-${m[4]}` : "+" + d;
  }

  const SECCIONES = {
    proyecto: () => {
      const p = S.datos.proyecto, d = S.datos;
      const disp = d.unidades.filter(u => u.estado === "Disponible").length;
      const dato = (t, v) => v != null && v !== "" ? `<div><dt>${t}</dt><dd>${v}</dd></div>` : "";
      const amen = d.pisos.filter(x => !x.unidades.length && x.descripcion);
      return ["El proyecto", `
        <p class="sobre">${esc(p.direccion || "")}</p>
        <p>${esc(p.lema || "")}</p>
        <dl class="grilla-datos">
          ${dato("Unidades", fmt(p.unidades_funcionales || d.unidades.length))}
          ${dato("Disponibles hoy", disp)}
          ${dato("Pisos", fmt(p.pisos))}
          ${dato("Terreno", p.superficie_terreno_m2 != null ? fmt(p.superficie_terreno_m2) + " m²" : "")}
          ${dato("Superficie a construir", p.m2_a_construir != null ? fmt(p.m2_a_construir) + " m²" : "")}
          ${dato("Residencial", p.m2_residencial != null ? fmt(p.m2_residencial) + " m²" : "")}
          ${dato("Comercial", p.m2_comercial != null ? fmt(p.m2_comercial) + " m²" : "")}
          ${dato("Entrega estimada", esc(p.entrega_estimada || ""))}
        </dl>
        ${amen.map(a => `<h3 style="font-family:var(--display);font-size:16px;margin:22px 0 4px">${esc(a.titulo)}</h3><p style="margin:0">${esc(a.descripcion)}</p>`).join("")}
        <div class="acciones"><a class="btn primario" href="#plantas" data-cerrar-panel>Ver plantas y unidades</a></div>`];
    },
    financiacion: () => {
      const p = S.datos.proyecto;
      const wa = linkWhatsApp(`Hola, quiero conocer las opciones de financiación de ${p.nombre || "Ugarte City Gardens"}.`);
      const extra = [["Anticipo", p.financiacion_anticipo], ["Cuotas", p.financiacion_cuotas]].filter(x => x[1]);
      return ["Financiación", `
        <p>${esc(p.financiacion_texto || "Consultanos por el plan de pagos de cada unidad.")}</p>
        ${extra.length ? `<dl class="grilla-datos">${extra.map(([t, v]) => `<div><dt>${t}</dt><dd style="font-size:17px">${esc(v)}</dd></div>`).join("")}</dl>` : ""}
        ${wa ? `<div class="acciones"><a class="btn primario" href="${esc(wa)}" target="_blank" rel="noopener">${ICONOS.wa}Consultar financiación</a></div>` : ""}`];
    },
    renders: () => {
      const r = CFG.imagenes || {};
      const fig = (src, txt, ok) => `<figure><div class="marco">${ok ? `<img loading="lazy" src="${src}" alt="${esc(txt)}" style="width:100%;height:100%;object-fit:cover">` : `<div class="pendiente"><span>Próximamente</span></div>`}</div><figcaption>${esc(txt)}</figcaption></figure>`;
      const items = [fig("assets/img/fachada/dia.webp", "Fachada · día", r.fachada), fig("assets/img/fachada/noche.webp", "Fachada · noche", r.fachada)]
        .concat(S.datos.tipologias.flatMap(t => [1, 2].map(n => fig(`assets/img/tipologias/${esc(t.tipologia)}/render-${n}.webp`, `${t.nombre} · ${n}`, r.renders))));
      return ["Renders", `<div class="renders-grilla">${items.join("")}</div>`];
    },
    etapas: () => {
      const p = S.datos.proyecto;
      const etapas = [["Proyecto", "Diseño, documentación y permisos"], ["Excavación", "Movimiento de suelos y fundaciones"], ["Estructura", "Hormigón armado, losas y núcleo"],
        ["Mampostería", "Cerramientos, instalaciones y fachada verde"], ["Terminaciones", "Pisos, carpinterías, artefactos y amenities"], ["Entrega", p.entrega_estimada ? `Estimada: ${p.entrega_estimada}` : "Posesión de las unidades"]];
      const i = Math.max(0, etapas.findIndex(e => e[0].toLowerCase() === String(p.etapa_actual || "").trim().toLowerCase()));
      return ["Etapas de obra", `<ol class="etapas">${etapas.map((e, k) => `<li class="${k < i ? "hecha" : k === i ? "actual" : ""}"><b>${e[0]}${k === i ? " · etapa actual" : ""}</b><span>${esc(e[1])}</span></li>`).join("")}</ol>`];
    },
    superficies: () => {
      const d = S.datos;
      return ["Superficies", d.tipologias.map(t => {
        const us = d.unidades.filter(u => u.tipologia === t.tipologia);
        const disp = us.filter(u => u.estado === "Disponible").length;
        const amb = d.superficies[t.tipologia] || [];
        return `<div class="tip-bloque"><h3>${esc(t.nombre)} <span>${us.length} unidades · ${disp} disponibles · pisos ${esc(t.pisos)}</span></h3>
          ${t.descripcion ? `<p style="margin:0 0 6px;color:var(--tinta-2);font-size:14px">${esc(t.descripcion)}</p>` : ""}
          <table class="tabla"><thead><tr><th>Ambiente</th><th style="text-align:right">m²</th></tr></thead><tbody>
          ${amb.map(a => `<tr><td>${esc(a.ambiente)}</td><td class="num">${a.m2 != null ? fmt(a.m2) : "—"}</td></tr>`).join("")}
          <tr><td><b>Total aproximado</b></td><td class="num"><b>${fmt(t.m2_aprox)}</b></td></tr></tbody></table></div>`;
      }).join("")];
    },
    ubicacion: () => {
      const p = S.datos.proyecto;
      const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.direccion || "Manuel Ugarte 1536, CABA");
      return ["Ubicación", `
        <p class="sobre">${esc(p.direccion || "")}</p>
        <p>A media cuadra de Av. del Libertador, con excelente conectividad y cerca de espacios verdes, universidades y polos gastronómicos.</p>
        <div class="mapa"><iframe title="Mapa de ubicación" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${q}&z=16&output=embed"></iframe></div>
        <div class="acciones"><a class="btn primario" href="https://www.google.com/maps/dir/?api=1&destination=${q}" target="_blank" rel="noopener">Cómo llegar</a></div>`];
    },
    profesional: () => {
      const p = S.datos.proyecto;
      return ["Profesional y contacto", `
        <div class="profesional">
          <div class="logo-caja"><img src="assets/img/logo-julieta-acuna.svg" alt="Julieta Acuña, arquitecta"></div>
          <div>
            <p class="sobre">Proyecto a cargo de</p>
            <h3 style="font-family:var(--display);font-size:22px;margin:4px 0 8px">${esc(p.profesional_nombre || "")}</h3>
            <p style="margin:0 0 10px;color:var(--tinta-2)">${esc(p.profesional_bio || "Arquitecta a cargo del proyecto y la dirección de obra.")}</p>
            ${contactos()}
          </div>
        </div>`];
    },
    identidad: () => {
      const sw = [["Verde bosque", "#2D5C32", "#fff", "Marca"], ["Verde", "#2FA360", "#fff", "Disponible"], ["Ocre", "#C9A24A", "#fff", "Reservado"],
        ["Terracota", "#B5483C", "#fff", "Vendido"], ["Crema", "#F6F4EE", "#1E2420", "Fondo"], ["Tinta", "#1E2420", "#fff", "Texto · noche"]];
      return ["Paleta y tipografía", `
        <div class="paleta">${sw.map(s => `<div style="background:${s[1]};color:${s[2]}"><b>${s[0]}</b>${s[1]} · ${s[3]}</div>`).join("")}</div>
        <div class="tipos">
          <div><p class="sobre">Títulos · Manrope</p><p style="font-family:var(--display);font-size:28px;font-weight:700;margin:6px 0 0">Ugarte City Gardens</p></div>
          <div><p class="sobre">Textos y datos · Inter</p><p style="margin:6px 0 0">Monoambiente de 47 m² con balcón verde, a media cuadra de Av. del Libertador.</p></div>
        </div>`];
    }
  };
  function abrirSeccion(id) {
    const [titulo, html] = SECCIONES[id]();
    $("#panelTitulo").textContent = titulo;
    $("#panelCuerpo").innerHTML = html;
    abrirMenu(false);
    $("#panel").showModal();
    $("#panelCuerpo").scrollTop = 0;
  }

  // =========================================================
  // QR
  // =========================================================
  function urlSitio() {
    const u = S.datos && S.datos.proyecto.url_sitio;
    return /^https?:\/\//.test(u || "") ? u : location.origin + location.pathname;
  }
  function qrSVG(texto, color = "#1E2420") {
    const q = qrcode(0, "M"); q.addData(texto); q.make();
    const n = q.getModuleCount(), m = 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
  }
  function descargar(nombre, href) { const a = document.createElement("a"); a.href = href; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }
  function abrirQR() {
    const url = urlSitio(), svg = qrSVG(url, "#1E2420");
    $("#qrCaja").innerHTML = svg;
    $("#qrUrl").textContent = url;
    $("#qrCompartir").hidden = !navigator.share;
    $("#qrCopiar").onclick = () => copiar(url);
    $("#qrSVG").onclick = () => descargar("qr-ugarte-city-gardens.svg", "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    $("#qrPNG").onclick = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = c.height = 1200;
        const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, 1200, 1200);
        descargar("qr-ugarte-city-gardens.png", c.toDataURL("image/png"));
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    };
    $("#qrCompartir").onclick = () => navigator.share({ title: S.datos.proyecto.nombre || "Ugarte City Gardens", url }).catch(() => {});
    $("#panelQR").showModal();
  }
  function copiar(t) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
      .then(() => avisar("Link copiado"), () => avisar(t, 6000));
  }

  // =========================================================
  // AVISOS
  // =========================================================
  let tAviso;
  function avisar(txt, ms = 3200) {
    const a = $("#aviso"); a.textContent = txt; a.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => (a.hidden = true), ms);
  }

  // =========================================================
  // INICIO DE LA APP
  // =========================================================
  function eventos() {
    $$(".diaNoche button").forEach(b => b.onclick = () => setModo(b.dataset.modo));
    $("#btnMenu").onclick = () => abrirMenu(true);
    $("#cerrarMenu").onclick = () => abrirMenu(false);
    $("#velo").onclick = () => abrirMenu(false);
    $("#btnQR").onclick = () => S.datos && abrirQR();
    $$(".menu-lista button").forEach(b => b.onclick = () => S.datos && abrirSeccion(b.dataset.seccion));
    $$("dialog").forEach(d => {
      d.addEventListener("click", e => {
        if (e.target === d || e.target.closest("[data-cerrar]") || e.target.closest("[data-cerrar-panel]")) d.close();
      });
    });
    $("#riel").addEventListener("click", e => { const b = e.target.closest("button"); if (b) elegirPiso(b.dataset.piso); });
    $("#filtros").addEventListener("click", e => {
      const b = e.target.closest("button[data-tipo]"); if (!b) return;
      S.tipo = b.dataset.tipo;
      $$("#filtros button").forEach(x => x.setAttribute("aria-pressed", x === b));
      aplicarFiltros();
    });
    $("#soloDisp").onchange = e => { S.soloDisp = e.target.checked; aplicarFiltros(); };
    $("#ficha").addEventListener("click", e => {
      if (e.target.closest(".cerrarFicha")) cerrarFicha();
      const tour = e.target.closest("[data-tour]"); if (tour) S.tour = tour.dataset.tour;
      if (e.target.closest("[data-copiar-unidad]") && S.unidad) copiar(`${urlSitio().replace(/#.*$/, "")}#unidad/${encodeURIComponent(S.unidad.codigo)}`);
      const r = e.target.closest("[data-render]");
      if (r) { $("#panelTitulo").textContent = `Unidad ${S.unidad.codigo}`; $("#panelCuerpo").innerHTML = `<img src="${esc(r.dataset.render)}" alt="" style="width:100%;border-radius:12px">`; $("#panel").showModal(); }
    });
    $("#recorridoSel").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) { S.tour = b.dataset.t; pintarRecorrido(); } });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if ($("#menu").classList.contains("abierto")) abrirMenu(false);
      else if (!$("#ficha").hidden && !$("dialog[open]")) cerrarFicha();
    });
    window.addEventListener("hashchange", ruta);
    initZoom();
  }

  async function iniciar() {
    setModo(leer("showroom-modo") === "noche" ? "noche" : "dia");
    eventos();
    ruta();
    S.datos = await Showroom.cargarDatos();
    pintarHero();
    pintarRiel();
    $("#menuPie").innerHTML = contactos();
    ruta();
    if (S.datos.origen !== "sheet") avisar("Mostrando datos guardados: la planilla no respondió.", 5000);
  }
  iniciar();
})();
