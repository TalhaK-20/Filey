function formatBytes(bytes) {
  bytes = Number(bytes) || 0;
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function applyFormatting() {
  document.querySelectorAll('.js-filesize').forEach((el) => {
    const bytes = el.dataset.bytes;
    if (bytes !== undefined) el.textContent = formatBytes(bytes);
  });
  document.querySelectorAll('.js-date').forEach((el) => {
    const date = el.dataset.date;
    if (date) el.textContent = formatDate(date);
  });
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Eases small integer stats (files shared, downloads, users, reports) up from 0 on
// load instead of having them just appear — skipped entirely under reduced motion.
function animateCounters() {
  const counters = document.querySelectorAll('.js-count');
  if (!counters.length) return;
  const reduce = prefersReducedMotion();

  counters.forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    if (Number.isNaN(target)) return;
    if (reduce || target === 0) {
      el.textContent = target.toLocaleString();
      return;
    }

    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

// Elevates the sticky header once the page has scrolled past it, so it reads as
// "lifted" above the content rather than flatly overlapping it.
function setupHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

// Full-page-navigation forms (login/register/search filters) always end in either
// a fresh page load or a server-rendered error page, so a loading class needs no
// manual cleanup — it's simply gone once the next page's HTML replaces this one.
function setupFormLoadingState() {
  document.querySelectorAll('.auth-form, .filter-form').forEach((form) => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.classList.add('is-loading');
    });
  });
}

function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.textContent = message;
  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };
  setTimeout(dismiss, duration);
}

window.formatBytes = formatBytes;
window.formatDate = formatDate;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', () => {
  applyFormatting();
  animateCounters();
  setupHeaderScroll();
  setupFormLoadingState();
});
