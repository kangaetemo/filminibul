// Uygulamanın TypeScript modüllerini (src/) Next olmadan Node'da çalıştırmak için küçük yükleyici.
// scripts/tests/vibe-flow.test.mjs ile aynı yöntem: dosya TypeScript ile JS'e çevrilir, `@/` ve göreli
// importlar çözülür, JSON dosyaları `export default` olarak yüklenir. Yalnız değerlendirme betikleri içindir.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const urls = new Map();

function moduleUrl(path) {
    if (urls.has(path)) return urls.get(path);
    if (path.endsWith(".mjs")) return pathToFileURL(path).href;
    let source = path.endsWith(".json")
        ? `export default ${readFileSync(path, "utf8")};`
        : ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    source = source.replace(/from\s+["']([^"']+)["']/g, (match, specifier) => {
        if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return match; // paket importu
        let dependency = specifier.startsWith("@/") ? resolve(SRC, specifier.slice(2)) : resolve(dirname(path), specifier);
        if (!existsSync(dependency)) dependency += ".ts";
        return `from ${JSON.stringify(moduleUrl(dependency))}`;
    });
    const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    urls.set(path, url);
    return url;
}

/** `importSrc("lib/recommend/vibe.ts")` → modülün dışa aktardıkları */
export function importSrc(relativePath) {
    return import(moduleUrl(resolve(SRC, relativePath)));
}
