/**
 * Shared types for the stepped Generate flow.
 */

/** One row in the editable mappings list (Step 2). */
export interface MappingRow {
  /** Stable React key. */
  id: string;
  /** The base characters — single char like `行` or a word like `銀行`. */
  chars: string;
  /** Space-separated romanizations matching the chars length. */
  annos: string;
  /** Optional weight column from the CSV. Defaults to 1 when serialised. */
  weight?: number;
}

/**
 * One axis declared by a font's `fvar` table. We extract this on the
 * JS side (via opentype.js) when the user picks / uploads a variable
 * font, then surface a slider per axis in Step 1 so the user can
 * choose an instance of the variation space.
 */
export interface FontAxis {
  /** 4-character OpenType tag, e.g. "wght", "wdth", "ital", "opsz". */
  tag: string;
  /** Human-readable axis name as declared in the font (e.g. "Weight").
   *  Falls back to the tag when the font doesn't include a name. */
  name: string;
  min: number;
  default: number;
  max: number;
}

/** Map of axis tag → chosen value, e.g. { wght: 700, ital: 1 }. */
export type AxisLocation = Record<string, number>;

/** Parameters that go straight into the runner. */
export interface GenerateParams {
  baseScale: number;
  annoScale: number;
  /**
   * Extra inter-glyph gap inside an annotation string, in em
   * units. 0 = natural advance (each glyph sits at its native
   * advance position). Positive opens up — useful for CJK
   * radical annotations (e.g. cangjie's 一弓十山) where the
   * default packing looks like a single visual blob. Negative
   * tightens; push too far and glyphs visibly overlap.
   */
  annoSpacing: number;
  yOffsetRatio: number;
  invert: boolean;
  optimize: boolean;
  familyName: string;
}

/** Successful generation result; null until the user clicks Generate. */
export interface GenerateResult {
  ttfBlob: Blob;
  woffBlob: Blob;
  /** The unique CSS family-name we registered the WOFF under so the
   *  preview textbox can reference it. */
  installedFamily: string;
}

/**
 * Result of a parameter-tuning preview run.
 *
 * The Preview pane in Step 3 lets the user try the current parameters
 * against a representative sample of mappings before committing to a
 * full generation that could take a minute or more. The Python
 * pipeline is run with a CSV containing only the mappings whose
 * `chars` are needed to render `sampleText`, so the run collapses to
 * a few hundred ms.
 *
 * `installedFamily` is intentionally a separate family-name from
 * `GenerateResult.installedFamily` so a preview and a full result can
 * coexist on the page without trampling each other's @font-face
 * registration.
 */
export interface PreviewResult {
  woffBlob: Blob;
  installedFamily: string;
  /** What text the preview actually renders — either user-supplied
   *  (when the "Preview text" field is filled in) or auto-picked
   *  from the longest sample-eligible mapping row. */
  sampleText: string;
  /** The mapping rows that fed the preview CSV. Usually one (the
   *  auto-picked row), but can be several when the user typed
   *  custom preview text that spans multiple mappings. */
  sampleRows: MappingRow[];
  /** True when `sampleText` came from the user-controlled "Preview
   *  text" field; false when it was auto-picked. The UI uses this
   *  to choose the right caption ("Sampled mapping" vs "Preview
   *  text"). */
  isCustomText: boolean;
}
