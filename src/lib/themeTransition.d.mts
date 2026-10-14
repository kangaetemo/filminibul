export function createThemeTransition(document: Document, reducedMotion: () => boolean): {
    change(apply: () => void): void;
    dispose(): void;
};
