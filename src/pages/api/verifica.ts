/**
 * POST /api/verifica — { email } → { stato: "nuovo" | "esiste" | "iscritto" }
 * Risponde solo con la parola: mai nome, cognome o telefono (vedi docs/SUPABASE.md §6).
 * Se il database non risponde il form tratta l'utente come nuovo, come col vecchio webhook.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  let stato = 'nuovo';
  try {
    stato = await rpc<string>('site_verifica_email', { p_email: String(d.email || '') });
  } catch {}
  return Response.json({ stato }, { headers: { 'Cache-Control': 'no-store' } });
};
