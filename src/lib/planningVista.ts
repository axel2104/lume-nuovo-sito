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
  GIORNI,
  PX_PER_MIN,
  corsiDi,
  disponi,
  estremi,
  orario,
  saleDi,
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
  const posizionate = disponi(dati.lezioni || []);
  const prenota = dati.prenotaUrl || '';

  const avviso = dati.esempio
    ? `<p class="pl-esempio"><b>Dati di esempio.</b> Questo orario non è quello reale: serve a
       vedere il layout finché il collegamento a PerfectGym non è attivo. In produzione non compare.</p>`
    : '';

  if (!posizionate.length) {
    const link = prenota
      ? ` <a href="${esc(prenota)}" target="_blank" rel="noopener">Apri il portale ↗</a>`
      : '';
    return (
      avviso +
      `<p class="pl-vuoto">L’orario di questo centro non è ancora pubblicato qui. Lo trovi intanto
        sul portale, dove puoi anche prenotare.${link}</p>`
    );
  }

  const { da, a } = estremi(dati.lezioni);
  const ore = Array.from({ length: Math.floor((a - da) / 60) + 1 }, (_, i) => da + i * 60);
  const altezza = (a - da) * PX_PER_MIN;
  const perOpzioni = dati.opzioniDa ?? dati.lezioni;
  const sale = saleDi(perOpzioni);
  const corsi = corsiDi(perOpzioni);
  const giorniAttivi = GIORNI.filter((g) => posizionate.some((l) => l.giorno === g.n));
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
  // Gli stessi su griglia e lista: i filtri agiscono su entrambe senza sapere
  // quale sia visibile, e non esiste il caso di una vista aggiornata e l'altra no.
  const attributi = (l: (typeof posizionate)[number]) =>
    `data-lezione data-giorno="${l.giorno}" data-corso="${esc(l.corso)}" data-sala="${esc(l.sala ?? '')}"`;

  // ─── Griglia settimanale (desktop) ──────────────────────────────────────
  const griglia = `
    <div class="pl-griglia">
      <div class="pl-testa">
        <span class="pl-gutter-testa"></span>
        ${giorniAttivi.map((g) => `<span class="pl-giorno-testa">${g.nome}</span>`).join('')}
      </div>
      <div class="pl-corpo" style="height:${altezza}px">
        <div class="pl-gutter">
          ${ore
            .map(
              (o) =>
                `<span class="pl-ora" style="top:${(o - da) * PX_PER_MIN}px">${orario(o)}</span>`,
            )
            .join('')}
        </div>
        ${giorniAttivi
          .map(
            (g) => `
          <div class="pl-colonna">
            ${ore
              .map(
                (o) =>
                  `<span class="pl-riga" style="top:${(o - da) * PX_PER_MIN}px" aria-hidden="true"></span>`,
              )
              .join('')}
            ${posizionate
              .filter((l) => l.giorno === g.n)
              .map((l) => {
                const durata = l.a - l.da;
                const stile =
                  `top:${(l.da - da) * PX_PER_MIN}px;` +
                  `height:${durata * PX_PER_MIN}px;` +
                  `left:calc(${(l.corsia / l.corsie) * 100}% + 1px);` +
                  `width:calc(${100 / l.corsie}% - 2px)`;

                /**
                 * La tessera ha due righe e non tre: titolo e una riga sola di
                 * metadati. Con tre blocchi, una lezione da cinquanta minuti non
                 * ha l'altezza per contenerli e l'ultima riga viene tagliata a
                 * metà — che a schermo si legge come un errore, non come una
                 * scelta.
                 *
                 * `corta` e `stretta` fanno degradare il contenuto invece di
                 * troncarlo: sotto i quaranta minuti il titolo sta su una riga,
                 * e con tre o più sale in parallelo la sala sparisce (resta nel
                 * tooltip e nella vista mobile, dove lo spazio c'è).
                 */
                const classi = ['pl-lez'];
                if (durata < 40) classi.push('corta');
                if (l.corsie >= 3) classi.push('stretta');

                const meta = [
                  `${esc(l.inizio)}–${esc(l.fine)}`,
                  l.corsie < 3 && l.sala ? esc(l.sala) : '',
                ]
                  .filter(Boolean)
                  .join(' · ');

                const corpo = `<b>${esc(l.corso)}</b><span class="pl-lez-meta">${meta}</span>`;

                // Il tooltip porta sempre tutto: qualunque troncamento visivo
                // non fa perdere informazione a chi passa il mouse.
                const completo = esc(
                  [`${l.inizio}–${l.fine}`, l.corso, l.sala, l.istruttore].filter(Boolean).join(' · '),
                );

                // Tutta la tessera è cliccabile quando la disciplina esiste: un
                // bersaglio grande vale più di un link testuale in un riquadro
                // alto quaranta pixel.
                return l.disciplina
                  ? `<a class="${classi.join(' ')}" ${attributi(l)} style="${stile}" title="${completo}" href="/discipline/${esc(l.disciplina)}">${corpo}</a>`
                  : `<article class="${classi.join(' ')}" ${attributi(l)} style="${stile}" title="${completo}">${corpo}</article>`;
              })
              .join('')}
          </div>`,
          )
          .join('')}
      </div>
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
            ${posizionate
              .filter((l) => l.giorno === g.n)
              .sort((x, y) => x.da - y.da)
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

  return avviso + barra + griglia + mobile;
}

/** Numero di colonne, per la variabile CSS della griglia. */
export function colonneAttive(lezioni: Lezione[]): number {
  const posizionate = disponi(lezioni || []);
  return GIORNI.filter((g) => posizionate.some((l) => l.giorno === g.n)).length || 7;
}
