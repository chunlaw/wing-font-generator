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
  | "footer.links.credits"
  | "footer.credit"
  | "ack.hero.title"
  | "ack.hero.tagline"
  | "ack.intro"
  | "ack.taigi.title"
  | "ack.taigi.body"
  | "ack.taigi.piauim"
  | "ack.taigi.rimetlpa"
  | "ack.taigi.taigivs"
  | "ack.teochew.title"
  | "ack.teochew.body"
  | "ack.teochew.learnteochew"
  | "ack.teochew.parsetc"
  | "ack.fonts.title"
  | "ack.fonts.body"
  | "ack.fonts.notosanstc"
  | "ack.fonts.notosanssc"
  | "ack.fonts.notosanshk"
  | "ack.fonts.notosansjp"
  | "ack.fonts.notosanskr"
  | "ack.fonts.chironsung"
  | "ack.fonts.chironhei"
  | "ack.fonts.sourcehanserif"
  | "ack.fonts.xiaolai"
  | "ack.fonts.huninn"
  | "ack.fonts.notoserif"
  | "ack.fonts.mplus1m"
  | "ack.fonts.mplusrounded"
  | "ack.fonts.googlesansthai"
  | "ack.canto.title"
  | "ack.canto.typeduck"
  | "ack.canto.cuhk"
  | "ack.canto.kodensha"
  | "ack.mandarin.title"
  | "ack.mandarin.body"
  | "ack.mandarin.pinyindata"
  | "ack.mandarin.phrasepinyindata"
  | "ack.mandarin.unihan"
  | "ack.license"
  | "ack.cta.showcase"
  // Home
  | "home.hero.title"
  | "home.hero.tagline"
  | "home.hero.sampleCaption"
  | "home.hero.cta.generate"
  | "home.hero.cta.showcase"
  | "home.platforms.title"
  | "home.platforms.body"
  | "home.platforms.free"
  | "home.platforms.learnMoreTitle"
  | "home.platforms.learnMoreSubtitle"
  | "home.platforms.tabs.canva"
  | "home.platforms.tabs.affinity"
  | "home.platforms.tabs.adobe"
  | "home.platforms.tabs.word"
  | "home.platforms.tabs.iwork"
  | "home.platforms.tabs.web"
  | "home.platforms.tabs.windows"
  | "home.platforms.tabs.macos"
  | "home.platforms.tabs.linux"
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
  | "about.dialects.title"
  | "about.dialects.body"
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
  | "step2.mandarinWarning.title"
  | "step2.mandarinWarning.body"
  | "step2.mandarinWarning.cta"
  | "step2.mandarinWarning.cli"
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
    "footer.links.credits": "鳴謝",
    "footer.credit": "由 chunlaw 設計與開發",
    // Acknowledgements page
    "ack.hero.title": "鳴謝",
    "ack.hero.tagline": "Wing Font 站喺好多開源資料庫同字型嘅肩膊上。",
    "ack.intro":
      "以下係令到 Wing Font 各種方言標注得以實現嘅開源資料庫同字型。多謝佢哋嘅無私分享。",
    "ack.taigi.title": "臺語／河洛話　字音資料",
    "ack.taigi.body":
      "臺語（河洛話）嘅漢字讀音、台羅／白話字／閩拼之間嘅轉換對照表，以及聲調符號標注嘅規則，全部源自 AlanJui 嘅開源項目。",
    "ack.taigi.piauim":
      "漢字標音資料庫（Ho_Lok_Ue.db 之「漢字庫」、聲母／韻母／聲調對照表）同調符標注邏輯（mod_帶調符音標.py）。",
    "ack.taigi.rimetlpa":
      "台語音標（TLPA）RIME 輸入方案及字庫，提供另一套漢字讀音對照。",
    "ack.taigi.taigivs":
      "方音符號（注音）同台灣語假名嘅轉寫資料（Apache-2.0），字音源自教育部臺灣台語常用詞辭典。",
    "ack.teochew.title": "潮州話　字音資料",
    "ack.teochew.body":
      "潮州話嘅漢字同詞語讀音（廣東拼音）源自 learn-teochew 項目嘅開源字音資料，再用 parsetc 解析器轉換成潮拼／潮羅／白話字等唔同拼音方案。",
    "ack.teochew.learnteochew":
      "潮州話漢字／詞語讀音字庫（teochew_scrape.json，廣東拼音），亦係首頁「家己个歌，家己唱；家己个字，家己揀。」示範句嘅出處。",
    "ack.teochew.parsetc":
      "潮州話拼音解析及轉換工具，將廣東拼音讀音轉成潮羅、白話字、潮語、家己儂拼音、新文字等方案。",
    "ack.fonts.title": "字型",
    "ack.fonts.body":
      "Wing Font 所用嘅字型，全部都係 SIL Open Font License 1.1（OFL-1.1）授權。OFL 嘅原文同每隻字型嘅版權聲明、保留字型名稱（Reserved Font Name），統一收錄喺 wing-font-hub 嘅 LICENSES/ 目錄。下面係字型一覽，按用途分組。",
    "ack.fonts.notosanstc":
      "繁體中文漢字底字（變數字重）。SIL Open Font License 1.1。",
    "ack.fonts.notosanssc":
      "簡體中文漢字底字（變數字重），用於普通話拼音示範字體。SIL Open Font License 1.1。",
    "ack.fonts.notosanshk":
      "繁體中文（香港字形）漢字底字（變數字重），為廣東話示範字體嘅預設底字。SIL Open Font License 1.1。",
    "ack.fonts.notosansjp":
      "片仮名標注用字型（變數字重）。SIL Open Font License 1.1。",
    "ack.fonts.notosanskr":
      "諺文（한글）標注用字型（變數字重）。SIL Open Font License 1.1。",
    "ack.fonts.chironsung":
      "繁體中文宋體底字，內含 Regular 同 Italic。SIL Open Font License 1.1。",
    "ack.fonts.chironhei":
      "繁體中文黑體底字，內含 Regular 同 Bold。SIL Open Font License 1.1。",
    "ack.fonts.sourcehanserif":
      "由 Adobe 發布嘅泛 CJK 思源宋體。SIL Open Font License 1.1。",
    "ack.fonts.xiaolai":
      "簡體中文手寫風格底字（小米同 lxgw 整理嘅 Xiaolai SC）。SIL Open Font License 1.1。",
    "ack.fonts.huninn":
      "標注用字型，由 justfont 開源嘅 Huninn（粉圓）提供，完整支援台羅／白話字嘅聲調符號。SIL Open Font License 1.1。",
    "ack.fonts.notoserif":
      "拉丁字母標注（粵拼、Yale 等）所用嘅羅馬字字型。SIL Open Font License 1.1。",
    "ack.fonts.mplus1m":
      "日文 M+ 1m 等寬字型，配 Source Han Serif 用於普通話示範。SIL Open Font License 1.1。",
    "ack.fonts.mplusrounded":
      "日文 M+ Rounded 1c 圓體，配 Xiaolai SC 用於手寫風普通話示範。SIL Open Font License 1.1。",
    "ack.fonts.googlesansthai":
      "粵語讀音轉成泰文嘅標注用字型，由 IT Foundry／Cadson Demak 設計。SIL Open Font License 1.1。「Google Sans」係 Google LLC 嘅商標。",
    "ack.canto.title": "廣東話　字音資料",
    "ack.canto.typeduck": "粵拼（LSHK）字音資料。",
    "ack.canto.cuhk": "香港中文大學「粵語審音配詞字庫」。",
    "ack.canto.kodensha": "粵語羅馬拼音轉換工具。",
    "ack.mandarin.title": "普通話／國語　字音資料",
    "ack.mandarin.body":
      "普通話字音資料全部取自 mozillazg 採用 MIT 授權嘅開源資料，並非來自任何 OFL 字型項目。每字嘅預設讀音依照 Unicode Unihan 資料庫嘅 kMandarin 欄。將拼音直接造入字形、再按上下文自動切換多音字嘅做法，最早由 Mengshen 拼音字型（OFL-1.1）開創；Wing Font 並無使用佢嘅資料檔案，但謹此鳴謝佢嘅啟發。",
    "ack.mandarin.pinyindata": "逐字讀音資料（MIT；源自 Unihan）。",
    "ack.mandarin.phrasepinyindata": "詞語讀音資料，用嚟做多音字上下文判斷（MIT）。",
    "ack.mandarin.unihan": "Unicode 漢字資料庫（Unihan）— 上游讀音資料。",
    "ack.license":
      "各項資料與字型均依其原有授權條款使用；如需轉載或再發佈，請先參閱各來源之授權。",
    "ack.cta.showcase": "睇睇成品字體",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "在純文字裡將標注直接顯示在漢字上方 — 毋須 HTML 標記、毋須額外排版，只要載入字體就行。",
    "home.hero.sampleCaption":
      "上面是純 UTF-8 文字，標注由 Wing Font 即時渲染。",
    "home.hero.cta.generate": "自製你的字體",
    "home.hero.cta.showcase": "瀏覽現成字體",
    "home.platforms.title": "你常用的軟件全部支援",
    "home.platforms.body":
      "輸出標準 TTF / WOFF 字型檔，能在任何支援自訂字型的軟件中載入，無需特殊外掛或設定。",
    "home.platforms.free": "✓ 完全免費，無需註冊。",
    "home.platforms.learnMoreTitle": "在你的軟件上使用",
    "home.platforms.learnMoreSubtitle":
      "選擇你常用的軟件或作業系統，查看安裝與設定步驟。",
    "home.platforms.tabs.canva":
      "開啟設計，點擊文字元素。\n在字型選單按「上載字型」，選擇下載的 .ttf 檔案。\n字型即時可用，毋須額外設定。\n免費帳戶可能需升級至 Canva Pro 方能上載字型。",
    "home.platforms.tabs.affinity":
      "先在作業系統安裝字型（見 Windows / macOS / Linux 分頁）。\n關閉並重新開啟 Affinity Designer / Photo / Publisher。\n字型隨即出現在所有字型選單，毋須額外設定。",
    "home.platforms.tabs.adobe":
      "先在作業系統安裝字型。\n關閉並重新開啟 Adobe Illustrator / Photoshop / InDesign。\n字型會以家族名稱出現在字型選單，毋須額外設定即可使用。",
    "home.platforms.tabs.word":
      "先在作業系統安裝字型。\n關閉並重啟 Word。\n在「常用 > 字型」選單中找到字型，毋須額外設定。",
    "home.platforms.tabs.iwork":
      "先用 macOS 字體簿安裝字型（見 macOS 分頁）。\n開啟 Pages 或 Keynote，字型會以家族名稱出現在「格式 > 字型」選單，毋須額外設定即可使用。",
    "home.platforms.tabs.web":
      "將下載的 .woff 與 .ttf 上傳至你的伺服器（或任何 CSS 能存取的位置）。\n在 CSS 中加入 @font-face 宣告（生成器 Step 5 對話框提供可複製的範本）。\n套用字型：`font-family: '你的字型家族名稱'`。\nChrome、Firefox、Safari 均自動支援，毋須額外設定。",
    "home.platforms.tabs.windows":
      "右鍵點擊 .ttf 檔案，選擇「安裝」（或「為所有使用者安裝」以全系統可用）。\n或拖曳 .ttf 至「設定 > 個人化 > 字型」。\n重啟已開啟的應用程式，否則它們無法載入新字型。",
    "home.platforms.tabs.macos":
      "雙擊 .ttf 檔案——「字體簿（Font Book）」會自動開啟。\n在字體簿預覽視窗中點擊「安裝字型」。\n字型隨即可供所有應用程式使用，毋須重啟系統。",
    "home.platforms.tabs.linux":
      "將 .ttf 複製至 `~/.fonts/`（單一使用者）或 `/usr/share/fonts/truetype/`（全系統）。\n執行 `fc-cache -f` 更新字型快取。\n重啟需要使用此字型的 GUI 應用程式。",
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
    "about.dialects.title": "唔止廣東話",
    "about.dialects.body":
      "Wing Font 由廣東話開始，但設計上一直想支援更多漢語方言。最新加入嘅係臺語（河洛話）：用思源黑體（Noto Sans TC）做底字，配搭 Huninn（粉圓）標注台羅（Tâi-lô）同白話字（POJ）嘅聲調符號，字音資料源自 AlanJui 嘅 Piau-Im 同 rime-tlpa 開源字庫。喺首頁可以睇到「家己的歌，家己唱；家己的字，家己選。」嘅台羅示範，亦可以喺製作頁揀台語拼音方案，自己整一套。歡迎更多方言加入。",
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
    "step2.mandarinWarning.title": "普通話對應表體積較大",
    "step2.mandarinWarning.body":
      "拼音對應表覆蓋全部 CJK 字符（約 95,000 筆），在瀏覽器內生成可能需時 5-15 分鐘，亦有機會因為記憶體不足而中斷。建議直接使用已經預先生成嘅普通話字型——同樣輸出，即時下載。",
    "step2.mandarinWarning.cta": "查看預先生成字型",
    "step2.mandarinWarning.cli":
      "熟悉命令列？直接喺本機跑生成腳本最快",
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
      "字型的詞語對應與「字1」、「字丅一」等數字標注切換無需任何設定即可運作（基於 OpenType `ccmp` 必定啟用功能）。Canva、InDesign、Word、Pages、Keynote 等工具均能直接使用。",
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
    "footer.links.credits": "Acknowledgements",
    "footer.credit": "Designed and built by chunlaw",
    // Acknowledgements page
    "ack.hero.title": "Acknowledgements",
    "ack.hero.tagline":
      "Wing Font stands on the shoulders of open-source data and type.",
    "ack.intro":
      "These open dictionaries and fonts make Wing Font's dialect annotations possible. Thank you to everyone who shared their work.",
    "ack.taigi.title": "Taiwanese / Southern Min — reading data",
    "ack.taigi.body":
      "The Taiwanese (Hō-ló) character readings, the cross-scheme conversion tables (Tâi-lô / POJ / 閩拼) and the tone-mark placement logic all come from AlanJui's open-source projects.",
    "ack.taigi.piauim":
      "Character-reading database — the 漢字庫 table of Ho_Lok_Ue.db plus the initial / final / tone conversion tables — and the tone-mark logic (mod_帶調符音標.py).",
    "ack.taigi.rimetlpa":
      "The TLPA RIME input schema and dictionaries, a second source of character readings.",
    "ack.taigi.taigivs":
      "Transcription data for 方音符號 (Taiwanese Phonetic Symbols) and 台灣語假名 (Taiwanese kana) (Apache-2.0); readings sourced from the MOE Taiwanese dictionary.",
    "ack.teochew.title": "Teochew — reading data",
    "ack.teochew.body":
      "The Teochew character and word readings (Geng'dang Pêng'im) come from the open learn-teochew project, then converted into Peng'im / Tie-lo / Pe̍h-ūe-jī and other schemes with the parsetc parser.",
    "ack.teochew.learnteochew":
      "The Teochew character / word reading dictionary (teochew_scrape.json, Geng'dang Pêng'im) — also the source of the home-page sample line 「家己个歌，家己唱；家己个字，家己揀。」.",
    "ack.teochew.parsetc":
      "Teochew romanization parser and converter — turns the Peng'im readings into Tie-lo, Pe̍h-ūe-jī, Dieghv, Gaginang and Sinwenz.",
    "ack.fonts.title": "Fonts",
    "ack.fonts.body":
      "Every TTF Wing Font ships with is licensed under the SIL Open Font License 1.1 (OFL-1.1). The canonical OFL text and each font's copyright statement + Reserved Font Name are bundled together in the wing-font-hub repo's LICENSES/ folder. The list below groups fonts by role.",
    "ack.fonts.notosanstc":
      "Traditional-Chinese CJK base font, variable weight. SIL Open Font License 1.1.",
    "ack.fonts.notosanssc":
      "Simplified-Chinese CJK base font, variable weight — pairs with the Mandarin pinyin showcase. SIL Open Font License 1.1.",
    "ack.fonts.notosanshk":
      "Hong-Kong-locale CJK base font, variable weight — default base for the Cantonese showcase fonts. Glyph forms follow HK conventions (different stroke shapes for chars like 字 / 為 / 起 / 緣 / 緊 vs the Taiwan-locale Noto Sans TC). SIL Open Font License 1.1.",
    "ack.fonts.notosansjp":
      "Annotation font for the Cantonese-katakana mapping (variable weight). SIL Open Font License 1.1.",
    "ack.fonts.notosanskr":
      "Annotation font for the Cantonese-Hangul mapping (variable weight). SIL Open Font License 1.1.",
    "ack.fonts.chironsung":
      "Traditional-Chinese serif (Sung) base font; ships in Regular and Italic. SIL Open Font License 1.1.",
    "ack.fonts.chironhei":
      "Traditional-Chinese sans-serif (Hei) base font; ships in Regular and Bold. SIL Open Font License 1.1.",
    "ack.fonts.sourcehanserif":
      "Pan-CJK serif, Adobe's Source Han Serif — paired with the M+ 1m annotation in one of the Mandarin showcase combinations. SIL Open Font License 1.1.",
    "ack.fonts.xiaolai":
      "Simplified-Chinese handwriting-style base font (lxgw's Xiaolai SC) — paired with M+ Rounded 1c for a softer Mandarin pinyin showcase. SIL Open Font License 1.1.",
    "ack.fonts.huninn":
      "Annotation font — justfont's open-source Huninn (jf-openhuninn). Carries every Tâi-lô / POJ combining tone mark plus the nasal ⁿ and the o͘ dot. SIL Open Font License 1.1.",
    "ack.fonts.notoserif":
      "Latin annotation font used for the Cantonese romanizations (LSHK, Yale, Lau, Guangdong, Chishima). SIL Open Font License 1.1.",
    "ack.fonts.mplus1m":
      "Japanese fixed-width annotation font, paired with Source Han Serif for one of the Mandarin showcase combinations. SIL Open Font License 1.1.",
    "ack.fonts.mplusrounded":
      "Japanese rounded annotation font, paired with Xiaolai SC for the handwriting-style Mandarin showcase. SIL Open Font License 1.1.",
    "ack.fonts.googlesansthai":
      "Annotation font for the Cantonese-Thai mapping (variable weight), designed by Cadson Demak / IT Foundry. SIL Open Font License 1.1. \"Google Sans\" is a trademark of Google LLC.",
    "ack.canto.title": "Cantonese — reading data",
    "ack.canto.typeduck": "Jyutping (LSHK) reading data.",
    "ack.canto.cuhk":
      "CUHK's 粵語審音配詞字庫 (Chinese Character Database with Cantonese readings).",
    "ack.canto.kodensha": "Cantonese Romanization Converter.",
    "ack.mandarin.title": "Mandarin (普通話 / 國語) — reading data",
    "ack.mandarin.body":
      "The Mandarin reading data is built entirely from mozillazg's MIT-licensed datasets — taken from their permissive upstream, not from any OFL-licensed font project. Each character's default reading follows the Unicode Unihan database's kMandarin field. The technique of baking pinyin into the glyphs with contextual homograph disambiguation was pioneered by Mengshen-pinyin-font (OFL-1.1); Wing Font reuses none of its data files but gratefully acknowledges it as inspiration.",
    "ack.mandarin.pinyindata": "Per-character readings (MIT; derived from Unihan).",
    "ack.mandarin.phrasepinyindata":
      "Word/phrase readings that drive contextual homograph disambiguation (MIT).",
    "ack.mandarin.unihan": "Unicode Han Database (Unihan) — upstream reading data.",
    "ack.license":
      "Each dataset and font is used under its own licence — check the upstream source before redistributing.",
    "ack.cta.showcase": "Browse the fonts",
    // Home
    "home.hero.title": "Wing Font",
    "home.hero.tagline":
      "Show pronunciation annotations above Chinese characters in plain text — no HTML markup, no special apps, just install the font.",
    "home.hero.sampleCaption":
      "Plain UTF-8 text above, rendered by Wing Font itself.",
    "home.hero.cta.generate": "Generate your own font",
    "home.hero.cta.showcase": "Browse ready-made fonts",
    "home.platforms.title": "Works everywhere you do",
    "home.platforms.body":
      "Standard TTF and WOFF files. Drop them anywhere a custom font goes — no plug-ins, no special integration.",
    "home.platforms.free": "✓ And it's 100% free, no signup.",
    "home.platforms.learnMoreTitle": "Using it on your platform",
    "home.platforms.learnMoreSubtitle":
      "Pick the app or operating system you use most and see what to do.",
    "home.platforms.tabs.canva":
      "Open a design and click any text element.\nIn the font picker, choose “Upload a font” and select the .ttf you downloaded.\nThe font is ready to use immediately — no extra settings.\nFree accounts may need a Canva Pro upgrade to upload custom fonts.",
    "home.platforms.tabs.affinity":
      "Install the font through your operating system (see the Windows / macOS / Linux tabs).\nQuit and reopen Affinity Designer / Photo / Publisher.\nThe font now appears in every font picker — no extra settings.",
    "home.platforms.tabs.adobe":
      "Install the font through your operating system.\nQuit and restart Illustrator / Photoshop / InDesign.\nThe font appears in the font menu under its family name and is ready to use — no extra settings.",
    "home.platforms.tabs.word":
      "Install the font through your operating system.\nQuit and restart Word.\nFind the font under Home > Font and use it normally — no extra settings.",
    "home.platforms.tabs.iwork":
      "Install the font via macOS Font Book (see the macOS tab).\nOpen Pages or Keynote; the font appears in Format > Font under its family name and is ready to use — no extra settings.",
    "home.platforms.tabs.web":
      "Upload the .woff and .ttf to your server (or anywhere your CSS can reach them).\nAdd the @font-face snippet from the generator's Step 5 dialog to your stylesheet.\nUse the font like any other: `font-family: 'YourFamilyName'`.\nWorks automatically in Chrome, Firefox, and Safari — no extra settings.",
    "home.platforms.tabs.windows":
      "Right-click the .ttf file and choose “Install” (or “Install for all users” for system-wide access).\nAlternatively, drag the .ttf into Settings > Personalization > Fonts.\nRestart any application that was already running, otherwise it won't see the new font.",
    "home.platforms.tabs.macos":
      "Double-click the .ttf file — Font Book opens automatically.\nClick “Install Font” in the Font Book preview window.\nThe font becomes immediately available in every application — no restart needed.",
    "home.platforms.tabs.linux":
      "Copy the .ttf to `~/.fonts/` (current user) or `/usr/share/fonts/truetype/` (all users).\nRun `fc-cache -f` to refresh the font cache.\nRestart any GUI applications you want to use the font in.",
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
    "about.dialects.title": "Beyond Cantonese",
    "about.dialects.body":
      "Wing Font began with Cantonese, but it was always meant to carry more Sinitic topolects. The newest addition is Taiwanese / Southern Min (Hō-ló): Noto Sans TC as the base character font, with Huninn (jf-openhuninn) setting the Tâi-lô and Pe̍h-ōe-jī (POJ) tone marks. The reading data comes from AlanJui's open Piau-Im and rime-tlpa dictionaries. You can see the Tâi-lô sample 「家己的歌，家己唱；家己的字，家己選。」 on the home page, and pick a Taiwanese romanization scheme in the generator to build your own. More dialects are welcome.",
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
    "step2.mandarinWarning.title": "The Mandarin mapping is computationally heavy",
    "step2.mandarinWarning.body":
      "The Hanyu Pinyin mapping covers the full CJK ideograph range (~95,000 rows). In-browser generation can take 5–15 minutes and may run out of memory before finishing. We recommend the pre-built Mandarin showcase fonts instead — same output, instant download.",
    "step2.mandarinWarning.cta": "View pre-built fonts",
    "step2.mandarinWarning.cli":
      "Comfortable with the command line? Run the generator locally for the fastest path",
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
      "All override paths (word-context like 銀行/行人, digit-suffix like 字1, and trigger+numeral like 字丅一) work automatically with no text-setting toggles. The font's rules ride on OpenType `ccmp`, which is mandatory — Canva, InDesign, Word, Pages, and Keynote all apply them out of the box.",
  },
};
