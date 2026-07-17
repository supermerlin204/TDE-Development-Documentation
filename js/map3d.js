/* ============================================================
   无眠纪 — 区域 3D 地图预览
   使用 Three.js + IndexedDB 存储模型
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Draco 解码器
var dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('lib/draco/gltf/');

// 全局 GLTFLoader（带 Draco 支持）
var _gltfLoader = null;
function getGltfLoader() {
  if (!_gltfLoader) {
    _gltfLoader = new GLTFLoader();
    _gltfLoader.setDRACOLoader(dracoLoader);
  }
  return _gltfLoader;
}

// ============================
// Three.js 场景
// ============================
let _scene = null;
let _camera = null;
let _renderer = null;
let _controls = null;
let _model = null;
let _animId = null;
let _currentRegion = null;

function initScene(container) {
  const rect = container.getBoundingClientRect();
  const w = rect.width || 280;
  const h = rect.height || 280;

  // Scene
  _scene = new THREE.Scene();
  _scene.background = new THREE.Color(0x0a0f14);
  _scene.fog = new THREE.Fog(0x0a0f14, 5, 40);

  // Camera
  _camera = new THREE.PerspectiveCamera(45, w / h, 0.5, 100);
  _camera.position.set(5, 3.5, 6);
  _camera.lookAt(0, 0, 0);

  // Renderer
  _renderer = new THREE.WebGLRenderer({ antialias: true });
  _renderer.setSize(w, h, false);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1.2;
  container.innerHTML = '';
  container.appendChild(_renderer.domElement);

  // Controls
  _controls = new OrbitControls(_camera, _renderer.domElement);
  _controls.enableDamping = true;
  _controls.dampingFactor = 0.08;
  _controls.minDistance = 1.5;
  _controls.maxDistance = 20;
  _controls.maxPolarAngle = Math.PI * 0.65;
  _controls.target.set(0, 0.5, 0);
  _controls.update();

  // 阻止滚轮事件传播到页面，防止同时触发页面滚动
  _renderer.domElement.addEventListener('wheel', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, { passive: false });

  // Lighting
  const ambient = new THREE.AmbientLight(0x404060, 1.8);
  _scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffeedd, 4);
  key.position.set(8, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0001;
  _scene.add(key);

  const rim = new THREE.DirectionalLight(0xcccccc, 0.8);
  rim.position.set(-3, 2, -4);
  _scene.add(rim);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e, roughness: 0.9, metalness: 0.1
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  _scene.add(ground);

  // Grid helper
  const grid = new THREE.PolarGridHelper(6, 32, 24, 64, 0x00bfa5, 0x00bfa5);
  grid.position.y = -1.99;
  _scene.add(grid);

  // Animation loop
  function animate() {
    _animId = requestAnimationFrame(animate);
    _controls.update();
    _renderer.render(_scene, _camera);
  }
  animate();
}

function disposeScene(container) {
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  if (_model) { _scene.remove(_model); disposeModel(_model); _model = null; }
  if (_renderer) { _renderer.dispose(); _renderer = null; }
  _scene = null; _camera = null; _controls = null; _currentRegion = null;
  if (container) container.innerHTML = '';
}

function disposeModel(obj) {
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

// Highlight state
let _highlightedMesh = null;
let _highlightOriginalMaterial = null;

function processLoadedModel(gltf) {
  if (_model) { _scene.remove(_model); disposeModel(_model); }
  clearLandmarkHighlight();
  _model = gltf.scene;

  // Center & fit
  const box = new THREE.Box3().setFromObject(_model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 4 / (maxDim || 1);
  _model.scale.setScalar(scale);
  _model.position.set(-center.x * scale, -center.y * scale + 0.3, -center.z * scale);

  _model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
      // 全部转为 Lambert 材质 — 漫反射过渡柔和，不产生纯黑面
      function toLambert(src) {
        var m = new THREE.MeshLambertMaterial();
        if (src.map) m.map = src.map;
        if (src.color) m.color.copy(src.color);
        m.transparent = src.transparent;
        m.opacity = src.opacity;
        m.alphaTest = src.alphaTest;
        m.side = THREE.DoubleSide;
        return m;
      }
      if (Array.isArray(child.material)) {
        child.material = child.material.map(function(m) { return toLambert(m); });
      } else {
        child.material = toLambert(child.material);
      }
    }
  });
  _scene.add(_model);
}

function highlightLandmarkMesh(name) {
  clearLandmarkHighlight();
  if (!_model || !name) return false;
  var mesh = _model.getObjectByName(name);
  if (!mesh || !mesh.isMesh) return false;
  _highlightedMesh = mesh;
  _highlightOriginalMaterial = mesh.material;
  var redMat = new THREE.MeshLambertMaterial({
    color: 0xff2222,
    emissive: 0x330000,
    side: THREE.DoubleSide
  });
  if (_highlightOriginalMaterial.map) redMat.map = _highlightOriginalMaterial.map;
  if (Array.isArray(mesh.material)) {
    mesh.material = [redMat];
  } else {
    mesh.material = redMat;
  }
  return true;
}

function clearLandmarkHighlight() {
  if (_highlightedMesh && _highlightOriginalMaterial) {
    _highlightedMesh.material = _highlightOriginalMaterial;
  }
  _highlightedMesh = null;
  _highlightOriginalMaterial = null;
}

// 从 URL 加载 (服务端 models/ 目录)
function loadModelFromUrl(url) {
  console.log('[map3d] loadModelFromUrl:', url);
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    const encoded = encodeURI(url);
    console.log('[map3d] fetching:', encoded);
    loader.load(encoded, (gltf) => {
      console.log('[map3d] model loaded from URL');
      processLoadedModel(gltf);
      resolve(true);
    }, undefined, (err) => {
      console.warn('[map3d] failed to load from URL:', encoded, err);
      resolve(false);
    });
  });
}

async function loadModelIntoScene(regionId, modelPath) {
  console.log('[map3d] loadModelIntoScene regionId:', regionId, 'modelPath:', modelPath);
  // 1. 优先从服务端路径加载 (models/ 目录)
  if (modelPath) {
    const ok = await loadModelFromUrl(modelPath);
    if (ok) return true;
    console.log('[map3d] URL load failed, trying IndexedDB fallback...');
  }

  // 2. 回退至 IndexedDB (本地开发预览)
  const data = await window._modelStore.load(regionId);
  if (!data || !data.buffer) { console.log('[map3d] no IndexedDB data'); return false; }

  const blob = new Blob([data.buffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  console.log('[map3d] loading from IndexedDB blob');

  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      URL.revokeObjectURL(url);
      processLoadedModel(gltf);
      console.log('[map3d] indexedDB model loaded');
      resolve(true);
    }, undefined, () => {
      URL.revokeObjectURL(url);
      console.log('[map3d] indexedDB model failed');
      resolve(false);
    });
  });
}

// ============================
// 公开 API → window
// ============================

async function hasModel(regionId) {
  return window._modelStore.has(regionId);
}

async function initMap3D(container, regionId, modelPath) {
  console.log('[map3d] initMap3D called', { regionId, modelPath, containerId: container && container.id });
  if (!container) { console.log('[map3d] no container'); return; }
  if (_currentRegion === regionId && _scene) {
    console.log('[map3d] already active, re-attaching canvas if needed');
    if (container && _renderer && !container.contains(_renderer.domElement)) {
      container.innerHTML = '';
      container.appendChild(_renderer.domElement);
      resizeMap3D(container);
    }
    return true;
  }
  disposeScene(container);

  initScene(container);
  console.log('[map3d] scene initialized');
  _currentRegion = regionId;

  const loaded = await loadModelIntoScene(regionId, modelPath);
  if (!loaded) {
    console.log('[map3d] model load failed, disposing scene');
    disposeScene(container);
    _currentRegion = null;
  }
  console.log('[map3d] initMap3D result:', loaded);
  return loaded;
}

function isViewerActive(regionId) {
  return _currentRegion === regionId && !!_scene;
}

async function removeRegionModel(regionId) {
  await window._modelStore.delete(regionId);
  if (_currentRegion === regionId) {
    disposeScene(document.getElementById('rdGraphic'));
  }
}

// 响应式 resize
function resizeMap3D(container) {
  if (!_renderer || !_camera || !container) return;
  const rect = container.getBoundingClientRect();
  _renderer.setSize(rect.width || 280, rect.height || 280, false);
  _camera.aspect = (rect.width || 280) / (rect.height || 280);
  _camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
  if (_currentRegion && _renderer) {
    resizeMap3D(document.getElementById('rdGraphic'));
  }
});

window._hasRegionModel = hasModel;
window._initMap3D = initMap3D;
window._isMap3DActive = isViewerActive;
window._pickRegionModel = window._modelStore.pick;   // 委托至 modelStore
window._removeRegionModel = removeRegionModel;
window._resizeMap3D = resizeMap3D;
window._disposeMap3D = disposeScene;
function hasLandmarkMesh(name) {
  if (!_model || !name) return false;
  var mesh = _model.getObjectByName(name);
  return !!(mesh && mesh.isMesh);
}

window._highlightLandmarkMesh = highlightLandmarkMesh;
window._clearLandmarkHighlight = clearLandmarkHighlight;
window._hasLandmarkMesh = hasLandmarkMesh;
window._map3dReady = true;
window._map3dError = false;
