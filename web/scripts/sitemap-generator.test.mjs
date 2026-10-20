import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLlmsTxt, buildSitemap } from "./sitemap-generator.mjs";

test("every language version lists all alternates", () => {
  const xml = buildSitemap("https://x.io", ["/", "/specimen/A"], "2026-01-01");
  assert.equal((xml.match(/<loc>/g) || []).length, 4);
  assert.ok(xml.includes("<loc>https://x.io/zh/</loc>"));
  assert.ok(xml.includes("<loc>https://x.io/en/specimen/A</loc>"));
  assert.ok(xml.includes('hreflang="zh-Hant" href="https://x.io/zh/specimen/A"'));
  assert.ok(xml.includes('hreflang="x-default" href="https://x.io/en/specimen/A"'));
  assert.equal((xml.match(/hreflang=/g) || []).length, 12);
});

test("llms.txt lists fonts under their language", () => {
  const txt = buildLlmsTxt("https://x.io", [
    { name: "A", displayName: "Wing A", note: "粵拼", language: "Cantonese" },
    { name: "B", displayName: "Wing B", language: "Thai" },
  ]);
  assert.ok(txt.startsWith("# Wing Font\n\n> "));
  assert.ok(txt.includes("### Cantonese\n\n- [Wing A](https://x.io/en/specimen/A): 粵拼. Download: "));
  assert.ok(txt.includes("- [Wing B](https://x.io/en/specimen/B): Thai."));
});
