export {};

declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    LINKS_ENABLED?: boolean;
    SPIDER_REMOTE_RESET_VERIFIED?: boolean;
    SpiderValidator?: {
      validate(
        data: unknown,
        links: unknown[]
      ): {
        ok: boolean;
        errors: Array<{ code: string; message: string }>;
        summary: Record<string, number>;
      };
    };
    supabase?: {
      createClient(url: string, key?: string): any;
    };
    __SPIDER_VALIDATION__?: unknown;
    _t?: number;
  }
}
