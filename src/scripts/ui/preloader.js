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

  const dongfeng = preloader.querySelector(".preloader__dongfeng");
  const titleLeft = preloader.querySelector(".preloader__title-side--left");
  const titleRight = preloader.querySelector(".preloader__title-side--right");

  [dongfeng, titleLeft, titleRight].forEach((el) => {
    el?.classList.remove("is-visible", "is-hidden");
  });

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      dongfeng?.classList.add("is-visible");
    }, 80);

    window.setTimeout(() => {
      dongfeng?.classList.add("is-hidden");
    }, 800);

    window.setTimeout(() => {
      titleLeft?.classList.add("is-visible");
      titleRight?.classList.add("is-visible");
    }, 1200);
  });
}

export function hidePreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  preloader.classList.add("is-out");

  if (removeTimer) {
    window.clearTimeout(removeTimer);
  }

  removeTimer = window.setTimeout(() => {
    preloader.remove();
  }, 1100);
}