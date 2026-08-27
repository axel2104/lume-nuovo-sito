/**
 * Test della matematica del planning: `node --test`, senza browser e senza
 * Astro.
 *
 *
 * Le condizioni sono calcolate prima e passate a `ok()`: è il modo più corto
 * per tenere le asserzioni leggibili quando il grosso del lavoro è preparare
 * i dati.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Node 22 spoglia i tipi da sé: i moduli TypeScript si importano direttamente,
// senza passaggi di compilazione e senza dipendenze in più. Funziona perché
// questi due file sono TypeScript e nient'altro — nessun import di Astro,
// nessun alias, nessun `astro:content`.
const { slotDi, perSlot, giorniDi, minuti, orario, firma, lezioniValide, corsiDi } = await import(
  '../src/config/planning.ts'
);
const { PLANNING_ESEMPIO } = await import('../src/data/planning-esempio.ts');

const ok = (condizione, messaggio) => test(messaggio, () => assert.ok(condizione, messaggio));

// ─── 1. Nessuna lezione si perde ─────────────────────────────────────────
// È il test che conta: la tabella è costruita leggendo `perSlot`, quindi se una
// lezione non finisce in nessuna casella diventa invisibile in pagina — e
// nessuno se ne accorge finché un iscritto non si presenta a un corso che non
// aveva visto.
for (const [centro, lez] of Object.entries(PLANNING_ESEMPIO)) {
  const valide = lezioniValide(lez);
  const mappa = perSlot(lez);
  const dentro = [...mappa.values()].reduce((n, v) => n + v.length, 0);
  ok(dentro === valide.length, `${centro}: tutte le ${valide.length} lezioni valide finiscono in una casella`);

  // Ogni chiave deve corrispondere a una fascia dichiarata da slotDi, altrimenti
  // la tabella disegna righe che non contengono niente e caselle orfane.
  const fasce = new Set(slotDi(lez).map((s) => s.inizio));
  const giorni = new Set(giorniDi(lez).map((g) => g.n));
  const orfane = [...mappa.keys()].filter((k) => {
    const [g, ora] = k.split('|');
    return !fasce.has(ora) || !giorni.has(Number(g));
  });
  ok(orfane.length === 0, `${centro}: nessuna casella fuori dalla tabella`);
}

// ─── 2. Le fasce sono ordinate e senza doppioni ──────────────────────────
const slot = slotDi(PLANNING_ESEMPIO.macerata);
const min = slot.map((s) => s.min);
ok(min.every((v, i) => i === 0 || v > min[i - 1]), 'le fasce sono in ordine crescente e senza doppioni');
ok(slot.every((s) => s.inizio === orario(s.min)), 'ogni fascia porta l’orario coerente col suo valore in minuti');

// ─── 3. Lo stacco marca solo i salti veri ────────────────────────────────
const conBuco = [
  { giorno: 1, inizio: '09:00', fine: '09:50', corso: 'Mattina' },
  { giorno: 1, inizio: '10:00', fine: '10:50', corso: 'Poco dopo' },
  { giorno: 1, inizio: '18:00', fine: '18:50', corso: 'Sera' },
];
const s3 = slotDi(conBuco);
ok(s3[0].stacco === false, 'la prima fascia non ha mai lo stacco');
ok(s3[1].stacco === false, 'dieci minuti di distacco non sono una pausa');
ok(s3[2].stacco === true, 'il salto dal mattino alla sera è segnato come pausa');

// ─── 4. Lezioni alla stessa ora restano tutte, in ordine ─────────────────
const parallele = [
  { giorno: 2, inizio: '18:30', fine: '19:25', corso: 'Zumba' },
  { giorno: 2, inizio: '18:30', fine: '19:00', corso: 'Core' },
  { giorno: 2, inizio: '18:30', fine: '19:00', corso: 'Balance' },
  { giorno: 3, inizio: '18:30', fine: '19:00', corso: 'Altro giorno' },
];
const casella = perSlot(parallele).get('2|18:30');
ok(casella.length === 3, 'tre lezioni alla stessa ora stanno nella stessa casella');
ok(
  casella.map((l) => l.corso).join(',') === 'Balance,Core,Zumba',
  'dentro la casella prima le più corte, poi in ordine alfabetico',
);
ok(perSlot(parallele).get('3|18:30').length === 1, 'giorni diversi non si mescolano');

// ─── 5. Dati sporchi non fanno cadere nulla ──────────────────────────────
const sporchi = [
  { giorno: 1, inizio: '25:00', fine: '26:00', corso: 'Ora impossibile' },
  { giorno: 1, inizio: '19:00', fine: '18:00', corso: 'Fine prima dell inizio' },
  { giorno: 9, inizio: '10:00', fine: '11:00', corso: 'Giorno inesistente' },
  { giorno: 1, inizio: '10:00', fine: '11:00', corso: '' },
  { giorno: 1, inizio: '10:00', fine: '11:00', corso: 'Buona' },
];
ok(lezioniValide(sporchi).length === 1, 'le lezioni malformate vengono scartate, la buona sopravvive');
ok(perSlot(sporchi).size === 1, 'una lezione malformata non crea una casella');
ok(Number.isNaN(minuti('99:99')) && Number.isNaN(minuti('')), 'minuti() restituisce NaN, non 0, su input non validi');

// ─── 6. La firma ignora l'ordine ─────────────────────────────────────────
const a1 = [{giorno:1,inizio:'09:00',fine:'10:00',corso:'X'},{giorno:2,inizio:'11:00',fine:'12:00',corso:'Y'}];
ok(firma(a1) === firma([...a1].reverse()), 'la firma non cambia se cambia l ordine');
ok(firma(a1) !== firma([{...a1[0], inizio:'09:30'}, a1[1]]), 'la firma cambia se cambia un orario');

// ─── 7. Il filtro corsi elenca tutto una volta sola ──────────────────────
const corsi = corsiDi(PLANNING_ESEMPIO.macerata);
ok(new Set(corsi).size === corsi.length, 'il filtro non ripete lo stesso corso');
ok(corsi.length > 0 && corsi.every(Boolean), 'nessuna voce vuota nel filtro dei corsi');
