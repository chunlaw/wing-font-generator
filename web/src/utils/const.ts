export const TEMPLATES: string[] = [
  "勒到呼吸困難才知變扯線木偶",
  "拳頭若放開　可擁抱四周",
  "活著自活著 萬象在逝水中暢泳",
  "如果心聲真有療效　誰怕暴露更多",
  "回望最初　當喪失是得著可不可",
  "立志助世人脫貧以為　便偉大到像多麼有為",
  "誰能憑愛意要富士山私有",
  "惟有我聽過你對我哭訴",
  "各有各唱自己歌　各找自我",
  "寂寞在流動　某些真的假的夢",
  "如海嘯衝擊我　使我向下沉",
  "我會在旁　開心玩　四處捐",
  "我為你偷偷心動　感覺神情凝重",
  "旋轉兜圈的感覺太逼真",
  "我這樣討厭　他完美如此　能共你好好地相處",
  "曳搖共對輕舟飄　互傳誓約慶春曉",
  "甜蜜地與愛人　風裏飛奔",
  "願一生中苦痛快樂也體驗",
  "想不想也日夜懷念　連甜夢也不夠甜",
  "遲了悔改　只好講抵你離開",
  "荒誕像這一切也變成往常",
  "別要我洗去　我的雙腳泥濘",
  "留在彼此的身邊　牽著手再繼續飛",
  "永遠有一個吻未嘗",
  "望著他雙眼想別人　人留下了留不低那片心",
];

export interface FontOption {
  name: string;
  displayName: string;
  source: string;
}

export type FontSet = Record<
  string,
  {
    lang: Record<string, string>;
    fonts: Record<string, FontOption>;
  }
>;

/*
 * Showcase curation:
 *
 * The CI workflow (.github/workflows/build-fonts.yml) builds ~30 font
 * variants and deploys them all to wing-fonts.chunlaw.io/fonts/. The
 * showcase page surfaces only a CURATED SUBSET of those builds — 6
 * entries chosen to demonstrate maximally-distinct concepts rather
 * than visually-similar romanization variants.
 *
 * Showcasing rule: every entry must illustrate a different angle of
 * the product's range. If two entries look near-identical to a
 * casual viewer (e.g. LSHK vs Lau, both Latin-letter romanizations
 * on the same Sung base), only ONE belongs here.
 *
 * Currently surfaced (6):
 *   • LSHK Jyutping  — primary / most-widely-used Latin romanization
 *   • Yale           — historical alternative Latin romanization
 *   • Cangjie        — completely different concept: CJK input method
 *   • Thai script    — non-Latin transliteration (Google Sans)
 *   • Katakana       — non-Latin transliteration (Noto Sans JP)
 *   • Hangul         — non-Latin transliteration (Noto Sans KR)
 *
 * Built but NOT showcased (still reachable directly under /fonts/):
 *   • Chishima / Lau / Guangdong — three additional Latin romanizations,
 *     redundant with LSHK + Yale for showcase purposes.
 *   • Every *-It italic variant — same content, subtle base-font style
 *     variation that doesn't teach anything new at picker resolution.
 *
 * If you want a dropped variant re-surfaced, add it back here — the
 * file is the only place that controls what the FontPicker shows.
 */
export const AVAILABLE_FONTS: FontSet = {
  cantonese: {
    lang: {
      zh: "廣東話",
    },
    fonts: {
      "ChironSungHK-Noto-lshk": {
        displayName: "昭源宋體（香港語言學會）",
        name: "ChironSungHK-Noto-lshk",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lshk.woff) format('woff')`,
      },
      "ChironSungHK-Noto-yale": {
        displayName: "昭源宋體（耶魯拼音）",
        name: "ChironSungHK-Noto-yale",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-yale.woff) format('woff')`,
      },
      "ChironSungHK-cangjie": {
        displayName: "昭源宋體（倉頡）",
        name: "ChironSungHK-cangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-cangjie.woff) format('woff')`,
      },
      "ChironSungHK-Google-thai": {
        displayName: "昭源宋體（泰文標注）",
        name: "ChironSungHK-Google-thai",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Google-thai.woff) format('woff')`,
      },
      "ChironSungHK-NotoJP-katakana": {
        displayName: "昭源宋體（片假名標注）",
        name: "ChironSungHK-NotoJP-katakana",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-NotoJP-katakana.woff) format('woff')`,
      },
      "ChironSungHK-NotoKR-korean": {
        displayName: "昭源宋體（諺文標注）",
        name: "ChironSungHK-NotoKR-korean",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-NotoKR-korean.woff) format('woff')`,
      },
    },
  },
  // mandarin: {
  //   lang: {
  //     zh: '國語',
  //   },
  //   fonts: {
  //     "Noto-Noto-bopomofo": {
  //       displayName: "NotoSansTC (Bopomofo))",
  //       name: "Noto-Noto-bopomofo",
  //       source: `url(${import.meta.env.VITE_FONT_URL}/Noto-Noto-bopomofo.woff) format('woff')`,
  //     }
  //   },
  // }
};
