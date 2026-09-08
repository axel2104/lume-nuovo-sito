/**
 * Controllo sull'HTML già costruito: `node --test` della stdlib, nessuna
 * dipendenza aggiunta. Gira dopo `npm run build`.
 *
 * Il video dell'hero parte da sé, e questo è il punto in cui è facile
 * spedire tre megabyte a tutti senza accorgersene: basta che qualcuno metta
 * un `src` (o un `preload` diverso da `none`) nel markup e il filmato del
 * primo centro si scarica a ogni visita, anche a chi ha chiesto meno
 * movimento, anche a chi naviga col risparmio dati — perché quelle due
 * condizioni le controlla il JavaScript, non l'HTML. Il markup deve restare
 * un contenitore vuoto: il `src` lo mette il client, se e quando decide.
 *
 * Il resto (che parta, che al termine passi al centro dopo) è comportamento
 * del browser e non si legge nell'HTML: qui si difende solo l'invariante che
 * rende innocuo il caso peggiore.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const clip = html.slice(html.indexOf('data-hero-clip'), html.indexOf('data-hero-clip') + 400);

test("l'hero della home ha il video dell'autoplay", () => {
  assert.ok(html.includes('data-hero-clip'), 'il <video> dell hero non è più in pagina');
  assert.ok(clip.includes('muted'), 'un video con audio non parte da sé: nessun browser lo permette');
  assert.ok(clip.includes('playsinline'), 'senza playsinline su iOS il video va a schermo pieno da sé');
});

test('il video dell hero non si scarica prima che il client lo decida', () => {
  assert.ok(clip.includes('preload="none"'), 'preload diverso da none: il filmato parte a ogni visita');
  assert.ok(
    !/\ssrc=/.test(clip.slice(0, clip.indexOf('>'))),
    'src nel markup: tre megabyte anche a chi ha chiesto meno movimento o il risparmio dati',
  );
});

test('le foto dei centri restano il fondo del riquadro', () => {
  // La foto è il fermo immagine: se sparisce, chi non vede il video (reduced
  // motion, risparmio dati, autoplay negato) trova un riquadro nero.
  assert.ok(html.includes('class="hero-slide is-attiva'), 'la prima foto del carosello non è più in pagina');
});
