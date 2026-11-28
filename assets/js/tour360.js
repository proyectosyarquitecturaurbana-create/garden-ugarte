/* =========================================================
   Tour 360° propio · Ugarte City Gardens
   Motor sobre Pannellum 2.5.6 (MIT). Lee un JSON por tour
   (data/tours/<id>.json) y arma: escenas en cubo, puntos de
   paso sobre el piso con pulso, puntos de información,
   textos e imágenes en la escena, destello de sol, filtros
   por escena, límites de zoom y de inclinación, corrección
   de horizonte, transición acercar/fundido, orientación
   sincronizada al llegar, clic en cualquier lado, entrada
   desde arriba, autorrotación, tira de escenas, plano con
   cono de visión, giroscopio y pantalla completa.
   ========================================================= */
(function () {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const dist = (y1, p1, y2, p2) => { // distancia angular en grados
    const r = Math.PI / 180, a = Math.sin(p1 * r) * Math.sin(p2 * r) + Math.cos(p1 * r) * Math.cos(p2 * r) * Math.cos((y1 - y2) * r);
    return Math.acos(Math.min(1, Math.max(-1, a))) / r;
  };
  const norm = y => ((y + 540) % 360) - 180;

  const ICONOS = {
    flecha: '<svg viewBox="0 0 24 24"><path d="M12 5l6 7h-4v7h-4v-7H6z" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="1.6" fill="currentColor"/><path d="M12 11v7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    mas: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };

  function filtroCSS(f, idSvg) {
    if (!f) return "";
    const p = [];
    if (f.brillo != null) p.push(`brightness(${f.brillo})`);
    if (f.contraste != null) p.push(`contrast(${f.contraste})`);
    if (f.saturacion != null) p.push(`saturate(${f.saturacion})`);
    if (f.calidez) p.push(`sepia(${Math.min(1, f.calidez * 0.2)})`);
    if (f.nitidez) p.push(`url(#${idSvg})`);
    return p.join(" ");
  }

  async function crear(contenedor, origen, opciones = {}) {
    const T = typeof origen === "string" ? await fetch(origen, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error("No se encontró el tour"); return r.json(); }) : origen;
    const base = (opciones.base || T.base || "").replace(/\/?$/, "/");
    const ids = Object.keys(T.escenas);
    const inicio = T.inicio || ids[0];
    const uid = "t360-" + Math.random().toString(36).slice(2, 8);

    contenedor.classList.add("t360");
    contenedor.innerHTML = "";
    if (opciones.incrustado) contenedor.classList.add("t360-incrustado");
    const visor = el("div", "t360-visor"); visor.id = uid;
    contenedor.append(visor);

    // filtro de nitidez (SVG)
    const svg = el("div", "t360-defs", `<svg width="0" height="0" aria-hidden="true"><filter id="${uid}-n"><feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"/></filter></svg>`);
    contenedor.append(svg);

    // ---- puntos -> hotspots de Pannellum
    function hotspots(idEscena) {
      const esc_ = T.escenas[idEscena];
      const lista = (esc_.puntos || []).map((p, i) => ({
        pitch: p.pitch, yaw: p.yaw,
        cssClass: `t360-hs t360-${p.tipo || "paso"}`,
        scale: !!p.escalaConZoom,
        createTooltipFunc: dibujarPunto, createTooltipArgs: { p, i, idEscena },
        clickHandlerFunc: (ev, a) => alTocarPunto(a.p, ev), clickHandlerArgs: { p }
      }));
      if (esc_.sol) lista.push({ pitch: esc_.sol.pitch, yaw: esc_.sol.yaw, cssClass: "t360-hs t360-sol", createTooltipFunc: div => { div.style.setProperty("--i", esc_.sol.intensidad ?? 0.8); div.setAttribute("aria-hidden", "true"); } });
      return lista;
    }

    function dibujarPunto(div, { p }) {
      const tipo = p.tipo || "paso";
      const t = p.tamano ?? 1;
      div.style.setProperty("--t", t);
      div.style.setProperty("--o", p.opacidad ?? 1);
      if (p.color) div.style.setProperty("--c", p.color);
      if (p.fondo) div.style.setProperty("--f", p.fondo);
      if (p.pulso !== false && (tipo === "paso" || tipo === "info")) div.classList.add("pulso");
      if (p.soloAlPasar) div.classList.add("solo-al-pasar");
      if (tipo === "paso") {
        const piso = (p.estilo || "piso") === "piso";
        // cuanto más cerca del horizonte está el punto, más "acostado" se ve el anillo
        const inclin = piso ? Math.max(0, Math.min(62, 90 - Math.abs(p.pitch) * 1.2)) : 0;
        div.style.setProperty("--incl", inclin + "deg");
        div.classList.toggle("en-piso", piso);
        div.innerHTML = `<span class="t360-anillo"><span class="t360-flecha">${ICONOS.flecha}</span></span>${p.texto ? `<span class="t360-rotulo">${esc(p.texto)}</span>` : ""}`;
        div.setAttribute("role", "button"); div.tabIndex = 0;
        div.setAttribute("aria-label", "Ir a " + (p.texto || T.escenas[p.destino]?.titulo || p.destino));
        if (p.direccion != null) div.querySelector(".t360-flecha").style.transform = `rotate(${p.direccion}deg)`;
      } else if (tipo === "info") {
        div.innerHTML = `<span class="t360-punto">${ICONOS[p.icono] || ICONOS.info}</span><span class="t360-globo">${p.titulo ? `<b>${esc(p.titulo)}</b>` : ""}${p.texto ? `<span>${esc(p.texto)}</span>` : ""}</span>`;
        div.tabIndex = 0; div.setAttribute("aria-label", p.titulo || p.texto || "Información");
        if (p.lado) div.classList.add("globo-" + p.lado);
      } else if (tipo === "texto") {
        div.innerHTML = `<span class="t360-cartel">${esc(p.texto)}</span>`;
        if (p.rotacion) div.firstChild.style.transform = `rotate(${p.rotacion}deg)`;
      } else if (tipo === "imagen") {
        div.innerHTML = `<img src="${esc(base + p.src)}" alt="${esc(p.alt || "")}" style="width:${(p.ancho || 140)}px">`;
      }
      div.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alTocarPunto(p, e); } });
    }

    function alTocarPunto(p, ev) {
      if ((p.tipo || "paso") === "paso") ir(p.destino, p);
      else if (p.tipo === "info") ev?.currentTarget?.classList?.toggle("abierto");
    }

    // ---- configuración de Pannellum
    const escenas = {};
    ids.forEach(id => {
      const e = T.escenas[id], carpeta = base + (e.carpeta || `${id}/`);
      escenas[id] = {
        title: e.titulo || id,
        type: e.equirect ? "equirectangular" : "cubemap",
        ...(e.equirect ? { panorama: base + e.equirect } : { cubeMap: ["f", "r", "b", "l", "u", "d"].map(c => `${carpeta}${c}.jpg`) }),
        yaw: e.yaw ?? 0, pitch: e.pitch ?? 0, hfov: e.hfov ?? 100,
        minHfov: e.zoom?.min ?? 45, maxHfov: e.zoom?.max ?? 115,
        minPitch: e.inclinacion?.min ?? -85, maxPitch: e.inclinacion?.max ?? 85,
        northOffset: e.norte ?? 0,
        horizonPitch: e.horizonte?.pitch ?? 0, horizonRoll: e.horizonte?.roll ?? 0,
        hotSpots: hotspots(id)
      };
    });
    const intro = T.entrada !== false && opciones.entrada !== false;
    const ini = escenas[inicio];
    const destinoIntro = { pitch: ini.pitch, yaw: ini.yaw, hfov: ini.hfov };
    if (intro) { ini.pitch = Math.max(ini.minPitch, -80); ini.hfov = Math.min(120, ini.maxHfov + 5); ini.maxHfov = Math.max(ini.maxHfov, ini.hfov); }

    const viewer = pannellum.viewer(uid, {
      default: {
        firstScene: inicio, sceneFadeDuration: T.duracion ?? 900, autoLoad: true,
        showControls: false, showZoomCtrl: false, showFullscreenCtrl: false, compass: false,
        autoRotate: T.autorrotar ?? -1.5, autoRotateInactivityDelay: T.esperaRotar ?? 7000, autoRotateStopDelay: undefined,
        mouseZoom: true, keyboardZoom: true, friction: 0.15, hfov: 100,
        strings: { loadButtonLabel: "Tocá para cargar", loadingLabel: "Cargando…", bylineLabel: "", noPanoramaError: "Falta la imagen de esta escena.", fileAccessError: "No se pudo abrir %s.", malformedURLError: "La dirección de la imagen no es válida.", iOS8WebGLError: "Este navegador no puede mostrar la vista 360°.", genericWebGLError: "Este dispositivo no puede mostrar la vista 360°.", textureSizeError: "La imagen es demasiado grande para este dispositivo (%s px; máximo %s px).", unknownError: "Ocurrió un error al cargar." }
      },
      scenes: escenas
    });

    // ---- interfaz propia
    const ui = el("div", "t360-ui");
    ui.innerHTML = `
      <div class="t360-cab"><span class="t360-titulo"></span></div>
      <div class="t360-ctrl">
        <button class="t360-b" data-a="rotar" aria-pressed="true" aria-label="Girar solo" title="Girar solo"><svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="t360-b" data-a="giro" hidden aria-pressed="false" aria-label="Mover con el celular" title="Mover con el celular"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 9c-1 2-1 4 0 6M21 9c1 2 1 4 0 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
        <button class="t360-b" data-a="mas" aria-label="Acercar"><svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="t360-b" data-a="menos" aria-label="Alejar"><svg viewBox="0 0 24 24"><path d="M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
        <button class="t360-b" data-a="pantalla" aria-label="Pantalla completa"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>
      <div class="t360-tira" role="tablist" aria-label="Ambientes"></div>
      <div class="t360-ayuda">Arrastrá para mirar · tocá los círculos para avanzar</div>`;
    contenedor.append(ui);
    const $ = s => ui.querySelector(s);
    const tira = $(".t360-tira");
    if (ids.length > 1 && T.tira !== false) {
      tira.innerHTML = ids.map(id => `<button role="tab" data-e="${esc(id)}"><img src="${esc(base + (T.escenas[id].carpeta || id + "/") + "mini.jpg")}" alt="" loading="lazy" onerror="this.remove()"><span>${esc(T.escenas[id].titulo || id)}</span></button>`).join("");
      tira.addEventListener("click", e => { const b = e.target.closest("button[data-e]"); if (b) ir(b.dataset.e, null, "fundido"); });
    } else tira.remove();

    // plano con cono de visión
    let plano = null;
    if (T.plano?.imagen) {
      plano = el("div", "t360-plano");
      plano.innerHTML = `<img src="${esc(base + T.plano.imagen)}" alt="Plano">` + ids.filter(id => T.escenas[id].mapa).map(id => {
        const m = T.escenas[id].mapa; return `<button class="t360-pp" data-e="${esc(id)}" style="left:${m.x}%;top:${m.y}%" aria-label="${esc(T.escenas[id].titulo || id)}"><i class="t360-cono"></i></button>`;
      }).join("");
      plano.addEventListener("click", e => { const b = e.target.closest("[data-e]"); if (b) ir(b.dataset.e, null, "fundido"); });
      ui.append(plano);
    }

    ui.addEventListener("click", e => {
      const b = e.target.closest(".t360-b"); if (!b) return;
      const a = b.dataset.a;
      if (a === "mas") viewer.setHfov(viewer.getHfov() - 15);
      if (a === "menos") viewer.setHfov(viewer.getHfov() + 15);
      if (a === "pantalla") { try { viewer.toggleFullscreen(); } catch (_) { } }
      if (a === "rotar") { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); on ? viewer.startAutoRotate(T.autorrotar ?? -1.5) : viewer.stopAutoRotate(); }
      if (a === "giro") { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); on ? viewer.startOrientation() : viewer.stopOrientation(); }
    });
    viewer.on("load", () => { try { if (viewer.isOrientationSupported()) $('[data-a="giro"]').hidden = false; } catch (_) { } });

    // ---- navegación
    let ocupado = false;
    function ir(destino, p, modo) {
      if (!T.escenas[destino] || ocupado || destino === viewer.getScene()) return;
      const actual = T.escenas[viewer.getScene()], dest = T.escenas[destino];
      let yaw = "same";
      if (p?.llegada?.yaw != null) yaw = p.llegada.yaw;
      else if (actual.norte != null && dest.norte != null) yaw = norm(viewer.getYaw() + actual.norte - dest.norte); // orientación sincronizada
      const pitch = p?.llegada?.pitch ?? dest.pitch ?? 0;
      const hfov = p?.llegada?.hfov ?? dest.hfov ?? 100;
      const cargar = () => { viewer.loadScene(destino, pitch, yaw, hfov); };
      modo = modo || p?.transicion || T.transicion || "acercar";
      if (modo === "acercar" && p) {
        ocupado = true;
        const hf = Math.max(viewer.getHfov() * 0.55, escenas[viewer.getScene()].minHfov);
        viewer.lookAt(Math.max(-35, Math.min(10, p.pitch + 12)), p.yaw, hf, 650, () => { ocupado = false; cargar(); });
      } else cargar();
    }

    // clic en cualquier lado: avanza hacia el punto de paso más cercano a donde tocaste
    if (T.clicEnCualquierLado !== false) {
      let d0 = null;
      visor.addEventListener("pointerdown", e => { d0 = { x: e.clientX, y: e.clientY, t: Date.now() }; });
      visor.addEventListener("pointerup", e => {
        if (!d0 || e.target.closest(".t360-hs")) return;
        const mov = Math.hypot(e.clientX - d0.x, e.clientY - d0.y), dt = Date.now() - d0.t; d0 = null;
        if (mov > 6 || dt > 350) return;
        let c; try { c = viewer.mouseEventToCoords(e); } catch (_) { return; }
        const pasos = (T.escenas[viewer.getScene()].puntos || []).filter(p => (p.tipo || "paso") === "paso");
        let mejor = null, md = 1e9;
        pasos.forEach(p => { const d = Math.abs(norm(p.yaw - c[1])); if (d < md) { md = d; mejor = p; } });
        if (mejor && md < (T.radioClic ?? 30)) ir(mejor.destino, mejor);
      });
    }

    // ---- al cambiar de escena: título, filtros, tira, plano
    function alCambiar() {
      const id = viewer.getScene(), e = T.escenas[id];
      $(".t360-titulo").textContent = e.titulo || id;
      const canvas = visor.querySelector(".pnlm-render-container");
      if (canvas) canvas.style.filter = filtroCSS(e.filtro, uid + "-n");
      tira.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", b.dataset.e === id));
      plano?.querySelectorAll(".t360-pp").forEach(b => b.classList.toggle("activo", b.dataset.e === id));
      contenedor.dispatchEvent(new CustomEvent("t360:escena", { detail: { id } }));
    }
    viewer.on("scenechange", alCambiar);
    let primera = true;
    viewer.on("load", () => {
      alCambiar();
      if (primera && intro) { primera = false; viewer.lookAt(destinoIntro.pitch, destinoIntro.yaw, destinoIntro.hfov, T.duracionEntrada ?? 2200); }
      primera = false;
    });

    // cono de visión del plano
    if (plano) (function bucle() {
      if (!contenedor.isConnected) return;
      const id = viewer.getScene(), act = plano.querySelector(".t360-pp.activo .t360-cono");
      if (act) { const e = T.escenas[id]; act.style.transform = `rotate(${viewer.getYaw() + (e.norte ?? 0) + (T.plano.giro ?? 0)}deg)`; act.style.setProperty("--a", viewer.getHfov() + "deg"); }
      requestAnimationFrame(bucle);
    })();

    // ayuda: se va al primer movimiento
    const ayuda = $(".t360-ayuda");
    visor.addEventListener("pointerdown", () => ayuda.classList.add("oculta"), { once: true });

    return { viewer, ir, destruir: () => { viewer.destroy(); contenedor.innerHTML = ""; } };
  }

  window.Tour360 = { crear };
})();
