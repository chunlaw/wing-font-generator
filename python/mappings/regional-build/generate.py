# -*- coding: utf-8 -*-
import csv, shutil
SRC="/sessions/confident-wonderful-dijkstra/mnt/wing-font-generator/python/mappings/mandarin.csv"
DEST="/sessions/confident-wonderful-dijkstra/mnt/wing-font-generator/python/mappings"
OUT="/sessions/confident-wonderful-dijkstra/mnt/outputs/regionalize"

ov={}
with open(f"{OUT}/classA_safe.csv",encoding='utf-8') as f:
    for row in csv.DictReader(f):
        ov[row['char']]=(row['prc_default'].strip(), row['tw_reading'].strip())

rows=[]
with open(SRC,encoding='utf-8') as f:
    for row in csv.reader(f): rows.append(row)

alts={c:[] for c in ov}
for row in rows:
    if len(row)>=2 and len(row[0])==1 and row[0] in ov:
        alts[row[0]].append(row[1].strip())

tw_rows=[]; done=set()
for row in rows:
    if len(row)>=2 and len(row[0])==1 and row[0] in ov:
        c=row[0]; prc,tw=ov[c]
        if c in done: continue
        block=[[c,tw,'1000000']]; seen={tw}
        # keep PRC reading as secondary (skip malformed multi-token readings)
        if prc and ' ' not in prc and prc not in seen:
            block.append([c,prc]); seen.add(prc)
        for rd in alts[c]:
            if rd and ' ' not in rd and rd not in seen:
                block.append([c,rd]); seen.add(rd)
        tw_rows.extend(block); done.add(c)
    else:
        tw_rows.append(row)

for region in ('cn','sg','my'):
    shutil.copyfile(SRC, f"{DEST}/mandarin-{region}.csv")
    shutil.copyfile(SRC, f"{OUT}/mandarin-{region}.csv")
for path in (f"{DEST}/mandarin-tw.csv", f"{OUT}/mandarin-tw.csv"):
    with open(path,'w',encoding='utf-8',newline='') as f:
        csv.writer(f).writerows(tw_rows)

print("overrides applied:",len(ov))
print("TW total rows:",len(tw_rows),"(source 95380)")
print("written to", DEST)
