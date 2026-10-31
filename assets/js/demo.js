// Unidades de ejemplo para el modo demostración (sin base de datos).
// Son las mismas que carga supabase/schema.sql.

export const UNIDADES_DEMO = [
  { codigo: 'PB-L1', piso: 0, tipo: 'local comercial', ambientes: 1, superficie_cubierta: 48, superficie_total: 48, orientacion: 'Frente', precio_usd: null, estado: 'disponible' },
  { codigo: '1A', piso: 1, tipo: '2 dormitorios', ambientes: 3, superficie_cubierta: 62, superficie_total: 70.5, orientacion: 'Frente', precio_usd: null, estado: 'disponible' },
  { codigo: '1B', piso: 1, tipo: '1 dormitorio', ambientes: 2, superficie_cubierta: 41, superficie_total: 46, orientacion: 'Contrafrente', precio_usd: null, estado: 'reservada' },
  { codigo: '1C', piso: 1, tipo: 'monoambiente', ambientes: 1, superficie_cubierta: 30, superficie_total: 33, orientacion: 'Contrafrente', precio_usd: null, estado: 'disponible' },
  { codigo: '2A', piso: 2, tipo: '2 dormitorios', ambientes: 3, superficie_cubierta: 62, superficie_total: 70.5, orientacion: 'Frente', precio_usd: null, estado: 'vendida' },
  { codigo: '2B', piso: 2, tipo: '1 dormitorio', ambientes: 2, superficie_cubierta: 41, superficie_total: 46, orientacion: 'Contrafrente', precio_usd: null, estado: 'disponible' },
  { codigo: '2C', piso: 2, tipo: 'monoambiente', ambientes: 1, superficie_cubierta: 30, superficie_total: 33, orientacion: 'Contrafrente', precio_usd: null, estado: 'disponible' },
].map((u, i) => ({ id: `demo-${i}`, plano_url: null, notas: null, ...u }));
