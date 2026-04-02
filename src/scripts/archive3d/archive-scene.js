import * as THREE from "three";

export function initArchive() {
  const container = document.getElementById("archive");
  const overlay = document.getElementById("timeMapOverlay");
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
  scene.fog = new THREE.FogExp2(0x05070b, 0.03);

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
  camera.position.set(0, 6, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x05070b, 1);
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // -------------------------------------------------
  // DOM frame overlay (cornice keyvisual)
  // -------------------------------------------------
let frame = container.querySelector(".keyvisual-frame");
if (!frame) {
  frame = document.createElement("div");
  frame.className = "keyvisual-frame";
  frame.innerHTML = `
    <div class="frame-piece frame-piece--top"></div>
    <div class="frame-piece frame-piece--right"></div>
    <div class="frame-piece frame-piece--bottom"></div>
    <div class="frame-piece frame-piece--left"></div>

    <div class="frame-corner frame-corner--tl"></div>
    <div class="frame-corner frame-corner--tr"></div>
    <div class="frame-corner frame-corner--br"></div>
    <div class="frame-corner frame-corner--bl"></div>

    <img class="corner-logo corner-logo--tl" src="/images/corner-logo.png" alt="">
    <img class="corner-logo corner-logo--tr" src="/images/corner-logo-1.png" alt="">
    <img class="corner-logo corner-logo--br" src="/images/corner-logo.png" alt="">
    <img class="corner-logo corner-logo--bl" src="/images/corner-logo-1.png" alt="">
  `;
  container.appendChild(frame);
}

  const cornerNames = ["tl", "tr", "br", "bl"];

cornerNames.forEach((pos) => {
  let logo = frame.querySelector(`.corner-logo--${pos}`);
  if (!logo) {
    logo = document.createElement("img");
    logo.className = `corner-logo corner-logo--${pos}`;
    logo.src = "/logo-corner.png";
    logo.alt = "";
    frame.appendChild(logo);
  }
});

  // -------------------------------------------------
  // LIGHTS
  // -------------------------------------------------
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 2.5, 200);
  pointLight.position.set(8, 10, 14);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 1.2, 200);
  pointLight2.position.set(-10, -6, 10);
  scene.add(pointLight2);

  const hemi = new THREE.HemisphereLight(0xd8c6a6, 0x31466f, 1.1);
  scene.add(hemi);


const glass = document.createElement("div");
glass.className = "glass-overlay";
container.appendChild(glass);




  // -------------------------------------------------
  // BACKGROUND: two universes + horizontal light beam
  // -------------------------------------------------
  const bgGeometry = new THREE.SphereGeometry(140, 80, 80);

  const bgMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color("#d7c2a0") },
      bottomColor: { value: new THREE.Color("#4e6288") },
      splitSoftness: { value: 0.08 },
      vignetteStrength: { value: 0.55 },
      resolution: { value: new THREE.Vector2(width, height) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormalDir;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormalDir = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormalDir;

    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float splitSoftness;
    uniform float vignetteStrength;
    uniform vec2 resolution;

    void main() {
      float y = gl_FragCoord.y / resolution.y;
      float split = smoothstep(0.999 - splitSoftness, 0.999 + splitSoftness, y);
      vec3 base = mix(bottomColor, topColor, split);

      float archShade = smoothstep(
        -0.8,
        0.9,
        sin(vWorldPosition.x * 0.08) * 0.25 + (vWorldPosition.y / 25.0) * 0.9
      );
      base *= mix(0.82, 1.08, archShade);

      float edge = dot(normalize(vNormalDir), vec3(0.0, 0.0, 1.0));
      float vignette = smoothstep(-0.8, 0.6, edge);
      base *= mix(1.0 - vignetteStrength, 1.0, vignette);

      gl_FragColor = vec4(base, 1.0);
    }
    `
  });

  const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
  scene.add(bgSphere);



  // -------------------------------------------------
  // CORE + LOGO
  // -------------------------------------------------
  const coreGeometry = new THREE.SphereGeometry(1.1, 40, 40);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6f4ef,
    emissive: 0xffffff,
    emissiveIntensity: 1.25,
    metalness: 0.06,
    roughness: 0.25
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(core);

  // alone luminoso attorno al nucleo
  const haloGeom = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const halo = new THREE.Sprite(haloGeom);
  halo.scale.set(6.8, 6.8, 1);
  scene.add(halo);

  // logo sprite centrale
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
logoSprite.position.set(0, -2.4, 0);
logoSprite.scale.set(2.4, 2.4, 1);

scene.add(logoSprite);

  // -------------------------------------------------
  // ARCHIVE CONFIG
  // -------------------------------------------------
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

  function getTouchDistance(t1, t2) {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

for (let r = 0; r < CONFIG.days; r++) {
  // distribuzione sferica attorno al nucleo
  const phi = Math.acos(1 - 2 * ((r + 0.5) / CONFIG.days));
  const theta = Math.PI * (1 + Math.sqrt(5)) * r;

  const dir = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();

  const endPoint = dir
    .clone()
    .multiplyScalar(CONFIG.tracksPerDay * CONFIG.slotDistance + 0.5);

  const points = [new THREE.Vector3(0, 0, 0), endPoint];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  archiveGroup.add(line);

  for (let t = 0; t < CONFIG.tracksPerDay; t++) {
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2ede4,
      emissive: 0x8f98ad,
      emissiveIntensity: 0.32,
      metalness: 0.1,
      roughness: 0.38
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    const distance = (t + 1) * CONFIG.slotDistance;

    const wobble = new THREE.Vector3(
      (Math.random() - 0.5) * CONFIG.wobbleAmount,
      (Math.random() - 0.5) * CONFIG.wobbleAmount,
      (Math.random() - 0.5) * CONFIG.wobbleAmount
    );

    sphere.position.copy(
      dir.clone().multiplyScalar(distance).add(wobble)
    );

    sphere.userData = {
      ray: r,
      slot: t,
      title: `Stella ${String(t + 1).padStart(2, "0")}:00`,
      meta: `Giorno ${r + 1} · Fascia ${t + 1}`,
      pulseOffset: Math.random() * Math.PI * 2
    };

    trackMeshes.push(sphere);
    archiveGroup.add(sphere);
  }
}

  // -------------------------------------------------
  // 2D OVERLAY MAP
  // -------------------------------------------------
  function drawOverlay() {
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const w = (overlay.width = overlay.clientWidth * window.devicePixelRatio);
    const h = (overlay.height = overlay.clientHeight * window.devicePixelRatio);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const vw = overlay.clientWidth;
    const vh = overlay.clientHeight;
    const cx = vw / 2;
    const cy = vh / 2;
    const maxRings = CONFIG.tracksPerDay;
    const ringGap = Math.min(vw, vh) * 0.032;

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    for (let i = 1; i <= maxRings; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, i * ringGap, i * ringGap * 0.76, -0.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let r = 0; r < CONFIG.days; r++) {
      const angle = (r / CONFIG.days) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * maxRings * ringGap;
      const y = cy + Math.sin(angle) * maxRings * ringGap * 0.76;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.stroke();
    }

    // linea orizzontale anche nell'overlay
    const grd = ctx.createLinearGradient(0, cy, vw, cy);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.18, "rgba(255,255,255,0.16)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.38)");
    grd.addColorStop(0.82, "rgba(255,255,255,0.16)");
    grd.addColorStop(1, "rgba(255,255,255,0)");

    ctx.strokeStyle = grd;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vw * 0.12, cy);
    ctx.lineTo(vw * 0.88, cy);
    ctx.stroke();
  }

  // -------------------------------------------------
  // SHEET
  // -------------------------------------------------
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
  closeSheetBtn?.addEventListener("click", closeSheet);

  

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
    drawOverlay();
  }

  window.addEventListener("resize", onResize);

  function animate() {
    requestAnimationFrame(animate);

    time += 0.005;
    cameraRadius += (targetCameraRadius - cameraRadius) * 0.08;

    camera.position.x = Math.cos(time * 0.35) * cameraRadius;
    camera.position.z = Math.sin(time * 0.35) * cameraRadius;
    camera.position.y = 4.5 + Math.sin(time * 0.2) * 1.25;
    camera.lookAt(0, 0, 0);

    archiveGroup.rotation.z = Math.sin(time * 0.4) * 0.03;
    archiveGroup.rotation.y = Math.sin(time * 0.25) * 0.08;

    // micro respiro del bg
    bgSphere.rotation.y += 0.00035;


    const corePulse = 1 + Math.sin(time * 2.2) * 0.045;
    core.scale.setScalar(corePulse);
    halo.material.opacity = 0.52 + Math.sin(time * 2.2) * 0.09;
    halo.scale.setScalar(6.6 + Math.sin(time * 2.0) * 0.28);

    logoSprite.material.opacity = 0.9 + Math.sin(time * 1.7) * 0.05;

    for (const sphere of trackMeshes) {
      const basePulse = 1 + Math.sin(time * 2 + sphere.userData.pulseOffset) * 0.08;

      let targetScale = basePulse;
      let emissive = 0.32;

      if (sphere === hoveredSphere) {
        targetScale = basePulse + 0.22;
        emissive = 0.9;
      }

      if (sphere === selectedSphere) {
        targetScale = basePulse + 0.32;
        emissive = 1.25;
      }

      sphere.scale.setScalar(targetScale);
      sphere.material.emissiveIntensity = emissive;
    }

    renderer.render(scene, camera);
  }

  drawOverlay();
  animate();
}

// -------------------------------------------------
// helper glow texture
// -------------------------------------------------
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

