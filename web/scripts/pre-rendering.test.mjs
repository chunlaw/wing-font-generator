import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { outFileFor, stubHtml, unprefixedRoute } from "./pre-rendering.mjs";

test("language routes map to files GitHub Pages serves", () => {
  assert.equal(outFileFor("/zh/", "/d"), path.join("/d", "zh", "index.html"));
  assert.equal(outFileFor("/en/specimen/A", "/d"), path.join("/d", "en", "specimen", "A.html"));
  assert.equal(outFileFor("/", "/d"), path.join("/d", "index.html"));
});

test("pre-language routes and their shells", () => {
  assert.equal(unprefixedRoute("/en/"), "/");
  assert.equal(unprefixedRoute("/zh/specimen/A"), "/specimen/A");
  assert.equal(unprefixedRoute("/english"), null);
  const html = '<link rel="canonical" href="https://x.io/" /><meta property="og:url" content="https://x.io/" />';
  assert.equal(
    stubHtml(html, "https://x.io/en/about"),
    '<link rel="canonical" href="https://x.io/en/about" /><meta property="og:url" content="https://x.io/en/about" />',
  );
  assert.throws(() => stubHtml("<html></html>", "https://x.io/en/"));
});
