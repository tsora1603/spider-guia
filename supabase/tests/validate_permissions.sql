-- Validação READ-ONLY no SQL Editor, APÓS aplicar a migração.
-- Cada linha deve retornar true. Executar como administrador.
SELECT 'progress sem INSERT autenticado' AS assertion, NOT has_table_privilege('authenticated', 'public.progress', 'INSERT') AS ok
UNION ALL SELECT 'progress sem UPDATE autenticado', NOT has_table_privilege('authenticated','public.progress','UPDATE')
UNION ALL SELECT 'progress sem DELETE autenticado', NOT has_table_privilege('authenticated','public.progress','DELETE')
UNION ALL SELECT 'RLS progress habilitada', relrowsecurity FROM pg_class WHERE oid='public.progress'::regclass
UNION ALL SELECT 'RLS gerações habilitada', relrowsecurity FROM pg_class WHERE oid='public.spider_sync_generations'::regclass
UNION ALL SELECT 'RLS recibos habilitada', relrowsecurity FROM pg_class WHERE oid='public.spider_reset_receipts'::regclass
UNION ALL SELECT 'authenticated pode chamar status', has_function_privilege('authenticated','public.spider_sync_state()','EXECUTE')
UNION ALL SELECT 'authenticated pode chamar push', has_function_privilege('authenticated','public.spider_sync_push(bigint,jsonb)','EXECUTE')
UNION ALL SELECT 'authenticated pode chamar reset', has_function_privilege('authenticated','public.spider_sync_reset(bigint,uuid)','EXECUTE')
UNION ALL SELECT 'anon não pode chamar reset', NOT has_function_privilege('anon','public.spider_sync_reset(bigint,uuid)','EXECUTE')
UNION ALL SELECT 'anon não pode escrever progresso', NOT has_table_privilege('anon','public.progress','INSERT');
