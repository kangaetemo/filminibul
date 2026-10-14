// One in-memory intent. Closing the prompt invalidates late popup results.
export function createPendingFilmAction() {
    let current = null;
    return {
        request(film, kind) { current = { film, kind, uid: null, submitted: false, seenMember: false }; return current; },
        cancel() { current = null; },
        authenticate(request, uid) { if (current !== request) return false; request.uid = uid; return true; },
        advance(request, saved, signals, handlers) {
            if (current !== request) return "cancelled";
            if (!request.uid) return "login";
            const state = request.kind === "save" ? saved : signals;
            if (saved.member === request.uid) request.seenMember = true;
            if ((saved.member && saved.member !== request.uid) || (request.seenMember && !saved.member)) return "account_changed";
            if (!saved.ready || saved.member !== request.uid || !state.ready || state.member !== request.uid) return "waiting";
            if (state.phase === "error") return "error";
            if (state.phase !== "synced" || state.pendingIds.includes(request.film.id)) return "waiting";
            if (request.submitted) return "done";
            const record = signals.records.find(r => r.id === request.film.id);
            const satisfied = request.kind === "save" ? saved.films.some(f => f.id === request.film.id)
                : request.kind === "watched" ? !!record?.watched : record?.reaction === request.kind;
            if (satisfied) return "done";
            // Set before notifying subscribers; Strict Mode cannot submit twice.
            request.submitted = true;
            const accepted = request.kind === "save" ? !handlers.save(request.film).blocked
                : handlers.signal({ id: request.film.id, field: request.kind === "watched" ? "watched" : "reaction", value: request.kind === "watched" ? true : request.kind }, request.film);
            if (!accepted) { request.submitted = false; return "error"; }
            return "waiting";
        },
    };
}
