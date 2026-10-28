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
    create(itemId) {
      const def = config.items[itemId];
      if (!def) return Promise.reject(new Error(itemId));
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

export function buildItems(factory, cells, placements) {
  const config = window.RoomConfig;
  const root = new THREE.Group();
  const valid = placements.filter((p) => config.items[p.itemId]);
  return Promise.allSettled(valid.map((p) => factory.create(p.itemId))).then((results) => {
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
