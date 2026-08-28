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
  assert.match(html, /app\.js\?v=1\.14/);
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

test("trait data is committed, not scraped on every build", async () => {
  const [pkg, workflow, collector] = await Promise.all([
    readFile(new URL("package.json", root), "utf8").then(JSON.parse),
    readFile(new URL(".github/workflows/pages.yml", root), "utf8"),
    readFile(new URL("scripts/update-trait-catalog.mjs", root), "utf8"),
  ]);

  // Trait effects only change on a game patch, so the daily build must not
  // depend on the upstream site being reachable.
  assert.doesNotMatch(pkg.scripts.refresh, /update-trait-catalog/);
  assert.match(pkg.scripts["traits:refresh"], /update-trait-catalog/);
  assert.doesNotMatch(workflow, /traits:refresh/);
  assert.match(collector, /Manual refresh tool/);

  // The published data has to be in the repository for the site to serve it.
  const traits = JSON.parse(await readFile(new URL("site/data/traits.json", root), "utf8"));
  const names = JSON.parse(await readFile(new URL("site/data/trait-names-ko.json", root), "utf8"));
  assert.ok(traits.traits.length >= 100);
  assert.ok(Object.keys(names.names).length >= 120);
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
    assert.equal(typeof trait.nameKo, "string");
  }

  // Korean names come from the breedable subset, so partial coverage is expected
  // but a collapse to zero means the join broke.
  assert.ok(traits.counts.localizedNames >= 85, `too few Korean trait names: ${traits.counts.localizedNames}`);
  const localized = new Map(traits.traits.filter((trait) => trait.nameKo).map((trait) => [trait.nameKo, trait.name]));
  assert.equal(localized.size, traits.counts.localizedNames, "a Korean name was reused for two traits");
  for (const trait of traits.traits) {
    if (trait.nameKo) assert.match(trait.nameKo, /[가-힣]/, `nameKo is not Korean: ${trait.name} -> ${trait.nameKo}`);
  }
  // Spot-check pairs that a naive index join gets wrong: sorting each language
  // alphabetically would pair Demon's Hand with 선인 instead of 악마의 손.
  const traitByName = new Map(traits.traits.map((trait) => [trait.name, trait]));
  assert.equal(traitByName.get("Artisan")?.nameKo, "장인 기질");
  assert.equal(traitByName.get("Legend")?.nameKo, "전설");
  assert.equal(traitByName.get("Demon’s Hand")?.nameKo, "악마의 손");
  assert.equal(traitByName.get("Remarkable Craftsmanship")?.nameKo, "초절기교");

  // Ratings drive the colour tiers.
  assert.match(app, /function traitTier/);
  assert.match(app, /tier-\$\{traitTier\(trait\)\}/);
  assert.match(app, /function traitLabel/);

  // "특성" is the breedable catalogue; "패시브" is reserved for a Pal's innate
  // ability, so the two words must not be used interchangeably.
  assert.doesNotMatch(html, /특성·패시브/);
  assert.match(html, /data-tab="traits">특성</);
  assert.match(app, /특성 사전/);
  assert.match(app, /고유 패시브/);
  assert.doesNotMatch(app, /고유 특성/);

  // The tab splits by what the trait is actually for.
  assert.match(app, /function traitUsage/);
  assert.match(app, /data-trait-usage=/);
  for (const label of ["전투용", "거점용", "피해야 할 특성"]) assert.ok(app.includes(label), `missing filter: ${label}`);

  // Every catalogue entry must land in at least one usage bucket, or a filter
  // would silently hide it.
  const baseEffects = /작업 속도|작업 적성|알 생산|부화|채굴 효율|벌목 효율|획득량|판매 가격|SAN|포만도|계속 작업|야행성/;
  const combatEffects = /공격|방어|HP|피해|면역|쿨타임|흡혈|스태미나|이동 속도|점프|대시|수영|재장전/;
  const unclassified = traits.traits.filter((trait) => {
    const text = trait.descriptionKo || trait.description;
    return !baseEffects.test(text) && !combatEffects.test(text);
  });
  assert.deepEqual(unclassified.map((trait) => trait.name), [], "traits fell outside both usage filters");

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
  // Attribution moved out of the tab bar but must still be reachable, and the
  // guide may never publish without it.
  assert.doesNotMatch(html, /data-tab="sources"/);
  assert.match(html, /<details id="sources-panel"/);
  assert.match(html, /id="sources-body"/);
  assert.match(app, /function renderSources/);
  assert.match(app, /#sources-body/);
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
