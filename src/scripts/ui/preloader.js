export function showPreloader() {

  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const left = preloader.querySelector(".kv-title-left");
  const right = preloader.querySelector(".kv-title-right");

  requestAnimationFrame(() => {
    left?.classList.add("is-visible");
    right?.classList.add("is-visible");
  });

}

export function hidePreloader() {

  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const left = preloader.querySelector(".kv-title-left");
  const right = preloader.querySelector(".kv-title-right");

  left?.classList.add("is-fade");
  right?.classList.add("is-fade");

  setTimeout(() => {
    preloader.classList.add("is-out");
  }, 400);

  setTimeout(() => {
    preloader.remove();
  }, 1400);

}