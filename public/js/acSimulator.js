/**
 * acSimulator.js — High-Performance Three.js 3D Interactive AC Simulator
 * Extreme Sales & Services (ESS) Precision HVAC Platform
 * 
 * Features:
 * - 3D Inverter AC indoor unit mesh with realistic materials, louvers, and LED display
 * - Dynamic airflow cooling particle physics system
 * - Real-time temperature dial (16°C - 28°C) with adaptive color temperature lighting
 * - Mode presets: Turbo Cool, Eco Inverter, Silent Sleep
 * - Live energy consumption and airflow telemetry calculation
 * - Touch & mouse interactive 3D orbit rotation with damped inertia
 */

(function () {
  'use strict';

  let scene, camera, renderer, acGroup, particles, particleGeo, particleMat;
  let pointLight, spotLight;
  let currentTemp = 18;
  let currentMode = 'turbo';
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotation = { x: 0.1, y: -0.2 };
  let currentRotation = { x: 0.1, y: -0.2 };

  const canvas = document.getElementById('acSimulatorCanvas');
  const container = document.getElementById('acSimulatorContainer');

  if (!canvas || typeof THREE === 'undefined') {
    console.warn('Three.js or AC canvas not found — skipping 3D initialization.');
    return;
  }

  // --- 1. Scene & Camera Setup ---
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0f172a, 0.05);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
  camera.position.set(0, 0.5, 5.2);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // --- 2. Lighting Setup ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  spotLight = new THREE.DirectionalLight(0xffffff, 1.2);
  spotLight.position.set(5, 8, 6);
  spotLight.castShadow = true;
  scene.add(spotLight);

  pointLight = new THREE.PointLight(0x06b6d4, 2.5, 6);
  pointLight.position.set(0, -0.6, 0.8);
  scene.add(pointLight);

  // --- 3. Construct 3D AC Indoor Unit Mesh ---
  acGroup = new THREE.Group();

  // Primary Chassis (Rounded Split AC body)
  const bodyGeo = new THREE.BoxGeometry(3.6, 1.0, 0.7, 4, 4, 4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.15,
    roughness: 0.25,
    envMapIntensity: 0.8
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  acGroup.add(bodyMesh);

  // Front Curved Accenting Panel
  const panelGeo = new THREE.CylinderGeometry(1.85, 1.85, 3.58, 32, 1, false, 0, Math.PI * 0.4);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.3,
    roughness: 0.15
  });
  const frontPanel = new THREE.Mesh(panelGeo, panelMat);
  frontPanel.rotation.z = Math.PI * 0.5;
  frontPanel.rotation.x = -Math.PI * 0.2;
  frontPanel.position.set(0, 0.05, 0.25);
  acGroup.add(frontPanel);

  // Lower Airflow Discharge Louver (Vent)
  const louverGeo = new THREE.BoxGeometry(3.2, 0.12, 0.25);
  const louverMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.5,
    roughness: 0.4
  });
  const louverMesh = new THREE.Mesh(louverGeo, louverMat);
  louverMesh.position.set(0, -0.42, 0.28);
  louverMesh.rotation.x = 0.35; // opened downward angle
  acGroup.add(louverMesh);

  // Brand Badge Chrome Strip
  const stripGeo = new THREE.BoxGeometry(3.4, 0.03, 0.02);
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.1
  });
  const stripMesh = new THREE.Mesh(stripGeo, stripMat);
  stripMesh.position.set(0, -0.32, 0.38);
  acGroup.add(stripMesh);

  // Digital LED Temperature Canvas Texture
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 128;
  ledCanvas.height = 64;
  const ledCtx = ledCanvas.getContext('2d');

  function updateLedTexture(temp) {
    ledCtx.fillStyle = '#0f172a';
    ledCtx.fillRect(0, 0, 128, 64);

    ledCtx.fillStyle = '#38bdf8';
    ledCtx.font = 'bold 36px monospace';
    ledCtx.textAlign = 'center';
    ledCtx.textBaseline = 'middle';
    ledCtx.fillText(`${temp}°C`, 64, 32);

    if (ledTexture) ledTexture.needsUpdate = true;
  }

  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  updateLedTexture(currentTemp);

  const ledGeo = new THREE.PlaneGeometry(0.5, 0.25);
  const ledMat = new THREE.MeshBasicMaterial({
    map: ledTexture,
    transparent: true,
    opacity: 0.95
  });
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.position.set(1.1, 0.12, 0.45);
  acGroup.add(ledMesh);

  scene.add(acGroup);

  // --- 4. Cooling Airflow Particle System ---
  const PARTICLE_COUNT = 350;
  particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleVelocities = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Start along the discharge vent
    particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 3.0; // x: across width
    particlePositions[i * 3 + 1] = -0.45 - Math.random() * 0.1; // y: just under louver
    particlePositions[i * 3 + 2] = 0.3 + Math.random() * 0.3;   // z: projected forward

    particleVelocities.push({
      x: (Math.random() - 0.5) * 0.015,
      y: -0.02 - Math.random() * 0.03, // downward flow
      z: 0.02 + Math.random() * 0.03   // forward billowing
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  // Glowing circular particle texture
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 32;
  pCanvas.height = 32;
  const pCtx = pCanvas.getContext('2d');
  const gradient = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
  gradient.addColorStop(0.8, 'rgba(6, 182, 212, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  pCtx.fillStyle = gradient;
  pCtx.fillRect(0, 0, 32, 32);

  const pTexture = new THREE.CanvasTexture(pCanvas);

  particleMat = new THREE.PointsMaterial({
    size: 0.14,
    map: pTexture,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0x38bdf8
  });

  particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // --- 5. Interactive Touch / Mouse Drag Handling ---
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;

    targetRotation.y += deltaX * 0.008;
    targetRotation.x = Math.max(-0.4, Math.min(0.4, targetRotation.x + deltaY * 0.005));

    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  // Touch Support
  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;

    targetRotation.y += deltaX * 0.008;
    targetRotation.x = Math.max(-0.4, Math.min(0.4, targetRotation.x + deltaY * 0.005));

    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  // --- 6. Telemetry & Temperature Controller ---
  window.setSimulatorTemp = function (newTemp) {
    currentTemp = Math.max(16, Math.min(28, Math.round(newTemp)));
    const tempDisplay = document.getElementById('simTempDisplay');
    const tempSlider = document.getElementById('simTempSlider');
    if (tempDisplay) tempDisplay.innerText = `${currentTemp}°C`;
    if (tempSlider) tempSlider.value = currentTemp;

    updateLedTexture(currentTemp);

    // Dynamic light color temperature based on degrees
    let lightColor = 0x38bdf8;
    if (currentTemp <= 18) {
      lightColor = 0x06b6d4; // Ice Cyan
      particleMat.color.setHex(0x00f0ff);
    } else if (currentTemp <= 23) {
      lightColor = 0x3b82f6; // Optimal Blue
      particleMat.color.setHex(0x60a5fa);
    } else {
      lightColor = 0xf59e0b; // Warm Eco Amber
      particleMat.color.setHex(0xfbbf24);
    }

    pointLight.color.setHex(lightColor);

    // Update Telemetry Metrics
    updateTelemetryStats();
  };

  window.changeSimulatorTemp = function (delta) {
    window.setSimulatorTemp(currentTemp + delta);
  };

  window.setSimulatorMode = function (mode, btnElement) {
    currentMode = mode;
    document.querySelectorAll('.sim-mode-btn').forEach(b => {
      b.className = 'sim-mode-btn py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700';
    });

    if (btnElement) {
      btnElement.className = 'sim-mode-btn py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-500 bg-blue-600/30 text-blue-300 shadow-lg shadow-blue-500/20';
    }

    if (mode === 'turbo') {
      window.setSimulatorTemp(16);
    } else if (mode === 'eco') {
      window.setSimulatorTemp(24);
    } else if (mode === 'silent') {
      window.setSimulatorTemp(22);
    }
  };

  function updateTelemetryStats() {
    // Realistic power consumption calculations (kW/h)
    let powerKw = 0.55 + ((28 - currentTemp) * 0.08);
    let soundDb = 22 + ((28 - currentTemp) * 1.5);
    let airflowCfm = 550 + ((28 - currentTemp) * 32);

    if (currentMode === 'turbo') {
      powerKw *= 1.25;
      soundDb = 44;
      airflowCfm = 920;
    } else if (currentMode === 'silent') {
      soundDb = 19;
      powerKw *= 0.85;
      airflowCfm = 480;
    }

    const powerEl = document.getElementById('simMetricPower');
    const soundEl = document.getElementById('simMetricSound');
    const airEl = document.getElementById('simMetricAirflow');

    if (powerEl) powerEl.innerText = `${powerKw.toFixed(2)} kW/h`;
    if (soundEl) soundEl.innerText = `${Math.round(soundDb)} dB`;
    if (airEl) airEl.innerText = `${Math.round(airflowCfm)} CFM`;
  }

  // --- 7. Animation Loop ---
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Smooth Damped Inertia on Rotation
    if (!isDragging) {
      targetRotation.y += 0.002; // gentle continuous idle drift
    }
    currentRotation.x += (targetRotation.x - currentRotation.x) * 0.08;
    currentRotation.y += (targetRotation.y - currentRotation.y) * 0.08;

    acGroup.rotation.x = currentRotation.x;
    acGroup.rotation.y = currentRotation.y;

    // Subtle floating breathing effect
    acGroup.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.04;

    // Animate Airflow Cooling Particles
    const positions = particleGeo.attributes.position.array;
    const speedFactor = currentMode === 'turbo' ? 1.8 : (currentMode === 'silent' ? 0.6 : 1.0);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 0] += particleVelocities[i].x * speedFactor;
      positions[i * 3 + 1] += particleVelocities[i].y * speedFactor;
      positions[i * 3 + 2] += particleVelocities[i].z * speedFactor;

      // Reset when particle disperses or falls past floor
      if (positions[i * 3 + 1] < -2.4 || positions[i * 3 + 2] > 3.0) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 3.0;
        positions[i * 3 + 1] = -0.45;
        positions[i * 3 + 2] = 0.35 + Math.random() * 0.2;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  // Handle Container Resizing
  window.addEventListener('resize', () => {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Start Animation
  animate();
  updateTelemetryStats();
})();
