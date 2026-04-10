let preloaderEl = null;
let preloaderTimers = [];

function clearPreloaderTimers() {
  preloaderTimers.forEach(clearTimeout);
  preloaderTimers = [];
}

export function initKeyVisualPreloader() {
  clearPreloaderTimers();

  const existing = document.getElementById("kvPreloader");
  if (existing) existing.remove();

  const preloader = document.createElement("div");
  preloader.id = "kvPreloader";
  preloader.className = "kv-preloader";

  preloader.innerHTML = `
    <div class="kv-preloader__bg"></div>

    <img class="kv-logo kv-logo--top kv-step kv-step-1" src="/images/mhero-logo.png" alt="M-HERO">

    <div class="kv-title">
      <img class="kv-title__line kv-step kv-step-2" src="/images/two-natures.png" alt="Two Natures.">
      <img class="kv-title__line kv-step kv-step-3" src="/images/infinite-scapes.png" alt="Infinite Scapes">
    </div>

    <div class="kv-core-wrap kv-step kv-step-4">
      <div class="kv-orbit"></div>
      <div class="kv-core"></div>
      <div class="kv-satellite"></div>
    </div>

    <img class="kv-logo kv-logo--bottom kv-step kv-step-5" src="/images/voyah-logo.png" alt="Voyah">
    <img class="kv-side kv-step kv-step-5" src="/images/mdw-2026.png" alt="Milano Design Week 2026">
    <img class="kv-mark kv-step kv-step-5" src="/images/dongfeng-mark.png" alt="Dongfeng">
  `;

  document.body.appendChild(preloader);
  preloaderEl = preloader;

  const show = (selector, delay) => {
    const t = setTimeout(() => {
      const el = preloader.querySelector(selector);
      el?.classList.add("is-visible");
    }, delay);
    preloaderTimers.push(t);
  };

  const showAll = (selector, delay) => {
    const t = setTimeout(() => {
      preloader.querySelectorAll(selector).forEach((el) => {
        el.classList.add("is-visible");
      });
    }, delay);
    preloaderTimers.push(t);
  };

  show(".kv-step-1", 150);
  show(".kv-step-2", 700);
  show(".kv-step-3", 1200);
  show(".kv-step-4", 1850);
  showAll(".kv-step-5", 2600);
}

export function hideKeyVisualPreloader() {
  clearPreloaderTimers();

  const preloader = preloaderEl || document.getElementById("kvPreloader");
  if (!preloader) return;

  preloader.classList.add("is-out");

  const t = setTimeout(() => {
    preloader.remove();
    if (preloaderEl === preloader) preloaderEl = null;
  }, 1200);

  preloaderTimers.push(t);
}