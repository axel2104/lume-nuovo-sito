/**
 * Chiama una funzione RPC di Supabase (lume-perfectgym) dalle route server.
 * La chiave publishable può solo eseguire le funzioni `site_*` (security definer):
 * le tabelle non sono raggiungibili da anon. Stesso progetto e stessa chiave di click.ts.
 */
const SB_URL = process.env.SUPABASE_URL || 'https://rnhzuecojiewmrskgufe.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_B8oR_WcbrzufxxeaJKD8Sg_uXj1R6Sh';

export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn} HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Legge il body JSON; vuoto se malformato. */
export async function leggiJson(request: Request): Promise<any> {
  try {
    return JSON.parse(await request.text());
  } catch {
    return {};
  }
}
