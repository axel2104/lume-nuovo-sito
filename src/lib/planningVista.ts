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
  /**
   * Slug della disciplina → id della sua categoria, per colorare le tessere.
   *
   * Arriva già risolto invece di far cercare qui la categoria, perché questo
   * file gira anche nel browser, dove la collection delle discipline non
   * esiste. La mappa viaggia nel payload JSON insieme alle lezioni: così la
   * griglia ridisegnata dopo il fetch ha gli stessi colori di quella
   * renderizzata dal server, e non c'è il caso di una vista colorata e
   * l'altra grigia.
   */
  categorie?: Record<string, string>;
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

  // ─── Attributi di una lezione ───────────────────────────────────────────
  // Li leggono i filtri e il popup della scheda. Restano attributi e non una
  // struttura in memoria perché il filtro ridisegna l'HTML da zero: lo stato
  // vive nel DOM, che è l'unica copia.
  const attributi = (l: Lezione) =>
    `data-lezione data-giorno="${l.giorno}" data-corso="${esc(l.corso)}" data-sala="${esc(l.sala ?? '')}"` +
    ` data-disciplina="${esc(l.disciplina ?? '')}"`;

  const categorie = dati.categorie ?? {};

  /**
   * Il nome del corso senza il prefisso del licenziante.
   *
   * Nella griglia compatta su un telefono ogni tessera ha 44px per il testo, e
   * "LesMills BodyPump" ne chiede il doppio: metà del planning finiva
   * troncato a "LesMills BodyP…", cioè con l'unica parola che distingue i
   * corsi tagliata via. Togliere il prefisso lascia "BodyPump", che sta e
   * dice quello che serve.
   *
   * Non è una scorciatoia sul marchio: da 1024px in su la tessera mostra il
   * nome intero, e il popup e il `title` lo portano sempre.
   */
  const breve = (corso: string) => corso.replace(/^les\s?mills\s+/i, '');

  /** Una lezione dentro una casella della tabella. */
  const tessera = (l: Lezione) => {
    const meta = [`${esc(l.inizio)}–${esc(l.fine)}`, l.sala ? esc(l.sala) : '']
      .filter(Boolean)
      .join(' · ');
    // `pl-lez-meta` esiste in tutte le tessere ma su schermo piccolo il CSS la
    // nasconde: la griglia compatta mostra il solo nome, e l'orario lo dice
    // già la riga. Un markup, due densità — non due viste da tenere allineate.
    // Due forme del nome, il CSS scopre quella che sta nella colonna. Sono
    // trenta caratteri in più per tessera, ed evitano che la vista compatta
    // tronchi sistematicamente la parola che distingue il corso.
    const abbrev = breve(l.corso);
    // `<wbr>` alla cucitura dei nomi composti. Senza, "BodyPump" nella colonna
    // da 41px si spezzava in "BodyPum/p" e "IntensitYOU" in "IntensitYO/U":
    // una lettera orfana sulla seconda riga, che si legge come un difetto.
    // Rotto al maiuscolo interno diventa "Body/Pump" e "Intensit/YOU". Va
    // inserito DOPO l'escaping, altrimenti il tag verrebbe scritto in chiaro.
    const cuciture = (s: string) => esc(s).replace(/([a-z])([A-Z])/g, '$1<wbr>$2');
    const nome =
      abbrev === l.corso
        ? `<b>${cuciture(l.corso)}</b>`
        : `<b class="pl-lez-pieno">${esc(l.corso)}</b>` +
          `<b class="pl-lez-breve">${cuciture(abbrev)}</b>`;
    const corpo = `${nome}<span class="pl-lez-meta">${meta}</span>`;
    const completo = esc(
      [`${l.inizio}–${l.fine}`, l.corso, l.sala, l.istruttore].filter(Boolean).join(' · '),
    );
    // Il colore è una classe e non uno stile inline: così la palette resta in
    // un foglio di stile e non si moltiplica in cento attributi `style`.
    const cat = (l.disciplina && categorie[l.disciplina]) || 'nessuna';
    const classi = `pl-lez cat-${esc(cat)}`;
    // Resta un `<a>` con un href vero: senza JavaScript porta alla scheda, con
    // JavaScript il click apre il popup. Un `<button>` qui perderebbe il link.
    return l.disciplina
      ? `<a class="${classi}" ${attributi(l)} title="${completo}" href="/discipline/${esc(l.disciplina)}">${corpo}</a>`
      : `<article class="${classi}" ${attributi(l)} title="${completo}">${corpo}</article>`;
  };

  // ─── La griglia della settimana ────────────────────────────────────────
  const slot = slotDi(lezioni);
  const mappa = perSlot(lezioni);

  const tabella = `
    <div class="pl-tab" role="table" aria-label="Orario settimanale dei corsi">
      <div class="pl-tab-testa" role="row">
        <span class="pl-tab-ora" role="columnheader"><span class="sr-only">Ora</span></span>
        ${giorniAttivi
          .map(
            (g) =>
              // Tre forme dello stesso giorno, il CSS scopre quella che sta
              // nella colonna: "L" a 360px, "Lun" a 480, "Lunedì" da 1024.
              // Nascondere le altre con `aria-hidden` invece di renderne una
              // sola tiene la lettura vocale su una parola intera.
              `<span class="pl-giorno-testa" role="columnheader">` +
              `<b aria-hidden="true">${g.iniziale}</b>` +
              `<i aria-hidden="true">${g.breve}</i>` +
              `<span>${g.nome}</span>` +
              `</span>`,
          )
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

  // La vista a un giorno per volta non c'è più. Mostrava una lista sola su
  // telefono e obbligava a toccare sei pulsanti per farsi un'idea della
  // settimana: chi guarda un planning vuole sapere *quando* può venire, e
  // quella domanda si risponde solo vedendo i giorni accanto. Ora la griglia è
  // una, e sotto i 1024px diventa compatta invece di trasformarsi in un elenco.

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

  return avviso + barra + tabella;
}

/** Numero di colonne, per la variabile CSS della tabella. */
export function colonneAttive(lezioni: Lezione[]): number {
  return giorniDi(lezioni || []).length || 6;
}
