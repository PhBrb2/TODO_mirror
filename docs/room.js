import * as THREE from "three";

(() => {
  "use strict";

  const ROOM_BG_COLOR = 0xd8e2f0;
  const CUBE_COLOR = 0x8b5cf6;
  const CUBE_SIZE = 1;
  const CAMERA_FOV = 40;
  const CAMERA_POSITION = [3, 2.6, 4];
  const CAMERA_TARGET = [0, 0, 0];
  const CUBE_ROTATION_PER_FRAME = { x: 0.004, y: 0.01 };
  const LIGHT_POSITION = [4, 6, 3];

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

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
      new THREE.MeshStandardMaterial({ color: CUBE_COLOR })
    );
    scene.add(cube);

    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(...CAMERA_TARGET);

    let running = true;

    function onResize() {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", onResize);

    function animate() {
      if (!running) return;
      cube.rotation.y += CUBE_ROTATION_PER_FRAME.y;
      cube.rotation.x += CUBE_ROTATION_PER_FRAME.x;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function disposeSceneResources() {
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of materials) m.dispose();
        }
      });
    }

    return {
      dispose() {
        running = false;
        window.removeEventListener("resize", onResize);
        disposeSceneResources();
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };
  }

  window.Room = { create: createRoom };

  const container = document.getElementById("room-view");
  if (container) {
    createRoom(container);
  }
})();
