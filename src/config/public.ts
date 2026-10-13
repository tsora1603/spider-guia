export const linksEnabled = typeof window === 'undefined' || window.LINKS_ENABLED !== false;
export function supabaseConfig(): { url: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  const url = window.SUPABASE_URL?.trim();
  const key = window.SUPABASE_ANON_KEY?.trim();
  if (!url || !key || /COLE/.test(url)) return null;
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol) && parsed.hostname ? { url, key } : null;
  } catch {
    return null;
  }
}
