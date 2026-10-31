-- Garden Ugarte · esquema de base de datos para Supabase
-- Pegar completo en Supabase > SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Administradores: solo los emails cargados acá pueden editar
-- unidades y leer la bandeja de propuestas.
-- ---------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------
-- Unidades (departamentos, monoambientes y locales)
-- ---------------------------------------------------------------
create table if not exists public.unidades (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,          -- ej. "3B"
  piso                integer not null,              -- 0 = planta baja
  tipo                text not null check (tipo in
                        ('monoambiente', '1 dormitorio', '2 dormitorios',
                         '3 dormitorios', 'local comercial')),
  ambientes           integer,
  superficie_cubierta numeric(7,2),
  superficie_total    numeric(7,2),
  orientacion         text,                          -- ej. "Frente / Norte"
  precio_usd          numeric(12,2),
  estado              text not null default 'disponible'
                        check (estado in ('disponible', 'reservada', 'vendida')),
  plano_url           text,
  notas               text,
  actualizado         timestamptz not null default now()
);

create or replace function public.tocar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists unidades_actualizado on public.unidades;
create trigger unidades_actualizado
  before update on public.unidades
  for each row execute function public.tocar_actualizado();

alter table public.unidades enable row level security;

drop policy if exists "unidades: lectura publica" on public.unidades;
create policy "unidades: lectura publica"
  on public.unidades for select
  using (true);

drop policy if exists "unidades: admins editan" on public.unidades;
create policy "unidades: admins editan"
  on public.unidades for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------------------------
-- Propuestas y opiniones (bandeja de entrada)
-- ---------------------------------------------------------------
create table if not exists public.propuestas (
  id        bigint generated always as identity primary key,
  creado    timestamptz not null default now(),
  nombre    text not null check (char_length(nombre) between 2 and 120),
  email     text check (email is null or char_length(email) <= 200),
  telefono  text check (telefono is null or char_length(telefono) <= 40),
  tipo      text not null default 'consulta'
              check (tipo in ('consulta', 'propuesta', 'opinion')),
  unidad    text check (unidad is null or char_length(unidad) <= 20),
  mensaje   text not null check (char_length(mensaje) between 3 and 4000),
  leido     boolean not null default false
);

alter table public.propuestas enable row level security;

drop policy if exists "propuestas: cualquiera envia" on public.propuestas;
create policy "propuestas: cualquiera envia"
  on public.propuestas for insert
  to anon, authenticated
  with check (leido = false);

drop policy if exists "propuestas: admins leen" on public.propuestas;
create policy "propuestas: admins leen"
  on public.propuestas for select
  to authenticated
  using (public.es_admin());

drop policy if exists "propuestas: admins marcan" on public.propuestas;
create policy "propuestas: admins marcan"
  on public.propuestas for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

drop policy if exists "propuestas: admins borran" on public.propuestas;
create policy "propuestas: admins borran"
  on public.propuestas for delete
  to authenticated
  using (public.es_admin());

-- ---------------------------------------------------------------
-- Tiempo real: el sitio escucha los cambios de estas tablas.
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'unidades') then
    alter publication supabase_realtime add table public.unidades;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'propuestas') then
    alter publication supabase_realtime add table public.propuestas;
  end if;
end $$;

-- ---------------------------------------------------------------
-- Datos iniciales
-- ---------------------------------------------------------------
-- 1) Reemplazar por el email con el que vas a entrar al panel:
-- insert into public.admins (email) values ('tu-email@ejemplo.com');

-- 2) Unidades de ejemplo (borrar o editar con los datos reales):
insert into public.unidades
  (codigo, piso, tipo, ambientes, superficie_cubierta, superficie_total, orientacion, precio_usd, estado)
values
  ('PB-L1', 0, 'local comercial', 1, 48.00, 48.00, 'Frente', null, 'disponible'),
  ('1A', 1, '2 dormitorios', 3, 62.00, 70.50, 'Frente', null, 'disponible'),
  ('1B', 1, '1 dormitorio', 2, 41.00, 46.00, 'Contrafrente', null, 'reservada'),
  ('1C', 1, 'monoambiente', 1, 30.00, 33.00, 'Contrafrente', null, 'disponible'),
  ('2A', 2, '2 dormitorios', 3, 62.00, 70.50, 'Frente', null, 'vendida'),
  ('2B', 2, '1 dormitorio', 2, 41.00, 46.00, 'Contrafrente', null, 'disponible'),
  ('2C', 2, 'monoambiente', 1, 30.00, 33.00, 'Contrafrente', null, 'disponible')
on conflict (codigo) do nothing;
