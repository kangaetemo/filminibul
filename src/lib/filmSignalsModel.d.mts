import type { FilmSignal, SignalOperation } from "./filmSignalsStore.mjs";
import type { SavedFilm } from "./savedFilms";
export const MAX_SIGNAL_FILMS: number;
export function signalOperation(value: unknown): SignalOperation | null;
export function parseSignals(values: unknown): FilmSignal[];
export function applySignal(records: FilmSignal[], op: SignalOperation, film?: SavedFilm): FilmSignal[];
export function signalKey(records: FilmSignal[]): string;
