/**
 * Renderer del planning — un solo posto, usato dal server e dal browser.
 *
 * Esiste per evitare la trappola più comune di una pagina "statica che si
 * aggiorna": il markup renderizzato da Astro e quello ricostruito dal
 * JavaScript dopo il fetch finiscono scritti due volte, e la seconda copia
 * divergerà dalla prima al primo ritocco. Qui la funzione è una: Astro la chiama
 * a build time e la inietta con `set:html`, il client la richiama con i dati
 * freschi e sostituisce lo stesso nodo.
 *
 * Conseguenza da tenere a mente: essendo HTML costruito a mano, **l'escaping è
 * nostro**. Ogni valore che arriva dai contenuti o dal webhook passa da `esc()`.
 * Gli stili non possono essere scoped al componente, quindi vivono in
 * `src/styles/planning.css`.
 */

import {
  corsiDi,
  giorniDi,
  minuti,
  lezioniValide,
  perSlot,
  saleDi,
  slotDi,
  type Lezione,
} from '../config/planning';

export interface DatiPlanning {
  lezioni: Lezione[];
  /** ISO dell'ultimo aggiornamento noto. */
  aggiornatoIl?: string | null;
  /** Link al portale PerfectGym per prenotare. */
  prenotaUrl?: string | null;
  /** Mostra l'avviso "dati di esempio" (solo in sviluppo). */
  esempio?: boolean;
  /**
   * Insieme da cui costruire le opzioni dei filtri.
   *
   * Serve quando `lezioni` è già un sottoinsieme filtrato: se le tendine si
   * costruissero su quello, dopo il primo filtro le altre opzioni sparirebbero e
   * l'utente non potrebbe più cambiare scelta. Assente = si usa `lezioni`.
   */
  opzioniDa?: Lezione[];
  /** Il filtro corrente non lascia nulla: mostra i controlli e un messaggio. */
  vuotoPerFiltri?: boolean;
}

/** Escaping per il testo e per gli attributi fra apici doppi. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dataIt(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Rome',
    }).format(d);
  } catch (e) {
    return '';
  }
}

export function renderPlanning(dati: DatiPlanning): string {
  const lezioni = lezioniValide(dati.lezioni || []);
  const prenota = dati.prenotaUrl || '';

  const avviso = dati.esempio
    ? `<p class="pl-esempio"><b>Dati di esempio.</b> Questo orario non è quello reale: serve a
       vedere il layout finché il collegamento a PerfectGym non è attivo. In produzione non compare.</p>`
    : '';

  if (!lezioni.length) {
    const link = prenota
      ? ` <a href="${esc(prenota)}" target="_blank" rel="noopener">Apri il portale ↗</a>`
      : '';
    return (
      avviso +
      `<p class="pl-vuoto">L’orario di questo centro non è ancora pubblicato qui. Lo trovi intanto
        sul portale, dove puoi anche prenotare.${link}</p>`
    );
  }

  const perOpzioni = dati.opzioniDa ?? dati.lezioni;
  const sale = saleDi(perOpzioni);
  const corsi = corsiDi(perOpzioni);
  const giorniAttivi = giorniDi(lezioni);
  const aggiornato = dataIt(dati.aggiornatoIl);

  // ─── Barra: filtri e metadati ───────────────────────────────────────────
  const opzioni = (valori: string[], tutti: string) =>
    `<option value="">${tutti}</option>` +
    valori.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

  const barra = `
    <div class="pl-barra">
      <div class="pl-filtri">
        <label class="pl-f">
          <span>Corso</span>
          <select data-filtro="corso">${opzioni(corsi, 'Tutti')}</select>
        </label>
        ${
          sale.length > 1
            ? `<label class="pl-f">
                 <span>Sala</span>
                 <select data-filtro="sala">${opzioni(sale, 'Tutte')}</select>
               </label>`
            : ''
        }
        <button type="button" class="pl-reset" data-reset hidden>Azzera filtri</button>
      </div>
      <div class="pl-meta">
        ${aggiornato ? `<span>Aggiornato il ${esc(aggiornato)}</span>` : ''}
        ${
          prenota
            ? `<a href="${esc(prenota)}" class="pl-prenota" target="_blank" rel="noopener">Prenota sul portale ↗</a>`
            : ''
        }
      </div>
    </div>`;

  // ─── Attributi condivisi fra le due viste ───────────────────────────────
  // Gli stessi su tabella e lista: i filtri agiscono su entrambe senza sapere
  // quale sia visibile, e non esiste il caso di una vista aggiornata e l'altra no.
  const attributi = (l: Lezione) =>
    `data-lezione data-giorno="${l.giorno}" data-corso="${esc(l.corso)}" data-sala="${esc(l.sala ?? '')}"` +
    ` data-disciplina="${esc(l.disciplina ?? '')}"`;

  /** Una lezione dentro una casella della tabella. */
  const tessera = (l: Lezione) => {
    const meta = [`${esc(l.inizio)}–${esc(l.fine)}`, l.sala ? esc(l.sala) : '']
      .filter(Boolean)
      .join(' · ');
    const corpo = `<b>${esc(l.corso)}</b><span class="pl-lez-meta">${meta}</span>`;
    const completo = esc(
      [`${l.inizio}–${l.fine}`, l.corso, l.sala, l.istruttore].filter(Boolean).join(' · '),
    );
    // Resta un `<a>` con un href vero: senza JavaScript porta alla scheda, con
    // JavaScript il click apre il popup. Un `<button>` qui perderebbe il link.
    return l.disciplina
      ? `<a class="pl-lez" ${attributi(l)} title="${completo}" href="/discipline/${esc(l.disciplina)}">${corpo}</a>`
      : `<article class="pl-lez" ${attributi(l)} title="${completo}">${corpo}</article>`;
  };

  // ─── Tabella per fasce (desktop) ────────────────────────────────────────
  const slot = slotDi(lezioni);
  const mappa = perSlot(lezioni);

  const tabella = `
    <div class="pl-tab" role="table" aria-label="Orario settimanale dei corsi">
      <div class="pl-tab-testa" role="row">
        <span class="pl-tab-ora" role="columnheader"><span class="sr-only">Ora</span></span>
        ${giorniAttivi
          .map((g) => `<span class="pl-giorno-testa" role="columnheader">${g.nome}</span>`)
          .join('')}
      </div>
      ${slot
        .map(
          (s) => `
        <div class="pl-tab-riga${s.stacco ? ' stacco' : ''}" role="row">
          <span class="pl-tab-ora" role="rowheader">${esc(s.inizio)}</span>
          ${giorniAttivi
            .map((g) => {
              const voci = mappa.get(g.n + '|' + s.inizio) || [];
              return `<div class="pl-tab-cella" role="cell">${voci.map(tessera).join('')}</div>`;
            })
            .join('')}
        </div>`,
        )
        .join('')}
    </div>`;

  // ─── Liste per giorno (mobile) ──────────────────────────────────────────
  // Senza JavaScript sono tutte visibili una sotto l'altra: pagina lunga ma
  // completa. Con JavaScript diventano un giorno alla volta, aperto su oggi.
  const mobile = `
    <div class="pl-mobile">
      <nav class="pl-giorni" aria-label="Scegli il giorno">
        ${giorniAttivi
          .map(
            (g) =>
              `<button type="button" class="pl-gio" data-giorno-btn="${g.n}">
                 <b>${g.iniziale}</b><span>${g.breve}</span>
               </button>`,
          )
          .join('')}
      </nav>
      ${giorniAttivi
        .map(
          (g) => `
        <section class="pl-lista" data-giorno-sez="${g.n}">
          <h3 class="pl-lista-titolo">${g.nome}</h3>
          <ul>
            ${lezioni
              .filter((l) => l.giorno === g.n)
              .sort((x, y) => minuti(x.inizio) - minuti(y.inizio) || x.corso.localeCompare(y.corso, 'it'))
              .map((l) => {
                const nome = l.disciplina
                  ? `<a href="/discipline/${esc(l.disciplina)}">${esc(l.corso)}</a>`
                  : `<b>${esc(l.corso)}</b>`;
                const meta = [l.sala, l.istruttore].filter(Boolean).map(esc).join(' · ');
                return `<li ${attributi(l)}>
                  <span class="pl-ml-ora"><b>${esc(l.inizio)}</b><i>${esc(l.fine)}</i></span>
                  <span class="pl-ml-corpo">${nome}
                    ${meta ? `<span class="pl-ml-meta">${meta}</span>` : ''}
                  </span>
                </li>`;
              })
              .join('')}
          </ul>
          <p class="pl-lista-vuota" hidden>Nessun corso con questi filtri.</p>
        </section>`,
        )
        .join('')}
    </div>`;

  // Filtro che non lascia nulla: i controlli restano, il resto no. Mostrare una
  // griglia vuota di sedici ore per dire "nessun risultato" è solo rumore.
  if (dati.vuotoPerFiltri) {
    return (
      avviso +
      barra +
      `<p class="pl-vuoto">Nessun corso con questi filtri.
        <button type="button" data-reset class="pl-link">Azzera</button></p>`
    );
  }

  return avviso + barra + tabella + mobile;
}

/** Numero di colonne, per la variabile CSS della tabella. */
export function colonneAttive(lezioni: Lezione[]): number {
  return giorniDi(lezioni || []).length || 6;
}
