export async function loadFont(fontFamily: string, source: string) {
  console.log(fontFamily, source)
  const font = new FontFace(fontFamily, source, {
    style: "normal",
    weight: "400",
    stretch: "condensed",
  });
  // wait for font to be loaded
  await font.load();
  // add font to document
  document.fonts.add(font);
}
