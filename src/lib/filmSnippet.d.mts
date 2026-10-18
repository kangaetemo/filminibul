export const DESCRIPTION_MAX: number;
export function snippetTitles(similar: { title: string; collectionName?: string | null }[], collectionName: string | null | undefined): string[];
export function buildFilmSnippet(film: {
    title: string;
    year?: number | null;
    overview?: string | null;
    similarTitles?: string[];
    similarCount?: number;
    platforms?: string[];
}): { title: string; description: string };
