import type { SavedFilm } from "./savedFilms";
export type WatchlistView = {
    films: SavedFilm[]; ready: boolean; member: string | null;
    phase: "loading" | "guest" | "syncing" | "synced" | "error";
    pendingIds: number[]; localCount: number; persistent: boolean; importing: boolean;
    importNotice: { imported: number; remaining: number } | null; error: string | null;
};
export const INITIAL_WATCHLIST: WatchlistView;
export function createWatchlistStore(options: {
    read: (key: string) => string | null; write: (key: string, value: string) => void;
    cloud: (uid: string, method: string, payload?: unknown) => Promise<any>; nonce?: () => string;
}): {
    subscribe: (callback: () => void) => () => void; getSnapshot: () => WatchlistView;
    setMember: (uid: string | null) => void;
    toggle: (film: SavedFilm) => { saved: boolean; persistent: boolean; cloud: boolean; blocked: boolean };
    refresh: () => Promise<boolean | null>; importLocal: () => Promise<void>; storageChanged: (key: string | null) => void;
};
