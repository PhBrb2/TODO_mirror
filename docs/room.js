import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

(() => {
  "use strict";

  const ROOM_BG_COLOR = 0xd8e2f0;
  const SLAB_MODEL_URL = "./models/slab.glb";
  const TABLE_MODEL_URL = "./models/table.glb";
  const DRACO_DECODER_PATH = "./vendor/addons/libs/draco/gltf/";
  const GRID_SIZE = 3;
  const CELL_SPACING = 2;
  const GRID_SCALE = 1 / 6;
  const SLAB_TOP_Y = 0.115;
  const TABLE_SCALE = 2;
  const TABLE_BASE_Y = -0.279;
  const CAMERA_FOV = 40;
  const CAMERA_POSITION = [5, 4.5, 7];
  const CAMERA_TARGET = [0, 0, 0];
  const LIGHT_POSITION = [4, 6, 3];

  function loadModel(loader, url) {
    return new Promise((resolve, reject) => {
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => {
        console.error("Failed to load model:", url);
        reject(new Error(url));
      });
    });
  }

  function buildRoomContent(loader, onReady) {
    const grid = new THREE.Group();
    grid.scale.setScalar(GRID_SCALE);
    Promise.allSettled([
      loadModel(loader, SLAB_MODEL_URL),
      loadModel(loader, TABLE_MODEL_URL),
    ]).then(([slab, table]) => {
      if (slab.status === "fulfilled") {
        for (let x = 0; x < GRID_SIZE; x++) {
          for (let z = 0; z < GRID_SIZE; z++) {
            const cell = slab.value.clone();
            cell.position.set(
              (x - (GRID_SIZE - 1) / 2) * CELL_SPACING,
              0,
              (z - (GRID_SIZE - 1) / 2) * CELL_SPACING
            );
            grid.add(cell);
          }
        }
      }
      if (table.status === "fulfilled") {
        table.value.scale.setScalar(TABLE_SCALE);
        table.value.position.y = SLAB_TOP_Y - TABLE_BASE_Y * TABLE_SCALE;
        grid.add(table.value);
      }
      onReady();
    });
    return grid;
  }

  function createRoom(container) {
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
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(...LIGHT_POSITION);
    scene.add(dirLight);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    scene.add(buildRoomContent(loader, () => render()));

    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(...CAMERA_TARGET);

    function onResize() {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    function render() {
      renderer.render(scene, camera);
    }
    render();

    return {
      render,
      dispose() {
        window.removeEventListener("resize", onResize);
        disposeSceneResources();
        draco.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };

    function disposeSceneResources() {
      scene.traverse((obj) => {
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
  if (container) {
    createRoom(container);
  }
})();
