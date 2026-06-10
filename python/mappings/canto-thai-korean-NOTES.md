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

Hangul nuclei: aa ㅏ · a ㅓ · e ㅔ · i ㅣ · o ㅗ · u ㅜ · oe·eo ㅓ · yu ㅟ.
Codas: -m ㅁ · -n ㄴ · -ng ㅇ · -p ㅂ · **-t ㅅ (phonetic, your choice)** · -k ㄱ.
Vowel off-glides become a following block: -i → 이, -u → 우 (e.g. gaau1 → 가우1).

## Known approximations / merges (unavoidable under the script)

- **Thai**: `yu`≈`u` (both อู), so e.g. jyu/ju merge. `eoi`≈`ui` (both ◌ูย) for the few
  shared initials (g, k). Thai script can't show Cantonese length on /i/, /u/.
- **Hangul**: `aa`/`a` length is lost (ㅏ vs ㅓ used to keep them visibly distinct).
  `ai`≈`eoi` (both ㅓ+이) for shared initials. `gw`/`kw` + diphthong gives blocks like
  궈이 (gwai) rather than the Sino-Korean 귀 — this is a phonetic spelling, not a
  Sino-Korean reading.
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

## Registered in the web UI
All three are wired into the Step 2 mapping dropdown in `web/src/utils/wingfontPresets.ts`
(泰文 / 諺文 / 片仮名) with matching MANIFEST entries in `web/scripts/sync-python.mjs`.
Note: the Step 1 annotation-font presets don't cover Thai/Hangul/Kana glyphs — pick a
font with the right script coverage or the composed output will show tofu (□).
