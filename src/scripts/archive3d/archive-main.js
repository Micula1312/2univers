import { initArchiveOrbitScene } from "./archive-scene-orbit.js";
import { initUI } from "../ui/ui.js";
import { showPreloader, hidePreloader } from "../ui/preloader.js";

export async function initArchiveApp() {
  const archiveContainer = document.getElementById("archive");
  const appRoot = document.getElementById("app");

  if (!archiveContainer) {
    console.warn("Archive app: #archive non trovato");
    return;
  }

  appRoot?.classList.remove("is-scene-ready", "is-ui-ready");

  showPreloader();

  const syncMobileViewport = () => {
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    if (appRoot) {
      appRoot.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
    }
  };

  syncMobileViewport();
  window.addEventListener("resize", syncMobileViewport, { passive: true });
  window.visualViewport?.addEventListener("resize", syncMobileViewport, { passive: true });
  window.visualViewport?.addEventListener("scroll", syncMobileViewport, { passive: true });

  const scene = await initArchiveOrbitScene({
    container: archiveContainer,
    dataUrl: "/data/archive.json"
  });

  let ui = null;

  ui = initUI({
    assets: {
      plus: "images/assets/btn-plus.png",
      minus: "images/assets/btn-MINUS.png",
      reset: "images/assets/btn-RESET.png",
      archive: "images/assets/btn-ARCHIVE.png",
      cosmic: "images/assets/btn-COSMIC.png"
    },

    onZoomIn: () => {
      scene.zoomIn();
    },

    onZoomOut: () => {
      scene.zoomOut();
    },

    onReset: () => {
      scene.resetView();
      ui?.setMode("cosmic");
    },

    onArchiveMode: () => {
      scene.setArchiveMode();
      ui?.setMode("archive");
    },

    onCosmicMode: () => {
      scene.setCosmicMode();
      ui?.setMode("cosmic");
    }
  });

  ui?.setMode("cosmic");

  window.setTimeout(() => {
    appRoot?.classList.add("is-scene-ready");
  }, 2200);

  window.setTimeout(() => {
    appRoot?.classList.add("is-ui-ready");
  }, 2450);

  window.setTimeout(() => {
    hidePreloader();
  }, 2850);

  return {
    scene,
    ui,
    destroy: () => {
      window.removeEventListener("resize", syncMobileViewport);
      window.visualViewport?.removeEventListener("resize", syncMobileViewport);
      window.visualViewport?.removeEventListener("scroll", syncMobileViewport);
      scene.destroy?.();
    }
  };
}