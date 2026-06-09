/**
 * Translation tables for the Wing Font Web app.
 *
 * Adding a new string:
 *   1. Add a key in BOTH `zh` and `en` below. Keys are plain strings,
 *      organised by feature area (header, home, generate.step1, ...).
 *   2. In a component, call `t("your.key")` from `useTranslation()`.
 *
 * Adding a new language:
 *   - Add it to the `Language` union in ./LanguageContext.tsx.
 *   - Add a top-level entry to `TRANSLATIONS` below with the same key
 *     set as `zh` and `en`. Missing keys fall back to `en` then to the
 *     key string itself.
 */

export type Language = "zh" | "en";

// Every key that appears in any locale. Build-time type check ensures we
// don't reference a key from a component that doesn't exist anywhere.
export type TranslationKey =
  // Header
  | "header.title"
  | "header.subtitle"
  | "header.cta.generate"
  | "header.cta.learnMore"
  | "header.cta.sponsor"
  | "header.lang.toggle"
  | "header.theme.toggle"
  // Footer
  | "footer.license"
  // Home
  | "home.hero.title"
  | "home.hero.tagline"
  | "home.hero.cta.generate"
  | "home.hero.cta.showcase"
  | "home.what.title"
  | "home.what.body"
  | "home.how.title"
  | "home.how.body"
  | "home.features.title"
  | "home.features.f1.title"
  | "home.features.f1.body"
  | "home.features.f2.title"
  | "home.features.f2.body"
  | "home.features.f3.title"
  | "home.features.f3.body"
  | "home.features.f4.title"
  | "home.features.f4.body"
  // Showcase (existing Main page)
  | "showcase.tryIt"
  // Generate (top-level)
  | "generate.title"
  | "generate.runtime.ready"
  | "generate.runtime.loading"
  | "generate.button.generate"
  | "generate.button.generating"
  | "generate.button.next"
  | "generate.button.back"
  | "generate.button.regenerate"
  | "generate.error.prefix"
  // Generate step labels
  | "generate.step1.label"
  | "generate.step2.label"
  | "generate.step3.label"
  | "generate.step4.label"
  | "generate.step5.label"
  // Step 1 — fonts
  | "step1.title"
  | "step1.description"
  | "step1.base.label"
  | "step1.base.hint"
  | "step1.anno.label"
  | "step1.anno.hint"
  | "step1.upload"
  | "step1.useDefault"
  | "step1.preview.title"
  | "step1.preview.hint"
  | "step1.preview.notLoaded"
  | "step1.parseError"
  // Step 2 — mappings
  | "step2.title"
  | "step2.description"
  | "step2.import.button"
  | "step2.import.useDefault"
  | "step2.export.button"
  | "step2.clear.button"
  | "step2.count"
  | "step2.search.placeholder"
  | "step2.add.button"
  | "step2.add.chars"
  | "step2.add.annos"
  | "step2.add.weight"
  | "step2.add.weightHint"
  | "step2.add.commit"
  | "step2.col.chars"
  | "step2.col.annos"
  | "step2.col.weight"
  | "step2.col.actions"
  | "step2.empty"
  | "step2.confirmDelete"
  // Step 3 — parameters
  | "step3.title"
  | "step3.description"
  | "step3.family"
  | "step3.familyHint"
  | "step3.baseScale"
  | "step3.annoScale"
  | "step3.yOffset"
  | "step3.invert"
  | "step3.optimize"
  // Step 4 — log
  | "step4.title"
  | "step4.description"
  | "step4.empty"
  | "step4.run.idle"
  | "step4.run.running"
  | "step4.copy"
  | "step4.copied"
  // Step 5 — preview + download
  | "step5.title"
  | "step5.description"
  | "step5.noResult"
  | "step5.sampleText"
  | "step5.download.ttf"
  | "step5.download.woff";

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  zh: {
    // Header
    "header.title": "Wing Font",
    "header.subtitle": "免費開源，自製粵語、倉頡等註音字體",
    "header.cta.generate": "自製字體",
    "header.cta.learnMore": "了解更多！",
    "header.cta.sponsor": "捐助",
    "header.lang.toggle": "切換語言",
    "header.theme.toggle": "切換主題",
    // Footer
    "footer.license": "MIT License（自由及開源軟件）",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "在純文字裡將注音直接顯示在漢字上方 — 毋須 HTML 標記、毋須額外排版，只要載入字體就行。",
    "home.hero.cta.generate": "自製你的字體",
    "home.hero.cta.showcase": "瀏覽現成字體",
    "home.what.title": "這是甚麼",
    "home.what.body":
      "Wing Font 是一套字型生成工具。輸入兩個 TTF（一個漢字、一個拉丁字母）加上字符對應 CSV，便會輸出一個全新的 OpenType 字型 — 每個漢字字形都直接刻上注音，可作粵拼、耶魯、倉頡等任何標註用途。輸出的字型可用於網頁、Word、Telegram、Email 等任何支援自訂字型的地方。",
    "home.how.title": "如何運作",
    "home.how.body":
      "整套字型生成流程已通過 Pyodide 編譯為 WebAssembly，直接在你的瀏覽器執行。毋須安裝 Python，毋須上傳檔案到伺服器，毋須付費，所有資料留在本機。",
    "home.features.title": "功能特色",
    "home.features.f1.title": "純文字就有注音",
    "home.features.f1.body":
      "注音直接刻入字形本身，無需 HTML <ruby> 標記。複製字到任何位置都會帶住注音一齊出現。",
    "home.features.f2.title": "字詞自動切換",
    "home.features.f2.body":
      "「銀行 / 行人」中的「行」會自動切換不同讀音，源自 OpenType 的 calt 字體上下文替換規則。",
    "home.features.f3.title": "手動選擇變體",
    "home.features.f3.body":
      "鍵入「字1」、「字2」可手動指定多音字的注音，方便糾正自動判斷。",
    "home.features.f4.title": "完全本機運算",
    "home.features.f4.body":
      "你的字體與對應表全程不會離開瀏覽器，所有處理皆在本機進行。",
    // Showcase
    "showcase.tryIt": "隨便試 (Try it!!)",
    // Generate
    "generate.title": "自製註音字體",
    "generate.runtime.ready": "字型引擎已就緒。首次生成需要 30 至 120 秒。",
    "generate.runtime.loading": "字型引擎載入中：",
    "generate.button.generate": "開始生成",
    "generate.button.generating": "生成中…",
    "generate.button.next": "下一步",
    "generate.button.back": "上一步",
    "generate.button.regenerate": "重新生成",
    "generate.error.prefix": "錯誤：",
    "generate.step1.label": "選擇字體",
    "generate.step2.label": "字符對應",
    "generate.step3.label": "參數設定",
    "generate.step4.label": "執行記錄",
    "generate.step5.label": "預覽與下載",
    // Step 1
    "step1.title": "步驟 1：選擇字體",
    "step1.description":
      "上載兩個 TTF：底字（漢字部分）和註音字（小字母部分），或使用預設字體。",
    "step1.base.label": "底字（漢字）",
    "step1.base.hint": "通常為宋體或楷書",
    "step1.anno.label": "註音字（拉丁字母）",
    "step1.anno.hint": "通常為 Noto Serif 或 Sans",
    "step1.upload": "上載 TTF",
    "step1.useDefault": "使用預設",
    "step1.preview.title": "字形預覽",
    "step1.preview.hint": "字體加載後，下面會顯示樣本字形",
    "step1.preview.notLoaded": "（未加載字體）",
    "step1.parseError": "無法解析字體：",
    // Step 2
    "step2.title": "步驟 2：字符對應表",
    "step2.description":
      "由 CSV 載入你的字符對應，亦可直接搜尋、新增、編輯或刪除。",
    "step2.import.button": "載入 CSV",
    "step2.import.useDefault": "使用預設 (canto-lshk)",
    "step2.export.button": "匯出 CSV",
    "step2.clear.button": "全部清除",
    "step2.count": "{count} 個對應",
    "step2.search.placeholder": "搜尋字或注音…",
    "step2.add.button": "新增一行",
    "step2.add.chars": "漢字（如「行」或「銀行」）",
    "step2.add.annos": "注音（如「hong4」或「ngan4 hong4」）",
    "step2.add.weight": "權重",
    "step2.add.weightHint":
      "留空即為 1。較大數值代表此讀音優先：影響預設讀音、變體截斷及字詞優先級。",
    "step2.add.commit": "加入",
    "step2.col.chars": "漢字",
    "step2.col.annos": "注音",
    "step2.col.weight": "權重",
    "step2.col.actions": "",
    "step2.empty": "尚未加載任何對應。按上方按鈕載入 CSV 或新增。",
    "step2.confirmDelete": "確定要刪除嗎？",
    // Step 3
    "step3.title": "步驟 3：參數設定",
    "step3.description": "微調字形位置、大小與輸出選項。",
    "step3.family": "字體名稱",
    "step3.familyHint": "會寫入字型的 name 表",
    "step3.baseScale": "底字縮放比",
    "step3.annoScale": "注音縮放比",
    "step3.yOffset": "注音垂直位置（em 比例）",
    "step3.invert": "倒置：注音在下、底字在上",
    "step3.optimize": "壓縮輸出（移除未使用字形）",
    // Step 4
    "step4.title": "步驟 4：執行記錄",
    "step4.description": "字型生成過程的即時輸出。",
    "step4.empty": "尚未執行。請按下方按鈕開始生成。",
    "step4.run.idle": "開始生成",
    "step4.run.running": "生成中…",
    "step4.copy": "複製記錄",
    "step4.copied": "已複製",
    // Step 5
    "step5.title": "步驟 5：預覽與下載",
    "step5.description":
      "生成完成的字型已自動載入到下方輸入框，可即場輸入字符試效果。",
    "step5.noResult": "尚未有生成結果。請完成步驟 4。",
    "step5.sampleText": "你好世界 — 試試輸入「銀行」、「行家」、「行1」、「畫畫」",
    "step5.download.ttf": "下載 TTF",
    "step5.download.woff": "下載 WOFF",
  },
  en: {
    // Header
    "header.title": "Wing Font",
    "header.subtitle":
      "Free, open-source generator for Cantonese / Cangjie / Yale annotation fonts.",
    "header.cta.generate": "Make Your Font",
    "header.cta.learnMore": "Learn More",
    "header.cta.sponsor": "Sponsor",
    "header.lang.toggle": "Switch language",
    "header.theme.toggle": "Switch theme",
    // Footer
    "footer.license": "MIT License (free & open source)",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "Show pronunciation annotations above Chinese characters in plain text — no HTML markup, no special apps, just install the font.",
    "home.hero.cta.generate": "Generate your own font",
    "home.hero.cta.showcase": "Browse ready-made fonts",
    "home.what.title": "What it is",
    "home.what.body":
      "Wing Font is a font-generation tool. Give it two TTFs (one Chinese, one Latin) plus a CSV mapping characters to romanizations, and it produces a new OpenType font whose glyphs have the annotations baked in. The output works anywhere a custom font can be loaded — websites, Word, Telegram, email, you name it.",
    "home.how.title": "How it works",
    "home.how.body":
      "The whole pipeline runs in your browser via Pyodide (WebAssembly). No Python install, no uploads to a server, no fees, no data leaves your machine.",
    "home.features.title": "Features",
    "home.features.f1.title": "Annotations in plain text",
    "home.features.f1.body":
      "Romanization is baked into the glyph itself — no HTML <ruby> markup needed. Copy the text anywhere and the annotations travel with it.",
    "home.features.f2.title": "Context-aware",
    "home.features.f2.body":
      "Polyphonic characters auto-switch based on the surrounding word — e.g. 銀行 vs 行人 — via the OpenType `calt` Chain Contextual Substitution feature.",
    "home.features.f3.title": "Manual variant picker",
    "home.features.f3.body":
      "Type `字1`, `字2`, etc. to manually choose a specific reading when the context isn't enough.",
    "home.features.f4.title": "Fully local",
    "home.features.f4.body":
      "Your fonts and mapping never leave your browser. Everything runs client-side.",
    // Showcase
    "showcase.tryIt": "Try typing here",
    // Generate
    "generate.title": "Generate your own annotation font",
    "generate.runtime.ready":
      "Font engine ready. First generation typically takes 30–120 seconds.",
    "generate.runtime.loading": "Loading font engine: ",
    "generate.button.generate": "Generate",
    "generate.button.generating": "Generating…",
    "generate.button.next": "Next",
    "generate.button.back": "Back",
    "generate.button.regenerate": "Regenerate",
    "generate.error.prefix": "Error: ",
    "generate.step1.label": "Fonts",
    "generate.step2.label": "Mappings",
    "generate.step3.label": "Parameters",
    "generate.step4.label": "Log",
    "generate.step5.label": "Preview & download",
    // Step 1
    "step1.title": "Step 1: Choose fonts",
    "step1.description":
      "Upload two TTFs — one for the base Chinese character, one for the small romanization letterforms. Or use the bundled defaults.",
    "step1.base.label": "Base font (Chinese)",
    "step1.base.hint": "Usually a Song (serif) or Kai face",
    "step1.anno.label": "Annotation font (Latin)",
    "step1.anno.hint": "Usually Noto Serif or Sans",
    "step1.upload": "Upload TTF",
    "step1.useDefault": "Use default",
    "step1.preview.title": "Glyph preview",
    "step1.preview.hint": "Sample glyphs appear here once a font is loaded.",
    "step1.preview.notLoaded": "(no font loaded)",
    "step1.parseError": "Could not parse font: ",
    // Step 2
    "step2.title": "Step 2: Character mappings",
    "step2.description":
      "Import a CSV with character → romanization mappings, or search, add, edit and delete entries directly.",
    "step2.import.button": "Import CSV",
    "step2.import.useDefault": "Use default (canto-lshk)",
    "step2.export.button": "Export CSV",
    "step2.clear.button": "Clear all",
    "step2.count": "{count} entries",
    "step2.search.placeholder": "Search characters or romanization…",
    "step2.add.button": "Add row",
    "step2.add.chars": "Characters (e.g. 行 or 銀行)",
    "step2.add.annos": "Romanization (e.g. hong4 or ngan4 hong4)",
    "step2.add.weight": "Weight",
    "step2.add.weightHint":
      "Leave blank for 1. Higher values prioritise this reading: affects the default reading, variant truncation, and word-rule order.",
    "step2.add.commit": "Add",
    "step2.col.chars": "Characters",
    "step2.col.annos": "Romanization",
    "step2.col.weight": "Weight",
    "step2.col.actions": "",
    "step2.empty":
      "No mappings loaded yet. Use the buttons above to import a CSV or add a row.",
    "step2.confirmDelete": "Delete this row?",
    // Step 3
    "step3.title": "Step 3: Parameters",
    "step3.description":
      "Tune glyph sizes, vertical position, and output options.",
    "step3.family": "Family name",
    "step3.familyHint": "Written into the font's name table",
    "step3.baseScale": "Base glyph scale",
    "step3.annoScale": "Annotation scale",
    "step3.yOffset": "Annotation vertical offset (em ratio)",
    "step3.invert": "Invert: annotation below, base above",
    "step3.optimize": "Subset (drop unused glyphs)",
    // Step 4
    "step4.title": "Step 4: Generation log",
    "step4.description": "Live output from the font-generation pipeline.",
    "step4.empty": "Not started. Click the button below to generate.",
    "step4.run.idle": "Generate",
    "step4.run.running": "Generating…",
    "step4.copy": "Copy log",
    "step4.copied": "Copied",
    // Step 5
    "step5.title": "Step 5: Preview & download",
    "step5.description":
      "The generated font is loaded as `@font-face` so you can type below to see it in action.",
    "step5.noResult": "No result yet. Complete Step 4 first.",
    "step5.sampleText":
      "Hello world — try typing 銀行, 行家, 行1, or 畫畫",
    "step5.download.ttf": "Download TTF",
    "step5.download.woff": "Download WOFF",
  },
};
