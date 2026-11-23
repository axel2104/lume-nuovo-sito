"""Legge da Supabase (copia PerfectGym nel CRM) le lezioni dei 4 centri e le salva in JSON.
Solo lettura. Chiavi dal .env.local del CRM (mai stampate). Uso: python scripts/pg_planning_fetch.py out.json [YYYY-MM-DD da] [a]"""
import json, sys, urllib.request, urllib.parse
ENV = r'C:\Users\Alex\Claude\lume-crm\.env.local'
env = dict(l.strip().split('=', 1) for l in open(ENV, encoding='utf-8') if '=' in l and not l.startswith('#'))
URL = env['NEXT_PUBLIC_SUPABASE_URL'].strip('"'); KEY = env['SUPABASE_SERVICE_ROLE_KEY'].strip('"')
def get(path):
    out, off = [], 0
    while True:
        r = urllib.request.Request(f'{URL}/rest/v1/{path}', headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Range': f'{off}-{off+999}'})
        rows = json.load(urllib.request.urlopen(r)); out += rows
        if len(rows) < 1000: return out
        off += 1000
da = sys.argv[2] if len(sys.argv) > 2 else '2026-11-30'
a = sys.argv[3] if len(sys.argv) > 3 else '2027-01-11'
tipi = {t['id']: t['name'] for t in get('pg_class_types?select=id,name')}
cl = get('pg_classes?select=id,class_type_id,club_id,club_zone_id,start_date,end_date,is_deleted,attendees_limit'
         f'&start_date=gte.{da}&start_date=lt.{a}&order=start_date')
for c in cl: c['corso'] = tipi.get(c['class_type_id'])
json.dump(cl, open(sys.argv[1], 'w'), ensure_ascii=False)
print(len(cl), 'lezioni')
