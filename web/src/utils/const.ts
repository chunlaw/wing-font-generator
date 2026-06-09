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
      "ChironSungHK-Noto-chishima": {
        displayName: "昭源宋體（千島式表記法）",
        name: "ChironSungHK-Noto-chishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-chishima.woff) format('woff')`,
      },
      "ChironSungHK-Noto-lau": {
        displayName: "昭源宋體（劉錫祥）",
        name: "ChironSungHK-Noto-lau",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lau.woff) format('woff')`,
      },
      "ChironSungHK-Noto-guangdong": {
        displayName: "昭源宋體（廣州話）",
        name: "ChironSungHK-Noto-guangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lau.woff) format('woff')`,
      },
      "ChironSungHK-cangjie": {
        displayName: "昭源宋體（倉頡）",
        name: "ChironSungHK-cangjie",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-cangjie.woff) format('woff')`,
      },
      "ChironSungHK-Noto-lshk-It": {
        displayName: "昭源宋體（香港語言學會 斜體）",
        name: "ChironSungHK-Noto-lshk-It",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lshk-It.woff) format('woff')`,
      },
      "ChironSungHK-Noto-yale-It": {
        displayName: "昭源宋體（耶魯拼音 斜體）",
        name: "ChironSungHK-Noto-yale-It",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-yale-It.woff) format('woff')`,
      },
      "ChironSungHK-Noto-chishima-It": {
        displayName: "昭源宋體（千島式表記法 斜體）",
        name: "ChironSungHK-Noto-chishima",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-chishima-It.woff) format('woff')`,
      },
      "ChironSungHK-Noto-lau-It": {
        displayName: "昭源宋體（劉錫祥 斜體）",
        name: "ChironSungHK-Noto-lau",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lau-It.woff) format('woff')`,
      },
      "ChironSungHK-Noto-guangdong-It": {
        displayName: "昭源宋體（廣州話 斜體）",
        name: "ChironSungHK-Noto-guangdong",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-Noto-lau-It.woff) format('woff')`,
      },
      "ChironSungHK-cangjie-It": {
        displayName: "昭源宋體（倉頡 斜體）",
        name: "ChironSungHK-cangjie-It",
        source: `url(${import.meta.env.VITE_FONT_URL}/ChironSungHK-cangjie-It.woff) format('woff')`,
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
