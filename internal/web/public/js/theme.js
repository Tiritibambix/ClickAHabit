// Light/dark quick toggle (persisted client-side, overrides server default)
// + active nav-link highlighting. Loaded in <head> before body paints,
// so the theme attribute is set with no flash of the wrong theme.
(function () {
    try {
        var stored = localStorage.getItem('cah-theme');
        if (stored === 'light' || stored === 'dark') {
            document.documentElement.setAttribute('data-bs-theme', stored);
        }
    } catch (e) { /* storage unavailable (private mode, etc.) — keep server default */ }
})();

function applyThemeToggleIcon() {
    var icon = document.getElementById('themeToggleIcon');
    if (!icon) return;
    var isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

function initThemeToggle() {
    applyThemeToggleIcon();
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', next);
        try { localStorage.setItem('cah-theme', next); } catch (e) { /* ignore */ }
        applyThemeToggleIcon();
    });
}

function initActiveNav() {
    var path = window.location.pathname;
    var links = document.querySelectorAll('.app-navbar [data-nav]');
    var best = null;
    links.forEach(function (link) {
        var match = link.getAttribute('data-nav-match') || link.getAttribute('href');
        if (!match) return;
        if (match === '/') {
            if (path === '/') best = link;
            return;
        }
        if (path.indexOf(match) === 0) best = link;
    });
    if (best) best.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    initActiveNav();
});
