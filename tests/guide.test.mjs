import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("site uses a restrictive browser policy and links its public repository", async () => {
  const html = await readFile(new URL("site/index.html", root), "utf8");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)/i);
  assert.match(html, /github\.com\/kms0539\/palworld-guide/);
  assert.doesNotMatch(html, /192\.168\.|palworld-dashboard/);
});

test("published data excludes server-only material", async () => {
  const serialized = await readFile(new URL("site/data/guide-data.json", root), "utf8");
  for (const forbidden of [/192\.168\./, /AdminPassword/i, /ServerPassword/i, /discordToken/i, /player-registry/i]) {
    assert.doesNotMatch(serialized, forbidden);
  }
  const guide = JSON.parse(serialized);
  assert.ok(guide.pals.length >= 250);
  assert.ok(guide.builds.length >= 12);
  assert.ok(guide.builds.some((build) => build.party?.length === 5 && build.strongAgainst?.length && build.weakAgainst?.length));
  assert.ok(guide.map.points.length >= 300);
  assert.ok(guide.map.points.some((point) => point.category.startsWith("resource_")));
  assert.ok(guide.sources.some((source) => source.id === "map-collectables"));
  assert.equal(guide.publication.scope, "guide-only");
});

test("guide release remains UAC-free and rejects private server material", async () => {
  const release = await readFile(new URL("scripts/Publish-GuideRelease.ps1", root), "utf8");
  assert.match(release, /GitHub Pages via OIDC/);
  assert.match(release, /settings\\\.ini/);
  assert.doesNotMatch(release, /-Verb\s+RunAs|New-NetFirewallRule|Register-ScheduledTask|Start-ScheduledTask/i);
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
  assert.match(app, /추천 사유/);
  assert.match(app, /전투 지표/);
  assert.match(app, /mapStatusLabels/);
  assert.match(app, /빠른 이동 지점/);
  assert.match(app, /추천 5인 파티와 채용 사유/);
  assert.match(app, /피해야 할 상대/);
  assert.match(app, /data-build-kind/);
  assert.doesNotMatch(app, /style=|\.style\b/);
});

test("Korean visual guide publishes local verified images with attribution", async () => {
  const [html, app, assetsText] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.js", root), "utf8"),
    readFile(new URL("site/data/visual-assets.json", root), "utf8"),
  ]);
  const assets = JSON.parse(assetsText);
  assert.match(html, /MS 팰월드 공략집/);
  assert.match(html, /실제 지도/);
  assert.match(app, /실제 지형 탐험 지도/);
  assert.ok(Object.keys(assets.pals).length >= 260);
  assert.equal(Object.keys(assets.pals).length, 288);
  assert.deepEqual(assets.missingPalImages, []);
  assert.ok(Object.values(assets.koreanNames).filter((name) => /[가-힣]/.test(name)).length >= 260);
  assert.equal(assets.koreanNames.jetragon, "제트래곤");
  assert.ok(assets.visuals["world-map"].bytes > 1_000_000);
  assert.ok(assets.attribution.some((item) => item.name === "PalDex" && item.license === "MIT"));
  assert.ok(assets.attribution.some((item) => item.name.includes("Pocketpair")));
  assert.ok(assets.attribution.some((item) => item.name.includes("Palworld.gg")));
  assert.ok(Object.values(assets.pals).some((item) => item.sourceProvider === "Palworld.gg"));
  assert.match(assets.attribution.find((item) => item.name === "PalDex").url, /\/tree\/[a-f0-9]{40}$/);
  for (const asset of Object.values(assets.pals)) {
    assert.match(asset.path, /^\.\/assets\/pals\/[a-z0-9-]+\.png$/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
  assert.ok((await stat(new URL("site/assets/visuals/palworld-map.webp", root))).size > 1_000_000);
});

test("daily Pages build refreshes data and verifies local visual assets", async () => {
  const workflow = await readFile(new URL(".github/workflows/pages.yml", root), "utf8");
  const sync = await readFile(new URL("scripts/sync-visual-assets.mjs", root), "utf8");
  assert.match(workflow, /npm run assets:sync/);
  assert.match(sync, /PALDEX_COMMIT = "[a-f0-9]{40}"/);
  assert.doesNotMatch(sync, /PalDex\/master/);
});
