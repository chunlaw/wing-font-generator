# -*- coding: utf-8 -*-
import csv, os, shutil

# Paths are resolved relative to this script so it runs anywhere.
#   HERE        = python/mappings/regional-build/   (holds classA_safe.csv)
#   MANDARIN    = python/mappings/mandarin/         (region variants live here)
# mandarin-cn.csv is the canonical PRC 普通話 source (the former mandarin.csv);
# CN = SG = MY by design, and TW is re-derived from the classA overrides.
HERE = os.path.dirname(os.path.abspath(__file__))
MANDARIN = os.path.normpath(os.path.join(HERE, "..", "mandarin"))
SRC = os.path.join(MANDARIN, "mandarin-cn.csv")
OVERRIDES = os.path.join(HERE, "classA_safe.csv")

ov={}
with open(OVERRIDES,encoding='utf-8') as f:
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

# SG and MY adopt the PRC standard, so they are byte-identical copies of the
# CN source. CN itself IS the source (mandarin-cn.csv) and is left untouched.
for region in ('sg','my'):
    shutil.copyfile(SRC, os.path.join(MANDARIN, f"mandarin-{region}.csv"))
with open(os.path.join(MANDARIN, "mandarin-tw.csv"),'w',encoding='utf-8',newline='') as f:
    csv.writer(f).writerows(tw_rows)

print("overrides applied:",len(ov))
print("TW total rows:",len(tw_rows),"(source 95380)")
print("written to", MANDARIN)
