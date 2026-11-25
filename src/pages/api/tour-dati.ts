/**
 * POST /api/tour-dati — { email, sede, interessi[], note, consenso } → { ok }
 * Dopo /api/lead (pagina /tour) chiede al CRM di collegare la persona a PerfectGym, da server a server.
 * Le chiavi PerfectGym stanno solo nel CRM: qui c'è soltanto un segreto di collegamento
 * (TOUR_SITE_SECRET), mai esposto al browser.
 * Il lead è già salvato in /api/lead: se questo passaggio fallisce non si perde nulla.
 */
import type { APIRoute } from 'astro';
import { leggiJson } from '../../lib/supabaseRpc';

export const prerender = false;

const CRM = (process.env.CRM_URL || 'https://crm.lumefitness.it').replace(/\/$/, '');

export const POST: APIRoute = async ({ request }) => {
  const d = await leggiJson(request);
  const segreto = process.env.TOUR_SITE_SECRET;
  if (!d || typeof d.email !== 'string') return new Response(null, { status: 400 });
  if (!segreto) return new Response(null, { status: 503 });
  try {
    const r = await fetch(`${CRM}/api/tour-dati`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tour-secret': segreto },
      body: JSON.stringify({
        email: d.email,
        sede: typeof d.sede === 'string' ? d.sede : '',
        interessi: Array.isArray(d.interessi) ? d.interessi.slice(0, 15) : [],
        note: typeof d.note === 'string' ? d.note.slice(0, 1000) : '',
        consenso: d.consenso === true,
      }),
      signal: AbortSignal.timeout(9000),
    });
    return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 502 });
  } catch {
    return new Response(null, { status: 502 });
  }
};
