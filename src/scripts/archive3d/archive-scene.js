import * as THREE from "three";

let animationId = null;
let rendererInstance = null;
let resizeHandler = null;

let layoutMode = "cluster";
let layoutTarget = 0; // 0 = cluster, 1 = list
let layoutLerp = 0;

const rayLines = [];
const dayLabels = [];

export function initArchiveCluster() {
  const container = document.getElementById("archive");
  if (!container) return;

  const labelLayer = document.getElementById("labelLayer");
  if (labelLayer) labelLayer.innerHTML = "";

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

  layoutMode = "cluster";
  layoutTarget = 0;
  layoutLerp = 0;
  rayLines.length = 0;
  dayLabels.length = 0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070b, 0.02);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.set(0, 6, 20);
  camera.lookAt(0, 0, 0);

  rendererInstance = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  const renderer = rendererInstance;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x05070b, 1);

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  let frame = container.querySelector(".keyvisual-frame");
  if (!frame) {
    frame = document.createElement("div");
    frame.className = "keyvisual-frame";
    frame.innerHTML = `
      <img class="center-logo center-logo--top" src="/images/corner-logo.png" alt="">
      <img class="center-logo center-logo--bottom" src="/images/corner-logo-1.png" alt="">
    `;
    container.appendChild(frame);
  }

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 2.4, 200);
  pointLight.position.set(8, 10, 14);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 1.2, 200);
  pointLight2.position.set(-10, -6, 10);
  scene.add(pointLight2);

  const hemi = new THREE.HemisphereLight(0xd8c6a6, 0x31466f, 1.05);
  scene.add(hemi);

  const bgGeometry = new THREE.SphereGeometry(220, 64, 64);

  const bgMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      leftColorA: { value: new THREE.Color("#988061") },
      leftColorB: { value: new THREE.Color("#c8b08f") },
      leftColorC: { value: new THREE.Color("#d8c4a6") },

      rightColorA: { value: new THREE.Color("#2a3446") },
      rightColorB: { value: new THREE.Color("#42536f") },
      rightColorC: { value: new THREE.Color("#6d7f9f") },

      resolution: { value: new THREE.Vector2(width, height) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;

      uniform vec3 leftColorA;
      uniform vec3 leftColorB;
      uniform vec3 leftColorC;

      uniform vec3 rightColorA;
      uniform vec3 rightColorB;
      uniform vec3 rightColorC;

      uniform vec2 resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        float horizon = 0.60;
        float split = smoothstep(horizon + 0.03, horizon - 0.03, uv.y);

        vec3 topGrad = mix(leftColorA, leftColorB, smoothstep(0.0, 0.30, uv.y));
        topGrad = mix(topGrad, leftColorC, smoothstep(0.28, 0.48, uv.y));

        vec3 bottomGrad = mix(rightColorA, rightColorB, smoothstep(0.52, 0.75, uv.y));
        bottomGrad = mix(bottomGrad, rightColorC, smoothstep(0.75, 1.0, uv.y));

        vec3 base = mix(topGrad, bottomGrad, split);

        float tex1 = 1.0 - smoothstep(0.0, 0.42, distance(uv, vec2(0.20, 0.40)));
        float tex2 = 1.0 - smoothstep(0.0, 0.40, distance(uv, vec2(0.80, 0.60)));

        base *= mix(1.0, 0.72, tex1 * 0.35);
        base += vec3(1.0) * tex2 * 0.05;

        float glow = 1.0 - smoothstep(0.0, 0.08, abs(uv.y - horizon));
        base += vec3(1.0) * glow * 0.10;

        float mist = 1.0 - smoothstep(0.0, 0.32, distance(uv, vec2(0.5, horizon)));
        base += vec3(1.0) * mist * 0.06;

        gl_FragColor = vec4(base, 1.0);
      }
    `
  });

  const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
  scene.add(bgSphere);

  const coreGeometry = new THREE.SphereGeometry(1.15, 48, 48);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.7,
    metalness: 0.02,
    roughness: 0.18
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  const haloMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.scale.set(10, 10, 1);
  scene.add(halo);

  const haloOuterMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const haloOuter = new THREE.Sprite(haloOuterMaterial);
  haloOuter.scale.set(18, 18, 1);
  scene.add(haloOuter);

  const logoTexture = new THREE.TextureLoader().load("/images/donfeng-logo.png");
  logoTexture.colorSpace = THREE.SRGBColorSpace;

  const logoMaterial = new THREE.SpriteMaterial({
    map: logoTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const logoSprite = new THREE.Sprite(logoMaterial);
  logoSprite.position.set(0, 0, 1.18);
  logoSprite.scale.set(1.7, 1.7, 1);
  core.add(logoSprite);

  const CONFIG = {
    days: 7,
    tracksPerDay: 12,
    slotDistance: 1.55,
    wobbleAmount: 0.12
  };

  const archiveGroup = new THREE.Group();
  scene.add(archiveGroup);

  const sphereGeometry = new THREE.SphereGeometry(0.38, 24, 24);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xe7e0d2,
    transparent: true,
    opacity: 0.18
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

  const dayGap = 2.6;
  const itemGap = 0.72;
  const labelGap = 1.0;

  const totalListHeight =
    CONFIG.days * CONFIG.tracksPerDay * itemGap +
    (CONFIG.days - 1) * (dayGap - itemGap);

  const listTopY = totalListHeight / 2;

  function getTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  for (let r = 0; r < CONFIG.days; r++) {
    const phi = Math.acos(1 - 2 * ((r + 0.5) / CONFIG.days));
    const theta = Math.PI * (1 + Math.sqrt(5)) * r;

    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).normalize();

    const endPoint = dir.clone().multiplyScalar(CONFIG.tracksPerDay * CONFIG.slotDistance + 0.5);

    const points = [new THREE.Vector3(0, 0, 0), endPoint];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    archiveGroup.add(line);
    rayLines.push(line);

    for (let t = 0; t < CONFIG.tracksPerDay; t++) {
      const sphereMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf5f1ea,
        emissive: 0x7387b8,
        emissiveIntensity: 0.18,
        metalness: 0.02,
        roughness: 0.22,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18
      });

      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      const distance = (t + 1) * CONFIG.slotDistance;

      const wobble = new THREE.Vector3(
        (Math.random() - 0.5) * CONFIG.wobbleAmount,
        (Math.random() - 0.5) * CONFIG.wobbleAmount,
        (Math.random() - 0.5) * CONFIG.wobbleAmount
      );

      sphere.position.copy(dir.clone().multiplyScalar(distance).add(wobble));
      const clusterPosition = sphere.position.clone();

      const listIndexBeforeDay = r * CONFIG.tracksPerDay;
      const extraOffset = r * (dayGap - itemGap);
      const absoluteIndex = listIndexBeforeDay + t;

      const listY = listTopY - (absoluteIndex * itemGap + extraOffset);
      const listPosition = new THREE.Vector3(0, listY, 0);

      const driftAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      sphere.userData = {
        ray: r,
        slot: t,
        title: `Stella ${String(t + 1).padStart(2, "0")}:00`,
        meta: `Giorno ${r + 1} · Fascia ${t + 1}`,
        clusterPosition: clusterPosition.clone(),
        listPosition: listPosition.clone(),
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 1.1 + Math.random() * 0.9,
        pulseAmount: 0.04 + Math.random() * 0.05,
        driftAxis,
        driftAmount: 0.015 + Math.random() * 0.035,
        driftSpeed: 0.6 + Math.random() * 0.8,
        driftOffset: Math.random() * Math.PI * 2
      };

      trackMeshes.push(sphere);
      archiveGroup.add(sphere);
    }
  }

  for (let r = 0; r < CONFIG.days; r++) {
    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = `DAY ${r + 1}`;
    label.style.opacity = "0";
    labelLayer?.appendChild(label);

    const firstIndex = r * CONFIG.tracksPerDay;
    const firstSphere = trackMeshes[firstIndex];

    dayLabels.push({
      el: label,
      anchor: new THREE.Vector3(0, firstSphere.userData.listPosition.y + labelGap, 0)
    });
  }

  function openSheet(data) {
    if (!sheet || !titleEl || !metaEl) return;
    titleEl.textContent = data.title;
    metaEl.textContent = data.meta;
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
  }

  closeSheetBtn?.addEventListener("click", closeSheet);
  closeSheetBtn?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  sheet?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  fakePlayBtn?.addEventListener("click", () => {
    fakePlayBtn.textContent = fakePlayBtn.textContent === "Play" ? "Pause" : "Play";
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
    bgMaterial.uniforms.resolution.value.set(w, h);
  }

  resizeHandler = onResize;
  window.addEventListener("resize", resizeHandler);

  function animate() {
    animationId = requestAnimationFrame(animate);

    time += 0.005;
    layoutLerp += (layoutTarget - layoutLerp) * 0.06;
    cameraRadius += (targetCameraRadius - cameraRadius) * 0.08;

    const clusterCamX = Math.cos(time * 0.35) * cameraRadius;
    const clusterCamZ = Math.sin(time * 0.35) * cameraRadius;
    const clusterCamY = 4.5 + Math.sin(time * 0.2) * 1.25;

    const listCamX = 0;
    const listCamY = 0;
    const listCamZ = 24;

    camera.position.x = THREE.MathUtils.lerp(clusterCamX, listCamX, layoutLerp);
    camera.position.y = THREE.MathUtils.lerp(clusterCamY, listCamY, layoutLerp);
    camera.position.z = THREE.MathUtils.lerp(clusterCamZ, listCamZ, layoutLerp);
    camera.lookAt(0, 0, 0);

    archiveGroup.rotation.x = Math.sin(time * 0.22) * 0.12 * (1 - layoutLerp);
    archiveGroup.rotation.y = Math.sin(time * 0.25) * 0.14 * (1 - layoutLerp);
    archiveGroup.rotation.z = Math.sin(time * 0.18) * 0.05 * (1 - layoutLerp);

    bgSphere.rotation.y += 0.00035;

    const pulse = (Math.sin(time * 1.6) + 1) * 0.5;
    core.scale.setScalar(1 + pulse * 0.1);
    core.material.emissiveIntensity = 1.45 + pulse * 0.55;

    halo.material.opacity = 0.52 + pulse * 0.2;
    halo.scale.setScalar(9.5 + pulse * 1.2);

    haloOuter.material.opacity = 0.16 + pulse * 0.12;
    haloOuter.scale.setScalar(16.5 + pulse * 2.2);

    logoSprite.material.opacity = 0.9 + Math.sin(time * 1.2) * 0.03;

    for (const line of rayLines) {
      line.material.opacity = 0.18 * (1 - layoutLerp);
    }

    for (const sphere of trackMeshes) {
      const {
        clusterPosition,
        listPosition,
        pulseOffset,
        pulseSpeed,
        pulseAmount,
        driftAxis,
        driftAmount,
        driftSpeed,
        driftOffset
      } = sphere.userData;

      const pulseLocal = Math.sin(time * pulseSpeed + pulseOffset) * pulseAmount;
      const drift = Math.sin(time * driftSpeed + driftOffset) * driftAmount;

      const targetPosition = new THREE.Vector3().lerpVectors(
        clusterPosition,
        listPosition,
        layoutLerp
      );

      const driftVector = driftAxis.clone().multiplyScalar(
        drift * (1.0 - layoutLerp * 0.75)
      );

      sphere.position.copy(targetPosition.clone().add(driftVector));

      let targetScale = 1 + pulseLocal;
      let emissive = 0.20 + pulseLocal * 0.6;

      if (sphere === hoveredSphere) {
        targetScale += 0.20;
        emissive = 0.85;
      }

      if (sphere === selectedSphere) {
        targetScale += 0.30;
        emissive = 1.15;
      }

      sphere.scale.setScalar(targetScale);
      sphere.material.emissiveIntensity = emissive;
    }

    for (const labelData of dayLabels) {
      const { el, anchor } = labelData;
      const projected = anchor.clone().project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = `${Math.max(0, Math.min(1, (layoutLerp - 0.2) / 0.5))}`;
    }

    renderer.render(scene, camera);
  }

  animate();
}

export function setArchiveLayout(mode) {
  layoutMode = mode;
  layoutTarget = mode === "list" ? 1 : 0;
}

export function destroyArchiveCluster() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }

  if (rendererInstance) {
    rendererInstance.dispose();
    rendererInstance.domElement.remove();
    rendererInstance = null;
  }

  const container = document.getElementById("archive");
  if (container) container.innerHTML = "";

  const labelLayer = document.getElementById("labelLayer");
  if (labelLayer) labelLayer.innerHTML = "";

  rayLines.length = 0;
  dayLabels.length = 0;
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