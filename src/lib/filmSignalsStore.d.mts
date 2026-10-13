import type { SavedFilm } from "./savedFilms";
export type FilmSignal = { id: number; watched: boolean; reaction: "liked" | "disliked" | null; film?: SavedFilm };
export type SignalOperation = { id: number; field: "watched"; value: boolean } | { id: number; field: "reaction"; value: FilmSignal["reaction"] };
export type SignalsView = { records: FilmSignal[]; member: string | null; ready: boolean; phase: "loading" | "guest" | "syncing" | "synced" | "error"; pendingIds: number[]; persistent: boolean; error: string | null };
export const INITIAL_SIGNALS: SignalsView;
export function createFilmSignalsStore(options: { read: (key: string) => string | null; write: (key: string, value: string) => void; cloud: (uid: string, method: string, payload?: unknown) => Promise<any>; nonce?: () => string }): {
    getSnapshot: () => SignalsView; subscribe: (callback: () => void) => () => void; setMember: (uid: string | null) => void;
    set: (op: SignalOperation, film?: SavedFilm) => boolean; refresh: () => Promise<boolean | null>; storageChanged: (key: string | null) => void;
};
