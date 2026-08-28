export function parseMapState(search, validCategories, validRegions) {
  const params = new URLSearchParams(String(search ?? "").replace(/^\?/, ""));
  const categorySet = new Set(validCategories);
  const regionSet = new Set(validRegions);
  const layers = params.get("layers")?.split(",").filter((value) => categorySet.has(value)) ?? [];
  return {
    tab: params.get("tab") === "map" ? "map" : null,
    region: regionSet.has(params.get("region")) ? params.get("region") : null,
    layers,
    query: String(params.get("q") ?? "").slice(0, 80),
  };
}

export function createMapSearch({ region, layers, query }) {
  const params = new URLSearchParams({ tab: "map", region });
  if (layers?.length) params.set("layers", [...new Set(layers)].sort().join(","));
  if (query?.trim()) params.set("q", query.trim().slice(0, 80));
  return `?${params.toString()}`;
}
