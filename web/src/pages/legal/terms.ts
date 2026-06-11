/**
 * Terms & Conditions content — bilingual, markdown-formatted strings
 * rendered by web/src/pages/Terms.tsx through the shared <Markdown />
 * component.
 *
 * Why a separate module instead of i18n keys:
 *   - The body is long-form prose (~40-60 lines per language). Stuffing
 *     it into translations.ts would dwarf every UI label in the file
 *     and make legal-copy edits look like commit-noise.
 *   - These strings rarely change but when they do, the diff should be
 *     reviewable in isolation. A dedicated file makes that easy.
 *   - Markdown lets translators bold key terms, link to OFL / MIT /
 *     external sources, and structure with headings — the same
 *     conventions the rest of the site already uses.
 *
 * The EFFECTIVE_DATE is hardcoded; update it whenever a material
 * change ships. Don't auto-fill from `new Date()` — the date is meant
 * to identify the version of the document, not the day the user
 * visited.
 */

export const TERMS_EFFECTIVE_DATE = "2026-06-11";

export const TERMS_ZH = `## 1. 接受條款

歡迎使用 Wing Font（以下簡稱「本服務」）。當你使用 [wing-font.chunlaw.io](https://wing-font.chunlaw.io) 或其相關子網域（包括 \`wing-font-hub.chunlaw.io\`）時，即表示你同意以下條款。如果你不同意，請勿繼續使用本服務。

## 2. 本服務性質

本服務係一個**免費、開源**嘅工具，將拼音、注音、或者其他語言注釋直接合成到中文字型嘅字形之中。本服務嘅所有運算**完全喺你嘅瀏覽器內進行**，並無將你嘅字型、對應表或者文字內容上載到任何伺服器。

本服務嘅原始碼採用 [MIT License](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSE) 發佈，可於 [GitHub](https://github.com/chunlaw/wing-font-generator) 自由查閱、修改、發佈。

## 3. 生成字型嘅授權

當你使用本服務生成一個字型時，生成字型嘅授權**取決於你所使用嘅輸入素材**：

- **內建字型**——本服務預先載入嘅字型，絕大多數採用 [SIL Open Font License 1.1](https://openfontlicense.org/) 發佈。詳細請參閱 [Acknowledgements](/credits) 同 [\`LICENSES.md\`](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSES.md)。
- **內建對應表**——拼音、注音等資料嚟自各個上游開源項目，授權方式各有不同；資料來源詳見 [Acknowledgements](/credits) 頁面。
- **使用者上載嘅字型或對應表**——你需要**自行確認你擁有相關授權**或合法使用權；本服務並無能力亦無義務代你核實。

如果生成字型用咗 OFL 字型作底字或標注字，根據 OFL 條款，**該生成字型亦必須以 OFL 形式分發**，並須保留原作者名稱及版權聲明。

## 4. 使用限制

你**不得**將本服務用於：

- 違反任何適用法律、法規或第三方權利嘅用途；
- 製作或散佈具有歧視性、仇恨性、騷擾性或非法內容嘅字型；
- 規避或破壞本服務或其任何元件嘅安全機制；
- 對本服務或其底層服務（包括但不限於 GitHub Pages、Cloudflare、Pyodide CDN）發動大量請求或拒絕服務攻擊。

## 5. 無擔保

本服務按「**現狀**」及「**可用性**」提供，**不附帶任何明示或默示之擔保**，包括但不限於：

- 拼音、注音或其他注釋之**準確性**；
- 生成字型可以喺所有應用程式、平台、瀏覽器中正確顯示；
- 本服務不會中斷、無錯誤、或滿足你嘅特定需求。

中文拼音、語言學會 Jyutping、台羅、潮州拼音等對應資料嚟自社群來源，未必能反映所有方言變體、地區發音或最新研究成果。請以此為起點，按需要自行核實。

## 6. 責任限制

於法律允許嘅最大範圍內，本服務嘅作者、貢獻者及版權持有人對因使用或無法使用本服務而引致嘅**任何直接、間接、附帶或衍生性損害**概不負責，亦不對因第三方字型授權糾紛而引起嘅責任承擔賠償。

## 7. 條款變更

我們可能會不時更新本條款。重大變更會更新「生效日期」並於本頁面公佈。繼續使用本服務即表示你接受變更後嘅條款。

## 8. 聯絡

如對本條款有任何疑問，可透過 [GitHub Issues](https://github.com/chunlaw/wing-font-generator/issues) 或 [Telegram 群組](https://t.me/wingfont) 聯絡我們。
`;

export const TERMS_EN = `## 1. Acceptance of Terms

Welcome to Wing Font ("the Service"). By using [wing-font.chunlaw.io](https://wing-font.chunlaw.io) or related subdomains (including \`wing-font-hub.chunlaw.io\`) you agree to the terms below. If you do not agree, please discontinue use of the Service.

## 2. Nature of the Service

The Service is a **free, open-source** tool that bakes pronunciation annotations (Pinyin, Jyutping, Bopomofo, and others) directly into the glyphs of Chinese fonts. All processing happens **entirely in your browser** — the Service does not upload your fonts, mapping data, or text content to any server.

The Service's source code is released under the [MIT License](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSE) and freely available on [GitHub](https://github.com/chunlaw/wing-font-generator).

## 3. Licensing of generated fonts

The license applicable to a font you generate **depends on the inputs you use**:

- **Built-in fonts** — the fonts the Service ships with are almost all distributed under the [SIL Open Font License 1.1](https://openfontlicense.org/). See [Acknowledgements](/credits) and [\`LICENSES.md\`](https://github.com/chunlaw/wing-font-generator/blob/main/LICENSES.md) for per-font terms.
- **Built-in mapping data** — Pinyin, Jyutping, and other romanization tables come from upstream open-source projects with varying licenses. See [Acknowledgements](/credits) for sources.
- **User-uploaded fonts or mapping data** — **You are responsible** for ensuring you have the right to use any material you upload. The Service cannot and does not verify this for you.

When a generated font is built from OFL-licensed base or annotation fonts, the OFL terms **require the generated font to be distributed under OFL** as well, with the original copyright notices preserved.

## 4. Acceptable use

You may **not** use the Service to:

- engage in any activity that violates applicable law, regulation, or third-party rights;
- produce or distribute fonts containing discriminatory, hateful, harassing, or otherwise unlawful content;
- circumvent or attempt to compromise the Service's security or any of its components;
- subject the Service or its underlying infrastructure (including but not limited to GitHub Pages, Cloudflare, Pyodide CDN) to denial-of-service or abusive traffic.

## 5. No warranty

The Service is provided **"as is"** and **"as available"**, **without any warranty** of any kind, express or implied. In particular we make no warranty as to:

- the **accuracy** of Pinyin, Jyutping, or other romanization data;
- the generated font rendering correctly in every application, platform, or browser;
- the Service being uninterrupted, error-free, or fit for your particular purpose.

Romanization data — Hanyu Pinyin, LSHK Jyutping, Tâi-lô, Teochew Peng'im, and others — comes from community sources and may not reflect every dialect variant, regional pronunciation, or current scholarship. Treat it as a starting point and verify as needed.

## 6. Limitation of liability

To the maximum extent permitted by law, the Service's authors, contributors, and copyright holders shall not be liable for any **direct, indirect, incidental, or consequential damages** arising from your use of, or inability to use, the Service — including any liability arising from third-party font-licensing disputes.

## 7. Changes to these Terms

These Terms may be updated from time to time. Material changes will be announced on this page along with an updated "effective date". Continued use of the Service constitutes acceptance of the revised Terms.

## 8. Contact

Questions about these Terms can be raised on [GitHub Issues](https://github.com/chunlaw/wing-font-generator/issues) or in the [Telegram group](https://t.me/wingfont).
`;
