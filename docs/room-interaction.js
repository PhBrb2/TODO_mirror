import * as THREE from "three";
import { positionItemGroup, findSurfaceGroup } from "./room-items.js";

const ROTATION_STEP = Math.PI / 2;
const HIGHLIGHT_EMISSIVE = 0xffb84d;
const HIGHLIGHT_EMISSIVE_INTENSITY = 0.45;
const MIN_DRAG_PX = 6;

export function createInteraction({
  camera,
  domElement,
  setPanEnabled,
  getCells,
  getGroups,
  getSlabMeshes,
  onPlaceItem,
  onRotateItem,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const config = window.RoomConfig;
  const highlightedMaterials = new Set();
  const scratchPoint = new THREE.Vector3();
  const scratchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  let selectedGroup = null;
  let dragCandidate = null;
  let dragActive = false;
  let dragCell = null;

  function setNdc(ev) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function isSlabType(itemId) {
    const def = config.items[itemId];
    return Boolean(def) && def.type === "slab";
  }

  function cellFree(group, cellIndex) {
    if (!isSlabType(group.userData.itemId)) return true;
    return !getGroups().some(
      (g) =>
        g !== group &&
        isSlabType(g.userData.itemId) &&
        g.userData.cellIndex === cellIndex
    );
  }

  function groupFromObject(object) {
    let node = object;
    while (node) {
      if (node.userData && node.userData.itemId) return node;
      node = node.parent;
    }
    return null;
  }

  function intersectGroups(ev) {
    setNdc(ev);
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects(getGroups(), true)) {
      const group = groupFromObject(hit.object);
      if (group) return group;
    }
    return null;
  }

  function intersectCellIndex(ev) {
    setNdc(ev);
    raycaster.setFromCamera(pointer, camera);
    const cells = getCells();
    const half = (config.cellSpacing * config.gridScale) / 2;
    const planeY = config.slabTopY * config.gridScale;
    let bestIndex = -1;
    let bestDistance = Infinity;
    cells.forEach(([x, z], i) => {
      const cx = x * config.cellSpacing * config.gridScale;
      const cz = z * config.cellSpacing * config.gridScale;
      scratchPlane.constant = -planeY;
      const hit = raycaster.ray.intersectPlane(scratchPlane, scratchPoint);
      if (!hit) return;
      if (Math.abs(scratchPoint.x - cx) > half || Math.abs(scratchPoint.z - cz) > half) return;
      const distance = raycaster.ray.origin.distanceTo(scratchPoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    });
    return bestIndex;
  }

  function intersectsRoom(ev) {
    setNdc(ev);
    raycaster.setFromCamera(pointer, camera);
    const targets = [...getSlabMeshes(), ...getGroups()];
    return raycaster.intersectObjects(targets, true).length > 0;
  }

  function setHighlight(group, on) {
    group.traverse((child) => {
      if (!child.isMesh) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of materials) {
        if (on) {
          if (!highlightedMaterials.has(m)) {
            highlightedMaterials.add(m);
            m.userData.baseEmissive = m.emissive ? m.emissive.getHex() : 0;
            m.userData.baseEmissiveIntensity = m.emissiveIntensity ?? 1;
          }
          if (m.emissive) m.emissive.setHex(HIGHLIGHT_EMISSIVE);
          m.emissiveIntensity = HIGHLIGHT_EMISSIVE_INTENSITY;
        } else if (highlightedMaterials.has(m)) {
          if (m.emissive) m.emissive.setHex(m.userData.baseEmissive);
          m.emissiveIntensity = m.userData.baseEmissiveIntensity;
          highlightedMaterials.delete(m);
        }
      }
    });
  }

  function select(group) {
    if (selectedGroup === group) return;
    deselect();
    selectedGroup = group;
    setHighlight(group, true);
  }

  function deselect() {
    if (!selectedGroup) return;
    setHighlight(selectedGroup, false);
    selectedGroup = null;
  }

  function moveVisual(group, cellIndex) {
    const surface = findSurfaceGroup(getGroups(), cellIndex, group.userData.itemId);
    positionItemGroup(
      group,
      cellIndex,
      getCells(),
      surface ? config.items[surface.userData.itemId] : null
    );
  }

  function onPointerDown(ev) {
    if (ev.button !== undefined && ev.button !== 0) return;
    dragCandidate = {
      group: selectedGroup,
      startX: ev.clientX,
      startY: ev.clientY,
      pointerId: ev.pointerId,
    };
  }

  function onPointerMove(ev) {
    if (!dragCandidate || dragCandidate.group === null) return;
    if (ev.pointerId !== dragCandidate.pointerId) return;
    if (!dragActive) {
      const dx = ev.clientX - dragCandidate.startX;
      const dy = ev.clientY - dragCandidate.startY;
      if (Math.hypot(dx, dy) < MIN_DRAG_PX) return;
      dragActive = true;
      dragCell = dragCandidate.group.userData.cellIndex;
      setPanEnabled(false);
    }
    const cellIndex = intersectCellIndex(ev);
    if (cellIndex >= 0 && cellFree(dragCandidate.group, cellIndex)) {
      dragCell = cellIndex;
      moveVisual(dragCandidate.group, cellIndex);
    }
  }

  function onPointerUp(ev) {
    if (!dragCandidate || ev.pointerId !== dragCandidate.pointerId) return;
    const group = dragCandidate.group;
    dragCandidate = null;
    if (dragActive) {
      dragActive = false;
      setPanEnabled(true);
      if (dragCell !== null) onPlaceItem(group.userData.itemId, dragCell);
      dragCell = null;
      return;
    }
    handleTap(ev);
  }

  function handleTap(ev) {
    const group = intersectGroups(ev);
    if (group && group === selectedGroup) {
      onRotateItem(group.userData.itemId);
      return;
    }
    if (group) {
      select(group);
      return;
    }
    if (!intersectsRoom(ev)) deselect();
  }

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointercancel", onPointerUp);

  return {
    deselect,
    select,
    getSelected: () => selectedGroup,
  };
}
