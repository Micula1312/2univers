import * as THREE from "three";

let rendererInstance = null;
let animationId = null;
let resizeHandler = null;

export function initArchiveList() {
  const container = document.getElementById("archive");
  if (!container) return;

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 0, 24);
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

  const ambient = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambient);

  const light = new THREE.PointLight(0xffffff, 1.8, 200);
  light.position.set(6, 10, 8);
  scene.add(light);

  const hemi = new THREE.HemisphereLight(0xd8c6a6, 0x31466f, 1.0);
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

  // posizione della linea
  float horizon = 1.01;

  // morbidezza della transizione principale
  float split = smoothstep(horizon + 0.03, horizon - 0.03, uv.y);

  vec3 topGrad = mix(leftColorA, leftColorB, smoothstep(0.0, 0.30, uv.y));
  topGrad = mix(topGrad, leftColorC, smoothstep(0.28, 0.48, uv.y));

  vec3 bottomGrad = mix(rightColorA, rightColorB, smoothstep(0.52, 0.75, uv.y));
  bottomGrad = mix(bottomGrad, rightColorC, smoothstep(0.75, 1.0, uv.y));

  vec3 base = mix(topGrad, bottomGrad, split);

  // texture morbida
  float tex1 = 1.0 - smoothstep(0.0, 0.42, distance(uv, vec2(0.20, 0.40)));
  float tex2 = 1.0 - smoothstep(0.0, 0.40, distance(uv, vec2(0.80, 0.60)));

  base *= mix(1.0, 0.72, tex1 * 0.35);
  base += vec3(1.0) * tex2 * 0.05;

  // glow sottile sulla linea di separazione
  float glow = 1.0 - smoothstep(0.0, 0.08, abs(uv.y - horizon));
  base += vec3(1.0) * glow * 0.10;

  // foschia centrale
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
    tracksPerDay: 12
  };

  const itemGap = 0.82;
  const dayGap = 1.55;
  const labelGap = 1.15;

  const totalHeight =
    CONFIG.days * CONFIG.tracksPerDay * itemGap +
    (CONFIG.days - 1) * dayGap;

  const startY = totalHeight / 2;

  const sphereGeometry = new THREE.SphereGeometry(0.38, 24, 24);
  const spheres = [];

  for (let r = 0; r < CONFIG.days; r++) {
    for (let t = 0; t < CONFIG.tracksPerDay; t++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xf3efe8,
        emissive: 0x7a8ebc,
        emissiveIntensity: 0.22,
        metalness: 0.08,
        roughness: 0.30
      });

      const sphere = new THREE.Mesh(sphereGeometry, material);

      const absoluteIndex = r * CONFIG.tracksPerDay + t;
      const extraOffset = r * dayGap;
      const y = startY - absoluteIndex * itemGap - extraOffset;

      sphere.position.set(0, y, 0);

      const driftAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      sphere.userData = {
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 1.1 + Math.random() * 0.9,
        pulseAmount: 0.03 + Math.random() * 0.035,
        basePosition: sphere.position.clone(),
        driftAxis,
        driftAmount: 0.01 + Math.random() * 0.02,
        driftSpeed: 0.6 + Math.random() * 0.8,
        driftOffset: Math.random() * Math.PI * 2
      };

      spheres.push(sphere);
      scene.add(sphere);
    }
  }

  const labelLayer = document.getElementById("labelLayer");
  if (labelLayer) labelLayer.innerHTML = "";

  const dayLabels = [];

  for (let r = 0; r < CONFIG.days; r++) {
    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = `DAY ${r + 1}`;
    labelLayer?.appendChild(label);

    const firstIndex = r * CONFIG.tracksPerDay;
    const firstSphere = spheres[firstIndex];

    dayLabels.push({
      el: label,
      anchor: new THREE.Vector3(
        0,
        firstSphere.position.y + labelGap,
        0
      )
    });
  }

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

    const time = performance.now() * 0.001;

    bgSphere.rotation.y += 0.00035;

    const pulseCore = (Math.sin(time * 1.6) + 1) * 0.5;
    core.scale.setScalar(1 + pulseCore * 0.10);
    core.material.emissiveIntensity = 1.45 + pulseCore * 0.55;
    halo.material.opacity = 0.52 + pulseCore * 0.20;
    halo.scale.setScalar(9.5 + pulseCore * 1.2);
    haloOuter.material.opacity = 0.16 + pulseCore * 0.12;
    haloOuter.scale.setScalar(16.5 + pulseCore * 2.2);

    for (const sphere of spheres) {
      const {
        pulseOffset,
        pulseSpeed,
        pulseAmount,
        basePosition,
        driftAxis,
        driftAmount,
        driftSpeed,
        driftOffset
      } = sphere.userData;

      const pulse = Math.sin(time * pulseSpeed + pulseOffset) * pulseAmount;
      const drift = Math.sin(time * driftSpeed + driftOffset) * driftAmount;

      sphere.position.copy(
        basePosition.clone().add(
          driftAxis.clone().multiplyScalar(drift)
        )
      );

      sphere.scale.setScalar(1 + pulse);
      sphere.material.emissiveIntensity = 0.20 + pulse * 0.6;
    }

    for (const labelData of dayLabels) {
      const { el, anchor } = labelData;
      const projected = anchor.clone().project(camera);

      const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.opacity = "1";
    }

    renderer.render(scene, camera);
  }

  animate();
}

export function destroyArchiveList() {
  if (animationId) cancelAnimationFrame(animationId);

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