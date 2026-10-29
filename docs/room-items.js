import * as THREE from "three";

const ROTATION_STEP = Math.PI / 2;
const TOP_SLOT_OFFSETS = [[0, 0], [-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]];

export function loadModel(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, () => {
      console.error("Failed to load model:", url);
      reject(new Error(url));
    });
  });
}

export function applyShadows(obj, cast, receive) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function decorate(model, def, config) {
  const key = def.decorate;
  if (!key) return;
  const light = config.decorations[key];
  if (!light) return;
  const glow = new THREE.PointLight(light.color, light.intensity, light.distance);
  glow.position.y = light.yOffset;
  model.add(glow);
}

function boxMesh(size, color) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const material = new THREE.MeshStandardMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

// Procedural chest pedestal: a small gray pedestal with an optional brown
// chest on top. The chest glows when it can be opened (chestState:
// "ready" | "locked" | "none"). While locked, a countdown ring around the
// pedestal covers ringFraction of the full circle (1 = just earned, shrinks
// to 0 as the chest becomes openable).
export function createChestPedestalModel(chestState, ringFraction) {
  const config = window.RoomConfig.chestDisplay;
  const group = new THREE.Group();

  const pedestal = boxMesh(config.pedestalSize, config.pedestalColor);
  pedestal.position.y = config.pedestalSize[1] / 2;
  group.add(pedestal);

  if (chestState !== "none") {
    const chest = new THREE.Group();
    const body = boxMesh(config.chestSize, config.chestColor);
    body.position.y = config.chestSize[1] / 2;
    const lidSize = [
      config.chestSize[0] + config.chestLidOverhang * 2,
      config.chestSize[1] * 0.4,
      config.chestSize[2] + config.chestLidOverhang * 2,
    ];
    const lid = boxMesh(lidSize, config.chestColor);
    lid.position.y = config.chestSize[1] + lidSize[1] / 2;
    chest.add(body);
    chest.add(lid);
    chest.position.y = config.pedestalSize[1];
    if (chestState === "ready") {
      chest.traverse((child) => {
        if (child.isMesh && child.material.emissive) {
          child.material.emissive.setHex(config.highlightColor);
          child.material.emissiveIntensity = config.highlightIntensity;
        }
      });
    }
    group.add(chest);

    if (chestState === "locked" && ringFraction > 0) {
      const ring = countdownRing(config, ringFraction);
      group.add(ring);
    }
  }

  applyShadows(group, true, true);
  return group;
}

function countdownRing(config, ringFraction) {
  const inner = config.ringInnerRadius;
  const outer = config.ringOuterRadius;
  const geometry = new THREE.RingGeometry(inner, outer, 48, 1, 0, Math.PI * 2 * ringFraction);
  const material = new THREE.MeshBasicMaterial({
    color: config.ringColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: config.ringOpacity,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = config.ringYOffset;
  ring.userData.isCountdownRing = true;
  return ring;
}

// Regenerates the countdown ring geometry for the current progress.
// No-op if the pedestal has no ring (chest not locked).
export function updateCountdownRing(pedestalModel, ringFraction) {
  const config = window.RoomConfig.chestDisplay;
  const old = pedestalModel.children.find((c) => c.userData.isCountdownRing);
  if (!old) return;
  const geometry = new THREE.RingGeometry(
    config.ringInnerRadius,
    config.ringOuterRadius,
    48,
    1,
    0,
    Math.PI * 2 * Math.min(1, Math.max(0, ringFraction))
  );
  old.geometry.dispose();
  old.geometry = geometry;
}

export function createItemFactory(loader) {
  const config = window.RoomConfig;
  const baseModels = new Map();

  function baseModel(itemId) {
    if (!baseModels.has(itemId)) {
      const def = config.items[itemId];
      const job = def
        ? loadModel(loader, def.url).then((model) => {
            applyShadows(model, true, true);
            return model;
          })
        : Promise.reject(new Error(itemId));
      baseModels.set(itemId, job);
    }
    return baseModels.get(itemId);
  }

  return {
    create(itemId, chestState, ringFraction) {
      const def = config.items[itemId];
      if (!def) return Promise.reject(new Error(itemId));
      if (!def.url) {
        return Promise.resolve(createChestPedestalModel(chestState || "none", ringFraction ?? 0));
      }
      return baseModel(itemId).then((model) => {
        const clone = model.clone();
        clone.scale.setScalar(def.scale);
        decorate(clone, def, config);
        return clone;
      });
    },
  };
}

function clampCell(cellIndex, cells) {
  if (!Number.isInteger(cellIndex) || cellIndex < 0) return 0;
  return Math.min(cellIndex, cells.length - 1);
}

function cellAt(cellIndex, cells) {
  return cells[clampCell(cellIndex, cells)] || [0, 0];
}

function itemBaseY(def, surfaceDef, config) {
  if (!surfaceDef) return config.slabTopY - def.baseY * def.scale;
  const surfaceTop = config.slabTopY + (surfaceDef.surfaceTopY - surfaceDef.baseY) * surfaceDef.scale;
  return surfaceTop - def.baseY * def.scale;
}

function topSlotOffset(groups, group, cellIndex) {
  const config = window.RoomConfig;
  let slot = 0;
  for (const g of groups) {
    if (g === group) break;
    const def = config.items[g.userData.itemId];
    if (def.type !== "top") continue;
    if (g.userData.cellIndex !== cellIndex) continue;
    slot++;
  }
  return TOP_SLOT_OFFSETS[slot % TOP_SLOT_OFFSETS.length];
}

function groupsOf(group) {
  return group.parent ? group.parent.children.filter((c) => c.userData && c.userData.itemId) : [];
}

export function findSurfaceGroup(groups, cellIndex, exceptItemId) {
  const config = window.RoomConfig;
  return groups.find((group) => {
    const def = config.items[group.userData.itemId];
    return (
      group.userData.itemId !== exceptItemId &&
      def.type === "slab" &&
      def.providesSurface &&
      group.userData.cellIndex === cellIndex
    );
  }) || null;
}

export function positionItemGroup(group, cellIndex, cells, surfaceDef) {
  const config = window.RoomConfig;
  const def = config.items[group.userData.itemId];
  const cell = cellAt(cellIndex, cells);
  const offset = surfaceDef
    ? topSlotOffset(groupsOf(group), group, group.userData.cellIndex)
    : [0, 0];
  group.userData.cellIndex = clampCell(cellIndex, cells);
  group.position.set(
    cell[0] * config.cellSpacing + offset[0],
    itemBaseY(def, surfaceDef, config),
    cell[1] * config.cellSpacing + offset[1]
  );
}

export function buildItems(factory, cells, placements, chestDisplay) {
  const config = window.RoomConfig;
  const root = new THREE.Group();
  const valid = placements.filter((p) => config.items[p.itemId]);
  const display = chestDisplay || {};
  return Promise.allSettled(
    valid.map((p) =>
      p.itemId === "pedestal"
        ? factory.create(p.itemId, display.state, display.fraction)
        : factory.create(p.itemId)
    )
  ).then((results) => {
    const groups = [];
    valid.forEach((p, i) => {
      const result = results[i];
      if (result.status !== "fulfilled") return;
      const group = new THREE.Group();
      group.userData.itemId = p.itemId;
      group.userData.cellIndex = clampCell(p.cellIndex, cells);
      group.rotation.y = p.rotation * ROTATION_STEP;
      group.add(result.value);
      root.add(group);
      groups.push(group);
    });
    for (const group of groups) {
      const def = config.items[group.userData.itemId];
      const surface = def.type === "top"
        ? findSurfaceGroup(groups, group.userData.cellIndex, group.userData.itemId)
        : null;
      positionItemGroup(
        group,
        group.userData.cellIndex,
        cells,
        surface ? config.items[surface.userData.itemId] : null
      );
    }
    return { root, groups };
  });
}
