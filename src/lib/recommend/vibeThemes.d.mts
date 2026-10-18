export interface ThemeMatch { theme: string; keyword: string; similarity: number; weight: number }
export const MATCH_MIN: number;
export function themeTokens(text: string): string[];
export function phraseSimilarity(a: string, b: string): number;
export function matchThemes(themes: string[], keywords: string[] | null | undefined, options?: { hidden?: Set<string>; idf?: (keyword: string) => number }): ThemeMatch[];
export function themeCoverage(matches: ThemeMatch[], themeCount: number): number;
