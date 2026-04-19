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
  const isMobile = window.innerWidth < 768;
  const TAP_MOVE_THRESHOLD = isMobile ? 14 : 8;

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

  const sheetInner = sheet?.querySelector(".track-sheet__inner");

  container.innerHTML = "";

  const nucleusLink = document.createElement("a");
  nucleusLink.href = "https://dongfeng-italia.it/";
  nucleusLink.target = "_blank";
  nucleusLink.rel = "noopener";
  nucleusLink.className = "archive-nucleus";

  nucleusLink.innerHTML = `
    <span class="archive-nucleus__halo archive-nucleus__halo--inner"></span>
    <span class="archive-nucleus__halo archive-nucleus__halo--outer"></span>
    <img
      src="/images/nucleo.png"
      alt="Dongfeng nucleus"
      class="archive-nucleus__img"
    >
  `;

  container.appendChild(nucleusLink);

  let bgOverlay = document.createElement("div");
  bgOverlay.className = "bg-texture-overlay";
  container.appendChild(bgOverlay);

  bgOverlay.style.backgroundImage = 'url("/images/bg-overlay-3.jpg")';
  bgOverlay.style.backgroundPosition = "center center";
  bgOverlay.style.backgroundRepeat = "no-repeat";
  bgOverlay.style.backgroundSize = "cover";

  let frame = document.createElement("div");
  frame.className = "keyvisual-frame";
frame.innerHTML = `
  <a
    class="center-logo-link center-logo-link--top"
    href="https://m-hero.it/"
    target="_blank"
    rel="noopener"
    aria-label="Apri il sito M-Hero"
  >
    <img class="center-logo center-logo--top" src="/images/mhero-logo.png" alt="M-Hero">
  </a>

  <a
    class="center-logo-link center-logo-link--bottom"
    href="https://voyah.it/"
    target="_blank"
    rel="noopener"
    aria-label="Apri il sito Voyah"
  >
    <img class="center-logo center-logo--bottom" src="/images/voyah-logo.png" alt="Voyah">
  </a>

  <img class="mdw-logo" src="/images/mdw.png" alt="Milano Design Week 2025">
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

  renderer.domElement.setAttribute("tabindex", "0");

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.zIndex = "10";

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



  const orbitMaterial = new THREE.LineBasicMaterial({
    color: settings.orbitColor,
    transparent: true,
    opacity: settings.orbitOpacity
  });

  const sphereGlowTexture = createGlowTexture();

  const trackMeshes = [];
  const dayLabels = [];
  const trackLabels = [];
  const placeholderLabels = [];
  const orbitLines = [];
  const knownTrackKeys = new Set();

const raycaster = new THREE.Raycaster();
raycaster.params.Mesh.threshold = isMobile ? 0.25 : 0.1;
const pointer = new THREE.Vector2();

  let archiveData = [];
  let hoveredSphere = null;
  let selectedSphere = null;

  let animationId = null;
  let layoutMode = "cosmic";
  let layoutTarget = 0;
  let layoutLerp = 0;

  let orbitIntroStart = performance.now();
  const ORBIT_INTRO_DELAY = 1800;
  const ORBIT_STAGGER = 140;
  const ORBIT_FADE_MS = 650;

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

  let isRotating = false;
  let rotateStartX = 0;
  let rotateStartY = 0;

  let targetRotationX = 0;
  let targetRotationY = 0;
  let currentRotationX = 0;
  let currentRotationY = 0;

let rotationPhase = 0;
let rotationPhaseTarget = 0;

const ROTATION_CYCLE_CLICKS = 16;
const ROTATION_PHASE_STEP = (Math.PI * 2) / ROTATION_CYCLE_CLICKS;

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

  // const REFRESH_INTERVAL = 5 * 60 * 1000;
  const REFRESH_INTERVAL = 500000; // 10 secondi
  setInterval(refreshArchiveData, REFRESH_INTERVAL);

  function buildOrbitSystem() {
    clearGroup(orbitGroup);
    clearGroup(trackGroup);
    trackMeshes.length = 0;
    dayLabels.length = 0;
    trackLabels.length = 0;
    orbitLines.length = 0;
    placeholderLabels.length = 0;
    knownTrackKeys.clear();
    if (labelLayer) labelLayer.innerHTML = "";

    for (let day = 0; day < settings.totalDays; day++) {
      const radius = settings.innerRadius + day * settings.orbitGap;
      const ring = createOrbitRing(radius);
      ring.material.opacity = 0;
      orbitGroup.add(ring);

      orbitLines.push({
        line: ring,
        dayIndex: day,
        radius,
        introIndex: day
      });
    }

  for (let day = 0; day < settings.totalDays; day++) {
      const label = document.createElement("div");
      label.className = "day-label";
      label.textContent = `DAY ${day + 1}`;
      label.style.opacity = "0";
      label.style.transform = "translate(-50%, -50%) translateY(8px)";
      labelLayer?.appendChild(label);

      const radius = settings.innerRadius + day * settings.orbitGap;
      const cosmicAngle = THREE.MathUtils.degToRad(-45);
      const cosmicLabelOffset = 0.12;

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
    for (let day = 0; day < settings.totalDays; day++) {
      for (let slot = 0; slot < settings.slotsPerDay; slot++) {
        const dayNumber = day + 1;
        const slotNumber = slot + 1;

        const trackExists = archiveData.some((track) => {
          const trackDay = track.dayIndex ?? track.day ?? 1;
          const trackSlot = track.slotIndex ?? track.slot ?? 1;
          return trackDay === dayNumber && trackSlot === slotNumber;
        });

        if (trackExists) continue;

        const placeholder = document.createElement("div");
        placeholder.className = "track-placeholder";
        placeholder.style.opacity = "0";
        labelLayer?.appendChild(placeholder);

        placeholderLabels.push({
          el: placeholder,
          anchor: getListPosition(day, slot).clone(),
          dayIndex: day,
          slotIndex: slot
        });
      }
    }
  }

function updateOrbitLines() {
  const segments = 128;
  const halfLineWidth = 5.4;

  for (const orbit of orbitLines) {
    const { line, dayIndex, radius } = orbit;
    const points = [];
    const targetY = getDayListLineY(dayIndex) + listScrollY;

    const spreadAngle = getSpreadAngle(dayIndex);
    const cosA = Math.cos(spreadAngle);
    const sinA = Math.sin(spreadAngle);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      const angle = t * Math.PI * 2;
      const circleX = Math.cos(angle) * radius;
      const circleY = Math.sin(angle) * radius;

      const rotatedX = circleX * cosA;
      const rotatedZ = -circleX * sinA;

      const lineX = THREE.MathUtils.lerp(-halfLineWidth, halfLineWidth, t);
      const lineY = targetY;

      const x = THREE.MathUtils.lerp(rotatedX, lineX, layoutLerp);
      const y = THREE.MathUtils.lerp(circleY, lineY, layoutLerp);
      const z = THREE.MathUtils.lerp(rotatedZ, 0, layoutLerp);

      points.push(new THREE.Vector3(x, y, z));
    }

    points.push(points[0].clone());

    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}

  function updateOrbitIntro() {
    const elapsed = performance.now() - orbitIntroStart;

    for (const orbit of orbitLines) {
      const start = ORBIT_INTRO_DELAY + orbit.introIndex * ORBIT_STAGGER;
      const t = THREE.MathUtils.clamp((elapsed - start) / ORBIT_FADE_MS, 0, 1);
      orbit.line.userData.introT = t;
    }

    for (let i = 0; i < dayLabels.length; i++) {
      const labelData = dayLabels[i];
      const start =
        ORBIT_INTRO_DELAY +
        orbitLines.length * ORBIT_STAGGER +
        i * 90;

      const t = THREE.MathUtils.clamp((elapsed - start) / 420, 0, 1);
      labelData.introT = t;
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

      const mobileSphereRadius = isMobile
        ? settings.sphereRadius * 1.18
        : settings.sphereRadius;

      const geometry = new THREE.SphereGeometry(
        mobileSphereRadius,
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

  const dayIndex = (trackData.dayIndex ?? trackData.day ?? 1) - 1;
  const slotIndex = (trackData.slotIndex ?? trackData.slot ?? 1) - 1;

  for (let i = placeholderLabels.length - 1; i >= 0; i--) {
    const p = placeholderLabels[i];
    if (p.dayIndex === dayIndex && p.slotIndex === slotIndex) {
      p.el.remove();
      placeholderLabels.splice(i, 1);
      break;
    }
  }

const trackLabel = document.createElement("div");
trackLabel.className = "track-label";
trackLabel.textContent = trackData.title || `Track ${slot}`;
trackLabel.style.opacity = "0";
trackLabel.style.pointerEvents = "none";
trackLabel.setAttribute("role", "button");
trackLabel.setAttribute("tabindex", "0");
labelLayer?.appendChild(trackLabel);

trackLabel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

trackLabel.addEventListener("click", (event) => {
  event.stopPropagation();

  const isListVisible = layoutLerp > 0.55;
  if (!isListVisible) return;

  const isSheetOpen = sheet?.classList.contains("is-open");

  if (isSheetOpen && selectedSphere === mesh) {
    closeSheet();
    return;
  }

  selectedSphere = mesh;
  hoveredSphere = mesh;
  openSheet(mesh.userData);
});

trackLabel.addEventListener("mouseenter", () => {
  if (layoutLerp > 0.55) {
    hoveredSphere = mesh;
  }
});

trackLabel.addEventListener("mouseleave", () => {
  if (hoveredSphere === mesh) hoveredSphere = null;
});

trackLabel.addEventListener("keydown", (event) => {
  const isListVisible = layoutLerp > 0.55;
  if (!isListVisible) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();

    const isSheetOpen = sheet?.classList.contains("is-open");

    if (isSheetOpen && selectedSphere === mesh) {
      closeSheet();
      return;
    }

    selectedSphere = mesh;
    hoveredSphere = mesh;
    openSheet(mesh.userData);
  }
});

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


  function getSpreadOrbitPosition(dayIndex, slotIndex) {
    const base = getOrbitPosition(dayIndex, slotIndex);
    const spreadAngle = getSpreadAngle(dayIndex);

    const cosA = Math.cos(spreadAngle);
    const sinA = Math.sin(spreadAngle);

    return new THREE.Vector3(
      base.x * cosA,
      base.y,
      -base.x * sinA
    );
  }

  function getSpreadAngle(dayIndex) {
  const wrappedPhase =
    ((rotationPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const orbitMultiplier = dayIndex + 1;

  return wrappedPhase * orbitMultiplier;
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

    closeSheetBtn?.focus();
  }

function closeSheet(event) {
  event?.stopPropagation();
  event?.preventDefault();

  if (!sheet) return;

  if (document.activeElement && sheet.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");

  renderer.domElement?.focus?.();

  selectedSphere = null;
  hoveredSphere = null;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  if (fakePlayBtn) fakePlayBtn.textContent = "Play";
  if (progressEl) progressEl.value = 0;
  if (shareBtn) shareBtn.classList.remove("is-copied");
}

  function bindUI() {
    closeSheetBtn?.addEventListener("click", closeSheet);
    closeSheetBtn?.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

  sheet?.addEventListener("pointerdown", (event) => {
    if (!sheetInner) return;

    const clickedInside = sheetInner.contains(event.target);
    if (!clickedInside) {
      closeSheet(event);
    }
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
          shareBtn.classList.add("is-copied");

          window.setTimeout(() => {
            shareBtn.classList.remove("is-copied");
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
  const hitSphere = pickSphere(event.clientX, event.clientY);
  hoveredSphere = hitSphere || null;
  renderer.domElement.style.cursor = hitSphere ? "pointer" : "default";
});

renderer.domElement.addEventListener("click", (event) => {
  const hitSphere = pickSphere(event.clientX, event.clientY);
  if (!hitSphere) return;

  const isSheetOpen = sheet?.classList.contains("is-open");

  if (isSheetOpen && selectedSphere === hitSphere) {
    closeSheet();
    return;
  }

  selectedSphere = hitSphere;
  openSheet(hitSphere.userData);
});

    renderer.domElement.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          isListDragging = false;
          isRotating = false;
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

          if (layoutMode === "cosmic") {
            isRotating = true;
            rotateStartX = touch.clientX;
            rotateStartY = touch.clientY;
          }
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
            Math.abs(touch.clientY - touchStartY) > TAP_MOVE_THRESHOLD ||
            Math.abs(touch.clientX - touchStartX) > TAP_MOVE_THRESHOLD
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

        if (layoutMode === "cosmic" && event.touches.length === 1 && isRotating) {
          const touch = event.touches[0];
          const deltaX = touch.clientX - rotateStartX;
          const deltaY = touch.clientY - rotateStartY;

          if (
            Math.abs(touch.clientY - touchStartY) > 8 ||
            Math.abs(touch.clientX - touchStartX) > 8
          ) {
            touchMoved = true;
          }

          rotateStartX = touch.clientX;
          rotateStartY = touch.clientY;

          targetRotationY += deltaX * 0.005;
          targetRotationX += deltaY * 0.003;

          targetRotationX = THREE.MathUtils.clamp(targetRotationX, -0.45, 0.45);

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
    if (!touchMoved && event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const hitSphere = pickSphere(touch.clientX, touch.clientY);

      if (hitSphere) {
        const isSheetOpen = sheet?.classList.contains("is-open");

        if (isSheetOpen && selectedSphere === hitSphere) {
          closeSheet();
        } else {
          selectedSphere = hitSphere;
          openSheet(hitSphere.userData);
        }
      }
    }

    pinchStartDistance = 0;
    isListDragging = false;
    isRotating = false;
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
  if (intersects.length) return intersects[0].object;

  let closest = null;
  let closestDist = Infinity;

  for (const mesh of trackMeshes) {
    const projected = mesh.position.clone().project(camera);

    const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

    const dx = clientX - x;
    const dy = clientY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const tolerance = layoutLerp > 0.5
      ? (isMobile ? 42 : 28)
      : (isMobile ? 30 : 18);

    if (dist < tolerance && dist < closestDist) {
      closest = mesh;
      closestDist = dist;
    }
  }

  return closest;
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
      const orbitPosition = getSpreadOrbitPosition(
        sphere.userData.dayIndex,
        sphere.userData.slotIndex
      );
      const listPosition = sphere.userData.listPosition.clone();
      listPosition.y += listScrollY;

      sphere.position.lerpVectors(orbitPosition, listPosition, layoutLerp);

      const inListView = layoutLerp > 0.5;

      let targetScale = inListView ? 1.5 : 1.22;
      let emissive = 0.7;

      if (sphere === hoveredSphere) {
        targetScale = inListView ? 1.7 : 1.32;
        emissive = 0.40;
      }

      if (sphere === selectedSphere) {
        targetScale = inListView ? 1.82 : 1.42;
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
      let glowOpacity = inListView ? 0.1 : 0.08;
      let glowScale = inListView ? 1.4 : 1.25;

      if (sphere === hoveredSphere) {
        glowOpacity = inListView ? 0.14 : 0.10;
        glowScale = inListView ? 1.55 : 1.35;
      }

      if (sphere === selectedSphere) {
        glowOpacity = inListView ? 0.18 : 0.14;
        glowScale = inListView ? 1.7 : 1.45;
      }

        glow.material.opacity = glowOpacity;
        glow.scale.set(glowScale, glowScale, 1);
      }
    }

    for (const placeholderData of placeholderLabels) {
      const { el, anchor } = placeholderData;

      const anchorPos = anchor.clone();
      anchorPos.y += listScrollY;

      const projected = anchorPos.project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      const opacity = Math.max(0, Math.min(1, (layoutLerp - 0.3) / 0.45));
      el.style.opacity = `${opacity}`;
    }

    for (const orbit of orbitLines) {
      orbit.line.material.opacity = THREE.MathUtils.lerp(
        settings.orbitOpacity,
        0.16,
        layoutLerp
      );
    }


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

      const introT = labelData.introT ?? 0;
      const baseOpacity = Math.max(cosmicOpacity, listOpacity);

      el.style.opacity = `${baseOpacity * introT}`;

      const introYOffset = (1 - introT) * 8;
      el.style.transform = `translate(-50%, -50%) translateY(${introYOffset}px)`;

      if (layoutLerp < 0.4) {
        el.style.fontSize = "9px";
        el.style.letterSpacing = "0.14em";
      } else {
        el.style.fontSize = "10px";
        el.style.letterSpacing = "0.11em";
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

    const isListVisible = layoutLerp > 0.55;
    el.style.pointerEvents = isListVisible ? "auto" : "none";

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

  currentRotationX += (targetRotationX - currentRotationX) * 0.08;
  currentRotationY += (targetRotationY - currentRotationY) * 0.08;
  rotationPhase += (rotationPhaseTarget - rotationPhase) * 0.08;

  camera.position.set(0, 0, cameraRadius);
  camera.lookAt(0, 0, 0);

  const idleRotationX = Math.sin(time * 0.22) * 0.03 * (1 - layoutLerp);
  const idleRotationY = Math.sin(time * 0.18) * 0.035 * (1 - layoutLerp);

  archiveGroup.rotation.x = idleRotationX + currentRotationX * (1 - layoutLerp);
  archiveGroup.rotation.y = idleRotationY + currentRotationY * (1 - layoutLerp);
  archiveGroup.rotation.z = 0;
}

function animate() {
  animationId = requestAnimationFrame(animate);

  time += 0.005;
  updateOrbitIntro();
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

  targetRotationX = 0;
  targetRotationY = 0;
  rotationPhaseTarget = 0;

  setCosmicMode();
  closeSheet();
}

function rotateToNextSlot() {
  rotationPhaseTarget += ROTATION_PHASE_STEP;
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
    rotateToNextSlot,
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