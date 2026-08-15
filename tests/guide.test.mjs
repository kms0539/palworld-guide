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
  assert.ok(guide.map.points.length >= 200);
  assert.ok(guide.map.points.every((point) => point.versionStatus === "current_1_0"));
  assert.ok(guide.map.points.every((point) => !point.category.startsWith("resource_")));
  assert.ok(guide.map.points.some((point) => point.mapId === "world_tree"));
  assert.ok(guide.map.points.some((point) => point.mapId === "sunreach"));
  assert.equal(guide.map.regions.world_tree.terrain, true);
  assert.ok(!guide.sources.some((source) => source.id === "map-collectables"));
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
  assert.match(source, /versionStatus === "current_1_0"/);
  assert.match(source, /192\\\.168/);
});

test("site exposes a searchable Pal encyclopedia and current 1.0 map controls", async () => {
  const [html, app, progressionStyles] = await Promise.all([
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.js", root), "utf8"),
    readFile(new URL("site/progression.css", root), "utf8"),
  ]);
  assert.match(html, /progression\.css/);
  assert.match(html, /app\.js\?v=1\.8\.0/);
  assert.match(html, /data-tab="pals"/);
  assert.match(html, /data-tab="progression"/);
  assert.match(app, /renderPals/);
  assert.match(app, /renderProgression/);
  assert.match(app, /data-progression-kind/);
  assert.match(app, /전투형/);
  assert.match(app, /거점형/);
  assert.match(app, /item\.kind === state\.progressionKind/);
  assert.match(app, /const basePlans/);
  assert.match(app, /renderBasePlan/);
  assert.match(app, /설치·팰 배치/);
  assert.match(app, /작업 적성별 최소 구성/);
  assert.match(app, /steamcommunity\.com\/ogg\/1623730\/announcements/);
  assert.match(app, /docs\.palworldgame\.com\/settings-and-operation\/configuration/);
  assert.match(app, /초중반/);
  assert.match(app, /교체 기준/);
  assert.match(progressionStyles, /stage-timeline/);
  assert.match(progressionStyles, /progression-grid/);
  assert.match(progressionStyles, /progression-kind-tabs/);
  assert.match(progressionStyles, /base-install-guide/);
  assert.match(progressionStyles, /base-staff-grid/);
  assert.match(app, /pal-search/);
  assert.match(app, /Palworld 1\.0 현행 지도/);
  assert.match(app, /point\.versionStatus === "current_1_0"/);
  assert.match(app, /추천 사유/);
  assert.match(app, /전투 지표/);
  assert.match(app, /mapStatusLabels/);
  assert.match(app, /data-map-region/);
  assert.match(app, /world_tree/);
  assert.match(app, /빠른 이동 지점/);
  assert.match(app, /추천 5인 파티와 채용 사유/);
  assert.match(app, /피해야 할 상대/);
  assert.match(app, /data-build-kind/);
  assert.doesNotMatch(app, /style=|\.style\b/);
});

test("trait catalogue explains every trait the guide names", async () => {
  const [traits, details, guide, html, app] = await Promise.all([
    readFile(new URL("site/data/traits.json", root), "utf8").then(JSON.parse),
    readFile(new URL("site/data/pal-details.json", root), "utf8").then(JSON.parse),
    readFile(new URL("site/data/guide-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("site/index.html", root), "utf8"),
    readFile(new URL("site/app.js", root), "utf8"),
  ]);

  assert.equal(traits.schemaVersion, 1);
  assert.ok(traits.traits.length >= 60, `trait catalogue too small: ${traits.traits.length}`);
  assert.ok(traits.traits.some((trait) => trait.polarity === "positive"));
  assert.ok(traits.traits.some((trait) => trait.polarity === "negative"));
  for (const trait of traits.traits) {
    assert.ok(trait.name && trait.description, `trait missing text: ${JSON.stringify(trait)}`);
    // A Korean guide must not surface English effect text.
    assert.ok(trait.descriptionKo, `trait has no Korean effect: ${trait.name}`);
    assert.match(trait.descriptionKo, /[가-힣]/, `trait effect was not translated: ${trait.name} — ${trait.descriptionKo}`);
    assert.equal(trait.untranslated, undefined, `untranslated marker leaked into published data: ${trait.name}`);
  }

  // Every innate trait shown on a recommendation must resolve to an explanation,
  // otherwise the tooltip would be an empty promise.
  const known = new Set(traits.traits.map((trait) => trait.name.toLowerCase()));
  const byName = new Map(Object.values(details.pals).map((detail) => [String(detail.name).toLowerCase(), detail]));
  const recommended = guide.editorial.base.flatMap((item) => [item.pal, item.alternative]).filter(Boolean);
  for (const name of recommended) {
    const detail = byName.get(String(name).toLowerCase());
    assert.ok(detail, `base recommendation has no detail record: ${name}`);
    for (const trait of detail.innateTraits) {
      assert.ok(known.has(trait.name.toLowerCase()), `innate trait missing from catalogue: ${trait.name}`);
    }
  }

  assert.match(html, /data-tab="traits"/);
  assert.match(app, /function renderTraits/);
  assert.match(app, /function traitChip/);
  assert.match(app, /data-trait=/);
  assert.match(app, /trait-tip/);
  // A missing catalogue must not blank the guide.
  assert.match(app, /traits\.json[\s\S]{0,160}catch\(\(\) => null\)/);
});

test("base recommendations show the work levels that justify them", async () => {
  const [details, app] = await Promise.all([
    readFile(new URL("site/data/pal-details.json", root), "utf8").then(JSON.parse),
    readFile(new URL("site/app.js", root), "utf8"),
  ]);
  const pals = Object.values(details.pals);
  assert.ok(pals.length >= 250, `pal detail cache too small: ${pals.length}`);
  assert.ok(pals.filter((pal) => pal.work.length > 0).length >= 250);
  const orserk = pals.find((pal) => pal.name === "Orserk");
  assert.ok(orserk, "Orserk detail is missing");
  const electricity = orserk.work.find((entry) => entry.label === "발전");
  assert.ok(electricity && electricity.level === 8, "work suitability level did not survive collection");
  assert.match(app, /function workSuitabilityRow/);
  assert.match(app, /function recommendedWorkTraits/);
});

test("map markers use the source projection instead of hand-tuned bounds", async () => {
  const [guide, app, updater] = await Promise.all([
    readFile(new URL("site/data/guide-data.json", root), "utf8").then(JSON.parse),
    readFile(new URL("site/app.js", root), "utf8"),
    readFile(new URL("scripts/update-guide-data.mjs", root), "utf8"),
  ]);

  const projection = guide.map.projection;
  assert.ok(projection, "published guide data must carry the map projection");
  assert.equal(projection.size, 8192);
  for (const key of ["minX", "minY", "maxX", "maxY"]) assert.equal(typeof projection.gameBounds[key], "number");
  for (const key of ["xScale", "xOffset", "yScale", "yOffset"]) assert.equal(typeof projection.imageTransform[key], "number");
  for (const key of ["translateWorldX", "translateWorldY", "scale"]) assert.equal(typeof projection.transform[key], "number");

  // The image must cover the declared game bounds, or markers would sit on a
  // differently framed terrain texture.
  const { xScale, xOffset } = projection.imageTransform;
  assert.ok(Math.abs(xScale * projection.gameBounds.minX + xOffset) <= 2);
  assert.ok(Math.abs(xScale * projection.gameBounds.maxX + xOffset - projection.size) <= 2);

  // World bounds must be derived from the projection, never re-hardcoded.
  const { translateWorldX, translateWorldY, scale } = projection.transform;
  assert.equal(guide.map.bounds.minY, projection.gameBounds.minX * scale + translateWorldY);
  assert.equal(guide.map.bounds.maxX, projection.gameBounds.maxY * scale - translateWorldX);
  assert.doesNotMatch(updater, /minX: -1099400/);

  // The vertical axis is flipped by the source projection; a plain bounds
  // stretch mirrored the map.
  assert.match(app, /projection\.imageTransform/);
  assert.match(app, /projection\.size - \(yScale \* -game\.y \+ yOffset\)/);
  assert.doesNotMatch(app, /point\.y - 158000/);
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
  assert.match(app, /Palworld 1\.0 현행 지도/);
  assert.ok(Object.keys(assets.pals).length >= 260);
  assert.equal(Object.keys(assets.pals).length, 288);
  assert.deepEqual(assets.missingPalImages, []);
  assert.ok(Object.values(assets.koreanNames).filter((name) => /[가-힣]/.test(name)).length >= 260);
  assert.equal(assets.koreanNames.jetragon, "제트래곤");
  assert.ok(assets.visuals["world-map"].bytes > 1_000_000);
  assert.ok(assets.visuals["world-tree-map"].bytes > 1_000_000);
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
  assert.ok((await stat(new URL("site/assets/visuals/palworld-world-tree.webp", root))).size > 1_000_000);
});

test("daily Pages build refreshes data and verifies local visual assets", async () => {
  const workflow = await readFile(new URL(".github/workflows/pages.yml", root), "utf8");
  const sync = await readFile(new URL("scripts/sync-visual-assets.mjs", root), "utf8");
  assert.match(workflow, /npm run assets:sync/);
  assert.match(sync, /PALDEX_COMMIT = "[a-f0-9]{40}"/);
  assert.doesNotMatch(sync, /PalDex\/master/);
});
