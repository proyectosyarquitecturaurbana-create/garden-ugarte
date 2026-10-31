import {
  modoDemo, cliente, ordenarUnidades, formatoPiso, formatoM2, escaparHtml,
} from './db.js';
import { UNIDADES_DEMO } from './demo.js';

const $ = (sel) => document.querySelector(sel);
const ESTADOS = { disponible: 'Disponible', reservada: 'Reservada', vendida: 'Vendida' };
const TIPOS_MSJ = { consulta: 'Consulta', propuesta: 'Propuesta', opinion: 'Opinión' };

let unidades = [];
let propuestas = [];
let canales = [];
let editando = null; // unidad abierta en el diálogo, o null si es nueva

// ---------------------------------------------------------------
// Acceso a datos: Supabase, o memoria en modo demostración
// ---------------------------------------------------------------
const PROPUESTAS_DEMO = [
  { id: 2, creado: new Date().toISOString(), nombre: 'María Gómez', email: 'maria@ejemplo.com', telefono: null, tipo: 'consulta', unidad: '1A', mensaje: '¿El 1A tiene cochera? ¿Aceptan financiación en pesos?', leido: false },
  { id: 1, creado: new Date(Date.now() - 864e5).toISOString(), nombre: 'Juan Pérez', email: null, telefono: '+54 9 11 5555-5555', tipo: 'opinion', unidad: null, mensaje: 'Muy lindo el proyecto, me gustaría ver más fotos del jardín.', leido: true },
];

const api = {
  async unidades() {
    const sb = await cliente();
    if (!sb) return ordenarUnidades(UNIDADES_DEMO.map((u) => ({ ...u, actualizado: new Date().toISOString() })));
    const { data, error } = await sb.from('unidades').select('*');
    if (error) throw error;
    return ordenarUnidades(data);
  },
  async guardarUnidad(id, cambios) {
    const sb = await cliente();
    if (!sb) return { ...(unidades.find((u) => u.id === id) || { id: `demo-${Date.now()}` }), ...cambios, actualizado: new Date().toISOString() };
    const consulta = id
      ? sb.from('unidades').update(cambios).eq('id', id)
      : sb.from('unidades').insert(cambios);
    const { data, error } = await consulta.select().single();
    if (error) throw error;
    return data;
  },
  async borrarUnidad(id) {
    const sb = await cliente();
    if (!sb) return;
    const { error } = await sb.from('unidades').delete().eq('id', id);
    if (error) throw error;
  },
  async propuestas() {
    const sb = await cliente();
    if (!sb) return PROPUESTAS_DEMO.map((p) => ({ ...p }));
    const { data, error } = await sb.from('propuestas').select('*').order('creado', { ascending: false });
    if (error) throw error;
    return data;
  },
  async marcarLeido(id, leido) {
    const sb = await cliente();
    if (!sb) return;
    const { error } = await sb.from('propuestas').update({ leido }).eq('id', id);
    if (error) throw error;
  },
  async borrarPropuesta(id) {
    const sb = await cliente();
    if (!sb) return;
    const { error } = await sb.from('propuestas').delete().eq('id', id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------
async function iniciar() {
  $('#aviso-demo').hidden = !modoDemo;
  if (modoDemo) return mostrarPanel('demostración');

  const sb = await cliente();
  const { data: { session } } = await sb.auth.getSession();
  if (session) mostrarPanel(session.user.email);
  else mostrarLogin();

  sb.auth.onAuthStateChange((evento, s) => {
    if (evento === 'SIGNED_OUT') mostrarLogin();
    else if (evento === 'SIGNED_IN' && $('#vista-panel').hidden) mostrarPanel(s.user.email);
  });
}

function mostrarLogin() {
  canales.forEach((c) => c());
  canales = [];
  $('#vista-login').hidden = false;
  $('#vista-panel').hidden = true;
  $('#sesion').hidden = true;
}

async function mostrarPanel(email) {
  $('#vista-login').hidden = true;
  $('#vista-panel').hidden = false;
  $('#sesion').hidden = modoDemo;
  $('#sesion-email').textContent = email;
  await Promise.all([cargarUnidades(), cargarPropuestas()]);
  escuchar();
}

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const estado = $('#login-estado');
  const { email, password } = Object.fromEntries(new FormData(e.target));
  estado.className = 'formulario__estado';
  estado.textContent = 'Ingresando…';
  const sb = await cliente();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    estado.textContent = 'Email o contraseña incorrectos.';
    estado.classList.add('formulario__estado--error');
  } else {
    estado.textContent = '';
  }
});

$('#salir').addEventListener('click', async () => {
  const sb = await cliente();
  await sb.auth.signOut();
});

async function escuchar() {
  const sb = await cliente();
  if (!sb || canales.length) return;
  const canal = sb.channel('panel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, (p) => {
      const u = p.eventType === 'DELETE' ? p.old : p.new;
      unidades = unidades.filter((x) => x.id !== u.id);
      if (p.eventType !== 'DELETE') unidades = ordenarUnidades([...unidades, u]);
      pintarUnidades();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'propuestas' }, (p) => {
      const m = p.eventType === 'DELETE' ? p.old : p.new;
      propuestas = propuestas.filter((x) => x.id !== m.id);
      if (p.eventType !== 'DELETE') {
        propuestas = [...propuestas, m].sort((a, b) => b.creado.localeCompare(a.creado));
      }
      pintarBandeja();
    })
    .subscribe();
  canales.push(() => sb.removeChannel(canal));
}

// ---------------------------------------------------------------
// Pestañas
// ---------------------------------------------------------------
document.querySelectorAll('[data-pestana]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-pestana]').forEach((x) => {
    x.classList.toggle('activa', x === b);
    x.setAttribute('aria-selected', x === b);
  });
  $('#pestana-unidades').hidden = b.dataset.pestana !== 'unidades';
  $('#pestana-bandeja').hidden = b.dataset.pestana !== 'bandeja';
}));

// ---------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------
async function cargarUnidades() {
  try {
    unidades = await api.unidades();
    pintarUnidades();
  } catch (err) {
    console.error(err);
    $('#tabla-admin tbody').innerHTML = '<tr><td colspan="8" class="tabla__vacio">Error al cargar las unidades.</td></tr>';
  }
}

function fecha(iso) {
  return iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '–';
}

function pintarUnidades() {
  const cuerpo = $('#tabla-admin tbody');
  if (!unidades.length) {
    cuerpo.innerHTML = '<tr><td colspan="8" class="tabla__vacio">Todavía no hay unidades cargadas.</td></tr>';
    return;
  }
  cuerpo.innerHTML = unidades.map((u) => `
    <tr data-id="${escaparHtml(u.id)}">
      <td data-titulo="Unidad"><strong>${escaparHtml(u.codigo)}</strong></td>
      <td data-titulo="Piso">${formatoPiso(u.piso)}</td>
      <td data-titulo="Tipo">${escaparHtml(u.tipo)}</td>
      <td data-titulo="Sup. total">${formatoM2(u.superficie_total)}</td>
      <td data-titulo="Precio USD">${u.precio_usd == null ? '–' : Number(u.precio_usd).toLocaleString('es-AR')}</td>
      <td data-titulo="Estado">
        <select class="selector-estado estado--${u.estado}" data-cambiar-estado aria-label="Estado de ${escaparHtml(u.codigo)}">
          ${Object.entries(ESTADOS).map(([v, t]) => `<option value="${v}" ${u.estado === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td data-titulo="Actualizado" class="tenue">${fecha(u.actualizado)}</td>
      <td><button class="enlace" data-editar>Editar</button></td>
    </tr>`).join('');
}

$('#tabla-admin').addEventListener('change', async (e) => {
  if (!e.target.matches('[data-cambiar-estado]')) return;
  const id = e.target.closest('tr').dataset.id;
  const anterior = unidades.find((u) => u.id === id);
  e.target.disabled = true;
  try {
    const nueva = await api.guardarUnidad(id, { estado: e.target.value });
    unidades = unidades.map((u) => (u.id === id ? nueva : u));
  } catch (err) {
    console.error(err);
    alert('No se pudo cambiar el estado. ¿Tu usuario está autorizado como administrador?');
    unidades = unidades.map((u) => (u.id === id ? anterior : u));
  }
  pintarUnidades();
});

$('#tabla-admin').addEventListener('click', (e) => {
  if (!e.target.matches('[data-editar]')) return;
  abrirEditor(unidades.find((u) => u.id === e.target.closest('tr').dataset.id));
});

$('#nueva-unidad').addEventListener('click', () => abrirEditor(null));

const dialogo = $('#dialogo-unidad');
const formUnidad = $('#form-unidad');

function abrirEditor(u) {
  editando = u;
  formUnidad.reset();
  $('#unidad-estado').textContent = '';
  $('#dialogo-titulo').textContent = u ? `Editar unidad ${u.codigo}` : 'Nueva unidad';
  $('#borrar-unidad').hidden = !u;
  if (u) {
    for (const el of formUnidad.elements) {
      if (el.name && el.name in u) el.value = u[el.name] ?? '';
    }
  }
  dialogo.showModal();
}

$('#cancelar-unidad').addEventListener('click', () => dialogo.close());

formUnidad.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!formUnidad.reportValidity()) return;
  const d = Object.fromEntries(new FormData(formUnidad));
  const numero = (v) => (v === '' ? null : Number(v));
  const texto = (v) => (v.trim() === '' ? null : v.trim());
  const cambios = {
    codigo: d.codigo.trim().toUpperCase(),
    piso: Number(d.piso),
    tipo: d.tipo,
    ambientes: numero(d.ambientes),
    superficie_cubierta: numero(d.superficie_cubierta),
    superficie_total: numero(d.superficie_total),
    orientacion: texto(d.orientacion),
    precio_usd: numero(d.precio_usd),
    estado: d.estado,
    plano_url: texto(d.plano_url),
    notas: texto(d.notas),
  };
  const estado = $('#unidad-estado');
  estado.className = 'formulario__estado';
  estado.textContent = 'Guardando…';
  try {
    const guardada = await api.guardarUnidad(editando?.id, cambios);
    unidades = ordenarUnidades([...unidades.filter((u) => u.id !== guardada.id), guardada]);
    pintarUnidades();
    dialogo.close();
  } catch (err) {
    console.error(err);
    estado.textContent = err.code === '23505'
      ? 'Ya existe una unidad con ese código.'
      : 'No se pudo guardar. Revisá los datos e intentá de nuevo.';
    estado.classList.add('formulario__estado--error');
  }
});

$('#borrar-unidad').addEventListener('click', async () => {
  if (!editando || !confirm(`¿Borrar la unidad ${editando.codigo}? Esta acción no se puede deshacer.`)) return;
  try {
    await api.borrarUnidad(editando.id);
    unidades = unidades.filter((u) => u.id !== editando.id);
    pintarUnidades();
    dialogo.close();
  } catch (err) {
    console.error(err);
    $('#unidad-estado').textContent = 'No se pudo borrar la unidad.';
  }
});

// ---------------------------------------------------------------
// Bandeja de propuestas
// ---------------------------------------------------------------
async function cargarPropuestas() {
  try {
    propuestas = await api.propuestas();
    pintarBandeja();
  } catch (err) {
    console.error(err);
    $('#bandeja').innerHTML = '<li class="tabla__vacio">Error al cargar la bandeja.</li>';
  }
}

function propuestasFiltradas() {
  const f = $('#filtro-bandeja').value;
  if (f === 'todos') return propuestas;
  if (f === 'no-leidos') return propuestas.filter((p) => !p.leido);
  return propuestas.filter((p) => p.tipo === f);
}

function pintarBandeja() {
  const noLeidos = propuestas.filter((p) => !p.leido).length;
  const contador = $('#contador-no-leidos');
  contador.hidden = !noLeidos;
  contador.textContent = noLeidos;

  const lista = propuestasFiltradas();
  if (!lista.length) {
    $('#bandeja').innerHTML = '<li class="tabla__vacio">No hay mensajes.</li>';
    return;
  }
  $('#bandeja').innerHTML = lista.map((p) => {
    const contacto = [
      p.email && `<a href="mailto:${escaparHtml(p.email)}">${escaparHtml(p.email)}</a>`,
      p.telefono && `<a href="tel:${escaparHtml(p.telefono)}">${escaparHtml(p.telefono)}</a>`,
    ].filter(Boolean).join(' · ');
    return `
    <li class="mensaje ${p.leido ? '' : 'mensaje--nuevo'}" data-id="${p.id}">
      <div class="mensaje__cabecera">
        <strong>${escaparHtml(p.nombre)}</strong>
        <span class="etiqueta">${TIPOS_MSJ[p.tipo] || escaparHtml(p.tipo)}</span>
        ${p.unidad ? `<span class="etiqueta etiqueta--unidad">Unidad ${escaparHtml(p.unidad)}</span>` : ''}
        <span class="tenue">${fecha(p.creado)}</span>
      </div>
      <p class="mensaje__texto">${escaparHtml(p.mensaje)}</p>
      <div class="mensaje__pie">
        <span>${contacto}</span>
        <span>
          <button class="enlace" data-leido>${p.leido ? 'Marcar como no leído' : 'Marcar como leído'}</button>
          <button class="enlace enlace--peligro" data-borrar>Borrar</button>
        </span>
      </div>
    </li>`;
  }).join('');
}

$('#filtro-bandeja').addEventListener('change', pintarBandeja);

$('#bandeja').addEventListener('click', async (e) => {
  const item = e.target.closest('[data-id]');
  if (!item) return;
  const id = Number(item.dataset.id);
  const p = propuestas.find((x) => x.id === id);
  try {
    if (e.target.matches('[data-leido]')) {
      await api.marcarLeido(id, !p.leido);
      p.leido = !p.leido;
    } else if (e.target.matches('[data-borrar]')) {
      if (!confirm(`¿Borrar el mensaje de ${p.nombre}?`)) return;
      await api.borrarPropuesta(id);
      propuestas = propuestas.filter((x) => x.id !== id);
    } else {
      return;
    }
    pintarBandeja();
  } catch (err) {
    console.error(err);
    alert('No se pudo completar la acción.');
  }
});

$('#exportar').addEventListener('click', () => {
  const columnas = ['creado', 'nombre', 'email', 'telefono', 'tipo', 'unidad', 'mensaje', 'leido'];
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [columnas.join(','), ...propuestas.map((p) => columnas.map((c) => celda(p[c])).join(','))].join('\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `propuestas-garden-ugarte-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
});

iniciar();
