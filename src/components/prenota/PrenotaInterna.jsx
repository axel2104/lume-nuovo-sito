/**
 * Calendario di prenotazione: mese a sinistra (solo i giorni con orari liberi sono cliccabili), orari del giorno a destra,
 * poi conferma. Stessa idea del Calendar di shadcn: react-day-picker + stile nostro (il sito non usa Tailwind).
 * Montato da prenotaInterna.client.js.
 */
import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { it } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import '../../styles/prenotaInterna.css';

const FUSO = 'Europe/Rome';
const giornoRoma = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: FUSO }); // YYYY-MM-DD in ora di Roma
const giornoLocale = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dataDi = (chiave) => { const [y, m, g] = chiave.split('-').map(Number); return new Date(y, m - 1, g); };
const oraDi = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
const lunga = (iso) => new Date(iso).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: FUSO });

export default function PrenotaInterna({ tipo, sede, slotIniziali, prefill = {}, meta = {}, onPrenotato, ricarica, token = null }) {
  const [slot, setSlot] = useState(slotIniziali);
  const liberi = useMemo(() => new Set(slot.map(giornoRoma)), [slot]);
  const giorniOrdinati = useMemo(() => [...liberi].sort(), [liberi]);
  const [giorno, setGiorno] = useState(() => dataDi(giorniOrdinati[0]));
  const [scelto, setScelto] = useState(null);
  const [dati, setDati] = useState({ nome: prefill.nome || '', cognome: prefill.cognome || '', email: prefill.email || '', cellulare: prefill.telefono || '' });
  const [privacy, setPrivacy] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [avviso, setAvviso] = useState('');
  const [fatto, setFatto] = useState(null);

  const chiaveGiorno = giorno ? giornoLocale(giorno) : '';
  const orari = slot.filter((s) => giornoRoma(s) === chiaveGiorno);
  const datiCompleti = !!token || !!(prefill.email && prefill.nome); // spostamento o dati dal form del sito: si conferma con un click
  const telefonica = tipo === 'chiamata';

  if (fatto) {
    return (
      <div className="pi pi-esito">
        <p className="pi-ok">{token ? 'Appuntamento spostato' : 'Appuntamento confermato'}</p>
        <p className="pi-scelta">{lunga(fatto.inizio)} alle {oraDi(fatto.inizio)}</p>
        <p className="pi-nota">{telefonica ? 'Ti chiameremo a quest’ora.' : 'Ti aspettiamo in sede.'} Ti scriviamo una mail di conferma.</p>
        {fatto.token && <p className="pi-link"><a href={`/prenota/gestisci?t=${fatto.token}`}>Sposta o disdici</a> · <a href={`/api/ics?t=${fatto.token}`}>Aggiungi al calendario</a></p>}
      </div>
    );
  }

  const conferma = async (ev) => {
    ev.preventDefault();
    setInvio(true);
    setErrore('');
    const corpo = token ? { t: token, inizio: scelto } : { tipo, sede, inizio: scelto, ...dati, messaggio: prefill.note || '', flusso: meta.flusso || 'prenota', utm: window.lumeGetUtm?.() || {}, vid: window.lumeGetVid?.() || '' };
    try {
      const r = await fetch(token ? '/api/sposta' : '/api/prenota', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        setFatto({ inizio: d.inizio, token: d.token });
        try { onPrenotato && onPrenotato({ uid: d.token }); } catch (e) { /* il tracciamento non deve fermare la conferma */ }
        return;
      }
      if (d.errore === 'slot_occupato') {
        // Normale: qualcuno ha preso l'orario mentre si compilava. Si ricaricano gli orari, non si "riprova".
        const nuovi = await ricarica().catch(() => []);
        setScelto(null);
        setSlot(nuovi);
        setAvviso(nuovi.length ? 'Questo orario è stato appena preso: scegline un altro.' : 'Non ci sono più orari liberi: chiama la sede e fissiamo insieme.');
        if (nuovi.length && !nuovi.some((s) => giornoRoma(s) === chiaveGiorno)) setGiorno(dataDi(giornoRoma(nuovi[0])));
      } else {
        setErrore(d.errore === 'troppe_prenotazioni' ? 'Hai già tre appuntamenti in programma: chiama la sede per modificarli.' : 'Controlla i dati inseriti e riprova.');
      }
    } catch {
      setErrore('Connessione assente: riprova tra poco.');
    }
    setInvio(false);
  };

  if (!slot.length) return <div className="pi"><p className="pi-avviso">{avviso || 'Non ci sono orari liberi: chiama la sede e fissiamo insieme.'}</p></div>;

  const campo = (nome, etichetta, tipoInput, richiesto, auto) => (
    <label className="pi-campo">
      <span>{etichetta}</span>
      <input name={nome} type={tipoInput} required={richiesto} autoComplete={auto} value={dati[nome]} onChange={(e) => setDati({ ...dati, [nome]: e.target.value })} />
    </label>
  );

  return (
    <div className="pi">
      {avviso && <p className="pi-avviso" role="status">{avviso}</p>}
      <div className="pi-colonne">
        <div className="pi-cal">
          <DayPicker
            mode="single"
            locale={it}
            weekStartsOn={1}
            selected={giorno}
            onSelect={(d) => { if (d) { setGiorno(d); setScelto(null); setAvviso(''); } }}
            disabled={(d) => !liberi.has(giornoLocale(d))}
            startMonth={dataDi(giorniOrdinati[0])}
            endMonth={dataDi(giorniOrdinati[giorniOrdinati.length - 1])}
            defaultMonth={giorno}
          />
        </div>
        <div className="pi-orari-col">
          <p className="pi-titolo">{giorno ? lunga(orari[0] || slot[0]) : 'Scegli un giorno'}</p>
          <div className="pi-lista" role="listbox" aria-label="Orari liberi">
            {orari.map((s) => (
              <button key={s} type="button" role="option" aria-selected={s === scelto} className="pi-ora" onClick={() => { setScelto(s); setAvviso(''); }}>{oraDi(s)}</button>
            ))}
          </div>
        </div>
      </div>

      {scelto && (
        <form className="pi-conferma" onSubmit={conferma}>
          <p className="pi-scelta">{lunga(scelto)} alle {oraDi(scelto)}</p>
          {!datiCompleti && (
            <div className="pi-dati">
              {campo('nome', 'Nome', 'text', true, 'given-name')}
              {campo('cognome', 'Cognome', 'text', false, 'family-name')}
              {campo('email', 'Email', 'email', true, 'email')}
              {campo('cellulare', 'Telefono', 'tel', true, 'tel')}
              <label className="pi-privacy">
                <input type="checkbox" required checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
                <span>Ho letto l’<a href="/privacy" target="_blank" rel="noopener">informativa privacy</a> e acconsento al trattamento dei dati per ricevere questo appuntamento.</span>
              </label>
            </div>
          )}
          {errore && <p className="pi-errore" role="alert">{errore}</p>}
          <button className="pi-invia" type="submit" disabled={invio}>{invio ? 'Un momento…' : token ? 'Conferma il nuovo orario' : 'Conferma appuntamento'}</button>
        </form>
      )}
    </div>
  );
}
