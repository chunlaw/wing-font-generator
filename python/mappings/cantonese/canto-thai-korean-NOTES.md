# canto-thai.csv & canto-korean.csv — transliteration notes

Generated from `canto-lshk.csv` (Jyutping). Each Jyutping syllable is transliterated
phonetically; **tone is written as the trailing digit 1–6** (true tone is not encoded
in the script, since neither Thai nor Hangul tone-spelling maps onto Cantonese's six
tones). Multi-syllable readings are transliterated syllable-by-syllable, space-separated.

Note: Thai's native tone marks (่ ้ ๊ ๋) are deliberately NOT used — there are only four
of them (five categories), too few for six Cantonese tones, and their realized pitch is
relative to the consonant class, so a Thai reader would apply the wrong pitch. A separate
absolute tone number avoids that.

## Initials

| Jyutping | IPA | Thai | Hangul | Note |
|---|---|---|---|---|
| b | p | ป | ㅂ | |
| p | pʰ | พ | ㅍ | |
| d | t | ต | ㄷ | unaspirated → Thai voiceless ต (your choice) |
| t | tʰ | ท | ㅌ | |
| g | k | ก | ㄱ | |
| k | kʰ | ค | ㅋ | |
| m | m | ม | ㅁ | |
| n | n | น | ㄴ | |
| l | l | ล | ㄹ | |
| f | f | ฟ | **ㅎ** | Korean has no /f/ → ㅎ (your choice) |
| s | s | ส | ㅅ | |
| h | h | ห | ㅎ | |
| z | ts/tɕ | จ | ㅈ | |
| c | tsʰ/tɕʰ | ช | ㅊ | |
| j | j | ย | ㅇ+y-vowel | glide folded into vowel in Hangul |
| w | w | ว | ㅇ+w-vowel | glide folded into vowel in Hangul |
| ng | ŋ | ง | **ㅇ (silent)** | Korean has no initial /ŋ/ → nasal is lost |
| gw | kʷ | กว (cluster) | ㄱ+w-vowel | no single Thai/Hangul letter |
| kw | kʷʰ | คว (cluster) | ㅋ+w-vowel | no single Thai/Hangul letter |
| (zero) | ʔ | อ | ㅇ | |
| m̩ (唔) | m̩ | อืม | 음 | syllabic nasal |
| ng̩ (五/吳) | ŋ̩ | อืง | 응 | syllabic nasal |
| hm | h̃m̩ | ฮืม | 흠 | rare |
| hng | h̃ŋ̩ | ฮืง | 흥 | rare |

## Vowels / finals

Thai long /aː/ = า, short /ɐ/ = ◌ั / ◌ะ; e /ɛː/ = แ◌; o /ɔː/ = ◌อ; ou /ou/ = โ◌;
oe·eo /œː·ɵ/ = เ◌อ / เ◌ิ; **yu /yː/ → อู (/uu/, your choice)**.
Codas: -m ม · -n น · -ng ง · -p ป · -t ต · -k ก. Off-glides: -i ◌ย, -u ◌ว.

Hangul nuclei: aa·a ㅏ · e ㅔ · i ㅣ · o ㅗ · u ㅜ · oe·eo ㅓ · yu ㅟ.
Codas: -m ㅁ · -n ㄴ · -ng ㅇ · -p ㅂ · **-t ㅅ (phonetic, your choice)** · -k ㄱ.
Vowel off-glides become a following block: -i → 이, -u → 우 (e.g. gaau1 → 가우1).
**Short /ɐ/ is written ㅏ (same as long /aː/)** — phonetically /ɐ/ is far closer to
ㅏ than ㅓ (e.g. 留 lau4 → 라우, 心 sam1 → 삼). Korean has no length mark, so the
long/short contrast is not shown (see merges below).

## Known approximations / merges (unavoidable under the script)

- **Thai**: `yu`≈`u` (both อู), so e.g. jyu/ju merge. `eoi`≈`ui` (both ◌ูย) for the few
  shared initials (g, k). Thai script can't show Cantonese length on /i/, /u/.
- **Hangul**: `aa`/`a` length is lost — both → ㅏ, so e.g. 三 saam & 心 sam → 삼,
  撈 laau & 留 lau → 라우. (Chosen for phonetic accuracy of the short vowel.)
  `gw`/`kw` + diphthong gives blocks like 과이 (gwai), close to Sino-Korean 귀 but
  a phonetic spelling, not a Sino-Korean reading.
- `ng-` initial and the syllabic nasals: in Korean the initial /ŋ/ is dropped (오 etc.);
  only syllabic 唔/五 keep a nasal (음/응).

## Katakana (canto-katakana.csv)

Katakana is moraic, so it can't close syllables natively. Choices applied:

- **Unaspirated b/d/g/z → voiced kana** バ/ダ/ガ/ザ·ジ (natural Japanese loan
  perception); aspirated p/t/k/c → パ/タ/カ/ツ·チ. Keeps the pairs distinct.
- **Stop codas -p/-t/-k → sokuon ッ** (entering-tone style). All three merge: 法 faat3
  → ファーッ3, 一 jat1 → ヤッ1, 六 luk6 → ルッ6.
- **Nasal codas -m/-n/-ng → all ン** (like ホンコン): 心 sam1·新 san1 → サン1.
- **Long aa → ー**, short a → none: 三 saam1 → サーン1 vs 心 sam1 → サン1.
- l → ラ行 (no /l/ in Japanese). ng- initial → ガ行 (velar, merges with g-): 牙 ngaa4
  → ガー4. gw/kw → グァ/クァ etc. yu → palatal +ュ: 書 syu1 → シュ1.
- oe/eo → オ (no front-rounded vowel; merges with o). Off-glides -i/-u → イ/ウ.
- Syllabic 唔 → ム, 五/吳 → ン.

## Baybayin (canto-filipino.csv)

Baybayin is an abugida with only 3 vowels (a, i/e, u/o) and ~14 consonants. Choices:

- **Final consonants written with virama ◌᜔** (Spanish krus-kudlit): 心 sam1 → ᜐᜋ᜔1,
  一 jat1 → ᜌᜆ᜔1. (Traditional Baybayin drops finals entirely; we keep them.)
- **Unaspirated b/d/g → voiced letters** ᜊ/ᜇ/ᜄ; aspirated p/t/k → voiceless ᜉ/ᜆ/ᜃ
  (Baybayin has no aspiration; this keeps the pairs distinct).
- **Affricates z, c → SA ᜐ** (Tagalog substitutes /s/ for /ts, tʃ/) — z, c, s all merge.
- **f- → PA ᜉ** (Filipino renders /f/ as /p/) — merges with p-.
- Vowels: aa/a → a (length lost); e/i → ◌ᜒ; o/u → ◌ᜓ; oe/eo and yu → ◌ᜓ (rounded,
  merge with o/u). Off-glides -i/-u → trailing ᜁ/ᜂ (e.g. 留 lau4 → ᜎᜂ4, 牛 ngau4 → ᜅᜂ4).
- ng- keeps its nasal (ᜅ, unlike Korean): 牙 ngaa4 → ᜅ4. l → ᜎ (no /r/ vs /l/ split here).
  gw/kw → cluster with virama: 貴 gwai3 → ᜄ᜔ᜏᜁ3. Syllabic 唔 → ᜋ᜔, 五 → ᜅ᜔.

## Urdu (canto-urdu.csv)

Urdu = Perso-Arabic (Nastaʿlīq), right-to-left abjad. Unusually for this set, it can
show BOTH the aspiration contrast and the aa/a length contrast. Choices:

- **Aspiration-accurate stops/affricates**: unaspirated b/d/g → پ/ت/ک, aspirated p/t/k →
  پھ/تھ/کھ (with do-chashmi he ھ); z → چ, c → چھ; s → س. So 怕 paa3 → پھا3 vs 打 daa2 → تا2.
- **Long aa → alif ا, short /ɐ/ → zabar ◌َ**: 三 saam1 → سام1 vs 心 sam1 → سَم1 (this
  contrast survives here, unlike Korean/Baybayin).
- **Short vowels marked with harakat** (zabar ◌َ for /ɐ/); long vowels use letters
  (e → ے, i → ی, o/u → و).
- **oe/eo/yu → و** (back/rounded, your choice) — merge with o/u: 香 hoeng1 → ہونگ1,
  書 syu1 → سو1. o & u also share و.
- ng- → نگ (digraph; keeps the nasal). l → ل. gw/kw → کو / کھو. j → ی, w → و.
  Syllabic 唔 → م, 五 → نگ. Tone = Western digit 1–6.
- Note: the digit sits in a right-to-left field, so bidi reordering may place it visually
  to the left of the Urdu when rendered — the stored data order is reading-then-number.

## Registered in the web UI
All five are wired into the Step 2 mapping dropdown in `web/src/utils/wingfontPresets.ts`
(泰文 / 諺文 / 片仮名 / ᜊᜌ᜔ᜊᜌᜒᜈ᜔ / اردو) with matching MANIFEST entries in
`web/scripts/sync-python.mjs`. Note: the Step 1 annotation font must cover the target
script's glyphs (Thai / Hangul / Kana / Baybayin / Urdu) or the composed output shows
tofu (□). For Baybayin use e.g. Noto Sans Tagalog; for Urdu, Noto Nastaliq Urdu.
