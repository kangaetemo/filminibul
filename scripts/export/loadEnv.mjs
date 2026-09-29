// .env.local dosyasını process.env'e yükler (dotenv bağımlılığı olmadan)
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv() {
    for (const name of [".env.local", ".env"]) {
        const path = resolve(ROOT, name);
        if (!existsSync(path)) continue;
        for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (!m) continue;
            let value = m[2];
            if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
            if (process.env[m[1]] === undefined) process.env[m[1]] = value;
        }
    }
}

export function requireEnv(...names) {
    const missing = names.filter((n) => !process.env[n]);
    if (missing.length) {
        console.error(`❌ Eksik env değişkenleri (.env.local): ${missing.join(", ")}`);
        process.exit(1);
    }
    return names.map((n) => process.env[n].replace(/\/+$/, ""));
}
