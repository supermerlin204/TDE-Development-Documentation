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
    var stamp = (typeof TDE_DATA !== 'undefined' && TDE_DATA._modelStamp) ? TDE_DATA._modelStamp : 0;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ buffer, filename, ts: Date.now(), stamp }, regionId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function loadModel(regionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(regionId);
      var stale = false;
      req.onsuccess = () => {
        var data = req.result || null;
        if (data && data.buffer) {
          var currentStamp = (typeof TDE_DATA !== 'undefined' && TDE_DATA._modelStamp) ? TDE_DATA._modelStamp : 0;
          if (data.stamp !== currentStamp) {
            stale = true;
            data = null;
          }
        }
        resolve(data);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => {
        db.close();
        if (stale) deleteModel(regionId).catch(function() {});
      };
      tx.onerror = () => db.close();
    });
  }

  async function deleteModel(regionId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(regionId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  window._modelStore = {
    save: saveModel,
    load: loadModel
  };
})();
