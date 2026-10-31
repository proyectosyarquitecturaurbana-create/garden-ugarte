import { CONFIG } from './config.js';
import {
  modoDemo, obtenerUnidades, escucharUnidades, enviarPropuesta, ordenarUnidades,
  formatoPrecio, formatoPiso, formatoM2, escaparHtml,
} from './db.js';

const ESTADOS = { disponible: 'Disponible', reservada: 'Reservada', vendida: 'Vendida' };

let unidades = [];
const $ = (sel) => document.querySelector(sel);

// ---------- Menú móvil ----------
const botonMenu = $('.barra__menu');
botonMenu.addEventListener('click', () => {
  const abierto = document.body.classList.toggle('menu-abierto');
  botonMenu.setAttribute('aria-expanded', abierto);
});
document.querySelectorAll('.barra__nav a').forEach((a) =>
  a.addEventListener('click', () => {
    document.body.classList.remove('menu-abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
  }));

// ---------- Datos de contacto ----------
$('#direccion').textContent = CONFIG.direccion;
if (CONFIG.mapaUrl) {
  $('#mapa').innerHTML = `<iframe src="${escaparHtml(CONFIG.mapaUrl)}" loading="lazy" title="Mapa de ubicación" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}
const directo = [];
if (CONFIG.whatsapp) {
  const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola, quiero información sobre Garden Ugarte.')}`;
  directo.push(`WhatsApp: <a href="${wa}" target="_blank" rel="noopener">+${escaparHtml(CONFIG.whatsapp)}</a>`);
  const flotante = $('#whatsapp');
  flotante.href = wa;
  flotante.hidden = false;
}
if (CONFIG.email) {
  directo.push(`Email: <a href="mailto:${escaparHtml(CONFIG.email)}">${escaparHtml(CONFIG.email)}</a>`);
}
$('#contacto-directo').innerHTML = directo.join('<br>');

// ---------- Disponibilidad ----------
function filtradas() {
  const tipo = $('#filtro-tipo').value;
  const estado = $('#filtro-estado').value;
  const piso = $('#filtro-piso').value;
  return unidades.filter((u) =>
    (!tipo || u.tipo === tipo) &&
    (!estado || u.estado === estado) &&
    (piso === '' || String(u.piso) === piso));
}

function pintarTabla(resaltar) {
  const cuerpo = $('#tabla-unidades tbody');
  const lista = filtradas();
  if (!lista.length) {
    cuerpo.innerHTML = '<tr><td colspan="10" class="tabla__vacio">No hay unidades con esos filtros.</td></tr>';
    return;
  }
  cuerpo.innerHTML = lista.map((u) => `
    <tr data-codigo="${escaparHtml(u.codigo)}" class="${u.codigo === resaltar ? 'fila--nueva' : ''}">
      <td data-titulo="Unidad"><strong>${escaparHtml(u.codigo)}</strong></td>
      <td data-titulo="Piso">${formatoPiso(u.piso)}</td>
      <td data-titulo="Tipo">${escaparHtml(u.tipo)}</td>
      <td data-titulo="Ambientes">${u.ambientes ?? '–'}</td>
      <td data-titulo="Sup. cubierta">${formatoM2(u.superficie_cubierta)}</td>
      <td data-titulo="Sup. total">${formatoM2(u.superficie_total)}</td>
      <td data-titulo="Orientación">${escaparHtml(u.orientacion || '–')}</td>
      <td data-titulo="Precio">${u.estado === 'vendida' ? '–' : formatoPrecio(u.precio_usd)}</td>
      <td data-titulo="Estado"><span class="estado estado--${u.estado}">${ESTADOS[u.estado] || u.estado}</span></td>
      <td>${u.estado === 'vendida' ? '' : `<a href="#contacto" class="enlace" data-consultar="${escaparHtml(u.codigo)}">Consultar</a>`}</td>
    </tr>`).join('');
}

function pintarCifras() {
  const cuenta = { total: unidades.length, disponible: 0, reservada: 0, vendida: 0 };
  unidades.forEach((u) => { cuenta[u.estado] = (cuenta[u.estado] || 0) + 1; });
  document.querySelectorAll('[data-cifra]').forEach((el) => { el.textContent = cuenta[el.dataset.cifra] ?? 0; });
}

function pintarOpciones() {
  const pisoSel = $('#filtro-piso');
  const pisoActual = pisoSel.value;
  const pisos = [...new Set(unidades.map((u) => u.piso))].sort((a, b) => a - b);
  pisoSel.innerHTML = '<option value="">Todos</option>' +
    pisos.map((p) => `<option value="${p}">${p === 0 ? 'Planta baja' : `Piso ${p}`}</option>`).join('');
  pisoSel.value = pisos.map(String).includes(pisoActual) ? pisoActual : '';

  const uniSel = $('#form-unidad');
  const uniActual = uniSel.value;
  const abiertas = unidades.filter((u) => u.estado !== 'vendida');
  uniSel.innerHTML = '<option value="">Ninguna en particular</option>' +
    abiertas.map((u) => `<option value="${escaparHtml(u.codigo)}">${escaparHtml(u.codigo)} · ${escaparHtml(u.tipo)}</option>`).join('');
  uniSel.value = abiertas.some((u) => u.codigo === uniActual) ? uniActual : '';
}

function pintarTodo(resaltar) {
  pintarCifras();
  pintarOpciones();
  pintarTabla(resaltar);
}

['#filtro-tipo', '#filtro-estado', '#filtro-piso'].forEach((s) =>
  $(s).addEventListener('change', () => pintarTabla()));

$('#tabla-unidades').addEventListener('click', (e) => {
  const enlace = e.target.closest('[data-consultar]');
  if (!enlace) return;
  $('#form-unidad').value = enlace.dataset.consultar;
  $('#form-propuesta [name="tipo"]').value = 'consulta';
});

async function iniciarDisponibilidad() {
  $('#aviso-demo').hidden = !modoDemo;
  try {
    unidades = await obtenerUnidades();
    pintarTodo();
  } catch (err) {
    console.error(err);
    $('#tabla-unidades tbody').innerHTML =
      '<tr><td colspan="10" class="tabla__vacio">No pudimos cargar las unidades. Probá recargar la página.</td></tr>';
    return;
  }

  escucharUnidades((evento, u) => {
    if (evento === 'DELETE') {
      unidades = unidades.filter((x) => x.id !== u.id);
    } else {
      unidades = ordenarUnidades([...unidades.filter((x) => x.id !== u.id), u]);
    }
    pintarTodo(evento === 'DELETE' ? null : u.codigo);
  }, (estado) => {
    $('#en-vivo').hidden = estado !== 'SUBSCRIBED';
  });
}

// ---------- Formulario de propuestas ----------
const form = $('#form-propuesta');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const estado = $('#form-estado');
  estado.className = 'formulario__estado';

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const datos = Object.fromEntries(new FormData(form));
  if (datos.sitio_web) return; // bot
  if (!datos.email && !datos.telefono) {
    estado.textContent = 'Dejanos un email o un teléfono para poder responderte.';
    estado.classList.add('formulario__estado--error');
    return;
  }

  const boton = form.querySelector('button[type="submit"]');
  boton.disabled = true;
  estado.textContent = 'Enviando…';
  try {
    const r = await enviarPropuesta({
      nombre: datos.nombre.trim(),
      email: datos.email.trim() || null,
      telefono: datos.telefono.trim() || null,
      tipo: datos.tipo,
      unidad: datos.unidad || null,
      mensaje: datos.mensaje.trim(),
    });
    form.reset();
    estado.textContent = r.demo
      ? 'Modo demostración: el mensaje no se guardó porque la base de datos todavía no está conectada.'
      : '¡Gracias! Recibimos tu mensaje y te vamos a contactar pronto.';
    estado.classList.add('formulario__estado--ok');
  } catch (err) {
    console.error(err);
    estado.textContent = 'No pudimos enviar el mensaje. Probá de nuevo en unos minutos.';
    estado.classList.add('formulario__estado--error');
  } finally {
    boton.disabled = false;
  }
});

iniciarDisponibilidad();
