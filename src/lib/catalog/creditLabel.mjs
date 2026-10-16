// Presentation only: preserve original character/credit data in the database.
export function creditLabel(value) {
    return value.replace(/\(([^)]*\bvoice\b[^)]*)\)/gi, (_, markers) =>
        "(" + markers.replace(/\bvoice\b/gi, "seslendirme") + ")");
}
