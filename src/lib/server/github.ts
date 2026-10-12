// GitHub Actions: workflow'ları (platform yenileme, katalog güncelleme) tetikleme ve son çalıştırmaları listeleme — SADECE sunucu.
// GITHUB_TOKEN: fine-grained token, sadece bu repo, "Actions: Read and write" izni yeterli.

const REPO = process.env.GITHUB_REPO ?? "kangaetemo/filminibul";
export const WORKFLOWS = { providers: "refresh-providers.yml", catalog: "update-catalog.yml", content: "refresh-content.yml" } as const;
export type WorkflowName = keyof typeof WORKFLOWS;

export const githubConfigured = () => !!process.env.GITHUB_TOKEN;

function headers(): HeadersInit {
    return {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
}

export interface WorkflowRun {
    id: number;
    status: string; // queued | in_progress | completed
    conclusion: string | null; // success | failure | cancelled | ...
    event: string; // schedule | workflow_dispatch
    createdAt: string;
    updatedAt: string;
    url: string;
}

export async function listRuns(workflow: WorkflowName = "providers", limit = 5): Promise<WorkflowRun[]> {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOWS[workflow]}/runs?per_page=${limit}`, {
        headers: headers(),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.workflow_runs ?? []).map(
        (r: { id: number; status: string; conclusion: string | null; event: string; created_at: string; updated_at: string; html_url: string }) => ({
            id: r.id,
            status: r.status,
            conclusion: r.conclusion,
            event: r.event,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            url: r.html_url,
        })
    );
}

export async function dispatchRefresh(workflow: WorkflowName = "providers"): Promise<void> {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOWS[workflow]}/dispatches`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ ref: "main" }),
    });
    // Başarılıysa 204 döner
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
