# Garden Ugarte

Sitio web de venta del edificio Garden Ugarte: departamentos, monoambientes y locales, con disponibilidad de unidades en tiempo real y una bandeja de entrada para consultas, propuestas y opiniones.

- **Sitio público** (`index.html`): presentación del proyecto, tabla de disponibilidad con filtros, galería, ubicación y formulario de contacto.
- **Panel de administración** (`admin.html`): ingreso con email y contraseña, cambio de estado de cada unidad (disponible, reservada, vendida), alta y edición de unidades, y bandeja de mensajes con exportación a CSV.
- **Base de datos**: [Supabase](https://supabase.com) (Postgres + Realtime). Cuando cambiás una unidad en el panel, todas las personas que tienen el sitio abierto ven el cambio al instante.

Sin base de datos configurada, el sitio funciona en **modo demostración** con unidades de ejemplo.

## Puesta en marcha

### 1. Publicar en GitHub Pages
1. En GitHub, entrar a **Settings → Pages**.
2. En *Build and deployment*, elegir **Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guardar.
3. En uno o dos minutos el sitio queda en `https://<usuario>.github.io/garden-ugarte/`.

### 2. Crear la base de datos en Supabase
1. Crear una cuenta en supabase.com y un proyecto nuevo (plan gratuito).
2. Ir a **SQL Editor → New query**, pegar todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y tocar **Run**.
3. Ir a **Authentication → Users → Add user** y crear el usuario administrador (email y contraseña).
4. Volver al **SQL Editor** y autorizar ese email:
   ```sql
   insert into public.admins (email) values ('tu-email@ejemplo.com');
   ```
5. En **Authentication → Sign In / Providers**, desactivar *Allow new users to sign up* para que nadie más pueda registrarse.

### 3. Conectar el sitio con la base de datos
En **Project Settings → API** de Supabase copiar el *Project URL* y la *anon public key*, y pegarlos en [`assets/js/config.js`](assets/js/config.js). En ese mismo archivo se cargan el WhatsApp, el email, la dirección y el mapa.

La *anon key* es pública por diseño: lo que puede hacer cada visitante lo controlan las políticas de seguridad del esquema (los visitantes solo pueden leer unidades y enviar mensajes; solo los administradores pueden editar y leer la bandeja). **Nunca** pegar la *service_role key* en el sitio.

## Estructura

```
index.html              Sitio público
admin.html              Panel de administración
assets/css/styles.css   Estilos
assets/js/config.js     Configuración (Supabase y contacto)
assets/js/db.js         Acceso a datos y formato
assets/js/main.js       Lógica del sitio público
assets/js/admin.js      Lógica del panel
assets/js/demo.js       Unidades de ejemplo
assets/img/             Fotos, renders y planos
supabase/schema.sql     Tablas, seguridad y tiempo real
```

## Probar en la computadora

```
python3 -m http.server 8000
```
y abrir http://localhost:8000.
