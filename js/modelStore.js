/* ============================================================
   无眠纪 — 模型文件存储 (独立于 3D 渲染)
   负责 IndexedDB 存取 + 文件选择器 (后备)
   主要加载路径: models/ 静态目录
   ============================================================ */

(function() {
  'use strict';

  const DB_NAME = 'TDE_ModelStore';
  const DB_VERSION = 1;
  const STORE_NAME = 'models';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveModel(regionId, buffer, filename) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ buffer, filename, ts: Date.now() }, regionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadModel(regionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(regionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteModel(regionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(regionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function hasModel(regionId) {
    const data = await loadModel(regionId);
    return !!(data && data.buffer);
  }

  // 文件选择器 (后备：直接选文件存 IndexedDB 即时预览)
  function pickModelFile(regionId) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.glb,.gltf';
      input.style.display = 'none';
      document.body.appendChild(input);

      let settled = false;
      function done(result) {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(result);
      }

      input.onchange = async () => {
        const file = input.files[0];
        if (!file) { done({ ok: false }); return; }
        try {
          const buffer = await file.arrayBuffer();
          await saveModel(regionId, buffer, file.name);
          done({ ok: true, filename: file.name });
        } catch (e) {
          console.error('模型保存失败:', e);
          done({ ok: false });
        }
      };

      function onFocus() {
        window.removeEventListener('focus', onFocus);
        setTimeout(() => {
          if (input.files && input.files.length === 0) done({ ok: false });
        }, 200);
      }
      window.addEventListener('focus', onFocus);

      input.click();
    });
  }

  // Blob URL 工具
  async function getModelBlobUrl(regionId) {
    const data = await loadModel(regionId);
    if (!data || !data.buffer) return null;
    const blob = new Blob([data.buffer], { type: 'model/gltf-binary' });
    return URL.createObjectURL(blob);
  }

  function revokeModelBlobUrl(url) {
    URL.revokeObjectURL(url);
  }

  window._modelStore = {
    save: saveModel,
    load: loadModel,
    delete: deleteModel,
    has: hasModel,
    pick: pickModelFile,
    getBlobUrl: getModelBlobUrl,
    revokeBlobUrl: revokeModelBlobUrl
  };

  console.log('[modelStore] 已就绪');
})();
