// Only public discovery preferences are shared. Identity and arbitrary query
// values never enter a shared URL.
export function platformUrl(pathname, search, ids) {
    const params = new URLSearchParams(search);
    params.set("p", [...new Set(ids)].join(",")); // p= explicitly clears a remembered filter
    return `${pathname}?${params}`;
}
export function shareUrl(pathname, search, language, pair) {
    const source = new URLSearchParams(search), params = new URLSearchParams();
    if (pair) { params.set("a", String(pair[0])); params.set("b", String(pair[1])); }
    if (source.has("p")) {
        const ids = [...new Set((source.get("p") || "").split(",").map(Number).filter(id => Number.isSafeInteger(id) && id > 0))].slice(0, 30);
        params.set("p", ids.join(","));
    }
    params.set("lang", language === "en" ? "en" : "tr");
    return `https://filminibul.com${pathname}?${params}`;
}
