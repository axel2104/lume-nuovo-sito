/** Testi e menu del totem: quelli di serie e l'unione con quanto scritto in Keystatic (Testi delle pagine → Totem). Nessun DOM: si testa con `node --test`. */

export const VISTE = ['centro', 'abbonamenti', 'corsi', 'prova', 'scuolanuoto'];

export const PREDEFINITI = {
  attesaSopra: 'Benvenuto in',
  attesaTocca: 'Tocca per scoprire',
  menuTitolo: 'Cosa vuoi scoprire?',
  tessere: [
    { chiave: 'centro', titolo: 'Il centro', sotto: 'Servizi e orari', foto: '/media/gym1.jpg' },
    { chiave: 'abbonamenti', titolo: 'Abbonamenti', sotto: 'Piani e prezzi', foto: '/media/weights.jpg' },
    { chiave: 'corsi', titolo: 'Corsi della settimana', sotto: 'Cosa c’è in programma', foto: '/media/reformer.jpg' },
    { chiave: 'prova', titolo: 'Pass prova', sotto: '7 giorni a 15 €', foto: '/media/crossfit.jpg' },
    { chiave: 'scuolanuoto', titolo: 'Scuola nuoto', sotto: 'Bambini e ragazzi, 3–18 anni', foto: '' }, // foto vuota = quella del centro
  ],
  centroOrari: 'Orari di apertura',
  abbonamentiNota: 'Tocca una formula per attivarla online.',
  corsiNota: 'Orario della settimana tipo: per prenotare usa l’app o chiedi in reception.',
  corsiVuoto: 'Nessun corso in programma: chiedi in reception.',
  provaTesto: 'Sala pesi, corsi, acqua, CrossFit e Reformer per una settimana.',
  provaTitolo: 'Prova Lume per 7 giorni',
  provaSotto: 'A 15 €, senza vincoli di rinnovo. Inquadra il codice con la fotocamera.',
  scuolaNuotoTesto: 'Tocca la fascia d’età di tuo figlio.',
};

const testo = (v, predefinito) => (typeof v === 'string' && v.trim() ? v.trim() : predefinito);

/**
 * Keystatic non salva i campi vuoti e un campo può mancare del tutto: ogni voce ricade sul valore di serie.
 * `foto(percorso)` trasforma la foto scelta nell'editor in un indirizzo servibile (la risolve la pagina, in build).
 */
export function unisci(json, foto = (_percorso) => '') {
  const j = json && typeof json === 'object' ? json : {};
  const out = { ...PREDEFINITI };
  for (const k of Object.keys(PREDEFINITI)) if (k !== 'tessere') out[k] = testo(j[k], PREDEFINITI[k]);
  const scelte = Array.isArray(j.tessere) ? j.tessere.filter((t) => VISTE.includes(t?.chiave)) : [];
  // Nessuna tessera valida = menu di serie. Una chiave ripetuta conta una volta sola.
  const viste = scelte.length ? [...new Set(scelte.map((t) => t.chiave))].map((c) => scelte.find((t) => t.chiave === c)) : PREDEFINITI.tessere;
  out.tessere = viste.map((t) => {
    const base = PREDEFINITI.tessere.find((x) => x.chiave === t.chiave);
    return {
      chiave: t.chiave,
      titolo: testo(t.titolo, base.titolo),
      sotto: testo(t.sotto, base.sotto),
      foto: (typeof t.foto === 'string' && t.foto && foto(t.foto)) || base.foto,
    };
  });
  return out;
}
