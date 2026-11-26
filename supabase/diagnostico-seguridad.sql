-- =====================================================================
-- DIAGNÓSTICO DE SEGURIDAD (solo lectura — no modifica nada)
--
-- Ejecutar en Supabase SQL Editor ANTES y DESPUÉS de
-- migration-seguridad-hardening.sql para comparar el estado real de la BD
-- (los .sql del repo no garantizan qué se ejecutó y en qué orden).
--
-- Cada bloque es independiente: ejecútalos uno por uno y revisa el resultado.
-- =====================================================================


-- ─── 1. Vistas: ¿saltan el RLS? ──────────────────────────────────────
-- security_invoker = false (o NULL) → la vista corre con permisos del
-- dueño (postgres) y IGNORA las políticas RLS de las tablas.
SELECT
    c.relname                                                   AS vista,
    COALESCE(
        (SELECT split_part(o, '=', 2) FROM unnest(c.reloptions) o
          WHERE o LIKE 'security_invoker=%'), 'false')          AS security_invoker,
    has_table_privilege('anon',          c.oid, 'SELECT')       AS anon_puede_leer,
    has_table_privilege('authenticated', c.oid, 'SELECT')       AS auth_puede_leer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
ORDER BY 2, 1;


-- ─── 2. Tablas SIN RLS habilitado ────────────────────────────────────
SELECT c.relname AS tabla_sin_rls,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_puede_leer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
ORDER BY 1;


-- ─── 3. Políticas demasiado abiertas (USING TRUE / WITH CHECK TRUE) ──
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;


-- ─── 4. Todas las políticas (para revisión completa) ─────────────────
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;


-- ─── 5. Funciones SECURITY DEFINER sin search_path fijo ──────────────
-- (vulnerables a secuestro de search_path)
SELECT p.oid::regprocedure AS funcion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) cfg
      WHERE cfg LIKE 'search_path=%'
  )
ORDER BY 1;


-- ─── 6. Funciones SECURITY DEFINER ejecutables por anon ──────────────
SELECT p.oid::regprocedure AS funcion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY 1;


-- ─── 7. Versión de Postgres (security_invoker requiere ≥ 15) ─────────
SHOW server_version;
