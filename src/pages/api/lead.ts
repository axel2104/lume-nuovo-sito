/**
 * POST /api/lead — payload del form (docs/FORM.md).
 * Scrive su Supabase (crm_leads, la vista del CRM) e in parallelo inoltra a n8n
 * (Airtable). Basta che uno dei due vada a buon fine: il lead è perso solo se falliscono entrambi.
 */
import type { APIRoute } from 'astro';
import { siteConfig } from '../../config/site';
import { leggiJson, rpc } from '../../lib/supabaseRpc';

export const prerender = false;

/** Codice che attiva il guest pass sul portale PerfectGym. */
const CODICE_PROVA = process.env.CODICE_PROVA || 'LUMEGOLD';

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  if (!d || typeof d.email !== 'string') return new Response(null, { status: 400 });

  const supabase = rpc<number>('site_registra_lead', { p: d });
  const airtable = siteConfig.webhookLead
    ? fetch(siteConfig.webhookLead, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      }).then((r) => {
        if (!r.ok) throw new Error('n8n HTTP ' + r.status);
      })
    : Promise.reject(new Error('webhook non configurato'));

  // Il codice della settimana di prova lo decide il server, non il bundle: lo riceve
  // solo chi risulta davvero nuovo, che è la regola commerciale del pass.
  const codice =
    d.flusso === 'prova'
      ? rpc<string>('site_verifica_email', { p_email: d.email }).then((s) => (s === 'nuovo' ? CODICE_PROVA : null))
      : Promise.resolve(null);

  const [sb, at, cod] = await Promise.allSettled([supabase, airtable, codice]);
  if (sb.status === 'rejected' && at.status === 'rejected') return new Response(null, { status: 502 });
  return Response.json({
    ok: true,
    supabase: sb.status === 'fulfilled',
    airtable: at.status === 'fulfilled',
    codice: cod.status === 'fulfilled' ? cod.value : null,
  });
};
