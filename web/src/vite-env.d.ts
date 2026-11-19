/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Basis URL API NestJS. Default "/api" lewat proxy Vite saat pengembangan. */
  readonly VITE_API_BASE_URL?: string;
  /** URL proyek Supabase — boleh diketahui publik. */
  readonly VITE_SUPABASE_URL: string;
  /** Anon key Supabase. Service role key TIDAK PERNAH boleh ada di sini. */
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
