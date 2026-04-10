export function initUI({
  assets = {},
  onZoomIn,
  onZoomOut,
  onReset,
  onArchiveMode,
  onCosmicMode
}) {
  const cameraControls = document.querySelector(".camera-controls");
  const viewControls = document.querySelector(".view-controls");

  if (!cameraControls || !viewControls) {
    console.warn("UI: camera-controls o view-controls non trovati");
    return null;
  }

  cameraControls.innerHTML = `
    <button id="zoomIn" class="ui-plus" type="button" aria-label="Zoom in">
      <img src="${assets.plus || ""}" alt="Zoom in" />
    </button>

    <button id="zoomOut" class="ui-minus" type="button" aria-label="Zoom out">
      <img src="${assets.minus || ""}" alt="Zoom out" />
    </button>

    <button id="resetView" class="ui-reset" type="button" aria-label="Reset view">
      <img src="${assets.reset || ""}" alt="Reset view" />
    </button>
  `;

  viewControls.innerHTML = `
    <button id="viewList" class="ui-archive btn" type="button" aria-label="Archive view">
      <img src="${assets.archive || ""}" alt="Archive view" />
    </button>

    <button id="viewCluster" class="ui-cosmic btn" type="button" aria-label="Cosmic view">
      <img src="${assets.cosmic || ""}" alt="Cosmic view" />
    </button>
  `;

  const plusBtn = cameraControls.querySelector(".ui-plus");
  const minusBtn = cameraControls.querySelector(".ui-minus");
  const resetBtn = cameraControls.querySelector(".ui-reset");

  const archiveBtn = viewControls.querySelector(".ui-archive");
  const cosmicBtn = viewControls.querySelector(".ui-cosmic");

  plusBtn?.addEventListener("click", () => onZoomIn?.());
  minusBtn?.addEventListener("click", () => onZoomOut?.());
  resetBtn?.addEventListener("click", () => onReset?.());

  archiveBtn?.addEventListener("click", () => onArchiveMode?.());
  cosmicBtn?.addEventListener("click", () => onCosmicMode?.());

  function setMode(mode) {
    archiveBtn?.classList.toggle("active", mode === "archive");
    cosmicBtn?.classList.toggle("active", mode === "cosmic");
  }

  return {
    setMode
  };
}