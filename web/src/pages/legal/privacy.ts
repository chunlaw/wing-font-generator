/**
 * Privacy Policy content — bilingual, markdown-formatted strings
 * rendered by web/src/pages/Privacy.tsx through the shared <Markdown />
 * component.
 *
 * The policy is honest to what the site actually does: nothing leaves
 * the user's browser during font generation. The interesting nuances
 * that DO warrant disclosure are the existence of localStorage, the
 * Service Worker, the CDN-fetched Pyodide runtime, and the GitHub
 * Pages access logs that come with the hosting model.
 *
 * Keep the language plain. The audience is teachers, designers, and
 * linguists — not lawyers. Cover what actually matters and don't pad
 * with clauses that don't apply.
 */

export const PRIVACY_EFFECTIVE_DATE = "2026-06-11";

export const PRIVACY_ZH = `## 1. 概覽

Wing Font 嘅核心承諾係：**你嘅資料喺你嘅電腦/手機**。我哋無賬戶系統、無登入、無使用者層級嘅追蹤或分析。本頁面說明我哋實際上收集（同唔收集）咩資料，以及點解。

## 2. 我哋唔收集嘅資料

- **你上載嘅字型、對應表或文字**——所有字型生成運算完全於你嘅瀏覽器內進行（透過 [Pyodide](https://pyodide.org) WebAssembly）。**呢啲資料從來唔會離開你嘅裝置**。
- **個人資料**——本服務無賬戶、無登入、無註冊系統，亦無收集姓名、電郵、IP 地址或其他可識別身份嘅資料。
- **行為分析**——本服務**不使用 Google Analytics、Meta Pixel、Hotjar 或任何第三方分析工具**。我哋唔知你睇咗咩、揀咗咩、停留幾耐。

## 3. 我哋使用嘅瀏覽器儲存

為咗令操作更順暢，本服務會將少量資料**儲存喺你嘅瀏覽器本地**（\`localStorage\` 同 \`Cache Storage\`），永遠唔會傳送返我哋：

- **介面偏好**：你揀嘅主題（淺色/深色）、語言（中／英）、目前嘅 Stepper 進度、選擇咗嘅字型等。
- **最近生成嘅字型快取**：最多 5 個你最近喺生成器（\`/generate\`）造好嘅字型會儲存喺瀏覽器嘅 IndexedDB，方便你之後即時重新下載或者喺 \`/showcase\` 同 \`/specimen\` 預覽。當中最多 4 個可以「釘住」避免覆蓋。所有檔案完全留喺你嘅瀏覽器，唔會上載到任何伺服器。
- **離線快取**：透過 Service Worker（PWA）快取網站資源同已下載嘅預生成字型，等下次訪問可以快啲開啟，甚至離線使用。

你隨時可以喺瀏覽器嘅「清除站點資料」或私隱設定中清除以上儲存。

## 4. 第三方服務

雖然我哋唔做追蹤，但本服務由其他平台提供基礎設施。佢哋會按各自嘅私隱政策處理請求：

- **[GitHub Pages](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)**——託管 \`wing-font.chunlaw.io\` 及 \`wing-font-hub.chunlaw.io\`。每次訪問會有伺服器存取記錄（IP、User-Agent、時間戳）。
- **[Cloudflare](https://www.cloudflare.com/privacypolicy/)**——部分子網域用作 DNS / CDN。Cloudflare 會記錄請求以提供安全性服務。
- **[jsDelivr](https://www.jsdelivr.com/terms)** / **[cdnjs](https://cdnjs.com/)**——當你訪問 \`/generate\` 頁面時，Pyodide 運行時及 Python 套件會由呢啲 CDN 載入。

如果想完全避免上述第三方記錄你嘅請求，可以使用 VPN，或者選擇本服務嘅[命令列版本](https://github.com/chunlaw/wing-font-generator/tree/main/python#readme)離線執行。

## 5. Cookies

本服務**唔使用任何追蹤性嘅 cookies**。我哋亦無使用 Session Cookie——所有狀態儲存於 \`localStorage\`（見第 3 條）。

## 6. 兒童私隱

本服務並非針對 13 歲以下兒童而設。由於我哋無收集任何個人資料，亦無法亦無意特別針對兒童收集資料。

## 7. 政策變更

如果本政策有重大變更，會更新本頁面嘅「生效日期」並於 [Telegram 群組](https://t.me/wingfont) 或 GitHub 公佈。

## 8. 聯絡

關於私隱嘅問題，可透過 [GitHub Issues](https://github.com/chunlaw/wing-font-generator/issues) 或 [Telegram 群組](https://t.me/wingfont) 聯絡我們。
`;

export const PRIVACY_EN = `## 1. Overview

Wing Font's core promise is simple: **your data stays on your device**. There are no accounts, no logins, and no user-level tracking or analytics. This page explains what we do — and don't — collect, and why.

## 2. What we do NOT collect

- **Uploaded fonts, mapping data, and preview text** — all font-generation work happens entirely in your browser via [Pyodide](https://pyodide.org) (Python compiled to WebAssembly). **None of this material ever leaves your device.**
- **Personal information** — the Service has no accounts, no logins, no registration. We do not collect names, email addresses, IP addresses, or any other identifying information.
- **Behavioural analytics** — we do **not** use Google Analytics, Meta Pixel, Hotjar, or any third-party analytics tool. We don't know which pages you looked at, which fonts you picked, or how long you stayed.

## 3. Browser storage we do use

To make the Service feel responsive, the following items are stored **locally in your browser** (\`localStorage\` and \`Cache Storage\`) and are never transmitted back to us:

- **UI preferences** — your theme (light / dark), language (English / Chinese), in-progress stepper state, picked fonts, and similar.
- **Recently generated fonts cache** — up to 5 of the fonts you most recently produced via the generator (\`/generate\`) are kept in your browser's IndexedDB so you can re-download them, or preview them in \`/showcase\` and \`/specimen\`, without rerunning the pipeline. Up to 4 can be "pinned" to protect them from being overwritten by the next generation. All bytes remain in your browser and are never transmitted.
- **Offline cache** — a Service Worker (PWA) caches site assets and any pre-built fonts you've downloaded, so repeat visits are fast and the site works offline.

You can clear any of this at any time through your browser's "Clear site data" or privacy settings.

## 4. Third-party infrastructure

While we don't track you, the Service is hosted on third-party platforms whose own logs may contain request metadata. Each is governed by its own privacy policy:

- **[GitHub Pages](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)** — hosts \`wing-font.chunlaw.io\` and \`wing-font-hub.chunlaw.io\`. Every page view results in a server access log entry (IP, User-Agent, timestamp).
- **[Cloudflare](https://www.cloudflare.com/privacypolicy/)** — used for DNS and CDN. Cloudflare logs requests for the security services it provides.
- **[jsDelivr](https://www.jsdelivr.com/terms)** / **[cdnjs](https://cdnjs.com/)** — when you visit the \`/generate\` page, the Pyodide runtime and Python packages are fetched from these CDNs.

If you wish to avoid being logged by any of these, you can use a VPN, or run the [command-line version](https://github.com/chunlaw/wing-font-generator/tree/main/python#readme) of the Service offline.

## 5. Cookies

The Service does **not use tracking cookies**. We also don't use session cookies — all state lives in \`localStorage\` (see section 3).

## 6. Children's privacy

The Service is not directed at children under 13. Because we collect no personal information at all, we have no way to and no intention of collecting it from children.

## 7. Changes to this policy

If this policy changes materially, the "effective date" at the top of the page will be updated and a note posted to the [Telegram group](https://t.me/wingfont) or on GitHub.

## 8. Contact

Privacy questions can be raised on [GitHub Issues](https://github.com/chunlaw/wing-font-generator/issues) or in the [Telegram group](https://t.me/wingfont).
`;
