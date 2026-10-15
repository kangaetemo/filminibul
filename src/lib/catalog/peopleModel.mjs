export function normalizedName(value) {
    return String(value || "").toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}
export function roleCredits(snapshot, role) {
    if (!snapshot || !Array.isArray(snapshot.cast) || !Array.isArray(snapshot.crew)) throw new Error("Incomplete credits response");
    if (role === "actor") return snapshot.cast;
    if (role === "director") return snapshot.crew.filter(c => c.job === "Director");
    throw new Error("Unsupported pilot role");
}
export function nameMatches(person, expected) {
    return [person.name, person.original_name, ...(person.also_known_as || [])].some(name => normalizedName(name) === normalizedName(expected));
}
export function catalogCredits(snapshot, personId, catalogIds) {
    roleCredits(snapshot, "actor"); // require a complete successful snapshot before replacing anything
    const rows = new Map();
    for (const kind of ["cast", "crew"]) for (const c of snapshot[kind]) {
        if (!catalogIds.has(c.id) || c.adult === true) continue;
        const raw = { person_id: personId, movie_id: c.id, kind,
            credit_id: typeof c.credit_id === "string" && c.credit_id ? c.credit_id : null,
            job: kind === "cast" ? "Actor" : String(c.job || ""),
            department: kind === "cast" ? "Acting" : String(c.department || ""),
            character_name: kind === "cast" ? String(c.character || "") : null,
            cast_order: kind === "cast" && Number.isInteger(c.order) ? c.order : null };
        // Role and character survive when TMDB supplies no credit_id. Order changes do not change identity.
        const identity = JSON.stringify([personId, c.id, kind, raw.credit_id || [raw.job, raw.department, raw.character_name]]);
        rows.set(identity, { ...raw, identity });
    }
    return [...rows.values()];
}
