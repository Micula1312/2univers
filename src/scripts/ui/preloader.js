let removeTimer = null;

export function showPreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  if (removeTimer) {
    window.clearTimeout(removeTimer);
    removeTimer = null;
  }

  preloader.classList.remove("is-out");
  preloader.classList.add("is-active");
  preloader.style.pointerEvents = "none";

  const dongfeng = preloader.querySelector(".preloader__dongfeng");
  const core = preloader.querySelector(".preloader__core");
  const haloInner = preloader.querySelector(".preloader__core-halo--inner");
  const haloOuter = preloader.querySelector(".preloader__core-halo--outer");
  const titleLeft = preloader.querySelector(".preloader__title-side--left");
  const titleRight = preloader.querySelector(".preloader__title-side--right");
  const brandTop = preloader.querySelector(".preloader__brand--top");
  const brandBottom = preloader.querySelector(".preloader__brand--bottom");
  const controls = preloader.querySelector(".preloader__controls");

  [
    dongfeng,
    core,
    haloInner,
    haloOuter,
    titleLeft,
    titleRight,
    brandTop,
    brandBottom,
    controls
  ].forEach((el) => {
    el?.classList.remove("is-visible", "is-hidden", "is-materialized");
  });

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      dongfeng?.classList.add("is-visible");
    }, 80);

    window.setTimeout(() => {
      dongfeng?.classList.add("is-hidden");
    }, 650);

    window.setTimeout(() => {
      core?.classList.add("is-visible");
      haloInner?.classList.add("is-visible");
      haloOuter?.classList.add("is-visible");
    }, 900);

    window.setTimeout(() => {
      core?.classList.add("is-materialized");
    }, 1450);

    window.setTimeout(() => {
      titleLeft?.classList.add("is-visible");
      titleRight?.classList.add("is-visible");
      brandTop?.classList.add("is-visible");
    }, 1850);

    window.setTimeout(() => {
      brandBottom?.classList.add("is-visible");
      controls?.classList.add("is-visible");
    }, 2350);
  });
}

export function hidePreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  preloader.style.pointerEvents = "none";
  preloader.classList.add("is-out");

  if (removeTimer) {
    window.clearTimeout(removeTimer);
  }

  removeTimer = window.setTimeout(() => {
    preloader.remove();
  }, 1100);
}