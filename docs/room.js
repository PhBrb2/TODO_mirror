import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

(() => {
  "use strict";

  const ROOM_BG_COLOR = 0xf2e2cf;
  const ROOM_FOG_COLOR = 0xf2e2cf;
  const ROOM_FOG_NEAR = 12;
  const ROOM_FOG_FAR = 40;
  const HEMI_SKY_COLOR = 0xffe0b8;
  const HEMI_GROUND_COLOR = 0xd9b38c;
  const HEMI_INTENSITY = 0.7;
  const KEY_LIGHT_COLOR = 0xffd9a0;
  const KEY_LIGHT_INTENSITY = 1.6;
  const SLAB_MODEL_URL = "./models/slab.glb";
  const TABLE_MODEL_URL = "./models/table.glb";
  const PLANT_MODEL_URL = "./models/plant.glb";
  const LAMP_MODEL_URL = "./models/lamp.glb";
  const DRACO_DECODER_PATH = "./vendor/addons/libs/draco/gltf/";
  const CELL_SPACING = 2;
  const GRID_SCALE = 1 / 6;
  const SLAB_TOP_Y = 0.115;
  const TABLE_SCALE = 2;
  const TABLE_BASE_Y = -0.279;
  const TABLE_TOP_Y = 0.275;
  const PLANT_BASE_Y = -0.952;
  const LAMP_BASE_Y = -0.951;
  const ITEM_ON_TABLE_OFFSET = 1.6;
  const PLANT_SCALE = 1;
  const LAMP_SCALE = 1;
  const LAMP_LIGHT_COLOR = 0xffb46b;
  const LAMP_LIGHT_INTENSITY = 1.2;
  const LAMP_LIGHT_DISTANCE = 6;
  const LAMP_LIGHT_Y_OFFSET = 0.5;
  const WINDOW_POSITION = [-0.33, 0.32, -0.45];
  const SUNSPOT_TARGET = [0, 0.2, 0.05];
  const SUNSPOT_COLOR = 0xffd9a0;
  const SUNSPOT_INTENSITY = 0.4;
  const SUNSPOT_ANGLE = 0.5;
  const SUNSPOT_PENUMBRA = 0.6;
  const BLOOM_STRENGTH = 0.12;
  const BLOOM_RADIUS = 0.4;
  const BLOOM_THRESHOLD = 0.96;
  const DUST_COUNT = 220;
  const DUST_SIZE = 0.012;
  const DUST_OPACITY = 0.5;
  const DUST_DRIFT_SPEED = 0.06;
  const DUST_COLOR = 0xffe8c4;
  const CAMERA_FOV = 40;
  const CAMERA_POSITION = [5, 4.5, 7];
  const CAMERA_TARGET = [0, 0, 0];
  const LIGHT_POSITION = [6, 5, -2];
  const SHADOW_MAP_SIZE = 2048;
  const SHADOW_CAMERA_BOUNDS = 8;
  const SHADOW_RADIUS = 4;
  const FILL_LIGHT_COLOR = 0xbcd0ff;
  const FILL_LIGHT_INTENSITY = 0.35;
  const FILL_LIGHT_POSITION = [-5, 3, -4];
  const CONTROLS_MIN_DISTANCE = 2;
  const CONTROLS_MAX_DISTANCE = 30;
  const CONTROLS_MAX_POLAR_ANGLE = Math.PI / 2;
  const PAN_MARGIN_PX = 32;

  function createDustTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.4, "rgba(255, 255, 255, 0.4)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  function createDust() {
    const positions = new Float32Array(DUST_COUNT * 3);
    const seeds = new Float32Array(DUST_COUNT);
    const from = new THREE.Vector3(...WINDOW_POSITION);
    const to = new THREE.Vector3(...SUNSPOT_TARGET);
    for (let i = 0; i < DUST_COUNT; i++) {
      const t = Math.random();
      const spread = 0.06 + t * 0.1;
      positions[i * 3] = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = from.z + (to.z - from.z) * t + (Math.random() - 0.5) * spread;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: DUST_COLOR,
      size: DUST_SIZE,
      transparent: true,
      opacity: DUST_OPACITY,
      map: createDustTexture(),
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    points.userData.seeds = seeds;
    points.userData.basePositions = positions.slice();
    return points;
  }

  function updateDust(dust, elapsed) {
    const positions = dust.geometry.attributes.position;
    const base = dust.userData.basePositions;
    const seeds = dust.userData.seeds;
    for (let i = 0; i < seeds.length; i++) {
      const t = elapsed * DUST_DRIFT_SPEED + seeds[i];
      positions.array[i * 3] = base[i * 3] + Math.sin(t) * 0.25;
      positions.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.7) * 0.15;
      positions.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.9) * 0.2;
    }
    positions.needsUpdate = true;
  }
  function loadModel(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => {
        console.error("Failed to load model:", url);
        reject(new Error(url));
      });
    });
  }

  function applyShadows(obj, cast, receive) {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = cast;
        child.receiveShadow = receive;
      }
    });
  }

  function makeLampGlow(lamp) {
    const glow = new THREE.PointLight(LAMP_LIGHT_COLOR, LAMP_LIGHT_INTENSITY, LAMP_LIGHT_DISTANCE);
    glow.position.y = LAMP_LIGHT_Y_OFFSET;
    lamp.add(glow);
  }

  // Registry of purchasable items: how each model is placed in the room.
  // supports: which slab-relative surface it sits on, its scale, and an
  // optional decorate callback (e.g. the lamp's inner light).
  const ITEM_REGISTRY = {
    table: {
      url: "./models/table.glb",
      scale: TABLE_SCALE,
      baseY: TABLE_BASE_Y,
      on: "slab",
      decorate: null,
    },
    plant: {
      url: "./models/plant.glb",
      scale: PLANT_SCALE,
      baseY: PLANT_BASE_Y,
      on: "table",
      offsetX: -ITEM_ON_TABLE_OFFSET,
      decorate: null,
    },
    lamp: {
      url: "./models/lamp.glb",
      scale: LAMP_SCALE,
      baseY: LAMP_BASE_Y,
      on: "table",
      offsetX: ITEM_ON_TABLE_OFFSET,
      decorate: makeLampGlow,
    },
  };

  function tableSurfaceY() {
    return SLAB_TOP_Y - TABLE_BASE_Y * TABLE_SCALE + TABLE_TOP_Y * TABLE_SCALE;
  }

  function buildRoomContent(loader, sceneDesc) {
    const grid = new THREE.Group();
    grid.scale.setScalar(GRID_SCALE);

    const slabCells = (sceneDesc && sceneDesc.slabs) || [[0, 0]];
    const owned = (sceneDesc && sceneDesc.items) || [];

    const jobs = [loadModel(loader, SLAB_MODEL_URL)];
    for (const id of owned) {
      const def = ITEM_REGISTRY[id];
      if (def) jobs.push(loadModel(loader, def.url));
    }

    Promise.allSettled(jobs).then((results) => {
      const [slabResult, ...itemResults] = results;
      if (slabResult.status !== "fulfilled") return;
      const slab = slabResult.value;

      applyShadows(slab, true, true);
      for (const [dx, dz] of slabCells) {
        const cell = slab.clone();
        cell.position.set(dx * CELL_SPACING, 0, dz * CELL_SPACING);
        grid.add(cell);
      }

      let tableModel = null;
      owned.forEach((id, i) => {
        const def = ITEM_REGISTRY[id];
        const result = itemResults[i];
        if (!def || result.status !== "fulfilled") return;
        const model = result.value;
        applyShadows(model, true, true);
        model.scale.setScalar(def.scale);
        if (def.on === "table") {
          if (!tableModel) return; // items on the table need the table
          model.position.y = tableSurfaceY() - def.baseY * def.scale;
          model.position.x = def.offsetX || 0;
        } else {
          model.position.y = SLAB_TOP_Y - def.baseY * def.scale;
        }
        grid.add(model);
        if (id === "table") tableModel = model;
        if (def.decorate) def.decorate(model);
      });
    });
    return grid;
  }

  function createLighting(scene) {
    scene.fog = new THREE.Fog(ROOM_FOG_COLOR, ROOM_FOG_NEAR, ROOM_FOG_FAR);

    const hemi = new THREE.HemisphereLight(HEMI_SKY_COLOR, HEMI_GROUND_COLOR, HEMI_INTENSITY);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(KEY_LIGHT_COLOR, KEY_LIGHT_INTENSITY);
    keyLight.position.set(...LIGHT_POSITION);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    keyLight.shadow.camera.left = -SHADOW_CAMERA_BOUNDS;
    keyLight.shadow.camera.right = SHADOW_CAMERA_BOUNDS;
    keyLight.shadow.camera.top = SHADOW_CAMERA_BOUNDS;
    keyLight.shadow.camera.bottom = -SHADOW_CAMERA_BOUNDS;
    keyLight.shadow.radius = SHADOW_RADIUS;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(FILL_LIGHT_COLOR, FILL_LIGHT_INTENSITY);
    fillLight.position.set(...FILL_LIGHT_POSITION);
    scene.add(fillLight);
  }

  function createCameraControls(camera, container, targetElement) {
    const controls = new OrbitControls(camera, targetElement);
    controls.target.set(...CAMERA_TARGET);
    controls.enableRotate = false;
    controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = CONTROLS_MIN_DISTANCE;
    controls.maxDistance = CONTROLS_MAX_DISTANCE;
    controls.maxPolarAngle = CONTROLS_MAX_POLAR_ANGLE;

    const ray = new THREE.Vector3();
    const viewDir = new THREE.Vector3();
    const toCenter = new THREE.Vector3();
    const desired = new THREE.Vector3();
    const shift = new THREE.Vector3();
    const sceneCenter = new THREE.Vector3(...CAMERA_TARGET);

    function clampPan() {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      ray.set(...CAMERA_TARGET).project(camera);
      const screenX = (ray.x * 0.5 + 0.5) * width;
      const screenY = (-ray.y * 0.5 + 0.5) * height;
      const clampedX = Math.min(width - PAN_MARGIN_PX, Math.max(PAN_MARGIN_PX, screenX));
      const clampedY = Math.min(height - PAN_MARGIN_PX, Math.max(PAN_MARGIN_PX, screenY));
      if (clampedX === screenX && clampedY === screenY) return;

      const ndcX = (clampedX / width) * 2 - 1;
      const ndcY = -(clampedY / height) * 2 + 1;
      ray.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
      camera.getWorldDirection(viewDir);
      toCenter.subVectors(sceneCenter, camera.position);
      const depth = toCenter.dot(viewDir);
      desired.copy(camera.position).addScaledVector(ray, depth / ray.dot(viewDir));
      shift.subVectors(sceneCenter, desired);
      camera.position.add(shift);
      controls.target.add(shift);
    }

    return {
      update() {
        controls.update();
        clampPan();
      },
      dispose() {
        controls.dispose();
      },
    };
  }

  function createRoom(container, getSceneDesc) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(ROOM_BG_COLOR);

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    createLighting(scene);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    let roomContent = null;
    function refreshContent() {
      if (roomContent) {
        scene.remove(roomContent);
        disposeObject(roomContent);
      }
      const desc = typeof getSceneDesc === "function" ? getSceneDesc() : null;
      roomContent = buildRoomContent(loader, desc);
      scene.add(roomContent);
    }
    refreshContent();
    const sunSpot = new THREE.SpotLight(SUNSPOT_COLOR, SUNSPOT_INTENSITY);
    sunSpot.position.set(...WINDOW_POSITION);
    sunSpot.target.position.set(...SUNSPOT_TARGET);
    sunSpot.angle = SUNSPOT_ANGLE;
    sunSpot.penumbra = SUNSPOT_PENUMBRA;
    sunSpot.decay = 1.2;
    scene.add(sunSpot);
    scene.add(sunSpot.target);
    const dust = createDust();
    scene.add(dust);
    const clock = new THREE.Clock();

    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(...CAMERA_TARGET);

    const controls = createCameraControls(camera, container, renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    function onResize() {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    let animating = true;
    function animate() {
      if (!animating) return;
      controls.update();
      updateDust(dust, clock.getElapsedTime());
      composer.render();
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    return {
      refresh: refreshContent,
      dispose() {
        animating = false;
        controls.dispose();
        window.removeEventListener("resize", onResize);
        disposeSceneResources();
        draco.dispose();
        composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };

    function disposeSceneResources() {
      disposeObject(scene);
    }

    function disposeObject(root) {
      root.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of materials) m.dispose();
        }
      });
    }
  }

  window.Room = { create: createRoom };

  const container = document.getElementById("room-view");
  if (container && window.Game) {
    const instance = createRoom(container, () => ({
      slabs: Game.slabOffsets(Game.slabCountForLevel(Game.levelFromXp(Game.state.xp))),
      items: Game.state.ownedItems,
    }));
    window.addEventListener("game-state-changed", () => instance.refresh());
  }
})();
