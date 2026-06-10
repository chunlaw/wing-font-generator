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
  | "header.cta.generate"
  | "header.cta.showcase"
  | "header.cta.learnMore"
  | "header.cta.sponsor"
  | "header.lang.toggle"
  | "header.theme.toggle"
  // Footer
  | "footer.license"
  | "footer.about.title"
  | "footer.about.body"
  | "footer.links.title"
  | "footer.links.generate"
  | "footer.links.showcase"
  | "footer.links.source"
  | "footer.credit"
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
  // About page
  | "about.hero.title"
  | "about.hero.tagline"
  | "about.origin.title"
  | "about.origin.body"
  | "about.opensource.title"
  | "about.opensource.body"
  | "about.contribute.title"
  | "about.contribute.intro"
  | "about.contribute.code.title"
  | "about.contribute.code.body"
  | "about.contribute.design.title"
  | "about.contribute.design.body"
  | "about.contribute.data.title"
  | "about.contribute.data.body"
  | "about.support.title"
  | "about.support.body"
  | "about.cta.generate"
  | "about.cta.showcase"
  | "about.cta.telegram"
  | "about.cta.github"
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
  | "step1.presetLabel"
  | "step1.variableAxes"
  | "step1.preview.title"
  | "step1.preview.hint"
  | "step1.preview.notLoaded"
  | "step1.parseError"
  // Step 2 — mappings
  | "step2.title"
  | "step2.description"
  | "step2.import.button"
  | "step2.import.useDefault"
  | "step2.import.preset"
  | "step2.import.presetCustom"
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
  | "step2.coverage.baseOk"
  | "step2.coverage.baseMissing"
  | "step2.coverage.annoOk"
  | "step2.coverage.annoMissing"
  | "step2.coverage.show"
  | "step2.coverage.hide"
  | "step2.coverage.baseLabel"
  | "step2.coverage.annoLabel"
  | "step2.coverage.andMore"
  | "step2.confirmDelete"
  // Step 3 — parameters
  | "step3.title"
  | "step3.description"
  | "step3.family"
  | "step3.familyHint"
  | "step3.advancedSectionLabel"
  | "step3.triggerChar.label"
  | "step3.triggerChar.hint"
  | "step3.triggerChar.hintDisabled"
  | "step3.baseScale"
  | "step3.annoScale"
  | "step3.annoSpacing"
  | "step3.yOffset"
  | "step3.invert"
  | "step3.optimize"
  | "step3.preview.title"
  | "step3.preview.description"
  | "step3.preview.updating"
  | "step3.preview.firstRun"
  | "step3.preview.idle"
  | "step3.preview.sampledLabel"
  | "step3.preview.customLabel"
  | "step3.preview.notReady"
  | "step3.preview.showGuides"
  | "step3.previewText.label"
  | "step3.previewText.placeholder"
  | "step3.previewText.helper"
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
  | "step5.download.woff"
  | "step5.cssSnippet.title"
  | "step5.cssSnippet.button"
  | "step5.cssSnippet.copy"
  | "step5.cssSnippet.copied"
  | "step5.cssSnippet.hint"
  | "step5.cssSnippet.close"
  | "step5.cssSnippet.designAppTitle"
  | "step5.cssSnippet.designAppHint";

export const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  zh: {
    // Header
    "header.title": "Wing Font",
    "header.cta.generate": "自製字體",
    "header.cta.showcase": "字體展示",
    "header.cta.learnMore": "了解更多！",
    "header.cta.sponsor": "捐助",
    "header.lang.toggle": "切換語言",
    "header.theme.toggle": "切換主題",
    // Footer
    "footer.license": "MIT License（自由及開源軟件）",
    "footer.about.title": "關於 Wing Font",
    "footer.about.body":
      "Wing Font 是一套開源工具，讓任何人都可以為粵語、倉頡等任何標註方式自製字型。所有計算都在你的瀏覽器內進行，毋須上傳檔案。",
    "footer.links.title": "連結",
    "footer.links.generate": "自製字體",
    "footer.links.showcase": "字體展示",
    "footer.links.source": "原始碼（GitHub）",
    "footer.credit": "由 chunlaw 設計與開發",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "在純文字裡將標注直接顯示在漢字上方 — 毋須 HTML 標記、毋須額外排版，只要載入字體就行。",
    "home.hero.cta.generate": "自製你的字體",
    "home.hero.cta.showcase": "瀏覽現成字體",
    "home.what.title": "這是甚麼",
    "home.what.body":
      "Wing Font 是一套字型生成工具。輸入兩個 TTF（一個底字、一個標注字）加上字符對應 CSV，便會輸出一個全新的 OpenType 字型 — 每個底字字形都直接刻上標注，可作粵拼、耶魯、倉頡等任何標注用途。輸出的字型可用於網頁、Word、Telegram、Email 等任何支援自訂字型的地方。",
    "home.how.title": "如何運作",
    "home.how.body":
      "整套字型生成流程已通過 Pyodide 編譯為 WebAssembly，直接在你的瀏覽器執行。毋須安裝 Python，毋須上傳檔案到伺服器，毋須付費，所有資料留在本機。",
    "home.features.title": "功能特色",
    "home.features.f1.title": "純文字就有標注",
    "home.features.f1.body":
      "標注直接刻入字形本身，無需 HTML <ruby> 標記。複製字到任何位置都會帶住標注一齊出現。",
    "home.features.f2.title": "字詞自動切換",
    "home.features.f2.body":
      "「銀行 / 行人」中的「行」會自動切換不同讀音，源自 OpenType 的 ccmp 字體上下文替換規則。",
    "home.features.f3.title": "手動選擇變體",
    "home.features.f3.body":
      "鍵入「字1」、「字2」可手動指定多音字的標注，方便糾正自動判斷。",
    "home.features.f4.title": "完全本機運算",
    "home.features.f4.body":
      "你的字體與對應表全程不會離開瀏覽器，所有處理皆在本機進行。",
    // Showcase
    "showcase.tryIt": "隨便試 (Try it!!)",
    // About
    "about.hero.title": "了解 Wing Font",
    "about.hero.tagline":
      "為甚麼這個工具存在，誰在用，怎樣一齊參與。",
    "about.origin.title": "緣起",
    "about.origin.body":
      "中文字可以加語言學會拼音，可以用反切，會唔會可以用平假名添？推而廣之，圍頭話、潮州話、台語、福建話、上海話都可以做埋。我們已經做到 WOFF 字體畀網頁使用 —— 普羅大眾只需要用瀏覽器打開 IT 友做的網站，就睇到。睇歌詞可以跟著唱，睇詩可以一齊讀；教倉頡打字、教移民港孩，亦方便啲啲。",
    "about.opensource.title": "點解免費又開源？",
    "about.opensource.body":
      "若我能說萬國的方言，但時間有限 —— 一齊參與，一齊為語言為文字努力，社會一定會更好。開源亦讓設計師可以用自己鍾意的字體合成屬於自己的版本：很多字體本身有版權，我們無辦法拎來合成畀大家用，但你可以自己搞，開開心心。",
    "about.contribute.title": "一齊參與",
    "about.contribute.intro":
      "Wing Font 永遠不會完美，亦永遠歡迎更多人手。下面係幾條最缺人嘅路。",
    "about.contribute.code.title": "寫程式",
    "about.contribute.code.body":
      "無任歡迎。識寫 code 嘅你，相信會自己搵到 GitHub 連結。",
    "about.contribute.design.title": "設計",
    "about.contribute.design.body":
      "現時拼音擺位未必好突出。歡迎加入 Telegram 群組，傾下應該用咩字體、比例又應該係點。",
    "about.contribute.data.title": "詞庫",
    "about.contribute.data.body":
      "暫時最缺係詞典 —— 同埋多音字嘅預設讀音應該點揀。如果你對某種語言有研究，可以加入 Telegram 群討論。",
    "about.support.title": "想表達支持？",
    "about.support.body":
      "多謝先。話說我都有做巴士 app —— 不妨試埋 hkbus.app。喺 GitHub Sponsors 撐我一啲都好歡迎。",
    "about.cta.generate": "開始自製字體",
    "about.cta.showcase": "瀏覽現成字體",
    "about.cta.telegram": "加入 Telegram 群",
    "about.cta.github": "去 GitHub",
    // Generate
    "generate.title": "自製標注字體",
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
    "generate.step4.label": "生成字型",
    "generate.step5.label": "預覽與下載",
    // Step 1
    "step1.title": "步驟 1：選擇字體",
    "step1.description":
      "上載兩個 TTF：底字（漢字部分）和標注字，或從下拉選單揀預設字體。",
    "step1.base.label": "底字（漢字）",
    "step1.base.hint": "通常為宋體或楷書",
    "step1.anno.label": "標注字",
    "step1.anno.hint": "拉丁字母用 Noto Serif；中文標注（如倉頡）用宋體或黑體",
    "step1.upload": "上載 TTF",
    "step1.useDefault": "使用預設",
    "step1.presetLabel": "預設字體",
    "step1.variableAxes": "可變字體軸",
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
    "step2.import.preset": "預設字詞配對",
    "step2.import.presetCustom": "自訂",
    "step2.export.button": "匯出 CSV",
    "step2.clear.button": "全部清除",
    "step2.count": "{count} 個對應",
    "step2.search.placeholder": "搜尋字或標注…",
    "step2.add.button": "新增一行",
    "step2.add.chars": "漢字（如「行」或「銀行」）",
    "step2.add.annos": "標注（如「hong4」、「ngan4 hong4」、「一弓十山」）",
    "step2.add.weight": "權重",
    "step2.add.weightHint":
      "留空即為 1。較大數值代表此讀音優先：影響預設讀音、變體截斷及字詞優先級。",
    "step2.add.commit": "加入",
    "step2.col.chars": "漢字",
    "step2.col.annos": "標注",
    "step2.col.weight": "權重",
    "step2.col.actions": "",
    "step2.empty": "尚未加載任何對應。按上方按鈕載入 CSV 或新增。",
    "step2.coverage.baseOk": "底字字型 ✓ 已涵蓋全部 {total} 個字元",
    "step2.coverage.baseMissing":
      "底字字型 ⚠ 缺少 {missing}/{total} 個字元（不在字型 cmap 內）",
    "step2.coverage.annoOk": "標注字型 ✓ 已涵蓋全部 {total} 個字元",
    "step2.coverage.annoMissing":
      "標注字型 ⚠ 缺少 {missing}/{total} 個字元（不在字型 cmap 內）",
    "step2.coverage.show": "顯示缺失字元",
    "step2.coverage.hide": "隱藏",
    "step2.coverage.baseLabel": "底字字型缺少的字元：",
    "step2.coverage.annoLabel": "標注字型缺少的字元：",
    "step2.coverage.andMore": "還有 {n} 個未顯示",
    "step2.confirmDelete": "確定要刪除嗎？",
    // Step 3
    "step3.title": "步驟 3：參數設定",
    "step3.description": "微調字形位置、大小與輸出選項。",
    "step3.family": "字體名稱",
    "step3.familyHint": "會寫入字型的 name 表",
    "step3.advancedSectionLabel": "進階",
    "step3.triggerChar.label": "標注切換字元",
    "step3.triggerChar.hint":
      "用「字 + 此字元 + 一/二/…」手動切換多音字標注。預設「丅」（U+4E05）較為罕用、不易與正文衝突；可改成你的輸入法容易打到的字（如「々」「〇」）。",
    "step3.triggerChar.hintDisabled":
      "已停用「丅 + 中文數字」標注路徑；只能透過「字 + 0/1/2/…」的數字後綴方式手動切換多音字。",
    "step3.baseScale": "底字縮放比",
    "step3.annoScale": "標注縮放比",
    "step3.annoSpacing": "標注字距（em 比例，正值放寬、負值收緊）",
    "step3.yOffset": "標注垂直位置（em 比例）",
    "step3.invert": "倒置：標注在下、底字在上",
    "step3.optimize": "壓縮輸出（移除未使用字形）",
    "step3.preview.title": "即時預覽",
    "step3.preview.description":
      "改參數後會自動重新生成，無需手動觸發。每次約 10–20 秒，視乎字型大小與對應表規模而定。",
    "step3.preview.updating": "更新中…",
    "step3.preview.firstRun": "首次生成樣本中…",
    "step3.preview.idle": "等待生成…",
    "step3.preview.sampledLabel": "樣本字詞",
    "step3.preview.customLabel": "預覽文字",
    "step3.preview.notReady": "請先載入字體同至少一條字詞配對。",
    "step3.preview.showGuides": "顯示字體輔助線（基準線、上下緣等）",
    "step3.previewText.label": "預覽文字",
    "step3.previewText.placeholder": "留空 = 自動揀字詞",
    "step3.previewText.helper": "輸入想預覽嘅文字，會根據對應嘅字詞配對顯示。",
    // Step 4
    "step4.title": "步驟 4：生成字型",
    "step4.description": "按「開始生成」啟動。下方會即時顯示處理進度與每個步驟的詳細記錄。",
    "step4.empty": "尚未執行。請按下方按鈕開始生成。",
    "step4.run.idle": "開始生成",
    "step4.run.running": "生成中",
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
    "step5.cssSnippet.title": "在 CSS 中使用",
    "step5.cssSnippet.button": "嵌入網站",
    "step5.cssSnippet.copy": "複製程式碼",
    "step5.cssSnippet.copied": "已複製",
    "step5.cssSnippet.hint":
      "將下載的 .woff 與 .ttf 放在與 CSS 同目錄；若放在其他位置，請相應更新 url() 內的路徑。",
    "step5.cssSnippet.close": "關閉",
    "step5.cssSnippet.designAppTitle": "於設計工具中使用",
    "step5.cssSnippet.designAppHint":
      "在 Canva、InDesign、Word 等工具，需在文字設定開啟「連字（Ligatures）」選項，數字標注（如「字1」、「字丅一」）才會生效。詞語對應（如「銀行」、「行人」）則無需任何設定即可自動運作。",
  },
  en: {
    // Header
    "header.title": "Wing Font",
    "header.cta.generate": "Make Your Font",
    "header.cta.showcase": "Showcase",
    "header.cta.learnMore": "Learn More",
    "header.cta.sponsor": "Sponsor",
    "header.lang.toggle": "Switch language",
    "header.theme.toggle": "Switch theme",
    // Footer
    "footer.license": "MIT License (free & open source)",
    "footer.about.title": "About Wing Font",
    "footer.about.body":
      "Wing Font is an open-source tool for generating annotation fonts — Cantonese romanization, Cangjie input codes, or any custom scheme. Everything runs in your browser; no files leave your machine.",
    "footer.links.title": "Links",
    "footer.links.generate": "Make your font",
    "footer.links.showcase": "Showcase",
    "footer.links.source": "Source (GitHub)",
    "footer.credit": "Designed and built by chunlaw",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "Show pronunciation annotations above Chinese characters in plain text — no HTML markup, no special apps, just install the font.",
    "home.hero.cta.generate": "Generate your own font",
    "home.hero.cta.showcase": "Browse ready-made fonts",
    "home.what.title": "What it is",
    "home.what.body":
      "Wing Font is a font-generation tool. Give it two TTFs (one for the base characters, one for the annotation glyphs) plus a CSV mapping characters to annotations, and it produces a new OpenType font whose glyphs have those annotations baked in. The output works anywhere a custom font can be loaded — websites, Word, Telegram, email, you name it.",
    "home.how.title": "How it works",
    "home.how.body":
      "The whole pipeline runs in your browser via Pyodide (WebAssembly). No Python install, no uploads to a server, no fees, no data leaves your machine.",
    "home.features.title": "Features",
    "home.features.f1.title": "Annotations in plain text",
    "home.features.f1.body":
      "Romanization is baked into the glyph itself — no HTML <ruby> markup needed. Copy the text anywhere and the annotations travel with it.",
    "home.features.f2.title": "Context-aware",
    "home.features.f2.body":
      "Polyphonic characters auto-switch based on the surrounding word — e.g. 銀行 vs 行人 — via an OpenType Chain Contextual Substitution under the `ccmp` feature.",
    "home.features.f3.title": "Manual variant picker",
    "home.features.f3.body":
      "Type `字1`, `字2`, etc. to manually choose a specific reading when the context isn't enough.",
    "home.features.f4.title": "Fully local",
    "home.features.f4.body":
      "Your fonts and mapping never leave your browser. Everything runs client-side.",
    // Showcase
    "showcase.tryIt": "Try typing here",
    // About
    "about.hero.title": "About Wing Font",
    "about.hero.tagline":
      "Why this tool exists, who uses it, and how to get involved.",
    "about.origin.title": "Origin",
    "about.origin.body":
      "Chinese characters can be annotated with LSHK Jyutping, with fanqie, even with hiragana. By extension: Wei Tau, Teochew, Taiwanese, Hokkien, Shanghainese — all of them deserve the same treatment. Wing Font ships these as WOFF fonts the browser can load directly. The general reader doesn't need to install anything: they open a page built by a developer who used the font, and the annotations are just there. Singing along to lyrics, reading classical poetry out loud, teaching Cangjie input to a child returning to Hong Kong — all become a little less effortful.",
    "about.opensource.title": "Why free and open source?",
    "about.opensource.body":
      "If I were to speak in all the tongues of men, time would still be finite — but together we can push language and writing forward. Open source also lets designers compose annotated variants of their own typefaces. Many fonts are under restrictive licences and we can't redistribute the derived output ourselves; but a designer with their own font and the source code can build their version and ship it themselves.",
    "about.contribute.title": "Get involved",
    "about.contribute.intro":
      "Wing Font is never finished. These are the gaps where new hands help the most.",
    "about.contribute.code.title": "Code",
    "about.contribute.code.body":
      "Pull requests welcome. If you write code, you'll find the GitHub link.",
    "about.contribute.design.title": "Design",
    "about.contribute.design.body":
      "The current annotation placement isn't always optimal. Join the Telegram group to discuss which typefaces and proportions work best.",
    "about.contribute.data.title": "Mappings",
    "about.contribute.data.body":
      "The biggest gap right now is mapping data — and deciding which reading should be the default for polyphonic characters. If you've studied a particular language, the Telegram group is where these conversations happen.",
    "about.support.title": "Want to show support?",
    "about.support.body":
      "Thank you in advance. I also built a Hong Kong bus app — try hkbus.app if you're local. Sponsoring on GitHub is also genuinely appreciated.",
    "about.cta.generate": "Make your own font",
    "about.cta.showcase": "Browse ready-made fonts",
    "about.cta.telegram": "Join the Telegram group",
    "about.cta.github": "View on GitHub",
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
    "generate.step4.label": "Generate",
    "generate.step5.label": "Preview & download",
    // Step 1
    "step1.title": "Step 1: Choose fonts",
    "step1.description":
      "Upload two TTFs — one for the base Chinese character, one for the small romanization letterforms. Or use the bundled defaults.",
    "step1.base.label": "Base font (Chinese)",
    "step1.base.hint": "Usually a Song (serif) or Kai face",
    "step1.anno.label": "Annotation font",
    "step1.anno.hint": "Noto Serif for Latin romanizations; a CJK font for mappings like cangjie",
    "step1.upload": "Upload TTF",
    "step1.useDefault": "Use default",
    "step1.presetLabel": "Built-in font",
    "step1.variableAxes": "Variable font axes",
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
    "step2.import.preset": "Built-in mapping",
    "step2.import.presetCustom": "Custom",
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
    "step2.coverage.baseOk": "Base font ✓ all {total} characters covered",
    "step2.coverage.baseMissing":
      "Base font ⚠ missing {missing} of {total} characters in your mappings",
    "step2.coverage.annoOk":
      "Annotation font ✓ all {total} characters covered",
    "step2.coverage.annoMissing":
      "Annotation font ⚠ missing {missing} of {total} characters in your mappings",
    "step2.coverage.show": "Show missing",
    "step2.coverage.hide": "Hide",
    "step2.coverage.baseLabel": "Missing from base font:",
    "step2.coverage.annoLabel": "Missing from annotation font:",
    "step2.coverage.andMore": "and {n} more",
    "step2.confirmDelete": "Delete this row?",
    // Step 3
    "step3.title": "Step 3: Parameters",
    "step3.description":
      "Tune glyph sizes, vertical position, and output options.",
    "step3.family": "Family name",
    "step3.familyHint": "Written into the font's name table",
    "step3.advancedSectionLabel": "Advanced",
    "step3.triggerChar.label": "Variant trigger character",
    "step3.triggerChar.hint":
      "Types as `<char><trigger><numeral>` (e.g. 行 + trigger + 一) to manually pick a variant. Default `丅` (U+4E05) is deliberately rare so it doesn't collide with normal text — replace it with whatever your IME can produce easily (e.g. `々`, `〇`).",
    "step3.triggerChar.hintDisabled":
      "Trigger+numeral override is disabled. Users can still pick variants with the universal digit-suffix path (`<char><1-9>`).",
    "step3.baseScale": "Base glyph scale",
    "step3.annoScale": "Annotation scale",
    "step3.annoSpacing": "Annotation letter-spacing (em — positive loosens, negative tightens)",
    "step3.yOffset": "Annotation vertical offset (em ratio)",
    "step3.invert": "Invert: annotation below, base above",
    "step3.optimize": "Subset (drop unused glyphs)",
    "step3.preview.title": "Live preview",
    "step3.preview.description":
      "Re-renders automatically whenever you change a parameter — no need to trigger it manually. Each run takes about 10–20 seconds, depending on font size and mapping length.",
    "step3.preview.updating": "Updating…",
    "step3.preview.firstRun": "Rendering the first sample…",
    "step3.preview.idle": "Waiting to render…",
    "step3.preview.sampledLabel": "Sampled mapping",
    "step3.preview.customLabel": "Preview text",
    "step3.preview.notReady":
      "Pick fonts and add at least one mapping first.",
    "step3.preview.showGuides": "Show typographic guides (baseline, ascent, etc.)",
    "step3.previewText.label": "Preview text",
    "step3.previewText.placeholder": "Leave empty to auto-pick",
    "step3.previewText.helper":
      "Type the text you want to preview — uses whichever mappings cover it.",
    // Step 4
    "step4.title": "Step 4: Generate font",
    "step4.description": "Press Generate to start. The progress feed below shows each step of the pipeline in real time.",
    "step4.empty": "Not started. Click the button below to generate.",
    "step4.run.idle": "Generate",
    "step4.run.running": "Generating",
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
    "step5.cssSnippet.title": "Use in your stylesheet",
    "step5.cssSnippet.button": "Embed in website",
    "step5.cssSnippet.copy": "Copy snippet",
    "step5.cssSnippet.copied": "Copied",
    "step5.cssSnippet.hint":
      "Save the downloaded .woff and .ttf to the same folder as your stylesheet, or update the url() paths to point at wherever you host them.",
    "step5.cssSnippet.close": "Close",
    "step5.cssSnippet.designAppTitle": "Using it in a design app",
    "step5.cssSnippet.designAppHint":
      "In Canva, InDesign, Word, and similar tools, enable the \"Ligatures\" option in the text settings so the digit-override feature (e.g. 字1, 字丅一) fires. Word-context disambiguation (e.g. 銀行, 行人) works automatically without any setting.",
  },
};
