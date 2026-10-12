/**
 * POST /api/verifica — { email } → { stato: "nuovo" | "esiste" | "iscritto" }
 * Risponde solo con la parola: mai nome, cognome o telefono (vedi docs/SUPABASE.md §6).
 * Con `codice: true` e stato "nuovo" aggiunge il codice del pass prova (landing /prova).
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
  const codice = d.codice && stato === 'nuovo' ? process.env.CODICE_PROVA || 'LUMEGOLD' : undefined;
  return Response.json({ stato, codice }, { headers: { 'Cache-Control': 'no-store' } });
};
