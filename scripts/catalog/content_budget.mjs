// Standard gpt-4.1-mini prices checked 2026-10-15. Conservative reservations
// include UTF-8 byte input upper bounds and the requested output ceiling.
export function createSpendMeter(maxUsd = Infinity) {
    if (maxUsd !== Infinity && (!Number.isFinite(maxUsd) || maxUsd < 0)) throw new Error('maxUsd must be non-negative');
    const limit = maxUsd === Infinity ? Infinity : Math.floor(maxUsd * 1e9);
    let reserved = 0, spent = 0, requests = 0, input = 0, output = 0, unknown = 0;
    function reserve(body) {
        const ceiling = (Buffer.byteLength(JSON.stringify(body), 'utf8') + 512) * 400 + body.max_tokens * 1600;
        if (spent + reserved + ceiling > limit) return null;
        reserved += ceiling; requests++;
        let settled = false;
        return {
            settle(usage) {
                if (settled) return; settled = true; reserved -= ceiling;
                if (!Number.isSafeInteger(usage?.prompt_tokens) || usage.prompt_tokens < 0 || !Number.isSafeInteger(usage?.completion_tokens) || usage.completion_tokens < 0) {
                    spent += ceiling; unknown++; return;
                }
                input += usage.prompt_tokens; output += usage.completion_tokens;
                spent += usage.prompt_tokens * 400 + usage.completion_tokens * 1600;
            },
        };
    }
    return { reserve, stats: () => ({ max_usd: Number.isFinite(maxUsd) ? maxUsd : null, requests, prompt_tokens: input, completion_tokens: output, estimated_usd: spent / 1e9, reserved_usd: reserved / 1e9, uncertain_requests: unknown, pricing: 'gpt-4.1-mini standard 0.40 input / 1.60 output USD per million; cached discount ignored' }) };
}

export function translationSourceIssue(value) {
    const s = typeof value === 'string' ? value.trim() : '';
    if (!/[\p{L}\p{N}]/u.test(s)) return 'empty_source';
    if (/^(?:plot\s*(?:tba|to be announced)|details here|tba|tbd|unknown|no (?:plot|overview|synopsis)(?: available)?)[.!]?$/i.test(s)) return 'placeholder_source';
    if (/^(?:(?:an? |the )?(?:\d{4} )?(?:hong kong|taiwan(?:ese)?|chin(?:a|ese)|japanese|malaysian|indian)?\s*(?:short |horror |action |drama |silent |animated )?(?:films?|movies?|release|production|original videos?)(?: (?:from|released in) \d{4})?)[.!]?$/i.test(s)) return 'metadata_only_source';
    if (/^(?:(?:\d{4} |early )?(?:pink(?: film)?|pinku|gay pinku|lesbian pinku)|film) (?:distributed by|directed by|from) .+[.!]?$/i.test(s)) return 'metadata_only_source';
    return null;
}
