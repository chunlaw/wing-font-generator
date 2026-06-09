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

/** Parameters that go straight into the runner. */
export interface GenerateParams {
  baseScale: number;
  annoScale: number;
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
