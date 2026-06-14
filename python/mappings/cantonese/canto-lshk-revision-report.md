# canto-lshk.csv revision report

Benchmark: **pycantonese 5.0.0** (rime-cantonese dictionary + HKCanCor corpus).

## Summary

- Total rows: 137713 (unchanged; nothing discarded)
- Multi-character corrections applied: **1260**
    - From rime-cantonese word dictionary (authoritative): 1003
    - From segmentation, typo-fix only (original reading unattested): 257
- Segmentation differences NOT applied (original reading is valid): 4363 -> see `segmentation-suggestions.csv` for optional manual review
- Single-character rows reweighted: 21039 (5086 readings unverified by pycantonese kept at weight 1)

### Weighting scheme (3rd column, single-char rows)

`weight = dict_frequency + 2*corpus_frequency (+100000 if rime-cantonese default reading)`, floored at 1. Higher weight sorts first; unverified readings stay at 1 but are retained.

## Multi-character corrections from rime-cantonese dictionary

| word | old | new |
|---|---|---|
| 䁪下眼 | `zaam2 haa2 ngaan5` | `zaam2 haa5 ngaan5` |
| 一個人 | `jat1 go3 jan1` | `jat1 go3 jan4` |
| 一公一乸 | `jat1 gung1 jat1 naa3` | `jat1 gung1 jat1 naa2` |
| 一味 | `jat1 mei2` | `jat1 mei6` |
| 一哄而起 | `jat1 hung3 ji4 hei2` | `jat1 hung6 ji4 hei2` |
| 一嚿佛 | `jat1 gau6 fat1` | `jat1 gau6 fat6` |
| 一抽二褦 | `jat1 cau1 ji6 lang3` | `jat1 cau1 ji6 nang3` |
| 一時時 | `jat1 si2 si4` | `jat1 si4 si4` |
| 一朵鮮花插在牛糞上 | `jat1 do2 sin1 faa1 caap3 zoi6 ngau4 fan3 soeng6` | `jat1 do2 sin1 faa1 caap3 zoi6 ngau4 fan3 soeng5` |
| 一樓一鳳 | `jat1 lau4 jat1 fung2` | `jat1 lau4 jat1 fung6` |
| 一行 | `jat1 hong4` | `jat1 hang4` |
| 一語成讖 | `jat1 jyu5 sing4 cam3` | `jat1 jyu5 sing4 caam3` |
| 一鑊撬起 | `jat1 wok6 giu6 hei2` | `jat1 wok6 kiu5 hei2` |
| 一鬨而散 | `jat1 hung3 ji4 saan2` | `jat1 hung3 ji4 saan3` |
| 三個女人一個墟 | `saam1 go3 neoi5 jan4 jat1 go3 heoi1` | `saam1 go3 neoi5 jan2 jat1 go3 heoi1` |
| 三思而行 | `saam3 si1 ji4 hang4` | `saam1 si1 ji4 hang4` |
| 三行 | `saam1 hong4` | `saam1 hong2` |
| 上下結合 | `soeng6 haa3 git3 hap6` | `soeng6 haa6 git3 hap6` |
| 上弦 | `soeng5 jin4` | `soeng6 jin4` |
| 上樑不正下樑歪 | `soeng6 loeng4 bat1 zing3 haa6 loeng4 waai1` | `soeng6 loeng4 bat1 zeng3 haa6 loeng4 waai1` |
| 上海證券交易所綜合股價指 | `soeng6 hoi2 zing3 hyun3 gaau1 jik6 so2 zung3 hap6 gu2 gaa3 zi2` | `soeng6 hoi2 zing3 gyun3 gaau1 jik6 so2 zung3 hap6 gu2 gaa3 zi2` |
| 上輋 | `soeng6 ce4` | `soeng5 ce4` |
| 上邊 | `soeng6 bin1` | `soeng6 bin6` |
| 上門 | `soeng5 mun2` | `soeng5 mun4` |
| 下徑口 | `haa6 ging3 hau2` | `haa5 ging3 hau2` |
| 下晏 | `haa6 aan3` | `haa6 ngaan3` |
| 下邊 | `haa6 bin1` | `haa6 bin6` |
| 不同性別 | `bat1 dung6 sing3 bit6` | `bat1 tung4 sing3 bit6` |
| 丙一鑊 | `bing3 jat1 wok6` | `bing2 jat1 wok6` |
| 丟卒保車 | `diu1 zeot1 bou2 ce1` | `diu1 zeot1 bou2 geoi1` |
| 丫烏婆 | `aa1 wu1 po2` | `aa1 wu4 po1` |
| 中亭 | `zung1 ting2` | `zung1 ting5` |
| 中國證券報 | `zung1 gwok3 zing3 hyun3 bou3` | `zung1 gwok3 zing3 gyun3 bou3` |
| 中國證券監督管理委員會 | `zung1 gwok3 zing3 hyun3 gaam1 duk1 gun2 lei5 wai2 jyun4 wui2` | `zung1 gwok3 zing3 gyun3 gaam1 duk1 gun2 lei5 wai2 jyun4 wui2` |
| 中括號 | `zung1 kut3 hou2` | `zung1 kut3 hou6` |
| 中文 | `zung1 man2` | `zung1 man4` |
| 丸子 | `jyun2 zi2` | `jyun4 zi2` |
| 之類 | `zi1 leoi2` | `zi1 leoi6` |
| 乒乒乓乓 | `ping1 ping1 paang1 paang1` | `ping1 ping1 pong1 pong1` |
| 乒乓 | `bing1 bam1` | `ping1 pong1` |
| 乒嘭 | `bing4 baang4` | `bing4 bam4` |
| 乘坐 | `sing4 co5` | `sing4 zo6` |
| 乜撚 | `mat1 lan2` | `mat1 nan2` |
| 乜撚嘢 | `mat1 lan2 je5` | `mat1 nan2 je5` |
| 乾淨 | `gon1 zeng6` | `gon1 zing6` |
| 亂噏 | `lyun2 ap1` | `lyun2 ngap1` |
| 亂噏廿四 | `lyun2 ap1 jaa6 sei3` | `lyun6 ngap1 jaa6 sei3` |
| 亂籠 | `lyun2 lung4` | `lyun6 lung4` |
| 亂逛 | `lyun6 gwaang3` | `lyun6 kwaang3` |
| 予取予求 | `jyu4 ceoi2 jyu4 kau4` | `jyu5 ceoi2 jyu5 kau4` |
| 五嶺 | `ng5 leng5` | `ng5 ling5` |
| 五行 | `ng5 hong4` | `ng5 hang4` |
| 交錯 | `gaau1 co3` | `gaau1 cok3` |
| 人物 | `jan4 mat2` | `jan4 mat6` |
| 今晚肥仔 | `gam1 maan1 fei4 zai2` | `gam1 maan5 fei4 zai2` |
| 仙女 | `sin1 neoi2` | `sin1 neoi5` |
| 令嬡 | `ling6 oi2` | `ling6 oi3` |
| 企鵝 | `kei5 ngo2` | `kei5 ngo4` |
| 伏伏跳 | `buk4 buk2 tiu3` | `buk6 buk6 tiu3` |
| 位高權重 | `wai2 gou1 kyun4 cung6` | `wai2 gou1 kyun4 zung6` |
| 住宅 | `zyu6 zaak2` | `zyu6 zaak6` |
| 佛典 | `fat1 din2` | `fat6 din2` |
| 佛學界 | `fat1 hok6 gaai3` | `fat6 hok6 gaai3` |
| 佛家弟子 | `fat1 gaa1 dai6 zi2` | `fat6 gaa1 dai6 zi2` |
| 佛寶 | `fat1 bou2` | `fat6 bou2` |
| 佛性 | `fat1 sing3` | `fat6 sing3` |
| 佛教正覺 | `fat1 gaau3 zing3 gok3` | `fat6 gaau3 zing3 gok3` |
| 佛門弟子 | `fat1 mun4 dai6 zi2` | `fat6 mun4 dai6 zi2` |
| 佛骨 | `fat1 gwat1` | `fat6 gwat1` |
| 作文 | `zok3 man2` | `zok3 man4` |
| 作繭自縛 | `zok3 gaan2 zi6 bong2` | `zok3 gaan2 zi6 bok3` |
| 使勁 | `si2 ging3` | `si2 ging6` |
| 供佛 | `gung3 fat1` | `gung3 fat6` |
| 便宜 | `pin4 ji2` | `pin4 ji4` |
| 信件 | `seon3 gin2` | `seon3 gin6` |
| 信用證券 | `seon3 jung6 zing3 hyun3` | `seon3 jung6 zing3 gyun3` |
| 修女 | `sau1 neoi2` | `sau1 neoi5` |
| 個位 | `go3 wai2` | `go3 wai6` |
| 倒扱 | `dou3 gap6` | `dou3 kap1` |
| 倒春寒 | `dou2 ceon1 hon4` | `dou3 ceon1 hon4` |
| 借花獻佛 | `ze3 faa1 hin3 fat1` | `ze3 faa1 hin3 fat6` |
| 值錢 | `zik6 cin2` | `zik6 cin4` |
| 做慣乞兒懶做官 | `zou6 gwaan3 hat1 ji4 laan5 zou6 gun1` | `zou6 gwaan3 hat1 ji1 laan5 zou6 gun1` |
| 債券 | `zaai3 hyun3` | `zaai3 gyun3` |
| 債務擔保證券 | `zaai3 mou6 daam1 bou2 zing3 hyun3` | `zaai3 mou6 daam1 bou2 zing3 gyun3` |
| 傾呤哐啷 | `king1 ling1 gwaang1 laang1` | `king1 ling1 kaang1 laang1` |
| 傾聽者 | `king1 ting1 ze2` | `king1 ting3 ze2` |
| 傾計 | `king1 gai3` | `king1 gai2` |
| 優待券 | `jau1 doi6 hyun3` | `jau1 doi6 gyun3` |
| 儲值飛 | `cyu5 zik6 fei1` | `cyu6 zik6 fei1` |
| 兄妹 | `hing1 mui2` | `hing1 mui6` |
| 充大頭鬼 | `cung1 daai4 tau4 gwai2` | `cung1 daai6 tau4 gwai2` |
| 光盤 | `gwong1 pun2` | `gwong1 pun4` |
| 光碟 | `gwong1 dip2` | `gwong1 dip6` |
| 入邊 | `jap6 bin1` | `jap6 bin6` |
| 兩份 | `loeng5 fan6` | `loeng5 fan2` |
| 兩步驟驗證 | `loeng5 bou6 zaau6 jim6 zing3` | `loeng5 bou6 zau6 jim6 zing3` |
| 兩粒 | `loeng5 nap1` | `loeng4 nap1` |
| 兩粒一扮 | `loeng5 nap1 jat1 baan3` | `loeng5 nap1 jat1 baan6` |
| 兩粒一瓣 | `loeng5 nap1 jat1 faan5` | `loeng5 nap1 jat1 faan6` |
| 公債券 | `gung1 zaai3 hyun3` | `gung1 zaai3 gyun3` |
| 公務員事務局 | `gung1 mou6 jyun4 si6 mou6 guk2` | `gung1 mou6 jyun4 si6 mou6 guk6` |
| 公園 | `gung1 jyun2` | `gung1 jyun4` |
| 公立 | `gung1 laap6` | `gung1 lap6` |
| 六國大封相 | `luk6 gwok3 daai6 fung1 soeng1` | `luk6 gwok3 daai6 fung1 soeng3` |
| 冚竇 | `kam2 dau3` | `ham6 dau6` |
| 冤厲 | `jyun1 lai2` | `jyun1 lai6` |
| 冤大頭 | `jyun3 daai6 tau4` | `jyun1 daai6 tau4` |
| 冤崩爛臭 | `jyun1 baang1 laan6 cau3` | `jyun1 bang1 laan6 cau3` |
| 冥王星 | `ming4 wong4 sing1` | `ming5 wong4 sing1` |
| 冧篷頭 | `lam1 pung1 tau2` | `lam1 pung4 tau2` |
| 冰壺秋月 | `bing1 wu2 cau1 jyut6` | `bing1 wu4 cau1 jyut6` |
| 冰淇淋 | `bing1 kei4 lam2` | `bing1 kei4 lam4` |
| 凹凸 | `lap1 dat6` | `nap1 dat6` |
| 出面 | `ceot1 min2` | `ceot1 min6` |
| 分散 | `fan1 saan2` | `fan1 saan3` |
| 分數 | `fan1 sou3` | `fan6 sou3` |
| 切中時弊 | `cai3 zung1 si4 bai6` | `cit3 zung3 si4 bai6` |
| 刊物 | `hon1 mat6` | `hon2 mat6` |
| 初嚟埗到 | `co1 lai4 bou3 dou3` | `co1 lai4 bou6 dou3` |
| 初嚟甫到 | `co1 lai4 bou3 dou3` | `co1 lai4 bou6 dou3` |
| 利比里亞 | `lei6 bei2 lei5 aa3` | `lei6 bei2 lei6 aa3` |
| 利率 | `lei6 leot2` | `lei6 leot6` |
| 刻不容緩 | `hak1 bat1 jung4 wun4` | `hak1 bat1 jung4 wun6` |
| 削坺坺 | `soek3 paat6 paat6` | `soek3 pet6 pet6` |
| 前邊 | `cin4 bin1` | `cin4 bin6` |
| 剩係 | `sing6 hai6` | `zing6 hai6` |
| 創立 | `cong3 laap6` | `cong3 lap6` |
| 功夫仔 | `gung1 fu1 jai2` | `gung1 fu1 zai2` |
| 功完行滿 | `gung1 jyun4 hang4 mun5` | `gung1 jyun4 hang5 mun5` |
| 加納 | `gaa1 naap6` | `gaa1 nap6` |
| 動畫 | `dung6 waa2` | `dung6 waa6` |
| 勢在必行 | `sai3 zoi6 bit1 haang4` | `sai3 zoi6 bit1 hang4` |
| 勤儉持家 | `gim6 kan4 ci4 gaa1` | `kan4 gim6 ci4 gaa1` |
| 包拗頸 | `baau1 ngaau3 geng2` | `baau1 aau3 geng2` |
| 十九 | `sap6 gau2` | `sap1 gau1` |
| 十字架 | `sap6 zi6 gaa2` | `sap6 zi6 gaa3` |
| 半夜 | `bun3 je2` | `bun3 je6` |
| 協會 | `hip3 wui2` | `hip3 wui6` |
| 南蘇丹 | `nam4 sou1 daan1` | `naam4 sou1 daan1` |
| 博茨瓦納 | `bok3 ci4 ngaa5 naap6` | `bok3 ci4 ngaa5 nap6` |
| 卡住 | `kaak1 zyu6` | `kaa1 zyu6` |
| 厄立特里亞 | `ak1 lap6 dak6 lei5 aa3` | `aak1 laap6 dak6 lei4 aa3` |
| 厄運 | `aak1 wan6` | `ak1 wan6` |
| 厚疊疊 | `hau5 dap6 dap6` | `hau5 dep6 dep6` |
| 參與 | `caam1 jyu5` | `caam1 jyu6` |
| 又呢又嚕 | `jau6 nei1 jau6 lou3` | `jau6 ni1 jau6 lou3` |
| 及第粥 | `gap6 dai2 zuk1` | `kap6 dai2 zuk1` |
| 友誼 | `jau5 ji4` | `jau5 ji6` |
| 反晒面 | `faan2 saai3 min6` | `faan2 saai3 min2` |
| 反面 | `faan2 min2` | `faan2 min6` |
| 叔父 | `suk1 fu2` | `suk1 fu6` |
| 只羨鴛鴦不羨仙 | `zi2 sin6 jyun1 joeng1 bat1 sin6 sin1` | `zi2 sin6 jin1 joeng1 bat1 sin6 sin1` |
| 叫聲 | `giu3 seng1` | `giu3 sing1` |
| 叫起手 | `kiu3 hei2 sau2` | `giu3 hei2 sau2` |
| 叮叮髧髧 | `ding1 ding1 dam3 dam3` | `ding4 ding1 dam4 dam3` |
| 可轉讓證券 | `ho2 zyun3 joeng6 zing3 hyun3` | `ho2 zyun3 joeng6 zing3 gyun3` |
| 叱咤 | `cik4 caak4` | `cik1 caak1` |
| 右上左落 | `jau6 soeng2 zo2 lok6` | `jau6 soeng5 zo2 lok6` |
| 右邊 | `jau6 bin1` | `jau6 bin6` |
| 合肥 | `hap6 fei4` | `gap3 fei4` |
| 吉隆坡 | `gat1 lung4 po1` | `gat1 lung4 bo1` |
| 同行 | `tung4 hang4` | `tung4 hong4` |
| 同鄉會 | `tung4 hoeng1 wui2` | `tung4 hoeng1 wui5` |
| 名副其實 | `ming4 fu3 kei4 sat6` | `ming4 fu4 kei4 sat6` |
| 名牌 | `meng2 paai2` | `ming4 paai4` |
| 名額 | `ming4 ngaak2` | `ming4 ngaak6` |
| 吐魯番 | `tou3 lou5 faan1` | `tou3 lou5 faan4` |
| 吩咐 | `fan1 fu3` | `fan1 fu6` |
| 吱吱斟斟 | `zi1 zi1 zam1 zam1` | `zi4 zi1 zam4 zam4` |
| 吱喳婆 | `zi1 zaa1 po2` | `zi1 zaa1 po4` |
| 呃呃𠱁𠱁 | `aak1 aak1 tam3 tam3` | `ngaak1 ngaak1 tam3 tam3` |
| 呃得就呃 | `aak1 dak1 zau6 aak1` | `ngaak1 dak1 zau6 ngaak1` |
| 呢呢嚕嚕 | `nei1 nei1 lou3 lou3` | `ni1 ni1 lou3 lou3` |
| 呢回 | `le1 wui4` | `ni1 wui4` |
| 呢廷人 | `ni1 ting2 jan4` | `nei1 ting2 jan4` |
| 呢張表 | `ni1 zoeng1 biu2` | `nei1 zoeng1 biu2` |
| 呢排 | `ni1 paai4` | `ni1 paai2` |
| 呢條計 | `ni1 tiu4 gai2` | `nei1 tiu4 gai2` |
| 呢樣 | `ni1 joeng6` | `nei1 joeng6` |
| 呢次弊 | `ni1 ci3 bai6` | `nei1 ci3 bai6` |
| 呢篇 | `ni1 pin1` | `nei1 pin1` |
| 呢趟 | `ni1 tong3` | `le1 tong3` |
| 呢門課 | `ni1 mun4 fo3` | `nei1 mun4 fo3` |
| 呢間鋪 | `ni1 gaan1 pou3` | `nei1 gaan1 pou3` |
| 呢類 | `le1 leoi6` | `ni1 leoi6` |
| 周柏豪 | `zau1 paak3 hou4` | `zau1 baak3 hou4` |
| 命格 | `ming6 gaak3` | `meng6 gaak3` |
| 命赴黃泉 | `meng6 fu6 wong4 cyun4` | `ming6 fu6 wong4 cyun4` |
| 咁濟 | `gam3 zai3` | `gam3 zai6` |
| 咋嘛 | `za1 maa3` | `zaa1 maa3` |
| 和平共處 | `wo4 ping4 gung6 cyu2` | `wo4 ping4 gung6 cyu5` |
| 咦咿哦哦 | `ji4 ji1 ngo4 ngo4` | `ji4 ji1 o4 o4` |
| 咦咿哽哽 | `ji4 ji4 ang4 ang4` | `ji4 ji1 ang4 ang4` |
| 咪要 | `mai5 jiu3` | `mai6 jiu3` |
| 咬兜 | `ngaau5 dau1` | `ngaau5 dou1` |
| 哩個 | `li1 go3` | `ni1 go3` |
| 唔奇 | `m4 gei1` | `m4 kei4` |
| 唔見 | `m4 gin3` | `ng5 gin3` |
| 唞大氣 | `tau2 daai6 hei3` | `tau2 daai6 hei6` |
| 售票處 | `sau6 piu3 cyu3` | `sau6 piu3 cyu5` |
| 唱名 | `coeng3 meng2` | `coeng3 ming4` |
| 唱碟 | `coeng3 dip2` | `coeng3 dip6` |
| 唵嘛呢叭咪吽 | `aan1 maa1 ni1 paa1 mi1 hung1` | `am1 maa1 ni1 baa1 mi1 hung1` |
| 唾液 | `toe3 jik6` | `toe5 jik6` |
| 商販 | `soeng1 faan2` | `soeng1 faan3` |
| 啤啤 | `pe1 pe1` | `bi1 bi1` |
| 啤啤女 | `bi4 bi1 neoi2` | `bi4 bi1 neoi5` |
| 啦啦亂 | `laa1 laa1 lyun6` | `laa4 laa2 lyun6` |
| 啪啪聲 | `paak1 paak1 seng1` | `paak6 paak2 seng1` |
| 啫啫雞煲 | `zek1 zek1 gai1 bou1` | `zoe1 zoe1 gai1 bou1` |
| 喉欖 | `hau4 laam2` | `hau4 laam5` |
| 單位 | `daan1 wai2` | `daan1 wai6` |
| 嗚咽 | `wu1 jin1` | `wu1 jit3` |
| 嗰個 | `go2 go3` | `go3 go3` |
| 嗰排 | `go2 paai4` | `go2 paai2` |
| 嗱口嗱面 | `laa2 hau2 laa2 min6` | `naa2 hau2 naa2 min6` |
| 嗱喳麪 | `laa5 zaa2 min6` | `naa4 zaa2 min6` |
| 嘰里咕嚕 | `gi1 li1 gu1 lu1` | `gei1 lei5 gu1 lou1` |
| 噉咪 | `gam2 mai1` | `gam2 mai6` |
| 噏三噏四 | `ap1 saam1 ap1 sei3` | `ngap1 saam1 ngap1 sei3` |
| 噏下 | `ap1 haa5` | `ngap1 haa5` |
| 噏得就噏 | `ap1 dak1 zau6 ap1` | `ngap1 dak1 zau6 ngap1` |
| 噏撈 | `ap1 lou1` | `ngap1 lou1` |
| 噏東噏西 | `ap1 dung1 ap1 sai1` | `ngap1 dung1 ngap1 sai1` |
| 嚮往 | `hoeng2 wong5` | `hoeng3 wong5` |
| 四兩撥千斤 | `sei3 loeng2 but3 cin1 gan1` | `sei3 loeng2 but6 cin1 gan1` |
| 四條 | `sei3 tiu4` | `sei3 tiu2` |
| 四腳爬爬 | `sei3 goek3 paa4 paa2` | `sei3 goek3 paa4 paa4` |
| 回饋 | `wui4 gwai3` | `wui4 gwai6` |
| 困擾 | `kwan3 jiu2` | `kwan3 jiu5` |
| 國會 | `gwok3 wui2` | `gwok3 wui6` |
| 圍棋 | `wai4 kei2` | `wai4 kei4` |
| 圍繞 | `wai4 jiu2` | `wai4 jiu5` |
| 圓蹄 | `jyun4 tai2` | `jyun4 tai4` |
| 圖書館 | `tou4 syu1 gun2` | `tou5 syu1 gun2` |
| 土地兼併 | `tou2 dei6 gim1 bing3` | `tou2 dei6 gim1 ping3` |
| 土鯪魚 | `tou2 leng4 jyu2` | `tou2 leng4 jyu4` |
| 圭亞那 | `gwai1 aa3 naa5` | `gwai1 aa3 naa4` |
| 地下 | `dei6 haa2` | `dei6 haa6` |
| 地下車庫 | `dei6 haa3 ce1 fu3` | `dei6 haa6 ce1 fu3` |
| 坐井觀天 | `co5 zeng2 gun1 tin1` | `zo6 zeng2 gun1 tin1` |
| 坐亞望冠 | `zo5 aa3 mong6 gun1` | `zo6 aa3 mong6 gun1` |
| 坐蓮 | `zo6 lin4` | `co5 lin4` |
| 埃及 | `aai1 kap6` | `oi1 kap6` |
| 埃德蒙頓 | `aai1 dak1 mung4 deon6` | `oi1 dak1 mung4 deon6` |
| 執地 | `zap1 dei2` | `zap1 dei6` |
| 基希訥烏 | `gei1 hei1 neot6 wu1` | `gei1 hei1 nat6 wu1` |
| 堅道 | `gin1 dou6` | `gin1 dou2` |
| 報刊 | `bou3 hon1` | `bou3 hon2` |
| 場面 | `coeng4 min2` | `coeng4 min6` |
| 塞拉耶佛 | `coi3 laai1 je4 fat6` | `sak1 laai1 je4 fat6` |
| 墊住 | `zin3 zyu6` | `din3 zyu6` |
| 壁畫 | `bik1 waa2` | `bik1 waa6` |
| 外太婆 | `ngoi6 taai3 po2` | `ngoi6 taai3 po4` |
| 外邊 | `ngoi6 bin1` | `ngoi6 bin6` |
| 大使 | `daai6 sai2` | `daai6 si3` |
| 大包夾腸 | `daai6 baau1 gaap3 coeng2` | `daai6 baau1 gep6 coeng2` |
| 大吉利事 | `daai6 gat1 lai6 si6` | `daai6 gat1 lei6 si6` |
| 大埔墟 | `daai6 bou6 heoi1` | `daai6 bou3 heoi1` |
| 大士王 | `daai6 si6 wong2` | `daai6 si6 wong4` |
| 大將 | `daai6 zoeng1` | `daai6 zoeng3` |
| 大括號 | `daai6 kut3 hou2` | `daai6 kut3 hou6` |
| 大歎特歎 | `daai6 taan3 dak6 taan3` | `daai3 taan3 dak6 taan3` |
| 大步𨂾過 | `daai6 bou6 laam3 gwo3` | `daai6 bou6 naam3 gwo3` |
| 大種乞兒 | `daai3 zung2 hat1 ji1` | `daai6 zung2 hat1 ji1` |
| 大路元帥 | `daai3 lou6 jyun4 seoi3` | `daai6 lou6 jyun4 seoi3` |
| 大隊 | `daai6 deoi2` | `daai6 deoi6` |
| 大隻騾騾 | `daai3 zek3 leoi4 leoi4` | `daai6 zek3 leoi4 leoi4` |
| 大驚小怪 | `daai6 geng1 siu2 gwai3` | `daai6 geng1 siu2 gwaai3` |
| 天生 | `tin1 saang1` | `tin1 sang1` |
| 天秤 | `tin1 cing3` | `tin1 ping4` |
| 天秤座 | `tin1 cing3 zo6` | `tin1 ping4 zo6` |
| 天蠍座 | `tin1 hit3 zo6` | `tin1 kit3 zo6` |
| 失戀 | `sat1 lyun2` | `sat1 lyun5` |
| 夾手 | `gaap3 sau2` | `gep6 sau2` |
| 夾襖 | `gaap3 ou3` | `gaap3 ngou3` |
| 奀咕咕 | `an1 gu4 gu4` | `ngan1 gu4 gu4` |
| 奇靈里 | `kei4 ling4 lei5` | `gei1 ling4 lei5` |
| 女同志 | `neoi5 tung5 zi3` | `neoi5 tung4 zi3` |
| 女生外向 | `neoi5 saang1 ngoi6 hoeng3` | `neoi5 sang1 ngoi6 hoeng3` |
| 奶奶 | `naai4 naai2` | `naai5 naai5` |
| 奶撻 | `laai2 taat1` | `naai2 taat1` |
| 奸賴貓 | `gaan1 laai3 maau1` | `gaan1 laai6 maau1` |
| 好冇 | `hou2 mou2` | `hou2 mou5` |
| 好惡死 | `hou2 ok3 sei2` | `hou3 ok3 sei2` |
| 好玩 | `hou2 waan2` | `hou2 wun6` |
| 好聽 | `hou2 teng1` | `hou2 ting1` |
| 妹妹 | `mui4 mui2` | `mui6 mui6` |
| 姊妹 | `zi2 mui2` | `zi2 mui6` |
| 姑丈 | `gu1 zoeng2` | `gu1 zoeng6` |
| 委員會 | `wai2 jyun4 wui2` | `wai2 jyun4 wui6` |
| 姣屍扽篤 | `gaau2 si1 dan6 duk1` | `haau4 si1 dan3 duk1` |
| 姨丈 | `ji4 zoeng2` | `ji4 zoeng6` |
| 姪心抱 | `zat6 sam1 pou5` | `zat6 san1 pou5` |
| 娘丙 | `loeng1 bing2` | `noeng1 bing2` |
| 婄腩 | `pau3 laam5` | `pau3 naam5` |
| 子彈 | `zi2 daan2` | `zi2 daan6` |
| 孔雀 | `hung2 zoek2` | `hung2 zoek3` |
| 孤立 | `gu1 laap6` | `gu1 lap6` |
| 學位 | `hok6 wai2` | `hok6 wai6` |
| 學堂 | `hok6 tong2` | `hok6 tong4` |
| 學會 | `hok6 wui2` | `hok6 wui5` |
| 官立 | `gun1 laap6` | `gun1 lap6` |
| 定喇 | `ding2 laa3` | `ding2 laak3` |
| 客務中心 | `haak3 mou5 zung1 sam1` | `haak3 mou6 zung1 sam1` |
| 宵夜 | `siu1 je6` | `siu1 je2` |
| 家欄雞 | `gaa1 laan1 gai1` | `gaa1 laan2 gai1` |
| 家陣時 | `gaa1 zan6 si2` | `gaa1 zan6 si4` |
| 實踐 | `sat6 cin2` | `sat6 cin5` |
| 實𥕏𥕏 | `sat6 gwak4 gwak4` | `sat6 gwak6 gwak6` |
| 寧願 | `ning4 jyun2` | `ning4 jyun6` |
| 寶玉 | `bou2 juk2` | `bou2 juk6` |
| 寺廟 | `zi6 miu2` | `zi6 miu6` |
| 封面 | `fung1 min2` | `fung1 min6` |
| 對喔 | `deoi3 o3` | `deoi3 ak1` |
| 對立 | `deoi3 laap6` | `deoi3 lap6` |
| 導彈 | `dou6 daan2` | `dou6 daan6` |
| 小括號 | `siu2 kut3 hou2` | `siu2 kut3 hou6` |
| 小行星帶 | `siu2 haang4 sing1 daai2` | `siu2 hang4 sing1 daai3` |
| 尾班 | `mei5 baan1` | `mei5 ban1` |
| 屹立 | `ngat6 laap6` | `ngat6 lap6` |
| 岳父 | `ngok6 fu2` | `ngok6 fu6` |
| 崎嶇 | `kei1 keoi1` | `kei4 keoi1` |
| 崗位 | `gong1 wai2` | `gong1 wai6` |
| 嶄露頭角 | `zaam2 lou6 tau4 gok3` | `zaam3 lou6 tau4 gok3` |
| 嶺大 | `ling5 daai6` | `leng5 daai6` |
| 工尺 | `gung1 ce1` | `gung1 cek3` |
| 工會 | `gung1 wui2` | `gung1 wui6` |
| 左上右落 | `zo2 soeng2 jau6 lok6` | `zo2 soeng5 jau6 lok6` |
| 左券在握 | `zo2 hyun3 zoi6 aak1` | `zo2 gyun3 zoi6 aak1` |
| 左右 | `zo2 jau2` | `zo2 jau6` |
| 左邊 | `zo2 bin1` | `zo2 bin6` |
| 巴勒斯坦 | `baa1 lak6 si1 taan2` | `baa1 laak6 si1 taan2` |
| 市建局 | `si5 gin3 guk2` | `si5 gin3 guk6` |
| 布加勒斯特 | `bou3 gaa1 lak6 si1 dak6` | `bou3 gaa1 laak6 si1 dak6` |
| 布基納法索 | `bou3 gei1 naap6 faat3 sok3` | `bou3 gei1 nap6 faat3 sok3` |
| 師傅 | `si1 fu2` | `si1 fu6` |
| 帽子 | `mou2 zi2` | `mou6 zi2` |
| 幫下眼 | `bong1 haa5 ngaan5` | `bong1 haa2 ngaan5` |
| 干擾 | `gon1 jiu2` | `gon1 jiu5` |
| 平光眼鏡 | `ping4 gwong4 ngaan5 geng2` | `ping4 gwong1 ngaan5 geng2` |
| 幹勁 | `gon3 ging3` | `gon3 ging6` |
| 幼兒園 | `jau3 ji4 jyun2` | `jau3 ji4 jyun4` |
| 幼稚園 | `jau3 zi6 jyun2` | `jau3 zi6 jyun4` |
| 幾仔乸 | `gei2 zai2 naa3` | `gei2 zai2 naa2` |
| 幾度 | `gei2 dou6` | `gei1 dou6` |
| 度身訂做 | `dok6 san1 deng6 zou6` | `dok6 san1 ding3 zou6` |
| 建立 | `gin3 laap6` | `gin3 lap6` |
| 弟弟 | `dai4 dai2` | `dai6 dai6` |
| 強檢 | `koeng5 gim2` | `koeng4 gim2` |
| 強迫 | `koeng4 bik1` | `koeng5 bik1` |
| 彈藥 | `daan2 joek6` | `daan6 joek6` |
| 往陣時 | `wong5 zan6 si2` | `wong5 zan6 si4` |
| 很好彩 | `han2 hou2 zoi2` | `han2 hou2 coi2` |
| 後尾 | `hau1 mei1` | `hau6 mei1` |
| 徒弟 | `tou4 dai2` | `tou4 dai6` |
| 心意咭 | `sam1 ji3 kaak1` | `sam1 ji3 kaat1` |
| 必理痛 | `bit1 lei5 tung3` | `bit1 lei6 tung3` |
| 快捷 | `faai3 zit3` | `faai3 zit6` |
| 恩重如山 | `jan1 cung5 jyu4 saan1` | `jan1 zung6 jyu4 saan1` |
| 情誼 | `cing4 ji4` | `cing4 ji6` |
| 惡亨亨 | `ok3 hang1 hang1` | `ngok3 hang1 hang1` |
| 惡晒 | `ok3 saai3` | `ngok3 saai3` |
| 惡死睖瞪 | `ok3 sei2 ling6 dang1` | `ok3 si2 nang4 dang1` |
| 惡死能登 | `ok3 sei2 nang4 dang1` | `ok3 si2 nang4 dang1` |
| 惡霸 | `ok3 baa3` | `ngok3 baa3` |
| 意思 | `ji3 si1` | `ji3 si3` |
| 慶生 | `hing3 sang1` | `hing3 saang1` |
| 憔悴 | `ciu4 seoi5` | `ciu4 seoi6` |
| 戀愛 | `lyun2 oi3` | `lyun5 oi3` |
| 成事 | `sing4 si6` | `seng4 si6` |
| 成日 | `seng4 jat6` | `sing4 jat6` |
| 成立 | `sing4 laap6` | `sing4 lap6` |
| 手坳 | `sau2 aau3` | `sau2 ngaau3` |
| 手袋 | `sau2 doi2` | `sau2 doi6` |
| 打個冷 | `daa2 go3 laang1` | `daa3 go3 laang5` |
| 打成一片 | `daa1 sing4 jat1 pin3` | `daa2 sing4 jat1 pin3` |
| 打擾 | `daa2 jiu2` | `daa2 jiu5` |
| 打板 | `daa2 baan2` | `daa3 baan2` |
| 打柒 | `daa2 cat6` | `daa3 cat1` |
| 打棚埔 | `daa2 paang4 bou3` | `daa3 paang4 bou3` |
| 打機去 | `daa2 gei1 heoi3` | `daa3 gei1 heoi3` |
| 打水片 | `daa2 seoi2 pin2` | `daa3 seoi2 pin2` |
| 打瀉茶 | `daa2 se2 caa4` | `daa2 se3 caa4` |
| 打量 | `daa2 loeng4` | `daa2 loeng6` |
| 打飛碟 | `daa2 fei1 dip2` | `daa2 fei1 dip6` |
| 扻頭埋牆 | `ham2 tau2 maai4 coeng5` | `ham2 tau4 maai4 coeng4` |
| 抆灰 | `man2 fui1` | `man3 fui1` |
| 投其所好 | `tau4 kei4 so2 hou2` | `tau4 kei4 so2 hou3` |
| 折射率 | `zit3 se6 leot2` | `zit3 se6 leot6` |
| 抽咭 | `cau1 kaak1` | `cau1 kaat1` |
| 抽啦 | `cau1 la1` | `cau1 laa1` |
| 抽樣 | `cau1 joeng2` | `cau1 joeng6` |
| 拓片 | `taap3 pin2` | `tok3 pin2` |
| 拖鞋 | `to1 haai2` | `to1 haai4` |
| 拗到掂 | `aau3 dou3 dim6` | `ngaau3 dou3 dim6` |
| 拗彎 | `aau2 waan1` | `ngaau5 waan1` |
| 拗氣 | `aau3 hei3` | `ngaau3 hei3` |
| 拗軨 | `aau2 ling4` | `aau4 ling4` |
| 拗頭 | `ngaau1 tau4` | `aau1 tau4` |
| 拚命 | `ping3 ming6` | `pun2 ming6` |
| 拜五臟神 | `baai3 ng5 zong6 saan4` | `baai3 ng5 zong6 san4` |
| 拜年卡 | `baai3 nin4 kaak1` | `baai3 nin4 kaat1` |
| 挺立 | `ting5 laap6` | `ting5 lap6` |
| 挾持 | `hip3 ci4` | `hip6 ci4` |
| 掃桿埔 | `sou3 gon3 bou3` | `sou3 gon2 bou2` |
| 掉低 | `deu6 dai1` | `diu6 dai1` |
| 掌握 | `zoeng2 aak1` | `zoeng2 ak1` |
| 掛爐鴨 | `gwaa3 lou4 aap2` | `gwaa3 lou4 aap3` |
| 探測 | `taam3 caak1` | `taam3 cak1` |
| 掹衫尾 | `maang1 saam1 mei5` | `mang1 saam1 mei5` |
| 掹貓尾 | `maang1 maau1 mei5` | `mang3 maau1 mei5` |
| 提倡 | `tai4 coeng1` | `tai4 coeng3` |
| 揗揗震 | `tan4 tan2 zan3` | `tan4 tan4 zan3` |
| 揗雞 | `tan4 gai1` | `tang4 gai1` |
| 揞脈 | `am2 mak6` | `ngam2 mak6` |
| 握手 | `aak1 sau2` | `ak1 sau2` |
| 揼時間 | `dam1 si4 gaan1` | `dam1 si4 gaan3` |
| 搲痕 | `aau1 han4` | `waa2 han4` |
| 摩納哥 | `mo1 naap6 go1` | `mo1 nap6 go1` |
| 撈嘢 | `laau4 je5` | `lou1 je5` |
| 撈靜水 | `laau4 zing6 seoi2` | `lou1 zing6 seoi2` |
| 撐場面 | `caang1 coeng4 min6` | `caang3 coeng4 min2` |
| 撚狗 | `nan2 gau2` | `lan2 gau2` |
| 撠腳 | `kik1 goek3` | `gik1 goek3` |
| 播啦 | `bo3 la1` | `bo3 laa1` |
| 撰述 | `zaan3 seot6` | `zaan6 seot6` |
| 擴充 | `kwok3 cung1` | `kwong3 cung1` |
| 擴大 | `kwok3 daai6` | `kwong3 daai6` |
| 擴建 | `kwok3 gin3` | `kwong3 gin3` |
| 擴散 | `kwok3 saan3` | `kwong3 saan3` |
| 擴編 | `kwok3 pin1` | `kong3 pin1` |
| 擴編 | `kwong3 pin1` | `kong3 pin1` |
| 擴闊 | `kwok3 fut3` | `kwong3 fut3` |
| 擸架生 | `laap3 gaa3 caang1` | `laap3 gaa3 saang1` |
| 攝親 | `sip3 can3` | `sip3 can1` |
| 攞嚟衰 | `lo2 lai4 seoi1` | `lo2 lei4 seoi1` |
| 攞打 | `lo2 daa2` | `lo2 daa3` |
| 攤位 | `taan1 wai2` | `taan1 wai6` |
| 支支整整 | `zi1 zi1 zeng2 zeng2` | `zi1 zi1 zing2 zing2` |
| 放葫蘆 | `fong3 wu4 lou2` | `fong3 wu4 lou4` |
| 政府新聞處 | `zing3 fu2 san1 man4 cyu5` | `zing3 fu2 san1 man4 cyu3` |
| 故仔 | `gu3 zai2` | `gu2 zai2` |
| 效率 | `haau6 leot2` | `haau6 leot6` |
| 教堂 | `gaau3 tong2` | `gaau3 tong4` |
| 教學相長 | `gaau3 hok6 soeng1 coeng4` | `gaau3 hok6 soeng1 zoeng2` |
| 教會 | `gaau3 wui2` | `gaau3 wui6` |
| 教育局 | `gaau3 juk6 guk2` | `gaau3 juk6 guk6` |
| 敬業樂業 | `ging3 jip6 lok6 jip6` | `ging3 jip6 ngaau6 jip6` |
| 敬業樂羣 | `ging3 jip6 lok6 kwan4` | `ging3 jip6 ngaau6 kwan4` |
| 文件 | `man4 gin2` | `man4 gin6` |
| 斜面 | `ce4 min2` | `ce4 min6` |
| 斧頭 | `fu2 tau2` | `fu2 tau4` |
| 斯洛伐克 | `si1 lok3 fat6 hak1` | `si1 lok6 fat6 hak1` |
| 斯洛文尼亞 | `si1 lok3 man4 nei4 aa3` | `si1 lok6 man4 nei4 aa3` |
| 新加坡 | `san1 gaa3 po1` | `san1 gaa3 bo1` |
| 新聞 | `san1 man2` | `san1 man4` |
| 旅發局 | `leoi5 faat3 guk2` | `leoi5 faat3 guk6` |
| 旋律 | `syun4 leot2` | `syun4 leot6` |
| 旗袍 | `kei4 pou2` | `kei4 pou4` |
| 早一排 | `zou2 jat1 paai2` | `zou2 jat1 paai4` |
| 早會 | `zou2 wui2` | `zou2 wui5` |
| 昂首挺胸 | `ngong4 sau2 ting5 hung1` | `ngong5 sau2 ting5 hung1` |
| 昏暗 | `fan1 ngam3` | `fan1 am3` |
| 昨天 | `zok3 tin1` | `zok6 tin1` |
| 昨日 | `zok3 jat6` | `zok6 jat6` |
| 昨晚 | `zok3 maan5` | `zok6 maan5` |
| 時裝災難 | `si4 zong1 zoi1 naan4` | `si4 zong1 zoi1 naan6` |
| 時髦 | `si4 mou1` | `si4 mou4` |
| 晾住揼 | `long3 zyu6 dam2` | `long6 zyu6 dam2` |
| 晾腳 | `long3 goek3` | `long6 goek3` |
| 晾起 | `long3 hei2` | `long6 hei2` |
| 暴露 | `bou6 lou6` | `buk6 lou6` |
| 曝光 | `bou6 gwong1` | `buk6 gwong1` |
| 曝曬 | `bou6 saai3` | `buk6 saai3` |
| 書局 | `syu1 guk2` | `syu1 guk6` |
| 書房 | `syu1 fong2` | `syu1 fong4` |
| 書架 | `syu1 gaa2` | `syu1 gaa3` |
| 書畫 | `syu1 waa2` | `syu1 waa6` |
| 會場 | `wui2 coeng4` | `wui6 coeng4` |
| 月相 | `jyut6 soeng3` | `jyut6 soeng6` |
| 有份 | `jau5 fan6` | `jau5 fan2` |
| 有兩手 | `jau5 loeng5 sau5` | `jau5 loeng5 sau2` |
| 有口齒 | `jau5 hau2 ci2` | `jau5 hau4 ci2` |
| 有名 | `jau5 meng2` | `jau5 ming4` |
| 有意思 | `jau5 ji3 si1` | `jau5 ji3 si3` |
| 有氣無力 | `jau5 hei3 mou3 lik6` | `jau5 hei3 mou4 lik6` |
| 有籮 | `jau5 lo4` | `jau5 lo1` |
| 有聲 | `jau5 sing1` | `jau5 seng1` |
| 有錢 | `jau5 cin2` | `jau5 cin4` |
| 有面 | `jau5 min6` | `jau5 min2` |
| 朝頭夜晚 | `ziu1 tau2 je6 maan5` | `ziu1 tau4 je6 maan5` |
| 未啦 | `mei6 la1` | `mei6 laa1` |
| 東帝汶 | `dung1 dai3 man6` | `dung1 dai3 man4` |
| 東莞 | `dung1 gun1` | `dung1 gun2` |
| 林立 | `lam4 laap6` | `lam4 lap6` |
| 染料 | `jim5 liu2` | `jim5 liu6` |
| 柬埔寨 | `gaan2 bou3 zaai6` | `gaan2 pou4 zaai6` |
| 校園電視 | `haau6 jyun2 din6 si6` | `haau6 jyun4 din6 si6` |
| 案件 | `on3 gin2` | `on3 gin6` |
| 桌子 | `coek3 zi2` | `zoek3 zi2` |
| 梵蒂岡 | `faan6 dai3 gong1` | `faan4 dai3 gong1` |
| 棉袍 | `min4 pou2` | `min4 pou4` |
| 模擬 | `mou4 ji4` | `mou4 ji5` |
| 樹立 | `syu6 laap6` | `syu6 lap6` |
| 橄欖 | `gaam3 laam2` | `gaam3 laam5` |
| 機管局 | `gei1 gun2 guk2` | `gei1 gun2 guk6` |
| 檢測 | `gim2 caak1` | `gim2 cak1` |
| 檯子 | `toi4 zi2` | `toi2 zi2` |
| 檸檬茶 | `ling4 mung1 caa4` | `ning4 mung1 caa4` |
| 欖隧 | `laam5 seoi6` | `laam6 seoi6` |
| 正晒 | `zeng3 saai3` | `zing1 saai3` |
| 正花 | `zeng3 faa1` | `zing3 faa1` |
| 步驟 | `bou6 zaau6` | `bou6 zau6` |
| 死雞撐飯蓋 | `sei2 gai1 caang3 faan6 goi3` | `sei2 gai1 caang3 faan5 goi3` |
| 毛里塔尼亞 | `mou4 lei5 taap3 nei4 aa3` | `mou4 lei5 taap3 nei5 aa3` |
| 氣泡 | `hei3 paau1` | `hei3 pou5` |
| 氧化汞 | `joeng5 faa3 hung3` | `joeng5 faa3 hung6` |
| 水痘 | `seoi2 dau2` | `seoi2 dau6` |
| 汆水 | `mei6 seoi2` | `fei1 seoi2` |
| 污唎馬喳 | `wu1 lei1 maa5 caa5` | `wu1 lei1 maa5 zaa1` |
| 沙地阿拉伯 | `saa1 dei6 aa2 laai1 baa3` | `saa1 dei6 aa3 laai1 baak3` |
| 沙律 | `saa1 leot2` | `saa1 leot6` |
| 沙梨篤 | `saa1 lei4 duk1` | `saa1 lei6 duk1` |
| 沙特阿拉伯 | `saa1 dak6 aa2 laai1 baa3` | `saa1 dak6 aa3 laai1 baak3` |
| 油浸禾花雀 | `jau4 zam3 wo4 faa1 zoek3` | `jau4 zam3 wo4 faa1 zoek2` |
| 油麻地 | `jau4 maa4 dei6` | `jau4 maa4 dei2` |
| 波士頓 | `bo1 si6 deon6` | `bo1 si6 deon2` |
| 波斯尼亞和黑塞哥維那 | `bo1 si1 nei4 aa3 wo4 hak1 coi3 go1 wai4 naa5` | `bo1 si1 nei4 aa3 wo4 hak1 coi3 go1 wai4 naa4` |
| 洗澡 | `sai2 cou3` | `sai2 zou2` |
| 洗馬 | `sai2 maa5` | `sin2 maa5` |
| 洛杉磯 | `lok3 caam3 gei1` | `lok6 caam3 gei1` |
| 洛陽 | `lok3 joeng4` | `lok6 joeng4` |
| 活躍 | `wut6 joek3` | `wut6 joek6` |
| 流氓 | `lau4 man4` | `lau4 mong4` |
| 海洋公園 | `hoi2 joeng4 gung1 jyun4` | `hoi2 joeng4 gung1 jyun2` |
| 浸會大學 | `zam3 wui6 daai6 hok6` | `zam3 wui2 daai6 hok6` |
| 消彌 | `siu1 mei4` | `siu1 mei5` |
| 消防處 | `siu1 fong4 cyu5` | `siu1 fong4 cyu3` |
| 淡水 | `daam6 seoi2` | `taam5 seoi2` |
| 淤泥 | `jyu1 nai4` | `jyu2 nai4` |
| 混汞 | `wan6 hung3` | `wan6 hung6` |
| 測試 | `caak1 si3` | `cak1 si3` |
| 測驗 | `caak1 jim6` | `cak1 jim6` |
| 港大才女 | `gong2 daai6 coi4 neoi2` | `gong2 daai6 coi4 neoi5` |
| 渲染 | `hyun1 jim5` | `syun3 jim5` |
| 湖泊 | `wu4 bok6` | `wu4 pok3` |
| 滾筒 | `gwan2 tung2` | `gwan2 tung4` |
| 滿月 | `mun5 jyut2` | `mun5 jyut6` |
| 漸漸 | `zim6 zim2` | `zim6 zim6` |
| 澆灌 | `giu1 gun3` | `hiu1 gun3` |
| 澳門 | `ou3 mun2` | `ou3 mun4` |
| 澳門特別行政區 | `ou3 mun4 dak6 bit6 hang4 zing3 keoi1` | `ou3 mun2 dak6 bit6 hang4 zing3 keoi1` |
| 濟南 | `zai3 naam4` | `zai2 naam4` |
| 濫用 | `laam5 jung6` | `laam6 jung6` |
| 瀝青 | `laap6 ceng1` | `lik6 cing1` |
| 灼傷 | `coek3 soeng1` | `zoek3 soeng1` |
| 炮彈 | `paau3 daan2` | `paau3 daan6` |
| 炸彈 | `zaa3 daan2` | `zaa3 daan6` |
| 烏哩馬查 | `wu1 li1 maa5 caa3` | `wu1 li1 maa5 caa5` |
| 烏喱馬杈 | `wu1 lei1 maa5 caa3` | `wu1 lei1 maa5 caa5` |
| 烏拉圭 | `wu1 laai1 gwai1` | `wu1 laa1 gwai1` |
| 烘豆 | `hong3 dau2` | `hung1 dau2` |
| 焙火爐 | `bui3 fo2 lou4` | `bui6 fo2 lou4` |
| 照樣 | `ziu3 joeng2` | `ziu3 joeng6` |
| 照相 | `ziu3 soeng2` | `ziu3 soeng3` |
| 煮燶飯 | `zyu2 lung1 faan6` | `zyu2 nung1 faan6` |
| 熨斗 | `tong3 dau2` | `tong3 dau3` |
| 熱門 | `jit6 mun2` | `jit6 mun4` |
| 燃料 | `jin4 liu2` | `jin4 liu6` |
| 燙火膏 | `tong1 fo2 gou1` | `tong3 fo2 gou1` |
| 燶起塊面 | `lung1 hei2 faai3 min6` | `nung1 hei2 faai3 min6` |
| 爭秋奪暑 | `zaang1 cau1 dyut6 syu2` | `zang1 cau1 dyut6 syu2` |
| 牀位 | `cong4 wai2` | `cong4 wai6` |
| 牀褥 | `cong4 juk2` | `cong4 juk6` |
| 牛痘 | `ngau4 dau2` | `ngau4 dau6` |
| 牛軛 | `ngau4 aak1` | `ngau4 ngaak6` |
| 牛頓流體 | `ngau4 deon1 lau4 tai2` | `ngau4 deon6 lau4 tai2` |
| 牡羊座 | `muk6 joeng4 zo6` | `maau5 joeng4 zo6` |
| 犬女 | `hyun2 neoi2` | `hyun2 neoi5` |
| 犯小人 | `faan6 siu2 jan2` | `faan6 siu2 jan4` |
| 狐狸 | `wu4 lei2` | `wu4 lei4` |
| 狐狸叫 | `wu4 lei4 giu3` | `wu4 lei2 giu3` |
| 狐狸頭 | `wu4 lei4 tau4` | `wu4 lei2 tau4` |
| 狹隘 | `haap6 aai3` | `haap6 aai6` |
| 猜猜畫畫 | `caai1 caai1 waak6 waak6` | `caai1 caai1 waak6 waa3` |
| 獎券 | `zoeng2 hyun3` | `zoeng2 gyun3` |
| 獨立 | `duk6 laap6` | `duk6 lap6` |
| 獻醜不如藏拙 | `hin3 cau2 bat1 jyu4 cong4 zyut6` | `hin3 cau2 bat1 jyu4 cong4 zyut3` |
| 玩笑 | `waan4 siu3` | `wun6 siu3` |
| 玷污 | `dim1 wu1` | `zim1 wu1` |
| 環繞 | `waan4 jiu2` | `waan4 jiu5` |
| 瓦努阿圖 | `aa3 lou5 aa3 tou4` | `ngaa3 lou5 ngaa3 tou4` |
| 瓦努阿圖 | `ngaa5 nou5 aa3 tou4` | `ngaa3 lou5 ngaa3 tou4` |
| 甘汞 | `gam1 hung3` | `gam1 hung6` |
| 生壅 | `saang1 ngung1` | `saang1 ung1` |
| 生字 | `saang1 zi6` | `sang1 zi6` |
| 生意盎然 | `sang1 ji3 ong3 jin4` | `saang1 ji3 ong3 jin4` |
| 生辰八字 | `saang1 san4 baat3 zi6` | `sang1 san4 baat3 zi6` |
| 甩甩咳咳 | `lak1 lak1 kak1 kak1` | `lat1 lat1 kat1 kat1` |
| 番石榴 | `faan1 sek6 lau2` | `faan1 sek6 lau4` |
| 番鴨 | `faan1 aap2` | `faan1 aap3` |
| 畫面 | `waa2 min2` | `waa2 min6` |
| 當面 | `dong1 min2` | `dong1 min6` |
| 疑犯 | `ji4 faan2` | `ji4 faan6` |
| 痕痕地 | `han4 han2 dei2` | `han4 han4 dei6` |
| 痙攣 | `ging3 lyun4` | `ging6 lyun4` |
| 痾肚 | `ngo1 tou5` | `o1 tou5` |
| 痾茄 | `ngo1 ke1` | `o1 ke1` |
| 痾𡲢 | `ngo1 ke1` | `o1 ke1` |
| 瘀青 | `jyu2 ceng1` | `jyu2 cing1` |
| 癲癎 | `din1 haan4` | `din1 gaan2` |
| 癲癲得得 | `din1 din1 dak1 dak1` | `din1 din1 dat1 dat1` |
| 癲雞乸 | `din1 gai1 naa3` | `din1 gai1 naa2` |
| 發個輪 | `faak3 go3 leon2` | `faat3 go3 leon2` |
| 發展局 | `faat3 zin2 guk2` | `faat3 zin2 guk6` |
| 發行 | `faat3 hang4` | `faat3 hong4` |
| 白鶴林 | `baak6 hok6 lam4` | `baak6 hok2 lam4` |
| 監粗嚟 | `gaam3 cou1 lai4` | `gaam3 cou1 lei4` |
| 目不暇給 | `muk6 bat1 haa4 kap1` | `muk6 bat1 haa6 kap1` |
| 直立 | `zik6 laap6` | `zik6 lap6` |
| 眨眼 | `zaam2 ngaan5` | `zaap3 ngaan5` |
| 眼鏡套 | `ngaan5 geng3 tou3` | `ngaan5 geng2 tou3` |
| 眼鏡布 | `ngaan5 geng3 bou3` | `ngaan5 geng2 bou3` |
| 着瓦靴 | `zoek3 ngaa5 hoe1` | `zoek6 ngaa5 hoe1` |
| 睇嚟湊 | `tai2 lai4 cau3` | `tai2 lei4 cau3` |
| 睇頭睇尾 | `tai2 tau2 tai2 mei5` | `tai2 tau4 tai2 mei5` |
| 矗立 | `cuk1 laap6` | `cuk1 lap6` |
| 知更雀 | `zi1 gaang1 zoek2` | `zi1 gang1 zoek2` |
| 矮行星 | `ai2 haang4 sing1` | `ai2 hang4 sing1` |
| 石硤尾 | `sek6 hap6 mei5` | `sek6 gip3 mei5` |
| 砰呤嘭唥 | `bing4 ling1 baang4 laang4` | `ping4 ling1 paang4 laang4` |
| 砰呤𠾴唥 | `bing4 ling1 baang4 laang4` | `ping4 ling1 paang4 laang4` |
| 砰砰嘭嘭 | `ping1 ping1 paang4 paang4` | `ping4 ping4 paang4 paang4` |
| 硬件 | `ngaang6 gin2` | `ngaang6 gin6` |
| 硬倔倔 | `ngaang6 gwak6 gwak6` | `ngaang6 gwat6 gwat6` |
| 硬崩崩 | `ngaang6 baang1 baang1` | `ngaang6 bang1 bang1` |
| 硬盤 | `ngaang6 pun2` | `ngaang6 pun4` |
| 硬碟 | `ngaang6 dip2` | `ngaang6 dip6` |
| 碧咸 | `bik1 haam4` | `bik1 ham4` |
| 磁帶 | `ci4 daai2` | `ci4 daai3` |
| 磁碟 | `ci4 dip2` | `ci4 dip6` |
| 磨穿鐵硯 | `mo4 cyun1 tit3 jin2` | `mo4 cyun1 tit3 jin6` |
| 礦棉 | `kong3 min4` | `kwong3 min4` |
| 社會福利署 | `se5 wui6 fuk1 lei6 cyu5` | `se5 wui2 fuk1 lei6 cyu5` |
| 神神地 | `san2 san2 dei2` | `san4 san2 dei2` |
| 禾花雀 | `wo4 faa1 zoek3` | `wo4 faa1 zoek2` |
| 私立 | `si1 laap6` | `si1 lap6` |
| 移風易俗 | `ji4 fung1 ji6 zuk6` | `ji4 fung1 jik6 zuk6` |
| 穩操勝券 | `wan2 cou1 sing3 hyun3` | `wan2 cou1 sing3 gyun3` |
| 穴位 | `jyut6 wai2` | `jyut6 wai6` |
| 穿着 | `cyun1 zoek6` | `cyun1 zoek3` |
| 窗簾 | `coeng1 lim2` | `coeng1 lim4` |
| 竊聽 | `sit3 ting1` | `sit3 teng1` |
| 立例 | `laap6 lai6` | `lap6 lai6` |
| 立刻 | `laap6 hak1` | `lap6 hak1` |
| 立即 | `laap6 zik1` | `lap6 zik1` |
| 立地成佛 | `laap6 dei6 sing4 fat1` | `laap6 dei6 sing4 fat6` |
| 立場 | `laap6 coeng4` | `lap6 coeng4` |
| 立志 | `laap6 zi3` | `lap6 zi3` |
| 立方 | `laap6 fong1` | `lap6 fong1` |
| 立法 | `laap6 faat3` | `lap6 faat3` |
| 立法會 | `lap6 faat3 wui2` | `laap6 faat3 wui2` |
| 立身處世 | `laap6 san1 cyu2 sai3` | `laap6 san1 cyu3 sai3` |
| 立陶宛 | `lap6 tou4 jyun2` | `laap6 tou4 jyun2` |
| 立陶宛人 | `lap6 tou4 jyun2 jan4` | `laap6 tou4 jyun2 jan4` |
| 立體 | `laap6 tai2` | `lap6 tai2` |
| 站立 | `zaam6 laap6` | `zaam6 lap6` |
| 競投 | `ging3 tau4` | `ging6 tau4` |
| 競爭 | `ging3 zang1` | `ging6 zang1` |
| 競賽 | `ging3 coi3` | `ging6 coi3` |
| 競選 | `ging3 syun2` | `ging6 syun2` |
| 竹籃打水 | `zuk1 laam2 daa2 seoi2` | `zuk1 laam4 daa2 seoi2` |
| 笑話 | `siu3 waa2` | `siu3 waa6` |
| 符號 | `fu4 hou2` | `fu4 hou6` |
| 米豆 | `mai5 dau2` | `mai5 dau6` |
| 精靈 | `zing1 ling1` | `zing1 ling4` |
| 糕盤 | `gou1 pun2` | `gou1 pun4` |
| 糾錯 | `gau2 co3` | `dau2 co3` |
| 約會 | `joek3 wui2` | `joek3 wui6` |
| 紅豆 | `hung4 dau2` | `hung4 dau6` |
| 紆尊降貴 | `syu1 zyun1 gong3 gwai3` | `jyu1 zyun1 gong3 gwai3` |
| 紊亂 | `man5 lyun6` | `man6 lyun6` |
| 純粹 | `seon4 seoi5` | `seon4 seoi6` |
| 紙角 | `zi2 gok3` | `zi1 gok3` |
| 索取 | `saak3 ceoi2` | `sok3 ceoi2` |
| 紳士 | `san1 si2` | `san1 si6` |
| 紹興 | `siu6 hing1` | `siu6 hing3` |
| 絕對領域 | `zyut3 deoi3 ling5 wik6` | `zyut6 deoi3 ling5 wik6` |
| 絲帶 | `si1 daai2` | `si1 daai3` |
| 絲瓜刨 | `si1 gwaa1 paau2` | `si1 gwaa1 paau4` |
| 綜合 | `zung1 hap6` | `zung3 hap6` |
| 綜援 | `zung1 wun4` | `zung3 wun4` |
| 綠豆 | `luk6 dau2` | `luk6 dau6` |
| 綿羊 | `min4 joeng2` | `min4 joeng4` |
| 緊急救援 | `gan2 gap1 gau3 jyun4` | `gan2 gap1 gau3 wun4` |
| 緊急救援工作 | `gan2 gap1 gau3 jyun4 gung1 zok3` | `gan2 gap1 gau3 wun4 gung1 zok3` |
| 緋聞 | `fei1 man4` | `fei2 man4` |
| 緩慢 | `wun4 maan6` | `wun6 maan6` |
| 縮埋一嚿 | `suk1 maai4 jat1 gau4` | `suk1 maai4 jat1 gau6` |
| 繁衍 | `faan4 hin2` | `faan4 jin5` |
| 繪畫 | `kui2 waa2` | `kui2 waak6` |
| 纏繞 | `cin4 jiu2` | `cin4 jiu5` |
| 罐頭 | `gun3 tau2` | `gun3 tau4` |
| 罨耷 | `ap1 dap1` | `ngap1 dap1` |
| 罪犯 | `zeoi6 faan2` | `zeoi6 faan6` |
| 羌笛 | `goeng1 dek2` | `goeng1 dek6` |
| 美國證券交易委員會 | `mei5 gwok3 zing3 hyun3 gaau1 jik6 wai2 jyun4 wui2` | `mei5 gwok3 zing3 gyun3 gaau1 jik6 wai2 jyun4 wui2` |
| 老土眼鏡 | `lou5 tou2 ngaan5 geng3` | `lou5 tou2 ngaan5 geng2` |
| 老外 | `lou5 ngoi2` | `lou5 ngoi6` |
| 老婆婆 | `lou5 po4 po2` | `lou5 po4 po4` |
| 老廉 | `lou5 lim2` | `lou5 lim4` |
| 耳挖 | `ji5 waat2` | `ji5 waat3` |
| 耶撚 | `je4 lan2` | `je4 nan2` |
| 聖馬利諾 | `sing3 maa5 lei6 lok6` | `sing3 maa5 lei6 nok6` |
| 聚苯乙烯 | `zeoi6 bun2 jyut3 hei1` | `zeoi6 bun2 jyut6 hei1` |
| 聯絡 | `lyun4 lok3` | `lyun4 lok6` |
| 聯羣結隊 | `lyun4 gwan4 git3 deoi6` | `lyun4 kwan4 git3 deoi6` |
| 聽取 | `teng1 ceoi2` | `ting1 ceoi2` |
| 聽從 | `teng1 cung4` | `ting1 cung4` |
| 聽晚 | `ting1 maan1` | `ting1 maan5` |
| 聽見 | `teng1 gin3` | `ting1 gin3` |
| 聽診器 | `teng1 can2 hei3` | `ting1 can2 hei3` |
| 肛塞 | `gong1 sak1` | `gong1 coi3` |
| 股份 | `gu2 fan2` | `gu2 fan6` |
| 腍啤啤 | `nam4 be4 be4` | `nam4 bet6 bet6` |
| 腦袋 | `nou5 doi2` | `nou5 doi6` |
| 腫瘤 | `zung2 lau2` | `zung2 lau4` |
| 腰帶 | `jiu1 daai2` | `jiu1 daai3` |
| 腰心腰肺 | `jiu2 sam1 jiu2 fi3` | `jiu2 sam1 jiu2 fai3` |
| 腰潤 | `jiu1 jeon2` | `jiu1 jeon6` |
| 腰間盤 | `jiu1 gaan1 pun4` | `jiu1 gaan3 pun4` |
| 膝蓋 | `sat1 goi3` | `sat1 koi3` |
| 膠囊 | `gaau1 long4` | `gaau1 nong4` |
| 膽搏膽 | `daam2 bok3 daam2` | `daam2 bok6 daam2` |
| 臉孔 | `lim5 hung2` | `lim6 hung2` |
| 臉容 | `lim5 jung4` | `min6 jung4` |
| 自立 | `zi6 laap6` | `zi6 lap6` |
| 自縊 | `zi6 ai3` | `zi6 ngai3` |
| 致辭 | `zi3 ci6` | `zi3 ci4` |
| 舅母 | `kau3 mou5` | `kau5 mou5` |
| 舅父 | `kau3 fu2` | `kau5 fu6` |
| 興趣盎然 | `hing1 ceoi3 on1 jin4` | `hing3 ceoi3 ngong3 jin4` |
| 舊時 | `gau6 si2` | `gau6 si4` |
| 舌頭 | `sit3 tau4` | `sit6 tau4` |
| 船塢里 | `syun4 wu2 lei5` | `syun4 ou3 lei5` |
| 船灣淡水湖 | `syun4 waan1 daam6 seoi2 wu4` | `syun4 waan1 taam5 seoi2 wu4` |
| 船隊 | `syun4 deoi2` | `syun4 deoi6` |
| 色厲內荏 | `sik1 lai6 noi6 jam5` | `sik1 lai6 noi6 nam4` |
| 花園 | `faa1 jyun2` | `faa1 jyun4` |
| 花樣 | `faa1 joeng2` | `faa1 joeng6` |
| 英文 | `jing1 man2` | `jing1 man4` |
| 荸薺 | `but6 cai4` | `ci4 gu1` |
| 菠蘿彈 | `bo1 lo4 daan2` | `bo1 lo4 daan6` |
| 華山 | `waa4 saan1` | `waa6 saan1` |
| 菲律賓 | `fei2 leot6 ban1` | `fei1 leot6 ban1` |
| 萬字夾 | `maan6 zi6 gaap2` | `maan6 zi6 gaap3` |
| 葫蘆 | `wu4 lou2` | `wu4 lou4` |
| 蓋印 | `goi3 jan3` | `koi3 jan3` |
| 蓋子 | `goi3 zi2` | `koi3 zi2` |
| 薄扶林水塘 | `bok3 fu6 lam4 seoi2 tong4` | `bok6 fu4 lam4 seoi2 tong4` |
| 處理 | `cyu2 lei5` | `cyu5 lei5` |
| 虢礫緙嘞 | `gwik1 lik1 kaak1 laak1` | `kik1 lik1 kaak1 laak1` |
| 蚊子 | `man1 zi2` | `man4 zi2` |
| 蚺蛇 | `jim4 se4` | `naam4 se4` |
| 蛇餅 | `se4 beng2` | `ji4 beng2` |
| 蛋白質 | `daan2 baak6 zat1` | `daan6 baak6 zat1` |
| 蜑家話 | `daan6 gaa1 waa2` | `dan6 gaa1 waa2` |
| 蜿蜒 | `jyun1 jin4` | `jyun2 jin4` |
| 蝴蝶 | `wu4 dip2` | `wu4 dip6` |
| 蠄蟧絲網 | `kam4 lou4 si1 mong1` | `kam4 lou4 si1 mong5` |
| 行政長官 | `hang4 zing3 coeng4 gun1` | `hang4 zing3 zoeng2 gun1` |
| 行星 | `haang4 sing1` | `hang4 sing1` |
| 行會 | `hang4 wui2` | `hong4 wui2` |
| 行老正 | `haang4 lou5 zing3` | `haang4 lou5 zeng3` |
| 行逛 | `haang4 gwaang3` | `haang4 kwaang3` |
| 街渡 | `gaai1 dou2` | `gaai1 dou6` |
| 衣着 | `ji1 zoek3` | `ji1 zoek6` |
| 表妹 | `biu2 mui2` | `biu2 mui6` |
| 表弟 | `biu2 dai2` | `biu2 dai6` |
| 被鋪蚊帳 | `pei5 pou1 man1 zoeng3` | `pei5 pou2 man1 zoeng3` |
| 裝逼 | `zong1 bi1` | `zong1 bik1` |
| 西灣河 | `sai1 waan1 ho4` | `sai1 waan1 ho2` |
| 西藏 | `sai1 cong4` | `sai1 zong6` |
| 西藏自治區 | `sai1 cong4 zi6 zi6 keoi1` | `sai1 zong6 zi6 zi6 keoi1` |
| 覘高頭 | `zim1 gou1 tau4` | `daam1 gou1 tau4` |
| 觀測 | `gun1 caak1` | `gun1 cak1` |
| 觸景生情 | `cuk1 ging2 sang1 cing4` | `zuk1 ging2 sang1 cing4` |
| 言行 | `jin4 hang4` | `jin4 hang6` |
| 訂購 | `ding3 gau3` | `ding3 kau3` |
| 計返條數 | `gai2 faan1 tiu4 sou3` | `gai3 faan1 tiu4 sou3` |
| 計量制 | `gai3 loeng6 zai3` | `gai3 loeng4 zai3` |
| 計量棒 | `gai3 loeng6 paang5` | `gai3 loeng4 paang5` |
| 設立 | `cit3 laap6` | `cit3 lap6` |
| 話劇 | `waa2 kek6` | `waa6 kek6` |
| 認領 | `jing6 leng5` | `jing6 ling5` |
| 調查 | `diu6 caa4` | `tiu4 caa4` |
| 請假 | `ceng2 gaa3` | `cing2 gaa3` |
| 請客 | `ceng2 haak3` | `cing2 haak3` |
| 請教 | `ceng2 gaau3` | `cing2 gaau3` |
| 請茶 | `ceng2 caa4` | `cing2 caa4` |
| 論文 | `leon6 man2` | `leon6 man4` |
| 諗起 | `nam2 hei2` | `nam2 hei3` |
| 諸事理 | `zyu1 si6 lei1` | `zyu1 si6 lei5` |
| 講人事 | `gong2 jan4 si2` | `gong2 jan4 si6` |
| 講話有骨 | `gong2 waa2 jau5 gwat1` | `gong2 waa6 jau5 gwat1` |
| 證件相 | `zing3 gin2 soeng2` | `zing3 gin2 soeng1` |
| 證券代銷 | `zing3 hyun3 doi6 siu1` | `zing3 gyun3 doi6 siu1` |
| 證券化率 | `zing3 hyun3 faa3 leot2` | `zing3 gyun3 faa3 leot2` |
| 證券委員會 | `zing3 hyun3 wai2 jyun4 wui2` | `zing3 gyun3 wai2 jyun4 wui2` |
| 證券經營 | `zing3 hyun3 ging1 jing4` | `zing3 gyun3 ging1 jing4` |
| 證券經紀人 | `zing3 hyun3 ging1 gei2 jan4` | `zing3 gyun3 ging1 gei2 jan4` |
| 識下人 | `sik1 haa5 jan4` | `sik1 haa6 jan4` |
| 議會 | `ji5 wui2` | `ji5 wui6` |
| 變成 | `bin3 seng4` | `bin3 sing4` |
| 豉油碟 | `si6 jau4 dip2` | `si6 jau4 dip6` |
| 財政司司長辦公室 | `coi4 zing3 si1 si1 coeng4 baan6 gung1 sat1` | `coi4 zing3 si1 si1 zoeng2 baan6 gung1 sat1` |
| 財經事務及庫務局 | `coi4 ging1 si6 mou6 kap6 fu3 mou6 guk2` | `coi4 ging1 si6 mou6 kap6 fu3 mou6 guk6` |
| 貼中 | `tip1 zung3` | `tip1 zung1` |
| 貿發局 | `mau6 faat3 guk2` | `mau6 faat3 guk6` |
| 資料 | `zi1 liu2` | `zi1 liu6` |
| 資產擔保證券 | `zi1 caan2 daam1 bou2 zing3 hyun3` | `zi1 caan2 daam1 bou2 zing3 gyun3` |
| 賞月 | `soeng2 jyut2` | `soeng2 jyut6` |
| 賺錢 | `zaan6 cin2` | `zaan6 cin4` |
| 賺頭蝕尾 | `zaan6 tau4 sik6 mei5` | `zaan6 tau4 sit6 mei5` |
| 購書券 | `kau3 syu1 hyun3` | `kau3 syu1 gyun3` |
| 賽果 | `coi3 gwo2` | `coi2 gwo2` |
| 赤鱲角 | `cek3 lip6 gok3` | `cek3 laap6 gok3` |
| 走廊 | `zau2 long2` | `zau2 long4` |
| 走後門 | `zau2 hau6 mun2` | `zau2 hau6 mun4` |
| 走走趯趯 | `zau2 zau2 dek6 dek6` | `zau2 zau2 tik1 tik1` |
| 赳赳 | `dau2 dau2` | `gau2 gau2` |
| 起勁 | `hei2 ging3` | `hei2 ging6` |
| 起泡 | `hei2 pok1` | `hei2 pou5` |
| 起褶 | `hei2 zaap3` | `hei2 zaap6` |
| 起重設備 | `hei2 cung4 cit3 bei6` | `hei2 cung5 cit3 bei6` |
| 跌落地揦返拃沙 | `dit3 lok6 dei6 laa2 faan1 zaa6 saa1` | `dit3 lok6 dei2 laa2 faan1 zaa6 saa1` |
| 跑啦 | `paau2 la1` | `paau2 laa1` |
| 跑馬地 | `paau2 maa5 dei6` | `paau2 maa5 dei2` |
| 跳繩 | `tiu3 sing2` | `tiu3 sing4` |
| 跳躍 | `tiu3 joek3` | `tiu3 joek6` |
| 踎躉 | `mau1 dan1` | `mau1 dan2` |
| 蹣跚 | `pun4 saan1` | `mun4 saan1` |
| 躡手躡腳 | `nip6 sau2 nip6 goek3` | `sip6 sau2 sip6 goek3` |
| 身份 | `san1 fan2` | `san1 fan6` |
| 身份證 | `san1 fan2 zing3` | `san1 fan6 zing3` |
| 身份證號碼 | `san1 fan2 zing3 hou6 maa5` | `san1 fan6 zing3 hou6 maa5` |
| 身分 | `san1 fan2` | `san1 fan6` |
| 車輛 | `ce1 loeng2` | `ce1 loeng6` |
| 軟件 | `jyun5 gin2` | `jyun5 gin6` |
| 輪流 | `leon4 lau2` | `leon4 lau4` |
| 轉下眼 | `zyun2 haa5 ngaan5` | `zyun3 haa5 ngaan5` |
| 轉機 | `zyun3 gei1` | `zyun2 gei1` |
| 轉軚 | `zyun2 taai5` | `zyun3 taai5` |
| 轎車 | `kiu2 ce1` | `kiu4 ce1` |
| 返來 | `faan2 loi4` | `faan1 lai4` |
| 退地 | `teoi3 dei2` | `teoi3 dei6` |
| 這些 | `ze2 se1` | `ze5 se1` |
| 這個 | `ze2 go3` | `ze5 go3` |
| 這兒 | `ze2 ji4` | `ze5 ji4` |
| 這樣 | `ze2 joeng6` | `ze5 joeng6` |
| 這裏 | `ze2 leoi5` | `ze5 leoi5` |
| 這麼 | `ze2 mo1` | `ze5 mo1` |
| 通啦 | `tung1 la1` | `tung1 laa1` |
| 通訊局 | `tung1 seon3 guk2` | `tung1 seon3 guk6` |
| 逛下 | `gwaang6 haa5` | `kwaang3 haa5` |
| 逛下逛下 | `gwaang6 haa5 gwaang6 haa5` | `kwaang3 haa5 kwaang3 haa5` |
| 逛咗 | `gwaang6 zo2` | `kwaang3 zo2` |
| 逛街 | `gwaang6 gaai1` | `kwaang3 gaai1` |
| 速率 | `cuk1 leot2` | `cuk1 leot6` |
| 週而復始 | `zau1 ji4 fau6 ci2` | `zau1 ji4 fuk6 ci2` |
| 遇到 | `jyu6 dou2` | `jyu6 dou3` |
| 遇溺 | `jyu6 nik1` | `jyu6 nik6` |
| 遊艇徑 | `jau4 ting5 ging3` | `jau4 teng5 ging3` |
| 過下癮 | `gwo3 haa5 jan5` | `gwo3 haa2 jan5` |
| 過夜 | `gwo3 je2` | `gwo3 je6` |
| 過把癮 | `gwo3 baa2 jan5` | `gwo3 baa3 jan5` |
| 道士 | `dou6 si2` | `dou6 si6` |
| 遠近 | `jyun5 gan6` | `jyun5 kan5` |
| 遮仔會 | `ze1 zai2 wui2` | `ze1 zai2 wui6` |
| 選舉事務處 | `syun2 geoi2 si6 mou6 cyu5` | `syun2 geoi2 si6 mou6 cyu3` |
| 邱彥筒 | `jau1 jin6 tung2` | `jau1 jin6 tung4` |
| 部件 | `bou6 gin2` | `bou6 gin6` |
| 部隊 | `bou6 deoi2` | `bou6 deoi6` |
| 郵局 | `jau4 guk2` | `jau4 guk6` |
| 配件 | `pui3 gin2` | `pui3 gin6` |
| 酒醉三分醒 | `zau2 zeoi3 saam1 fan1 sing2` | `zau2 zeoi3 saam1 fan1 seng2` |
| 醒扒 | `sing2 paa2` | `sing2 paa4` |
| 醫管局 | `ji1 gun2 guk2` | `ji1 gun2 guk6` |
| 醫院管理局 | `ji1 jyun2 gun2 lei5 guk2` | `ji1 jyun2 gun2 lei5 guk6` |
| 重疊疊 | `cung2 dap6 dap6` | `cung5 dap6 dap6` |
| 重陽 | `cung4 joeng2` | `cung4 joeng4` |
| 金圓券 | `gam1 jyun4 hyun3` | `gam1 jyun4 gyun3` |
| 金舖 | `gam1 pou2` | `gam1 pou3` |
| 金額 | `gam1 ngaak2` | `gam1 ngaak6` |
| 金魚 | `gam1 jyu2` | `gam1 jyu4` |
| 釣魚 | `diu3 jyu2` | `diu3 jyu4` |
| 鈴鈴霖霖 | `ling4 ling1 lam4 lam3` | `ling4 ling1 lam4 lam4` |
| 鉑金 | `bok6 gam1` | `baak6 gam1` |
| 鋤頭 | `co4 tau2` | `co4 tau4` |
| 錯綜複雜 | `co3 zung1 fuk1 zaap6` | `cok3 zung1 fuk1 zaap6` |
| 鎖匙扣 | `so2 ci4 kau3` | `so2 si4 kau3` |
| 鑊仔牛柳 | `wok3 zai2 ngau4 lau5` | `wok6 zai2 ngau4 lau5` |
| 長咀洲 | `coeng4 zeoi2 zau1` | `zoeng2 zeoi2 zau1` |
| 長官 | `coeng4 gun1` | `zoeng2 gun1` |
| 長沙灣 | `coeng4 saa1 waan1` | `coeng4 saa1 waan4` |
| 長痛不如短痛 | `coeng4 tung3 bat1 jyu4 dyun2 tung3` | `coeng2 tung3 bat1 jyu4 dyun2 tung3` |
| 長莆 | `coeng4 pou4` | `zoeng2 pou4` |
| 開玩笑 | `hoi1 waan4 siu3` | `hoi1 wun6 siu3` |
| 闃礫緙嘞 | `gwik1 lik1 kaak1 laak1` | `kik1 lik1 kaak1 laak1` |
| 阻三阻四 | `zo2 saam1 zo2 sei3` | `zo2 sam1 zo2 sei3` |
| 阿拉伯聯合酋長國 | `aa3 laai1 baak3 lyun4 hap6 jau4 coeng4 gwok3` | `aa3 laai1 baak3 lyun4 hap6 jau4 zoeng2 gwok3` |
| 阿爾巴尼亞 | `aa3 ji5 baa1 nei6 aa3` | `aa3 ji5 baa1 nei4 aa3` |
| 阿爾巴尼亞人 | `aa3 ji5 baa1 nei6 aa3 jan4` | `aa3 ji5 baa1 nei4 aa3 jan4` |
| 附件 | `fu6 gin2` | `fu6 gin6` |
| 限額 | `haan6 ngaak2` | `haan6 ngaak6` |
| 陷阱 | `haam6 zeng6` | `ham6 zing6` |
| 隨便 | `ceoi4 bin2` | `ceoi4 bin6` |
| 雀躍 | `zoek3 joek3` | `zoek3 joek6` |
| 集會 | `zaap6 wui2` | `zaap6 wui6` |
| 雉雞尾 | `ci1 gai1 mei5` | `zi6 gai1 mei5` |
| 雕刻 | `diu1 hak1` | `tiu1 hak1` |
| 雙孖鯉魚 | `soeng1 maa1 lei5 jyu4` | `soeng1 maa1 lei5 jyu2` |
| 雙窬牆 | `soeng1 jyu2 coeng4` | `soeng1 jyu4 coeng4` |
| 雛形 | `co1 jing4` | `co4 jing4` |
| 雜貨舖 | `zaap6 fo3 pou2` | `zaap6 fo3 pou3` |
| 雞仔媒人 | `gai1 zai2 mui4 jan2` | `gai1 zai2 mui4 jan4` |
| 雞搥 | `gai1 ceoi2` | `gai1 ceoi4` |
| 雞蛋 | `gai1 daan2` | `gai1 daan6` |
| 雞蛋果 | `gai1 daan2 gwo2` | `gai1 daan6 gwo2` |
| 難登大雅之堂 | `naan4 dang1 daai6 ngaa5 zi1 tong4` | `naan4 dang1 daai6 aa1 zi1 tong4` |
| 零件 | `ling4 gin2` | `ling4 gin6` |
| 零用錢 | `ling4 jung6 cin2` | `ling4 jung6 cin4` |
| 電筒 | `din6 tung2` | `din6 tung4` |
| 青春痘 | `cing1 ceon1 dau2` | `cing1 ceon1 dau6` |
| 青苔 | `ceng1 toi4` | `cing1 toi4` |
| 靡靡之音 | `mei4 mei4 zi1 jam1` | `mei5 mei5 zi1 jam1` |
| 面紅面綠 | `min6 hung4 min6 lok6` | `min6 hung4 min6 luk6` |
| 韻味 | `wan5 mei6` | `wan6 mei6` |
| 韻律 | `wan5 leot6` | `wan6 leot6` |
| 韻母 | `wan5 mou5` | `wan6 mou5` |
| 頂心頂肺 | `deng2 sam1 ding2 fai3` | `ding2 sam1 ding2 fai3` |
| 項鏈 | `hong6 lin2` | `hong6 lin6` |
| 順便 | `seon6 bin2` | `seon6 bin6` |
| 預測 | `jyu6 caak1` | `jyu6 cak1` |
| 預訂 | `jyu6 deng6` | `jyu6 ding6` |
| 領帶 | `ling5 daai2` | `ling5 daai3` |
| 頭牙 | `tau4 ngaa4` | `tau4 ngaa6` |
| 頸鏈 | `geng2 lin2` | `geng2 lin6` |
| 風火水電 | `fung1 fo2 seoi2 din6` | `fung3 fo2 seoi2 din6` |
| 飛彈 | `fei1 daan2` | `fei1 daan6` |
| 飛躍 | `fei1 joek3` | `fei1 joek6` |
| 食屎屙飯 | `sik6 si2 ngo1 faan6` | `sik6 si2 o1 faan6` |
| 香料粉 | `hoeng1 liu2 fan2` | `hoeng1 liu6 fan2` |
| 香港機場管理局 | `hoeng1 gong2 gei1 coeng4 gun2 lei5 guk2` | `hoeng1 gong2 gei1 coeng4 gun2 lei5 guk6` |
| 香港警務處 | `hoeng1 gong2 ging2 mou6 cyu5` | `hoeng1 gong2 ging2 mou6 cyu2` |
| 香港貿易發展局 | `hoeng1 gong2 mau6 ji6 faat3 zin2 guk2` | `hoeng1 gong2 mau6 jik6 faat3 zin2 guk6` |
| 香港金融管理局 | `hoeng1 gong2 gam1 jung4 gun2 lei5 guk2` | `hoeng1 gong2 gam1 jung4 gun2 lei5 guk6` |
| 香蕈 | `hoeng1 cam5` | `hoeng1 seon3` |
| 馬尼拉 | `maa5 nei4 laai1` | `maa5 nei4 laa1` |
| 馴鹿 | `seon4 luk2` | `seon4 luk6` |
| 騎樓 | `ke4 lau2` | `ke4 lau4` |
| 騎騎聲 | `ke4 ke2 sing1` | `ke4 ke4 seng1` |
| 騷擾 | `sou1 jiu2` | `sou1 jiu5` |
| 驟晴驟雨 | `zaau6 cing4 zaau6 jyu5` | `zau6 cing4 zau6 jyu5` |
| 驟死 | `zaau6 sei2` | `zau6 sei2` |
| 驟然 | `zaau6 jin4` | `zau6 jin4` |
| 驟落 | `zaau6 lok6` | `zau6 lok6` |
| 驟雨 | `zaau6 jyu5` | `zau6 jyu5` |
| 驢子 | `leoi4 zi2` | `lou4 zi2` |
| 骨巉巉 | `gwat1 caam4 caam4` | `gwat1 caam5 caam5` |
| 骾頸 | `kang2 geng2` | `gang2 geng2` |
| 高瘦平 | `gou1 sau3 ping4` | `gou1 sau3 ping5` |
| 鬭木佬 | `dou3 muk6 lou2` | `dau3 muk6 lou2` |
| 鬼鬼祟祟 | `gwai2 gwai2 seoi6 seoi6` | `gwai2 gwai2 syu2 syu2` |
| 魷魚 | `jau4 jyu2` | `jau4 jyu4` |
| 鯉魚 | `lei5 jyu2` | `lei5 jyu4` |
| 鯊魚 | `saa1 jyu2` | `saa1 jyu4` |
| 鰂魚涌 | `caak6 jyu4 cung1` | `zak1 jyu4 cung1` |
| 鰨沙 | `taap3 saa1` | `taat3 saa1` |
| 鱅魚 | `jung4 jyu2` | `sung4 jyu4` |
| 鱷魚夾 | `ngok6 jyu4 gaap3` | `ngok6 jyu4 gep2` |
| 鳩山由紀夫 | `kau1 saan1 jau4 gei2 fu1` | `gau1 saan1 jau4 gei2 fu1` |
| 鴿子 | `gaap3 zi2` | `gap3 zi2` |
| 鹹帶 | `haam4 daai2` | `haam4 daai3` |
| 鹹水角 | `haam4 seoi2 gok2` | `haam4 seoi2 gok3` |
| 鹹水話 | `haam4 seoi2 waa2` | `haam4 seoi2 waa6` |
| 麻雀 | `maa4 zoek2` | `maa4 zoek3` |
| 黃狗毛 | `wong4 gau2 mou1` | `wong4 gau2 mou4` |
| 黃黚黚 | `wong4 gam4 gam4` | `wong4 kam4 kam4` |
| 黐𥹉𥹉 | `ci1 nap6 nap6` | `ci1 nap5 nap5` |
| 黑盒 | `hak1 hap6` | `hak1 haap2` |
| 黑社會 | `hak1 se5 wui2` | `hak1 se5 wui6` |
| 黑膠綢 | `hak1 gaau1 cau2` | `hak1 gaau1 cau4` |
| 鼓氣袋 | `gu2 hei3 doi2` | `gu2 hei3 doi6` |
| 龜裂 | `gwan1 lit6` | `gwai1 lit6` |
| 𠹶呤𠾴唥 | `bing4 ling1 baang4 laang4` | `ping4 ling1 paang4 laang4` |
| 𠹶𠹶嘭嘭 | `bing4 bing4 baang4 baang4` | `ping4 ping4 paang4 paang4` |
| 𠽤叻𡃈嘞 | `kek1 lek1 gwaak1 laak1` | `kik1 lik1 kaak1 laak1` |
| 𢪎個輪 | `faak3 go3 leon2` | `faat3 go3 leon2` |
| 𢫕頭 | `fing6 tau2` | `wing6 tau4` |
| 𨳍啦 | `cat6 la1` | `cat6 laa1` |

## Multi-character corrections from segmentation (typo fixes)

| word | old | new | fixed char(s) |
|---|---|---|---|
| 一噼泥 | `jat1 pek6 nai4` | `jat1 pet1 nai4` | 噼: pek6->pet1 |
| 一爿 | `jat1 bing6` | `jat1 baan6` | 爿: bing6->baan6 |
| 三爿 | `saam1 bing6` | `saam1 baan6` | 爿: bing6->baan6 |
| 下單 | `haa6 daan2` | `haa6 daan1` | 單: daan2->daan1 |
| 丼丼亭 | `dong1 dong1 ting4` | `dam2 dam2 ting4` | 丼: dong1->dam2, 丼: dong1->dam2 |
| 丼丼屋 | `dong1 dong1 uk1` | `dam2 dam2 uk1` | 丼: dong1->dam2, 丼: dong1->dam2 |
| 九龍華仁 | `gau2 lung4 waa4 jan2` | `gau2 lung4 waa4 jan4` | 仁: jan2->jan4 |
| 乸脷 | `laa2 lei6` | `naa2 lei6` | 乸: laa2->naa2 |
| 乸西 | `laa2 sai1` | `naa2 sai1` | 乸: laa2->naa2 |
| 五藴 | `ng5 wan5` | `ng5 wan3` | 藴: wan5->wan3 |
| 何詩蓓 | `ho4 si1 pui5` | `ho4 si1 pui4` | 蓓: pui5->pui4 |
| 依哇鬼叫 | `wi1 waa1 gwai2 giu3` | `ji1 waa1 gwai2 giu3` | 依: wi1->ji1 |
| 信息工程 | `seon3 sik1 fo1 gei6` | `seon3 sik1 gung1 cing4` | 工: fo1->gung1, 程: gei6->cing4 |
| 優惠券 | `jau1 wai6 hyun3` | `jau1 wai6 gyun3` | 券: hyun3->gyun3 |
| 光脱脱 | `gwong1 tyut1 tyut1` | `gwong1 tyut3 tyut3` | 脱: tyut1->tyut3, 脱: tyut1->tyut3 |
| 兩爿 | `loeng5 bing6` | `loeng5 baan6` | 爿: bing6->baan6 |
| 削噼噼 | `soek3 pet6 pet6` | `soek3 pet1 pet1` | 噼: pet6->pet1, 噼: pet6->pet1 |
| 勁呀 | `ging6 aa1` | `ging6 aa4` | 呀: aa1->aa4 |
| 北港㘭 | `bak1 gong2 aau3` | `bak1 gong2 aau1` | 㘭: aau3->aau1 |
| 北港㘭路 | `bak1 gong2 aau3 lou6` | `bak1 gong2 aau1 lou6` | 㘭: aau3->aau1 |
| 區嘉宏 | `au1 gaa1 wang4` | `keoi1 gaa1 wang4` | 區: au1->keoi1 |
| 區廷筠 | `au1 ting4 gwan1` | `keoi1 ting4 wan4` | 區: au1->keoi1, 筠: gwan1->wan4 |
| 區文詩 | `au1 man4 si1` | `keoi1 man4 si1` | 區: au1->keoi1 |
| 區新明 | `au1 san1 ming4` | `keoi1 san1 ming4` | 區: au1->keoi1 |
| 區海倫 | `au1 hoi2 leon4` | `keoi1 hoi2 leon4` | 區: au1->keoi1 |
| 區靄玲 | `au1 oi2 ling4` | `keoi1 oi2 ling4` | 區: au1->keoi1 |
| 又要做雞又要攞貞節牌坊 | `jau6 jiu3 zou6 gai1 jau6 jiu3 lo2 zing1 zit1 paai4 fong1` | `jau6 jiu3 zou6 gai1 jau6 jiu3 lo2 zing1 zit3 paai4 fong1` | 節: zit1->zit3 |
| 叉燒丼家 | `caa1 siu1 dong1 gaa1` | `caa1 siu1 dam2 gaa1` | 丼: dong1->dam2 |
| 右鈎拳 | `jau6 gau1 kyun4` | `jau6 ngau1 kyun4` | 鈎: gau1->ngau1 |
| 吃屎 | `jaak3 si2` | `hek3 si2` | 吃: jaak3->hek3 |
| 吃屎大 | `jaak3 si2 daai6` | `hek3 si2 daai6` | 吃: jaak3->hek3 |
| 吃屎狗 | `jaak3 si2 gau2` | `hek3 si2 gau2` | 吃: jaak3->hek3 |
| 吃蕉 | `jaak3 ziu1` | `hek3 ziu1` | 吃: jaak3->hek3 |
| 吞嚥 | `tan1 jin1` | `tan1 jin3` | 嚥: jin1->jin3 |
| 吳祥川 | `ng5 coeng4 cyun1` | `ng4 coeng4 cyun1` | 吳: ng5->ng4 |
| 呀屌 | `aa3 diu2` | `aa4 diu2` | 呀: aa3->aa4 |
| 呀屌你 | `aa3 diu2 nei5` | `aa4 diu2 nei5` | 呀: aa3->aa4 |
| 和衷街 | `wo4 zung1 gaai1` | `wo4 cung1 gaai1` | 衷: zung1->cung1 |
| 唇釉 | `seon4 zuk6` | `seon4 jau6` | 釉: zuk6->jau6 |
| 唔贏 | `m4 jing4` | `m4 jeng4` | 贏: jing4->jeng4 |
| 啦掕 | `naa1 nang3` | `laa1 ling4` | 啦: naa1->laa1, 掕: nang3->ling4 |
| 喉核 | `hau4 wat2` | `hau4 hat6` | 核: wat2->hat6 |
| 單文柔 | `sin6 man4 jau4` | `daan1 man4 jau4` | 單: sin6->daan1 |
| 嚴家淦 | `jim4 gaa1 gaam3` | `jim4 gaa1 gam3` | 淦: gaam3->gam3 |
| 因住焫親 | `jan1 zyu6 laat6 can1` | `jan1 zyu6 naat3 can1` | 焫: laat6->naat3 |
| 囱門 | `cung1 mun4` | `coeng1 mun4` | 囱: cung1->coeng1 |
| 土司工坊 | `tou2 si1 gung1 fong4` | `tou2 si1 gung1 fong1` | 坊: fong4->fong1 |
| 堂吃 | `tong4 jaak3` | `tong4 hek3` | 吃: jaak3->hek3 |
| 外匯兑換 | `ngoi6 wui6 deoi6 wun6` | `ngoi6 wui6 deoi3 wun6` | 兑: deoi6->deoi3 |
| 多啦美 | `do1 laai1 mei5` | `do1 laa1 mei5` | 啦: laai1->laa1 |
| 大口環根德公爵夫人兒童醫院 | `daai6 hau2 waan4 gan1 dak1 gung1 zoek3 fu1 jan4 ngai4 tung4 ji1 jyun2` | `daai6 hau2 waan4 gan1 dak1 gung1 zoek3 fu1 jan4 ji4 tung4 ji1 jyun2` | 兒: ngai4->ji4 |
| 大煙囱 | `daai6 jin1 cung1` | `daai6 jin1 coeng1` | 囱: cung1->coeng1 |
| 大雄 | `daai6 hung6` | `daai6 hung4` | 雄: hung6->hung4 |
| 奀裊裊 | `ngan1 niu1 niu1` | `ngan1 niu5 niu5` | 裊: niu1->niu5, 裊: niu1->niu5 |
| 好叻 | `hou2 lak6` | `hou2 lek1` | 叻: lak6->lek1 |
| 好難為 | `hou2 naan4 wai2` | `hou2 naan4 wai6` | 為: wai2->wai6 |
| 嬲唔嬲 | `niu5 m4 niu5` | `nau1 m4 nau1` | 嬲: niu5->nau1, 嬲: niu5->nau1 |
| 孖煙囱 | `maa1 jin1 tung1` | `maa1 jin1 coeng1` | 囱: tung1->coeng1 |
| 孫曉慧 | `syun1 aau1 wai6` | `syun1 hiu2 wai6` | 曉: aau1->hiu2 |
| 孫玉菡 | `syun1 juk6 aam2` | `syun1 juk6 haam5` | 菡: aam2->haam5 |
| 容羨媛 | `jung4 sin6 jyun6` | `jung4 sin6 wun4` | 媛: jyun6->wun4 |
| 審食其 | `sam2 ji6 gei1` | `sam2 sik6 kei4` | 食: ji6->sik6, 其: gei1->kei4 |
| 屈臣氏 | `wat1 san4 si2` | `wat1 san4 si6` | 氏: si2->si6 |
| 屯門赤鱲角隧道 | `tyun4 mun4 cek3 lip6 gok3 seoi6 dou6` | `tyun4 mun4 cek3 laap6 gok3 seoi6 dou6` | 鱲: lip6->laap6 |
| 屯門赤鱲角隧道公路 | `tyun4 mun4 cek3 lip6 gok3 seoi6 dou6 gung1 lou6` | `tyun4 mun4 cek3 laap6 gok3 seoi6 dou6 gung1 lou6` | 鱲: lip6->laap6 |
| 差之毫釐繆之千里 | `caa1 zi1 hou4 lei4 mau6 zi1 cin1 lei5` | `caa1 zi1 hou4 lei4 mau4 zi1 cin1 lei5` | 繆: mau6->mau4 |
| 差之毫釐繆以千里 | `caa1 zi1 hou4 lei4 mau6 ji5 cin1 lei5` | `caa1 zi1 hou4 lei4 mau4 ji5 cin1 lei5` | 繆: mau6->mau4 |
| 底藴 | `dai2 wan5` | `dai2 wan3` | 藴: wan5->wan3 |
| 廿年 | `nim6 nin4` | `jaa6 nin4` | 廿: nim6->jaa6 |
| 廿幾 | `nim6 gei2` | `jaa6 gei2` | 廿: nim6->jaa6 |
| 弗羅茨瓦夫 | `fat6 lo4 ci4 ngaa5 fu1` | `fat1 lo4 ci4 ngaa5 fu1` | 弗: fat6->fat1 |
| 弗里敦 | `fat6 lei5 deon1` | `fat1 lei5 deon1` | 弗: fat6->fat1 |
| 張蔓姿 | `zoeng1 maan4 zi1` | `zoeng1 maan6 zi1` | 蔓: maan4->maan6 |
| 張蔓莎 | `zoeng1 maan4 saa1` | `zoeng1 maan6 saa1` | 蔓: maan4->maan6 |
| 張衛健 | `zoeng1 wai5 gin6` | `zoeng1 wai6 gin6` | 衛: wai5->wai6 |
| 得嘅 | `dak1 ge2` | `dak1 ge3` | 嘅: ge2->ge3 |
| 復修 | `sau1 fuk6` | `fuk6 sau1` | 復: sau1->fuk6, 修: fuk6->sau1 |
| 忘啦 | `mong4 la1` | `mong4 laa1` | 啦: la1->laa1 |
| 忠吿 | `zung1 guk1` | `zung1 gou3` | 吿: guk1->gou3 |
| 恒隆 | `hang4 lung2` | `hang4 lung4` | 隆: lung2->lung4 |
| 恒隆中心 | `hang4 lung2 zung1 sam1` | `hang4 lung4 zung1 sam1` | 隆: lung2->lung4 |
| 惡屎稜登 | `ok3 si2 lang4 dang1` | `ok3 si2 ling4 dang1` | 稜: lang4->ling4 |
| 戴淑嬈 | `daai3 suk6 jiu4` | `daai3 suk6 jiu5` | 嬈: jiu4->jiu5 |
| 打爛齋缽 | `daa2 laan6 zaai1 but6` | `daa2 laan6 zaai1 but3` | 缽: but6->but3 |
| 打贏 | `daa2 jing4` | `daa2 jeng4` | 贏: jing4->jeng4 |
| 拍乸 | `paat1 naa4` | `paak3 naa2` | 拍: paat1->paak3, 乸: naa4->naa2 |
| 招商永隆銀行 | `ziu1 soeng1 wing5 lung2 ngan4 hong4` | `ziu1 soeng1 wing5 lung4 ngan4 hong4` | 隆: lung2->lung4 |
| 按揭證券有限公司 | `on3 kit3 zing3 hyun3 jau5 haan6 gung1 si1` | `on3 kit3 zing3 gyun3 jau5 haan6 gung1 si1` | 券: hyun3->gyun3 |
| 揀飲擇吃 | `gaan2 jam2 zaak6 jaak3` | `gaan2 jam2 zaak6 hek3` | 吃: jaak3->hek3 |
| 擰開 | `ning2 hoi1` | `ning6 hoi1` | 擰: ning2->ning6 |
| 攞到 | `lyut3 dou3` | `lo2 dou3` | 攞: lyut3->lo2 |
| 救世軍卜維廉中學 | `gau3 sai3 gwan1 baak6 wai4 lim4 zung1 hok6` | `gau3 sai3 gwan1 buk1 wai4 lim4 zung1 hok6` | 卜: baak6->buk1 |
| 智力障礙 | `zi3 lik6 zoeng4 ngoi6` | `zi3 lik6 zoeng3 ngoi6` | 障: zoeng4->zoeng3 |
| 有爿 | `jau5 bing6` | `jau5 baan6` | 爿: bing6->baan6 |
| 朱凌凌 | `zyu1 ling4 ling2` | `zyu1 ling4 ling4` | 凌: ling2->ling4 |
| 李惠利 | `lei5 wai6 lei5` | `lei5 wai6 lei6` | 利: lei5->lei6 |
| 李靖筠 | `lei5 zing6 gwan1` | `lei5 zing6 wan4` | 筠: gwan1->wan4 |
| 杜汶澤 | `dou6 man6 zaak6` | `dou6 man4 zaak6` | 汶: man6->man4 |
| 東帝汶人 | `dung1 dai3 man6 jan4` | `dung1 dai3 man4 jan4` | 汶: man6->man4 |
| 枱扇 | `toi4 sin3` | `toi2 sin3` | 枱: toi4->toi2 |
| 枱鐘 | `toi4 zung1` | `toi2 zung1` | 枱: toi4->toi2 |
| 梁琤 | `loeng4 zang1` | `loeng4 caang1` | 琤: zang1->caang1 |
| 梁銶鋸 | `loeng4 kau4 geoi1` | `loeng4 kau4 goe3` | 鋸: geoi1->goe3 |
| 楊何蓓茵 | `joeng4 ho4 bui3 jan1` | `joeng4 ho4 pui4 jan1` | 蓓: bui3->pui4 |
| 楊偲泳 | `joeng4 si1 wing6` | `joeng4 caai1 wing6` | 偲: si1->caai1 |
| 楊千嬅 | `joeng4 cin1 waa4` | `joeng4 cin1 waa6` | 嬅: waa4->waa6 |
| 楊碧筠 | `joeng4 bik1 gwan1` | `joeng4 bik1 wan4` | 筠: gwan1->wan4 |
| 楊茜堯 | `joeng4 sin6 jiu4` | `joeng4 sai1 jiu4` | 茜: sin6->sai1 |
| 檇李 | `zeoi3 lei5` | `kwai4 lei5` | 檇: zeoi3->kwai4 |
| 歐鎮灝 | `ngau1 zan3 hou6` | `au1 zan3 hou6` | 歐: ngau1->au1 |
| 永隆 | `wing5 lung2` | `wing5 lung4` | 隆: lung2->lung4 |
| 沈香林 | `sam4 hoeng1 lam4` | `sam2 hoeng1 lam4` | 沈: sam4->sam2 |
| 沙田㘭道 | `saa1 tin4 aau3 dou6` | `saa1 tin4 aau1 dou6` | 㘭: aau3->aau1 |
| 深海煙囱 | `sam1 hoi2 jin1 cung1` | `sam1 hoi2 jin1 coeng1` | 囱: cung1->coeng1 |
| 游説 | `jau4 seoi3` | `jau4 syut3` | 説: seoi3->syut3 |
| 游説團體 | `jau4 seoi3 tyun4 tai2` | `jau4 syut3 tyun4 tai2` | 説: seoi3->syut3 |
| 湮滅 | `jan1 mit6` | `jin1 mit6` | 湮: jan1->jin1 |
| 滑脱脱 | `waat6 tyut1 tyut1` | `waat6 tyut3 tyut3` | 脱: tyut1->tyut3, 脱: tyut1->tyut3 |
| 澀谷 | `sip3 guk1` | `gip3 guk1` | 澀: sip3->gip3 |
| 煙囱 | `jin1 tung1` | `jin1 coeng1` | 囱: tung1->coeng1 |
| 煙囱路 | `jin1 cung1 lou6` | `jin1 coeng1 lou6` | 囱: cung1->coeng1 |
| 燒枱炮 | `siu1 toi4 paau3` | `siu1 toi2 paau3` | 枱: toi4->toi2 |
| 燒肉火蔵 | `siu1 juk6 fo2 zong6` | `siu1 juk6 fo2 cong4` | 蔵: zong6->cong4 |
| 牛屎缽 | `ngau4 si2 but6` | `ngau4 si2 but3` | 缽: but6->but3 |
| 牛筋腩 | `ngau4 gan1 naam4` | `ngau4 gan1 naam5` | 腩: naam4->naam5 |
| 牡羊 | `muk6 joeng4` | `maau5 joeng4` | 牡: muk6->maau5 |
| 王䓪鳴 | `wong4 jik6 ming4` | `wong4 ji6 ming4` | 䓪: jik6->ji6 |
| 玩寶州 | `waan2 ban1 zau1` | `waan2 bou2 zau1` | 寶: ban1->bou2 |
| 瑤台 | `jiu4 ji4` | `jiu4 toi4` | 台: ji4->toi4 |
| 痴痴呆呆坐埋一枱 | `ci1 ci1 ngoi4 ngoi4 co5 maai4 jat1 toi4` | `ci1 ci1 ngoi4 ngoi4 co5 maai4 jat1 toi2` | 枱: toi4->toi2 |
| 白韞六 | `baak6 wan5 luk6` | `baak6 wan3 luk6` | 韞: wan5->wan3 |
| 白鱲灣 | `baak6 lip6 waan1` | `baak6 laap6 waan1` | 鱲: lip6->laap6 |
| 百老匯 | `baak3 lou5 wui2` | `baak3 lou5 wui6` | 匯: wui2->wui6 |
| 皇仁 | `wong4 jan2` | `wong4 jan4` | 仁: jan2->jan4 |
| 石枱 | `sek6 toi4` | `sek6 toi2` | 枱: toi4->toi2 |
| 礦山村 | `kong3 saan1 cyun1` | `kwong3 saan1 cyun1` | 礦: kong3->kwong3 |
| 社會科學學士 | `se5 wui2 fo1 hok1 hok1 si6` | `se5 wui2 fo1 hok6 hok6 si6` | 學: hok1->hok6, 學: hok1->hok6 |
| 神不守捨 | `san4 fau2 sau2 se2` | `san4 bat1 sau2 se2` | 不: fau2->bat1 |
| 穴蔵 | `jyut6 zong6` | `jyut6 cong4` | 蔵: zong6->cong4 |
| 窿㝫罅罅 | `lung1 lung1 laa3 laa3` | `lung1 lung4 laa3 laa3` | 㝫: lung1->lung4 |
| 第一爿 | `dai6 jat1 bing6` | `dai6 jat1 baan6` | 爿: bing6->baan6 |
| 第二爿 | `dai6 ji6 bing6` | `dai6 ji6 baan6` | 爿: bing6->baan6 |
| 筲官 | `siu1 gun1` | `saau1 gun1` | 筲: siu1->saau1 |
| 筲東 | `siu1 dung1` | `saau1 dung1` | 筲: siu1->saau1 |
| 紀律部隊 | `gei2 leot6 bou6 deoi1` | `gei2 leot6 bou6 deoi6` | 隊: deoi1->deoi6 |
| 紙鳶 | `zi2 jiu2` | `zi2 jyun1` | 鳶: jiu2->jyun1 |
| 繆家慶 | `miu6 gaa1 hing3` | `mau4 gaa1 hing3` | 繆: miu6->mau4 |
| 繆昀希 | `miu6 wan5 hei1` | `mau4 wan4 hei1` | 繆: miu6->mau4, 昀: wan5->wan4 |
| 繆浩昌 | `miu6 hou6 coeng1` | `mau4 hou6 coeng1` | 繆: miu6->mau4 |
| 缽仔糕 | `but6 zai2 gou1` | `but3 zai2 gou1` | 缽: but6->but3 |
| 老虎岩 | `lou5 fu2 jim4` | `lou5 fu2 ngaam4` | 岩: jim4->ngaam4 |
| 聖傑靈 | `sing3 git3 ling4` | `sing3 git6 ling4` | 傑: git3->git6 |
| 聖若瑟 | `sing3 joek3 sat1` | `sing3 joek6 sat1` | 若: joek3->joek6 |
| 聖道迦南書院 | `sing3 dou6 haai6 naam4 syu1 jyun2` | `sing3 dou6 gaa1 naam4 syu1 jyun2` | 迦: haai6->gaa1 |
| 聖餐枱 | `sing3 caan1 toi4` | `sing3 caan1 toi2` | 枱: toi4->toi2 |
| 肉漦漦 | `juk6 saan4 saan4` | `juk6 ci4 ci4` | 漦: saan4->ci4, 漦: saan4->ci4 |
| 胡蓓蔚 | `wu4 pui5 wai3` | `wu4 pui4 wai3` | 蓓: pui5->pui4 |
| 脱墨 | `tyut3 mak2` | `tyut3 mak6` | 墨: mak2->mak6 |
| 膝頭哥撨眼淚 | `sat1 tau4 go1 giu2 ngaan5 leoi6` | `sat1 tau4 go1 siu1 ngaan5 leoi6` | 撨: giu2->siu1 |
| 臭屎密冚 | `cau3 si2 mat6 gam2` | `cau3 si2 mat6 ham6` | 冚: gam2->ham6 |
| 芋泥 | `su6 nai4` | `wu6 nai4` | 芋: su6->wu6 |
| 芙莉蓮 | `fu6 lei6 lin4` | `fu4 lei6 lin4` | 芙: fu6->fu4 |
| 茜發道 | `sin6 faat3 dou6` | `sai1 faat3 dou6` | 茜: sin6->sai1 |
| 茜草灣 | `sin6 cou2 waan1` | `sai1 cou2 waan1` | 茜: sin6->sai1 |
| 莫韻諰 | `mok6 wan5 si1` | `mok6 wan5 saai2` | 諰: si1->saai2 |
| 華仁小學 | `waa4 jan2 siu2 hok6` | `waa4 jan4 siu2 hok6` | 仁: jan2->jan4 |
| 落地開花富貴榮華 | `lok6 dei6 hoi1 faa3 fu3 gwai3 wing4 waa4` | `lok6 dei6 hoi1 faa1 fu3 gwai3 wing4 waa4` | 花: faa3->faa1 |
| 葉蘊儀 | `jip6 wan3 ji4` | `jip6 wan5 ji4` | 蘊: wan3->wan5 |
| 董玉娣 | `dung2 juk6 tai3` | `dung2 juk6 tai5` | 娣: tai3->tai5 |
| 蔡廷鍇 | `coi3 ting4 kaai2` | `coi3 ting4 gaai1` | 鍇: kaai2->gaai1 |
| 蔣家旻 | `zoeng1 gaa1 man4` | `zoeng2 gaa1 man4` | 蔣: zoeng1->zoeng2 |
| 蔣祖曼 | `zoeng1 zou2 maan6` | `zoeng2 zou2 maan6` | 蔣: zoeng1->zoeng2 |
| 蔣麗萍 | `zoeng1 lai6 ping4` | `zoeng2 lai6 ping4` | 蔣: zoeng1->zoeng2 |
| 藴含 | `wan5 ham4` | `wan3 ham4` | 藴: wan5->wan3 |
| 藴涵 | `wan2 haam4` | `wan3 haam4` | 藴: wan2->wan3 |
| 藴積 | `wan2 zik1` | `wan3 zik1` | 藴: wan2->wan3 |
| 藴結 | `wan2 git3` | `wan3 git3` | 藴: wan2->wan3 |
| 藴聚 | `wan2 zeoi6` | `wan3 zeoi6` | 藴: wan2->wan3 |
| 藴蓄 | `wan2 cuk1` | `wan3 cuk1` | 藴: wan2->wan3 |
| 藴藏 | `wan5 cong4` | `wan3 cong4` | 藴: wan5->wan3 |
| 虎地㘭道 | `fu2 dei6 aau3 dou6` | `fu2 dei6 aau1 dou6` | 㘭: aau3->aau1 |
| 蛇蜕 | `se4 teoi3` | `se4 seoi3` | 蜕: teoi3->seoi3 |
| 蜕化 | `teoi3 faa3` | `seoi3 faa3` | 蜕: teoi3->seoi3 |
| 蜕化變質 | `teoi3 faa3 bin3 zat1` | `seoi3 faa3 bin3 zat1` | 蜕: teoi3->seoi3 |
| 蜕殼 | `teoi3 hok3` | `seoi3 hok3` | 蜕: teoi3->seoi3 |
| 蜕皮 | `teoi3 pei4` | `seoi3 pei4` | 蜕: teoi3->seoi3 |
| 蜕變 | `teoi3 bin3` | `seoi3 bin3` | 蜕: teoi3->seoi3 |
| 蝙蝠俠 | `pin3 fuk1 hap6` | `pin1 fuk1 hap6` | 蝙: pin3->pin1 |
| 蟬蜕 | `sim4 teoi3` | `sim4 seoi3` | 蜕: teoi3->seoi3 |
| 衣缽 | `ji1 but6` | `ji1 but3` | 缽: but6->but3 |
| 衣食足然後知榮辱 | `ji1 ji6 zeoi3 jin4 hau6 zi1 wing4 juk6` | `ji1 sik6 zuk1 jin4 hau6 zi1 wing4 juk6` | 食: ji6->sik6, 足: zeoi3->zuk1 |
| 裊瘦 | `niu1 sau3` | `niu5 sau3` | 裊: niu1->niu5 |
| 裊裊瘦瘦 | `niu1 niu1 sau3 sau3` | `niu5 niu5 sau3 sau3` | 裊: niu1->niu5, 裊: niu1->niu5 |
| 褸袋 | `leoi5 doi6` | `lau1 doi6` | 褸: leoi5->lau1 |
| 要贏 | `jiu3 jing4` | `jiu3 jeng4` | 贏: jing4->jeng4 |
| 詠歎 | `wing6 taan6` | `wing6 taan3` | 歎: taan6->taan3 |
| 説客 | `seoi3 haak3` | `syut3 haak3` | 説: seoi3->syut3 |
| 説服 | `seoi3 fuk6` | `syut3 fuk6` | 説: seoi3->syut3 |
| 説服力 | `seoi3 fuk6 lik6` | `syut3 fuk6 lik6` | 説: seoi3->syut3 |
| 諗嘢 | `sam2 je5` | `nam2 je5` | 諗: sam2->nam2 |
| 諗得 | `sam2 dak1` | `nam2 dak1` | 諗: sam2->nam2 |
| 諗計仔 | `sam2 gai2 zai2` | `nam2 gai2 zai2` | 諗: sam2->nam2 |
| 證券交易税 | `zing3 hyun3 gaau1 jik6 seoi3` | `zing3 gyun3 gaau1 jik6 seoi3` | 券: hyun3->gyun3 |
| 購物天堂 | `kaau3 mat6 tin1 tong4` | `kau3 mat6 tin1 tong4` | 購: kaau3->kau3 |
| 贏了 | `jing4 liu5` | `jeng4 liu5` | 贏: jing4->jeng4 |
| 贏咗 | `jing4 zo2` | `jeng4 zo2` | 贏: jing4->jeng4 |
| 贏波 | `jing4 bo1` | `jeng4 bo1` | 贏: jing4->jeng4 |
| 贏過 | `jing4 gwo3` | `jeng4 gwo3` | 贏: jing4->jeng4 |
| 赤鱲角南路 | `cek3 lip6 gok3 naam4 lou6` | `cek3 laap6 gok3 naam4 lou6` | 鱲: lip6->laap6 |
| 赤鱲角新村 | `cek3 lip6 gok3 san1 cyun1` | `cek3 laap6 gok3 san1 cyun1` | 鱲: lip6->laap6 |
| 赤鱲角路 | `cek3 lip6 gok3 lou6` | `cek3 laap6 gok3 lou6` | 鱲: lip6->laap6 |
| 趙聿修紀念中學 | `ziu6 wat6 sau1 gei2 nim6 zung1 hok6` | `ziu6 jyut6 sau1 gei2 nim6 zung1 hok6` | 聿: wat6->jyut6 |
| 趙食其 | `ziu6 ji6 gei1` | `ziu6 sik6 kei4` | 食: ji6->sik6, 其: gei1->kei4 |
| 迦密中學 | `haai6 mat6 zung1 hok6` | `gaa1 mat6 zung1 hok6` | 迦: haai6->gaa1 |
| 迦密主恩中學 | `haai6 mat6 zyu2 jan1 zung1 hok6` | `gaa1 mat6 zyu2 jan1 zung1 hok6` | 迦: haai6->gaa1 |
| 迦密唐賓南紀念中學 | `haai6 mat6 tong4 ban1 naam4 gei2 nim6 zung1 hok6` | `gaa1 mat6 tong4 ban1 naam4 gei2 nim6 zung1 hok6` | 迦: haai6->gaa1 |
| 迦密愛禮信中學 | `haai6 mat6 oi3 lai5 seon3 zung1 hok6` | `gaa1 mat6 oi3 lai5 seon3 zung1 hok6` | 迦: haai6->gaa1 |
| 迦密愛禮信小學 | `haai6 mat6 oi3 lai5 seon3 siu2 hok6` | `gaa1 mat6 oi3 lai5 seon3 siu2 hok6` | 迦: haai6->gaa1 |
| 迦密村街 | `haai6 mat6 cyun1 gaai1` | `gaa1 mat6 cyun1 gaai1` | 迦: haai6->gaa1 |
| 迦密柏雨中學 | `haai6 mat6 paak3 jyu5 zung1 hok6` | `gaa1 mat6 paak3 jyu5 zung1 hok6` | 迦: haai6->gaa1 |
| 迦密梁省德學校 | `haai6 mat6 loeng4 saang2 dak1 hok6 haau6` | `gaa1 mat6 loeng4 saang2 dak1 hok6 haau6` | 迦: haai6->gaa1 |
| 迦密聖道中學 | `haai6 mat6 sing3 dou6 zung1 hok6` | `gaa1 mat6 sing3 dou6 zung1 hok6` | 迦: haai6->gaa1 |
| 遺蜕 | `wai4 teoi3` | `wai4 seoi3` | 蜕: teoi3->seoi3 |
| 郭懿皚 | `gwok3 ji3 hoi2` | `gwok3 ji3 ngoi4` | 皚: hoi2->ngoi4 |
| 都贏 | `dou1 jing4` | `dou1 jeng4` | 贏: jing4->jeng4 |
| 酈食其 | `lik6 ji6 gei1` | `lik6 sik6 kei4` | 食: ji6->sik6, 其: gei1->kei4 |
| 醖釀 | `wan5 joeng6` | `wan3 joeng6` | 醖: wan5->wan3 |
| 野田珈琲 | `je5 tin4 gaa1 pui3` | `je5 tin4 gaa1 bei3` | 琲: pui3->bei3 |
| 金紫荊星章 | `daai6 zi2 ging1 sing1 zoeng1` | `gam1 zi2 ging1 sing1 zoeng1` | 金: daai6->gam1 |
| 鉛礦坳營地 | `jyun4 kong3 aau3 jing4 dei6` | `jyun4 kwong3 aau3 jing4 dei6` | 礦: kong3->kwong3 |
| 鉛鑛坳 | `jyun4 kong3 aau3` | `jyun4 gwong3 aau3` | 鑛: kong3->gwong3 |
| 銀礦灣泳灘 | `ngan4 kong3 waan1 wing6 taan1` | `ngan4 kwong3 waan1 wing6 taan1` | 礦: kong3->kwong3 |
| 銀鑛灣 | `ngan4 kong3 waan1` | `ngan4 gwong3 waan1` | 鑛: kong3->gwong3 |
| 銀鑛灣路 | `ngan4 kong3 waan1 lou6` | `ngan4 gwong3 waan1 lou6` | 鑛: kong3->gwong3 |
| 陳兆民 | `can1 siu6 man4` | `can4 siu6 man4` | 陳: can1->can4 |
| 陳明憙 | `can4 ming4 hei1` | `can4 ming4 hei2` | 憙: hei1->hei2 |
| 難為 | `naan4 wai2` | `naan4 wai6` | 為: wai2->wai6 |
| 靜兒 | `sing6 ji4` | `zing6 ji4` | 靜: sing6->zing6 |
| 預覽 | `jyu6 laam2` | `jyu6 laam5` | 覽: laam2->laam5 |
| 飛天小女警 | `fei1 tin siu2 neoi5 ging2` | `fei1 tin1 siu2 neoi5 ging2` | 天: tin->tin1 |
| 香港兒童醫院 | `hoeng1 gong2 ngai4 tung4 ji1 jyun2` | `hoeng1 gong2 ji4 tung4 ji1 jyun2` | 兒: ngai4->ji4 |
| 香港按揭證券有限公司 | `hoeng1 gong2 on3 kit3 zing3 hyun3 jau5 haan6 gung1 si1` | `hoeng1 gong2 on3 kit3 zing3 gyun3 jau5 haan6 gung1 si1` | 券: hyun3->gyun3 |
| 香港華仁 | `hoeng1 gong2 waa4 jan2` | `hoeng1 gong2 waa4 jan4` | 仁: jan2->jan4 |
| 高血脂 | `gou2 hyut3 zi1` | `gou1 hyut3 zi1` | 高: gou2->gou1 |
| 鶴藪圍 | `hok6 dau3 wai4` | `hok6 sau2 wai4` | 藪: dau3->sau2 |
| 鶴藪排 | `hok6 dau3 paai4` | `hok6 sau2 paai4` | 藪: dau3->sau2 |
| 鶴藪灌溉水塘 | `hok6 dau3 gun3 koi3 seoi2 tong4` | `hok6 sau2 gun3 koi3 seoi2 tong4` | 藪: dau3->sau2 |
| 鶴藪營地 | `hok6 dau3 jing4 dei6` | `hok6 sau2 jing4 dei6` | 藪: dau3->sau2 |
| 鶴藪道 | `hok6 dau3 dou6` | `hok6 sau2 dou6` | 藪: dau3->sau2 |
| 鷸蚌相爭漁人得利 | `neot6 pong5 soeng1 zang1 jyu4 jan4 dak1 lei6` | `wat6 pong5 soeng1 zang1 jyu4 jan4 dak1 lei6` | 鷸: neot6->wat6 |
| 麗澤 | `lai6 zaak2` | `lai6 zaak6` | 澤: zaak2->zaak6 |
| 麗莎 | `lai6 sa1` | `lai6 saa1` | 莎: sa1->saa1 |
| 麺屋武蔵 | `min6 uk1 mou5 zong6` | `min6 uk1 mou5 cong4` | 蔵: zong6->cong4 |
| 黃淑蔓 | `wong4 suk6 maan4` | `wong4 suk6 maan6` | 蔓: maan4->maan6 |
| 龍脊 | `lung4 zik3` | `lung4 zek3` | 脊: zik3->zek3 |
| 龍貓 | `lung6 maau1` | `lung4 maau1` | 龍: lung6->lung4 |
| 龔茜彤 | `gung1 sin6 tung4` | `gung1 sai1 tung4` | 茜: sin6->sai1 |
