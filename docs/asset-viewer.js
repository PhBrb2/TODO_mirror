import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VERSION } from "./game-constants.js";

(() => {
  "use strict";

  const STORAGE_KEY = "todo-asset-viewer-exclusions";
  const MANIFEST_VERSION = 9;
  const BG_COLOR = 0xf2e2cf;
  const GRID_COLOR = 0xd9c3a5;

  const manifest = window.KENNEY_MANIFEST || {};
  if (Number(localStorage.getItem(STORAGE_KEY + "-mv")) !== MANIFEST_VERSION) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY + "-mv", String(MANIFEST_VERSION));
  }
  const classes = window.ASSET_CLASSES || {};
  const entries = [];
  for (const kit of Object.keys(manifest).sort()) {
    for (const file of manifest[kit]) {
      const label = `${kit}/${file}`;
      entries.push({ kit, file, path: `models/kenney/${kit}/${file}`, label, cls: classes[label] || "not-todo" });
    }
  }

  function groupKey(entry, mode) {
    if (mode === "todo") return entry.cls;
    return entry.kit;
  }

  function visibleEntries(mode) {
    if (mode === "not-todo") return entries.filter((e) => e.cls === "not-todo");
    return entries;
  }

  const excluded = new Set(loadExclusions());

  const canvas = document.getElementById("viewport");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);
  scene.fog = new THREE.Fog(BG_COLOR, 14, 34);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 100);
  camera.position.set(2.2, 1.8, 2.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0.5, 0);

  scene.add(new THREE.HemisphereLight(0xffe0b8, 0xd9b38c, 0.9));
  const key = new THREE.DirectionalLight(0xffd9a0, 1.8);
  key.position.set(3, 5, 2);
  scene.add(key);

  const grid = new THREE.GridHelper(6, 12, GRID_COLOR, GRID_COLOR);
  grid.material.transparent = true;
  grid.material.opacity = 0.6;
  scene.add(grid);

  const loader = new GLTFLoader();
  let current = null;
  let currentLabel = null;

  function resize() {
    const wrap = document.getElementById("viewport-wrap");
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function frameModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.6 / maxDim;
    object.scale.setScalar(scale);
    object.position.sub(center.multiplyScalar(scale));
    object.position.y += (size.y * scale) / 2;
  }

  function showModel(entry) {
    if (current) {
      scene.remove(current);
      current = null;
    }
    currentLabel = entry.label;
    document.getElementById("preview-name").textContent = entry.label;
    document.getElementById("preview-bar").classList.remove("hidden");
    updatePreviewButton();
    loader.load(entry.path, (gltf) => {
      if (currentLabel !== entry.label) return;
      current = gltf.scene;
      frameModel(current);
      scene.add(current);
    }, undefined, (err) => {
      if (currentLabel === entry.label) {
        document.getElementById("preview-name").textContent = entry.label + " (failed to load)";
      }
      console.error("Failed to load model:", entry.path, err);
    });
    markSelected(entry.label);
    if (isMobile()) document.body.classList.add("sidebar-collapsed");
  }

  function loadExclusions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveExclusions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...excluded].sort()));
  }

  function renderExclusionList() {
    const sorted = [...excluded].sort();
    document.getElementById("exclusion-list").textContent = sorted.join("\n");
    document.getElementById("exclusion-count").textContent = String(sorted.length);
  }

  function updatePreviewButton() {
    const btn = document.getElementById("preview-exclude");
    const isExcluded = currentLabel && excluded.has(currentLabel);
    btn.textContent = isExcluded ? "Include again" : "Exclude";
    btn.classList.toggle("included", Boolean(isExcluded));
  }

  function toggleExclusion(label) {
    if (excluded.has(label)) excluded.delete(label);
    else excluded.add(label);
    saveExclusions();
    renderExclusionList();
    updatePreviewButton();
    renderList();
  }

  function markSelected(label) {
    document.querySelectorAll(".model-row").forEach((row) => {
      row.classList.toggle("selected", row.dataset.label === label);
    });
  }

  let groupMode = document.getElementById("group-by").value || "kenney";
  const collapsedKits = new Set();
  for (const entry of visibleEntries(groupMode)) collapsedKits.add(groupKey(entry, groupMode));

  function renderList() {
    const filter = document.getElementById("search").value.trim().toLowerCase();
    const list = document.getElementById("model-list");
    list.textContent = "";
    const groups = new Map();
    for (const entry of visibleEntries(groupMode)) {
      const key = groupKey(entry, groupMode);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    }
    for (const [group, groupEntries] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const visible = filter ? groupEntries.filter((e) => e.label.toLowerCase().includes(filter)) : groupEntries;
      if (!visible.length) continue;
      const expanded = Boolean(filter) || !collapsedKits.has(group);
      const header = document.createElement("div");
      header.className = "kit-name" + (expanded ? " expanded" : "");
      header.textContent = `${expanded ? "▾" : "▸"} ${group} (${visible.length})`;
      header.addEventListener("click", () => {
        if (collapsedKits.has(group)) collapsedKits.delete(group);
        else collapsedKits.add(group);
        renderList();
      });
      list.appendChild(header);
      if (!expanded) continue;
      for (const entry of visible) {
        const row = document.createElement("div");
        row.className = "model-row" + (excluded.has(entry.label) ? " excluded" : "");
        row.dataset.label = entry.label;
        const name = document.createElement("span");
        name.textContent = entry.file;
        const btn = document.createElement("button");
        btn.className = "exclude-btn";
        btn.type = "button";
        btn.title = excluded.has(entry.label) ? "Include again" : "Exclude model";
        btn.textContent = excluded.has(entry.label) ? "↩" : "✕";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleExclusion(entry.label);
        });
        row.append(name, btn);
        row.addEventListener("click", () => showModel(entry));
        row.addEventListener("dblclick", () => toggleExclusion(entry.label));
        list.appendChild(row);
      }
    }
  }

  document.getElementById("search").addEventListener("input", renderList);
  document.getElementById("group-by").addEventListener("change", (e) => {
    groupMode = e.target.value;
    collapsedKits.clear();
    for (const entry of visibleEntries(groupMode)) collapsedKits.add(groupKey(entry, groupMode));
    renderList();
  });
  document.getElementById("preview-exclude").addEventListener("click", () => {
    if (currentLabel) toggleExclusion(currentLabel);
  });
  document.getElementById("copy-exclusions").addEventListener("click", async () => {
    const text = [...excluded].sort().join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const btn = document.getElementById("copy-exclusions");
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy exclusion list"; }, 1200);
  });

  document.getElementById("page-version").textContent = "v" + VERSION;

  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
  if (isMobile()) document.body.classList.add("sidebar-collapsed");
  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
  window.matchMedia("(max-width: 768px)").addEventListener("change", (e) => {
    document.body.classList.toggle("sidebar-collapsed", e.matches);
  });

  renderExclusionList();
  renderList();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
})();
