-- SPIDER·GUIA Etapa 4 — aplicar somente após backup e validação em staging.
-- Esta migração substitui gravações diretas em public.progress por RPCs transacionais.
-- Usuários legados preservam seus registros; novas gerações começam em 1.
BEGIN;

CREATE TABLE IF NOT EXISTS public.spider_sync_generations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  generation bigint NOT NULL DEFAULT 1 CHECK (generation > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spider_reset_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  old_generation bigint NOT NULL,
  new_generation bigint NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

ALTER TABLE public.spider_sync_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spider_reset_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spider_sync_generations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.spider_reset_receipts FROM PUBLIC, anon, authenticated;

-- Nenhuma versão cliente pode escrever diretamente, nem com UPSERT ou DELETE.
-- O serviço (service_role) continua tendo acesso administrativo.
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inserir o proprio progresso" ON public.progress;
DROP POLICY IF EXISTS "atualizar o proprio progresso" ON public.progress;
DROP POLICY IF EXISTS "apagar o proprio progresso" ON public.progress;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.progress TO authenticated;

-- Retira EXECUTE público inclusive quando funções forem substituídas no futuro.
CREATE OR REPLACE FUNCTION public.spider_sync_state()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_generation bigint; v_count bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'SPIDER_AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  INSERT INTO public.spider_sync_generations(user_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
  SELECT generation INTO v_generation FROM public.spider_sync_generations WHERE user_id = v_uid;
  SELECT count(*) INTO v_count FROM public.progress WHERE user_id = v_uid;
  RETURN pg_catalog.jsonb_build_object('protocol', 4, 'generation', v_generation, 'count', v_count);
END; $$;

-- Um único lock por usuário serializa todas as escritas e o reset. O cliente
-- nunca pode definir o user_id dos registros. Duplicatas são rejeitadas.
CREATE OR REPLACE FUNCTION public.spider_sync_push(p_generation bigint, p_records jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_generation bigint; v_size integer; v_applied integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'SPIDER_AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF pg_catalog.jsonb_typeof(p_records) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'SPIDER_INVALID_BATCH' USING ERRCODE = '22023';
  END IF;
  v_size := pg_catalog.jsonb_array_length(p_records);
  IF v_size > 2000 THEN RAISE EXCEPTION 'SPIDER_BATCH_TOO_LARGE' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.spider_sync_generations(user_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
  SELECT generation INTO v_generation FROM public.spider_sync_generations WHERE user_id = v_uid FOR UPDATE;
  IF p_generation IS NULL OR p_generation <> v_generation THEN
    RAISE EXCEPTION 'SPIDER_STALE_GENERATION' USING ERRCODE = '40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_to_recordset(p_records) AS r(ord int, status text, updated_at timestamptz)
    WHERE ord IS NULL OR ord <= 0 OR status IS NULL OR status NOT IN ('Não','Sim','Pulei') OR updated_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_to_recordset(p_records) AS r(ord int)
    GROUP BY ord HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SPIDER_INVALID_RECORDS' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.progress(user_id, ord, status, updated_at)
  SELECT v_uid, r.ord, r.status, r.updated_at
  FROM pg_catalog.jsonb_to_recordset(p_records) AS r(ord int, status text, updated_at timestamptz)
  ON CONFLICT (user_id, ord) DO UPDATE
    SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
    WHERE public.progress.updated_at <= EXCLUDED.updated_at;
  GET DIAGNOSTICS v_applied = ROW_COUNT;
  RETURN pg_catalog.jsonb_build_object('protocol', 4, 'generation', v_generation, 'applied', v_applied);
END; $$;

-- Confirma explicitamente que a nuvem ainda está vazia, para um NOVO começo
-- autorizado pelo usuário. Nunca muda a geração ou escreve registros.
CREATE OR REPLACE FUNCTION public.spider_sync_confirm_empty(p_generation bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_generation bigint; v_count bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'SPIDER_AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  INSERT INTO public.spider_sync_generations(user_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
  SELECT generation INTO v_generation FROM public.spider_sync_generations WHERE user_id = v_uid FOR UPDATE;
  IF p_generation IS DISTINCT FROM v_generation THEN
    RAISE EXCEPTION 'SPIDER_STALE_GENERATION' USING ERRCODE = '40001';
  END IF;
  SELECT count(*) INTO v_count FROM public.progress WHERE user_id = v_uid;
  IF v_count <> 0 THEN RAISE EXCEPTION 'SPIDER_CLOUD_NOT_EMPTY' USING ERRCODE = 'P0001'; END IF;
  RETURN pg_catalog.jsonb_build_object('protocol',4,'generation',v_generation,'count',0);
END; $$;

-- Idempotente por (auth.uid(), request_id). Incremento + DELETE na mesma
-- transação e sob o MESMO lock usado por spider_sync_push.
CREATE OR REPLACE FUNCTION public.spider_sync_reset(p_generation bigint, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_generation bigint; v_receipt public.spider_reset_receipts%ROWTYPE; v_deleted integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'SPIDER_AUTH_REQUIRED' USING ERRCODE = '28000'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'SPIDER_REQUEST_ID_REQUIRED' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.spider_sync_generations(user_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
  SELECT generation INTO v_generation FROM public.spider_sync_generations WHERE user_id = v_uid FOR UPDATE;
  SELECT * INTO v_receipt FROM public.spider_reset_receipts WHERE user_id = v_uid AND request_id = p_request_id;
  IF FOUND THEN
    IF v_receipt.old_generation IS DISTINCT FROM p_generation OR v_receipt.new_generation IS DISTINCT FROM v_generation THEN
      RAISE EXCEPTION 'SPIDER_RESET_RECEIPT_OUTDATED' USING ERRCODE = '40001';
    END IF;
    RETURN pg_catalog.jsonb_build_object('protocol',4,'generation',v_receipt.new_generation,'deleted',0,'replayed',true);
  END IF;
  IF p_generation IS DISTINCT FROM v_generation THEN
    RAISE EXCEPTION 'SPIDER_STALE_GENERATION' USING ERRCODE = '40001';
  END IF;
  DELETE FROM public.progress WHERE user_id = v_uid;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  UPDATE public.spider_sync_generations SET generation = generation + 1, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO public.spider_reset_receipts(user_id, request_id, old_generation, new_generation)
    VALUES (v_uid, p_request_id, v_generation, v_generation + 1);
  RETURN pg_catalog.jsonb_build_object('protocol',4,'generation',v_generation+1,'deleted',v_deleted,'replayed',false);
END; $$;

REVOKE ALL ON FUNCTION public.spider_sync_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.spider_sync_push(bigint,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.spider_sync_confirm_empty(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.spider_sync_reset(bigint,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spider_sync_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spider_sync_push(bigint,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spider_sync_confirm_empty(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spider_sync_reset(bigint,uuid) TO authenticated;

COMMIT;
