/**
 * I piani e le loro formule di pagamento.
 *
 * ─── Perché le attività non stanno dentro la formula ──────────────────────
 *
 * Sul portale PerfectGym ogni combinazione piano-formula è una scheda a sé, e
 * ognuna ripete l'intero elenco delle attività: tre volte per piano, nove in
 * tutto. Quella duplicazione è già divergita, e si vede — sul listino da cui
 * sono trascritti questi dati, il GOLD annuale in soluzione unica aveva perso
 * la sospensione gratuita che l'annuale a rate aveva, e il GOLD mensile aveva
 * perso lo SHAPE che il piano da 40 € in meno teneva. Nessuno l'aveva deciso:
 * sono tre elenchi mantenuti a mano che hanno preso strade diverse.
 *
 * Qui la separazione è quella vera: **cosa puoi fare** dipende dal piano,
 * **come paghi e a cosa ti impegni** dipende dalla formula. Così la stessa
 * divergenza non può ripetersi, perché non c'è un secondo posto dove scrivere
 * la stessa cosa.
 */
import type { CollectionEntry } from 'astro:content';

export type Piano = CollectionEntry<'abbonamenti'>;
export type Formula = Piano['data']['formule'][number];

/**
 * Le tre formule, nell'ordine in cui si presentano.
 *
 * L'ordine non è neutro: si parte dall'annuale perché è quello che conviene e
 * quello che il club preferisce, e si finisce col mensile, che è la via
 * d'uscita per chi non vuole impegnarsi. Invertirlo significherebbe mostrare
 * per primo il prezzo più alto a dodici mesi.
 */
export const FORMULE = [
  { id: 'annuale', label: 'Soluzione unica', nota: 'la più conveniente' },
  { id: 'rate', label: 'Dilazionato', nota: '12 rate' },
  { id: 'mensile', label: 'Mensile', nota: 'senza vincolo' },
] as const;

export type IdFormula = (typeof FORMULE)[number]['id'];

/** La formula `id` di un piano, o `undefined` se quel piano non la offre. */
export function formulaDi(piano: Piano, id: IdFormula): Formula | undefined {
  return piano.data.formule.find((f) => f.id === id);
}

/**
 * Quanto costa un anno con questa formula, per poter confrontare mele con mele.
 *
 * Un prezzo mensile e un prezzo annuale non si confrontano guardandoli: 90 €
 * al mese sembra meno di 675 € e sono 405 € in più. La quota di attivazione ci
 * entra perché si paga in tutte le formule e in tutte una volta sola.
 */
export function costoPrimoAnno(piano: Piano, formula: Formula): number {
  const mesi = formula.periodo === 'mese' ? 12 : 1;
  return formula.prezzo * mesi + piano.data.attivazione;
}

/**
 * Il piano più economico che offre una certa formula.
 *
 * Serve per il rimando: il Sala Pesi non ha un mensile, e invece di lasciare
 * un vuoto la pagina indica dove andare. Calcolato e non scritto nei
 * contenuti, perché una frase scritta a mano che nomina un piano è la prima
 * cosa che resta indietro quando i piani cambiano.
 */
export function pianoPiuEconomicoCon(piani: Piano[], id: IdFormula): Piano | undefined {
  return piani
    .filter((p) => formulaDi(p, id))
    .sort((a, b) => formulaDi(a, id)!.prezzo - formulaDi(b, id)!.prezzo)[0];
}

/**
 * Le righe della tabella comparativa: l'unione delle attività di tutti i piani,
 * nell'ordine in cui compaiono nel piano più ricco.
 *
 * Prima esisteva una tassonomia fissa in `tassonomie.ts` e ogni piano diceva
 * quali righe includeva. Due elenchi da tenere allineati, e la tabella poteva
 * mostrare una riga che nessuna scheda mostrava. Derivandola non c'è niente da
 * allineare: se una voce non è in nessun piano, la riga non esiste.
 */
export function righeConfronto(piani: Piano[]): string[] {
  const ordinate = [...piani].sort((a, b) => b.data.attivita.length - a.data.attivita.length);
  const viste = new Set<string>();
  const righe: string[] = [];
  for (const p of ordinate) {
    for (const voce of p.data.attivita) {
      if (viste.has(voce)) continue;
      viste.add(voce);
      righe.push(voce);
    }
  }
  return righe;
}

/** Il piano include questa attività? */
export function include(piano: Piano, voce: string): boolean {
  return piano.data.attivita.includes(voce);
}

/**
 * Sposta al centro della fila il piano in evidenza, lasciando gli altri
 * nell'ordine deciso nel CMS.
 *
 * La prima scheda è quella che si legge per prima, e aprire dal piano più
 * caro fa sembrare caro tutto il resto: il piano consigliato lavora meglio
 * in mezzo, con un prezzo più basso a sinistra a fargli da termine di
 * paragone. Su /abbonamenti la griglia lo dà già per scontato — la colonna
 * centrale è più larga delle altre (`1fr 1.14fr 1fr`), e finché il
 * consigliato stava in testa quella larghezza andava alla scheda sbagliata.
 *
 * Sotto le tre schede un centro non c'è, e l'ordine resta com'è.
 */
export function alCentro<T>(piani: T[], inEvidenza: (p: T) => boolean): T[] {
  if (piani.length < 3) return piani;
  const i = piani.findIndex(inEvidenza);
  if (i < 0) return piani;
  const centro = Math.floor(piani.length / 2);
  const resto = piani.filter((_, j) => j !== i);
  return [...resto.slice(0, centro), piani[i], ...resto.slice(centro)];
}

/**
 * Cosa questo piano aggiunge rispetto al piano immediatamente più piccolo che
 * contiene per intero.
 *
 * Le schede mostrano il delta e non l'elenco completo: fra All Lume e GOLD ci
 * sono sei voci di differenza su tredici, e tre elenchi interi affiancati
 * costringono a leggerli riga per riga per trovarle. L'elenco completo resta
 * nella tabella comparativa.
 *
 * ─── Perché il confronto non è con la scheda precedente ───────────────────
 *
 * Perché l'ordine in cui si mostrano i piani non è l'ordine in cui si
 * contengono. Il listino si presenta All Lume, GOLD, Sala Pesi — una scelta
 * commerciale, il piano da vendere per primo davanti — ma il Sala Pesi è il
 * più piccolo dei tre. Confrontando con la scheda precedente, la sua scheda
 * annunciava «tutto di All Lume GOLD, più» seguito da un elenco vuoto: la
 * promessa esattamente rovesciata, su una pagina di prezzi.
 *
 * Qui il riferimento si cerca nei dati: fra i piani realmente **contenuti** in
 * questo, il più grande. Se non ce n'è nessuno, il piano è il più piccolo e la
 * scheda mostra tutto quello che comprende. Riordinare le schede dal CMS non
 * può più produrre una frase falsa.
 */
export function sintesiVoci(
  piani: Piano[],
  indice: number,
): { base?: Piano; voci: string[] } {
  const mio = piani[indice];

  // Fuori da una catena, ogni scheda si legge da sola: elenco intero.
  if (!eUnaCatena(piani)) return { voci: [...mio.data.attivita] };

  const riferimento = piani[indice - 1];
  if (!riferimento) return { voci: [...mio.data.attivita] };

  const sue = new Set(riferimento.data.attivita);
  return { base: riferimento, voci: mio.data.attivita.filter((v) => !sue.has(v)) };
}

/**
 * L'ordine in cui si mostrano i piani è una catena di contenimento? Cioè ogni
 * piano contiene per intero quello che lo precede?
 *
 * Da questo dipende come si leggono le schede, e non è una finezza.
 *
 * **Quando è una catena** — Sala Pesi, All Lume, GOLD — ha senso raccontare il
 * delta: «tutto di Sala Pesi, più i corsi», «tutto di All Lume, più la piscina
 * e il CrossFit». Il lettore costruisce il piano leggendo da sinistra a
 * destra, e non deve confrontare tre elenchi quasi identici per trovare le
 * differenze.
 *
 * **Quando non lo è** — Sala Pesi, GOLD, All Lume, l'ordine commerciale scelto
 * dal cliente — il delta si rompe: GOLD e All Lume finiscono a dire entrambi
 * «tutto di Sala Pesi, più», uno con otto voci e l'altro con due, e chi
 * confronta le due schede accanto non riceve nessun aiuto perché deve unire
 * mentalmente ciascuna col primo piano. Lì ogni scheda mostra il suo elenco
 * completo: più righe, ma ognuna è una risposta intera. Il confronto esaustivo
 * resta comunque nella tabella sotto.
 *
 * Calcolato e non deciso a mano perché l'ordine si cambia dal CMS: riordinare
 * le schede non deve poter produrre una pagina che si contraddice.
 */
export function eUnaCatena(piani: Piano[]): boolean {
  if (piani.length < 2) return false;
  return piani.every((p, i) => {
    if (i === 0) return true;
    const mie = new Set(p.data.attivita);
    return piani[i - 1].data.attivita.every((v) => mie.has(v));
  });
}

/** Formattazione italiana degli importi: mai `toFixed`, che scrive il punto. */
export const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

/**
 * Il pass prova, nei suoi due prezzi.
 *
 * `pieno` è quello di listino, quello che vedono tutti. `referral` è quello di
 * chi arriva invitato da un socio, e **non va scritto nelle pagine pubbliche**:
 * dirlo a tutti significa dire a tutti che esiste una porta più economica, e da
 * quel momento nessuno paga più 15 €. Vive in due soli posti — dentro il link
 * di invito (`/prova?ref=…`) e nel form referral dopo che il check ha
 * riconosciuto un socio.
 *
 * ⚠️ Sono cifre da **mostrare**, non da applicare. `ref` sta nella query string
 * e chiunque può scriverselo: il prezzo che si paga davvero lo decide n8n sul
 * lead, come già fa per `utm_source`. Il sito non ha modo di verificarlo.
 */
export const PASS = { pieno: 15, referral: 5 } as const;

/**
 * Quanto vale un invito per chi lo fa: 50 € sul proprio rinnovo.
 *
 * Al contrario del prezzo ridotto del pass, questo **va detto ad alta voce**:
 * è l'incentivo, non lo sconto. Nasconderlo vorrebbe dire avere un referral che
 * nessuno sa di poter usare.
 *
 * ⚠️ Il premio scatta quando la persona invitata **si iscrive**, non quando fa
 * la settimana di prova: 50 € per un pass da 5 € sarebbe una perdita a ogni
 * invito. Il momento esatto lo decide n8n incrociando `utm.ref` col contratto,
 * vedi `docs/N8N.md §9`; il sito non ha modo di sapere se l'iscrizione è
 * avvenuta e non prova a indovinarlo.
 */
export const PREMIO_INVITO = 50;
