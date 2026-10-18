// Tarif araması (AR-04): tarifteki açık dönem ve ülke / dil şartları.
//
// Neden: 18–19 Ekim ölçümlerinde dönem şartlı tarifler ("70'lerde geçen mafya filmi", "80'lerde geçen çocuk
// macerası") en zayıflar arasındaydı; embedding dönemi yalnız hafifçe gözetiyor. Şart yoksa hiçbir film etkilenmez.
//
// Ülke / dil: Türkçe tarif + LLM belgesindeki "Setting:" satırı (istem bu satırı yalnız tarifte açıkça geçince yazdırır).
// Dönem: YALNIZ tarif metni ("80'lerde"). 19 Ekim ölçümünde Setting satırındaki dönem zarar verdi: "İkinci Dünya
// Savaşı'nda geçen" → "1940s" → 1940'larda çekilmiş eski filmler öne çıktı (Grand Illusion 1937, hakem 0). Filmin
// yılı çekiliş yılıdır, hikâyenin geçtiği dönem değil; yalnız kullanıcı açıkça on yıl yazınca kullanılır.

// Türkçe ülke / milliyet kökleri → ISO 3166 ülke kodları (+ ana dil, ISO 639-1). Kök, kelimenin başında aranır
// ("Koreli", "Fransız yapımı"); yanlış eşleşmeye açık kökler EXACT / EXCLUDE ile sınırlanır.
// "mısır" bilerek yok (mısır patlağı); "fin" yalnız tam kelime.
const EXACT = new Set(["fin", "abd", "paris", "tokyo", "seul", "istanbul", "londra", "roma", "madrid", "berlin", "mumbai", "pekin"]);
const EXCLUDE = { türk: ["türkü"], rus: ["rustik"], çin: ["çinko"], hint: [] };
const COUNTRY_STEMS = [
    ["paris", ["FR"], ["fr"]], ["tokyo", ["JP"], ["ja"]], ["seul", ["KR"], ["ko"]], ["istanbul", ["TR"], ["tr"]],
    ["londra", ["GB"], []], ["new york", ["US"], []], ["roma", ["IT"], ["it"]], ["madrid", ["ES"], ["es"]],
    ["berlin", ["DE"], ["de"]], ["mumbai", ["IN"], ["hi"]], ["pekin", ["CN"], ["zh"]],
    ["kore", ["KR"], ["ko"]], ["japon", ["JP"], ["ja"]], ["fransız", ["FR"], ["fr"]], ["fransa", ["FR"], ["fr"]],
    ["türk", ["TR"], ["tr"]], ["yerli", ["TR"], ["tr"]], ["italya", ["IT"], ["it"]], ["italyan", ["IT"], ["it"]],
    ["ispanya", ["ES"], ["es"]], ["ispanyol", ["ES"], ["es"]], ["alman", ["DE"], ["de"]], ["hint", ["IN"], ["hi", "ta", "te", "ml"]],
    ["hindistan", ["IN"], ["hi", "ta", "te", "ml"]], ["bollywood", ["IN"], ["hi"]], ["çin", ["CN", "HK", "TW"], ["zh", "cn"]],
    ["hong kong", ["HK"], ["cn", "zh"]], ["iran", ["IR"], ["fa"]], ["ingiliz", ["GB"], []], ["ingiltere", ["GB"], []],
    ["britanya", ["GB"], []], ["amerikan", ["US"], []], ["amerika", ["US"], []], ["abd", ["US"], []], ["hollywood", ["US"], []],
    ["rus", ["RU"], ["ru"]], ["meksika", ["MX"], ["es"]], ["arjantin", ["AR"], ["es"]], ["brezilya", ["BR"], ["pt"]],
    ["danimarka", ["DK"], ["da"]], ["isveç", ["SE"], ["sv"]], ["norveç", ["NO"], ["no", "nb"]], ["fin", ["FI"], ["fi"]],
    ["iskandinav", ["SE", "NO", "DK", "FI", "IS"], ["sv", "no", "nb", "da", "fi", "is"]], ["tayland", ["TH"], ["th"]],
    ["yunan", ["GR"], ["el"]], ["polonya", ["PL"], ["pl"]], ["macar", ["HU"], ["hu"]],
];

/** Tarifteki dönemler: "80'lerde", "70'li yıllar", "1990'lar", "2000'lerin" → [1980], [1970], [1990], [2000] */
export function decadesFromText(text) {
    const out = new Set();
    for (const m of String(text).toLocaleLowerCase("tr").matchAll(/(?<!\d)(19[0-9]0|20[0-2]0|[2-9]0)\s*['’]?\s*(?:l[ea]r|l[iıuü])/gu)) {
        const n = Number(m[1]);
        out.add(n < 100 ? 1900 + n : n);
    }
    return [...out];
}

/** LLM belgesinin "Setting:" satırı: "South Korea · Korean-language · 1970s" */
function settingLine(doc) {
    return (String(doc ?? "").split("\n").find((l) => l.toLowerCase().startsWith("setting:")) ?? "").slice(8);
}

const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const languageName = new Intl.DisplayNames(["en"], { type: "language" });
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Artık kullanılmayan kodlar ("Germany" → DD, "France" → FX olmasın) ve LLM'in sık yazdığı kısa adlar
const RETIRED = new Set(["DD", "FX", "YU", "CS", "SU", "ZR", "BU", "TP", "AN", "NT", "DY", "HV", "NH", "RH", "VD", "YD", "QO", "QU", "UK", "EU", "EZ", "UN", "XA", "XB", "XK"]);
const REGION_ALIASES = { turkey: "TR", "hong kong": "HK", korea: "KR", usa: "US", "united states of america": "US", uk: "GB", england: "GB", britain: "GB", "great britain": "GB", "soviet union": "RU", taiwan: "TW", "czech republic": "CZ" };
const REGION_BY_NAME = new Map(Object.entries(REGION_ALIASES));
for (const a of LETTERS) for (const b of LETTERS) {
    if (RETIRED.has(a + b)) continue;
    const name = regionName.of(a + b);
    if (name && name !== a + b && !REGION_BY_NAME.has(name.toLowerCase())) REGION_BY_NAME.set(name.toLowerCase(), a + b);
}
const LANGUAGE_CODES = ["en", "ko", "ja", "fr", "tr", "it", "es", "de", "hi", "zh", "cn", "fa", "ru", "pt", "da", "sv", "no", "fi", "th", "el", "pl", "hu", "ar", "ta", "te", "ml", "is", "nb"];
const LANGUAGE_BY_NAME = new Map(LANGUAGE_CODES.map((c) => [languageName.of(c)?.toLowerCase(), c]));

/**
 * @param {string} query Kullanıcının tarifi (Türkçe / İngilizce)
 * @param {string} [doc] LLM'in film belgesi
 * @returns {{ decades: number[], countries: string[], languages: string[] }}
 */
export function parseConditions(query, doc) {
    const decades = new Set(decadesFromText(query));
    const countries = new Set(), languages = new Set();
    const setting = settingLine(doc);
    for (const part of setting.split(/[·,]/).map((p) => p.trim().toLowerCase()).filter(Boolean)) {
        const lang = LANGUAGE_BY_NAME.get(part.replace(/-language$/, "").replace(/ language$/, ""));
        if (lang && /language/.test(part)) languages.add(lang);
        else if (REGION_BY_NAME.has(part)) countries.add(REGION_BY_NAME.get(part));
    }
    const words = String(query).toLocaleLowerCase("tr");
    const tokens = words.split(/[^\p{L}]+/u).filter(Boolean);
    for (const [stem, codes, langs] of COUNTRY_STEMS) {
        const hit = stem.includes(" ") ? words.includes(stem)
            : EXACT.has(stem) ? tokens.includes(stem)
            : tokens.some((t) => t.startsWith(stem) && !(EXCLUDE[stem] ?? []).some((x) => t.startsWith(x)));
        if (hit) { codes.forEach((c) => countries.add(c)); langs.forEach((l) => languages.add(l)); }
    }
    return { decades: [...decades].sort(), countries: [...countries].sort(), languages: [...languages].sort() };
}

/** Filmin dönem şartına uyumu: o on yılda 1, sınıra 3 yıl yakınsa 0,5, değilse 0. Şart yoksa null. */
export function eraFit(year, decades) {
    if (!decades.length || !year) return decades.length ? 0 : null;
    let best = 0;
    for (const d of decades) {
        if (year >= d && year <= d + 9) return 1;
        if (year >= d - 3 && year <= d + 12) best = 0.5;
    }
    return best;
}

/** Filmin ülke / dil şartına uyumu: ülkesi veya dili eşleşiyorsa 1, değilse 0. Şart yoksa null. */
export function countryFit(countries, language, conditions) {
    if (!conditions.countries.length && !conditions.languages.length) return null;
    if ((countries ?? []).some((c) => conditions.countries.includes(c))) return 1;
    return language && conditions.languages.includes(language) ? 1 : 0;
}
