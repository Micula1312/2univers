import * as THREE from "three";

const DEFAULTS = {
  totalDays: 8,
  slotsPerDay: 8,

  innerRadius: 3.2,
  orbitGap: 1.45,

  sphereRadius: 0.22,
  sphereSegments: 24,

  orbitOpacity: 0.22,
  orbitColor: 0xe7e0d2,

  sphereOpacity: 1,

  cosmicCameraZ: 16,
  archiveCameraZ: 18.5,

  zoomMin: 9,
  zoomMax: 28,
  zoomStep: 2.2,

  transitionSpeed: 0.08
};

export async function initArchiveOrbitScene({
  container,
  dataUrl = "/data/archive.json",
  options = {}
}) {
  if (!container) {
    throw new Error("initArchiveOrbitScene: container mancante");
  }

  const settings = { ...DEFAULTS, ...options };

  const labelLayer = document.getElementById("labelLayer");
  if (labelLayer) labelLayer.innerHTML = "";

  const sheet = document.getElementById("trackSheet");
  const closeSheetBtn = document.getElementById("closeSheet");
  const titleEl = document.getElementById("trackTitle");
  const metaEl = document.getElementById("trackMeta");
  const fakePlayBtn = document.getElementById("fakePlay");

  const progressEl = document.getElementById("trackProgress");
  const shareBtn = document.getElementById("shareTrack");
  const downloadBtn = document.getElementById("downloadTrack");

  let currentAudio = null;
  let currentTrackData = null;

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  container.innerHTML = "";

  let bgOverlay = document.createElement("div");
  bgOverlay.className = "bg-texture-overlay";
  container.appendChild(bgOverlay);

  const overlayImages = [
    "/images/bg-overlay-1.jpg",
    "/images/bg-overlay-2.jpg",
    "/images/bg-overlay-3.jpg"
  ];

  const randomOverlay =
    overlayImages[Math.floor(Math.random() * overlayImages.length)];

  bgOverlay.style.backgroundImage = `url("${randomOverlay}")`;

  let frame = document.createElement("div");
  frame.className = "keyvisual-frame";
  frame.innerHTML = `
    <img class="center-logo center-logo--top" src="/images/mhero-logo.png" alt="">
    <img class="center-logo center-logo--bottom" src="/images/voyah-logo.png" alt="">
  `;
  container.appendChild(frame);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.set(0, 0, settings.cosmicCameraZ);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 2.2, 200);
  pointLight.position.set(8, 10, 14);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 1.0, 200);
  pointLight2.position.set(-10, -6, 10);
  scene.add(pointLight2);

  const hemi = new THREE.HemisphereLight(0xd8c6a6, 0x31466f, 1.0);
  scene.add(hemi);

  const archiveGroup = new THREE.Group();
  scene.add(archiveGroup);

  const orbitGroup = new THREE.Group();
  const trackGroup = new THREE.Group();
  archiveGroup.add(orbitGroup);
  archiveGroup.add(trackGroup);

  const textureLoader = new THREE.TextureLoader();
  const coreMap = textureLoader.load("/images/core-texture.png");
  coreMap.colorSpace = THREE.SRGBColorSpace;

  const coreGeometry = new THREE.SphereGeometry(1.15, 48, 48);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    map: coreMap,
    color: 0xc29a61,
    emissive: 0x3a2915,
    emissiveIntensity: 0.14,
    metalness: 0.08,
    roughness: 0.92,
    clearcoat: 0.02,
    clearcoatRoughness: 1
  });

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  const haloMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xf5e7c8,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.set(5.6, 5.6, 1);
  scene.add(halo);

  const haloOuterMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xf2e2c5,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const haloOuter = new THREE.Sprite(haloOuterMaterial);
  haloOuter.scale.set(9.5, 9.5, 1);
  scene.add(haloOuter);

  const orbitMaterial = new THREE.LineBasicMaterial({
    color: settings.orbitColor,
    transparent: true,
    opacity: settings.orbitOpacity
  });

  const sphereGlowTexture = createGlowTexture();

  const trackMeshes = [];
  const dayLabels = [];

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let archiveData = [];
  let hoveredSphere = null;
  let selectedSphere = null;

  let animationId = null;
  let layoutMode = "cosmic";
  let layoutTarget = 0;
  let layoutLerp = 0;

  let time = 0;
  let cameraRadius = settings.cosmicCameraZ;
  let targetCameraRadius = settings.cosmicCameraZ;

  let targetListScrollY = 0;
  let listScrollY = 0;

  let pinchStartDistance = 0;
  let pinchStartRadius = settings.cosmicCameraZ;

  let isListDragging = false;
  let lastTouchY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;

  const CAMERA_MIN = settings.zoomMin;
  const CAMERA_MAX = settings.zoomMax;
  const CAMERA_DEFAULT = settings.cosmicCameraZ;

  const daysPerColumn = 4;
  const columnGap = 6.5;
  const itemGap = 0.78;
  const dayGap = 2.5;
  const labelGap = 1.0;

  const columnHeight =
    daysPerColumn * settings.slotsPerDay * itemGap +
    (daysPerColumn - 1) * (dayGap - itemGap);

  const listTopY = columnHeight / 2;
  const visibleListHeight = 18;
  const maxListScroll = Math.max(0, (columnHeight - visibleListHeight) / 2);

  async function loadArchiveData() {
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      archiveData = Array.isArray(json?.tracks) ? json.tracks : [];
    } catch (error) {
      console.error("Errore caricamento archive.json:", error);
      archiveData = [];
    }
  }

  await loadArchiveData();

  buildOrbitSystem();
  bindUI();
  onResize();
  animate();

  function buildOrbitSystem() {
    clearGroup(orbitGroup);
    clearGroup(trackGroup);
    trackMeshes.length = 0;
    dayLabels.length = 0;
    if (labelLayer) labelLayer.innerHTML = "";

    for (let day = 0; day < settings.totalDays; day++) {
      const radius = settings.innerRadius + day * settings.orbitGap;
      const ring = createOrbitRing(radius);
      orbitGroup.add(ring);
    }

    for (let day = 0; day < settings.totalDays; day++) {
      for (let slot = 0; slot < settings.slotsPerDay; slot++) {
        const mesh = createTrackSphere(day, slot);
        trackGroup.add(mesh);
        trackMeshes.push(mesh);
      }
    }

    for (let day = 0; day < settings.totalDays; day++) {
      const label = document.createElement("div");
      label.className = "day-label";
      label.textContent = `DAY ${day + 1}`;
      label.style.opacity = "0";
      labelLayer?.appendChild(label);

      const firstSphere = trackMeshes[day * settings.slotsPerDay];

      dayLabels.push({
        el: label,
        anchor: new THREE.Vector3(
          firstSphere.userData.listPosition.x,
          firstSphere.userData.listPosition.y + labelGap,
          0
        )
      });
    }
  }

  function createOrbitRing(radius, segments = 128) {
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = orbitMaterial.clone();

    return new THREE.LineLoop(geometry, material);
  }

  function createTrackSphere(dayIndex, slotIndex) {
    const geometry = new THREE.SphereGeometry(
      settings.sphereRadius,
      settings.sphereSegments,
      settings.sphereSegments
    );

    const trackData =
      archiveData.find((item) => {
        const d = (item.dayIndex ?? item.day ?? 0);
        const s = (item.slotIndex ?? item.slot ?? 0);

        return d === dayIndex || d === dayIndex + 1
          ? s === slotIndex || s === slotIndex + 1
          : false;
      }) || null;

    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f4ea,
      emissive: 0xfff4e6,
      emissiveIntensity: 0.14,
      metalness: 0.12,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      reflectivity: 1,
      transparent: true,
      opacity: settings.sphereOpacity
    });

    const mesh = new THREE.Mesh(geometry, sphereMaterial);

    const sphereGlowMaterial = new THREE.SpriteMaterial({
      map: sphereGlowTexture,
      color: 0xfff8ee,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const sphereGlow = new THREE.Sprite(sphereGlowMaterial);
    sphereGlow.scale.set(2.2, 2.2, 1);
    mesh.add(sphereGlow);

    const orbitPos = getOrbitPosition(dayIndex, slotIndex);
    const listPos = getListPosition(dayIndex, slotIndex);

    mesh.position.copy(orbitPos);

    mesh.userData = {
      dayIndex,
      slotIndex,
      title:
        trackData?.title || `Track ${String(slotIndex + 1).padStart(2, "0")}`,
      meta: trackData
        ? `Day ${trackData.dayIndex ?? trackData.day ?? dayIndex + 1} · Slot ${trackData.slotIndex ?? trackData.slot ?? slotIndex + 1}`
        : `Day ${dayIndex + 1} · Slot ${slotIndex + 1}`,
      trackData,
      orbitPosition: orbitPos.clone(),
      listPosition: listPos.clone()
    };

    return mesh;
  }

  function getOrbitPosition(dayIndex, slotIndex) {
    const radius = settings.innerRadius + dayIndex * settings.orbitGap;
    const rotationOffset = 61; // circa 18°
    const angle =
      (slotIndex / settings.slotsPerDay) * Math.PI * 2 - Math.PI / 2 + rotationOffset;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    );
  }

  function getListPosition(dayIndex, slotIndex) {
    const columnIndex = dayIndex < daysPerColumn ? 0 : 1;
    const rowInColumn = dayIndex % daysPerColumn;

    const listIndexBeforeDay = rowInColumn * settings.slotsPerDay;
    const extraOffset = rowInColumn * (dayGap - itemGap);
    const absoluteIndex = listIndexBeforeDay + slotIndex;

    const listY = listTopY - (absoluteIndex * itemGap + extraOffset);
    const listX = columnIndex === 0 ? -columnGap / 2 : columnGap / 2;

    return new THREE.Vector3(listX, listY, 0);
  }

  function openSheet(data) {
    if (!sheet || !titleEl || !metaEl) return;

    currentTrackData = data.trackData || null;

    titleEl.textContent = data.title;
    metaEl.textContent = data.meta;

    if (progressEl) {
      progressEl.value = 0;
    }

    if (downloadBtn) {
      if (currentTrackData?.audio) {
        downloadBtn.href = currentTrackData.audio;
        downloadBtn.setAttribute("download", "");
        downloadBtn.style.pointerEvents = "auto";
        downloadBtn.style.opacity = "1";
      } else {
        downloadBtn.href = "#";
        downloadBtn.removeAttribute("download");
        downloadBtn.style.pointerEvents = "none";
        downloadBtn.style.opacity = "0.45";
      }
    }

    if (fakePlayBtn) {
      fakePlayBtn.disabled = !currentTrackData?.audio;
      fakePlayBtn.textContent =
        currentAudio && !currentAudio.paused ? "Pause" : "Play";
    }

    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  }

  function closeSheet(event) {
    event?.stopPropagation();
    event?.preventDefault();

    if (!sheet) return;

    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");

    selectedSphere = null;
    hoveredSphere = null;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    if (fakePlayBtn) fakePlayBtn.textContent = "Play";
    if (progressEl) progressEl.value = 0;
    if (shareBtn) shareBtn.textContent = "Condividi";
  }

  function bindUI() {
    closeSheetBtn?.addEventListener("click", closeSheet);
    closeSheetBtn?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    sheet?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    fakePlayBtn?.addEventListener("click", async () => {
      if (!currentTrackData?.audio) return;

      const absoluteAudioUrl = new URL(currentTrackData.audio, window.location.origin).toString();

      if (!currentAudio || currentAudio.src !== absoluteAudioUrl) {
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        currentAudio = new Audio(currentTrackData.audio);
        currentAudio.preload = "auto";

        currentAudio.addEventListener("timeupdate", () => {
          if (!progressEl || !currentAudio?.duration) return;
          progressEl.value = (currentAudio.currentTime / currentAudio.duration) * 100;
        });

        currentAudio.addEventListener("loadedmetadata", () => {
          if (progressEl) progressEl.value = 0;
        });

        currentAudio.addEventListener("ended", () => {
          if (fakePlayBtn) fakePlayBtn.textContent = "Play";
          if (progressEl) progressEl.value = 0;
        });
      }

      if (currentAudio.paused) {
        try {
          await currentAudio.play();
          fakePlayBtn.textContent = "Pause";
        } catch (err) {
          console.error("Errore riproduzione audio:", err);
        }
      } else {
        currentAudio.pause();
        fakePlayBtn.textContent = "Play";
      }
    });



    progressEl?.addEventListener("input", () => {
      if (!currentAudio || !currentAudio.duration) return;
      const nextTime = (Number(progressEl.value) / 100) * currentAudio.duration;
      currentAudio.currentTime = nextTime;
    });

    shareBtn?.addEventListener("click", async () => {
      if (!currentTrackData?.audio) return;

      const shareUrl = new URL(currentTrackData.audio, window.location.origin).toString();
      const shareTitle = titleEl?.textContent || "Audio track";

      try {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: metaEl?.textContent || "",
            url: shareUrl
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          shareBtn.textContent = "Link copiato";
          window.setTimeout(() => {
            shareBtn.textContent = "Condividi";
          }, 1400);
        }
      } catch (error) {
        console.error("Errore condivisione:", error);
      }
    });

    let lastTapTime = 0;

      renderer.domElement.addEventListener(
        "touchend",
        (event) => {
          const now = Date.now();
          const tapGap = now - lastTapTime;

          if (tapGap > 0 && tapGap < 300) {
            event.preventDefault();
          }

          lastTapTime = now;
        },
        { passive: false }
      );

    renderer.domElement.addEventListener("pointermove", (event) => {
      const hit = pickSphere(event.clientX, event.clientY);
      hoveredSphere = hit || null;
      renderer.domElement.style.cursor = hit ? "pointer" : "default";
    });

    renderer.domElement.addEventListener("click", (event) => {
      const hit = pickSphere(event.clientX, event.clientY);
      if (!hit) return;

      const isSheetOpen = sheet?.classList.contains("is-open");

      if (isSheetOpen && selectedSphere === hit) {
        closeSheet();
        return;
      }

      selectedSphere = hit;
      openSheet(hit.userData);
    });

    renderer.domElement.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          isListDragging = false;
          pinchStartDistance = getTouchDistance(event.touches[0], event.touches[1]);
          pinchStartRadius = targetCameraRadius;
          return;
        }

        if (event.touches.length === 1) {
          const touch = event.touches[0];

          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          touchMoved = false;

          if (layoutMode === "archive") {
            isListDragging = true;
            lastTouchY = touch.clientY;
            return;
          }

          const hit = pickSphere(touch.clientX, touch.clientY);
          if (!hit) return;

          const isSheetOpen = sheet?.classList.contains("is-open");

          if (isSheetOpen && selectedSphere === hit) {
            closeSheet();
            return;
          }

          selectedSphere = hit;
          openSheet(hit.userData);
        }
      },
      { passive: true }
    );

    renderer.domElement.addEventListener(
      "touchmove",
      (event) => {
        if (layoutMode === "archive" && event.touches.length === 1 && isListDragging) {
          const touch = event.touches[0];
          const deltaY = touch.clientY - lastTouchY;

          if (
            Math.abs(touch.clientY - touchStartY) > 8 ||
            Math.abs(touch.clientX - touchStartX) > 8
          ) {
            touchMoved = true;
          }

          lastTouchY = touch.clientY;

          targetListScrollY -= deltaY * 0.03;
          targetListScrollY = THREE.MathUtils.clamp(
            targetListScrollY,
            -maxListScroll,
            maxListScroll
          );
          return;
        }

        if (event.touches.length !== 2) return;

        const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
        const delta = currentDistance - pinchStartDistance;
        const zoomFactor = 0.03;

        targetCameraRadius = pinchStartRadius - delta * zoomFactor;
        targetCameraRadius = Math.max(CAMERA_MIN, Math.min(CAMERA_MAX, targetCameraRadius));
      },
      { passive: true }
    );

    renderer.domElement.addEventListener(
      "touchend",
      (event) => {
        if (layoutMode === "archive" && !touchMoved) {
          const touch = event.changedTouches[0];
          const hit = pickSphere(touch.clientX, touch.clientY);
          if (hit) {
            selectedSphere = hit;
            openSheet(hit.userData);
          }
        }

        pinchStartDistance = 0;
        isListDragging = false;
      },
      { passive: true }
    );

    renderer.domElement.addEventListener(
      "wheel",
      (event) => {
        if (layoutMode !== "archive") return;

        event.preventDefault();
        targetListScrollY += event.deltaY * 0.01;
        targetListScrollY = THREE.MathUtils.clamp(
          targetListScrollY,
          -maxListScroll,
          maxListScroll
        );
      },
      { passive: false }
    );

    window.addEventListener("resize", onResize);
  }

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

  function getTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function updateLayout() {
    layoutLerp += (layoutTarget - layoutLerp) * settings.transitionSpeed;

    for (const sphere of trackMeshes) {
      const orbitPosition = sphere.userData.orbitPosition;
      const listPosition = sphere.userData.listPosition.clone();
      listPosition.y += listScrollY;

      sphere.position.lerpVectors(orbitPosition, listPosition, layoutLerp);

      let targetScale = 1.22;
      let emissive = 0.7;

      if (sphere === hoveredSphere) {
        targetScale = 1.14;
        emissive = 0.40;
      }

      if (sphere === selectedSphere) {
        targetScale = 1;
        emissive = 0.70;
      }

      sphere.scale.setScalar(targetScale);
      sphere.material.emissiveIntensity = emissive;

      const glow = sphere.children[0];
      if (glow) {
        let glowOpacity = 0.08;
        let glowScale = 1.25;

        if (sphere === hoveredSphere) {
          glowOpacity = 0.10;
          glowScale = 1.35;
        }

        if (sphere === selectedSphere) {
          glowOpacity = 0.14;
          glowScale = 1.45;
        }

        glow.material.opacity = glowOpacity;
        glow.scale.set(glowScale, glowScale, 1);
      }
    }

    orbitGroup.visible = layoutLerp < 0.98;
    core.visible = true;
    halo.visible = true;
    haloOuter.visible = true;

    for (const labelData of dayLabels) {
      const { el, anchor } = labelData;
      const anchorPos = anchor.clone();
      anchorPos.y += listScrollY;

      const projected = anchorPos.project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = `${Math.max(0, Math.min(1, (layoutLerp - 0.2) / 0.5))}`;
    }
  }

  function updateCamera() {
    cameraRadius += (targetCameraRadius - cameraRadius) * 0.08;
    listScrollY += (targetListScrollY - listScrollY) * 0.12;

    const cosmicCamX = 0;
    const cosmicCamY = Math.sin(time * 0.18) * 0.3;
    const cosmicCamZ = cameraRadius;

    const listCamX = 0;
    const listCamY = 0;
    const listCamZ = cameraRadius;

    camera.position.x = THREE.MathUtils.lerp(cosmicCamX, listCamX, layoutLerp);
    camera.position.y = THREE.MathUtils.lerp(cosmicCamY, listCamY, layoutLerp);
    camera.position.z = THREE.MathUtils.lerp(cosmicCamZ, listCamZ, layoutLerp);
    camera.lookAt(0, 0, 0);

    archiveGroup.rotation.x = Math.sin(time * 0.22) * 0.04 * (1 - layoutLerp);
    archiveGroup.rotation.y = Math.sin(time * 0.18) * 0.05 * (1 - layoutLerp);
    archiveGroup.rotation.z = 0;

    const pulse = (Math.sin(time * 1.4) + 1) * 0.5;
    core.scale.setScalar(1 + pulse * 0.02);
    halo.material.opacity = 0.08 + pulse * 0.02;
    haloOuter.material.opacity = 0.03 + pulse * 0.01;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    time += 0.005;
    updateLayout();
    updateCamera();

    renderer.render(scene, camera);
  }

  function setArchiveMode() {
    layoutMode = "archive";
    layoutTarget = 1;
    targetCameraRadius = settings.archiveCameraZ;
  }

  function setCosmicMode() {
    layoutMode = "cosmic";
    layoutTarget = 0;
    targetCameraRadius = settings.cosmicCameraZ;
    targetListScrollY = 0;
  }

  function zoomIn() {
    targetCameraRadius = Math.max(CAMERA_MIN, targetCameraRadius - settings.zoomStep);
  }

  function zoomOut() {
    targetCameraRadius = Math.min(CAMERA_MAX, targetCameraRadius + settings.zoomStep);
  }

  function resetView() {
    targetCameraRadius = CAMERA_DEFAULT;
    targetListScrollY = 0;
    setCosmicMode();
    closeSheet();
  }

  function clearGroup(group) {
    while (group.children.length) {
      const child = group.children.pop();

      if (child.geometry) child.geometry.dispose();

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }

      group.remove(child);
    }
  }

  function destroy() {
    cancelAnimationFrame(animationId);
    window.removeEventListener("resize", onResize);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    clearGroup(trackGroup);
    clearGroup(orbitGroup);

    core.geometry.dispose();
    core.material.dispose();
    halo.material.dispose();
    haloOuter.material.dispose();

    renderer.dispose();
    container.innerHTML = "";
    labelLayer && (labelLayer.innerHTML = "");
  }

  return {
    scene,
    camera,
    renderer,
    setCosmicMode,
    setArchiveMode,
    zoomIn,
    zoomOut,
    resetView,
    destroy,
    getMode: () => layoutMode,
    getData: () => archiveData,
    reload: async () => {
      await loadArchiveData();
      buildOrbitSystem();
    }
  };
}

function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const grd = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );

  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.22, "rgba(255,255,255,0.85)");
  grd.addColorStop(0.5, "rgba(255,255,255,0.28)");
  grd.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}