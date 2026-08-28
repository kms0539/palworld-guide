export const PROGRESS_VERSION = 1;

export function emptyProgress() {
  return { schemaVersion: PROGRESS_VERSION, completed: {} };
}

export function validateProgress(value, allowedIds) {
  if (!value || typeof value !== "object") throw new TypeError("진행 데이터가 객체가 아닙니다.");
  const completed = value.schemaVersion === 0 && Array.isArray(value.completed)
    ? Object.fromEntries(value.completed.map((id) => [id, true])) : value.completed;
  if (!completed || typeof completed !== "object" || Array.isArray(completed)) throw new TypeError("완료 목록 형식이 잘못되었습니다.");
  const allow = new Set(allowedIds);
  const entries = Object.entries(completed);
  if (entries.length > 10_000) throw new RangeError("완료 항목이 허용 범위를 초과했습니다.");
  return { schemaVersion: PROGRESS_VERSION, completed: Object.fromEntries(entries.filter(([id, done]) => allow.has(id) && done === true)) };
}

export function loadProgress(storage, key, allowedIds) {
  try { return validateProgress(JSON.parse(storage.getItem(key) || "null"), allowedIds); } catch { return emptyProgress(); }
}

export function saveProgress(storage, key, progress) {
  storage.setItem(key, JSON.stringify(progress));
}

export function toggleProgress(progress, id) {
  const completed = { ...progress.completed };
  if (completed[id]) delete completed[id]; else completed[id] = true;
  return { schemaVersion: PROGRESS_VERSION, completed };
}

export function importProgress(text, allowedIds) {
  return validateProgress(JSON.parse(text), allowedIds);
}
