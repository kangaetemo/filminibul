// API-01: two tiny requests using the runner's existing key. No retries,
// database access, credential export, prompts, completions or vectors in logs.
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { EMBEDDING_MODEL, EMBEDDING_DIMS } from '../../src/lib/recommend/embeddingDoc.mjs';

const quotas = new Set(['insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded']);
export async function verifyOpenAI({ apiKey = process.env.OPENAI_API_KEY, request = fetch, now = Date.now } = {}) {
    const report = { checked_at: new Date(now()).toISOString(), status: 'pending', requests: [], estimated_usd: 0, billing_dashboard_verified: false, project_identity_verified: false };
    if (!apiKey) return { ...report, status: 'not_configured' };
    const samples = [
        { endpoint: 'chat/completions', body: { model: 'gpt-4.1-mini', temperature: 0, max_tokens: 8, messages: [{ role: 'user', content: 'Return exactly OK without punctuation or formatting.' }] } },
        { endpoint: 'embeddings', body: { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMS, input: 'Film search verification.' } },
    ];
    for (const { endpoint, body } of samples) {
        const start = now(); let response;
        try {
            response = await request(`https://api.openai.com/v1/${endpoint}`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } catch {
            report.status = 'network_error'; break;
        }
        const data = await response.json().catch(() => ({}));
        const usage = data.usage ?? {};
        const input = Number.isSafeInteger(usage.prompt_tokens) ? usage.prompt_tokens : null;
        const output = endpoint === 'embeddings' ? 0 : Number.isSafeInteger(usage.completion_tokens) ? usage.completion_tokens : null;
        const estimated = input === null || output === null ? null : (input * (endpoint === 'embeddings' ? 0.13 : 0.40) + output * 1.60) / 1e6;
        const valid = endpoint === 'embeddings' ? Array.isArray(data.data?.[0]?.embedding) && data.data[0].embedding.length === EMBEDDING_DIMS && data.data[0].embedding.every(Number.isFinite) : data.choices?.[0]?.finish_reason === 'stop' && /^OK[.!]?$/.test(data.choices[0].message?.content?.trim() ?? '');
        const sample = { endpoint, model: data.model ?? body.model, http_status: response.status, duration_ms: now() - start, input_tokens: input, output_tokens: output, estimated_usd: estimated, output_valid: !!valid, rate_limit_requests: response.headers.get('x-ratelimit-limit-requests'), rate_limit_tokens: response.headers.get('x-ratelimit-limit-tokens') };
        if (estimated !== null) report.estimated_usd += estimated;
        report.requests.push(sample);
        if (!response.ok) {
            report.status = quotas.has(data.error?.code) || quotas.has(data.error?.type) ? 'quota_error' : [401, 403].includes(response.status) ? 'authentication_error' : 'provider_error'; break;
        }
        if (!valid || estimated === null) { report.status = 'invalid_response'; break; }
    }
    if (report.status === 'pending') report.status = report.requests.length === 2 ? 'passed' : 'incomplete';
    return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const report = await verifyOpenAI();
    mkdirSync('docs', { recursive: true });
    writeFileSync('docs/openai-verification-report.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    if (report.status !== 'passed') process.exitCode = 1;
}
