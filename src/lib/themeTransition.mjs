// Only explicit theme changes animate. Initial theme restoration stays instant.
export function createThemeTransition(document, reducedMotion) {
    let active = null, generation = 0, timer;
    const root = document.documentElement;
    const clear = () => { clearTimeout(timer); root.classList.remove("theme-colors-changing"); };
    return {
        change(apply) {
            const id = ++generation;
            active?.skipTransition(); clear();
            const update = () => { if (id === generation) apply(); };
            if (reducedMotion()) { update(); return; }
            if (typeof document.startViewTransition === "function") {
                try {
                    const transition = document.startViewTransition(update);
                    active = transition;
                    void transition.ready?.catch(() => {});
                    // A skipped transition still runs its callback. The generation
                    // gate prevents an older callback from restoring the wrong theme.
                    void transition.finished.catch(() => {}).then(() => { if (active === transition) active = null; });
                    return;
                } catch { /* Older implementations can reject synchronously. */ }
            }
            root.classList.add("theme-colors-changing");
            void root.offsetWidth;
            update(); timer = setTimeout(clear, 260);
        },
        dispose() { generation++; active?.skipTransition(); clear(); },
    };
}
