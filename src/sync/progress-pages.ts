const PAGE_SIZE = 500;
const MAX_REMOTE_RECORDS = 100_000;

/** Shared SELECT contract for synchronization and recovery; never returns a truncated snapshot. */
export async function* progressPages(client: any, userId: string): AsyncGenerator<any[]> {
  if (!client || !userId) throw Error('Não há sessão para consultar o progresso.');
  for (let offset = 0; offset <= MAX_REMOTE_RECORDS; offset += PAGE_SIZE) {
    const response = await client
      .from('progress')
      .select('ord,status,updated_at')
      .eq('user_id', userId)
      .order('ord', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (response.error)
      throw Error(`Falha ao consultar a nuvem: ${response.error.message || 'erro desconhecido'}`);
    if (!Array.isArray(response.data) || response.data.length > PAGE_SIZE)
      throw Error('A nuvem retornou dados inválidos.');
    if (offset + response.data.length > MAX_REMOTE_RECORDS)
      throw Error('Quantidade de registros inesperada na nuvem.');
    yield response.data;
    if (response.data.length < PAGE_SIZE) return;
  }
}
