/** GET /api/ics?t=<token> — file .ics dell'appuntamento, da aprire nel calendario del telefono. */
import type { APIRoute } from 'astro';
import { rpc } from '../../lib/supabaseRpc';

export const prerender = false;

const SEDI: Record<string, string> = { MACERATA: 'Lume Macerata, Piazzale Mario Fattorini 1, Macerata', MONTECASSIANO: 'Lume Montecassiano, Via Sergio Piermanni 3, Montecassiano', URBAN: 'Lume Urban, Viale Giacomo Leopardi 91, Macerata', PIEDIRIPA: 'Lume Valdichienti, Piediripa, Macerata' };
const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const GET: APIRoute = async ({ url }) => {
  const t = url.searchParams.get('t') || '';
  if (!/^[0-9a-f-]{36}$/i.test(t)) return new Response(null, { status: 404 });
  try {
    const [a] = await rpc<{ tipo: string; sede: string; inizio: string; fine: string; stato: string }[]>('site_appuntamento', { p_token: t });
    if (!a || a.stato !== 'da_fare') return new Response(null, { status: 404 });
    const tel = a.tipo === 'chiamata';
    const righe = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lume Fitness Club//Prenotazioni//IT', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${t}@lumefitness.it`, `DTSTAMP:${utc(new Date().toISOString())}`, `DTSTART:${utc(a.inizio)}`, `DTEND:${utc(a.fine)}`,
      `SUMMARY:${tel ? 'Chiamata da Lume Fitness Club' : 'Visita a Lume Fitness Club'}`,
      ...(tel ? ['DESCRIPTION:Ti chiameremo noi al numero che ci hai lasciato.'] : [`LOCATION:${SEDI[a.sede] || 'Lume Fitness Club'}`]),
      'END:VEVENT', 'END:VCALENDAR',
    ];
    return new Response(righe.join('\r\n'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="appuntamento-lume.ics"', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 502 });
  }
};
