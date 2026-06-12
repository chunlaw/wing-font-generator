/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the WOFF2 preview/@font-face CDN. Same-origin
   * with the Pages site so FontFace registration avoids CORS. */
  readonly VITE_FONT_URL: string;
  /** Base URL for TTF downloads. Off-Pages — points at the rolling
   * GitHub Releases `latest/download/` redirect so the published
   * site doesn't carry the heavier TTF bytes. */
  readonly VITE_TTF_URL: string;
}
