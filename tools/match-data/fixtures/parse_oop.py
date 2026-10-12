import csv, io, re, sys, json, unicodedata, datetime, collections
SRC = sys.argv[1]; OUT = sys.argv[2]
WD = {'ΔΕΥ':0,'ΔΕΥΤ':0,'ΤΡ':1,'ΤΡΙ':1,'ΤΡΙΤ':1,'ΤΕΤ':2,'ΠΕΜ':3,'ΠΑΡ':4,'ΣΑΒ':5,'ΚΥΡ':6}
WDFULL = {'ΔΕΥΤΕΡΑ':0,'ΤΡΙΤΗ':1,'ΤΕΤΑΡΤΗ':2,'ΠΕΜΠΤΗ':3,'ΠΑΡΑΣΚΕΥΗ':4,'ΣΑΒΒΑΤΟ':5,'ΚΥΡΙΑΚΗ':6}
GREEK_LOOK = str.maketrans({'Μ':'M','Ε':'E','Ν':'N','Χ':'X','Α':'A','Ο':'O','Τ':'T','Ρ':'P','Ι':'I','Δ':'D'})

def sections(path):
    cur=None; out=[]
    for line in open(path, encoding='utf-8'):
        line=line.rstrip('\n')
        if line.startswith('## Sheet name:'):
            cur=(line.split(':',1)[1].strip(), []); out.append(cur)
        elif cur is not None:
            cur[1].append(next(csv.reader([line])) if line.strip() else [])
    return out

def tab_date(name):
    m=re.match(r'^\s*([^\d\s]+)\s*(\d{1,2})\s*/\s*(\d{1,2})\s*$', name)
    if not m: return None
    wd,d,mo=m.group(1),int(m.group(2)),int(m.group(3))
    y=2026 if 8<=mo<=12 else 2027
    return wd, datetime.date(y,mo,d)

def parse_time(s):
    m=re.search(r'(\d{1,2})\s*[.:]\s*(\d{2})', s or '')
    return f"{int(m.group(1)):02d}:{m.group(2)}" if m else None

def norm_key(s):
    s=unicodedata.normalize('NFD',s)
    s=''.join(c for c in s if not unicodedata.combining(c)).lower().replace('ς','σ')
    return re.sub(r'\s+',' ',s).strip()

def split_name(n):
    n=re.sub(r'\s+',' ',n.strip()); parts=n.split(' ',1)
    return parts[0], (parts[1] if len(parts)>1 else '')

def parse_side(raw):
    players=[p.strip() for p in raw.split('/')] if '/' in raw else [raw.strip()]
    res=[]; flags=set()
    for p in players:
        sn,fn=split_name(p)
        if not fn: flags.add('first_name_missing')
        if re.search(r'[A-Za-z]',p): flags.add('latin_name')
        res.append({'surname':sn,'first':fn,'key':norm_key(sn+(' '+fn if fn else ''))})
    return res, flags, ('/' in raw)

def parse_cat(raw):
    flags=set()
    if re.search('[Μ]',raw): flags.add('greek_mu_in_category')
    s=raw.translate(GREEK_LOOK).upper(); s=re.sub(r'\s*/\s*','/',s); s=re.sub(r'\s+',' ',s).strip()
    m=re.match(r'^(MD|WD|XD|MIXED|WOMEN|M|W)\b\s*(.*)$',s)
    if m:
        g,rest=m.group(1),m.group(2)
        disc={'MD':'MD','WD':'WD','XD':'XD','MIXED':'XD','WOMEN':'WS','M':'MS','W':'WS'}[g]
    else:
        rest=s; disc='MS'; flags.add('gender_missing')
    rest=rest.strip()
    mr=re.match(r'^ROOK(?:IES)?\s*(\d)$',rest)
    if mr: level=f'ROOKIES {mr.group(1)}'
    elif rest in ('MED/ADV','MED ADV'): level='MED/ADV'
    elif rest=='MED': level='MEDIUM'
    elif rest=='': level='OPEN'
    else: level=rest
    return disc,level,flags

def valid_set(a,b):
    hi,lo=max(a,b),min(a,b)
    return (hi==6 and lo<=4) or (hi==7 and lo in (5,6))
def valid_tb(a,b):
    hi,lo=max(a,b),min(a,b)
    return hi>=10 and hi-lo>=2 and (hi==10 or hi-lo==2)

def parse_score(raw):
    flags=set(); s=raw.strip().lower()
    if not s: return [],'scheduled',None,flags,(0,0)
    if s=='wo' or s.startswith('wo'):
        flags.add('walkover_winner_unknown'); return [],'walkover',None,flags,(0,0)
    inc='tbc' in s
    s=s.replace('tbc','').strip()
    toks=s.split(); sets=[]; i=0
    while i<len(toks):
        t=toks[i]
        if '-' in t:
            a,b=t.split('-',1)
            if len(a)==2 and len(b)==2 and a.isdigit() and b.isdigit() and valid_set(int(a[0]),int(a[1])) and valid_set(int(b[0]),int(b[1])):
                sets.append({'g':[int(a[0]),int(a[1])],'tb':False}); sets.append({'g':[int(b[0]),int(b[1])],'tb':False})
            elif a.isdigit() and b.isdigit():
                sets.append({'g':[int(a),int(b)],'tb':True})
            else: flags.add('unparsed_score')
        elif t.isdigit() and len(t)==2 and valid_set(int(t[0]),int(t[1])):
            sets.append({'g':[int(t[0]),int(t[1])],'tb':False})
        elif t.isdigit() and i+1<len(toks) and toks[i+1].isdigit():
            sets.append({'g':[int(t),int(toks[i+1])],'tb':True}); i+=1
        else: flags.add('unparsed_score')
        i+=1
    w=[0,0]
    for k,st in enumerate(sets):
        a,b=st['g']
        ok = valid_tb(a,b) if st['tb'] else valid_set(a,b)
        if st['tb'] and k<2: ok=False
        if not ok and not (inc and k==len(sets)-1): flags.add('implausible_set')
        w[0 if a>b else 1]+= (a!=b)
    if inc:
        flags.discard('unparsed_score'); flags.add('incomplete_score'); return sets,'incomplete',None,flags,tuple(w)
    winner=None
    if max(w)==2 and len(sets)<=3 and not(w[0]==w[1]): winner=1 if w[0]==2 else 2
    else: flags.add('invalid_match_outcome')
    if len(sets)==3 and not sets[2]['tb'] and False: pass
    return sets,'completed',winner,flags,tuple(w)

def main():
    secs=sections(SRC); rows=[]; tabinfo=[]
    for name,lines in secs:
        td=tab_date(name)
        if not td: tabinfo.append((name,None,None,None)); continue
        wd,date=td
        venue=None; title=None; hdr=None; hdr_i=None
        for i,r in enumerate(lines):
            cells=[c.strip() for c in r]
            if any(c=='ΩΡΑ' for c in cells): hdr=cells; hdr_i=i; break
            for c in cells:
                if re.search(r'TENNIS',c.upper()): venue=c
                elif re.search(r'\d{1,2}\s*/\s*\d{1,2}',c) and title is None: title=c
        tabflags=set()
        if WD.get(wd) is None: tabflags.add('weekday_unknown')
        elif WD[wd]!=date.weekday(): tabflags.add('weekday_mismatch')
        if title:
            m=re.search(r'(\d{1,2})\s*/\s*(\d{1,2})',title)
            if m and (int(m.group(1)),int(m.group(2)))!=(date.day,date.month): tabflags.add('title_date_mismatch')
        tabinfo.append((name,date,venue,title))
        if not hdr: continue
        def col(*names):
            for n in names:
                if n in hdr: return hdr.index(n)
        ci=dict(t=col('ΩΡΑ'),c=col('ΚΑΤΗΓΟΡΙΑ'),p1=col('PLAYER 1','ΠΑΙΚΤΗΣ 1'),p2=col('PLAYER 2','ΠΑΙΚΤΗΣ 2'),s=col('ΑΠΟΤΕΛΕΣΜΑ'))
        prev=None
        for r in lines[hdr_i+1:]:
            cells=[c.strip() for c in r]+['']*20
            g=lambda k: cells[ci[k]] if ci[k] is not None else ''
            t=parse_time(g('t')); p1,p2=g('p1'),g('p2')
            if t: pass
            if not p1 and not p2:
                if t: prev=t
                continue
            f=set(tabflags)
            if not t:
                t=prev; f.add('time_inherited' if prev else 'time_missing')
            else: prev=t
            if not p1 or not p2: f.add('missing_player')
            disc,level,cf=parse_cat(g('c')); f|=cf
            if not g('c'): f.add('category_missing')
            s1,f1,d1=parse_side(p1); s2,f2,d2=parse_side(p2); f|=f1|f2
            if d1!=d2: f.add('side_type_mismatch')
            if d1 or d2:
                if disc in ('MS','WS'):
                    disc={'MS':'MD','WS':'WD'}[disc]; f.add('discipline_from_slash')
            elif disc in ('MD','WD','XD'): f.add('discipline_side_mismatch')
            sets,status,winner,sf,w=parse_score(g('s')); f|=sf
            k1='+'.join(sorted(p['key'] for p in s1)); k2='+'.join(sorted(p['key'] for p in s2))
            fp='|'.join([date.isoformat(),disc,level,k1,k2] if False else [date.isoformat(),disc,level]+sorted([k1,k2]))
            rows.append(dict(tab=name,date=date.isoformat(),time=t or '',venue=venue or '',discipline=disc,level=level,
              side1=p1,side2=p2,score_raw=re.sub(r'\s+',' ',g('s')),sets=json.dumps(sets),sets_won=f'{w[0]}-{w[1]}',
              winner=winner or '',players=json.dumps({'side1':s1,'side2':s2},ensure_ascii=False),cat_raw=g('c'),status=status,fingerprint=fp,flags=f,_dk=(disc,level,tuple(sorted([k1,k2])),re.sub(r'\s+',' ',g('s')).lower()),
              _s1=[p['surname'] for p in s1],_f1=[p['first'] for p in s1],_s2=[p['surname'] for p in s2],_f2=[p['first'] for p in s2]))
    maj=collections.Counter(r['venue'] for r in rows).most_common(1)[0][0]
    seen={}
    for r in rows:
        if r['venue']!=maj: r['flags'].add('other_tournament')
        k=r['_dk']
        if k in seen and r['score_raw']: r['flags'].add('possible_duplicate'); r['dup_of']=seen[k]
        elif r['score_raw']: seen[k]=f"{r['tab']}"
    cols=['tab','date','time','venue','discipline','level','side1','side2','score_raw','sets','sets_won','winner','status','fingerprint','players','flags']
    with open(OUT+'/matches.csv','w',newline='',encoding='utf-8') as fh:
        w=csv.writer(fh); w.writerow(cols)
        for r in rows: w.writerow([';'.join(sorted(r['flags'])) if c=='flags' else r[c] for c in cols])
    # names file
    # summary
    st=collections.Counter(r['status'] for r in rows)
    print('MAJORITY VENUE:',maj); print('TABS:',len(tabinfo)); print('MATCHES:',len(rows),dict(st))
    for n,d,v,t in tabinfo: print('  tab',repr(n),d,'|',v,'|title:',t)
    print('FLAGGED:')
    for r in rows:
        if r['flags']: print(' ',r['tab'],r['time'],r['side1'],'v',r['side2'],'|',r['score_raw'],'->',sorted(r['flags']),r.get('dup_of',''))
    cm=collections.Counter((r['cat_raw'],r['discipline'],r['level']) for r in rows)
    print('CATEGORY MAP'); [print(' ',k,v) for k,v in sorted(cm.items())]
    fm=collections.Counter(re.sub(r'\d','9',r['score_raw']) for r in rows)
    print('SCORE FORMATS'); [print(' ',repr(k),v) for k,v in fm.items()]
    for r in rows:
        if r['score_raw']: print('  ',r['score_raw'],'=>',r['sets'],r['sets_won'],'w',r['winner'],r['status'])
if __name__=='__main__': main()
