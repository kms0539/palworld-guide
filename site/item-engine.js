export class RecipeCycleError extends Error {
  constructor(path) {
    super(`recipe cycle: ${path.join(" -> ")}`);
    this.name = "RecipeCycleError";
    this.path = path;
  }
}

export function createItemIndex(data) {
  return {
    data,
    items: new Map(data.items.map((item) => [item.id, item])),
    structures: new Map(data.structures.map((structure) => [structure.id, structure])),
  };
}

function add(map, id, quantity) {
  map.set(id, (map.get(id) ?? 0) + quantity);
}

export function expandItemMaterials(itemId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  if (!index.items.has(itemId)) throw new Error(`unknown item: ${itemId}`);
  const rawMaterials = new Map();
  const crafts = [];

  const visit = (id, required, path) => {
    const item = index.items.get(id);
    if (path.includes(id)) throw new RecipeCycleError([...path, id]);
    if (!item.recipe) {
      add(rawMaterials, id, required);
      return;
    }
    const batches = Math.ceil(required / item.recipe.outputQuantity);
    crafts.push({ itemId: id, required, batches, produced: batches * item.recipe.outputQuantity });
    for (const material of item.recipe.materials) visit(material.itemId, material.quantity * batches, [...path, id]);
  };

  visit(itemId, quantity, []);
  return { rawMaterials, crafts };
}

export function expandStructureMaterials(structureId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  const structure = index.structures.get(structureId);
  if (!structure) throw new Error(`unknown structure: ${structureId}`);
  const rawMaterials = new Map();
  const crafts = [];
  for (const material of structure.materials) {
    const expanded = expandItemMaterials(material.itemId, material.quantity * quantity, index);
    for (const [id, amount] of expanded.rawMaterials) add(rawMaterials, id, amount);
    crafts.push(...expanded.crafts);
  }
  return { rawMaterials, crafts };
}
