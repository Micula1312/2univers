export function showPreloader() {
  const preloader = document.querySelector(".kv-preloader");
  if (!preloader) return;
  preloader.classList.remove("is-out");
}

export function hidePreloader() {
  const preloader = document.querySelector(".kv-preloader");
  if (!preloader) return;

  preloader.classList.add("is-out");

  window.setTimeout(() => {
    preloader.remove();
  }, 1200);
}