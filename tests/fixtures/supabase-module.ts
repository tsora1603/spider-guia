/** Fronteira de integração: substitui o módulo SDK, sem interceptar o CDN ou dados reais. */
export const supabaseModule = (source: string) =>
  `${source}\nexport const createClient = (...args) => window.supabase?.createClient(...args) || null;`;
