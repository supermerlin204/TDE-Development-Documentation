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
let _controlsInteracting = false;
let _loadToken = 0;
let _fetchController = null;

function renderScene() {
  if (_renderer && _scene && _camera) _renderer.render(_scene, _camera);
}

function startRenderLoop() {
  if (_animId || !_controls || !_renderer) return;
  function animate() {
    _animId = null;
    if (!_controls || !_renderer || document.hidden) return;
    const changed = _controls.update();
    renderScene();
    if (_controlsInteracting || changed) _animId = requestAnimationFrame(animate);
  }
  _animId = requestAnimationFrame(animate);
}

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
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  _renderer = new THREE.WebGLRenderer({ antialias: !lowPower, powerPreference: 'high-performance' });
  _renderer.setSize(w, h, false);
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.25));
  _renderer.shadowMap.enabled = true;
  _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  _renderer.shadowMap.autoUpdate = false;
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
  _controls.addEventListener('start', () => { _controlsInteracting = true; startRenderLoop(); });
  _controls.addEventListener('end', () => { _controlsInteracting = false; startRenderLoop(); });

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
  key.shadow.mapSize.set(lowPower ? 512 : 1024, lowPower ? 512 : 1024);
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

  renderScene();
}

function disposeScene(container) {
  _loadToken++;
  if (_fetchController) { _fetchController.abort(); _fetchController = null; }
  if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
  clearLandmarkHighlight();
  if (_controls) { _controls.dispose(); _controls = null; }
  dracoLoader.dispose();
  if (_scene) disposeModel(_scene);
  _model = null;
  if (_renderer) {
    _renderer.renderLists.dispose();
    _renderer.dispose();
    _renderer.forceContextLoss();
    _renderer = null;
  }
  _controlsInteracting = false;
  _scene = null; _camera = null; _controls = null; _currentRegion = null;
  if (container) container.innerHTML = '';
}

function disposeModel(obj) {
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => {
        Object.keys(material).forEach(key => {
          const value = material[key];
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    }
  });
}

// Highlight state
let _highlightedMesh = null;
let _highlightOriginalMaterial = null;
let _highlightMaterial = null;

function processLoadedModel(gltf, token) {
  if (!_scene || token !== _loadToken) {
    disposeModel(gltf.scene);
    return false;
  }
  clearLandmarkHighlight();
  if (_model) { _scene.remove(_model); disposeModel(_model); }
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
        m.side = src.side;
        return m;
      }
      if (Array.isArray(child.material)) {
        child.material = child.material.map(function(m) {
          var replacement = toLambert(m);
          m.dispose();
          return replacement;
        });
      } else {
        var original = child.material;
        child.material = toLambert(original);
        original.dispose();
      }
    }
  });
  _scene.add(_model);
  _renderer.shadowMap.needsUpdate = true;
  renderScene();
  return true;
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
  var sourceMaterial = Array.isArray(_highlightOriginalMaterial) ? _highlightOriginalMaterial[0] : _highlightOriginalMaterial;
  if (sourceMaterial && sourceMaterial.map) redMat.map = sourceMaterial.map;
  _highlightMaterial = redMat;
  if (Array.isArray(mesh.material)) {
    mesh.material = [redMat];
  } else {
    mesh.material = redMat;
  }
  renderScene();
  return true;
}

function clearLandmarkHighlight() {
  if (_highlightedMesh && _highlightOriginalMaterial) {
    _highlightedMesh.material = _highlightOriginalMaterial;
  }
  if (_highlightMaterial) _highlightMaterial.dispose();
  _highlightedMesh = null;
  _highlightOriginalMaterial = null;
  _highlightMaterial = null;
  renderScene();
}

// 从 ArrayBuffer 解析 GLB（带 Draco 解码）
function parseFromBuffer(buffer, token) {
  return new Promise((resolve) => {
    const loader = getGltfLoader();
    loader.parse(buffer, '', (gltf) => {
      resolve(processLoadedModel(gltf, token));
    }, (err) => {
      console.warn('[map3d] parse failed:', err);
      resolve(false);
    });
  });
}

// 从 URL 下载 GLB 并缓存到 IndexedDB
async function fetchAndCache(url, regionId, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
  } catch (e) {
    if (e.name !== 'AbortError') console.warn('[map3d] fetch failed:', e);
    return null;
  }
  const buffer = await response.arrayBuffer();
  if (signal.aborted) return null;

  // 异步写入 IndexedDB（不阻塞解析）
  const filename = url.split('/').pop();
  window._modelStore.save(regionId, buffer, filename).catch(function() {});

  return buffer;
}

async function loadModelIntoScene(regionId, modelPath, token, signal) {

  // 1. IndexedDB 缓存优先 — 秒加载
  var cached = null;
  try {
    cached = await window._modelStore.load(regionId);
  } catch (error) {
    console.warn('[map3d] model cache unavailable:', error);
  }
  if (cached && cached.buffer) {
    var ok = await parseFromBuffer(cached.buffer, token);
    if (ok) return true;
  }

  // 2. 网络下载 + 缓存
  if (modelPath) {
    var buffer = await fetchAndCache(modelPath, regionId, signal);
    if (buffer) {
      return await parseFromBuffer(buffer, token);
    }
  }

  return false;
}

// ============================
// 公开 API → window
// ============================

async function initMap3D(container, regionId, modelPath) {
  if (!container) return false;
  if (_currentRegion === regionId && _scene) {
    if (container && _renderer && !container.contains(_renderer.domElement)) {
      container.innerHTML = '';
      container.appendChild(_renderer.domElement);
      resizeMap3D(container);
    }
    return true;
  }
  disposeScene(container);

  initScene(container);
  _currentRegion = regionId;
  const token = ++_loadToken;
  _fetchController = new AbortController();

  // 加载提示（覆盖在 canvas 上方）
  var spinner = document.createElement('div');
  spinner.className = 'rd-loading';
  spinner.innerHTML = '<div class="rd-loading-ring"></div><span class="rd-loading-text">加载模型中...</span>';
  container.appendChild(spinner);

  const loaded = await loadModelIntoScene(regionId, modelPath, token, _fetchController.signal);
  if (token === _loadToken) _fetchController = null;
  if (spinner.parentNode) spinner.remove();
  if (!_scene) return false;
  if (!loaded) {
    disposeScene(container);
    _currentRegion = null;
  }
  return loaded;
}

// 响应式 resize
function resizeMap3D(container) {
  if (!_renderer || !_camera || !container) return;
  const rect = container.getBoundingClientRect();
  _renderer.setSize(rect.width || 280, rect.height || 280, false);
  _camera.aspect = (rect.width || 280) / (rect.height || 280);
  _camera.updateProjectionMatrix();
  renderScene();
}

window.addEventListener('resize', () => {
  if (_currentRegion && _renderer) {
    resizeMap3D(document.getElementById('rdGraphic'));
  }
});

window._initMap3D = initMap3D;
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
