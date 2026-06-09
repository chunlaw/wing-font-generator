/**
 * ttfToWoff — wrap an in-memory TTF/OTF as a WOFF1 file.
 *
 * WOFF1 (https://www.w3.org/TR/WOFF/) is a simple SFNT-with-each-table-
 * zlib-compressed format. Browsers ship a native `CompressionStream`
 * implementation, so doing this in JS is ~20-50x faster than letting
 * Pyodide run zlib through wasm for every table. That's the reason
 * runner.py sets skip_woff=True and returns ttf only — we generate
 * WOFF here, on the worker, immediately after the TTF arrives.
 *
 * Implementation notes:
 *
 * - Each WOFF1 table is stored as zlib-deflate output, unless the
 *   compressed size is >= the original size, in which case the
 *   original is stored uncompressed. This matches fontTools' behaviour
 *   and is required by the spec for byte-by-byte interoperability.
 * - Table data is aligned to a 4-byte boundary inside the WOFF file.
 *   Padding bytes are not counted toward compLength/origLength but
 *   are part of the table-data section in the file.
 * - The table directory in WOFF1 is sorted by 4-byte tag, matching the
 *   SFNT input. We preserve the SFNT directory order.
 */

/**
 * Compress `bytes` with zlib (deflate + zlib header), returning the
 * compressed Uint8Array. Uses the browser's CompressionStream so we
 * don't ship a deflate implementation ourselves.
 */
async function deflateZlib(bytes: Uint8Array): Promise<Uint8Array> {
  // `deflate` here means RFC 1950 zlib format (header + DEFLATE +
  // adler32). WOFF1 expects this. `deflate-raw` would skip the header.
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  // Stitch the chunks together into one buffer.
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

function pad4(n: number): number {
  return (4 - (n % 4)) % 4;
}

/**
 * Read a 4-byte tag at offset and return as ASCII string (preserves
 * order so we don't have to handle endianness).
 */
function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function writeTag(view: DataView, offset: number, tag: string): void {
  view.setUint8(offset, tag.charCodeAt(0));
  view.setUint8(offset + 1, tag.charCodeAt(1));
  view.setUint8(offset + 2, tag.charCodeAt(2));
  view.setUint8(offset + 3, tag.charCodeAt(3));
}

interface SfntTableEntry {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
}

interface CompressedTable {
  tag: string;
  data: Uint8Array; // either zlib-compressed or original (if compression didn't help)
  origLength: number;
  checksum: number;
}

/**
 * Convert a TTF/OTF ArrayBuffer into a WOFF1 ArrayBuffer.
 */
export async function ttfToWoff(ttfBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const ttf = new Uint8Array(ttfBuffer);
  const view = new DataView(ttfBuffer);

  // --- Parse SFNT header + table directory --------------------------
  // SFNT header layout:
  //   uint32 sfntVersion        — flavor (0x00010000 for TrueType, "OTTO" for CFF)
  //   uint16 numTables
  //   uint16 searchRange        (ignored — recomputed by readers anyway)
  //   uint16 entrySelector
  //   uint16 rangeShift
  // Then `numTables` directory entries of 16 bytes each:
  //   tag(4), checksum(4), offset(4), length(4)
  const sfntVersion = view.getUint32(0);
  const numTables = view.getUint16(4);

  const tables: SfntTableEntry[] = [];
  for (let i = 0; i < numTables; i++) {
    const e = 12 + i * 16;
    tables.push({
      tag: readTag(view, e),
      checksum: view.getUint32(e + 4),
      offset: view.getUint32(e + 8),
      length: view.getUint32(e + 12),
    });
  }

  // --- Compress each table -----------------------------------------
  // Per spec: if compressed >= original, store original verbatim.
  const compressedTables: CompressedTable[] = [];
  for (const t of tables) {
    const tableData = ttf.subarray(t.offset, t.offset + t.length);
    const compressed = await deflateZlib(tableData);
    compressedTables.push({
      tag: t.tag,
      data: compressed.length < t.length ? compressed : tableData,
      origLength: t.length,
      checksum: t.checksum,
    });
  }

  // --- Compute layout -----------------------------------------------
  // WOFF1 header is 44 bytes. Directory is 20 bytes per table. Then
  // each table's data follows, 4-byte-aligned.
  const woffHeaderSize = 44;
  const dirEntrySize = 20;
  const dirSize = numTables * dirEntrySize;

  let dataOffset = woffHeaderSize + dirSize;
  const tableOffsets: number[] = [];
  for (const ct of compressedTables) {
    tableOffsets.push(dataOffset);
    dataOffset += ct.data.length + pad4(ct.data.length);
  }
  const totalLength = dataOffset;

  // totalSfntSize = the original SFNT file size if the user had not
  // compressed it; readers use this to know how much to allocate
  // before decompression. Header + directory + sum of (table + pad).
  let totalSfntSize = 12 + numTables * 16;
  for (const t of tables) {
    totalSfntSize += t.length + pad4(t.length);
  }

  // --- Build the WOFF buffer ----------------------------------------
  const woff = new ArrayBuffer(totalLength);
  const woffView = new DataView(woff);
  const woffBytes = new Uint8Array(woff);

  // Header
  writeTag(woffView, 0, "wOFF");
  woffView.setUint32(4, sfntVersion);
  woffView.setUint32(8, totalLength);
  woffView.setUint16(12, numTables);
  woffView.setUint16(14, 0); // reserved, must be 0
  woffView.setUint32(16, totalSfntSize);
  woffView.setUint16(20, 1); // majorVersion
  woffView.setUint16(22, 0); // minorVersion
  woffView.setUint32(24, 0); // metaOffset
  woffView.setUint32(28, 0); // metaLength
  woffView.setUint32(32, 0); // metaOrigLength
  woffView.setUint32(36, 0); // privOffset
  woffView.setUint32(40, 0); // privLength

  // Directory + table data
  for (let i = 0; i < compressedTables.length; i++) {
    const ct = compressedTables[i];
    const entryOffset = woffHeaderSize + i * dirEntrySize;
    writeTag(woffView, entryOffset, ct.tag);
    woffView.setUint32(entryOffset + 4, tableOffsets[i]);
    woffView.setUint32(entryOffset + 8, ct.data.length); // compLength
    woffView.setUint32(entryOffset + 12, ct.origLength); // origLength
    woffView.setUint32(entryOffset + 16, ct.checksum); // origChecksum

    woffBytes.set(ct.data, tableOffsets[i]);
    // Padding bytes are zero — Uint8Array default-initialises to zero,
    // so no explicit write needed.
  }

  return woff;
}
