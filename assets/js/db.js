// Acceso a datos: Supabase si está configurado, datos de ejemplo si no.

import { CONFIG } from './config.js';
import { UNIDADES_DEMO } from './demo.js';

export const modoDemo = !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey;

let clientePromesa = null;

export function cliente() {
  if (modoDemo) return Promise.resolve(null);
  if (!clientePromesa) {
    clientePromesa = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
      .then(({ createClient }) => createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey));
  }
  return clientePromesa;
}

export function ordenarUnidades(lista) {
  return [...lista].sort((a, b) => a.piso - b.piso || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
}

export async function obtenerUnidades() {
  const sb = await cliente();
  if (!sb) return ordenarUnidades(UNIDADES_DEMO);
  const { data, error } = await sb.from('unidades').select('*');
  if (error) throw error;
  return ordenarUnidades(data);
}

// Llama a alCambiar(evento, unidad) cada vez que se inserta, edita o borra
// una unidad. Devuelve una función para dejar de escuchar.
export async function escucharUnidades(alCambiar, alEstado) {
  const sb = await cliente();
  if (!sb) return () => {};
  const canal = sb
    .channel('unidades-publicas')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, (p) => {
      alCambiar(p.eventType, p.eventType === 'DELETE' ? p.old : p.new);
    })
    .subscribe((estado) => alEstado && alEstado(estado));
  return () => sb.removeChannel(canal);
}

export async function enviarPropuesta(propuesta) {
  const sb = await cliente();
  if (!sb) {
    await new Promise((r) => setTimeout(r, 400));
    return { demo: true };
  }
  const { error } = await sb.from('propuestas').insert(propuesta);
  if (error) throw error;
  return { demo: false };
}

export function formatoPrecio(valor) {
  if (valor == null) return 'Consultar';
  return 'USD ' + Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export function formatoPiso(piso) {
  return piso === 0 ? 'PB' : `${piso}°`;
}

export function formatoM2(valor) {
  if (valor == null) return '–';
  return Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' m²';
}

export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
