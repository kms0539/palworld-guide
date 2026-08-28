export const bossTypeLabels = { tower: "타워 보스", raid: "레이드 보스", world: "월드 보스", alpha: "알파 펠" };

export function recommendBossPals(boss, pals, ownedNames = []) {
  const counters = new Set(boss?.counterElements ?? []);
  const owned = new Set(ownedNames.map((name) => String(name).toLocaleLowerCase()));
  const candidates = Object.values(pals ?? {}).filter((pal) => pal.obtainable !== false
    && (owned.size === 0 || owned.has(String(pal.name).toLocaleLowerCase()))
    && (pal.elements ?? []).some((element) => counters.has(element)))
    .map((pal) => ({
      pal,
      score: Number(pal.stats?.hp ?? 0) + Number(pal.stats?.shot ?? 0) + Number(pal.stats?.defense ?? 0),
      matchedElements: (pal.elements ?? []).filter((element) => counters.has(element)),
    }))
    .sort((left, right) => right.score - left.score || left.pal.name.localeCompare(right.pal.name));
  return candidates.slice(0, 5);
}
