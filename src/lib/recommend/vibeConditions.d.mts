export interface VibeConditions { decades: number[]; countries: string[]; languages: string[] }
export function decadesFromText(text: string): number[];
export function parseConditions(query: string, doc?: string): VibeConditions;
export function eraFit(year: number | null | undefined, decades: number[]): number | null;
export function countryFit(countries: string[] | null | undefined, language: string | null | undefined, conditions: VibeConditions): number | null;
