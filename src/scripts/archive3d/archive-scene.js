import * as THREE from "three";

export function initArchive() {
  const container = document.getElementById("archive");
  if (!container) return;

  const sheet = document.getElementById("trackSheet");
  const closeSheetBtn = document.getElementById("closeSheet");
  const titleEl = document.getElementById("trackTitle");
  const metaEl = document.getElementById("trackMeta");
  const fakePlayBtn = document.getElementById("fakePlay");

  const zoomInBtn = document.getElementById("zoomIn");
  const zoomOutBtn = document.getElementById("zoomOut");
  const resetViewBtn = document.getElementById("resetView");

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.set(0, 6, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 1);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 2.5, 200);
  pointLight.position.set(8, 10, 14);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 1.2, 200);
  pointLight2.position.set(-10, -6, 10);
  scene.add(pointLight2);

  const coreGeometry = new THREE.SphereGeometry(0.95, 40, 40);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    metalness: 0.1,
    roughness: 0.35
  });

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  const RAYS = 7;
  const TRACKS_PER_RAY = 12;
  const STEP_DISTANCE = 1.55;

  const sphereGeometry = new THREE.SphereGeometry(0.38, 24, 24);

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xbfbfbf
  });

  const trackMeshes = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let hoveredSphere = null;
  let selectedSphere = null;

  let time = 0;
  let cameraRadius = 20;
  let targetCameraRadius = 20;

  let pinchStartDistance = 0;
    let pinchStartRadius = 20;

  const CAMERA_MIN = 10;
  const CAMERA_MAX = 32;
  const CAMERA_DEFAULT = 20;

  for (let r = 0; r < RAYS; r++) {
    const angle = (r / RAYS) * Math.PI * 2;

    const dir = new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle) * 0.7,
      Math.sin(angle * 1.7) * 0.45
    ).normalize();

    const endPoint = dir.clone().multiplyScalar(TRACKS_PER_RAY * STEP_DISTANCE + 1);

    const points = [new THREE.Vector3(0, 0, 0), endPoint];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    for (let t = 0; t < TRACKS_PER_RAY; t++) {
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        emissive: 0x666666,
        emissiveIntensity: 0.25,
        metalness: 0.15,
        roughness: 0.45
      });

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

      const distance = (t + 1) * STEP_DISTANCE;

      const wobble = new THREE.Vector3(
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12,
        (Math.random() - 0.5) * 0.12
      );

      sphere.position.copy(dir.clone().multiplyScalar(distance).add(wobble));

      sphere.userData = {
        ray: r,
        slot: t,
        title: `Nome di una stella ${String(t + 1).padStart(2, "0")}:00`,
        meta: `Day ${r + 1} · Slot ${t + 1}`,
        pulseOffset: Math.random() * Math.PI * 2
      };

      trackMeshes.push(sphere);
      scene.add(sphere);
    }
  }

  function openSheet(data) {
    if (!sheet || !titleEl || !metaEl) return;
    titleEl.textContent = data.title;
    metaEl.textContent = data.meta;
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    selectedSphere = null;
  }

  function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
    }

  closeSheetBtn?.addEventListener("click", closeSheet);

  fakePlayBtn?.addEventListener("click", () => {
    fakePlayBtn.textContent =
      fakePlayBtn.textContent === "Play" ? "Pause" : "Play";
  });

  zoomInBtn?.addEventListener("click", () => {
    targetCameraRadius = Math.max(CAMERA_MIN, targetCameraRadius - 3);
  });

  zoomOutBtn?.addEventListener("click", () => {
    targetCameraRadius = Math.min(CAMERA_MAX, targetCameraRadius + 3);
  });

  resetViewBtn?.addEventListener("click", () => {
    targetCameraRadius = CAMERA_DEFAULT;
  });

  function setPointerFromEvent(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickSphere(clientX, clientY) {
    setPointerFromEvent(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(trackMeshes, false);
    return intersects.length ? intersects[0].object : null;
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    const hit = pickSphere(event.clientX, event.clientY);
    hoveredSphere = hit || null;
    renderer.domElement.style.cursor = hit ? "pointer" : "default";
  });

  renderer.domElement.addEventListener("click", (event) => {
    const hit = pickSphere(event.clientX, event.clientY);
    if (!hit) return;

    selectedSphere = hit;
    openSheet(hit.userData);
  });

    renderer.domElement.addEventListener(
        "touchstart",
        (event) => {
            if (event.touches.length === 2) {
            pinchStartDistance = getTouchDistance(event.touches[0], event.touches[1]);
            pinchStartRadius = targetCameraRadius;
            return;
            }

            if (event.touches.length === 1) {
            const touch = event.touches[0];
            if (!touch) return;

            const hit = pickSphere(touch.clientX, touch.clientY);
            if (!hit) return;

            selectedSphere = hit;
            openSheet(hit.userData);
            }
        },
        { passive: true }
        );

    renderer.domElement.addEventListener(
        "touchmove",
        (event) => {
            if (event.touches.length !== 2) return;

            const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
            const delta = currentDistance - pinchStartDistance;

            // Più sensibile o meno sensibile:
            const zoomFactor = 0.03;

            targetCameraRadius = pinchStartRadius - delta * zoomFactor;
            targetCameraRadius = Math.max(CAMERA_MIN, Math.min(CAMERA_MAX, targetCameraRadius));
        },
        { passive: true }
        );

        renderer.domElement.addEventListener(
  "touchend",
  () => {
    pinchStartDistance = 0;
  },
  { passive: true }
);

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", onResize);

  function animate() {
    requestAnimationFrame(animate);

    time += 0.005;

    cameraRadius += (targetCameraRadius - cameraRadius) * 0.08;

    camera.position.x = Math.cos(time * 0.35) * cameraRadius;
    camera.position.z = Math.sin(time * 0.35) * cameraRadius;
    camera.position.y = 5 + Math.sin(time * 0.2) * 1.5;
    camera.lookAt(0, 0, 0);

    const corePulse = 1 + Math.sin(time * 2.2) * 0.04;
    core.scale.setScalar(corePulse);

    for (const sphere of trackMeshes) {
      const basePulse = 1 + Math.sin(time * 2 + sphere.userData.pulseOffset) * 0.08;

      let targetScale = basePulse;
      let emissive = 0.25;

      if (sphere === hoveredSphere) {
        targetScale = basePulse + 0.22;
        emissive = 0.8;
      }

      if (sphere === selectedSphere) {
        targetScale = basePulse + 0.32;
        emissive = 1.2;
      }

      sphere.scale.setScalar(targetScale);
      sphere.material.emissiveIntensity = emissive;
    }

    renderer.render(scene, camera);
  }

  animate();
}