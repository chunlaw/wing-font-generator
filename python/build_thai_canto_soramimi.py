#!/usr/bin/env python3
"""
Thai -> Cantonese soramimi (空耳) mapping generator.

Idea: a Cantonese speaker reads the Chinese characters with their Cantonese
(Jyutping) pronunciation, and the result *sounds like* the Thai word.

Pipeline:
  1. Build a Cantonese syllable inventory from canto-lshk.csv. For every
     toneless Jyutping syllable, keep the most common character (lowest freq
     rank value) as its representative.
  2. Parse the Thai Paiboon romanisation into syllables, and each syllable
     into (initial, vowel, coda) over a shared phonetic feature space.
  3. For each Thai syllable, find the Cantonese syllable with the smallest
     phonetic distance, and emit its representative character.
  4. Concatenate per-syllable characters into a Cantonese "spelling" of the
     whole Thai word.

Tones are ignored on purpose -- this is just for fun (soramimi).
"""
import csv, re, unicodedata, os, sys

HERE      = os.path.dirname(os.path.abspath(__file__))
THAI_CSV  = os.path.join(HERE, "mappings", "thai-paiboon.csv")
CANTO_CSV = os.path.join(HERE, "mappings", "canto-lshk.csv")
OUT_CSV   = os.path.join(HERE, "mappings", "thai-canto-soramimi.csv")

# --------------------------------------------------------------------------
# Shared phonetic feature tables
# --------------------------------------------------------------------------
# Consonant features: (place, manner, aspirated)
# place:  lab=0 alv=1 pal=2 vel=3 glottal=4
CONS = {
    'b':  (0, 'stop', 0), 'p':  (0, 'stop', 1), 'm': (0, 'nas', 0),
    'f':  (0, 'fric', 0), 'w':  (0, 'app', 0),
    'd':  (1, 'stop', 0), 't':  (1, 'stop', 1), 'n': (1, 'nas', 0),
    's':  (1, 'fric', 0), 'l':  (1, 'app', 0),
    'z':  (1, 'aff', 0),  'c':  (1, 'aff', 1),
    'g':  (3, 'stop', 0), 'k':  (3, 'stop', 1), 'ng':(3, 'nas', 0),
    'gw': (3, 'stop', 0), 'kw': (3, 'stop', 1),
    'h':  (4, 'fric', 0), 'j':  (2, 'app', 0),
    '':   (-1,'none', 0),
}
MANNER_DIST = {
    ('stop','stop'):0.0, ('stop','aff'):0.3, ('stop','fric'):0.5,
    ('stop','nas'):0.9, ('stop','app'):0.8,
    ('aff','aff'):0.0, ('aff','fric'):0.3, ('aff','nas'):0.9, ('aff','app'):0.8,
    ('fric','fric'):0.0, ('fric','nas'):0.9, ('fric','app'):0.7,
    ('nas','nas'):0.0, ('nas','app'):0.6,
    ('app','app'):0.0,
}
def manner_d(a, b):
    return MANNER_DIST[(a, b)] if (a, b) in MANNER_DIST else MANNER_DIST[(b, a)]

def cons_dist(a, b):
    if a == b:
        return 0.0
    pa, ma, aspa = CONS[a]; pb, mb, aspb = CONS[b]
    if a == '' or b == '':                 # null vs a real consonant
        return 1.2
    d  = manner_d(ma, mb)
    d += 0.22 * abs(pa - pb)               # place difference
    if ma == mb == 'stop' and aspa != aspb:
        d += 0.12                          # aspiration mismatch is minor
    return d

# Vowel categories on a rough front->back / close grid: (front_back, height)
VOWEL = {
    'A':  (1, 0),   # open  a / aa
    'E':  (0, 1),   # e / ɛ
    'I':  (0, 2),   # i
    'O':  (2, 1),   # o / ɔ
    'U':  (2, 2),   # u
    'OE': (1, 1),   # ə / oe / eo
    'YU': (1, 2),   # ʉ / y (jyutping yu)
}
def vowel_dist(a, b):
    if a == b:
        return 0.0
    fa, ha = VOWEL[a]; fb, hb = VOWEL[b]
    return 0.35 * abs(fa - fb) + 0.35 * abs(ha - hb)

# Coda categories. p/t/k stops, m/n/ng nasals, i/u offglides, '' none.
def coda_dist(a, b):
    if a == b:
        return 0.0
    stops = {'p','t','k'}; nasal = {'m','n','ng'}; glide = {'i','u'}
    if a in stops and b in stops:   return 0.4
    if a in nasal and b in nasal:   return 0.4
    if a in glide and b in glide:   return 0.5
    if '' in (a, b):                return 1.0   # gaining/losing a coda
    return 1.1                                   # stop<->nasal etc.

# --------------------------------------------------------------------------
# Cantonese inventory
# --------------------------------------------------------------------------
CANTO_INITIALS = ['ng','gw','kw','b','p','m','f','d','t','n','l','g','k','h','z','c','s','j','w']

def split_canto(syl):
    """jyutping syllable -> (initial, final)"""
    for ini in CANTO_INITIALS:
        if syl.startswith(ini) and len(syl) > len(ini):
            return ini, syl[len(ini):]
    return '', syl

def parse_final(fin):
    """jyutping final -> (vowelcat, long, coda)"""
    if fin in ('m', 'ng'):                 # syllabic nasals
        return 'OE', 0, fin
    coda = ''
    for c in ('ng','m','n','p','t','k'):
        if fin.endswith(c) and len(fin) > len(c):
            coda = c; fin = fin[:-len(c)]; break
    else:
        if fin not in ('i', 'u') and len(fin) >= 2 and fin[-1] in 'iu':
            coda = fin[-1]; fin = fin[:-1]
    vmap = {
        'aa':('A',1), 'a':('A',0), 'e':('E',1), 'ei':('E',1),
        'i':('I',1), 'o':('O',1), 'ou':('O',1), 'u':('U',1),
        'oe':('OE',1), 'eo':('OE',1), 'yu':('YU',1),
    }
    if fin in vmap:
        v, lng = vmap[fin]
    elif fin == '':
        v, lng = 'OE', 0
    else:
        v, lng = vmap.get(fin[:2], ('A', 1))
    return v, lng, coda

def build_canto():
    # The canto-lshk freq column marks how common a *reading* is, not how
    # recognisable the character is, so we instead pick, for each toneless
    # syllable, the candidate character with the highest general Chinese
    # frequency (wordfreq) -- giving familiar, easy-to-read characters.
    try:
        from wordfreq import zipf_frequency
        def charfreq(c):
            return zipf_frequency(c, 'zh')
    except Exception:
        def charfreq(c):
            return 0.0

    cands = {}                      # syllable -> {char: lshk_freq}
    with open(CANTO_CSV, encoding='utf-8') as f:
        for row in csv.reader(f):
            if len(row) < 3:
                continue
            ch, jp, freq = row[0], row[1], row[2]
            if ' ' in jp:           # skip malformed multi-syllable rows
                continue
            try:
                freq = int(freq)
            except ValueError:
                continue
            syl = re.sub(r'\d+$', '', jp)
            if not syl:
                continue
            d = cands.setdefault(syl, {})
            if ch not in d or freq < d[ch]:
                d[ch] = freq

    inv = []
    for syl, chars in cands.items():
        # rank by (general char frequency desc, lshk reading-freq asc)
        ch = max(chars, key=lambda c: (charfreq(c), -chars[c]))
        ini, fin = split_canto(syl)
        v, lng, coda = parse_final(fin)
        inv.append((syl, ch, chars[ch], ini, v, lng, coda))
    return inv

# --------------------------------------------------------------------------
# Thai Paiboon parsing
# --------------------------------------------------------------------------
def strip_tones(s):
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

VOWEL_CHARS = set('aeiouɔɘəɛʉ')

THAI_ONSET = {
    'g':'g','k':'k','ng':'ng','j':'z','ch':'c','s':'s','y':'j','d':'d',
    'dt':'d','t':'t','n':'n','b':'b','bp':'b','p':'p','f':'f','m':'m',
    'r':'l','l':'l','w':'w','h':'h','':'',
    'gw':'gw','kw':'kw','gr':'g','gl':'g','kr':'k','kl':'k','pr':'p',
    'pl':'p','bpr':'b','bpl':'b','dtr':'d','dr':'d','br':'b','bl':'b',
    'fr':'f','fl':'f','sr':'s','pm':'p','dtt':'d','dy':'d',
}
THAI_CODA = {
    '':'','n':'n','t':'t','ng':'ng','m':'m','k':'k','p':'p','g':'k',
    'd':'t','b':'p','dt':'t','bp':'p','s':'t','l':'n','r':'n','h':'',
    'pm':'m','dtt':'t',
}
# Thai nucleus -> (vowelcat, long, offglide-coda)
THAI_NUC = {
    'a':('A',0,''),  'aa':('A',1,''),
    'i':('I',0,''),  'ii':('I',1,''),
    'u':('U',0,''),  'uu':('U',1,''),
    'e':('E',0,''),  'ee':('E',1,''),
    'ɛ':('E',0,''),  'ɛɛ':('E',1,''),
    'o':('O',0,''),  'oo':('O',1,''),
    'ɔ':('O',0,''),  'ɔɔ':('O',1,''),
    'ə':('OE',0,''), 'əə':('OE',1,''), 'ɘ':('OE',0,''),
    'ʉ':('YU',0,''), 'ʉʉ':('YU',1,''),
    # centring / closing diphthongs
    'ia':('I',1,''), 'ʉa':('YU',1,''), 'ua':('U',1,''),
    'ai':('A',0,'i'),'aai':('A',1,'i'),'ao':('A',0,'u'),'aao':('A',1,'u'),
    'iu':('I',1,'u'),'iao':('I',1,'u'),'iii':('I',1,''),'iiu':('I',1,'u'),
    'ui':('U',1,'i'),'uui':('U',1,'i'),'uuo':('U',1,'u'),'uao':('U',1,'u'),
    'oi':('O',0,'i'),'ooi':('O',1,'i'),'ɔi':('O',0,'i'),'ɔɔi':('O',1,'i'),
    'əəi':('OE',1,'i'),'ei':('E',0,'i'),'eei':('E',1,'i'),'ɛɛi':('E',1,'i'),
    'eo':('E',0,'u'),'eeo':('E',1,'u'),'ɛo':('E',0,'u'),'ɛɛo':('E',1,'u'),
    'uai':('U',1,'i'),'ʉai':('YU',1,'i'),'ʉi':('YU',1,'i'),'ʉʉi':('YU',1,'i'),
    'ooo':('O',1,'u'),'ɔɔo':('O',1,'u'),'əəo':('OE',1,'u'),
    'uo':('U',1,''),'ʉo':('YU',1,''),
}

def parse_thai_syl(syl):
    """paiboon syllable (tones stripped) -> (init, vowelcat, long, coda) or None"""
    i = 0
    while i < len(syl) and syl[i] not in VOWEL_CHARS:
        i += 1
    j = len(syl)
    while j > 0 and syl[j-1] not in VOWEL_CHARS:
        j -= 1
    onset = syl[:i]; nuc = syl[i:j]; coda_raw = syl[j:]
    if not nuc:
        return None
    ini = THAI_ONSET.get(onset)
    if ini is None:
        ini = THAI_ONSET.get(onset[:1], '')
    if nuc in THAI_NUC:
        v, lng, glide = THAI_NUC[nuc]
    else:
        base = nuc[:2] if nuc[:2] in THAI_NUC else nuc[:1]
        v, lng, glide = THAI_NUC.get(base, ('A', 1, ''))
    coda = THAI_CODA.get(coda_raw)
    if coda is None:
        coda = glide
    elif coda == '' and glide:
        coda = glide
    return ini, v, lng, coda

# --------------------------------------------------------------------------
# Matching
# --------------------------------------------------------------------------
W_INIT, W_VOWEL, W_CODA, W_LEN = 1.15, 1.0, 1.2, 0.25

def best_match(thai, inv):
    ini, v, lng, coda = thai
    best = None; bestd = 1e9
    for syl, ch, freq, cini, cv, clng, ccoda in inv:
        d  = W_INIT  * cons_dist(ini, cini)
        d += W_VOWEL * vowel_dist(v, cv)
        d += W_CODA  * coda_dist(coda, ccoda)
        d += W_LEN   * (lng != clng)
        if d < bestd or (d == bestd and freq < best[2]):
            bestd = d; best = (syl, ch, freq)
    return best[0], best[1], bestd

def main():
    inv = build_canto()
    sys.stderr.write(f"canto inventory: {len(inv)} syllables\n")

    cache = {}
    def map_syl(syl):
        if syl not in cache:
            p = parse_thai_syl(syl)
            cache[syl] = None if p is None else best_match(p, inv)
        return cache[syl]

    rows = []
    with open(THAI_CSV, encoding='utf-8') as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            thai_word, paiboon = row[0], row[1]
            freq = row[2] if len(row) > 2 else ''
            syls = [s for s in re.split(r'[ \-]', strip_tones(paiboon)) if s]
            chars = []; jps = []
            for s in syls:
                m = map_syl(s)
                if m:
                    jps.append(m[0]); chars.append(m[1])
            if not chars:
                continue
            rows.append((thai_word, paiboon, ''.join(chars), ' '.join(jps), freq))

    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['thai', 'thai_paiboon', 'cantonese', 'cantonese_jyutping', 'thai_freq'])
        w.writerows(rows)
    sys.stderr.write(f"wrote {len(rows)} rows to {OUT_CSV}\n")

if __name__ == '__main__':
    main()
