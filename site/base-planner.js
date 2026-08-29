import { expandItemMaterials, expandStructureMaterials } from "./item-engine.js?v=1.14.2";

export function productionPlan(kind, id, quantity, itemIndex, pals) {
  const entry = kind === "structure" ? itemIndex.structures.get(id) : itemIndex.items.get(id);
  if (!entry) throw new Error(`unknown ${kind}: ${id}`);
  const expansion = kind === "structure"
    ? expandStructureMaterials(id, quantity, itemIndex)
    : expandItemMaterials(id, quantity, itemIndex);
  const stations = kind === "structure" ? [] : [...new Set(entry.recipe?.stations ?? [])];
  const requiredWork = new Set();
  if (kind === "structure" && entry.workers) requiredWork.add(entry.workers);
  const stationText = stations.join(" ").toLocaleLowerCase();
  const workRules = [
    ["handiwork", /assembly|workbench|craft/i], ["kindling", /furnace|kitchen|fire/i],
    ["medicineproduction", /medicine/i], ["watering", /crusher|mill/i],
  ];
  for (const [work, pattern] of workRules) if (pattern.test(stationText)) requiredWork.add(work);
  const workers = [...requiredWork].map((work) => ({
    work,
    candidates: Object.values(pals ?? {}).filter((pal) => pal.obtainable !== false)
      .map((pal) => ({ pal, suitability: (pal.work ?? []).find((entryWork) => entryWork.work.toLocaleLowerCase() === work.toLocaleLowerCase()) }))
      .filter((candidate) => candidate.suitability)
      .sort((left, right) => right.suitability.level - left.suitability.level || left.pal.name.localeCompare(right.pal.name)).slice(0, 3),
  }));
  return { entry, expansion, stations, workers };
}
