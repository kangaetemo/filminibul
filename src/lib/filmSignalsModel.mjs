import { savedFilm } from "./watchlistModel.mjs";
export const MAX_SIGNAL_FILMS = 1000;
export function signalOperation(value) {
    if (!value || !Number.isSafeInteger(value.id) || value.id <= 0) return null;
    if (value.field === "watched" && typeof value.value === "boolean") return { id: value.id, field: value.field, value: value.value };
    if (value.field === "reaction" && [null, "liked", "disliked"].includes(value.value)) return { id: value.id, field: value.field, value: value.value };
    return null;
}
export function parseSignals(values) {
    if (!Array.isArray(values)) return [];
    return [...new Map(values.filter(item => Number.isSafeInteger(item?.id) && item.id > 0 && typeof item.watched === "boolean" && [null, "liked", "disliked"].includes(item.reaction)).map(item => [item.id, { id: item.id, watched: item.watched, reaction: item.reaction, ...(savedFilm(item.film) && { film: savedFilm(item.film) }) }])).values()];
}
export function applySignal(records, operation, film) {
    const byId = new Map(records.map(record => [record.id, record]));
    const record = { id: operation.id, watched: false, reaction: null, ...byId.get(operation.id), [operation.field]: operation.value, ...(film && { film }) };
    byId.delete(record.id);
    if (record.watched || record.reaction) return [record, ...byId.values()];
    return [...byId.values()];
}
export function signalKey(records) {
    return JSON.stringify(records.filter(r => r.watched || r.reaction).map(r => [r.id, r.watched, r.reaction]).sort((a, b) => a[0] - b[0]));
}
