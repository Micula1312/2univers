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

  transitionSpeed: 0.05
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
  const trackLabels = [];
  const orbitLines = [];
  const knownTrackKeys = new Set();

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

  const listX = -2.8;
  const itemGap = 0.8;
  const dayGap = 2.2;
  const labelGap = 0.9;
  const listStartY = 5.8;

  let columnHeight = 0;
  let listTopY = 0;
  const visibleListHeight = 12;
  let maxListScroll = 0;

function updateListMetrics() {
    columnHeight =
      settings.totalDays * settings.slotsPerDay * itemGap +
      (settings.totalDays - 1) * (dayGap - itemGap);

    listTopY = listStartY;

    maxListScroll = Math.max(
      0,
      columnHeight - visibleListHeight
    );
  }

  async function loadArchiveData() {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    archiveData = Array.isArray(json?.tracks) ? json.tracks : [];

    updateListMetrics();
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
  await spawnTracksSequentially();

  const REFRESH_INTERVAL = 1 * 60 * 1000; // 1 minuti
  // const REFRESH_INTERVAL = 500000; // 10 secondi
  setInterval(refreshArchiveData, REFRESH_INTERVAL);

  function buildOrbitSystem() {
    clearGroup(orbitGroup);
    clearGroup(trackGroup);
    trackMeshes.length = 0;
    dayLabels.length = 0;
    trackLabels.length = 0;
    orbitLines.length = 0;
    knownTrackKeys.clear();
    if (labelLayer) labelLayer.innerHTML = "";

    for (let day = 0; day < settings.totalDays; day++) {
      const radius = settings.innerRadius + day * settings.orbitGap;
      const ring = createOrbitRing(radius);
      orbitGroup.add(ring);

      orbitLines.push({
        line: ring,
        dayIndex: day,
        radius
      });
    }

  for (let day = 0; day < settings.totalDays; day++) {
    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = `DAY ${day + 1}`;
    label.style.opacity = "0";
    labelLayer?.appendChild(label);

    const radius = settings.innerRadius + day * settings.orbitGap;
    const cosmicAngle = THREE.MathUtils.degToRad(-35);
    const cosmicLabelOffset = 0.5;

    const cosmicAnchor = new THREE.Vector3(
      Math.cos(cosmicAngle) * (radius + cosmicLabelOffset),
      Math.sin(cosmicAngle) * (radius + cosmicLabelOffset),
      0
    );

    const listAnchor = new THREE.Vector3(
      listX,
      getDayListLabelY(day),
      0
    );

    dayLabels.push({
      el: label,
      cosmicAnchor,
      listAnchor
    });
  }
  }

  function updateOrbitLines() {
  const segments = 128;
  const halfLineWidth = 5.4;

  for (const orbit of orbitLines) {
    const { line, dayIndex, radius } = orbit;
    const points = [];

    const targetY = getDayListLineY(dayIndex) + listScrollY;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      const angle = t * Math.PI * 2;
      const circleX = Math.cos(angle) * radius;
      const circleY = Math.sin(angle) * radius;

      const lineX = THREE.MathUtils.lerp(-halfLineWidth, halfLineWidth, t);
      const lineY = targetY;

      const x = THREE.MathUtils.lerp(circleX, lineX, layoutLerp);
      const y = THREE.MathUtils.lerp(circleY, lineY, layoutLerp);

      points.push(new THREE.Vector3(x, y, 0));
    }

    points.push(points[0].clone());

    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
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

      // chiusura manuale del cerchio
      points.push(points[0].clone());

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = orbitMaterial.clone();

      return new THREE.Line(geometry, material);
    }

    function createTrackSphere(trackData) {
      const dayIndex = (trackData.dayIndex ?? trackData.day ?? 1) - 1;
      const slotIndex = (trackData.slotIndex ?? trackData.slot ?? 1) - 1;

      const geometry = new THREE.SphereGeometry(
        settings.sphereRadius,
        settings.sphereSegments,
        settings.sphereSegments
      );

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
        title: trackData.title || `Track ${String(slotIndex + 1).padStart(2, "0")}`,
        meta: `Day ${dayIndex + 1} · Slot ${slotIndex + 1}`,
        trackData,
        orbitPosition: orbitPos.clone(),
        listPosition: listPos.clone()
      };

      return mesh;
    }

function addTrack(trackData) {
  const day = trackData.dayIndex ?? trackData.day ?? 1;
  const slot = trackData.slotIndex ?? trackData.slot ?? 1;

  const trackKey = `${day}-${slot}`;

  if (knownTrackKeys.has(trackKey)) return;

  knownTrackKeys.add(trackKey);

  const mesh = createTrackSphere(trackData);

  mesh.scale.set(0.001, 0.001, 0.001);
  mesh.material.opacity = 0;
  mesh.userData.bornTime = performance.now();
  mesh.userData.trackKey = trackKey;

  trackGroup.add(mesh);
  trackMeshes.push(mesh);

  const trackLabel = document.createElement("div");
    trackLabel.className = "track-label";
    trackLabel.textContent = trackData.title || `Track ${slot}`;
    trackLabel.style.opacity = "0";
    labelLayer?.appendChild(trackLabel);

    trackLabels.push({
      el: trackLabel,
      anchor: mesh.userData.listPosition.clone(),
      mesh
    });
}

  async function spawnTracksSequentially() {

    for (const track of archiveData) {

      addTrack(track);

      await new Promise(r => setTimeout(r, 250));
    }

  }

async function refreshArchiveData() {
  try {
    const response = await fetch(`${dataUrl}?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const nextTracks = Array.isArray(json?.tracks) ? json.tracks : [];

    archiveData = nextTracks;

    for (const track of nextTracks) {
      const day = track.dayIndex ?? track.day ?? 1;
      const slot = track.slotIndex ?? track.slot ?? 1;
      const trackKey = `${day}-${slot}`;

      if (!knownTrackKeys.has(trackKey)) {
        addTrack(track);
      }
    }
  } catch (error) {
    console.error("Errore refresh archive.json:", error);
  }
}

  function getOrbitPosition(dayIndex, slotIndex) {
    const radius = settings.innerRadius + dayIndex * settings.orbitGap;
    const rotationOffset = THREE.MathUtils.degToRad(18);
    const angle =
      (slotIndex / settings.slotsPerDay) * Math.PI * 2 - Math.PI / 2 + rotationOffset;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    );
  }

  function getListPosition(dayIndex, slotIndex) {
    const absoluteIndex = dayIndex * settings.slotsPerDay + slotIndex;
    const extraOffset = dayIndex * (dayGap - itemGap);

    const y = listTopY - (absoluteIndex * itemGap + extraOffset);
    const x = listX;

    return new THREE.Vector3(x, y, 0);
  }

  function getDayListLineY(dayIndex) {
    const firstSlotPos = getListPosition(dayIndex, 0);
    return firstSlotPos.y + labelGap - 0.35;
  }

  function getDayListLabelY(dayIndex) {
    return getDayListLineY(dayIndex) + 0.32;
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
          if (maxListScroll <= 0) return;
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
          0,
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
        if (layoutMode !== "archive" || maxListScroll <= 0) return;

        event.preventDefault();
        targetListScrollY += event.deltaY * 0.01;

        targetListScrollY = THREE.MathUtils.clamp(
          targetListScrollY,
          0,
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
    updateOrbitLines();

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

      const birthT = sphere.userData.bornTime
        ? Math.min((performance.now() - sphere.userData.bornTime) / 700, 1)
        : 1;

      const birthScale = THREE.MathUtils.smoothstep(birthT, 0, 1);
      sphere.scale.setScalar(targetScale * birthScale);

      sphere.material.opacity = birthScale;
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

    for (const orbit of orbitLines) {
      orbit.line.material.opacity = THREE.MathUtils.lerp(
        settings.orbitOpacity,
        0.16,
        layoutLerp
      );
    }

    core.visible = true;
    halo.visible = true;
    haloOuter.visible = true;

    for (const labelData of dayLabels) {
      const { el, cosmicAnchor, listAnchor } = labelData;

      const listPos = listAnchor.clone();
      listPos.y += listScrollY;

      const anchorPos = new THREE.Vector3().lerpVectors(
        cosmicAnchor,
        listPos,
        layoutLerp
      );

      const projected = anchorPos.project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      const cosmicOpacity = 1 - Math.max(0, Math.min(1, layoutLerp / 0.35));
      const listOpacity = Math.max(0, Math.min(1, (layoutLerp - 0.2) / 0.5));

      el.style.opacity = `${Math.max(cosmicOpacity, listOpacity)}`;

      if (layoutLerp < 0.4) {
        el.style.fontSize = "11px";
        el.style.letterSpacing = "0.16em";
      } else {
        el.style.fontSize = "12px";
        el.style.letterSpacing = "0.12em";
      }
    }

    for (const labelData of trackLabels) {
      const { el, anchor, mesh } = labelData;

      const anchorPos = anchor.clone();
      anchorPos.y += listScrollY;

      const projected = anchorPos.project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x + 28}px`;
      el.style.top = `${y}px`;
      el.style.opacity = `${Math.max(0, Math.min(1, (layoutLerp - 0.3) / 0.45))}`;

      if (mesh === selectedSphere) {
        el.style.fontWeight = "600";
      } else {
        el.style.fontWeight = "400";
      }
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
  updateCamera();
  updateLayout();
  

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
      await spawnTracksSequentially();
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