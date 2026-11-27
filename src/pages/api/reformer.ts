/**
 * POST /api/reformer — { email } → { tipo: "soci" | "esterni", codice, video, poster }
 * Black Reformer Friday: iscritto (contratto attivo, stessa regola di /api/verifica) = codice e video dei soci,
 * tutti gli altri (nuovo, esiste senza contratto, database muto) = codice e video degli esterni.
 * I codici stanno qui, sul server: la pagina li riceve solo dopo la mail.
 */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  const email = String(d.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: 'Inserisci una mail valida' }, { status: 400 });
  let stato = 'nuovo';
  try {
    stato = await rpc<string>('site_verifica_email', { p_email: email });
  } catch {}
  const soci = stato === 'iscritto';
  // Interesse reale: ha lasciato la mail e ha ricevuto il codice. Agganciato al lead per email, come gli altri eventi del sito.
  try {
    await rpc('site_registra_evento', { p: { evento: 'reformer_codice', email: email.toLowerCase(), pagina: '/blackfriday', dati: { tipo: soci ? 'soci' : 'esterni' } } });
  } catch {}
  const tipo = soci ? 'soci' : 'esterni';
  const codice = soci ? process.env.CODICE_REFORMER_SOCI || 'BLACKREFORMER60' : process.env.CODICE_REFORMER_ESTERNI || 'BLACKREFORMER26';
  return Response.json({ tipo, codice, video: `/media/reformer-${tipo}.mp4`, poster: `/media/reformer-${tipo}.jpg` }, { headers: { 'Cache-Control': 'no-store' } });
};
