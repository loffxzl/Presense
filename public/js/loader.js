// Global loader: blocks the page while it loads / navigates / runs a request.
//
//   Loader.show('Placing your order')   Loader.hide()   Loader.reset()
//   await Loader.run(() => fetch(...), { label: 'Saving' })   // overlay
//   await Loader.button(btn, () => fetch(...))                // button spinner only
//
// Opt out on any link or form with: data-loader="off"
(() => {
    const el = document.getElementById('app-loader');
    if (!el) return;

    const labelEl = el.querySelector('[data-loader-label]');
    const MAX_MS = 12000; // safety net: never leave the user stuck
    let count = 0;
    let safetyTimer = null;

    // While blocked, stop keyboard users from activating things underneath.
    const blockKeys = (e) => {
        if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') e.preventDefault();
    };

    const activate = (label) => {
        if (labelEl) labelEl.textContent = label || '';
        el.classList.add('is-active');
        document.documentElement.setAttribute('aria-busy', 'true');
        document.addEventListener('keydown', blockKeys, true);
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(reset, MAX_MS);
    };

    const deactivate = () => {
        el.classList.remove('is-active');
        document.documentElement.removeAttribute('aria-busy');
        document.removeEventListener('keydown', blockKeys, true);
        clearTimeout(safetyTimer);
        if (labelEl) labelEl.textContent = '';
    };

    const show = (label) => {
        count += 1;
        if (count === 1) activate(label);
        else if (label && labelEl) labelEl.textContent = label;
    };

    const hide = () => {
        count = Math.max(0, count - 1);
        if (count === 0) deactivate();
    };

    function reset() {
        count = 0;
        deactivate();
    }

    // Wraps an async job: shows the overlay, always hides it afterwards.
    const run = async (job, { label } = {}) => {
        show(label);
        try {
            return await (typeof job === 'function' ? job() : job);
        } finally {
            hide();
        }
    };

    // Button-level spinner for small actions (add to cart, wishlist...).
    const button = async (btn, job) => {
        if (!btn || btn.classList.contains('is-busy')) return;
        btn.classList.add('is-busy');
        btn.setAttribute('aria-busy', 'true');
        try {
            return await (typeof job === 'function' ? job() : job);
        } finally {
            btn.classList.remove('is-busy');
            btn.removeAttribute('aria-busy');
        }
    };

    window.Loader = { show, hide, reset, run, button };

    // ---- 1. Initial page load (overlay is rendered active in the markup) ----
    if (el.classList.contains('is-active')) {
        count = 1;
        activate();
        if (document.readyState === 'complete') hide();
        else window.addEventListener('load', hide, { once: true });
    }

    // ---- 2. Navigation: internal link clicks ----
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download') || a.dataset.loader === 'off') return;

        let url;
        try { url = new URL(a.href, location.href); } catch { return; }
        if (!/^https?:$/.test(url.protocol)) return;
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.search === location.search) return; // hash / same page

        show();
    });

    // ---- 3. Normal form submits (forms handled with fetch call preventDefault) ----
    document.addEventListener('submit', (e) => {
        if (e.defaultPrevented) return;
        const form = e.target;
        if (!form || form.dataset.loader === 'off') return;
        show(form.dataset.loaderLabel);
    });

    // ---- 4. Back/forward cache: page restored with the overlay still on ----
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) reset();
    });
})();