import {
  initArchiveCluster,
  setArchiveLayout
} from "./archive-scene.js";

export function initArchiveApp() {
  const clusterBtn = document.getElementById("viewCluster");
  const listBtn = document.getElementById("viewList");

  initArchiveCluster();

  document.querySelectorAll(".view-controls button")
    .forEach((b) => b.classList.remove("active"));

  clusterBtn?.classList.add("active");

  clusterBtn?.addEventListener("click", () => {
    setArchiveLayout("cluster");

    document.querySelectorAll(".view-controls button")
      .forEach((b) => b.classList.remove("active"));

    clusterBtn.classList.add("active");
  });

  listBtn?.addEventListener("click", () => {
    setArchiveLayout("list");

    document.querySelectorAll(".view-controls button")
      .forEach((b) => b.classList.remove("active"));

    listBtn.classList.add("active");
  });
}