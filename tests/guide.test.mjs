import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("site uses a restrictive browser policy and links both repositories", async () => {
  const html = await readFile(new URL("site/index.html", root), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)/i);
  assert.match(html, /github\.com\/kms0539\/palworld-guide/);
  assert.match(html, /github\.com\/kms0539\/palworld-dashboard/);
});

test("published data excludes server-only material", async () => {
  const serialized = await readFile(new URL("site/data/guide-data.json", root), "utf8");
  for (const forbidden of [/192\.168\./, /AdminPassword/i, /ServerPassword/i, /discordToken/i, /player-registry/i]) {
    assert.doesNotMatch(serialized, forbidden);
  }
  const guide = JSON.parse(serialized);
  assert.ok(guide.pals.length >= 250);
  assert.ok(guide.map.points.length >= 300);
  assert.ok(guide.map.points.some((point) => point.category.startsWith("resource_")));
  assert.ok(guide.sources.some((source) => source.id === "map-collectables"));
  assert.equal(guide.publication.scope, "guide-only");
});

test("sanitizer keeps an explicit public boundary", async () => {
  const source = await readFile(new URL("scripts/build-public-guide.mjs", root), "utf8");
  for (const required of ["server status", "players", "IP addresses", "credentials", "Discord configuration"]) {
    assert.match(source, new RegExp(required, "i"));
  }
  assert.match(source, /points: guide\.map\.points/);
  assert.match(source, /192\\\.168/);
});

test("site exposes a searchable Pal encyclopedia and resource map controls", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.js", root), "utf8"),
  ]);
  assert.match(html, /data-tab="pals"/);
  assert.match(app, /renderPals/);
  assert.match(app, /pal-search/);
  assert.match(app, /resource_copper/);
  assert.doesNotMatch(app, /style=|\.style\b/);
});
