import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createItemFactory, applyShadows, loadModel, buildItems, updateCountdownRing } from "./room-items.js";
import { createInteraction } from "./room-interaction.js";

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
  const DRACO_DECODER_PATH = "./vendor/addons/libs/draco/gltf/";
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
    return new THREE.CanvasTexture(canvas);
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
      setPanEnabled(enabled) {
        controls.enablePan = enabled;
      },
      dispose() {
        controls.dispose();
      },
    };
  }

  function createRoom(container, getSceneDesc) {
    const config = window.RoomConfig;
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
    const itemFactory = createItemFactory(loader);

    const grid = new THREE.Group();
    grid.scale.setScalar(config.gridScale);
    scene.add(grid);
    const slabGroup = new THREE.Group();
    const itemRoot = new THREE.Group();
    grid.add(slabGroup);
    grid.add(itemRoot);

    let currentCells = [];
    let itemGroups = [];
    let slabMeshes = [];
    let rebuild = null;
    let pendingRefresh = false;

    function clearRoom() {
      for (const child of [...slabGroup.children]) {
        slabGroup.remove(child);
        disposeObject(child);
      }
      for (const child of [...itemRoot.children]) itemRoot.remove(child);
      itemGroups = [];
      slabMeshes = [];
    }

    function refreshContent() {
      if (rebuild) {
        pendingRefresh = true;
        return;
      }
      const desc = typeof getSceneDesc === "function" ? getSceneDesc() : null;
      currentCells = (desc && desc.slabs) || [[0, 0]];
      const placements = (desc && desc.placements) || [];
      const chestDisplay = (desc && desc.chestDisplay) || { state: "none" };

      clearRoom();
      const selectedId = interaction.getSelected()
        ? interaction.getSelected().userData.itemId
        : null;
      interaction.deselect();

      rebuild = loadModel(loader, SLAB_MODEL_URL)
        .then((slab) => {
          applyShadows(slab, true, true);
          for (const [dx, dz] of currentCells) {
            const cell = slab.clone();
            cell.position.set(dx * config.cellSpacing, 0, dz * config.cellSpacing);
            slabGroup.add(cell);
            slabMeshes.push(cell);
          }
          return buildItems(itemFactory, currentCells, placements, chestDisplay);
        })
        .then(({ root, groups }) => {
          itemRoot.add(root);
          itemGroups = groups;
          if (selectedId) {
            const group = groups.find((g) => g.userData.itemId === selectedId);
            if (group) interaction.select(group);
          }
        })
        .finally(() => {
          rebuild = null;
          if (pendingRefresh) {
            pendingRefresh = false;
            refreshContent();
          }
        });
    }

    const interaction = createInteraction({
      camera,
      domElement: renderer.domElement,
      setPanEnabled: (enabled) => controls.setPanEnabled(enabled),
      getCells: () => currentCells,
      getGroups: () => itemGroups,
      getSlabMeshes: () => slabMeshes,
      onPlaceItem: (itemId, cellIndex) => window.Game.placeItem(itemId, cellIndex),
      onRotateItem: (itemId) => window.Game.rotateItem(itemId),
      onItemTap: (itemId) => {
        if (itemId !== "pedestal") return false;
        const display = typeof getSceneDesc === "function"
          ? getSceneDesc().chestDisplay
          : null;
        if (!display || !display.chest || !Game.chestReady(display.chest)) return false;
        Game.openChest(display.chest);
        return true;
      },
    });

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

    refreshContent();

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
    let lastChestTick = 0;
    function animate() {
      if (!animating) return;
      controls.update();
      updateDust(dust, clock.getElapsedTime());
      composer.render();
      const now = performance.now();
      if (now - lastChestTick >= 1000) {
        lastChestTick = now;
        chestTick();
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    let chestWasReady = null;

    function chestTick() {
      const pedestalGroup = itemGroups.find((g) => g.userData.itemId === "pedestal");
      if (!pedestalGroup) return;
      const display = typeof getSceneDesc === "function"
        ? getSceneDesc().chestDisplay
        : null;
      if (!display || !display.chest) return;
      const ready = Game.chestReady(display.chest);
      if (chestWasReady === null) {
        chestWasReady = ready;
        if (!ready) {
          const model = pedestalGroup.children[0];
          if (model) updateCountdownRing(model, display.progress);
        }
        return;
      }
      if (ready !== chestWasReady) {
        chestWasReady = ready;
        refreshContent();
        return;
      }
      if (ready) return;
      const model = pedestalGroup.children[0];
      if (!model) return;
      updateCountdownRing(model, display.progress);
    }

    return {
      refresh: refreshContent,
      dispose() {
        animating = false;
        controls.dispose();
        window.removeEventListener("resize", onResize);
        disposeObject(scene);
        draco.dispose();
        composer.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };

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

  function nextChest() {
    const unopened = Game.state.chests.filter((c) => !c.opened);
    if (unopened.length === 0) return null;
    const ready = unopened.find((c) => Game.chestReady(c));
    if (ready) return ready;
    return unopened.reduce((a, b) =>
      a.earnedAt + (a.openDelayMs ?? Game.CHEST_OPEN_MS) <=
      b.earnedAt + (b.openDelayMs ?? Game.CHEST_OPEN_MS)
        ? a
        : b
    );
  }

  function chestProgress(chest) {
    const delay = chest.openDelayMs ?? Game.CHEST_OPEN_MS;
    return Math.min(1, Math.max(0, (Date.now() - chest.earnedAt) / delay));
  }

  function chestDisplay() {
    const chest = nextChest();
    if (!chest) return { state: "none", progress: 0, chest: null };
    return {
      state: Game.chestReady(chest) ? "ready" : "locked",
      progress: chestProgress(chest),
      chest,
    };
  }

  const container = document.getElementById("room-view");
  if (container && window.Game) {
    const instance = createRoom(container, () => ({
      slabs: Game.slabOffsets(Game.slabCountForLevel(Game.levelFromXp(Game.state.xp))),
      placements: Game.state.placedItems,
      chestDisplay: chestDisplay(),
    }));
    window.addEventListener("game-state-changed", () => instance.refresh());
  }
})();
