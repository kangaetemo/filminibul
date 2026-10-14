import type { SavedFilm } from "../savedFilms";
import type { WatchlistView } from "../watchlistStore.mjs";
import type { SignalsView, SignalOperation } from "../filmSignalsStore.mjs";
export type FilmActionKind = "save" | "watched" | "liked" | "disliked";
export type PendingFilmAction = { film: SavedFilm; kind: FilmActionKind; uid: string | null; submitted: boolean; seenMember: boolean };
export type ActionStatus = "login" | "waiting" | "error" | "done" | "cancelled" | "account_changed";
export function createPendingFilmAction(): {
    request(film: SavedFilm, kind: FilmActionKind): PendingFilmAction;
    cancel(): void;
    authenticate(request: PendingFilmAction, uid: string): boolean;
    advance(request: PendingFilmAction, saved: WatchlistView, signals: SignalsView, handlers: {
        save: (film: SavedFilm) => { blocked: boolean };
        signal: (op: SignalOperation, film: SavedFilm) => boolean;
    }): ActionStatus;
};
