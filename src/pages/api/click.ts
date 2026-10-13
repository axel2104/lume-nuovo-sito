/**
 * POST /api/click — registra il click su un bottone di /link.
 * Body (text/plain con JSON, come il beacon di visita): { slug, vid?, utm?, referrer? }
 * Scrive in due posti: crm_link_clicks (Supabase lume-perfectgym) e, se c'è il
 * vid, il webhook lume-visita (Airtable) con pagina "/link/<slug>".
 * Il vid esiste solo con il consenso analytics: senza, il click resta anonimo.
 */
import type { APIRoute } from 'astro';
import { LINK_BOTTONI } from '../../config/linktree';
import { siteConfig } from '../../config/site';

export const prerender = false;

// Chiave publishable: pubblica per design, può solo inserire in crm_link_clicks (RLS).
const SB_URL = process.env.SUPABASE_URL || 'https://rnhzuecojiewmrskgufe.supabase.co';
const SB_KEY = process.env.SUPABASE_KEY || 'sb_publishable_B8oR_WcbrzufxxeaJKD8Sg_uXj1R6Sh';

export const POST: APIRoute = async ({ request }) => {
  let d: any = {};
  try {
    d = JSON.parse(await request.text());
  } catch {}
  if (!LINK_BOTTONI.some((b) => b.slug === d?.slug)) return new Response(null, { status: 400 });

  const vid = typeof d.vid === 'string' ? d.vid.slice(0, 64) : null;
  const utm = d.utm && typeof d.utm === 'object' ? d.utm : null;
  const referrer = typeof d.referrer === 'string' ? d.referrer.slice(0, 500) : null;

  const supabase = fetch(`${SB_URL}/rest/v1/crm_link_clicks`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ slug: d.slug, vid, utm, referrer }),
  });
  const airtable =
    vid && siteConfig.webhookVisit
      ? fetch(siteConfig.webhookVisit, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ vid, pagina: `/link/${d.slug}`, referrer, utm }),
        })
      : Promise.resolve();
  await Promise.allSettled([supabase, airtable]);
  return new Response(null, { status: 204 });
};
