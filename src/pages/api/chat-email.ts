/** POST /api/chat-email — la persona lascia l'email: la sua chat si abbina al contatto nel CRM. */
import type { APIRoute } from 'astro';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (typeof d.sessione !== 'string' || typeof d.email !== 'string') return new Response(null, { status: 400 });
  const ok = await rpc<boolean>('site_chat_email', { p_sessione: d.sessione, p_email: d.email }).catch(() => false);
  return new Response(null, { status: ok ? 204 : 422 });
};
