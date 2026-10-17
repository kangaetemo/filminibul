export const DESCRIPTION_MAX: number;
export function buildFilmSnippet(film: {
    title: string;
    year?: number | null;
    overview?: string | null;
    similarTitles?: string[];
    similarCount?: number;
    platforms?: string[];
}): { title: string; description: string };
