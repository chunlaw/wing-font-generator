/**
 * Japanese (日本語) translation table. Same key set as `en` / `zh` in
 * ./translations.ts — the Record type makes tsc flag any missing key.
 * Copy leans toward Cantonese learners, the main Japanese audience.
 */
import type { TranslationKey } from "./translations";

export const JA: Record<TranslationKey, string> = {
  // Header
  "header.title": "Wing Font",
  "header.cta.generate": "フォントを作る",
  "header.cta.showcase": "フォント一覧",
  "header.cta.notes": "ノート",
  "header.cta.learnMore": "詳しく見る",
  "notes.title": "言語ノート",
  "notes.subtitle": "各言語の読みがどう作られているか — 表記法、データの出典、限界について。",
  "notes.help.text": "読みのデータはコミュニティで管理しています。間違った読みを見つけた方、知っている言語で協力したい方はぜひ。",
  "notes.help.link": "改善に協力する",
  "notes.contact.text": "ネイティブの方も、学習中の方も、言葉が好きな方も、ちょっと気になった方も大歓迎です。専門知識は必要ありません。お気軽にご連絡ください。",
  "notes.contact.link": "Telegram グループに参加",
  "header.cta.sponsor": "スポンサー",
  "header.lang.toggle": "言語を切り替え",
  "header.theme.toggle": "テーマを切り替え",
  // Mobile drawer
  "drawer.more": "その他のリンク",
  "drawer.social": "SNS",
  "drawer.close": "閉じる",
  // Footer
  "footer.license": "MIT ライセンス（無料・オープンソース）",
  "footer.about.title": "Wing Font について",
  "footer.about.body":
    "Wing Font は、読みを表示するフォントを作るオープンソースのツールです。広東語の粵拼（ジュッピン）、倉頡コード、独自の表記法にも対応。すべてブラウザ内で動作し、ファイルが外部に送信されることはありません。",
  "footer.links.title": "リンク",
  "footer.links.generate": "フォントを作る",
  "footer.links.showcase": "フォント一覧",
  "footer.links.source": "ソースコード（GitHub）",
  "footer.links.credits": "謝辞",
  "footer.links.cli": "コマンドライン版",
  "footer.links.reportError": "読みの誤りを報告",
  "footer.links.terms": "利用規約",
  "footer.links.privacy": "プライバシー",
  "footer.credit": "Designed and built by chunlaw",
  "legal.terms.title": "利用規約",
  "legal.privacy.title": "プライバシーポリシー",
  "legal.effectiveDate": "施行日：{date}",
  "meta.home.title": "Wing Font — 広東語学習のための無料ジュッピン（粵拼）フォント",
  "meta.home.description":
    "すべての文字に読みが組み込まれた、無料・オープンソースのフォント。広東語を学ぶための粵拼（ジュッピン）フォントをはじめ、ピンイン、注音符号、台湾語、ふりがな、タイ語、アラビア語なども。Word・Pages・Canva・ブラウザでそのまま入力するだけ。PowerPoint は無料アドインで対応。",
  "meta.showcase.title": "フォント一覧：ジュッピン・イェール・ピンイン・注音・台羅 | Wing Font",
  "meta.showcase.description":
    "Wing Font の既成フォントをすべて閲覧・ダウンロード — 粵拼（ジュッピン）、イェール式、ピンイン、注音符号、台羅、潮州語拼音、ふりがな、タイ語、アラビア語など。無料、SIL OFL 1.1。",
  "meta.specimen.title": "{name} — {dialect}の無料{scheme}フォント | Wing Font",
  "meta.specimen.description":
    "{name}：すべての文字のグリフに読みが組み込まれた、無料の{dialect}フォント。オープンソースのベースフォントと注音フォントから Wing Font で生成。ライブプレビューで試して TTF / WOFF2 をダウンロード。オープンソース、SIL OFL 1.1。",
  "meta.generate.title": "ジュッピン・ピンインフォントを自作 | Wing Font",
  "meta.generate.description":
    "ベースフォント、読みの表、パラメータを選ぶだけで、ブラウザ上で自分だけの注音フォントを生成。インストールも登録も不要。",
  "meta.about.title": "Wing Font について | Wing Font",
  "meta.about.description":
    "Wing Font は、粵拼（ジュッピン）・ピンイン・台羅などの読みをフォントに直接組み込む、無料のオープンソースプロジェクトです。中国語の諸言語、日本語、タイ語、アラビア語などに対応。",
  "meta.credits.title": "謝辞 | Wing Font",
  "meta.credits.description":
    "Wing Font を支えるオープンソースのデータとフォント — Noto Sans、ChironSung、Xiaolai、Huninn、TypeDuck、mozillazg pinyin-data など。",
  "meta.terms.title": "利用規約 | Wing Font",
  "meta.terms.description":
    "Wing Font（注音フォントを生成する無料・オープンソースのツール）の利用規約。",
  "meta.privacy.title": "プライバシーポリシー | Wing Font",
  "meta.privacy.description":
    "Wing Font のプライバシーポリシー — フォント生成はすべてブラウザ内で行われます。アカウント不要、トラッキングなし、第三者による解析なし。",
  // Acknowledgements page
  "ack.hero.title": "謝辞",
  "ack.hero.tagline": "Wing Font は、オープンソースのデータとフォントに支えられています。",
  "ack.intro":
    "これらのオープンな辞書とフォントのおかげで、Wing Font の各言語の読みが実現しています。作品を公開してくださったすべての方に感謝します。",
  "ack.dataQuality.title": "出典と正確さについて",
  "ack.dataQuality.body":
    "Wing Font は個人のオープンソースプロジェクトで、作者は言語学の専門家ではありません。既成フォントに含まれる読みの表はすべて、以下に記載した上流のオープンソースが出典です。ただし、それらは形式・語彙・声調記号の慣習がまちまちなため、**手作業での編集、正規表現、AI 支援ツールを組み合わせて正規化・重複除去・曖昧さ解消を行っています**（整理には LLM、声調記号や分かち書きの変換にはプログラム処理、データが不足する箇所には生成した代替の読みを使用）。\n\nそのため、**誤りが含まれている可能性があります** — 多音字の既定の読みの誤り、方言特有の異読の欠落、複数文字の語の区切り誤り、変調まわりの例外など。\n\n誤りに気づいたネイティブの方、言語学者の方、読者の方は、ぜひ **[GitHub で issue を作成](https://github.com/chunlaw/wing-font-generator/issues)するか、[Telegram グループ](https://t.me/wingfont)にご参加ください**。修正は次回の CI ビルドで反映されます。",
  "ack.prior.title": "先行事例",
  "ack.prior.body":
    "中国語フォントに読みを組み込み、OpenType で文脈から多音字の読みを選ぶ手法は、Wing Font が最初ではありません。Wing Font も同じアプローチを取っています。",
  "ack.prior.mengshen":
    "漢語拼音を内蔵した中国語フォント。2019 年 7 月に初公開。v1.0（2020 年 11 月）以降、OpenType GSUB（rclt）で文脈から多音字の読みを選択します。",
  "ack.taigi.title": "台湾語（閩南語）— 読みのデータ",
  "ack.taigi.body":
    "標準（優勢腔）の読みと 9 つの地域アクセント（腔）は、台湾教育部《臺灣台語常用詞辭典》（sutian / kautian.ods、CC BY-ND 3.0 TW）によります。台羅と白話字は辞典からそのまま採用し、TLPA と閩拼は台羅から変換しています。複数文字の語は 1 文字 1 音節で保持し、多音字の判別に使います。",
  "ack.taigi.sutian":
    "台湾教育部《臺灣台語常用詞辭典》（sutian / kautian.ods）— 標準の文字の読みと、アクセント別の語音差異表の典拠。ライセンス：CC BY-ND 3.0 Taiwan。",
  "ack.taigi.chhoetaigi":
    "ChhoeTaigi オープンデータベース — 教育部辞典の忠実な変換版。Wing Font は実際にはその KipUnicode（台羅）/ PojUnicode（白話字）列を使用しています。",
  "ack.taigi.taigivs":
    "方音符号（臺灣方音符號）と台湾語仮名の表記データ（Apache-2.0）。読みは教育部台湾語辞典によります。",
  "ack.teochew.title": "潮州語 — 読みのデータ",
  "ack.teochew.body":
    "潮州語の文字と語の読み（潮州話拼音方案）はオープンな learn-teochew プロジェクトから取得し、parsetc パーサーで潮拼・Tie-lo・白話字などの表記に変換しています。",
  "ack.teochew.learnteochew":
    "潮州語の文字・語の読み辞書（teochew_scrape.json、潮州話拼音方案）— トップページの例文「家己个歌，家己唱；家己个字，家己揀。」の出典でもあります。",
  "ack.teochew.parsetc":
    "潮州語ローマ字のパーサー兼変換ツール — 潮拼の読みを Tie-lo、白話字、Dieghv、Gaginang、Sinwenz に変換します。",
  "ack.fonts.title": "フォント",
  "ack.fonts.body":
    "Wing Font が同梱する TTF はすべて SIL Open Font License 1.1（OFL-1.1）でライセンスされています。OFL の正式な本文と、各フォントの著作権表示および予約フォント名は、wing-font-hub リポジトリの LICENSES/ フォルダにまとめてあります。以下は役割別の一覧です。",
  "ack.fonts.notosanstc":
    "繁体字 CJK ベースフォント（可変ウェイト）。SIL Open Font License 1.1。",
  "ack.fonts.notosanssc":
    "簡体字 CJK ベースフォント（可変ウェイト）— 普通話ピンインの見本に使用。SIL Open Font License 1.1。",
  "ack.fonts.notosanshk":
    "香港字形の CJK ベースフォント（可変ウェイト）— 広東語見本フォントの既定ベース。字形は香港の慣習に従います（字・為・起・緣・緊などの筆形が台湾字形の Noto Sans TC と異なる）。SIL Open Font License 1.1。",
  "ack.fonts.notosansjp":
    "広東語カタカナ表記用の注音フォント（可変ウェイト）。SIL Open Font License 1.1。",
  "ack.fonts.notosanskr":
    "広東語ハングル表記用の注音フォント（可変ウェイト）。SIL Open Font License 1.1。",
  "ack.fonts.chironsung":
    "繁体字の明朝（宋体）ベースフォント。Regular と Italic を同梱。SIL Open Font License 1.1。",
  "ack.fonts.chironhei":
    "繁体字のゴシック（黒体）ベースフォント。Regular と Bold を同梱。SIL Open Font License 1.1。",
  "ack.fonts.sourcehanserif":
    "汎 CJK の明朝体、Adobe の源ノ明朝 — 普通話見本の組み合わせの一つで M+ 1m の注音と組み合わせています。SIL Open Font License 1.1。",
  "ack.fonts.xiaolai":
    "簡体字の手書き風ベースフォント（lxgw の小賴字體 SC）— M+ Rounded 1c と組み合わせ、やわらかい普通話ピンインの見本に使用。SIL Open Font License 1.1。",
  "ack.fonts.huninn":
    "注音フォント — justfont のオープンソース jf open 粉圓（jf-openhuninn）。台羅・白話字の結合声調記号をすべて収録し、鼻音の ⁿ と o͘ の点にも対応。SIL Open Font License 1.1。",
  "ack.fonts.notoserif":
    "広東語ローマ字（粵拼、イェール式、劉錫祥式、広州式、千島式）用のラテン文字注音フォント。SIL Open Font License 1.1。",
  "ack.fonts.mplus1m":
    "日本語の等幅注音フォント。普通話見本の組み合わせの一つで源ノ明朝と組み合わせています。SIL Open Font License 1.1。",
  "ack.fonts.mplusrounded":
    "日本語の丸ゴシック注音フォント。手書き風の普通話見本で小賴字體 SC と組み合わせています。SIL Open Font License 1.1。",
  "ack.fonts.googlesansthai":
    "広東語タイ文字表記用の注音フォント（可変ウェイト）。Cadson Demak / IT Foundry によるデザイン。SIL Open Font License 1.1。「Google Sans」は Google LLC の商標です。",
  "ack.canto.title": "広東語 — 読みのデータ",
  "ack.canto.typeduck": "粵拼（香港語言学会式）の読みデータ。CC BY 4.0。",
  "ack.canto.cuhk":
    "香港中文大学《粵語審音配詞字庫》（広東語の読み付き漢字データベース）。",
  "ack.canto.kodensha": "広東語ローマ字変換ツール。",
  "ack.mandarin.title": "中国語（普通話 / 國語）— 読みのデータ",
  "ack.mandarin.body":
    "中国大陸の普通話の読みデータ（mandarin-cn）は、すべて mozillazg の MIT ライセンスのデータセットから構築しています（OFL ライセンスのフォントプロジェクトではなく、制約の少ない上流から取得）。各文字の既定の読みは Unicode Unihan データベースの kMandarin フィールドに従います。シンガポールとマレーシアも同じ普通話の標準を公式に採用しているため、mandarin-cn を共用します。台湾の國語版（mandarin-tw-toned / mandarin-tw-zhuyin）は、すべて台湾教育部《重編國語辭典修訂本》によります。文字と語の読み、注音そのものも辞典に従い（例：期 qí、垃圾 lè sè）、g0v の moedict-data から取得しています。文脈による多音字判別でピンインをグリフに組み込む手法は Mengshen-pinyin-font（OFL-1.1）が先駆けです。Wing Font はそのデータファイルを一切使用していませんが、着想の源として感謝します。",
  "ack.mandarin.pinyindata":
    "文字ごとの普通話の読み（MIT、Unihan 由来）。",
  "ack.mandarin.phrasepinyindata":
    "文脈による多音字判別に使う語・フレーズの読み（MIT）。",
  "ack.mandarin.unihan": "Unicode 漢字データベース（Unihan）— 上流の読みデータ。",
  "ack.mandarin.moedict":
    "國語版全体（mandarin-tw-toned / mandarin-tw-zhuyin）で使用する台湾教育部《國語辭典》の読みと注音。g0v の moedict-data 経由（CC BY-ND 3.0 TW）。",
  "ack.thai.title": "タイ語 — 読みのデータ",
  "ack.thai.body": "タイ語のローマ字表記は、香港泰國文化協会（TCAHK）の教材に従っています。同協会のタイ語クラスは広東語で教えられています。thai-ink プロジェクトがその教材を綴りから発音への規則と、手作業で確認した語彙（約 900 語、常に優先）にまとめました。残りの約 8.4 万の常用語は PyThaiNLP の単語リストから取得し、同じ規則で自動的にローマ字化しているため、近似の読みです。",
  "ack.thai.tcahk": "ローマ字表記法と語彙の出典：同協会の広東語によるタイ語講座の教材。",
  "ack.thai.pythainlp": "タイ語の単語リストと頻度（Apache-2.0）。自動ローマ字化する語彙の拡張に使用。",
  "ack.inuktitut.title": "イヌクティトゥット語 — 読みのデータ",
  "ack.inuktitut.body": "イヌクティトゥット語の読みは ICI 標準ローマ字正書法を使い、qaniujaaqpait で音節文字から変換しています。単語リスト（約 2 万語）はヌナブト準州議会議事録の単語頻度から作成しました（テキスト © Legislative Assembly of Nunavut、CC BY 4.0）。リストにない長い語は統計的に学習した単位に分割しますが、必ずしも本来の形態素とは限りません。",
  "ack.inuktitut.hansard": "ヌナブト準州議会の議事録（CC BY 4.0）。カナダ国立研究機構が対訳化し、OPUS で配布。単語頻度に使用。",
  "ack.inuktitut.qaniujaaqpait": "音節文字からローマ字への変換ツール（MIT）。すべての読みの生成に使用。",
  "ack.license":
    "各データセットとフォントはそれぞれのライセンスで使用しています。再配布の前に上流の出典をご確認ください。",
  "ack.cta.showcase": "フォントを見る",
  // Home
  "home.hero.title": "Wing Font",
  "home.hero.tagline":
    "Wing Font は、{languages} 言語に対応した {fonts} 種類の無料・オープンソースフォントです。粵拼（ジュッピン）、ピンイン、注音符号、台羅などの読みを、HTML のマークアップやプラグインなしで、普通のテキストのまま各文字の上に表示します。Word、Pages、Canva、Adobe、ブラウザで使え、PowerPoint もアドインで対応。広東語学習の必携ツールを目指しています。",
  "home.faq.title": "よくある質問",
  "home.faq.q1": "Wing Font は無料ですか？商用利用できますか？",
  "home.faq.a1": "はい、完全に無料です。フォントは SIL Open Font License 1.1 でライセンスされているので、個人利用、授業、商用（印刷物・スライド・動画を含む）に使えます。唯一の制限は、フォントファイル単体を販売できないことです。",
  "home.faq.q2": "Word で Wing Font を使うには？",
  "home.faq.a2": "TTF ファイルをダウンロードしてパソコンにインストールし、Word のフォントメニューから選びます（例：「Wing Sans Yue Jyutping」）。あとは普段どおり入力するだけで、読みが自動で表示されます。",
  "home.faq.q3": "PowerPoint でも使えますか？",
  "home.faq.a3": "はい、無料の [Wing Font PowerPoint アドイン](#platform-powerpoint)で使えます。PowerPoint は中国語テキストにフォントの読みの規則を適用しないため、アドインがテキストを PowerPoint で表示できる文字に変換します。",
  "home.faq.q4": "自分で注音フォントを作れますか？",
  "home.faq.a4": "はい、2 つの方法があります。オンライン：「フォントを作る」ページでベースフォント、注音フォント、読みの表を選ぶだけ。すべてブラウザ内で動作し、インストールもアップロードも不要です。コマンドライン：pip install wing-font を実行し、wing-font コマンドでオフラインや自分のワークフローの中で一括生成できます。",
  "home.faq.q5": "文字の読みを変えるには？",
  "home.faq.a5": "方法は 2 つあります。\n\n1. **別の読みを選ぶ**：文字の後に数字を付けます。例えば 行２ は 2 番目の読み、行０ は読みなしで表示されます。Word では全角数字を使ってください。\n2. **自分で読みを書く**：文字の後に全角の ０ を入力し、続けて全角でローマ字を入力します。例えば 行０ｚａａ１ と入力すると、行 の上に zaa1 と表示されます。粵拼、ピンイン、注音符号、台羅など、カスタム注音に対応した中国語フォントで使えます。\n\n間違った読みを見つけたら、GitHub でご報告ください。",
  "home.faq.q6": "どの言語・表記法に対応していますか？",
  "home.faq.a6": "現在 {fonts} 種類のフォントで {languages} 言語に対応しています：広東語（粵拼、イェール式、劉錫祥式、黄錫凌式、広州式、千島式、倉頡、他の文字による空耳表記）、台湾語（台羅、白話字、方音符号、台湾語仮名）、潮州語、中国語普通話（ピンイン、注音符号）、日本語、タイ語、アラビア語、ヒンディー語、イヌクティトゥット語。ジェネレーターで独自の表記法も作れます。",
  "home.hero.sampleCaption":
    "上は普通の UTF-8 テキストを、Wing Font そのもので表示したものです。",
  "home.hero.cta.generate": "自分のフォントを作る",
  "home.hero.cta.showcase": "既成フォントを見る",
  "home.platforms.title": "いつものアプリでそのまま使える",
  "home.platforms.body":
    "標準的な TTF / WOFF ファイルなので、カスタムフォントが使える場所ならどこでも使えます。プラグインも特別な設定も不要。電子書籍リーダーでも。",
  "home.platforms.free": "✓ しかも 100% 無料、登録不要。",
  "home.platforms.learnMoreTitle": "お使いの環境での使い方",
  "home.platforms.learnMoreSubtitle":
    "よく使うアプリや OS を選んで、手順をご覧ください。",
  "home.platforms.tabs.canva":
    "1. デザインを開き、テキスト要素をクリックします。\n2. フォント選択で「**フォントをアップロード**」を選び、ダウンロードした `.ttf` を選択します。\n3. すぐに使えます。追加の設定は不要です。\n\n*無料アカウントでは、カスタムフォントのアップロードに Canva Pro が必要な場合があります。*",
  "home.platforms.tabs.affinity":
    "1. OS からフォントをインストールします（**Windows / macOS / Linux** タブ参照）。\n2. Affinity Designer / Photo / Publisher を終了して再起動します。\n3. すべてのフォント選択に表示されます。追加の設定は不要です。",
  "home.platforms.tabs.adobe":
    "1. OS からフォントをインストールします。\n2. Illustrator / Photoshop / InDesign を終了して再起動します。\n3. フォントメニューにファミリー名で表示され、すぐに使えます。追加の設定は不要です。",
  "home.platforms.tabs.word":
    "1. OS からフォントをインストールします。\n2. Word を終了して再起動します。\n3. **ホーム > フォント** から選んで普通に使えます。追加の設定は不要です。\n\n**読みを手動で選ぶ（Word 固有の注意）**\n\n数字は 1 から数えます：`字0` = 読みなしの漢字、`字1` = 1 番目（既定）の読み、`字N` = N 番目の読み。\n\nWord のテキストエンジン（DirectWrite）は、半角 ASCII 数字を隣の CJK 文字とは別のシェーピング単位に分けるため、`字0` / `字1` / `字2` の数字による指定は Word では効きません（合字がシェーピング単位の境界をまたげないため）。Word では次の 2 つの方法が確実に使えます：\n\n- **全角数字** — `字０`、`字１`、`字２`、`字１０` など（おすすめ。半角と同じ 1 始まりの十進表記を、IME の全角モードで入力するだけ）\n- **IME で入力しやすいトリガー** — `字丅零`（読みなし）、`字丅一`（1 番目の読み）、…、`字丅九`（9 番目の読み）— 漢数字の前に区切りとして `丅` を使います。中国語 IME のユーザーに便利です\n\nどちらも OpenType の必須機能 `ccmp` で動くため、Word で切り替える設定や合字のオプションを探す必要はありません。ブラウザ、macOS の Pages / Keynote、Canva、Adobe 製品などでは 3 つの表記すべてが使え、半角の `字1`、`字2` も動作します。全角 / IME 表記は Microsoft Word 専用に用意したものです。",
  "home.platforms.tabs.powerpoint":
    "PowerPoint は中国語テキストに OpenType の置換（GSUB）を適用しないため、`行２` のような表記や語による読みの切り替えは使えません。代わりに **Wing Font PowerPoint アドイン** をお使いください。テキストを PowerPoint で表示できる文字に書き換えます。\n\n**アドインのインストール**\n\nOS からフォントをインストールし、[manifest.xml](https://wing-font-ppt.chunlaw.io/manifest.xml \"download\") をダウンロードしてから、お使いの環境の手順に従ってください。\n\n**Mac**\n\n`manifest.xml` を `~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/` にコピーし、PowerPoint を再起動します。\n\n**Windows**\n\nOffice はネットワークパスからしかアドインを読み込まないため、まずマニフェストを置いたフォルダを共有する必要があります。フォルダに入っているのはこの設定ファイル 1 つだけで、何もアップロードされません。\n\n1. 新しいフォルダ（例：`C:\\WingFontAddin`）を作り、`manifest.xml` を入れます。\n2. フォルダを右クリック > **プロパティ** > **共有** タブ > **共有…** > 自分のアカウントを選択 > **共有**。\n3. 共有タブに戻り、**ネットワーク パス** の行（例：`\\\\DESKTOP-AB12\\WingFontAddin`）をコピーします。\n4. PowerPoint で **ファイル > オプション > トラスト センター > トラスト センターの設定 > 信頼できるアドイン カタログ** を開きます。\n5. **カタログの URL** にネットワークパスを貼り付け、**カタログの追加** をクリックします。\n6. 一覧で **メニューに表示する** にチェックを入れ、**OK** をクリックします。\n7. PowerPoint のウィンドウをすべて閉じて、もう一度起動します。\n8. **ホーム > アドイン > 詳細**（旧バージョン：**挿入 > 個人用アドイン**）> **共有フォルダー** タブ > **Wing Font** を選択 > **追加**。\n\n**Windows でうまくインストールできない場合**\n\n- **`https://` を求めるメッセージが出る**：ローカルパス（`C:\\…`）を貼り付けています。手順 3 の、`\\\\` で始まるネットワークパスを使ってください。\n- **共有フォルダー タブがない**：**メニューに表示する** にチェックが入っていないか、PowerPoint が完全に再起動されていません。\n- **トラスト センターの項目がグレーアウトしている**：パソコンが組織で管理されています。IT 担当者に、下記の **Microsoft 365 組織** の方法でのインストールを依頼してください。\n- **パソコン名を変更した**：ネットワークパスが変わっています。トラスト センターで古いカタログを削除し、追加し直してください。\n\n**Microsoft 365 組織**\n\n管理者が **管理センター > 設定 > 統合アプリ > カスタム アプリのアップロード** で `manifest.xml` をアップロードします。\n\nすると **ホーム** タブに **Wing Font** ボタンが表示されるので、クリックして作業ウィンドウを開きます。\n\n**アドインの使い方**\n\n1. テキスト（またはテキストボックス全体）を選択し、**選択範囲を変換** をクリックします。\n2. 数文字を選択するか、文字の隣にカーソルを置くと、各文字の読みが一覧表示されます。クリックで切り替えられます。\n3. **元に戻す** で選択範囲の読みの記号を取り除き、普通の文字に戻します。\n\nアドインは自分でダウンロードしたフォントで変換し、PowerPoint はインストール済みのフォントで表示するため、両者は同じビルドである必要があります。作業ウィンドウにはフォントのバージョン文字列が表示されるので、Font Book や Windows のフォントのプロパティと比べてください。違う場合は、作業ウィンドウでインストール済みのフォントファイルを選んでください。",
  "home.platforms.tabs.iwork":
    "1. macOS の **Font Book** でフォントをインストールします（**macOS** タブ参照）。\n2. Pages や Keynote を開くと、**フォーマット > フォント** にファミリー名で表示され、すぐに使えます。追加の設定は不要です。",
  "home.platforms.tabs.web":
    "1. `.woff` と `.ttf` をサーバー（または CSS から参照できる場所）にアップロードします。\n2. ジェネレーターのステップ 6 のダイアログにある `@font-face` スニペットをスタイルシートに追加します。\n3. 他のフォントと同じように使います：`font-family: 'YourFamilyName'`。\n\n*Chrome、Firefox、Safari で自動的に動作します。追加の設定は不要です。*",
  "home.platforms.tabs.windows":
    "1. `.ttf` ファイルを右クリックして「**インストール**」を選びます（システム全体で使う場合は「すべてのユーザーに対してインストール」）。\n2. または `.ttf` を **設定 > 個人用設定 > フォント** にドラッグします。\n3. すでに起動していたアプリは **再起動してください**。再起動しないと新しいフォントが認識されません。",
  "home.platforms.tabs.macos":
    "1. `.ttf` ファイルをダブルクリックすると、**Font Book** が自動で開きます。\n2. Font Book のプレビューウィンドウで「**インストール**」をクリックします。\n3. すぐにすべてのアプリで使えます。再起動は不要です。",
  "home.platforms.tabs.linux":
    "1. `.ttf` を `~/.fonts/`（現在のユーザー）または `/usr/share/fonts/truetype/`（全ユーザー）にコピーします。\n2. `fc-cache -f` を実行してフォントキャッシュを更新します。\n3. フォントを使いたい GUI アプリを **再起動** します。",
  "home.platforms.tabs.ereader":
    "電子書籍リーダーは、テキスト描画エンジンが OpenType GSUB の `ccmp` を適用すれば動作します。最近の HarfBuzz ベースのものは対応しています。動作確認済みは 3 機種で、それ以外も試す価値があります。\n\n**Kindle**（Paperwhite 4 以降、Oasis、Scribe。最新ファームウェア）\n1. EPUB / AZW3 を Calibre で開き、**フォント** で Wing Font を埋め込みます。\n2. USB または **Send-to-Kindle** のメールサービスで Kindle に送ります。\n3. カスタムフォントが自動で適用され、読みが文字と並んで表示されます。\n\n**Kobo**（Clara、Libra、Sage、Elipsa、Forma。最新ファームウェア）\n1. Kobo を USB で接続し、ルートに `.kobo/fonts/` がなければ作成します。\n2. `.ttf` を `.kobo/fonts/` に入れます。\n3. 取り出して、**設定 → 読書設定 → フォント** で Wing Font を選びます。\n\n**Boox などの Android 電子書籍リーダー**（Onyx Boox、Meebook、Likebook…）\n1. カスタムフォントに対応したリーダーアプリを使います。**Moon+ Reader** と **KOReader** は実績があります。\n2. `.ttf` をリーダーアプリのフォントフォルダにコピーするか、Android の設定でシステムフォントとしてインストールします。\n3. アプリのフォント選択で適用します。\n\n*PocketBook、Tolino などの HarfBuzz ベースの電子書籍リーダーでも動作するはずですが、実機では未確認です。reMarkable は主に PDF リーダーで、EPUB の GSUB 機能を確実には適用しません。*",
  "home.what.title": "Wing Font とは",
  "home.what.body":
    "Wing Font はフォント生成ツールです。2 つの TTF（ベースの文字用と読みのグリフ用）と、文字と読みを対応づけた CSV を渡すと、グリフに読みが組み込まれた新しい OpenType フォントを生成します。出力したフォントは、ウェブサイト、Word、Telegram、メールなど、カスタムフォントが使える場所ならどこでも使えます。",
  "home.who.title": "こんな人に",
  "home.who.body":
    "- **広東語を学ぶ人**：広東語の発音フォントとして、粵拼（ジュッピン）を見ながら読んで覚えられます。台湾語、普通話、タイ語などの学習にも。\n- **先生**：Word や PowerPoint で、読み付きのプリントやスライドをそのまま作れます。1 文字ずつルビを振る必要はありません。\n- **まだ粵拼を覚えていない人**：カタカナなど、すでに読める文字による空耳表記から始めれば、初日から声に出して読めます。\n- **少数民族の生徒**：漢字は書けても読み方がわからない？ すべての文字に読みが付いているので、自分で読めます。",
  "home.how.title": "仕組み",
  "home.how.body":
    "処理はすべて Pyodide（WebAssembly）でブラウザ内で動作します。Python のインストールも、サーバーへのアップロードも、料金も不要。データがあなたのパソコンから外に出ることはありません。",
  "home.features.title": "特長",
  "home.features.f1.title": "普通のテキストで読みを表示",
  "home.features.f1.body":
    "ローマ字はグリフそのものに組み込まれているので、HTML の <ruby> マークアップは不要。テキストをどこにコピーしても、読みが一緒についてきます。",
  "home.features.f2.title": "文脈に応じた読み分け",
  "home.features.f2.body":
    "多音字は前後の語に応じて自動で読みが切り替わります（例：銀行 と 行人）。`ccmp` 機能の OpenType 連鎖文脈置換で実現しています。",
  "home.features.f3.title": "読みを手動で選択",
  "home.features.f3.body":
    "1 から数える数字の接尾辞で、自動の読みを上書きできます：\n\n- `字0` → 読みなしの漢字\n- `字1` → 1 番目の読み（= 既定。`字` だけを入力したのと同じ）\n- `字2` → 2 番目の読み\n- `字10` → 10 番目の読み（10 番目以降は十進数でそのまま入力）\n\n**Microsoft Word では**：半角 ASCII 数字は DirectWrite によって別のシェーピング単位に分けられ、合字が境界をまたげないため、**全角数字** `字０`、`字１`、`字２`（または IME で入力しやすい `字丅零`、`字丅一`、`字丅二`）を使ってください。全角数字は East-Asian-Width=F なので周囲の CJK と同じ単位に残り、上書きが正しく働きます。",
  "home.features.f4.title": "完全にローカル",
  "home.features.f4.body":
    "フォントや読みの表がブラウザの外に出ることはありません。すべてクライアント側で処理します。",
  "home.features.f5.title": "カスタム注音（DIY）",
  "home.features.f5.body":
    "生成時のステップ 3 でカスタム注音の一覧を追加すると、フォントの利用者が自分で任意の文字の読みを指定できます：文字の後に全角の ０ を入力して読みを消し、続けて全角でローマ字を入力します。例えば 行０ｚａａ１ と入力すると、行 の上に zaa1 と表示されます。粵拼、ピンイン、注音符号、台羅の一覧を内蔵しているほか、自分の CSV もアップロードできます。現在は中国語（漢字）のベースフォントのみ対応。",
  // Showcase
  "showcase.tryIt": "ここに入力してみてください",
  "common.toFullWidth": "半角 → 全角",
  "showcase.share": "リンクを共有",
  "showcase.shareCopied": "リンクをクリップボードにコピーしました",
  "showcase.shareFailed": "コピーできませんでした。アドレスバーの URL を手動でコピーしてください",
  "showcase.refreshFonts": "フォントを再読み込み",
  "showcase.upload": "フォントをアップロード",
  "showcase.uploadAdded": "{name} を追加しました",
  "showcase.uploadBadFormat":
    "フォントファイルではないようです（.ttf / .otf / .woff / .woff2 に対応）",
  "showcase.uploadTooLarge": "ファイルが大きすぎます（最大 100 MB）",
  "showcase.uploadReadFailed": "ファイルを読み込めませんでした",
  "showcase.emptyHint": "フォントを選んで比較を始めましょう。",
  "showcase.allFonts": "すべてのフォント",
  "specimen.reportError":
    "読みの誤りを見つけたら、[GitHub でご報告ください](https://github.com/chunlaw/wing-font-generator/issues/new?title=Annotation%20error%20in%20{name})。",
  "showcase.userFonts.zh": "自家字體",
  "showcase.userFonts.en": "Your fonts",
  "picker.dialect": "文字 / カテゴリ",
  "picker.font": "フォント",
  "picker.noOptions": "該当なし",
  "picker.addAriaLabel": "比較にフォントを追加",
  "specimen.editorAriaLabel": "このフォントでテキストを入力または貼り付け",
  "specimen.about.title": "このフォントについて",
  "specimen.about.summary": "{name} は、すべての文字に読みが表示される無料の{dialect}フォントです。普通に入力したテキストに、ルビのマークアップなしで発音が表示されます。文字は {base}、読みは {annotation} で組まれています。",
  "specimen.about.language": "言語",
  "specimen.about.scheme": "表記法",
  "specimen.about.base": "文字",
  "specimen.about.annotation": "注音フォント",
  "specimen.about.mapping": "読みの表",
  "specimen.about.license": "ライセンス",
  "specimen.about.siblings": "同じ表記法の他のスタイル",
  "step1.recentFonts.title": "最近のフォント",
  "step1.recentFonts.pin": "ピン留め",
  "step1.recentFonts.unpin": "ピン留めを解除",
  "step1.recentFonts.pinCap": "先にどれかのピン留めを解除してください（最大 4 件）",
  "step1.recentFonts.remove": "削除",
  "step1.recentFonts.clearAll": "すべて消去",
  "step1.recentFonts.clearConfirm":
    "ピン留めしていない最近のフォントをすべて消去しますか？ピン留めしたものは残ります。",
  "step1.recentFonts.redownloadTtf": ".ttf をダウンロード",
  "step1.recentFonts.redownloadWoff": ".woff をダウンロード",
  "step1.recentFonts.justNow": "たった今",
  "step1.recentFonts.minutesAgo": "{n} 分前",
  "step1.recentFonts.hoursAgo": "{n} 時間前",
  "step1.recentFonts.daysAgo": "{n} 日前",
  "step1.recentFonts.viewSpecimen": "見本を表示",
  "step4.family.collisionHint":
    "このファミリー名のフォントはすでに生成済みです。両方を OS や Word にインストールする予定なら、フォントテーブルの衝突を避けるため別の名前をおすすめします。",
  "step4.family.tooLong":
    "{n} / {max} 文字 — 長すぎます。Windows のフォントレジストリは {max} 文字を超えるファミリー名を黙って切り詰めるため、Word が HKSCS の広東語の字（啲、嘅、嗰、咗、噉、嚟、唔、攞）をこのフォントではなく Microsoft JhengHei UI で表示してしまいます。{max} 文字以内に短くしてください。",
  "displayOptions.toggle": "表示オプション",
  "displayOptions.fontSize": "文字サイズ",
  "displayOptions.letterSpacing": "字間",
  "displayOptions.reset": "既定に戻す",
  // About
  "about.hero.title": "Wing Font について",
  "about.hero.tagline":
    "このツールが生まれた理由、使っている人、参加する方法。",
  "about.origin.title": "はじまり",
  "about.origin.body":
    "漢字には粵拼（香港語言学会式）でも、反切でも、ひらがなでも読みを付けられます。そう考えれば、圍頭話、潮州語、台湾語、福建語、上海語 — どの言葉も同じように扱われるべきです。Wing Font はそれらを、ブラウザがそのまま読み込める WOFF フォントとして提供します。一般の読者は何もインストールする必要がありません。このフォントを使った開発者のページを開けば、読みがそこに表示されているだけです。歌詞を見ながら歌う、漢詩を声に出して読む、香港に戻ってきた子どもに倉頡入力を教える — どれも少しだけ楽になります。",
  "about.opensource.title": "なぜ無料でオープンソースなのか",
  "about.opensource.body":
    "たとえ人々のあらゆる言葉を話せたとしても、時間には限りがあります。でも、みんなで力を合わせれば、言葉と文字を前に進めることができます。オープンソースにすれば、デザイナーが自分の書体で読み付きの派生版を作ることもできます。多くのフォントは制限のあるライセンスのため、私たちが派生版を再配布することはできませんが、自分のフォントとソースコードを持つデザイナーなら、自分で作って公開できます。そのために、同じ生成処理を [Python のコマンドラインツール](https://github.com/chunlaw/wing-font-generator/tree/main/python#readme) としても提供しています。一括処理や自分のワークフローへの組み込み、完全オフラインでの実行に便利です。",
  "about.dialects.title": "広東語のその先へ",
  "about.dialects.body":
    "Wing Font は広東語から始まりました。今では台湾語、潮州語、中国語普通話に加え、日本語のふりがな、タイ語、アラビア語、ヒンディー語、イヌクティトゥット語にも対応し、それぞれ複数の表記法から選べます（例えば台湾語には台羅、白話字、いくつかの地域アクセントがあります）。フォント一覧ですべて見られるほか、「フォントを作る」ページで表記法を選んで自作もできます。新しい言語はいつでも歓迎です。",
  "about.contribute.title": "参加する",
  "about.contribute.intro":
    "Wing Font に完成はありません。以下は、新しい協力者がいちばん助けになる分野です。",
  "about.contribute.code.title": "コード",
  "about.contribute.code.body":
    "プルリクエスト歓迎です。コードを書く方なら、GitHub のリンクはすぐ見つかるはずです。",
  "about.contribute.design.title": "デザイン",
  "about.contribute.design.body":
    "現在の読みの配置が最適とは限りません。Telegram グループで、どの書体や比率がよいか一緒に話し合いましょう。",
  "about.contribute.data.title": "読みのデータ",
  "about.contribute.data.body":
    "ローマ字のデータは、このプロジェクトでいちばん誤りが起きやすい部分です。形式のまちまちな上流プロジェクトから集め、AI 支援ツールで処理しているため、読みの誤り、方言の異読の欠落、複数文字の区切りの誤りなどがありえます。知っている言葉で誤りを見つけたら、[GitHub で issue を作成](https://github.com/chunlaw/wing-font-generator/issues)するか、[Telegram グループ](https://t.me/wingfont)に参加するのがいちばん簡単です。",
  "about.support.title": "応援したい方へ",
  "about.support.body":
    "ありがとうございます。香港のバスアプリも作っています。香港にお住まいの方や旅行の際は [hkbus.app](https://hkbus.app) をお試しください。[GitHub Sponsors](https://github.com/sponsors/chunlaw) でのご支援も心から感謝します。",
  "about.cta.generate": "自分のフォントを作る",
  "about.cta.showcase": "既成フォントを見る",
  "about.cta.telegram": "Telegram グループに参加",
  "about.cta.github": "GitHub で見る",
  // Generate
  "generate.title": "自分だけの注音フォントを作る",
  "generate.runtime.ready":
    "フォントエンジンの準備ができました。初回の生成には通常 30〜120 秒かかります。",
  "generate.runtime.loading": "フォントエンジンを読み込み中：",
  "generate.button.generate": "生成",
  "generate.button.generating": "生成中…",
  "generate.button.next": "次へ",
  "generate.button.back": "戻る",
  "generate.button.regenerate": "再生成",
  "generate.error.prefix": "エラー：",
  "generate.step1.label": "フォント",
  "generate.step2.label": "読みの表",
  "generate.step3.label": "カスタム注音",
  "generate.step4.label": "パラメータ",
  "generate.step5.label": "生成",
  "generate.step6.label": "プレビューとダウンロード",
  "step3.title": "ステップ 3：カスタム注音（任意）",
  "step3.description": "手動注音の一覧（--diy-annotations）を追加すると、フォントの利用者が自分で任意の文字の読みを指定できます：文字の後に全角の ０ を入力して読みを消し、続けて全角でローマ字を入力します（例：行０ｚａａ１ で 行 の上に zaa1 と表示）。現在は中国語（漢字）のベースフォントのみ対応。不要ならこのステップは飛ばしてください。",
  "step3.preset": "内蔵の一覧",
  "step3.none": "なし",
  "step3.custom": "カスタムファイル",
  "step3.upload": "CSV を読み込む",
  "step3.clear": "削除",
  "step3.loaded": "{name} を読み込みました：{count} 件の注音",
  "step3.example": "例：{input} と入力 → {anno} と表示",
  "step3.needsOptimize": "カスタム注音を使うには最適化（-opt）をオンにする必要があります。オフのままだとフォントが 65,535 グリフの上限を超える可能性があります。パラメータでオンにしてください。",
  "step3.format": "CSV の形式：1 行に「入力,注音」を 1 つ（例：ｚａａ１,zaa1）。入力は全角の英数字である必要があります。1 列だけの場合は自動で全角に変換します。適用されるのは本番の生成のみで、ライブプレビューにはカスタム注音は含まれません。",
  // Step 1
  "step1.title": "ステップ 1：フォントを選ぶ",
  "step1.description":
    "TTF を 2 つアップロードします。1 つはベースの漢字用、もう 1 つは小さなローマ字用です。内蔵の既定フォントも使えます。",
  "step1.base.label": "ベースフォント（漢字）",
  "step1.base.hint": "通常は明朝（宋体）か楷書体",
  "step1.anno.label": "注音フォント",
  "step1.anno.hint": "ラテン文字のローマ字なら Noto Serif、倉頡などには CJK フォント",
  "step1.upload": "TTF をアップロード",
  "step1.useDefault": "既定を使う",
  "step1.presetLabel": "内蔵フォント",
  "step1.variableAxes": "可変フォントの軸",
  "step1.preview.title": "グリフのプレビュー",
  "step1.preview.hint": "フォントを読み込むと、ここにサンプルのグリフが表示されます。",
  "step1.preview.notLoaded": "（フォント未読み込み）",
  "step1.parseError": "フォントを解析できませんでした：",
  // Step 2
  "step2.title": "ステップ 2：文字と読みの対応表",
  "step2.description":
    "文字 → ローマ字の対応を記した CSV を読み込むか、ここで直接検索・追加・編集・削除できます。",
  "step2.import.button": "CSV を読み込む",
  "step2.import.useDefault": "既定を使う（canto-lshk）",
  "step2.import.preset": "内蔵の読みの表",
  "step2.import.presetCustom": "カスタム",
  "step2.import.presetCategory": "カテゴリ",
  "step2.import.presetChoose": "表記法を選択…",
  "step2.export.button": "CSV を書き出す",
  "step2.clear.button": "すべて消去",
  "step2.count": "{count} 件",
  "step2.search.placeholder": "文字やローマ字で検索…",
  "step2.add.button": "行を追加",
  "step2.add.chars": "文字（例：行 または 銀行）",
  "step2.add.annos": "ローマ字（例：hong4 または ngan4 hong4）",
  "step2.add.weight": "重み",
  "step2.add.weightHint":
    "空欄なら 1。値が大きいほどこの読みが優先され、既定の読み、異読の切り詰め、語の規則の順序に影響します。",
  "step2.add.commit": "追加",
  "step2.col.chars": "文字",
  "step2.col.annos": "ローマ字",
  "step2.col.weight": "重み",
  "step2.col.actions": "",
  "step2.empty":
    "読みの表がまだ読み込まれていません。上のボタンで CSV を読み込むか、行を追加してください。",
  "step2.coverage.baseOk": "ベースフォント ✓ {total} 文字すべて収録",
  "step2.coverage.baseMissing":
    "ベースフォント ⚠ 対応表の {total} 文字のうち {missing} 文字が未収録",
  "step2.coverage.annoOk":
    "注音フォント ✓ {total} 文字すべて収録",
  "step2.coverage.annoMissing":
    "注音フォント ⚠ 対応表の {total} 文字のうち {missing} 文字が未収録",
  "step2.coverage.show": "未収録を表示",
  "step2.coverage.hide": "隠す",
  "step2.coverage.baseLabel": "ベースフォントに未収録：",
  "step2.coverage.annoLabel": "注音フォントに未収録：",
  "step2.coverage.andMore": "ほか {n} 文字",
  "step2.confirmDelete": "この行を削除しますか？",
  // Step 4
  "step4.title": "ステップ 4：パラメータ",
  "step4.description":
    "グリフのサイズ、縦の位置、出力オプションを調整します。",
  "step4.family": "ファミリー名",
  "step4.familyHint": "フォントの name テーブルに書き込まれます",
  "step4.advancedSectionLabel": "詳細設定",
  "step4.triggerChar.label": "異読トリガー文字",
  "step4.triggerChar.hint":
    "`<文字><トリガー><漢数字>` と入力して読みを手動で選びます：`行丅零` = 読みなし、`行丅一` = 1 番目の読み（既定）、`行丅二` = 2 番目の読み、…、`行丅九` = 9 番目の読み。既定のトリガー `丅`（U+4E05）は普通の文章と衝突しないよう、あえて珍しい字にしています。IME で入力しやすい字（例：`々`、`〇`）に変えても構いません。フォントには 1 から数える半角数字（`字0`、`字1`、`字2`）と **全角数字（`字０`、`字１`、`字２`）** のトリガーも自動で含まれます。**Microsoft Word の注意**：DirectWrite は半角数字を別のシェーピング単位に分けるため、Word では `字1`、`字2` が効きません。Word で確実に使えるのは全角の `字１`、`字２` か、IME で入力しやすい `字丅一`、`字丅二` です。",
  "step4.triggerChar.hintDisabled":
    "トリガー＋漢数字による上書きは無効です。1 から数える半角数字（`字0` = 読みなし、`字1` = 1 番目の読み、`字N` = N 番目の読み）や全角数字（`字０`、`字１`、`字N`）で異読を選べます。Microsoft Word で効くのは全角数字のほうです。",
  "step4.outAscent.label": "出力のアセント（フォント単位）",
  "step4.outAscent.hint":
    "空欄 = 自動：いちばん高い合成グリフを測り、hhea.ascent と OS/2.usWinAscent をそれを収める分だけ引き上げるので、Word / Pages / Canva で読みの上端が切れません。値を推測する必要はありません。sTypoAscender は変更しないため、行間は変わりません。正確なアセントを固定したい場合（例：あえて行間を広くしたい）だけ数値を入力してください（自動調整は無効になります）。",
  "step4.cli.sectionLabel": "同等の CLI コマンド",
  "step4.cli.helperText":
    "wing-font-generator のチェックアウトの `python/` でこれを実行すると、同じビルドをローカルで再現できます。ファイルパスはリポジトリの構成（input_fonts/、mappings/）に基づいています。アップロードしたカスタムフォントは実際のローカルパスに置き換えてください。",
  "step4.cli.copyTooltip": "コマンドをコピー",
  "step4.cli.copiedTooltip": "コピーしました！",
  "step4.cli.copyAriaLabel": "CLI コマンドをコピー",
  "step4.baseScale": "ベースグリフの倍率",
  "step4.annoScale": "読みの倍率",
  "step4.annoSpacing": "読みの字間（em — 正で広く、負で狭く）",
  "step4.yOffset": "読みの縦オフセット（em 比）",
  "step4.invert": "反転：読みを下、文字を上に",
  "step4.optimize": "サブセット化（使わないグリフを削除）",
  "step4.preview.title": "ライブプレビュー",
  "step4.preview.description":
    "パラメータを変えるたびに自動で再描画します。手動で実行する必要はありません。1 回あたり、フォントの大きさや対応表の長さに応じて約 10〜20 秒かかります。",
  "step4.preview.updating": "更新中…",
  "step4.preview.firstRun": "最初のサンプルを描画中…",
  "step4.preview.idle": "描画待ち…",
  "step4.preview.sampledLabel": "サンプルの対応",
  "step4.preview.customLabel": "プレビューテキスト",
  "step4.preview.notReady":
    "先にフォントを選び、対応を 1 件以上追加してください。",
  "step4.preview.showGuides": "組版ガイドを表示（ベースライン、アセントなど）",
  "step4.previewText.label": "プレビューテキスト",
  "step4.previewText.placeholder": "空欄なら自動で選択",
  "step4.previewText.helper":
    "プレビューしたいテキストを入力してください。それをカバーする対応が使われます。",
  // Step 5
  "step5.title": "ステップ 5：フォントを生成",
  "step5.description": "「生成」を押すと開始します。下の進捗欄に、処理の各ステップがリアルタイムで表示されます。",
  "step5.empty": "未開始です。下のボタンをクリックして生成してください。",
  "step5.run.idle": "生成",
  "step5.run.running": "生成中",
  "step5.copy": "ログをコピー",
  "step5.copied": "コピーしました",
  // Step 6
  "step6.title": "ステップ 6：プレビューとダウンロード",
  "step6.description":
    "生成したフォントは `@font-face` として読み込まれているので、下に入力して試せます。",
  "step6.noResult": "まだ結果がありません。先にステップ 5 を完了してください。",
  "step6.sampleText":
    "こんにちは — 銀行、行家、行0（読みなし）、行1（1 番目の読み、行 だけと同じ）、行2（2 番目の読み）、行１ 行２（全角、Word でも有効）、行丅一、畫畫 などを入力してみてください",
  "step6.download.ttf": "TTF をダウンロード",
  "step6.download.woff": "WOFF をダウンロード",
  "step6.cssSnippet.title": "スタイルシートで使う",
  "step6.cssSnippet.button": "ウェブサイトに埋め込む",
  "step6.cssSnippet.copy": "スニペットをコピー",
  "step6.cssSnippet.copied": "コピーしました",
  "step6.cssSnippet.hint":
    "ダウンロードした `.woff` と `.ttf` をスタイルシートと **同じフォルダ** に置くか、置き場所に合わせて `url()` のパスを書き換えてください。",
  "step6.cssSnippet.close": "閉じる",
  "step6.cssSnippet.designAppTitle": "デザインアプリで使う",
  "step6.cssSnippet.designAppHint":
    "読みの上書きはすべて OpenType の `ccmp` で動きます。`ccmp` は必須機能で、文字組みの設定を切り替えなくても適用されます。**Canva、InDesign、Pages、Keynote、Adobe 製品** や最近のブラウザでは、すべての方法が使えます：**語の文脈**（`銀行/行人`）、**1 から数える半角数字**（`字0` = 読みなし、`字1` = 1 番目の読み、`字N` = N 番目）、**全角数字**（`字０`、`字１`、`字N`）、**トリガー＋漢数字**（`字丅零`、`字丅一`、…）。\n\n**Microsoft Word の注意**：DirectWrite は半角数字（`字1`、`字2`）を隣の CJK 文字と別のシェーピング単位に分けるため、この方法だけは Word で効きません。代わりに全角数字（`字１`、`字２`）か、IME で入力しやすい `字丅一`、`字丅二` を使ってください。どちらも Word で動作します。語の文脈による自動切り替え（`銀行 / 行人`）は影響を受けず、普通に動作します。",
};
