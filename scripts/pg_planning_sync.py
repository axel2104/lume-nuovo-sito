"""Riscrive il blocco `planning:` dei centri dalla copia PerfectGym (pg_planning_fetch.py).
Settimana tipo = ciò che c'è in almeno metà delle settimane lette (lezioni cancellate escluse).
Uso: python scripts/pg_planning_sync.py pg.json            # solo report
     python scripts/pg_planning_sync.py pg.json --scrivi   # riscrive src/content/centri/*.md"""
import collections, datetime as dt, json, re, sys, yaml
from pathlib import Path
from zoneinfo import ZoneInfo

ROMA = ZoneInfo('Europe/Rome')
CENTRI = {1: 'macerata', 2: 'montecassiano', 3: 'urban', 4: 'piediripa'}
DIR = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'centri'
norm = lambda s: re.sub(r'\W+', '', s.lower())

# Fuori dal planning del sito (scuola nuoto ragazzi, nuoto libero: hanno le loro pagine)
ESCLUSI = {norm(x) for x in ['Nuoto Libero', 'Scuola Nuoto Bisettimanale', 'Scuola Nuoto Monosettimanale',
    'Scuola Nuoto Ragazzi Bisettimanale', 'Scuola Nuoto Ragazzi Monosettimanale', 'PreAgonismo',
    'Acqua Nido 03-20 mesi', 'Acqua Nido 21-42 mesi']}
# nome PerfectGym -> nome mostrato (dove differisce)
ALIAS = {'CrossFit (classe)': 'CrossFit', 'WBS (Well Back System)': 'WBS', 'Pilates (LesMills)': 'LesMills Pilates',
    'LesMills RPM VIRTUAL': 'LesMills RPM Virtual', 'LesMills SHAPES': 'LesMills Shapes', 'LesMills DANCE': 'LesMills Dance',
    'Pilates intermedio': 'Pilates Intermedio', 'Hyrox class': 'Hyrox Class', 'Yoga HATHA': 'Yoga Hatha',
    'LesMills Aquawork': 'LesMills AquaWork', 'LesMills Aquatonus': 'LesMills Acquatonus', 'Acqua Mamma': 'AcquaMAMMA',
    'Scuola Nuoto Adulti - Avanzato': 'Nuoto Adulti Avanzato', 'Scuola Nuoto Adulti - Intermedio': 'Nuoto Adulti Intermedio',
    'Scuola Nuoto Adulti - base': 'Nuoto Adulti Base', 'Scuola Nuoto Adulti MASTER': 'Nuoto Adulti Master'}
RECUPERI = {'Recuperi Scuola Nuoto Bisettimanale Vasca Grande': ('Recupero Bilezione', 'Vasca grande'),
    'Recuperi Scuola Nuoto Bisettimanale Vasca Piccola': ('Recupero Bilezione', 'Vasca piccola'),
    'Recuperi Scuola Nuoto Monosettimanale Vasca Grande': ('Recupero Monolezione', 'Vasca grande'),
    'Recuperi Scuola Nuoto Monosettimanale Vasca Piccola': ('Recupero Monolezione', 'Vasca piccola')}
DISC_FISSE = {'Reformer Intermedio': 'reformer', 'LesMills BodyCombat': 'lesmills-bodycombat', 'LesMills AquaWork': 'lesmills-aqua', 'LesMills AquaDynamic': 'lesmills-aqua',
    'LesMills Acquatonus': 'lesmills-aqua', 'Nuoto Adulti Avanzato': 'scuola-nuoto-adulti', 'Nuoto Adulti Intermedio': 'scuola-nuoto-adulti',
    'Nuoto Adulti Base': 'scuola-nuoto-adulti', 'Nuoto Adulti Master': 'scuola-nuoto-adulti', 'LesMills Pilates': 'pilates-lesmills',
    'Hybrid Class': None, 'Hyrox Class': None, 'Functional Training Hyrox': None}


def leggi_md(c):
    t = (DIR / f'{c}.md').read_text(encoding='utf-8')
    return t, (yaml.safe_load(t.split('---')[1]).get('planning') or [])


def mappa_discipline():
    m = {}
    for c in CENTRI.values():
        for l in leggi_md(c)[1]:
            if l.get('disciplina'):
                m.setdefault(norm(l['corso']), l['disciplina'])
    return m


def scheda(centro, pg, disc):
    """PG -> (corso, disciplina, sala, sezione) come lo mostra il sito."""
    if pg in RECUPERI:
        c, s = RECUPERI[pg]
        return c, None, s, 'Corsi di recupero'
    corso = ALIAS.get(pg, pg)
    d = DISC_FISSE[corso] if corso in DISC_FISSE else disc.get(norm(corso))
    sala = sez = None
    if corso.startswith('Nuoto Adulti'):
        sala, sez = 'Piscina', 'Scuola nuoto adulti'
    elif centro == 'montecassiano' and (corso.startswith(('Acqua', 'LesMills Aqua')) or corso == 'AcquaMAMMA'):
        sala, sez = 'Piscina', 'In acqua'
    elif centro == 'macerata' and corso in ('CrossFit', 'Hybrid Class', 'Strength and Conditioning'):
        sala, sez = 'Box CrossFit', 'CrossFit'
        if corso == 'Hybrid Class':
            d = 'crossfit'
    elif centro == 'piediripa' and corso in ('CrossFit', 'Hybrid Class', 'Calisthenics', 'Hyrox Class'):
        sala = 'Box Hyrox'
    return corso, d, sala, sez


def settimana_tipo(rows):
    sett = collections.defaultdict(collections.Counter)
    for x in rows:
        if x['is_deleted']:
            continue
        s = dt.datetime.fromisoformat(x['start_date']).astimezone(ROMA)
        e = dt.datetime.fromisoformat(x['end_date']).astimezone(ROMA)
        sett[s.date() - dt.timedelta(days=s.weekday())][(s.isoweekday(), s.strftime('%H:%M'), e.strftime('%H:%M'), x['corso'])] += 1
    n = len(sett)
    out = []
    for k in {k for w in sett.values() for k in w}:
        conta = sorted((w[k] for w in sett.values()), reverse=True)
        conta += [0] * (n - len(conta))
        out += [k] * conta[(n + 1) // 2 - 1]   # quante lezioni ci sono in almeno metà delle settimane
    return sorted(out), n


def q(s):
    return "'" + s.replace("'", "''") + "'"


def blocco(lez):
    r = ['planning:']
    for l in lez:
        r += [f"  - giorno: '{l['giorno']}'", f"    inizio: '{l['inizio']}'", f"    fine: '{l['fine']}'", f"    corso: {q(l['corso'])}"]
        if l.get('disciplina'):
            r.append(f"    disciplina: {l['disciplina']}")
        if l.get('sala'):
            r.append(f"    sala: {l['sala']}")
        if l.get('sezione'):
            r.append(f"    sezione: {q(l['sezione']) if ' ' in l['sezione'] else l['sezione']}")
    return '\n'.join(r) + '\n'


def main():
    pg = json.load(open(sys.argv[1], encoding='utf-8'))
    scrivi = '--scrivi' in sys.argv
    disc = mappa_discipline()
    senza_disc = set()
    for cid, c in CENTRI.items():
        testo, vecchie = leggi_md(c)
        tipo, n = settimana_tipo([x for x in pg if x['club_id'] == cid])
        nuove, saltati = [], collections.Counter()
        for g, i, f, nome in tipo:
            if norm(nome) in ESCLUSI:
                saltati[nome] += 1
                continue
            corso, d, sala, sez = scheda(c, nome, disc)
            if not d and sez is None and corso not in ('Hybrid Class', 'Hyrox Class', 'Functional Training Hyrox', 'Gentle Training'):
                senza_disc.add((c, corso))
            l = {'giorno': g, 'inizio': i, 'fine': f, 'corso': corso, 'disciplina': d, 'sala': sala, 'sezione': sez}
            nuove.append(l)
        k = lambda l: (int(l['giorno']), l['inizio'], l['fine'], norm(l['corso']))
        kv, kn = collections.Counter(map(k, vecchie)), collections.Counter(map(k, nuove))
        agg, tol = kn - kv, kv - kn
        print(f'\n=== {c}: {len(vecchie)} -> {len(nuove)} lezioni ({n} settimane lette) | +{sum(agg.values())} -{sum(tol.values())}')
        G = 'LMMGVSD'
        for lab, cn, src in (('+', agg, nuove), ('-', tol, vecchie)):
            for (g, i, f, nm), v in sorted(cn.items()):
                nome = next((l['corso'] for l in src if k(l) == (g, i, f, nm)), nm)
                print(f'  {lab} {G[g-1]} {i}-{f} {nome}' + (f' x{v}' if v > 1 else ''))
        if saltati:
            print('  (esclusi, non nel planning del sito):', dict(saltati))
        if scrivi:
            parti = re.split(r'(?m)^planning:\n(?:[ \t]+.*\n|\n)*', testo, maxsplit=1)
            assert len(parti) == 2, c
            t = parti[0] + blocco(nuove) + parti[1]
            (DIR / f'{c}.md').write_text(t, encoding='utf-8')
    if senza_disc:
        print('\nSenza disciplina (nessuna scheda collegata):', sorted(senza_disc))


main()
