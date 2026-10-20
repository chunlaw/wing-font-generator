import { test } from "node:test";
import assert from "node:assert/strict";
import { fontLabel, parseMatrix } from "./gen-font-facts.mjs";

test("font file names become readable labels", () => {
  assert.equal(fontLabel("input_fonts/NotoSansHK-VariableFont_wght.ttf"), "Noto Sans HK");
  assert.equal(fontLabel("input_fonts/NotoSans-VariableFont_wdth,wght.ttf"), "Noto Sans");
  assert.equal(fontLabel("input_fonts/ChironSungHK-R.ttf"), "Chiron Sung HK");
  assert.equal(fontLabel("input_fonts/Hind-Regular.ttf"), "Hind");
});

test("matrix lines yield base, annotation and mapping", () => {
  const yml = [
    `          - { name: WingSerifYueYale, family: "Wing Serif Yue Yale", args: "-opt -i input_fonts/ChironSungHK-R.ttf -a 'input_fonts/NotoSans-VariableFont_wdth,wght.ttf' --anno-axis wdth=75 -m mappings/cantonese/canto-yale.csv -as 0.41 -bs 0.70 -y 0.71" }`,
    `          # - { name: Commented, args: "-i x -a y -m z" }`,
  ].join("\n");
  assert.deepEqual(parseMatrix(yml), {
    WingSerifYueYale: { base: "Chiron Sung HK", annotation: "Noto Sans", mapping: "cantonese/canto-yale.csv" },
  });
});
