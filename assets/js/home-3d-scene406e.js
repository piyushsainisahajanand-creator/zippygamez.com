import * as THREE from "../vendor/three.module.min.js";

const host = document.querySelector("[data-home-3d-scene]");

if (host) {
  initializeScene(host);
}

function initializeScene(container) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch (error) {
    container.dataset.sceneState = "failed";
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1.5, 0.1, 60);
  const root = new THREE.Group();
  const cameraTarget = new THREE.Vector3(0, -0.05, 0);
  const pointerTarget = { x: 0, y: 0 };
  const pointerCurrent = { x: 0, y: 0 };
  let scrollTarget = 0;
  let scrollCurrent = 0;
  let frame = 0;
  let scrollFrame = 0;
  let resizeFrame = 0;
  let lastRender = 0;
  let visible = true;
  let pageVisible = !document.hidden;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.home3dCanvas = "";
  container.appendChild(renderer.domElement);

  camera.position.set(0, 0.25, 15);
  camera.lookAt(cameraTarget);
  scene.add(root);

  const palette = {
    ink: 0x0b1f36,
    screen: 0x082942,
    teal: 0x0891b2,
    aqua: 0x13b8b0,
    green: 0x65a30d,
    lime: 0x84cc16,
    purple: 0x7c3aed,
    violet: 0x8b5cf6,
    orange: 0xf59e0b,
    white: 0xf7fbff,
    pale: 0xdff3f5,
    dark: 0x183044
  };

  const materials = {
    white: standardMaterial(palette.white, 0.24, 0.2),
    pale: standardMaterial(palette.pale, 0.34, 0.08),
    dark: standardMaterial(palette.dark, 0.28, 0.38),
    screen: new THREE.MeshStandardMaterial({
      color: palette.screen,
      emissive: 0x063745,
      emissiveIntensity: 0.6,
      metalness: 0.32,
      roughness: 0.2
    }),
    teal: standardMaterial(palette.teal, 0.24, 0.2),
    aqua: standardMaterial(palette.aqua, 0.25, 0.18),
    green: standardMaterial(palette.green, 0.26, 0.16),
    lime: standardMaterial(palette.lime, 0.28, 0.12),
    purple: standardMaterial(palette.purple, 0.24, 0.2),
    violet: standardMaterial(palette.violet, 0.24, 0.2),
    orange: standardMaterial(palette.orange, 0.28, 0.14)
  };

  addLighting(scene, palette);
  addBackdrop(scene, palette);

  const device = createDevice(materials);
  device.position.set(0, -1.35, 0.05);
  device.rotation.set(-0.42, 0.03, -0.025);
  root.add(device);

  const controller = createController(materials);
  controller.position.set(0, 1.4, 0.95);
  controller.rotation.set(-0.2, 0.055, -0.018);
  root.add(controller);

  const tileApps = createTile("apps", materials.teal, materials.white, materials.dark);
  tileApps.position.set(-4.28, 2.42, 0.72);
  tileApps.rotation.set(-0.12, 0.24, -0.12);
  root.add(tileApps);

  const tilePlay = createTile("play", materials.green, materials.white, materials.dark);
  tilePlay.position.set(4.22, 2.34, 0.66);
  tilePlay.rotation.set(-0.09, -0.25, 0.11);
  root.add(tilePlay);

  const tileStore = createTile("store", materials.purple, materials.white, materials.dark);
  tileStore.position.set(-4.55, -2.08, 1.08);
  tileStore.rotation.set(0.05, 0.16, 0.09);
  tileStore.scale.setScalar(0.92);
  root.add(tileStore);

  const tileArticles = createTile("articles", materials.orange, materials.white, materials.dark);
  tileArticles.position.set(4.55, -2.08, 1.08);
  tileArticles.rotation.set(0.05, -0.16, -0.09);
  tileArticles.scale.setScalar(0.92);
  root.add(tileArticles);

  const motionItems = [
    motionConfig(device, 0.0, 0.08, 0.72, -0.08, -0.05, -0.08, 0.05),
    motionConfig(controller, 1.4, 0.15, 0.86, 0.12, 0.1, 0.12, -0.08),
    motionConfig(tileApps, 0.5, 0.19, 0.72, 0.28, 0.2, 0.18, -0.12),
    motionConfig(tilePlay, 1.7, 0.17, 0.78, -0.26, 0.19, 0.16, 0.12),
    motionConfig(tileStore, 2.6, 0.17, 0.74, 0.08, -0.18, -0.04, 0.08),
    motionConfig(tileArticles, 3.6, 0.17, 0.8, -0.08, -0.18, -0.04, -0.08)
  ];

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 500 ? 1.25 : 1.5));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    root.scale.setScalar(width < 390 ? 0.9 : width < 520 ? 0.94 : 1);
    renderScene(0);
  }

  function updateScrollTarget() {
    const rect = container.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    scrollTarget = clamp((window.innerHeight / 2 - center) / Math.max(window.innerHeight * 0.75, 1), -1, 1);
    startLoop();
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = 0;
      updateScrollTarget();
    });
  }

  function requestResize() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(function () {
      resizeFrame = 0;
      resize();
    });
  }

  function renderScene(time) {
    const elapsed = time * 0.001;

    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.09;
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.09;
    scrollCurrent += (scrollTarget - scrollCurrent) * 0.08;

    root.rotation.x = pointerCurrent.y * -0.035 + scrollCurrent * 0.025;
    root.rotation.y = pointerCurrent.x * 0.055 + scrollCurrent * 0.035;
    root.position.y = scrollCurrent * 0.1;

    motionItems.forEach(function (item) {
      const wave = reducedMotion ? 0 : Math.sin(elapsed * item.speed + item.phase) * item.float;
      item.object.position.x = item.position.x + pointerCurrent.x * item.pointerX + scrollCurrent * item.scrollX;
      item.object.position.y = item.position.y + wave + pointerCurrent.y * item.pointerY + scrollCurrent * item.scrollY;
      item.object.position.z = item.position.z + Math.cos(elapsed * item.speed * 0.7 + item.phase) * (reducedMotion ? 0 : item.float * 0.28);
      item.object.rotation.x = item.rotation.x - pointerCurrent.y * item.tilt;
      item.object.rotation.y = item.rotation.y + pointerCurrent.x * item.tilt;
      item.object.rotation.z = item.rotation.z + wave * item.spin + pointerCurrent.x * item.spin * 0.025;
    });

    camera.position.x = pointerCurrent.x * 0.18;
    camera.position.y = 0.25 - pointerCurrent.y * 0.11 + scrollCurrent * 0.1;
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
  }

  function tick(time) {
    frame = 0;
    if (!visible || !pageVisible || reducedMotion) return;
    if (time - lastRender >= 22) {
      lastRender = time;
      renderScene(time);
    }
    frame = window.requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!frame && visible && pageVisible && !reducedMotion) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  if (finePointer && !reducedMotion) {
    let pointerFrame = 0;
    let pointerClientX = 0;
    let pointerClientY = 0;

    container.addEventListener("pointermove", function (event) {
      pointerClientX = event.clientX;
      pointerClientY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(function () {
        pointerFrame = 0;
        const rect = container.getBoundingClientRect();
        pointerTarget.x = clamp(((pointerClientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
        pointerTarget.y = clamp(((pointerClientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
        startLoop();
      });
    }, { passive: true });

    container.addEventListener("pointerleave", function () {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      pointerTarget.x = 0;
      pointerTarget.y = 0;
      startLoop();
    });
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestResize, { passive: true });
  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    if (pageVisible) startLoop();
    else stopLoop();
  });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(requestResize);
    resizeObserver.observe(container);
  }

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(function (entries) {
      visible = Boolean(entries[0] && entries[0].isIntersecting);
      if (visible) startLoop();
      else stopLoop();
    }, { rootMargin: "120px 0px" });
    visibilityObserver.observe(container);
  }

  renderer.domElement.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    stopLoop();
    container.classList.remove("is-ready");
    container.dataset.sceneState = "failed";
  });

  resize();
  updateScrollTarget();
  renderScene(0);
  container.classList.add("is-ready");
  container.dataset.sceneState = "ready";
  startLoop();
}

function standardMaterial(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  shape.closePath();
  return shape;
}

function extrudeShape(shape, depth, material, bevelSize) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 18,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: Math.min(bevelSize, depth * 0.45),
    bevelThickness: Math.min(bevelSize, depth * 0.42)
  });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function roundedMesh(width, height, radius, depth, material, bevelSize) {
  return extrudeShape(roundedRectShape(width, height, radius), depth, material, bevelSize || 0.05);
}

function createDevice(materials) {
  const group = new THREE.Group();
  const accent = roundedMesh(7.28, 3.72, 0.42, 0.42, materials.teal, 0.08);
  accent.position.z = -0.1;
  group.add(accent);

  const body = roundedMesh(7.12, 3.55, 0.38, 0.5, materials.white, 0.09);
  group.add(body);

  const frame = roundedMesh(6.35, 2.83, 0.28, 0.16, materials.dark, 0.04);
  frame.position.z = 0.34;
  group.add(frame);

  const screen = roundedMesh(6.12, 2.58, 0.23, 0.13, materials.screen, 0.035);
  screen.position.z = 0.44;
  group.add(screen);

  const topBar = roundedMesh(3.8, 0.18, 0.09, 0.07, materials.aqua, 0.02);
  topBar.position.set(-0.55, 0.8, 0.55);
  group.add(topBar);

  const leftPanel = roundedMesh(2.25, 1.0, 0.18, 0.09, materials.teal, 0.025);
  leftPanel.position.set(-1.35, -0.05, 0.56);
  group.add(leftPanel);

  const rightPanel = roundedMesh(1.72, 1.28, 0.2, 0.09, materials.green, 0.025);
  rightPanel.position.set(1.38, -0.18, 0.57);
  group.add(rightPanel);

  const smallPanel = roundedMesh(1.28, 0.35, 0.12, 0.08, materials.lime, 0.02);
  smallPanel.position.set(1.12, 0.48, 0.59);
  group.add(smallPanel);

  const control = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.11, 32), materials.aqua);
  control.rotation.x = Math.PI / 2;
  control.position.set(0.15, -0.08, 0.63);
  group.add(control);

  const sideButton = roundedMesh(1.05, 0.18, 0.08, 0.1, materials.teal, 0.02);
  sideButton.position.set(3.46, -0.72, 0.02);
  sideButton.rotation.z = Math.PI / 2;
  group.add(sideButton);

  return group;
}

function controllerShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.28, 1.08);
  shape.bezierCurveTo(-2.95, 1.02, -3.38, 0.35, -3.28, -0.62);
  shape.bezierCurveTo(-3.14, -1.85, -2.35, -2.14, -1.65, -1.28);
  shape.lineTo(-0.92, -0.56);
  shape.quadraticCurveTo(0, -0.9, 0.92, -0.56);
  shape.lineTo(1.65, -1.28);
  shape.bezierCurveTo(2.35, -2.14, 3.14, -1.85, 3.28, -0.62);
  shape.bezierCurveTo(3.38, 0.35, 2.95, 1.02, 2.28, 1.08);
  shape.quadraticCurveTo(1.15, 1.34, 0.58, 1.03);
  shape.quadraticCurveTo(0, 0.78, -0.58, 1.03);
  shape.quadraticCurveTo(-1.15, 1.34, -2.28, 1.08);
  shape.closePath();
  return shape;
}

function crossShape(size, thickness) {
  const h = size / 2;
  const t = thickness / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-t, h);
  shape.lineTo(t, h);
  shape.lineTo(t, t);
  shape.lineTo(h, t);
  shape.lineTo(h, -t);
  shape.lineTo(t, -t);
  shape.lineTo(t, -h);
  shape.lineTo(-t, -h);
  shape.lineTo(-t, -t);
  shape.lineTo(-h, -t);
  shape.lineTo(-h, t);
  shape.lineTo(-t, t);
  shape.closePath();
  return shape;
}

function createControllerMaterials() {
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: 0xe9eef2,
      roughness: 0.27,
      metalness: 0.04,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18
    }),
    shellSide: new THREE.MeshStandardMaterial({ color: 0x64798a, roughness: 0.38, metalness: 0.34 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x102438, roughness: 0.76, metalness: 0.03 }),
    rubberSoft: new THREE.MeshStandardMaterial({ color: 0x20384b, roughness: 0.62, metalness: 0.05 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x7c91a2, roughness: 0.22, metalness: 0.72 }),
    button: new THREE.MeshPhysicalMaterial({
      color: 0x172d42,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 0.95,
      clearcoatRoughness: 0.1
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x0aa6b3,
      emissive: 0x075e6c,
      emissiveIntensity: 0.24,
      roughness: 0.24,
      metalness: 0.36
    }),
    accentGlow: new THREE.MeshStandardMaterial({
      color: 0x0aa6b3,
      emissive: 0x07899a,
      emissiveIntensity: 0.28,
      roughness: 0.28,
      metalness: 0.2,
      transparent: true,
      opacity: 0.28
    }),
    led: new THREE.MeshStandardMaterial({
      color: 0x7ddc3a,
      emissive: 0x4c9f12,
      emissiveIntensity: 0.92,
      roughness: 0.2,
      metalness: 0.08
    })
  };
}

function faceCylinder(radiusTop, radiusBottom, depth, material, segments) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, depth, segments || 40),
    material
  );
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function createButtonLabel(label, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "800 62px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 48, 51);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), material);
}

function createFaceButton(controllerMaterials, accentColor, label) {
  const group = new THREE.Group();
  const accent = standardMaterial(accentColor, 0.24, 0.22);
  const ring = faceCylinder(0.235, 0.235, 0.07, accent, 40);
  group.add(ring);

  const button = faceCylinder(0.18, 0.195, 0.14, controllerMaterials.button, 40);
  button.position.z = 0.09;
  group.add(button);

  const highlight = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 18, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.42 })
  );
  highlight.scale.set(1, 0.42, 0.28);
  highlight.position.set(-0.055, 0.06, 0.18);
  group.add(highlight);

  const labelMesh = createButtonLabel(label, accentColor);
  labelMesh.position.z = 0.175;
  group.add(labelMesh);
  return group;
}

function createAnalogStick(controllerMaterials) {
  const group = new THREE.Group();

  const metalRing = faceCylinder(0.43, 0.43, 0.07, controllerMaterials.metal, 48);
  group.add(metalRing);

  const well = faceCylinder(0.355, 0.39, 0.12, controllerMaterials.rubberSoft, 48);
  well.position.z = 0.07;
  group.add(well);

  const stem = faceCylinder(0.13, 0.17, 0.18, controllerMaterials.rubber, 40);
  stem.position.z = 0.19;
  group.add(stem);

  const cap = faceCylinder(0.27, 0.305, 0.14, controllerMaterials.rubber, 48);
  cap.position.z = 0.3;
  group.add(cap);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.026, 10, 48), controllerMaterials.rubberSoft);
  rim.position.z = 0.39;
  group.add(rim);

  const inset = faceCylinder(0.17, 0.17, 0.025, controllerMaterials.rubberSoft, 40);
  inset.position.z = 0.375;
  group.add(inset);
  return group;
}

function createController(materials) {
  const group = new THREE.Group();
  const shape = controllerShape();
  const controllerMaterials = createControllerMaterials();

  const underglow = extrudeShape(shape, 0.66, controllerMaterials.accentGlow, 0.1);
  underglow.scale.set(1.027, 1.027, 1);
  underglow.position.z = -0.2;
  group.add(underglow);

  const sideWall = extrudeShape(shape, 0.75, controllerMaterials.shellSide, 0.11);
  sideWall.scale.set(1.018, 1.018, 1);
  sideWall.position.z = -0.11;
  group.add(sideWall);

  const body = extrudeShape(shape, 0.66, controllerMaterials.shell, 0.12);
  body.position.z = 0.08;
  group.add(body);

  const faceShell = extrudeShape(shape, 0.12, controllerMaterials.shell, 0.055);
  faceShell.scale.set(0.973, 0.973, 1);
  faceShell.position.z = 0.42;
  group.add(faceShell);

  [-1, 1].forEach(function (side) {
    const shoulder = roundedMesh(1.12, 0.26, 0.1, 0.24, controllerMaterials.rubber, 0.035);
    shoulder.position.set(side * 1.98, 1.02, -0.12);
    shoulder.rotation.z = side * 0.03;
    group.add(shoulder);

    const trigger = roundedMesh(0.62, 0.22, 0.09, 0.22, controllerMaterials.rubberSoft, 0.03);
    trigger.position.set(side * 2.65, 0.8, -0.18);
    trigger.rotation.z = side * 0.15;
    group.add(trigger);

    const grip = roundedMesh(0.56, 1.12, 0.24, 0.12, controllerMaterials.rubber, 0.035);
    grip.position.set(side * 2.48, -0.55, 0.48);
    grip.rotation.z = side * 0.16;
    group.add(grip);

    [-0.24, -0.08, 0.08, 0.24].forEach(function (offset) {
      const groove = roundedMesh(0.29, 0.032, 0.015, 0.026, controllerMaterials.rubberSoft, 0.008);
      groove.position.set(side * 2.48, -0.55 + offset, 0.56);
      groove.rotation.z = side * 0.16;
      group.add(groove);
    });
  });

  const dpadBase = faceCylinder(0.57, 0.57, 0.08, controllerMaterials.rubberSoft, 48);
  dpadBase.position.set(-1.62, 0.25, 0.49);
  group.add(dpadBase);

  const dpad = extrudeShape(crossShape(0.96, 0.34), 0.17, controllerMaterials.rubber, 0.025);
  dpad.position.set(-1.62, 0.25, 0.61);
  group.add(dpad);

  const dpadPivot = faceCylinder(0.12, 0.12, 0.025, controllerMaterials.rubberSoft, 32);
  dpadPivot.position.set(-1.62, 0.25, 0.71);
  group.add(dpadPivot);

  const faceButtons = [
    { x: 1.64, y: 0.58, color: 0xf4c542, label: "Y" },
    { x: 1.96, y: 0.25, color: 0xe65555, label: "B" },
    { x: 1.32, y: 0.25, color: 0x37a7e8, label: "X" },
    { x: 1.64, y: -0.08, color: 0x67b63f, label: "A" }
  ];
  faceButtons.forEach(function (config) {
    const button = createFaceButton(controllerMaterials, config.color, config.label);
    button.position.set(config.x, config.y, 0.5);
    group.add(button);
  });

  [[-0.67, -0.53], [0.66, -0.48]].forEach(function (position) {
    const stick = createAnalogStick(controllerMaterials);
    stick.position.set(position[0], position[1], 0.48);
    group.add(stick);
  });

  const centerPanel = roundedMesh(1.35, 0.48, 0.16, 0.11, controllerMaterials.rubberSoft, 0.025);
  centerPanel.position.set(0, 0.51, 0.52);
  group.add(centerPanel);

  const centerInset = roundedMesh(1.08, 0.29, 0.11, 0.035, controllerMaterials.rubber, 0.012);
  centerInset.position.set(0, 0.51, 0.6);
  group.add(centerInset);

  [-0.44, 0.44].forEach(function (x, index) {
    const menuButton = roundedMesh(index ? 0.2 : 0.18, 0.1, 0.04, 0.07, controllerMaterials.rubber, 0.014);
    menuButton.position.set(x, 0.06, 0.57);
    group.add(menuButton);
  });

  const homeRing = faceCylinder(0.18, 0.18, 0.055, controllerMaterials.metal, 32);
  homeRing.position.set(0, 0.07, 0.57);
  group.add(homeRing);

  const homeButton = faceCylinder(0.12, 0.12, 0.07, controllerMaterials.accent, 32);
  homeButton.position.set(0, 0.07, 0.62);
  group.add(homeButton);

  [-0.13, 0, 0.13].forEach(function (x) {
    const led = faceCylinder(0.027, 0.027, 0.02, controllerMaterials.led, 18);
    led.position.set(x, -0.2, 0.62);
    group.add(led);
  });

  [[-2.58, 0.48], [2.58, 0.48], [-2.22, -1.02], [2.22, -1.02]].forEach(function (position) {
    const screw = faceCylinder(0.035, 0.035, 0.025, controllerMaterials.metal, 16);
    screw.position.set(position[0], position[1], 0.52);
    group.add(screw);
  });

  const lowerAccent = roundedMesh(1.2, 0.045, 0.02, 0.025, materials.teal, 0.008);
  lowerAccent.position.set(0, -0.94, 0.48);
  group.add(lowerAccent);

  return group;
}

function createTile(type, accentMaterial, whiteMaterial, darkMaterial) {
  const group = new THREE.Group();
  const back = roundedMesh(1.72, 1.72, 0.28, 0.28, accentMaterial, 0.06);
  back.position.z = -0.1;
  group.add(back);

  const face = roundedMesh(1.52, 1.52, 0.24, 0.25, whiteMaterial, 0.055);
  face.position.z = 0.08;
  group.add(face);

  const icon = new THREE.Group();
  icon.position.z = 0.34;
  group.add(icon);

  if (type === "apps") {
    const outer = roundedMesh(0.72, 0.72, 0.13, 0.1, accentMaterial, 0.02);
    outer.rotation.z = Math.PI / 4;
    icon.add(outer);
    const inner = roundedMesh(0.34, 0.34, 0.06, 0.12, whiteMaterial, 0.015);
    inner.rotation.z = Math.PI / 4;
    inner.position.z = 0.1;
    icon.add(inner);
  } else if (type === "play") {
    const triangle = new THREE.Shape();
    triangle.moveTo(-0.28, -0.38);
    triangle.lineTo(0.4, 0);
    triangle.lineTo(-0.28, 0.38);
    triangle.closePath();
    icon.add(extrudeShape(triangle, 0.12, accentMaterial, 0.025));
  } else if (type === "store") {
    [[-0.23, 0.23], [0.23, 0.23], [-0.23, -0.23], [0.23, -0.23]].forEach(function (position, index) {
      const block = roundedMesh(0.32, 0.32, 0.07, 0.11, index === 0 ? darkMaterial : accentMaterial, 0.018);
      block.position.set(position[0], position[1], index * 0.01);
      icon.add(block);
    });
  } else {
    const page = roundedMesh(0.78, 0.9, 0.12, 0.1, accentMaterial, 0.025);
    icon.add(page);
    [-0.24, 0, 0.24].forEach(function (y, index) {
      const line = roundedMesh(index === 2 ? 0.34 : 0.5, 0.07, 0.03, 0.08, whiteMaterial, 0.012);
      line.position.set(-0.04, y, 0.1);
      icon.add(line);
    });
  }

  return group;
}

function addLighting(scene, palette) {
  scene.add(new THREE.HemisphereLight(0xf2fbff, 0xdcebd5, 2.7));

  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-4, 6, 9);
  scene.add(key);

  const teal = new THREE.PointLight(palette.teal, 18, 14, 2);
  teal.position.set(-5, 2.5, 6);
  scene.add(teal);

  const green = new THREE.PointLight(palette.green, 14, 13, 2);
  green.position.set(5, -1.5, 5);
  scene.add(green);
}

function addBackdrop(scene, palette) {
  const ringMaterial = new THREE.MeshBasicMaterial({ color: palette.teal, transparent: true, opacity: 0.13 });
  const greenRingMaterial = new THREE.MeshBasicMaterial({ color: palette.green, transparent: true, opacity: 0.1 });
  const ringOne = new THREE.Mesh(new THREE.TorusGeometry(4.65, 0.025, 8, 128), ringMaterial);
  ringOne.position.set(0, -0.05, -1.5);
  ringOne.scale.y = 0.72;
  scene.add(ringOne);

  const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(3.75, 0.02, 8, 128), greenRingMaterial);
  ringTwo.position.set(0, -0.05, -1.45);
  ringTwo.scale.y = 0.72;
  scene.add(ringTwo);

  const shadowTexture = createShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.58 });
  const deviceShadow = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 3.2), shadowMaterial);
  deviceShadow.position.set(0, -2.05, -0.95);
  scene.add(deviceShadow);

  const controllerShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.5), shadowMaterial.clone());
  controllerShadow.material.opacity = 0.28;
  controllerShadow.position.set(0, 0.55, -0.9);
  scene.add(controllerShadow);
}

function createShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 64, 5, 128, 64, 118);
  gradient.addColorStop(0, "rgba(17, 47, 66, 0.38)");
  gradient.addColorStop(0.48, "rgba(17, 47, 66, 0.16)");
  gradient.addColorStop(1, "rgba(17, 47, 66, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function motionConfig(object, phase, float, speed, pointerX, pointerY, scrollX, scrollY) {
  return {
    object,
    phase,
    float,
    speed,
    pointerX,
    pointerY,
    scrollX,
    scrollY,
    tilt: object === null ? 0 : 0.035 + Math.abs(pointerX) * 0.08,
    spin: 0.24 + Math.abs(pointerX) * 0.32,
    position: object.position.clone(),
    rotation: object.rotation.clone()
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
