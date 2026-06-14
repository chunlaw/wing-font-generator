# -*- coding: utf-8 -*-
import json, re, csv, unicodedata
from collections import defaultdict
from opencc import OpenCC
t2s=OpenCC('t2s'); s2t=OpenCC('s2t')
MAND="/sessions/confident-wonderful-dijkstra/mnt/wing-font-generator/python/mappings/mandarin.csv"
MOE="/tmp/moedict-data/dict-revised_bkup.json"
TONE={'̄':1,'́':2,'̌':3,'̀':4}
def to_numbered(p):
    p=p.strip()
    if not p: return None
    p=re.sub(r'^[（(].*?[）)]','',p).strip()
    if not p: return None
    d=unicodedata.normalize('NFD',p); tone=5; out=[]
    for ch in d:
        if ch in TONE: tone=TONE[ch]; continue
        if unicodedata.combining(ch):
            if ch=='̈': out.append('̈')
            continue
        out.append(ch)
    s=unicodedata.normalize('NFC',''.join(out)).lower()
    if not re.fullmatch(r"[a-zü]+",s): return None
    return f"{s}{tone}"

prc_default={}
with open(MAND,encoding='utf-8') as f:
    for row in csv.reader(f):
        if len(row)<2: continue
        if len(row[0])!=1: continue
        if len(row)>2 and row[2]=='1000000':
            prc_default[row[0]]=row[1].strip()

data=json.load(open(MOE,encoding='utf-8'))
moe=defaultdict(lambda:{'primary':None,'std':set(),'all':set()})
for d in data:
    t=d.get('title')
    if not(isinstance(t,str) and len(t)==1): continue
    e=moe[t]
    for h in d.get('heteronyms',[]):
        praw=h.get('pinyin') or ''; you='又音' in praw; num=to_numbered(praw)
        if not num: continue
        e['all'].add(num)
        if not you:
            e['std'].add(num)
            if e['primary'] is None: e['primary']=num
    if e['primary'] is None and e['all']: e['primary']=sorted(e['all'])[0]

# common-char set (8105) for tagging
common=set()
with open('/tmp/pinyin-data/kMandarin_8105.txt',encoding='utf-8') as f:
    for line in f:
        m=re.search(r'#\s*(\S)',line)
        if m: common.add(m.group(1))

classA=[]
for ch,pdef in prc_default.items():
    m=moe.get(ch)
    if not m or not m['primary']: continue
    # SAFE filter: only chars whose simplified form == itself (drop simplified-merge traps)
    if s2t.convert(ch)!=ch:   # ch is a simplified form mapping to a different traditional -> skip
        continue
    prim=m['primary']; std=m['std'] or m['all']
    if prim==pdef: continue
    if pdef not in std:
        classA.append((ch,pdef,prim,sorted(std),ch in common))

commonA=[x for x in classA if x[4]]
print("Filtered Class A total:",len(classA)," | in common-8105:",len(commonA))
print("\n=== Filtered Class A within COMMON 8105 set (ch  PRC -> TW   TWstd) ===")
for ch,p,tw,std,c in sorted(commonA,key=lambda x:x[0]):
    print(f"  {ch}  {p:6s}-> {tw:6s} {std}")

with open('classA_safe.csv','w',encoding='utf-8',newline='') as f:
    w=csv.writer(f); w.writerow(['char','prc_default','tw_reading','tw_std_set','common8105'])
    for ch,p,tw,std,c in sorted(classA,key=lambda x:(not x[4],x[0])):
        w.writerow([ch,p,tw,' '.join(std),'Y' if c else ''])
print("\nsaved classA_safe.csv  (",len(classA),"rows )")
