/** Parti pure del totem (nessun DOM): si testano con `node --test`. */

const SITO = 'https://www.lumefitness.it';
const GIORNI = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
export const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const NOMI_GIORNO = ['', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

/** `?t=macerata-ingresso` → totem "macerata-ingresso", centro "macerata". `?centro=` ha la precedenza. */
export function parametri(search) {
  const q = new URLSearchParams(search);
  const totem = (q.get('t') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  const centro = (q.get('centro') || totem.split('-')[0] || '').toLowerCase();
  return { totem, centro };
}

/** Indirizzo del QR: stessa pagina del sito, con l'UTM che dice quale totem l'ha portato. */
export function urlQr(pagina, centro, totem) {
  const q = new URLSearchParams({ utm_source: 'totem', utm_medium: 'qr', utm_campaign: centro, utm_content: totem });
  return `${SITO}${pagina}?${q}`;
}

/** Giorno (1 = lunedì) e minuti dalla mezzanotte, in ora italiana: il totem può avere l'orologio sbagliato, il centro no. */
export function oraRoma(data = new Date()) {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(data)
      .map((p) => [p.type, p.value]),
  );
  return { giorno: GIORNI[parti.weekday], minuti: (Number(parti.hour) % 24) * 60 + Number(parti.minute) };
}

const minuti = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** Planning della settimana a griglia: una riga per orario d'inizio, una colonna per giorno (1 = lunedì). */
export function griglia(lezioni) {
  const valide = lezioni.filter((l) => Number.isFinite(minuti(l.inizio)));
  const orari = [...new Set(valide.map((l) => l.inizio))].sort((a, b) => minuti(a) - minuti(b));
  return { orari, in: (giorno, ora) => valide.filter((l) => l.giorno === giorno && l.inizio === ora) };
}

export const nomeGiorno = (g) => NOMI_GIORNO[g] ?? '';
