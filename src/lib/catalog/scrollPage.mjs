// Select the chunk the reader has reached, rather than the last prefetched chunk.
export function pageAtViewport(starts, height, fallback) {
    const line = Math.min(320, Math.max(120, height * 0.35));
    let page = starts[0]?.page ?? fallback;
    for (const start of starts) if (start.top <= line) page = start.page;
    return page;
}

// Keep language, campaign parameters and anchors; the first page has no page=1 alias.
export function pageAddress(href, page) {
    const url = new URL(href);
    if (page === 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(page));
    return url.pathname + url.search + url.hash;
}
