// Configuración del sitio. Es el único archivo que hace falta tocar para
// conectar la base de datos y los datos de contacto.
//
// supabaseUrl y supabaseAnonKey están en Supabase > Project Settings > API.
// La "anon key" es pública por diseño: la seguridad la dan las políticas
// definidas en supabase/schema.sql. Nunca pegar acá la "service_role key".
//
// Mientras supabaseUrl esté vacío, el sitio funciona en modo demostración
// con las unidades de ejemplo de assets/js/demo.js.

export const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',

  // Contacto
  whatsapp: '',            // solo números, con código de país: '5491112345678'
  email: '',               // ej. 'ventas@gardenugarte.com'
  direccion: 'Ugarte · dirección a confirmar',
  mapaUrl: '',             // link "Compartir > Insertar mapa" de Google Maps (src del iframe)
};
