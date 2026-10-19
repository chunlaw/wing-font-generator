/** Half-width ASCII (U+0021–U+007E) → fullwidth forms (U+FF01–U+FF5E).
 *  Spaces are left alone. Lets users type `行0zaa1` and get the
 *  Word-safe `行０ｚａａ１` override notation. */
export const toFullWidth = (s: string): string =>
  s.replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
