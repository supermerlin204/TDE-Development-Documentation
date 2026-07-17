/* ============================================================
   无眠纪 — The Dreamless Era
   主应用逻辑 (含内联编辑系统)
   ============================================================ */

(function() {
  'use strict';

  // ============================
  // 全局状态
  // ============================
  let editMode = false;
  let editPanelPath = null; // 当前编辑面板对应的数据路径
  // 数据持久化：所有数据存储在 data/*.js 仓库文件中。
  // 网页编辑后通过「下载源文件」导出更改，手动放入仓库并提交。
  const _defaultData = JSON.parse(JSON.stringify(TDE_DATA)); // 深拷贝默认数据，用于检测未保存的更改

  // ============================
  // 粒子背景系统
  // ============================
  const ParticleSystem = {
    canvas: null, ctx: null, particles: [], maxParticles: 80, animationId: null,
    init() {
      this.canvas = document.getElementById('particleCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      for (let i = 0; i < this.maxParticles; i++) this.particles.push(this.createParticle(true));
      this.animate();
    },
    resize() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; },
    createParticle(randomY) {
      return {
        x: Math.random() * window.innerWidth,
        y: randomY ? Math.random() * window.innerHeight : window.innerHeight + 10,
        size: Math.random() * 2 + 0.5,
        speedY: -(Math.random() * 0.6 + 0.15),
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        hue: Math.random() * 30 + 165
      };
    },
    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.y += p.speedY; p.x += p.speedX; p.pulse += p.pulseSpeed;
        const alpha = p.opacity + Math.sin(p.pulse) * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha})`;
        this.ctx.fill();
        if (p.size > 1.4) {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          this.ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${alpha * 0.12})`;
          this.ctx.fill();
        }
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(p2.x, p2.y);
            this.ctx.strokeStyle = `hsla(${p.hue}, 70%, 60%, ${0.04 * (1 - dist/120)})`;
            this.ctx.lineWidth = 0.5; this.ctx.stroke();
          }
        }
        if (p.y < -10 || p.x < -10 || p.x > window.innerWidth + 10) {
          p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth;
          p.opacity = Math.random() * 0.6 + 0.2;
        }
      }
      this.animationId = requestAnimationFrame(() => this.animate());
    }
  };

  // ============================
  // 路由
  // ============================
  const Router = {
    currentPage: 'dashboard',
    currentSub: null,
    currentLandmark: null,
    init() {
      const hash = window.location.hash.slice(1) || 'dashboard';
      this.navigate(hash);
      window.addEventListener('hashchange', () => {
        this.navigate(window.location.hash.slice(1) || 'dashboard');
      });
    },
    navigate(page) {
      this.currentPage = page;
      // 解析: "region/sanctuary" 或 "region/sanctuary/北风哨塔"
      var parts = page.split('/');
      var basePage = parts[0];
      var sub = parts.slice(1).join('/') || null;
      if (basePage === 'region' && sub) {
        basePage = 'region-detail';
      }
      // 解析地标：region/{id}/{landmark}
      var subParts = (sub || '').split('/');
      var regionId = subParts[0] || null;
      var landmark = subParts[1] ? decodeURIComponent(subParts.slice(1).join('/')) : null;
      this.currentSub = (basePage === 'region-detail') ? regionId : null;
      this.currentLandmark = (basePage === 'region-detail') ? landmark : null;

      // 高亮导航：区域详情页时高亮"世界地图"
      var navMatch = (basePage === 'region-detail') ? 'world' : basePage;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === navMatch));

      // 显示/隐藏页面
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      // 离开区域详情页时清理 3D 场景
      if (basePage !== 'region-detail' && window._disposeMap3D) {
        window._disposeMap3D(document.getElementById('rdGraphic'));
      }
      var targetPage = document.getElementById('page-' + basePage);
      if (targetPage) targetPage.classList.add('active');

      document.getElementById('content').scrollTop = 0;
      window.scrollTo(0, 0);
      closeEditPanel();
      hideAutocomplete();

      // 区域详情页渲染
      if (basePage === 'region-detail' && regionId) {
        // 无地标聚焦时清除高亮
        if (!landmark && window._clearLandmarkHighlight) {
          window._clearLandmarkHighlight();
        }
        renderRegionDetail(regionId, landmark);
      }
    }
  };

  // ============================
  // Toast
  // ============================
  function showToast(msg, dur = 2500) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), dur);
  }

  // ============================
  // 保存指示器
  // ============================
  let saveIndicatorTimer = null;
  function showSaved() {
    let el = document.querySelector('.edit-save-indicator');
    if (!el) {
      el = document.createElement('div');
      el.className = 'edit-save-indicator';
      el.textContent = '已保存';
      document.body.appendChild(el);
    }
    el.classList.add('show');
    clearTimeout(saveIndicatorTimer);
    saveIndicatorTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  // ============================
  // Modal
  // ============================
  const Modal = {
    overlay: null, body: null,
    init() {
      this.overlay = document.getElementById('modal');
      this.body = document.getElementById('modalBody');
      this.overlay.querySelector('.modal-close').addEventListener('click', () => this.close());
      this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
    },
    open(html) { this.body.innerHTML = html; this.overlay.classList.add('open'); },
    close() { this.overlay.classList.remove('open'); }
  };

  // ============================
  // 仪表盘统计数字
  // ============================
  function updateDashboardStats() {
    var data = TDE_DATA;

    // 1. 开发天数
    var startDate = data.projectStartDate || '2025-01-15';
    var days = Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000));
    animateStat('statDays', days, 'statBarDays', 65);

    // 2. 已设计实体 (敌人 + NPC + 商人 + Boss)
    var entities = (data.common || []).length + (data.elites || []).length
      + (data.npcs || []).length + (data.merchants || []).length + (data.bosses || []).length;
    animateStat('statEntities', entities, 'statBarEntities', 45);

    // 3. 世界区域
    var regions = (data.regions || []).length;
    animateStat('statRegions', regions, 'statBarRegions', 30);

    // 4. Boss战
    var bosses = (data.bosses || []).length;
    animateStat('statBosses', bosses, 'statBarBosses', 20);

    // 5. 活跃子系统 (导航页除了dashboard)
    var navCount = document.querySelectorAll('.nav-link[data-page]:not([data-page="dashboard"])').length;
    animateStat('statSubsystems', navCount, 'statBarSubsystems', 60);

    // 6. 词条数
    var glossary = (data.glossary || []).length;
    animateStat('statGlossary', glossary, 'statBarGlossary', 35);

    // 编辑模式下显示日期输入、隐藏数字
    var statDays = document.getElementById('statDays');
    var dateInput = document.getElementById('statDateInput');
    if (statDays && dateInput) {
      if (editMode) {
        statDays.style.display = 'none';
        dateInput.style.display = 'block';
        dateInput.value = startDate;
      } else {
        statDays.style.display = '';
        dateInput.style.display = 'none';
      }
    }
  }

  function animateStat(valueId, target, barId, barPct) {
    var el = document.getElementById(valueId);
    if (!el) return;
    var duration = 2000, start = performance.now();
    var initial = parseInt(el.textContent) || 0;
    if (initial === target) { el.textContent = target; return; }
    function update(now) {
      var p = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(initial + (target - initial) * (1 - Math.pow(1-p, 3)));
      if (p < 1) requestAnimationFrame(update); else el.textContent = target;
    }
    requestAnimationFrame(update);
    var bar = document.getElementById(barId);
    if (bar) bar.style.width = barPct + '%';
  }

  window._onProjectDateChange = function(val) {
    if (!val) return;
    TDE_DATA.projectStartDate = val;
    updateDashboardStats();
    showSaved();
  };

  // ============================
  // 编辑模式系统
  // ============================

  function toggleEditMode() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    const btn = document.getElementById('editToggle');
    if (btn) btn.classList.toggle('active', editMode);
    if (editMode) {
      showToast('编辑模式已开启 — 可直接在页面上修改内容');
    } else {
      closeEditPanel();
      cancelMapConnection();
      if (_dragNode) { if (_dragNode.nodeEl) _dragNode.nodeEl.removeAttribute('transform'); _dragNode = null; _dragMouse = null; if (_dragRAF) { cancelAnimationFrame(_dragRAF); _dragRAF = null; } }
      document.body.classList.remove('dragging-map-node');
      document.body.style.cursor = '';
      showToast('编辑模式已关闭');
    }
    // 世界地图渲染依赖editMode状态
    updateDashboardStats();
    renderWorldMap();
    renderRegions();
    renderEntityStats();
    renderRegionOverview();
    // 若在区域详情页，切换编辑/查看模式
    if (Router.currentPage.startsWith('region/')) {
      renderRegionDetail(Router.currentSub, Router.currentLandmark);
    }
  }

  // ============================
  // 编辑面板系统
  // ============================
  const EditPanel = {
    overlay: null, panel: null, body: null, title: null,

    init() {
      this.overlay = document.getElementById('editPanelOverlay');
      this.panel = document.getElementById('editPanel');
      this.body = document.getElementById('editPanelBody');
      this.title = document.getElementById('editPanelTitle');
      document.getElementById('editPanelClose').addEventListener('click', () => closeEditPanel());
      document.getElementById('editPanelCancel').addEventListener('click', () => closeEditPanel());
      document.getElementById('editPanelSave').addEventListener('click', () => saveEditPanel());
      this.overlay.addEventListener('click', () => closeEditPanel());
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.panel.classList.contains('open')) {
          closeEditPanel();
        }
      });
    },

    open(html, title) {
      this.body.innerHTML = html;
      this.title.textContent = title || '编辑';
      this.panel.classList.add('open');
      this.overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    },

    close() {
      if (this.panel) this.panel.classList.remove('open');
      if (this.overlay) this.overlay.classList.remove('show');
      document.body.style.overflow = '';
      editPanelPath = null;
    }
  };

  function openEditPanel(path) {
    const data = getDataByPath(path);
    if (!data || typeof data !== 'object') return;
    editPanelPath = path;

    const parts = path.split('.');
    const sectionName = parts[0];
    const idx = parts.length >= 2 ? parseInt(parts[1]) : -1;
    const isNew = (idx >= 0 && idx >= getDataByPath(sectionName).length);
    const typeLabel = getTypeLabel(sectionName);
    const title = (isNew ? '新增' : '编辑') + ' — ' + typeLabel + (data.name ? '：' + data.name : '');

    const formHTML = buildEditForm(data, path);
    EditPanel.open(formHTML, title);
  }

  function closeEditPanel() {
    if (EditPanel.panel && EditPanel.panel.classList.contains('open')) {
      EditPanel.close();
    }
  }

  function saveEditPanel() {
    if (!editPanelPath) return;
    const data = getDataByPath(editPanelPath);
    if (!data || typeof data !== 'object') return;

    const body = EditPanel.body;

    // 收集所有表单字段
    const updates = {};
    body.querySelectorAll('[data-ep-field]').forEach(el => {
      const fieldPath = el.dataset.epField; // e.g., "name" or "stats.生命"
      let value;
      if (el.type === 'number') {
        value = parseFloat(el.value);
        if (isNaN(value)) value = 0;
      } else {
        value = el.value;
      }
      setNestedValue(updates, fieldPath, value);
    });

    // 收集子对象字段
    body.querySelectorAll('[data-ep-sub]').forEach(group => {
      const subPath = group.dataset.epSub; // e.g., "stats"
      const subObj = {};
      group.querySelectorAll('input').forEach(inp => {
        const key = inp.dataset.epKey;
        let val = inp.type === 'number' ? parseFloat(inp.value) : inp.value;
        if (inp.type === 'number' && isNaN(val)) val = 0;
        subObj[key] = val;
      });
      updates[subPath] = subObj;
    });

    // 收集词条选择器字段
    body.querySelectorAll('.ep-glossary-picker').forEach(picker => {
      const key = picker.dataset.epArray;
      const hidden = picker.querySelector('.ep-glossary-hidden');
      const values = hidden ? hidden.value.split(',').filter(Boolean) : [];
      updates[key] = values;
    });

    // 收集数组字段（跳过词条选择器）
    body.querySelectorAll('[data-ep-array]:not(.ep-glossary-picker)').forEach(arrEl => {
      const arrPath = arrEl.dataset.epArray;
      const items = [];
      arrEl.querySelectorAll('.ep-array-item input').forEach(inp => {
        items.push(inp.value);
      });
      updates[arrPath] = items;
    });

    // 应用更新到 TDE_DATA
    Object.keys(updates).forEach(key => {
      const fullPath = editPanelPath + '.' + key;
      setDataByPath(fullPath, updates[key]);
    });

    saveData();
    renderAll();
    updateDashboardStats();
    closeEditPanel();
    showSaved();
    // 若当前在区域详情页，刷新之
    if (Router.currentPage.startsWith('region/')) {
      renderRegionDetail(Router.currentSub, Router.currentLandmark);
    }
  }

  function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  function getTypeLabel(key) {
    const labels = {
      classes:'职业', npcs:'NPC', merchants:'商人', bosses:'Boss', elites:'精英敌人',
      common:'普通敌人', regions:'区域', weapons:'武器', armor:'防具',
      talismans:'护符', consumables:'消耗品', quests:'任务',
      milestones:'里程碑', sprints:'冲刺任务', changelog:'更新日志',
      glossary:'词条', progress:'进度', updates:'更新', tasks:'任务'
    };
    return labels[key] || key;
  }

  // 字段类型检测
  function detectField(key, value, parentPath) {
    if (key === 'id') return 'id';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    if (['rarity','difficulty','status','type','priority','icon','category','priority'].includes(key)) return 'enum';
    if (['desc','lore','changes','effect','services','text'].includes(key)) return 'textarea';
    return 'text';
  }

  function getEnumOptions(key, currentValue) {
    const maps = {
      rarity: ['legendary','epic','rare','common'],
      difficulty: ['legendary','hard','medium','easy'],
      status: currentValue === 'wip' || currentValue === 'todo' || currentValue === 'done' ? ['wip','todo','done'] : ['done','active','pending'],
      type: currentValue === 'main' || currentValue === 'side' ? ['main','side'] : [],
      priority: ['high','medium','low'],
      icon: ['bleed','poison','frost','curse','madness'],
      category: ['faction','family','organization','concept','race','event','region','status','attribute']
    };
    return maps[key] || [];
  }

  function getEnumLabel(value) {
    const map = {
      legendary:'传说', epic:'史诗', rare:'稀有', common:'普通',
      hard:'困难', medium:'中等', easy:'简单',
      wip:'进行中', todo:'待办', done:'已完成', active:'进行中', pending:'未开始',
      main:'主线', side:'支线',
      high:'高', medium:'中', low:'低',
      faction:'阵营', family:'家族', organization:'组织', concept:'概念', race:'种族', event:'事件',
      class:'职业', npc:'NPC', boss:'Boss', elite:'精英怪', enemy:'敌人', region:'区域',
      weapon:'武器', armor:'防具', talisman:'护符', consumable:'消耗品', quest:'任务', status:'异常状态',
      bleed:'出血', poison:'中毒', frost:'冰霜', curse:'诅咒', madness:'疯狂'
    };
    return map[value] || value;
  }

  // 字段名 → 词条分类映射（用于编辑面板中自动切换为词条选择器）
  var GLOSSARY_FIELD_MAP = {
    'damageTypes': 'attribute',
    'weaknesses': 'attribute',
    'resistances': 'attribute',
    'location': 'region',
    'connections': 'region'
  };

  // 取词条分类的中文标签
  function getGlossaryCatLabel(cat) {
    var map = { faction:'阵营', family:'家族', organization:'组织', concept:'概念', race:'种族', event:'事件', region:'区域', status:'异常状态', attribute:'属性' };
    return map[cat] || cat;
  }

  // 生成词条芯片选择器（用于数组型字段，如 damageTypes / weaknesses）
  function buildGlossaryChipPicker(fieldPath, category, selectedValues) {
    var entries = (TDE_DATA.glossary || []).filter(function(g) { return g.category === category; });
    var html = '<div class="ep-glossary-picker" data-ep-glossary-picker="' + category + '" data-ep-array="' + fieldPath + '">';
    // 已选芯片
    html += '<div class="ep-glossary-chips">';
    (selectedValues || []).forEach(function(val) {
      html += '<span class="ep-glossary-chip"><span>' + esc(val) + '</span><button type="button" class="ep-glossary-chip-del" title="移除" onclick="this.parentElement.remove();window._updateGlossPickerHidden(this)">&times;</button></span>';
    });
    html += '</div>';
    // 搜索输入
    html += '<div class="ep-glossary-search">';
    html += '<input type="text" class="ep-glossary-search-input" placeholder="搜索' + getGlossaryCatLabel(category) + '词条…" oninput="window._filterGlossaryPicker(this)" autocomplete="off">';
    html += '<div class="ep-glossary-dropdown">';
    // 初始显示所有未选中的条目
    var selectedSet = {};
    (selectedValues || []).forEach(function(v) { selectedSet[v] = true; });
    entries.forEach(function(g) {
      var isSel = selectedSet[g.name];
      html += '<div class="ep-glossary-option' + (isSel ? ' selected' : '') + '" data-name="' + escAttr(g.name) + '" onclick="window._toggleGlossaryChip(this)" style="' + (isSel ? 'display:none' : '') + '">' + g.name + '</div>';
    });
    html += '</div></div>';
    // 隐藏input存储逗号分隔的值，供saveEditPanel收集
    html += '<input type="hidden" class="ep-glossary-hidden" value="' + escAttr((selectedValues || []).join(',')) + '">';
    html += '</div>';
    return html;
  }

  function buildEditForm(data, path) {
    if (!data || typeof data !== 'object') return '<p style="color:var(--text-muted)">无法编辑此项。</p>';
    const isNew = Array.isArray(data) === false && !data.name && Object.keys(data).length === 0;
    let html = '';

    // 收集所有字段（跳过id和内部字段）
    const keys = Object.keys(data).filter(k => k !== 'id' && k !== 'landmarks' && !k.startsWith('_'));

    for (const key of keys) {
      const value = data[key];
      const fieldType = detectField(key, value, path);

      if (fieldType === 'id') {
        html += `<div class="ep-field ep-field-readonly"><label class="ep-field-label">ID（不可编辑）</label><input type="text" value="${esc(value || '')}" readonly></div>`;
      } else if (fieldType === 'number') {
        html += `<div class="ep-field"><label class="ep-field-label">${key}</label><input type="number" data-ep-field="${key}" value="${value}"></div>`;
      } else if (fieldType === 'text') {
        // 词条联动：单值字段映射到词条分类 → 下拉选择
        if (GLOSSARY_FIELD_MAP[key]) {
          var glossEntries = (TDE_DATA.glossary || []).filter(function(g) { return g.category === GLOSSARY_FIELD_MAP[key]; });
          var valueInGloss = glossEntries.some(function(g) { return g.name === value; });
          html += '<div class="ep-field"><label class="ep-field-label">' + key + '</label><select data-ep-field="' + key + '">';
          html += '<option value="">— 选择' + getGlossaryCatLabel(GLOSSARY_FIELD_MAP[key]) + '词条 —</option>';
          glossEntries.forEach(function(g) {
            html += '<option value="' + escAttr(g.name) + '"' + (value === g.name ? ' selected' : '') + '>' + g.name + '</option>';
          });
          // 当前值不在词条中时保留为自定义选项
          if (value && !valueInGloss) {
            html += '<option value="' + escAttr(value) + '" selected>' + value + ' (自定义)</option>';
          }
          html += '</select></div>';
        } else {
          html += `<div class="ep-field"><label class="ep-field-label">${key}</label><input type="text" data-ep-field="${key}" value="${esc(value || '')}"></div>`;
        }
      } else if (fieldType === 'textarea') {
        html += `<div class="ep-field"><label class="ep-field-label">${key}</label><textarea data-ep-field="${key}" rows="4">${esc(value || '')}</textarea></div>`;
      } else if (fieldType === 'enum') {
        const options = getEnumOptions(key, value);
        html += `<div class="ep-field"><label class="ep-field-label">${key}</label><select data-ep-field="${key}">${options.map(o => `<option value="${o}" ${o===value?'selected':''}>${getEnumLabel(o)}</option>`).join('')}</select></div>`;
      } else if (fieldType === 'object') {
        // 子对象如 stats, dmg, scaling, defense
        html += `<div class="ep-sub-group" data-ep-sub="${key}"><div class="ep-sub-group-title">${key}</div><div class="ep-sub-row">`;
        for (const [subKey, subVal] of Object.entries(value)) {
          const isNum = typeof subVal === 'number';
          html += `<div class="ep-sub-field"><label>${subKey}</label><input type="${isNum?'number':'text'}" data-ep-key="${subKey}" value="${isNum ? subVal : esc(subVal+'')}"></div>`;
        }
        html += `</div></div>`;
      } else if (fieldType === 'array') {
        // 词条联动：数组字段映射到词条分类 → 芯片选择器
        if (GLOSSARY_FIELD_MAP[key]) {
          html += '<div class="ep-field"><label class="ep-field-label">' + key + '</label>';
          html += buildGlossaryChipPicker(key, GLOSSARY_FIELD_MAP[key], value);
          html += '</div>';
        } else {
          html += `<div class="ep-array-field"><label class="ep-field-label">${key} (${value.length}项)</label><div class="ep-array-items" data-ep-array="${key}">`;
          value.forEach((item, i) => {
            html += `<div class="ep-array-item"><input type="text" value="${esc(typeof item==='string'?item:'')}"><button class="ep-array-del" title="删除" onclick="this.parentElement.remove()">×</button></div>`;
          });
          html += `</div><button class="ep-array-add" onclick="window._addPanelArrayItem(this)">+ 添加项</button></div>`;
        }
      }
    }

    return html || '<p style="color:var(--text-muted)">此条目无可编辑字段。</p>';
  }

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // 词条选择器——筛选下拉
  function filterGlossaryPicker(input) {
    var filter = (input.value || '').toLowerCase();
    var dropdown = input.parentElement.querySelector('.ep-glossary-dropdown');
    if (!dropdown) return;
    var options = dropdown.querySelectorAll('.ep-glossary-option');
    options.forEach(function(opt) {
      var name = (opt.dataset.name || '').toLowerCase();
      if (!filter || name.indexOf(filter) >= 0) {
        opt.style.display = opt.classList.contains('selected') ? 'none' : '';
      } else {
        opt.style.display = 'none';
      }
    });
  }

  // 词条选择器——切换芯片选中状态
  function toggleGlossaryChip(optionEl) {
    var picker = optionEl.closest('.ep-glossary-picker');
    var chips = picker.querySelector('.ep-glossary-chips');
    var name = optionEl.dataset.name;
    // 如果已选中则无操作（已选中的条目在dropdown中hidden了）
    // 添加到已选
    optionEl.classList.add('selected');
    optionEl.style.display = 'none';
    var chip = document.createElement('span');
    chip.className = 'ep-glossary-chip';
    chip.innerHTML = '<span>' + esc(name) + '</span><button type="button" class="ep-glossary-chip-del" title="移除" onclick="this.parentElement.remove();window._updateGlossPickerHidden(this)">&times;</button>';
    chips.appendChild(chip);
    updateGlossPickerHidden(picker);
    // 清除搜索
    var searchInput = picker.querySelector('.ep-glossary-search-input');
    if (searchInput) { searchInput.value = ''; filterGlossaryPicker(searchInput); }
  }

  // 词条选择器——更新隐藏字段的值
  function updateGlossPickerHidden(el) {
    var picker = (el.classList && el.classList.contains('ep-glossary-picker')) ? el : el.closest('.ep-glossary-picker');
    if (!picker) return;
    var chips = picker.querySelectorAll('.ep-glossary-chip span:first-child');
    var values = [];
    chips.forEach(function(c) { values.push(c.textContent.trim()); });
    var hidden = picker.querySelector('.ep-glossary-hidden');
    if (hidden) hidden.value = values.join(',');
    // 更新下拉中对应条目的状态
    var dropdown = picker.querySelector('.ep-glossary-dropdown');
    if (dropdown) {
      var valueSet = {};
      values.forEach(function(v) { valueSet[v] = true; });
      dropdown.querySelectorAll('.ep-glossary-option').forEach(function(opt) {
        if (valueSet[opt.dataset.name]) {
          opt.classList.add('selected');
          opt.style.display = 'none';
        } else {
          opt.classList.remove('selected');
          opt.style.display = '';
        }
      });
    }
  }

  // 面板内数组添加按钮（仅DOM操作，不影响数据）
  function addPanelArrayItem(btn) {
    const container = btn.previousElementSibling;
    if (!container) return;
    const item = document.createElement('div');
    item.className = 'ep-array-item';
    item.innerHTML = '<input type="text" value=""><button class="ep-array-del" title="删除" onclick="this.parentElement.remove()">×</button>';
    container.appendChild(item);
    const label = container.parentElement.querySelector('.ep-field-label');
    if (label) {
      const count = container.querySelectorAll('.ep-array-item').length;
      label.textContent = label.textContent.replace(/\(\d+项\)/, '(' + count + '项)');
    }
  }

  // 通过路径获取/设置 TDE_DATA 中的值
  function getDataByPath(path) {
    const parts = path.split('.');
    let obj = TDE_DATA;
    for (const p of parts) {
      if (obj === undefined || obj === null) return undefined;
      if (Array.isArray(obj) && /^\d+$/.test(p)) {
        obj = obj[parseInt(p)];
      } else {
        obj = obj[p];
      }
    }
    return obj;
  }

  function setDataByPath(path, value) {
    const parts = path.split('.');
    let obj = TDE_DATA;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (Array.isArray(obj) && /^\d+$/.test(p)) {
        obj = obj[parseInt(p)];
      } else {
        if (obj[p] === undefined) obj[p] = {};
        obj = obj[p];
      }
    }
    const lastKey = parts[parts.length - 1];
    if (Array.isArray(obj) && /^\d+$/.test(lastKey)) {
      obj[parseInt(lastKey)] = value;
    } else {
      obj[lastKey] = value;
    }
  }

  // 处理编辑事件
  function sanitizeHTML(html) {
    const allowed = ['b','i','u','strong','em','h2','h3','br','span'];
    const div = document.createElement('div');
    div.innerHTML = html;
    function clean(node) {
      const toRemove = [];
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3) continue;
        if (child.nodeType === 1 && allowed.includes(child.tagName.toLowerCase())) {
          const attrs = child.attributes;
          const removeAttrs = [];
          for (let j = 0; j < attrs.length; j++) {
            const name = attrs[j].name;
            if (name !== 'class' && !name.startsWith('data-')) {
              removeAttrs.push(name);
            }
          }
          removeAttrs.forEach(a => child.removeAttribute(a));
          clean(child);
        } else if (child.nodeType === 1) {
          toRemove.push({ el: child, replacement: document.createTextNode(child.textContent || '') });
        }
      }
      toRemove.forEach(item => {
        node.replaceChild(item.replacement, item.el);
      });
    }
    clean(div);
    return div.innerHTML;
  }

  // 处理数组项删除
  function handleArrayDelete(el) {
    if (!editMode) return;
    const container = el.closest('[data-array-container]');
    const path = container ? container.dataset.arrayContainer : null;
    const index = parseInt(el.closest('[data-array-item]').dataset.arrayItem);
    if (!path || isNaN(index)) return;

    const arr = getDataByPath(path);
    if (Array.isArray(arr)) {
      arr.splice(index, 1);
      saveData();
      renderAll();
      showSaved();
    }
  }

  function handleArrayAdd(el) {
    if (!editMode) return;
    const container = el.closest('[data-array-container]');
    const path = container ? container.dataset.arrayContainer : null;
    if (!path) return;

    const arr = getDataByPath(path);
    if (Array.isArray(arr) && arr.length > 0) {
      if (typeof arr[0] === 'object') {
        // 对象数组——打开编辑面板编辑新项
        const clone = JSON.parse(JSON.stringify(arr[arr.length - 1]));
        // 清空名称字段以表示这是新条目
        if (clone.name) clone.name = '';
        if (clone.id) clone.id = clone.id + '_new';
        arr.push(clone);
        saveData();
        renderAll();
        openEditPanel(path + '.' + (arr.length - 1));
        showSaved();
      } else {
        arr.push('新条目');
        saveData();
        renderAll();
        showSaved();
      }
    }
  }

  function handleCardDelete(el) {
    if (!editMode) return;
    const card = el.closest('[data-edit-card]');
    const path = card ? card.dataset.editCard : null;
    if (!path) return;

    const parentPath = path.substring(0, path.lastIndexOf('.'));
    const index = parseInt(path.substring(path.lastIndexOf('.') + 1));
    const arr = getDataByPath(parentPath);
    if (Array.isArray(arr)) {
      arr.splice(index, 1);
      saveData();
      renderAll();
      showSaved();
    }
  }

  // 处理特殊字段点击（稀有度、难度等枚举值循环切换）
  function handleEnumClick(e) {
    if (!editMode) return;
    const el = e.target.closest('[data-edit-enum]');
    if (!el) return;
    const path = el.dataset.editEnum;
    const options = el.dataset.enumOptions.split(',');
    const current = getDataByPath(path);
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    setDataByPath(path, next);
    saveData();
    renderAll();
    showSaved();
  }

  function saveData() {
    // 数据存储在 data/*.js 仓库文件中，网页编辑后通过「下载源文件」导出。
    // 此函数仅重建索引，供所有编辑路径调用（保持函数签名不变）。
    buildMentionIndex();
    buildGlossNameMap();
  }

  function resetData() {
    if (confirm('确定要放弃所有未保存的修改并重新加载吗？\n\n提示：请先使用「下载源文件」保存您的修改。')) {
      location.reload();
    }
  }

  function exportJSON() {
    const json = JSON.stringify(TDE_DATA, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tde-data-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.progress || !imported.classes) throw new Error('格式不正确');
        Object.keys(imported).forEach(k => {
          if (TDE_DATA.hasOwnProperty(k)) TDE_DATA[k] = imported[k];
        });
        saveData();
        renderAll();
        updateDashboardStats();
        showToast('导入成功');
      } catch(err) { showToast('导入失败: ' + err.message); }
    };
    reader.readAsText(file);
  }

  // 自动生成词条——扫描所有游戏数据，为缺少词条的实体自动创建词条条目
  // ============================
  // 辅助渲染函数
  // ============================

  function edit(path) { return `data-edit="${path}"`; }
  function editCard(path) { return `data-edit-card="${path}"`; }
  function arrayItem(idx) { return `data-array-item="${idx}"`; }
  function arrayContainer(path) { return `data-array-container="${path}"`; }
  function enumField(path, options) { return `data-edit-enum="${path}" data-enum-options="${options}"`; }

  function renderCardDelete(path) {
    return `<button class="edit-card-delete" title="删除此项" onclick="event.stopPropagation();window._delCard(this)" data-card-path="${path}">×</button>`;
  }

  function renderArrayControls(path) {
    return `<div class="card-add" ${arrayContainer(path)} onclick="window._addItem(this)"><span class="card-add-icon">+</span></div>`;
  }

  function renderArrayItemControls(idx) {
    return `<button class="edit-btn del" title="删除" ${arrayItem(idx)} onclick="event.stopPropagation();window._delItem(this)">×</button>`;
  }

  function renderArrayChips(path, items, chipClass) {
    if (!items || items.length === 0) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;" ${arrayContainer(path)}>
      ${items.map((item, i) => `
        <span class="${chipClass}" ${arrayItem(i)}>
          <span ${edit(`${path}.${i}`)}>${typeof item === 'string' ? item : item.name || item}</span>
          ${renderArrayItemControls(i)}
        </span>
      `).join('')}
    </div>`;
  }

  // ============================
  // 提及索引 & 自动补全系统
  // ============================
  let mentionIndex = [];
  let autocompleteState = { active: false, trigger: null, range: null, filterText: '' };

  function buildMentionIndex() {
    const idx = [];
    const add = (type, label, id, name) => { if (name) idx.push({ type, label, id, name }); };

    TDE_DATA.classes.forEach(c => add('class', '职业', c.id, c.name));
    TDE_DATA.npcs.forEach(n => add('npc', 'NPC', n.id, n.name));
    TDE_DATA.merchants.forEach(m => add('npc', '商人', m.id, m.name));
    TDE_DATA.bosses.forEach(b => add('boss', 'Boss', b.id, b.name));
    TDE_DATA.elites.forEach(e => add('elite', '精英', e.id, e.name));
    TDE_DATA.common.forEach(e => add('enemy', '敌人', e.id, e.name));
    TDE_DATA.regions.forEach(r => add('region', '区域', r.id, r.name));
    TDE_DATA.weapons.forEach(w => add('weapon', '武器', w.id, w.name));
    TDE_DATA.armor.forEach(a => add('armor', '防具', a.id, a.name));
    TDE_DATA.talismans.forEach(t => add('talisman', '护符', t.id, t.name));
    TDE_DATA.consumables.forEach(c => add('consumable', '消耗品', c.id, c.name));
    TDE_DATA.quests.forEach(q => add('quest', '任务', q.id, q.name));
    // 词条
    (TDE_DATA.glossary || []).forEach(g => add('glossary', '词条', g.id, g.name));

    mentionIndex = idx;
  }

  function getGlossaryIndex() {
    return (TDE_DATA.glossary || []).map(g => ({ type: 'glossary', label: g.category, id: g.id, name: g.name }));
  }

  function showAutocomplete(items, searchTerm, rect) {
    const dropdown = document.getElementById('autocomplete');
    if (!items.length) { hideAutocomplete(); return; }

    const catMap = {
      faction:'阵营', family:'家族', organization:'组织', concept:'概念', race:'种族', event:'事件',
      class:'职业', npc:'NPC', boss:'Boss', elite:'精英怪', enemy:'敌人', region:'区域',
      weapon:'武器', armor:'防具', talisman:'护符', consumable:'消耗品', quest:'任务',
      status:'异常状态', glossary:'词条'
    };

    let html = `<div class="autocomplete-header">${autocompleteState.trigger === '@' ? '提及实体' : '插入词条'} — ${searchTerm ? '匹配 "'+searchTerm+'"' : '输入关键词筛选'}</div>`;
    items.forEach((item, i) => {
      html += `<div class="autocomplete-item${i===0?' active':''}" data-id="${item.id}" data-type="${item.type}" data-name="${item.name}">
        <span class="autocomplete-item-type type-${item.type}">${catMap[item.label] || item.label}</span>
        <span>${item.name}</span>
      </div>`;
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('show');

    // 定位下拉菜单
    const dTop = rect.bottom + 4;
    const dLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 380));
    dropdown.style.top = dTop + 'px';
    dropdown.style.left = dLeft + 'px';

    // 绑定点击事件
    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation();
        insertMentionAtCursor(this.dataset.type, this.dataset.id, this.dataset.name);
      });
    });
  }

  function hideAutocomplete() {
    autocompleteState = { active: false, trigger: null, el: null, startPos: null, filterText: '' };
    const dropdown = document.getElementById('autocomplete');
    if (dropdown) {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
    }
  }

  function filterAutocomplete(filterText) {
    const dropdown = document.getElementById('autocomplete');
    const items = dropdown.querySelectorAll('.autocomplete-item');
    const lower = filterText.toLowerCase();
    let first = null;
    items.forEach(item => {
      const name = item.dataset.name.toLowerCase();
      if (name.includes(lower)) {
        item.style.display = '';
        if (!first) first = item;
      } else {
        item.style.display = 'none';
      }
    });
    items.forEach(i => i.classList.remove('active'));
    if (first) first.classList.add('active');
    else {
      // 无匹配提示
      if (!dropdown.querySelector('.autocomplete-no-result')) {
        const noResult = document.createElement('div');
        noResult.className = 'autocomplete-no-result';
        noResult.textContent = '无匹配结果';
        dropdown.appendChild(noResult);
      }
    }
    // 移除无匹配提示（如果有匹配）
    const noR = dropdown.querySelector('.autocomplete-no-result');
    if (noR && first) noR.remove();
  }

  function insertMentionAtCursor(type, id, name) {
    if (!autocompleteState.el) return;
    const el = autocompleteState.el;
    const trigger = autocompleteState.trigger;
    const startPos = autocompleteState.startPos;
    const cursorPos = el.selectionStart;

    const text = el.value;
    const before = text.substring(0, startPos);
    const tag = trigger === '@' ? '@' + name : '[[' + name + ']]';
    const after = text.substring(cursorPos);

    el.value = before + tag + ' ' + after;
    const newPos = before.length + tag.length + 1;
    el.setSelectionRange(newPos, newPos);
    el.focus();

    hideAutocomplete();
  }

  function detectAutocompleteTrigger(e) {
    if (!editMode) return;
    const el = e.target;
    if (!el || (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT')) return;

    const text = el.value;
    const pos = el.selectionStart;
    if (pos === null) return;

    // 检测 @ 触发
    const atIdx = text.lastIndexOf('@', pos - 1);
    if (atIdx >= 0) {
      const afterAt = text.substring(atIdx + 1, pos);
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        const searchTerm = afterAt;
        const items = mentionIndex.filter(m => m.name.includes(searchTerm) || searchTerm === '');
        if (items.length > 0) {
          autocompleteState = { active: true, trigger: '@', el: el, startPos: atIdx, filterText: searchTerm };
          const rect = el.getBoundingClientRect();
          showAutocomplete(items.slice(0, 15), searchTerm, {
            bottom: rect.top + 24,
            left: rect.left
          });
          return;
        }
      }
    }

    // 检测 [[ 触发
    const bracketIdx = text.lastIndexOf('[[', pos - 1);
    if (bracketIdx >= 0) {
      const afterBracket = text.substring(bracketIdx + 2, pos);
      if (!afterBracket.includes(' ') && !afterBracket.includes('\n') && !afterBracket.includes(']')) {
        const searchTerm = afterBracket;
        const glossaryIdx = getGlossaryIndex();
        const items = glossaryIdx.filter(g => g.name.includes(searchTerm) || searchTerm === '');
        if (items.length > 0) {
          autocompleteState = { active: true, trigger: '[[', el: el, startPos: bracketIdx, filterText: searchTerm };
          const rect = el.getBoundingClientRect();
          showAutocomplete(items.slice(0, 15), searchTerm, {
            bottom: rect.top + 24,
            left: rect.left
          });
          return;
        }
      }
    }

    // 自动补全已激活，更新筛选
    if (autocompleteState.active) {
      const trigPos = text.lastIndexOf(autocompleteState.trigger, pos - 1);
      if (trigPos >= 0 && trigPos === autocompleteState.startPos) {
        const newFilter = text.substring(trigPos + autocompleteState.trigger.length, pos);
        if (!newFilter.includes(' ') && !newFilter.includes('\n')) {
          autocompleteState.filterText = newFilter;
          filterAutocomplete(newFilter);
          return;
        }
      }
      hideAutocomplete();
    }
  }

  function handleAutocompleteKey(e) {
    if (!autocompleteState.active) return;
    const dropdown = document.getElementById('autocomplete');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = dropdown.querySelectorAll('.autocomplete-item[style*="display:none"], .autocomplete-item:not([style*="display:none"])');
      const visible = [...dropdown.querySelectorAll('.autocomplete-item')].filter(i => i.style.display !== 'none');
      const active = dropdown.querySelector('.autocomplete-item.active');
      const idx = visible.indexOf(active);
      visible.forEach(i => i.classList.remove('active'));
      if (idx < visible.length - 1) visible[idx + 1].classList.add('active');
      else visible[0].classList.add('active');
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const visible = [...dropdown.querySelectorAll('.autocomplete-item')].filter(i => i.style.display !== 'none');
      const active = dropdown.querySelector('.autocomplete-item.active');
      const idx = visible.indexOf(active);
      visible.forEach(i => i.classList.remove('active'));
      if (idx > 0) visible[idx - 1].classList.add('active');
      else visible[visible.length - 1].classList.add('active');
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const active = dropdown.querySelector('.autocomplete-item.active');
      if (active) {
        e.preventDefault();
        e.stopPropagation();
        insertMentionAtCursor(active.dataset.type, active.dataset.id, active.dataset.name);
      }
      return;
    }
    if (e.key === 'Escape') {
      hideAutocomplete();
      return;
    }
  }

  // ============================
  // 富文本格式工具栏
  // ============================
  function showFormatToolbar() {
    if (!editMode) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !sel.toString().trim()) {
      hideFormatToolbar();
      return;
    }
    // 确保选区在可编辑区域内
    const anchor = sel.anchorNode;
    const editableEl = (anchor.nodeType === 1 ? anchor : anchor.parentElement).closest('[data-edit]');
    if (!editableEl) { hideFormatToolbar(); return; }

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const toolbar = document.getElementById('formatToolbar');
    toolbar.style.top = (rect.top - 42) + 'px';
    toolbar.style.left = Math.max(8, rect.left + rect.width/2 - toolbar.offsetWidth/2) + 'px';
    toolbar.classList.add('show');
  }

  function hideFormatToolbar() {
    document.getElementById('formatToolbar').classList.remove('show');
  }

  function execFormat(cmd, value) {
    if (!editMode) return;
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    document.execCommand(cmd, false, value || null);
    // 触发保存
    const editableEl = (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement).closest('[data-edit]');
    if (editableEl) {
      const path = editableEl.dataset.edit;
      if (path && typeof getDataByPath(path) === 'string') {
        setDataByPath(path, sanitizeHTML(editableEl.innerHTML));
        saveData();
        showSaved();
      }
    }
  }

  // ============================
  // 渲染函数
  // ============================

  // --- 项目总览 ---
  function renderEntityStats() {
    var cats = [
      { key: 'regions', name: '区域', color: '#00bfa5', hash: 'world' },
      { key: 'bosses', name: 'Boss', color: '#ff5252', hash: 'bestiary' },
      { key: 'elites', name: '精英敌人', color: '#ff9100', hash: 'bestiary' },
      { key: 'common', name: '普通敌人', color: '#ffab40', hash: 'bestiary' },
      { key: 'classes', name: '职业', color: '#448aff', hash: 'characters' },
      { key: 'npcs', name: 'NPC', color: '#69f0ae', hash: 'characters' },
      { key: 'merchants', name: '商人', color: '#e040fb', hash: 'characters' },
      { key: 'weapons', name: '武器', color: '#ff6d00', hash: 'equipment' },
      { key: 'armor', name: '防具', color: '#607d8b', hash: 'equipment' },
      { key: 'talismans', name: '护符', color: '#ffd740', hash: 'equipment' },
      { key: 'consumables', name: '消耗品', color: '#40c4ff', hash: 'equipment' },
      { key: 'quests', name: '任务', color: '#b2ff59', hash: 'quests' },
      { key: 'glossary', name: '词条', color: '#00e5ff', hash: 'glossary' }
    ];
    var html = '<div class="entity-stats-grid">';
    cats.forEach(function(c) {
      var count = (TDE_DATA[c.key] || []).length;
      if (count === 0) return;
      html += '<a class="entity-stat-item" href="#' + c.hash + '" title="前往 ' + c.name + ' 页面">'
        + '<span class="esi-count">' + count + '</span>'
        + '<span class="esi-label">' + c.name + '</span>'
        + '<span class="esi-bar" style="background:' + c.color + ';"></span>'
        + '</a>';
    });
    html += '</div>';
    var el = document.getElementById('entityStats');
    if (el) el.innerHTML = html;
  }

  function renderRegionOverview() {
    var regions = TDE_DATA.regions || [];
    var nodes = (TDE_DATA.worldMap && TDE_DATA.worldMap.nodes) || {};
    var html = '<div class="region-overview-grid">';
    regions.forEach(function(r) {
      var node = nodes[r.name] || {};
      var color = node.color || '#00bfa5';
      var bossCount = (r.bosses || []).filter(function(b) { return b && b !== '无'; }).length;
      var connCount = (r.connections || []).filter(function(c) { return c && c !== '无'; }).length;
      html += '<a class="ro-card" href="#region/' + r.id + '" title="查看区域详情：' + r.name + '">'
        + '<span class="ro-dot" style="background:' + color + ';box-shadow:0 0 8px ' + color + ';"></span>'
        + '<div class="ro-info">'
        + '<span class="ro-name">' + r.name + '</span>'
        + '<span class="ro-sub">' + r.level + '</span>'
        + '</div>'
        + '<div class="ro-stats">'
        + (bossCount > 0 ? '<span class="ro-stat"><svg viewBox="0 0 24 24" width="10" height="10"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" fill="' + color + '"/></svg>' + bossCount + '</span>' : '')
        + '<span class="ro-stat"><svg viewBox="0 0 24 24" width="10" height="10"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" fill="rgba(0,191,165,0.5)"/></svg>' + connCount + '</span>'
        + '</div>'
        + '</a>';
    });
    html += '</div>';
    var el = document.getElementById('regionOverview');
    if (el) el.innerHTML = html;
  }

  function renderProgress() {
    const list = TDE_DATA.progress.map((item, i) => `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-name" ${edit(`progress.${i}.name`)}>${item.name}</span>
          <span class="progress-pct" ${edit(`progress.${i}.pct`)}>${item.pct}</span>
        </div>
        <div class="progress-track">
          <div class="progress-track-fill" style="width:${item.pct}%" data-target="${item.pct}"></div>
        </div>
      </div>
    `).join('');
    document.getElementById('progressList').innerHTML = list;
    // 编辑模式下进度条的添加删除
    if (editMode) {
      document.getElementById('progressList').insertAdjacentHTML('beforeend',
        renderArrayControls('progress'));
    }
  }

  function renderUpdates() {
    document.getElementById('updateList').innerHTML = TDE_DATA.updates.map((u, i) => `
      <div class="update-item" ${arrayItem(i)}>
        <span class="update-date" ${edit(`updates.${i}.date`)}>${u.date}</span>
        <span class="update-text" ${edit(`updates.${i}.text`)}>${u.text}</span>
        ${renderArrayItemControls(i)}
      </div>
    `).join('') + renderArrayControls('updates');
  }

  function renderTasks() {
    document.getElementById('taskList').innerHTML = TDE_DATA.tasks.map((t, i) => `
      <div class="task-item" ${arrayItem(i)}>
        <span class="task-priority ${t.priority}"></span>
        <span ${edit(`tasks.${i}.text`)}>${t.text}</span>
        ${renderArrayItemControls(i)}
      </div>
    `).join('') + renderArrayControls('tasks');
  }

  // --- 角色 ---
  function renderClasses() {
    document.getElementById('tab-classes').innerHTML = `
      <div class="char-grid">${TDE_DATA.classes.map((c, i) => `
        <div class="char-card" ${editCard(`classes.${i}`)} onclick="if(!document.body.classList.contains('edit-mode'))window._showCharDetail('${c.id}')">
          ${renderCardDelete(`classes.${i}`)}
          <div class="char-card-header">
            <div>
              <div class="char-name" ${edit(`classes.${i}.name`)}>${c.name}</div>
              <div class="char-title-label" ${edit(`classes.${i}.title`)}>${c.title}</div>
            </div>
            <div class="char-avatar">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
          </div>
          <div class="char-stats">
            ${Object.entries(c.stats).map(([k, v]) => `<span class="char-stat"><span ${edit(`classes.${i}.stats.${k}`)}>${v}</span></span>`).join('')}
          </div>
          <div class="char-desc" ${edit(`classes.${i}.desc`)}>${c.desc}</div>
          <div style="margin-top:10px;font-size:0.72rem;color:var(--cyan);" ${edit(`classes.${i}.weapon`)}>${c.weapon}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);" ${edit(`classes.${i}.skill`)}>${c.skill}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('classes');
  }

  function renderNPCs() {
    document.getElementById('tab-npcs').innerHTML = `
      <div class="char-grid">${TDE_DATA.npcs.map((n, i) => `
        <div class="char-card" ${editCard(`npcs.${i}`)}>
          ${renderCardDelete(`npcs.${i}`)}
          <div class="char-card-header">
            <div>
              <div class="char-name" ${edit(`npcs.${i}.name`)}>${n.name}</div>
              <div class="char-title-label" ${edit(`npcs.${i}.title`)}>${n.title}</div>
            </div>
            <div class="char-avatar">
              <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
          </div>
          <div class="char-desc" ${edit(`npcs.${i}.desc`)}>${n.desc}</div>
          <div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted);">位置：<span ${edit(`npcs.${i}.location`)}>${n.location}</span></div>
          <div style="font-size:0.72rem;color:var(--cyan);">角色：<span ${edit(`npcs.${i}.role`)}>${n.role}</span></div>
          <div style="font-size:0.72rem;color:var(--text-secondary);" ${edit(`npcs.${i}.services`)}>${n.services}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('npcs');
  }

  function renderMerchants() {
    document.getElementById('tab-merchants').innerHTML = `
      <div class="char-grid">${TDE_DATA.merchants.map((m, i) => `
        <div class="char-card" ${editCard(`merchants.${i}`)}>
          ${renderCardDelete(`merchants.${i}`)}
          <div class="char-name" style="margin-bottom:8px;" ${edit(`merchants.${i}.name`)}>${m.name}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:6px;">补货：<span ${edit(`merchants.${i}.restock`)}>${m.restock}</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" ${arrayContainer(`merchants.${i}.items`)}>
            ${m.items.map((it, j) => `
              <span class="char-stat" ${arrayItem(j)}>
                <span ${edit(`merchants.${i}.items.${j}`)}>${it}</span>
                ${renderArrayItemControls(j)}
              </span>
            `).join('')}
          </div>
          ${`<button class="inline-add-btn" style="margin-top:6px;" ${arrayContainer(`merchants.${i}.items`)} onclick="event.stopPropagation();window._addItem(this)">+ 添加商品</button>`}
        </div>
      `).join('')}</div>
    ` + renderArrayControls('merchants');
  }

  // --- 图鉴 ---
  // 词条链接辅助：将属性名称映射到词条
  var _glossNameMap = null;
  function buildGlossNameMap() {
    _glossNameMap = {};
    (TDE_DATA.glossary || []).forEach(function(g) {
      _glossNameMap[g.name] = g;
    });
  }
  function glossLink(name) {
    if (!_glossNameMap) buildGlossNameMap();
    var g = _glossNameMap[name];
    if (g) {
      return '<span class="gloss-link" data-gloss-id="' + g.id + '" data-gloss-cat="' + g.category + '" onclick="event.stopPropagation();window._goGlossary(\'' + g.category + '\')" title="查看词条：' + name + '">' + name + '</span>';
    }
    return name;
  }
  function glossLinks(names) {
    return names.map(function(n) { return glossLink(n); }).join('、');
  }

  function renderBosses() {
    const diffMap = { legendary:'传说', hard:'困难', medium:'中等', easy:'简单' };
    document.getElementById('btab-bosses').innerHTML = `
      <div class="boss-grid">${TDE_DATA.bosses.map((b, i) => `
        <div class="boss-card difficulty-${b.difficulty}" ${editCard(`bosses.${i}`)} onclick="if(!document.body.classList.contains('edit-mode'))window._showBossDetail('${b.id}')">
          ${renderCardDelete(`bosses.${i}`)}
          <div class="boss-header">
            <span class="boss-name" ${edit(`bosses.${i}.name`)}>${b.name}</span>
            <span class="boss-difficulty diff-${b.difficulty}" ${enumField(`bosses.${i}.difficulty`, 'legendary,hard,medium,easy')} onclick="event.stopPropagation();window._enumClick(event)">${diffMap[b.difficulty] || b.difficulty}</span>
          </div>
          <div class="boss-desc" ${edit(`bosses.${i}.desc`)}>${b.desc}</div>
          <div class="boss-stats-row">
            <div class="boss-stat-mini">${glossLink('生命值')}<span class="value" ${edit(`bosses.${i}.hp`)}>${b.hp}</span></div>
            <div class="boss-stat-mini"><span class="label">阶段</span><span class="value" ${edit(`bosses.${i}.phases`)}>${b.phases}</span></div>
            <div class="boss-stat-mini"><span class="label">位置</span><span class="value" ${edit(`bosses.${i}.location`)}>${b.location}</span></div>
          </div>
          <div class="boss-dmg-types">
            ${b.damageTypes && b.damageTypes.length ? `<span class="boss-dmg-label gloss-link" onclick="event.stopPropagation();window._goGlossary('attribute')">伤害：</span><span class="boss-dmg-chips">${glossLinks(b.damageTypes)}</span>` : ''}
          </div>
          <div class="boss-dmg-types">
            ${b.weaknesses && b.weaknesses.length ? `<span class="boss-dmg-label gloss-link" onclick="event.stopPropagation();window._goGlossary('attribute')">弱点：</span><span class="boss-dmg-chips boss-weak">${glossLinks(b.weaknesses)}</span>` : ''}
          </div>
          <div class="boss-dmg-types">
            ${b.resistances && b.resistances.length ? `<span class="boss-dmg-label gloss-link" onclick="event.stopPropagation();window._goGlossary('attribute')">抗性：</span><span class="boss-dmg-chips boss-resist">${glossLinks(b.resistances)}</span>` : ''}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;" ${arrayContainer(`bosses.${i}.drops`)}>
            ${b.drops.map((d, j) => `<span class="boss-drop" ${arrayItem(j)}><span ${edit(`bosses.${i}.drops.${j}`)}>${d}</span>${renderArrayItemControls(j)}</span>`).join('')}
            ${`<button class="inline-add-btn" style="margin-left:4px;" onclick="event.stopPropagation();window._addItem(this)">+ 添加掉落</button>`}
          </div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('bosses');
  }

  function renderElites() {
    document.getElementById('btab-elites').innerHTML = `
      <div class="boss-grid">${TDE_DATA.elites.map((e, i) => `
        <div class="boss-card" ${editCard(`elites.${i}`)}>
          ${renderCardDelete(`elites.${i}`)}
          <div class="boss-header">
            <span class="boss-name" ${edit(`elites.${i}.name`)}>${e.name}</span>
            <span class="boss-difficulty diff-medium">精英</span>
          </div>
          <div class="boss-desc" ${edit(`elites.${i}.desc`)}>${e.desc}</div>
          <div class="boss-stats-row">
            <div class="boss-stat-mini">${glossLink('生命值')}<span class="value" ${edit(`elites.${i}.hp`)}>${e.hp}</span></div>
            <div class="boss-stat-mini"><span class="label">位置</span><span class="value" ${edit(`elites.${i}.location`)}>${e.location}</span></div>
          </div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('elites');
  }

  function renderCommon() {
    document.getElementById('btab-common').innerHTML = `
      <div class="boss-grid">${TDE_DATA.common.map((e, i) => `
        <div class="boss-card" ${editCard(`common.${i}`)}>
          ${renderCardDelete(`common.${i}`)}
          <div class="boss-header">
            <span class="boss-name" ${edit(`common.${i}.name`)}>${e.name}</span>
            <span class="boss-difficulty diff-easy">普通</span>
          </div>
          <div class="boss-desc" ${edit(`common.${i}.desc`)}>${e.desc}</div>
          <div class="boss-stats-row">
            <div class="boss-stat-mini">${glossLink('生命值')}<span class="value" ${edit(`common.${i}.hp`)}>${e.hp}</span></div>
            <div class="boss-stat-mini"><span class="label">位置</span><span class="value" ${edit(`common.${i}.location`)}>${e.location}</span></div>
          </div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('common');
  }

  // --- 世界 ---
  // 将 hex 颜色转换为 rgba
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // 编辑模式下节点拖拽状态
  var _dragNode = null;    // { name, origX, origY, startScreenX, startScreenY, scaleX, scaleY, nodeEl, moved }
  var _dragRAF = null;
  var _dragMouse = null;   // { clientX, clientY } — 最新鼠标位置

  function renderWorldMap() {
    // 初始化 worldMap 结构
    if (!TDE_DATA.worldMap) TDE_DATA.worldMap = {};
    if (!TDE_DATA.worldMap.nodes) TDE_DATA.worldMap.nodes = {};
    var nodes = TDE_DATA.worldMap.nodes;
    var regions = TDE_DATA.regions || [];

    // 自动为没有节点的区域生成节点（圆形排列，颜色随机选择）
    var missingRegions = regions.filter(function(r) { return !nodes[r.name]; });
    if (missingRegions.length > 0) {
      var palette = ['#00bfa5', '#00f0ff', '#ff6b35', '#69f0ae', '#448aff', '#b388ff', '#ffd54f', '#ff5252', '#ffab40', '#e040fb', '#40c4ff'];
      var cx = 400, cy = 250, radius = 180;
      // 把现有节点占用的位置排除
      var existingNames = Object.keys(nodes);
      var totalCount = existingNames.length + missingRegions.length;
      // 重新分配所有节点的位置（保持已有节点的位置不变，新节点放在空白角度）
      var usedAngles = [];
      existingNames.forEach(function(name) {
        var angle = Math.atan2(nodes[name].y - cy, nodes[name].x - cx);
        usedAngles.push(angle);
      });
      // 为新节点找空余角度
      var angleStep = (2 * Math.PI) / totalCount;
      var freeAngles = [];
      for (var ai = 0; ai < totalCount; ai++) {
        var a = ai * angleStep - Math.PI / 2; // 从12点钟方向开始
        var tooClose = usedAngles.some(function(ua) { return Math.abs(a - ua) < angleStep * 0.4; });
        if (!tooClose) freeAngles.push(a);
      }
      // 如果空余角度不够，直接用等距分配
      if (freeAngles.length < missingRegions.length) {
        freeAngles = [];
        for (var bi = existingNames.length; bi < totalCount; bi++) {
          freeAngles.push(bi * angleStep - Math.PI / 2);
        }
      }

      missingRegions.forEach(function(r, i) {
        var angle = freeAngles[i] || (i * angleStep - Math.PI / 2);
        var x = cx + radius * Math.cos(angle);
        var y = cy + radius * Math.sin(angle);
        var color = palette[(existingNames.length + i) % palette.length];
        // 根据区域等级判断大小
        var size = 'medium';
        var lvl = parseInt(r.level) || 0;
        if (r.level === '主城') size = 'hub';
        else if (lvl >= 80) size = 'xlarge';
        else if (lvl >= 40) size = 'large';
        else if (lvl <= 20) size = 'medium';
        nodes[r.name] = { x: Math.round(x), y: Math.round(y), color: color, size: size, style: 'default' };
      });
      saveData();
    }

    // 从region.connections数据中提取所有连接线（去重、双向合并）
    var drawnPairs = {};
    var connections = [];
    regions.forEach(function(r) {
      (r.connections || []).forEach(function(targetRaw) {
        var target = targetRaw.replace(/（[^）]*）/, '').trim();
        if (!nodes[r.name] || !nodes[target]) return;
        var pairKey = [r.name, target].sort().join('|||');
        if (drawnPairs[pairKey]) return;
        drawnPairs[pairKey] = true;
        connections.push({
          from: r.name, to: target,
          x1: nodes[r.name].x, y1: nodes[r.name].y,
          x2: nodes[target].x, y2: nodes[target].y
        });
      });
    });

    // 生成连接线 SVG —— 用透明宽线做点击区域
    var linesHTML = connections.map(function(conn, i) {
      var lineCls = 'map-conn-edge';
      var clickHandler = '';
      var visStroke = 'rgba(0,191,165,0.2)';
      var visWidth = '1.5';
      if (editMode) {
        lineCls += ' map-conn-line';
        clickHandler = ' onclick="event.stopPropagation();window._deleteMapConnection(\'' + escAttr(conn.from) + '\',\'' + escAttr(conn.to) + '\')"';
        visStroke = 'rgba(255,150,80,0.65)';
        visWidth = '2.5';
      }
      return '<g class="' + lineCls + '"' + clickHandler + ' style="cursor:pointer" title="' + (editMode ? '点击删除连接：' + conn.from + ' ↔ ' + conn.to : '') + '">'
        + '<line x1="' + conn.x1 + '" y1="' + conn.y1 + '" x2="' + conn.x2 + '" y2="' + conn.y2 + '" stroke="transparent" stroke-width="16"/>'
        + '<line class="map-conn-vis" x1="' + conn.x1 + '" y1="' + conn.y1 + '" x2="' + conn.x2 + '" y2="' + conn.y2 + '" stroke="' + visStroke + '" stroke-width="' + visWidth + '" stroke-dasharray="6,4"/>'
        + '</g>';
    }).join('\n        ');

    // 生成区域节点 SVG
    var sizeCfg = {
      hub:    { r1: 30, r2: 12, fs: 10, dy: 16 },
      xlarge: { r1: 22, r2:  8, fs:  9, dy: 14 },
      large:  { r1: 18, r2:  6, fs:  9, dy: 12 },
      medium: { r1: 14, r2:  4, fs:  8, dy: 10 },
      small:  { r1: 10, r2:  3, fs:  7, dy:  9 }
    };

    // 风格预设 → 渲染方式
    function renderNodeOuterInner(n, sz) {
      var st = n.style || 'default';
      var outer, inner;

      if (n.size === 'hub') {
        // hub 保持独特的渐变+发光样式，不受 style 影响
        outer = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r1 + '" fill="url(#hubGrad)" filter="url(#mapGlow)"/>';
        inner = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r2 + '" fill="' + n.color + '" stroke="#00f0ff" stroke-width="2"/>';
      } else if (st === 'subtle') {
        outer = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r1 + '" fill="' + hexToRgba(n.color, 0.08) + '" stroke="' + n.color + '" stroke-width="1" stroke-dasharray="3,3"/>';
        inner = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r2 + '" fill="' + n.color + '" opacity="0.5"/>';
      } else if (st === 'dashed') {
        outer = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r1 + '" fill="' + hexToRgba(n.color, 0.08) + '" stroke="' + n.color + '" stroke-width="2" stroke-dasharray="5,3"/>';
        inner = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r2 + '" fill="' + n.color + '"/>';
      } else {
        // default
        outer = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r1 + '" fill="' + hexToRgba(n.color, 0.12) + '" stroke="' + n.color + '" stroke-width="1.5"/>';
        inner = '<circle cx="' + n.x + '" cy="' + n.y + '" r="' + sz.r2 + '" fill="' + n.color + '"/>';
      }
      return { outer: outer, inner: inner };
    }

    var nodesHTML = Object.keys(nodes).map(function(name) {
      var n = nodes[name];
      var sz = sizeCfg[n.size] || sizeCfg.medium;
      var oi = renderNodeOuterInner(n, sz);

      var subLabel = '';
      if (n.sublabel) {
        subLabel = '<text class="map-node-sub" x="' + n.x + '" y="' + (n.y + sz.r1 + 26) + '" text-anchor="middle" fill="' + n.color + '" font-size="6" font-family="sans-serif" opacity="0.7">' + n.sublabel + '</text>';
      }

      // 编辑模式下：可拖拽 + 添加连线 + 双击编辑节点
      var dragAttrs = '';
      var editControls = '';
      if (editMode) {
        dragAttrs = ' onmousedown="window._startDragNode(event,\'' + escAttr(name) + '\')"';
        editControls = '<circle cx="' + (n.x + sz.r1 + 6) + '" cy="' + (n.y - sz.r1 - 2) + '" r="7" fill="rgba(0,240,255,0.25)" stroke="#00f0ff" stroke-width="1" style="cursor:pointer" title="添加连接：' + name + '" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();window._startMapConnection(\'' + escAttr(name) + '\')"/><text x="' + (n.x + sz.r1 + 6) + '" y="' + (n.y - sz.r1 + 2) + '" text-anchor="middle" fill="#00f0ff" font-size="10" font-family="sans-serif" style="cursor:pointer;pointer-events:none;">+</text>';
        // 双击打开节点编辑
        dragAttrs += ' ondblclick="event.stopPropagation();window._editMapNode(\'' + escAttr(name) + '\')"';
      }

      var titleText = editMode ? '拖拽移动 / 双击编辑 / 查看区域详情：' + name : '查看区域详情：' + name;

      return '<g class="map-node" data-node-name="' + escAttr(name) + '"' + dragAttrs + ' style="cursor:' + (editMode ? 'grab' : 'pointer') + '" title="' + titleText + '">'
        + oi.outer + oi.inner
        + '<text class="map-node-label" x="' + n.x + '" y="' + (n.y + sz.r1 + sz.dy) + '" text-anchor="middle" fill="' + n.color + '" font-size="' + sz.fs + '" font-family="sans-serif">' + name + '</text>'
        + subLabel
        + editControls
        + '</g>';
    }).join('\n        ');

    // 编辑模式下显示20px吸附网格
    var snapGridHTML = '';
    if (editMode) {
      snapGridHTML = '<pattern id="snapGrid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.6" fill="rgba(0,240,255,0.08)"/></pattern><rect width="800" height="500" fill="url(#snapGrid)"/>';
    }

    document.getElementById('worldMap').innerHTML = `
      <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="mapGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id="hubGrad"><stop offset="0%" stop-color="#00f0ff" stop-opacity="0.6"/><stop offset="100%" stop-color="#00bfa5" stop-opacity="0"/></radialGradient>
        </defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,191,165,0.06)" stroke-width="0.5"/></pattern>
        <rect width="800" height="500" fill="url(#grid)"/>
        ${snapGridHTML}
        ${linesHTML}
        ${nodesHTML}
      </svg>`;
  }

  // --- 地图节点属性编辑 ---
  var _editingMapNode = null;

  function editMapNode(name) {
    if (!editMode) return;
    var nodes = TDE_DATA.worldMap && TDE_DATA.worldMap.nodes;
    if (!nodes || !nodes[name]) return;
    _editingMapNode = name;
    var n = nodes[name];

    var sizes = ['hub', 'xlarge', 'large', 'medium', 'small'];
    var sizeLabels = { hub: '核心', xlarge: '超大', large: '大', medium: '中', small: '小' };
    var colors = ['#00bfa5', '#00f0ff', '#ff6b35', '#69f0ae', '#448aff', '#b388ff', '#ffd54f', '#ff5252', '#e0e0e0'];
    var styles = ['default', 'dashed', 'subtle'];
    var styleLabels = { default: '默认', dashed: '虚线', subtle: '淡雅' };

    var sizeHTML = sizes.map(function(s) {
      var sel = n.size === s ? ' mn-opt-sel' : '';
      return '<button class="mn-opt mn-size-btn' + sel + '" data-mn-size="' + s + '">' + sizeLabels[s] + '</button>';
    }).join('');

    var colorHTML = colors.map(function(c) {
      var sel = n.color === c ? ' mn-swatch-sel' : '';
      return '<button class="mn-swatch' + sel + '" style="background:' + c + '" data-mn-color="' + c + '" title="' + c + '"></button>';
    }).join('');

    var styleHTML = styles.map(function(s) {
      var sel = (n.style || 'default') === s ? ' mn-opt-sel' : '';
      return '<button class="mn-opt mn-style-btn' + sel + '" data-mn-style="' + s + '">' + styleLabels[s] + '</button>';
    }).join('');

    var html = ''
      + '<input type="hidden" id="mnSize" value="' + (n.size || 'medium') + '">'
      + '<input type="hidden" id="mnColor" value="' + (n.color || '#00bfa5') + '">'
      + '<input type="hidden" id="mnStyle" value="' + (n.style || 'default') + '">'
      + '<div class="mn-field"><label class="mn-label">大小</label><div class="mn-opts">' + sizeHTML + '</div></div>'
      + '<div class="mn-field"><label class="mn-label">颜色</label><div class="mn-swatches">' + colorHTML + '</div></div>'
      + '<div class="mn-field"><label class="mn-label">样式</label><div class="mn-opts">' + styleHTML + '</div></div>'
      + '<div class="mn-field"><label class="mn-label">副标题 (可选)</label><input class="mn-input" id="mnSublabel" value="' + escAttr(n.sublabel || '') + '" placeholder="如：终局"></div>';

    document.getElementById('mnTitle').textContent = '编辑节点：' + name;
    document.getElementById('mnBody').innerHTML = html;
    document.getElementById('mapNodeModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // 节点编辑弹窗内选项点击 — 事件委托 (必须在 #mnBody 上，因为 .mn-modal 有 stopPropagation)
  (function initMapNodeModal() {
    var body = document.getElementById('mnBody');
    if (!body) return;
    body.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.mnSize) {
        document.getElementById('mnSize').value = btn.dataset.mnSize;
        body.querySelectorAll('.mn-size-btn').forEach(function(b) { b.classList.remove('mn-opt-sel'); });
        btn.classList.add('mn-opt-sel');
      }
      if (btn.dataset.mnColor) {
        document.getElementById('mnColor').value = btn.dataset.mnColor;
        body.querySelectorAll('.mn-swatch').forEach(function(b) { b.classList.remove('mn-swatch-sel'); });
        btn.classList.add('mn-swatch-sel');
      }
      if (btn.dataset.mnStyle) {
        document.getElementById('mnStyle').value = btn.dataset.mnStyle;
        body.querySelectorAll('.mn-style-btn').forEach(function(b) { b.classList.remove('mn-opt-sel'); });
        btn.classList.add('mn-opt-sel');
      }
    });
  })();

  function saveMapNode() {
    if (!_editingMapNode) return;
    var nodes = TDE_DATA.worldMap && TDE_DATA.worldMap.nodes;
    if (!nodes || !nodes[_editingMapNode]) return;

    nodes[_editingMapNode].size = document.getElementById('mnSize').value;
    nodes[_editingMapNode].color = document.getElementById('mnColor').value;
    nodes[_editingMapNode].style = document.getElementById('mnStyle').value;
    var sub = document.getElementById('mnSublabel').value.trim();
    if (sub) { nodes[_editingMapNode].sublabel = sub; }
    else { delete nodes[_editingMapNode].sublabel; }

    saveData(); showSaved();
    closeMapNodeModal();
    renderWorldMap();
  }

  function closeMapNodeModal() {
    document.getElementById('mapNodeModal').classList.remove('open');
    document.body.style.overflow = '';
    _editingMapNode = null;
  }

  window._editMapNode = editMapNode;
  window._saveMapNode = saveMapNode;
  window._closeMapNodeModal = closeMapNodeModal;

  // --- 节点拖拽 ---
  function startDragNode(e, name) {
    if (!editMode || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    var nodes = TDE_DATA.worldMap && TDE_DATA.worldMap.nodes;
    if (!nodes || !nodes[name]) return;
    cancelMapConnection();

    var svg = document.querySelector('#worldMap svg');
    if (!svg) return;
    var rect = svg.getBoundingClientRect();
    var nodeEl = document.querySelector('.map-node[data-node-name="' + CSS.escape(name) + '"]');
    if (!nodeEl) return;

    _dragNode = {
      name: name,
      origX: nodes[name].x,
      origY: nodes[name].y,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      scaleX: 800 / rect.width,
      scaleY: 500 / rect.height,
      nodeEl: nodeEl,
      moved: false
    };
    _dragMouse = { clientX: e.clientX, clientY: e.clientY };
    document.body.style.cursor = 'grabbing';
    document.body.classList.add('dragging-map-node');
  }

  function onDragMove(e) {
    if (!_dragNode) return;
    _dragMouse = { clientX: e.clientX, clientY: e.clientY };
    if (_dragRAF) return;
    _dragRAF = requestAnimationFrame(function() {
      _dragRAF = null;
      if (!_dragNode || !_dragMouse) return;
      var nodes = TDE_DATA.worldMap && TDE_DATA.worldMap.nodes;
      if (!nodes || !nodes[_dragNode.name]) return;

      var svgDx = (_dragMouse.clientX - _dragNode.startScreenX) * _dragNode.scaleX;
      var svgDy = (_dragMouse.clientY - _dragNode.startScreenY) * _dragNode.scaleY;

      var GRID = 20;
      var newX = Math.max(20, Math.min(780, Math.round((_dragNode.origX + svgDx) / GRID) * GRID));
      var newY = Math.max(20, Math.min(480, Math.round((_dragNode.origY + svgDy) / GRID) * GRID));
      if (newX === _dragNode.origX && newY === _dragNode.origY && !_dragNode.moved) return;

      _dragNode.moved = true;
      _dragNode.nodeEl.setAttribute('transform', 'translate(' + (newX - _dragNode.origX) + ',' + (newY - _dragNode.origY) + ')');
    });
  }

  function onDragEnd(e) {
    if (!_dragNode) return;
    var name = _dragNode.name;
    var didMove = _dragNode.moved;
    if (_dragRAF) { cancelAnimationFrame(_dragRAF); _dragRAF = null; }
    _dragMouse = null;

    if (didMove && typeof e.clientX === 'number') {
      var nodes = TDE_DATA.worldMap && TDE_DATA.worldMap.nodes;
      if (nodes && nodes[name]) {
        var svgDx = (e.clientX - _dragNode.startScreenX) * _dragNode.scaleX;
        var svgDy = (e.clientY - _dragNode.startScreenY) * _dragNode.scaleY;
        var GRID = 20;
        nodes[name].x = Math.max(20, Math.min(780, Math.round((_dragNode.origX + svgDx) / GRID) * GRID));
        nodes[name].y = Math.max(20, Math.min(480, Math.round((_dragNode.origY + svgDy) / GRID) * GRID));
      }
      _dragNode.nodeEl.removeAttribute('transform');
      _dragNode = null;
      document.body.style.cursor = '';
      document.body.classList.remove('dragging-map-node');
      renderWorldMap();
      saveData();
      showSaved();
    } else {
      if (_dragNode.nodeEl) _dragNode.nodeEl.removeAttribute('transform');
      _dragNode = null;
      document.body.style.cursor = '';
      document.body.classList.remove('dragging-map-node');
      if (!editMode || _mapConnSource) {
        mapClickRegion(name);
      }
    }
  }

  // 编辑模式——删除地图连接
  function deleteMapConnection(fromName, toName) {
    if (!editMode) return;
    if (!confirm('确定删除连接：' + fromName + ' ↔ ' + toName + '？')) return;
    var regions = TDE_DATA.regions || [];
    regions.forEach(function(r) {
      if (r.name === fromName && r.connections) {
        r.connections = r.connections.filter(function(c) { return c.replace(/（[^）]*）/, '').trim() !== toName; });
      }
      if (r.name === toName && r.connections) {
        r.connections = r.connections.filter(function(c) { return c.replace(/（[^）]*）/, '').trim() !== fromName; });
      }
    });
    saveData();
    renderWorldMap();
    renderRegions();
    showSaved();
  }

  // 编辑模式——地图连接状态（模块级变量）
  var _mapConnSource = null;

  // 编辑模式——开始添加连接（第一步：选来源节点）
  function startMapConnection(fromName) {
    _mapConnSource = fromName;
    // 高亮所有可连接的目标节点
    var nodes = (TDE_DATA.worldMap && TDE_DATA.worldMap.nodes) || {};
    var allG = document.querySelectorAll('#worldMap g[onclick]');
    allG.forEach(function(g) {
      g.style.filter = 'brightness(1.5)';
      g.style.cursor = 'crosshair';
      g.title = '点击以连接至 ' + fromName;
    });
    // 移除来源节点的高亮
    showToast('请点击目标区域完成连接，Esc 取消');
  }

  function finishMapConnection(toName) {
    if (!_mapConnSource) return;
    if (_mapConnSource === toName) { cancelMapConnection(); return; }
    var regions = TDE_DATA.regions || [];
    var srcRegion = regions.find(function(r) { return r.name === _mapConnSource; });
    var tgtRegion = regions.find(function(r) { return r.name === toName; });
    if (srcRegion) {
      if (!srcRegion.connections) srcRegion.connections = [];
      if (!srcRegion.connections.some(function(c) { return c.replace(/（[^）]*）/, '').trim() === toName; })) {
        srcRegion.connections.push(toName);
      }
    }
    if (tgtRegion) {
      if (!tgtRegion.connections) tgtRegion.connections = [];
      if (!tgtRegion.connections.some(function(c) { return c.replace(/（[^）]*）/, '').trim() === _mapConnSource; })) {
        tgtRegion.connections.push(_mapConnSource);
      }
    }
    saveData();
    renderWorldMap();
    renderRegions();
    showSaved();
    cancelMapConnection();
  }

  function cancelMapConnection() {
    _mapConnSource = null;
    var allG = document.querySelectorAll('#worldMap g[onclick]');
    allG.forEach(function(g) {
      g.style.filter = '';
      g.style.cursor = 'pointer';
      g.title = '查看区域详情';
    });
    document.body.style.cursor = '';
  }

  function mapClickRegion(name) {
    if (_mapConnSource) {
      finishMapConnection(name);
    } else {
      var region = (TDE_DATA.regions || []).find(function(r) { return r.name === name; });
      if (region) {
        Router.navigate('region/' + region.id);
      } else {
        Router.navigate('world');
      }
    }
  }

  window._mapClickRegion = mapClickRegion;

  function renderRegions() {
    document.getElementById('regionGrid').innerHTML = TDE_DATA.regions.map((r, i) => `
      <div class="region-card" ${editCard(`regions.${i}`)} onclick="if(!document.body.classList.contains('edit-mode'))window.location.hash='region/${r.id}'">
        ${renderCardDelete(`regions.${i}`)}
        <div class="region-card-header">
          <span class="region-name" ${edit(`regions.${i}.name`)}>${r.name}</span>
          <span class="region-level" ${edit(`regions.${i}.level`)}>${r.level}</span>
        </div>
        <div class="region-desc" ${edit(`regions.${i}.desc`)}>${r.desc}</div>
        <div class="region-tags" ${arrayContainer(`regions.${i}.tags`)}>
          ${r.tags.map((t, j) => `<span class="region-tag" ${arrayItem(j)}><span ${edit(`regions.${i}.tags.${j}`)}>${t}</span>${renderArrayItemControls(j)}</span>`).join('')}
          ${`<button class="inline-add-btn" style="margin-left:6px;" onclick="event.stopPropagation();window._addItem(this)">+ 添加标签</button>`}
        </div>
        <div class="region-bosses">Boss：<span ${edit(`regions.${i}.bosses.0`)}>${r.bosses.join('、')}</span></div>
        <div style="margin-top:6px;font-size:0.72rem;color:var(--text-muted);">连接区域：</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;" ${arrayContainer(`regions.${i}.connections`)}>
          ${r.connections.map((conn, j) => `
            <span class="region-tag" style="border-color:rgba(0,191,165,0.3);" ${arrayItem(j)}>
              <span ${edit(`regions.${i}.connections.${j}`)}>${conn}</span>
              ${renderArrayItemControls(j)}
            </span>
          `).join('')}
          ${`<button class="inline-add-btn" style="margin-left:4px;" onclick="event.stopPropagation();window._addItem(this)">+ 添加连接</button>`}
        </div>
      </div>
    `).join('') + renderArrayControls('regions');
  }

  // --- 区域详情页辅助函数 ---
  function saveRegionInline(regionId) {
    var idx = TDE_DATA.regions.findIndex(function(r) { return r.id === regionId; });
    if (idx === -1) return;
    var r = TDE_DATA.regions[idx];

    // 简单字段
    var nameEl = document.querySelector('#page-region-detail [data-rd-field="name"]');
    var levelEl = document.querySelector('#page-region-detail [data-rd-field="level"]');
    var descEl = document.querySelector('#page-region-detail [data-rd-field="desc"]');
    if (nameEl) r.name = nameEl.value;
    if (levelEl) r.level = levelEl.value;
    if (descEl) r.desc = descEl.value;

    // 标签 (从 .rd-tag-edit-item 内的 input 读取)
    var tagInputs = document.querySelectorAll('#page-region-detail [data-rd-tag]');
    r.tags = Array.from(tagInputs).map(function(inp) { return inp.value.trim(); }).filter(Boolean);

    // 地标
    var lmCards = document.querySelectorAll('#page-region-detail [data-rd-landmark]');
    r.landmarks = Array.from(lmCards).map(function(card) {
      var nameInp = card.querySelector('[data-rd-lm-name]');
      var descInp = card.querySelector('[data-rd-lm-desc]');
      return { name: nameInp ? nameInp.value.trim() : '', desc: descInp ? descInp.value.trim() : '' };
    }).filter(function(lm) { return lm.name || lm.desc; });

    // 路线节点图 — 由 saveRouteGraphData 从 DOM 读取并写回 r.route

    saveData();
  }

  function addRegionTag(regionId) {
    var container = document.querySelector('#page-region-detail .rd-tags-editor');
    if (!container) return;
    var addBtn = container.querySelector('.rd-add-btn');
    var j = container.querySelectorAll('[data-rd-tag]').length;
    var tagHTML = '<span class="rd-tag-edit-item"><input class="rd-inline-input rd-tag-input" data-rd-tag="' + j + '" data-rd-region="' + regionId + '" value="" placeholder="新标签"><button class="rd-tag-remove" title="删除标签" onclick="var p=this.parentElement;p.remove();window._saveRegionInline(\'' + regionId + '\')">&times;</button></span>';
    if (addBtn) {
      addBtn.insertAdjacentHTML('beforebegin', tagHTML);
    } else {
      container.insertAdjacentHTML('beforeend', tagHTML);
    }
    var newInput = container.querySelector('[data-rd-tag="' + j + '"]');
    if (newInput) newInput.focus();
  }

  function addRegionLandmark(regionId, color) {
    var grid = document.querySelector('#page-region-detail .rd-landmark-list');
    if (!grid) return;
    var addBtn = grid.querySelector('.rd-lm-add-btn');
    var j = grid.querySelectorAll('[data-rd-landmark]').length;
    var lmHTML = '<div class="rd-landmark-card rd-landmark-edit" data-rd-landmark="' + j + '">'
      + '<div class="rd-lm-badge" style="background:' + color + '33;border-color:' + color + '66;"><input class="rd-inline-input rd-lm-name-input" data-rd-lm-name data-rd-region="' + regionId + '" value="" placeholder="地标名称"></div>'
      + '<textarea class="rd-inline-textarea rd-lm-desc-input" data-rd-lm-desc data-rd-region="' + regionId + '" placeholder="地标描述"></textarea>'
      + '<button class="rd-card-remove-btn" title="删除此地标" onclick="this.parentElement.remove();window._saveRegionInline(\'' + regionId + '\')">&times;</button>'
      + '</div>';
    if (addBtn) {
      addBtn.insertAdjacentHTML('beforebegin', lmHTML);
    } else {
      grid.insertAdjacentHTML('beforeend', lmHTML);
    }
    var newCard = grid.querySelector('[data-rd-landmark="' + j + '"]');
    var firstInput = newCard ? newCard.querySelector('input') : null;
    if (firstInput) firstInput.focus();
  }
  // ============================================================
  // 路线节点图 (SVG 可缩放交互图)
  // ============================================================
  var _rgStates = {}; // { panX, panY, zoom, dragging, dragStartX, dragStartY, startPanX, startPanY, dragNodeId, connSource, lastTap, lastTapNodeId }

  function getRouteData(regionId) {
    var region = TDE_DATA.regions.find(function(r) { return r.id === regionId; });
    if (!region) return { nodes: [], edges: [] };
    // 迁移旧格式
    if (Array.isArray(region.route)) {
      var migrated = [].concat(region.route);
      for (var m = 0; m < migrated.length; m++) {
        if (!migrated[m].x) { migrated[m].x = 100 + m * 160; migrated[m].y = 250; }
      }
      region.route = { nodes: migrated, edges: [] };
    }
    var route = region.route || { nodes: [], edges: [] };
    if (!route.nodes) route.nodes = [];
    if (!route.edges) route.edges = [];
    return route;
  }

  function saveRouteGraphData(regionId) {
    var region = TDE_DATA.regions.find(function(r) { return r.id === regionId; });
    if (!region) return;
    var container = document.getElementById('rgContainer-' + regionId);
    if (!container) return;
    var nodes = container.querySelectorAll('.rg-node-card');
    var nodeData = [];
    var nodeIdToIdx = {};
    Array.from(nodes).forEach(function(card, i) {
      var nid = card.getAttribute('data-node-id');
      var fo = card.closest('foreignObject') || card.parentNode;
      var x = 0, y = 0;
      if (fo) {
        var sw = parseFloat(fo.getAttribute('data-nw')) || 130;
        var sh = parseFloat(fo.getAttribute('data-nh')) || 90;
        x = snapToGrid(parseFloat(fo.getAttribute('x')) + sw / 2);
        y = snapToGrid(parseFloat(fo.getAttribute('y')) + sh / 2);
      }
      var nameEl = card.querySelector('.rg-node-name');
      var descEl = card.querySelector('.rg-node-desc');
      nodeData.push({
        id: nid,
        name: nameEl ? nameEl.textContent : '',
        desc: descEl ? descEl.textContent : '',
        x: Math.round(x),
        y: Math.round(y)
      });
      nodeIdToIdx[nid] = i;
    });
    var edgeLines = container.querySelectorAll('.rg-edge-line');
    var edgeData = [];
    var edgeSet = {};
    Array.from(edgeLines).forEach(function(line) {
      var from = line.getAttribute('data-from');
      var to = line.getAttribute('data-to');
      var key = from + '|' + to;
      if (edgeSet[key]) return;
      edgeSet[key] = true;
      var labelEl = container.querySelector('.rg-edge-label[data-from="' + from + '"][data-to="' + to + '"]');
      edgeData.push({ from: from, to: to, label: labelEl ? labelEl.textContent : '' });
    });
    if (nodeData.length > 0) {
      region.route = { nodes: nodeData, edges: edgeData };
      console.log('[rg] saveRouteGraphData', regionId, 'nodes:', nodeData.map(function(n) { return n.id + '@' + n.x + ',' + n.y; }).join(' '));
    } else {
      console.log('[rg] saveRouteGraphData SKIPPED (no nodes found in DOM)');
    }
    saveData();
  }

  var RG_GRID = 20; // 网格间距

  function snapToGrid(v) { return Math.round(v / RG_GRID) * RG_GRID; }

  function calcNodeSize(name, desc) {
    var nl = (name || '').length, dl = (desc || '').length;
    var maxLine = Math.max(nl, Math.ceil(dl / 2.5));
    var w = 130;
    if (maxLine > 8) w = Math.min(180, 130 + Math.floor((maxLine - 8) * 5));
    w = Math.max(130, Math.min(180, w));
    if (!dl) {
      return { w: w, h: 54, lines: 0 }; // 仅标题：徽章+名称+紧凑内边距
    }
    var lines = Math.max(2, Math.ceil(dl / 14));
    var h = 54 + lines * 17;
    h = Math.min(156, Math.max(54, h));
    return { w: w, h: h, lines: lines };
  }

  function renderRouteGraph(containerId, regionId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var route = getRouteData(regionId);
    console.log('[rg] renderRouteGraph', regionId, 'nodes:', route.nodes.map(function(n) { return n.id + '@' + n.x + ',' + n.y; }).join(' '));
    if (!_rgStates[regionId]) {
      _rgStates[regionId] = { panX: 0, panY: 0, zoom: 1, dragging: false, dragNodeId: null, connSource: null, lastTap: 0, lastTapNodeId: null };
    }
    var st = _rgStates[regionId];
    var vbW = 800, vbH = 500;
    // 预计算每个节点的尺寸
    var nodeSizes = {};
    route.nodes.forEach(function(node) {
      nodeSizes[node.id] = calcNodeSize(node.name, node.desc);
    });
    var svgHTML = '';
    svgHTML += '<svg viewBox="0 0 ' + vbW + ' ' + vbH + '">';
    svgHTML += '<defs><pattern id="rgGrid-' + regionId + '" width="30" height="30" patternUnits="userSpaceOnUse">';
    svgHTML += '<path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/></pattern></defs>';
    svgHTML += '<rect class="rg-bg" width="100%" height="100%" fill="url(#rgGrid-' + regionId + ')"/>';
    svgHTML += '<g class="rg-transform" transform="translate(' + st.panX + ',' + st.panY + ') scale(' + st.zoom + ')">';
    // 连线层
    svgHTML += '<g class="rg-edges">';
    route.edges.forEach(function(edge) {
      var fn = route.nodes.find(function(n) { return n.id === edge.from; });
      var tn = route.nodes.find(function(n) { return n.id === edge.to; });
      if (!fn || !tn) return;
      var x1 = fn.x, y1 = fn.y, x2 = tn.x, y2 = tn.y;
      svgHTML += '<line class="rg-edge-line" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" data-from="' + edge.from + '" data-to="' + edge.to + '"/>';
      svgHTML += '<line class="rg-edge-hit" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" data-from="' + edge.from + '" data-to="' + edge.to + '"/>';
      if (edge.label) {
        var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        svgHTML += '<rect class="rg-edge-label-bg" x="' + (mx - edge.label.length * 3.5 - 4) + '" y="' + (my - 8) + '" width="' + (edge.label.length * 7 + 8) + '" height="16" rx="2"/>';
        svgHTML += '<text class="rg-edge-label" x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle" data-from="' + edge.from + '" data-to="' + edge.to + '">' + escAttr(edge.label) + '</text>';
      }
    });
    svgHTML += '</g>';
    // 节点层
    svgHTML += '<g class="rg-nodes">';
    route.nodes.forEach(function(node, idx) {
      var x = node.x || (100 + idx * 160);
      var y = node.y || 250;
      var sz = nodeSizes[node.id];
      var foX = x - sz.w / 2, foY = y - sz.h / 2;
      svgHTML += '<foreignObject x="' + foX + '" y="' + foY + '" width="' + sz.w + '" height="' + sz.h + '" data-nw="' + sz.w + '" data-nh="' + sz.h + '">';
      svgHTML += '<div xmlns="http://www.w3.org/1999/xhtml" class="rg-node-card" data-node-id="' + node.id + '" style="width:' + sz.w + 'px;height:' + sz.h + 'px;">';
      svgHTML += '<span class="rg-node-badge">' + (idx + 1) + '</span>';
      svgHTML += '<div class="rg-node-name">' + escAttr(node.name || '') + '</div>';
      svgHTML += '<div class="rg-node-desc">' + escAttr(node.desc || '') + '</div>';
      svgHTML += '<div class="rg-node-controls">';
      svgHTML += '<button class="rg-node-conn-btn" data-action="connect" data-node-id="' + node.id + '">+</button>';
      svgHTML += '<button class="rg-node-del-btn" data-action="delete" data-node-id="' + node.id + '">&times;</button>';
      svgHTML += '</div>';
      svgHTML += '</div></foreignObject>';
    });
    svgHTML += '</g></g></svg>';
    // 缩放控件
    svgHTML += '<div class="rg-zoom-ctrl">';
    svgHTML += '<button class="rg-zoom-btn" data-zoom="out">−</button>';
    svgHTML += '<span class="rg-zoom-pct">' + Math.round(st.zoom * 100) + '%</span>';
    svgHTML += '<button class="rg-zoom-btn" data-zoom="in">+</button>';
    svgHTML += '<button class="rg-zoom-btn" data-zoom="reset">⟲</button>';
    svgHTML += '</div>';
    // 添加节点 (编辑模式)
    if (editMode) {
      svgHTML += '<button class="rg-add-node-btn" data-action="add-node">+ 添加节点</button>';
    }
    // 连线模式提示
    svgHTML += '<div class="rg-conn-toast" style="display:none;">连线模式：点击目标节点完成连线，按 Esc / 点击空白取消</div>';
    container.innerHTML = svgHTML;
    initRouteGraphEvents(container, regionId);
  }

  function initRouteGraphEvents(container, regionId) {
    var st = _rgStates[regionId];
    if (!st) return;
    // 清理旧的事件监听器
    var cl = container._rgCleanup;
    if (cl) {
      window.removeEventListener('mousemove', cl.mousemove);
      window.removeEventListener('mouseup', cl.mouseup);
      document.removeEventListener('keydown', cl.keydown);
      if (cl.wheel) container.removeEventListener('wheel', cl.wheel);
      if (cl.dblclick) container.removeEventListener('dblclick', cl.dblclick);
      if (cl.click) container.removeEventListener('click', cl.click);
    }
    container._rgCleanup = { mousemove: null, mouseup: null, keydown: null, wheel: null, dblclick: null, click: null };
    var svgEl = container.querySelector('svg');
    if (!svgEl) return;

    function getNodeSize(fo) {
      var w = parseFloat(fo.getAttribute('data-nw')) || 130;
      var h = parseFloat(fo.getAttribute('data-nh')) || 90;
      return { w: w, h: h };
    }

    function getNodeEl(target) {
      if (!target) return null;
      return target.closest ? (target.closest('.rg-node-card') || null) : null;
    }

    function updateTransform() {
      var tg = svgEl.querySelector('.rg-transform');
      if (tg) tg.setAttribute('transform', 'translate(' + st.panX + ',' + st.panY + ') scale(' + st.zoom + ')');
      var pct = container.querySelector('.rg-zoom-pct');
      if (pct) pct.textContent = Math.round(st.zoom * 100) + '%';
    }

    function updateNodeEdges(nodeId, foreignObject) {
      var foEl = foreignObject;
      if (!foEl) {
        var cardEl = svgEl.querySelector('.rg-node-card[data-node-id="' + nodeId + '"]');
        if (!cardEl) return;
        foEl = cardEl.parentNode;
        if (!foEl || foEl.nodeName.toLowerCase() !== 'foreignobject') return;
      }
      var sz = getNodeSize(foEl);
      var cx = parseFloat(foEl.getAttribute('x')) + sz.w / 2;
      var cy = parseFloat(foEl.getAttribute('y')) + sz.h / 2;
      var lines = svgEl.querySelectorAll('.rg-edge-line[data-from="' + nodeId + '"], .rg-edge-line[data-to="' + nodeId + '"]');
      var hits = svgEl.querySelectorAll('.rg-edge-hit[data-from="' + nodeId + '"], .rg-edge-hit[data-to="' + nodeId + '"]');
      var labels = svgEl.querySelectorAll('.rg-edge-label[data-from="' + nodeId + '"], .rg-edge-label[data-to="' + nodeId + '"]');
      for (var li = 0; li < lines.length; li++) {
        var line = lines[li];
        if (line.getAttribute('data-from') === nodeId) { line.setAttribute('x1', cx); line.setAttribute('y1', cy); }
        else { line.setAttribute('x2', cx); line.setAttribute('y2', cy); }
      }
      for (var hi = 0; hi < hits.length; hi++) {
        var hit = hits[hi];
        if (hit.getAttribute('data-from') === nodeId) { hit.setAttribute('x1', cx); hit.setAttribute('y1', cy); }
        else { hit.setAttribute('x2', cx); hit.setAttribute('y2', cy); }
      }
      for (var li2 = 0; li2 < labels.length; li2++) {
        var lbl = labels[li2];
        var fromId = lbl.getAttribute('data-from');
        var toId = lbl.getAttribute('data-to');
        var lineEl = svgEl.querySelector('.rg-edge-line[data-from="' + fromId + '"][data-to="' + toId + '"]');
        if (!lineEl) continue;
        var mx = (parseFloat(lineEl.getAttribute('x1')) + parseFloat(lineEl.getAttribute('x2'))) / 2;
        var my = (parseFloat(lineEl.getAttribute('y1')) + parseFloat(lineEl.getAttribute('y2'))) / 2;
        lbl.setAttribute('x', mx);
        lbl.setAttribute('y', my + 4);
        var bg = lbl.previousElementSibling;
        if (bg && bg.classList.contains('rg-edge-label-bg')) {
          var len = lbl.textContent.length;
          bg.setAttribute('x', mx - len * 3.5 - 4);
          bg.setAttribute('y', my - 8);
          bg.setAttribute('width', len * 7 + 8);
        }
      }
    }

    function showConnToast() {
      var toast = container.querySelector('.rg-conn-toast');
      if (toast) toast.style.display = 'block';
    }
    function hideConnToast() {
      var toast = container.querySelector('.rg-conn-toast');
      if (toast) toast.style.display = 'none';
      st.connSource = null;
    }

    // --- Wheel (zoom) ---
    container._rgCleanup.wheel = function(e) {
      e.preventDefault();
      var rect = svgEl.getBoundingClientRect();
      var mx = e.clientX - rect.left, my = e.clientY - rect.top;
      var newZoom = st.zoom * (e.deltaY > 0 ? 0.9 : 1.1);
      newZoom = Math.max(0.3, Math.min(2.0, newZoom));
      st.panX = mx - ((mx - st.panX) / st.zoom) * newZoom;
      st.panY = my - ((my - st.panY) / st.zoom) * newZoom;
      st.zoom = newZoom;
      updateTransform();
    };
    container.addEventListener('wheel', container._rgCleanup.wheel, { passive: false });

    // --- Mousedown on SVG (pan / node drag / connection) ---
    svgEl.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      var nodeEl = getNodeEl(e.target);
      if (nodeEl && (e.target.closest('.rg-node-conn-btn') || e.target.closest('.rg-node-del-btn'))) return;
      if (e.target.closest('.rg-zoom-btn') || e.target.closest('.rg-add-node-btn')) return;
      // 连线模式下点击空白取消
      if (st.connSource && !nodeEl) { hideConnToast(); return; }
      // 连线模式下点击目标节点
      if (st.connSource && nodeEl) {
        var targetId = nodeEl.getAttribute('data-node-id');
        if (targetId && targetId !== st.connSource) {
          finishRouteConnection(regionId, st.connSource, targetId);
        }
        hideConnToast();
        return;
      }

      st.dragging = true;
      st.dragStartX = e.clientX;
      st.dragStartY = e.clientY;
      if (nodeEl && editMode) {
        st.dragNodeId = nodeEl.getAttribute('data-node-id');
        container.style.cursor = 'grabbing';
      } else {
        st.dragNodeId = null;
        st.startPanX = st.panX;
        st.startPanY = st.panY;
        container.classList.add('grabbing');
      }
      e.stopPropagation();
    });

    // --- Mousemove (pan / node drag) ---
    container._rgCleanup.mousemove = function(e) {
      if (!st.dragging) return;
      var dx = e.clientX - st.dragStartX;
      var dy = e.clientY - st.dragStartY;
      if (st.dragNodeId) {
        var sdX = dx / st.zoom, sdY = dy / st.zoom;
        var fo = svgEl.querySelector('.rg-node-card[data-node-id="' + st.dragNodeId + '"]');
        if (!fo) return;
        fo = fo.closest('foreignObject');
        if (!fo) return;
        if (st._startFOX === undefined) {
          st._startFOX = parseFloat(fo.getAttribute('x'));
          st._startFOY = parseFloat(fo.getAttribute('y'));
        }
        var fsz = getNodeSize(fo);
        var cx = st._startFOX + fsz.w / 2 + sdX;
        var cy = st._startFOY + fsz.h / 2 + sdY;
        var nX = snapToGrid(cx) - fsz.w / 2;
        var nY = snapToGrid(cy) - fsz.h / 2;
        nX = Math.max(-fsz.w / 2, Math.min(800 - fsz.w / 2, nX));
        nY = Math.max(-fsz.h / 2, Math.min(500 - fsz.h / 2, nY));
        fo.setAttribute('x', nX);
        fo.setAttribute('y', nY);
        updateNodeEdges(st.dragNodeId, fo);
      } else {
        st.panX = st.startPanX + dx;
        st.panY = st.startPanY + dy;
        updateTransform();
      }
    };
    window.addEventListener('mousemove', container._rgCleanup.mousemove);

    // --- Mouseup (end pan / node drag) ---
    container._rgCleanup.mouseup = function(e) {
      if (!st.dragging) return;
      var dx = Math.abs(e.clientX - st.dragStartX);
      var dy = Math.abs(e.clientY - st.dragStartY);
      var wasDrag = dx > 3 || dy > 3;
      if (st.dragNodeId) {
        delete st._startFOX;
        delete st._startFOY;
        if (wasDrag) { saveRouteGraphData(regionId); updateBadges(svgEl); }
      }
      st.dragging = false;
      st.dragNodeId = null;
      container.style.cursor = '';
      container.classList.remove('grabbing');
    };
    window.addEventListener('mouseup', container._rgCleanup.mouseup);

    // --- Double-click (edit node / edit edge label) ---
    container._rgCleanup.dblclick = function(e) {
      if (!editMode) return;
      // 编辑连线标签
      if (e.target.classList.contains('rg-edge-label')) {
        var from = e.target.getAttribute('data-from');
        var to = e.target.getAttribute('data-to');
        showEdgeLabelModal(regionId, from, to, e.target.textContent);
        return;
      }
      // 也支持点击标签背景
      if (e.target.classList.contains('rg-edge-label-bg')) {
        var nextSib = e.target.nextElementSibling;
        if (nextSib && nextSib.classList.contains('rg-edge-label')) {
          var from2 = nextSib.getAttribute('data-from');
          var to2 = nextSib.getAttribute('data-to');
          showEdgeLabelModal(regionId, from2, to2, nextSib.textContent);
        }
        return;
      }
      // 编辑节点
      var nodeEl = getNodeEl(e.target);
      if (nodeEl) {
        var nid = nodeEl.getAttribute('data-node-id');
        var nameEl2 = nodeEl.querySelector('.rg-node-name');
        var descEl2 = nodeEl.querySelector('.rg-node-desc');
        showNodeEditModal(regionId, nid, nameEl2 ? nameEl2.textContent : '', descEl2 ? descEl2.textContent : '');
        return;
      }
    };
    container.addEventListener('dblclick', container._rgCleanup.dblclick);

    // --- Click (按钮 / 连线 / 连线标签编辑) ---
    container._rgCleanup.click = function(e) {
      // 缩放按钮
      var zoomBtn = e.target.closest('.rg-zoom-btn');
      if (zoomBtn) {
        var action = zoomBtn.getAttribute('data-zoom');
        var rect = svgEl.getBoundingClientRect();
        var cx = rect.width / 2, cy = rect.height / 2;
        if (action === 'in') {
          var nz = Math.min(2.0, st.zoom * 1.2);
          st.panX = cx - ((cx - st.panX) / st.zoom) * nz;
          st.panY = cy - ((cy - st.panY) / st.zoom) * nz;
          st.zoom = nz;
        } else if (action === 'out') {
          var nz2 = Math.max(0.3, st.zoom / 1.2);
          st.panX = cx - ((cx - st.panX) / st.zoom) * nz2;
          st.panY = cy - ((cy - st.panY) / st.zoom) * nz2;
          st.zoom = nz2;
        } else {
          st.zoom = 1; st.panX = 0; st.panY = 0;
        }
        updateTransform();
        return;
      }
      // 添加节点
      if (e.target.closest('.rg-add-node-btn')) {
        addRouteGraphNode(container, regionId);
        return;
      }
      // 连接按钮
      var connBtn = e.target.closest('.rg-node-conn-btn');
      if (connBtn && editMode) {
        st.connSource = connBtn.getAttribute('data-node-id');
        showConnToast();
        return;
      }
      // 删除按钮
      var delBtn = e.target.closest('.rg-node-del-btn');
      if (delBtn && editMode) {
        deleteRouteGraphNode(container, regionId, delBtn.getAttribute('data-node-id'));
        return;
      }
      // 编辑模式下点击连线标签 → 编辑
      if (editMode && e.target.classList.contains('rg-edge-label')) {
        var f = e.target.getAttribute('data-from');
        var t = e.target.getAttribute('data-to');
        showEdgeLabelModal(regionId, f, t, e.target.textContent);
        return;
      }
      // 编辑模式下点击连线 → 删除
      if (editMode && e.target.classList.contains('rg-edge-hit')) {
        var ef = e.target.getAttribute('data-from');
        var et = e.target.getAttribute('data-to');
        deleteRouteEdge(container, regionId, ef, et);
        return;
      }
    };
    container.addEventListener('click', container._rgCleanup.click);

    // --- Keydown (Esc to cancel connection) ---
    container._rgCleanup.keydown = function(e) {
      if (e.key === 'Escape' && st.connSource) { hideConnToast(); }
    };
    document.addEventListener('keydown', container._rgCleanup.keydown);
  }

  function updateBadges(svgEl) {
    var cards = svgEl.querySelectorAll('.rg-node-card');
    for (var i = 0; i < cards.length; i++) {
      var badge = cards[i].querySelector('.rg-node-badge');
      if (badge) badge.textContent = i + 1;
    }
  }

  function addRouteGraphNode(container, regionId) {
    var st = _rgStates[regionId];
    var svgEl = container.querySelector('svg');
    if (!svgEl) return;
    // 在视口中心创建
    var rect = svgEl.getBoundingClientRect();
    var vbW = 800, vbH = 500;
    var svgRectW = rect.width, svgRectH = rect.height;
    var scaleX = vbW / svgRectW, scaleY = vbH / svgRectH;
    var viewCenterX = (svgRectW / 2 - st.panX) / st.zoom * scaleX;
    var viewCenterY = (svgRectH / 2 - st.panY) / st.zoom * scaleY;
    // 添加一些随机偏移
    var cx = snapToGrid(Math.round(viewCenterX + (Math.random() - 0.5) * 100));
    var cy = snapToGrid(Math.round(viewCenterY + (Math.random() - 0.5) * 100));
    cx = Math.max(65, Math.min(vbW - 65, cx));
    cy = Math.max(45, Math.min(vbH - 45, cy));
    var nodeId = 'rn-' + Date.now();
    var route = getRouteData(regionId);
    saveRouteGraphData(regionId);
    route.nodes.push({ id: nodeId, name: '', desc: '', x: cx, y: cy });
    saveData();
    renderRouteGraph('rgContainer-' + regionId, regionId);
  }

  function deleteRouteGraphNode(container, regionId, nodeId) {
    var route = getRouteData(regionId);
    saveRouteGraphData(regionId);
    route.nodes = route.nodes.filter(function(n) { return n.id !== nodeId; });
    route.edges = route.edges.filter(function(e) { return e.from !== nodeId && e.to !== nodeId; });
    saveData();
    renderRouteGraph('rgContainer-' + regionId, regionId);
  }

  function finishRouteConnection(regionId, fromId, toId) {
    var route = getRouteData(regionId);
    var exists = route.edges.some(function(e) { return e.from === fromId && e.to === toId; });
    if (!exists) {
      saveRouteGraphData(regionId);
      route.edges.push({ from: fromId, to: toId, label: '' });
      saveData();
      renderRouteGraph('rgContainer-' + regionId, regionId);
    }
  }

  function closeEditModal() {
    var ov = document.querySelector('.rg-edit-modal-overlay');
    if (ov) ov.remove();
  }

  function showNodeEditModal(regionId, nodeId, name, desc) {
    closeEditModal();
    saveRouteGraphData(regionId);
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open rg-edit-modal-overlay rg-edit-modal';
    overlay.innerHTML = '<div class="modal-content">'
      + '<button class="modal-close">&times;</button>'
      + '<h3 style="margin:0 0 16px;color:var(--cyan-bright);font-size:1rem;">编辑路线节点</h3>'
      + '<div class="rg-edit-field"><label>节点名称</label><input class="rg-edit-name" value="' + escAttr(name) + '"></div>'
      + '<div class="rg-edit-field"><label>描述</label><textarea class="rg-edit-desc" rows="4">' + escAttr(desc) + '</textarea></div>'
      + '<div class="modal-actions"><button class="btn-cancel">取消</button><button class="btn-save">保存</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    var nameInp = overlay.querySelector('.rg-edit-name');
    var descInp = overlay.querySelector('.rg-edit-desc');
    nameInp.focus();
    nameInp.select();
    function save() {
      var route = getRouteData(regionId);
      var node = route.nodes.find(function(n) { return n.id === nodeId; });
      if (node) {
        node.name = nameInp.value.trim();
        node.desc = descInp.value.trim();
        saveData();
      }
      saveRouteGraphData(regionId);
      closeEditModal();
      renderRouteGraph('rgContainer-' + regionId, regionId);
    }
    overlay.querySelector('.btn-save').addEventListener('click', save);
    overlay.querySelector('.btn-cancel').addEventListener('click', closeEditModal);
    overlay.querySelector('.modal-close').addEventListener('click', closeEditModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditModal(); });
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeEditModal();
      if (e.key === 'Enter' && document.activeElement !== descInp) save();
    });
  }

  function showEdgeLabelModal(regionId, fromId, toId, label) {
    closeEditModal();
    saveRouteGraphData(regionId);
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay open rg-edit-modal-overlay rg-edit-modal';
    overlay.innerHTML = '<div class="modal-content">'
      + '<button class="modal-close">&times;</button>'
      + '<h3 style="margin:0 0 16px;color:var(--cyan-bright);font-size:1rem;">编辑路线标签</h3>'
      + '<div class="rg-edit-field"><label>移动方式（如：步行、攀爬、传送…）</label><input class="rg-edit-label-input" value="' + escAttr(label) + '"></div>'
      + '<div class="modal-actions"><button class="btn-cancel">取消</button><button class="btn-save">保存</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    var inp = overlay.querySelector('.rg-edit-label-input');
    inp.focus();
    inp.select();
    function save() {
      var route = getRouteData(regionId);
      var edge = route.edges.find(function(e) { return e.from === fromId && e.to === toId; });
      if (edge) { edge.label = inp.value.trim(); saveData(); }
      saveRouteGraphData(regionId);
      closeEditModal();
      renderRouteGraph('rgContainer-' + regionId, regionId);
    }
    overlay.querySelector('.btn-save').addEventListener('click', save);
    overlay.querySelector('.btn-cancel').addEventListener('click', closeEditModal);
    overlay.querySelector('.modal-close').addEventListener('click', closeEditModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeEditModal(); });
    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeEditModal();
      if (e.key === 'Enter') save();
    });
  }

  function deleteRouteEdge(container, regionId, fromId, toId) {
    var route = getRouteData(regionId);
    saveRouteGraphData(regionId);
    route.edges = route.edges.filter(function(e) { return !(e.from === fromId && e.to === toId); });
    saveData();
    renderRouteGraph('rgContainer-' + regionId, regionId);
  }

  window._saveRegionInline = saveRegionInline;
  window._addRegionTag = addRegionTag;
  window._addRegionLandmark = addRegionLandmark;

  function openLandmarkModal(name, desc, color) {
    var overlay = document.getElementById('lmModal');
    if (!overlay) return;
    document.getElementById('lmModalBadge').textContent = name;
    document.getElementById('lmModalBadge').style.color = color;
    document.getElementById('lmModalBadge').style.borderColor = color + '66';
    document.getElementById('lmModalBadge').style.background = color + '22';
    document.getElementById('lmModalName').textContent = name;
    document.getElementById('lmModalDesc').innerHTML = '<p>' + (desc || '暂无描述。') + '</p>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLandmarkModal() {
    var overlay = document.getElementById('lmModal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (window._clearLandmarkHighlight) window._clearLandmarkHighlight();
  }
  window._openLandmarkModal = openLandmarkModal;
  window._closeLandmarkModal = closeLandmarkModal;
  window._clearLandmarkFocus = function() {
    if (Router.currentSub) {
      window._clearLandmarkHighlight();
      window.location.hash = '#region/' + Router.currentSub;
    }
  };

  // --- 区域详情页 ---
  var _pendingLandmark = null;  // 待高亮的地标名（模型加载后执行）

  function renderRegionDetail(regionId, focusLandmark) {
    var regions = TDE_DATA.regions || [];
    var idx = regions.findIndex(function(r) { return r.id === regionId; });

    var elTitle = document.getElementById('rdTitle');
    var elSub = document.getElementById('rdSubtitle');
    var elDesc = document.getElementById('rdDesc');
    var elMeta = document.getElementById('rdMeta');
    var elGraphic = document.getElementById('rdGraphic');
    var elSections = document.getElementById('rdSections');
    var elEditBtn = document.getElementById('rdEditBtn');
    var elLmInfo = document.getElementById('rdLandmarkInfo');

    if (!elTitle) return;

    if (idx === -1) {
      elTitle.textContent = '区域未找到';
      elSub.textContent = '';
      elDesc.innerHTML = '<p style="color:var(--text-muted)">该区域不存在或已被删除。</p>';
      elMeta.innerHTML = '';
      elGraphic.innerHTML = '';
      elSections.innerHTML = '';
      if (elEditBtn) elEditBtn.style.display = 'none';
      if (elLmInfo) elLmInfo.style.display = 'none';
      return;
    }

    var r = regions[idx];
    var nodes = (TDE_DATA.worldMap && TDE_DATA.worldMap.nodes) || {};
    var node = nodes[r.name] || {};
    var color = node.color || '#00bfa5';

    // 此页面使用内联编辑，无需侧边面板
    if (elEditBtn) elEditBtn.style.display = 'none';

    // 地标聚焦信息面板
    if (elLmInfo) {
      if (focusLandmark && !editMode) {
        var lm = (r.landmarks || []).find(function(l) { return l.name === focusLandmark; });
        if (lm) {
          elLmInfo.style.display = 'block';
          elLmInfo.innerHTML = '<div class="rd-lm-info-card" style="border-left-color:' + color + ';">'
            + '<div class="rd-lm-info-name" style="color:' + color + ';">' + escAttr(lm.name) + '</div>'
            + '<div class="rd-lm-info-desc">' + (lm.desc || '暂无描述。') + '</div>'
            + '<button class="rd-lm-info-close" onclick="window._clearLandmarkFocus()">关闭聚焦</button>'
            + '</div>';
        }
        _pendingLandmark = focusLandmark;
      } else {
        elLmInfo.style.display = 'none';
        elLmInfo.innerHTML = '';
        _pendingLandmark = null;
      }
    }

    // 装饰圆形 (始终显示)
    elGraphic.innerHTML = '<div class="rd-graphic-inner" style="background:' + color + ';color:' + color + ';"></div>';

    if (editMode) {
      // ========== 编辑模式：内联可编辑 ==========
      elTitle.innerHTML = '<input class="rd-inline-input rd-title-input" data-rd-field="name" data-rd-region="' + regionId + '" value="' + escAttr(r.name || '') + '">';
      elSub.innerHTML = '等级范围：<input class="rd-inline-input rd-level-input" data-rd-field="level" data-rd-region="' + regionId + '" value="' + escAttr(r.level || '') + '" placeholder="未知">';
      elDesc.innerHTML = '<textarea class="rd-inline-textarea" data-rd-field="desc" data-rd-region="' + regionId + '" placeholder="暂无描述。">' + escAttr(r.desc || '') + '</textarea>';

      // 标签编辑器
      var tagsHTML = '<div class="rd-tags-editor">';
      (r.tags || []).forEach(function(t, j) {
        tagsHTML += '<span class="rd-tag-edit-item"><input class="rd-inline-input rd-tag-input" data-rd-tag="' + j + '" data-rd-region="' + regionId + '" value="' + escAttr(t) + '"><button class="rd-tag-remove" title="删除标签" onclick="var p=this.parentElement;p.remove();window._saveRegionInline(\'' + regionId + '\')">&times;</button></span>';
      });
      tagsHTML += '<button class="rd-add-btn" onclick="window._addRegionTag(\'' + regionId + '\')">+ 添加标签</button>';
      tagsHTML += '</div>';
      elMeta.innerHTML = tagsHTML;

      // 地标 (左列, 可编辑) + Boss (右列) 双栏布局
      var sectionsHTML = '';

      sectionsHTML += '<div class="rd-sections-grid">';
      sectionsHTML += '<div class="rd-section">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>区域地标</div>';
      sectionsHTML += '<div class="rd-landmark-list">';
      var landmarks = r.landmarks || [];
      landmarks.forEach(function(lm, j) {
        sectionsHTML += '<div class="rd-landmark-card rd-landmark-edit" data-rd-landmark="' + j + '">'
          + '<div class="rd-lm-badge" style="background:' + color + '33;border-color:' + color + '66;"><input class="rd-inline-input rd-lm-name-input" data-rd-lm-name data-rd-region="' + regionId + '" value="' + escAttr(lm.name || '') + '" placeholder="地标名称"></div>'
          + '<textarea class="rd-inline-textarea rd-lm-desc-input" data-rd-lm-desc data-rd-region="' + regionId + '" placeholder="地标描述">' + escAttr(lm.desc || '') + '</textarea>'
          + '<button class="rd-card-remove-btn" title="删除此地标" onclick="this.parentElement.remove();window._saveRegionInline(\'' + regionId + '\')">&times;</button>'
          + '</div>';
      });
      sectionsHTML += '<button class="rd-lm-add-btn" onclick="window._addRegionLandmark(\'' + regionId + '\',\'' + color + '\')">+ 添加地标</button>';
      sectionsHTML += '</div>';
      sectionsHTML += '</div>';

      // Boss 列表 (只读)
      sectionsHTML += '<div class="rd-section">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>区域Boss</div>';
      var bosses = r.bosses || [];
      var hasBosses = bosses.length > 0 && !(bosses.length === 1 && bosses[0] === '无');
      if (hasBosses) {
        sectionsHTML += '<div class="rd-boss-list">';
        bosses.forEach(function(bossName) {
          var bossData = TDE_DATA.bosses.find(function(b) { return b.name === bossName; });
          if (bossData) {
            sectionsHTML += '<div class="rd-boss-item" onclick="window._showBossDetail(\'' + bossData.id + '\')">';
            sectionsHTML += '<svg viewBox="0 0 24 24" width="14" height="14" style="fill:var(--cyan);flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            sectionsHTML += '<span>' + bossName + '</span>';
            sectionsHTML += '</div>';
          } else {
            sectionsHTML += '<div class="rd-boss-item" style="cursor:default;border-left-color:var(--text-muted)"><span style="color:var(--text-muted)">' + bossName + '</span></div>';
          }
        });
        sectionsHTML += '</div>';
      } else {
        sectionsHTML += '<div style="font-size:0.78rem;color:var(--text-muted);padding:12px 0;">暂无Boss数据</div>';
      }
      sectionsHTML += '</div>';
      sectionsHTML += '</div>'; // .rd-sections-grid

      // 路线预览 (全宽, 可编辑)
      sectionsHTML += '<div class="rd-section rd-section-full">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 3h18v4H3V3zm0 6h12v4H3V9zm0 6h16v4H3v-4z" fill="currentColor"/></svg>路线预览</div>';
      sectionsHTML += '<div id="rgContainer-' + regionId + '" class="rg-container" style="min-height:450px;"></div>';
      sectionsHTML += '</div>';

      // 连接区域 (全宽, 只读)
      sectionsHTML += '<div class="rd-section rd-section-full">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" fill="currentColor"/></svg>连接区域</div>';
      var connections = r.connections || [];
      if (connections.length > 0) {
        sectionsHTML += '<div class="rd-conn-list">';
        connections.forEach(function(conn) {
          var cleanName = conn.replace(/（[^）]*）/, '').trim();
          var targetRegion = regions.find(function(rr) { return rr.name === cleanName; });
          var connNode = nodes[cleanName] || {};
          var connColor = connNode.color || 'rgba(0,191,165,0.5)';
          if (targetRegion) {
            sectionsHTML += '<a class="rd-conn-item" href="#region/' + targetRegion.id + '">';
            sectionsHTML += '<span class="rd-conn-dot" style="background:' + connColor + ';box-shadow:0 0 6px ' + connColor + ';"></span>';
            sectionsHTML += '<span>' + conn + '</span>';
            sectionsHTML += '</a>';
          } else {
            sectionsHTML += '<div class="rd-conn-item">';
            sectionsHTML += '<span class="rd-conn-dot" style="background:' + connColor + ';"></span>';
            sectionsHTML += '<span style="color:var(--text-muted)">' + conn + '</span>';
            sectionsHTML += '</div>';
          }
        });
        sectionsHTML += '</div>';
      } else {
        sectionsHTML += '<div style="font-size:0.78rem;color:var(--text-muted);padding:12px 0;">暂无连接区域</div>';
      }
      sectionsHTML += '</div>';

      elSections.innerHTML = sectionsHTML;
      renderRouteGraph('rgContainer-' + regionId, regionId);
    } else {
      // ========== 查看模式：纯静态展示 ==========
      elTitle.textContent = r.name;
      elSub.textContent = '等级范围：' + (r.level || '未知');
      elDesc.innerHTML = '<p>' + (r.desc || '暂无描述。') + '</p>';

      elMeta.innerHTML = (r.tags || []).map(function(t) {
        return '<span class="rd-tag">' + t + '</span>';
      }).join('');

      var sectionsHTML = '';

      // 地标 (左列) + Boss (右列) 双栏布局
      sectionsHTML += '<div class="rd-sections-grid">';
      sectionsHTML += '<div class="rd-section">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>区域地标</div>';
      var landmarks = r.landmarks || [];
      if (landmarks.length > 0) {
        sectionsHTML += '<div class="rd-landmark-list">';
        landmarks.forEach(function(lm) {
          var lmUrl = '#region/' + regionId + '/' + encodeURIComponent(lm.name);
          var lmNameEsc = escAttr(lm.name);
          var lmDescEsc = escAttr(lm.desc || '');
          sectionsHTML += '<div class="rd-landmark-card rd-landmark-clickable" onclick="if(window._hasLandmarkMesh&&window._hasLandmarkMesh(\'' + lmNameEsc + '\')){window.location.hash=\'' + lmUrl + '\';}else{window._openLandmarkModal(\'' + lmNameEsc + '\',\'' + lmDescEsc + '\',\'' + color + '\');}">'
            + '<div class="rd-lm-badge" style="background:' + color + '33;border-color:' + color + '66;color:' + color + ';">' + lm.name + '</div>'
            + '<p class="rd-lm-desc">' + (lm.desc || '') + '</p>'
            + '</div>';
        });
        sectionsHTML += '</div>';
      } else {
        sectionsHTML += '<div style="font-size:0.78rem;color:var(--text-muted);padding:12px 0;">暂无地标数据</div>';
      }
      sectionsHTML += '</div>';

      // Boss
      sectionsHTML += '<div class="rd-section">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>区域Boss</div>';
      var bosses = r.bosses || [];
      var hasBosses = bosses.length > 0 && !(bosses.length === 1 && bosses[0] === '无');
      if (hasBosses) {
        sectionsHTML += '<div class="rd-boss-list">';
        bosses.forEach(function(bossName) {
          var bossData = TDE_DATA.bosses.find(function(b) { return b.name === bossName; });
          if (bossData) {
            sectionsHTML += '<div class="rd-boss-item" onclick="window._showBossDetail(\'' + bossData.id + '\')">';
            sectionsHTML += '<svg viewBox="0 0 24 24" width="14" height="14" style="fill:var(--cyan);flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            sectionsHTML += '<span>' + bossName + '</span>';
            sectionsHTML += '</div>';
          } else {
            sectionsHTML += '<div class="rd-boss-item" style="cursor:default;border-left-color:var(--text-muted)"><span style="color:var(--text-muted)">' + bossName + '</span></div>';
          }
        });
        sectionsHTML += '</div>';
      } else {
        sectionsHTML += '<div style="font-size:0.78rem;color:var(--text-muted);padding:12px 0;">暂无Boss数据</div>';
      }
      sectionsHTML += '</div>';
      sectionsHTML += '</div>'; // .rd-sections-grid

      // 路线预览 (全宽)
      sectionsHTML += '<div class="rd-section rd-section-full">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 3h18v4H3V3zm0 6h12v4H3V9zm0 6h16v4H3v-4z" fill="currentColor"/></svg>路线预览</div>';
      sectionsHTML += '<div id="rgContainer-' + regionId + '" class="rg-container" style="min-height:450px;"></div>';
      sectionsHTML += '</div>';

      // 连接区域 (全宽)
      sectionsHTML += '<div class="rd-section rd-section-full">';
      sectionsHTML += '<div class="rd-section-title"><svg viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" fill="currentColor"/></svg>连接区域</div>';
      var connections = r.connections || [];
      if (connections.length > 0) {
        sectionsHTML += '<div class="rd-conn-list">';
        connections.forEach(function(conn) {
          var cleanName = conn.replace(/（[^）]*）/, '').trim();
          var targetRegion = regions.find(function(rr) { return rr.name === cleanName; });
          var connNode = nodes[cleanName] || {};
          var connColor = connNode.color || 'rgba(0,191,165,0.5)';
          if (targetRegion) {
            sectionsHTML += '<a class="rd-conn-item" href="#region/' + targetRegion.id + '">';
            sectionsHTML += '<span class="rd-conn-dot" style="background:' + connColor + ';box-shadow:0 0 6px ' + connColor + ';"></span>';
            sectionsHTML += '<span>' + conn + '</span>';
            sectionsHTML += '</a>';
          } else {
            sectionsHTML += '<div class="rd-conn-item">';
            sectionsHTML += '<span class="rd-conn-dot" style="background:' + connColor + ';"></span>';
            sectionsHTML += '<span style="color:var(--text-muted)">' + conn + '</span>';
            sectionsHTML += '</div>';
          }
        });
        sectionsHTML += '</div>';
      } else {
        sectionsHTML += '<div style="font-size:0.78rem;color:var(--text-muted);padding:12px 0;">暂无连接区域</div>';
      }
      sectionsHTML += '</div>';

      elSections.innerHTML = sectionsHTML;
      renderRouteGraph('rgContainer-' + regionId, regionId);
    }

    // 3D 模型预览 & 选择器
    initRegionModelPreview(regionId, color, r.name);
  }

  function initRegionModelPreview(regionId, color, regionName) {
    var elGraphic = document.getElementById('rdGraphic');
    var elPicker = document.getElementById('rdModelPicker');
    if (!elGraphic) return;

    console.log('[app] initRegionModelPreview', { regionId, regionName, editMode, hasInitMap3D: !!window._initMap3D });

    // 编辑模式：文件名输入（可覆盖默认的 {区域名}.glb）
    if (editMode && elPicker) {
      elPicker.style.display = 'flex';
      var regions = TDE_DATA.regions || [];
      var r = regions.find(function(rr) { return rr.id === regionId; });
      var currentModel = (r && r.model) ? r.model : (regionName + '.glb');

      var html = '<input type="text" id="rdModelInput" value="' + escAttr(currentModel) + '" placeholder="模型文件名，如 sanctuary.glb" style="flex:1;min-width:0;background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:0.78rem;">';
      html += '<button id="rdModelDelBtn" class="rd-model-remove-btn" title="清除自定义模型">' + (r && r.model ? 'x' : '-') + '</button>';
      elPicker.innerHTML = html;

      var inputEl = document.getElementById('rdModelInput');
      inputEl.addEventListener('change', function() {
        var val = this.value.trim();
        var defaultModel = regionName + '.glb';
        var regions2 = TDE_DATA.regions || [];
        var idx = regions2.findIndex(function(rr) { return rr.id === regionId; });
        if (idx !== -1) {
          regions2[idx].model = (val === defaultModel) ? '' : val;
        }
        renderRegionDetail(regionId, Router.currentLandmark);
      });

      var delBtn = document.getElementById('rdModelDelBtn');
      if (delBtn) {
        delBtn.onclick = function() {
          var regions3 = TDE_DATA.regions || [];
          var idx = regions3.findIndex(function(rr) { return rr.id === regionId; });
          if (idx !== -1) regions3[idx].model = '';
          renderRegionDetail(regionId, Router.currentLandmark);
        };
      }
    } else if (elPicker) {
      elPicker.style.display = 'none';
    }

    // 确定模型文件路径
    var regions2 = TDE_DATA.regions || [];
    var r2 = regions2.find(function(rr) { return rr.id === regionId; });
    var modelFile = (r2 && r2.model) ? r2.model : (regionName + '.glb');
    var resolvedPath = 'models/' + modelFile;
    console.log('[app] resolvedPath:', resolvedPath);

    var fallback = function() {
      console.log('[app] 3D fallback — using decorative circle');
      elGraphic.classList.remove('has-model');
      elGraphic.innerHTML = '<div class="rd-graphic-inner" style="background:' + color + ';color:' + color + ';"></div>';
    };
    if (!window._initMap3D) { fallback(); return; }

    elGraphic.classList.add('has-model');
    window._initMap3D(elGraphic, regionId, resolvedPath).then(function(loaded) {
      console.log('[app] _initMap3D resolved:', loaded);
      if (!loaded) { fallback(); return; }
      if (_pendingLandmark) {
        setTimeout(function() {
          window._highlightLandmarkMesh(_pendingLandmark);
        }, 100);
      }
    });
  }

  // --- 战斗 ---
  function renderStatusEffects() {
    document.getElementById('statusList').innerHTML = TDE_DATA.statusEffects.map((s, i) => `
      <div class="status-item" ${editCard(`statusEffects.${i}`)}>
        <span class="status-icon-badge ${s.icon}">${s.name[0]}</span>
        <div>
          <strong style="color:var(--text-primary)" ${edit(`statusEffects.${i}.name`)}>${s.name}</strong>
          <div style="font-size:0.72rem;color:var(--text-muted);" ${edit(`statusEffects.${i}.effect`)}>${s.effect}</div>
        </div>
      </div>
    `).join('');
  }

  function renderDmgTypeTable() {
    const headers = ['类型','斩击','打击','穿刺','火焰','冰霜','雷电','虚空','神圣','毒素'];
    document.getElementById('dmgTypeTable').innerHTML = `
      <table class="dmg-type-table">
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${TDE_DATA.damageMatrix.map((row, i) => `
          <tr>
            <td style="color:var(--cyan);font-weight:600;" ${edit(`damageMatrix.${i}.type`)}>${row.type}</td>
            <td class="${row.slash}">${row.slash || '—'}</td>
            <td class="${row.strike}">${row.strike || '—'}</td>
            <td class="${row.pierce}">${row.pierce || '—'}</td>
            <td class="${row.fire}" ${edit(`damageMatrix.${i}.fire`)}>${row.fire || '—'}</td>
            <td class="${row.frost}" ${edit(`damageMatrix.${i}.frost`)}>${row.frost || '—'}</td>
            <td class="${row.lightning}" ${edit(`damageMatrix.${i}.lightning`)}>${row.lightning || '—'}</td>
            <td class="${row.void}" ${edit(`damageMatrix.${i}.void`)}>${row.void || '—'}</td>
            <td class="${row.holy}" ${edit(`damageMatrix.${i}.holy`)}>${row.holy || '—'}</td>
            <td class="${row.poison}" ${edit(`damageMatrix.${i}.poison`)}>${row.poison || '—'}</td>
          </tr>
        `).join('')}</tbody>
      </table>`;
  }

  function renderPoiseDiagram() {
    const items = [
      { name: '玩家（轻甲）', value: 30 },
      { name: '玩家（中甲）', value: 60 },
      { name: '玩家（重甲）', value: 100 },
      { name: '普通敌人', value: 45 },
      { name: '精英敌人', value: 80 },
      { name: 'Boss（一阶段）', value: 120 }
    ];
    const max = 120;
    document.getElementById('poiseDiagram').innerHTML = items.map(i => `
      <div class="poise-bar-group">
        <div class="poise-bar-label"><span>${i.name}</span><span style="font-family:var(--font-mono)">${i.value}</span></div>
        <div class="poise-bar-track">
          <div class="poise-bar-fill" style="width:${(i.value/max)*100}%"></div>
        </div>
      </div>
    `).join('');
  }

  // --- 装备 ---
  function renderWeapons() {
    const rarityMap = { legendary:'传说', epic:'史诗', rare:'稀有', common:'普通' };
    document.getElementById('etab-weapons').innerHTML = `
      <div class="equip-grid">${TDE_DATA.weapons.map((w, i) => `
        <div class="equip-card rarity-${w.rarity}" ${editCard(`weapons.${i}`)}>
          ${renderCardDelete(`weapons.${i}`)}
          <div class="equip-header">
            <div>
              <div class="equip-name" ${edit(`weapons.${i}.name`)}>${w.name}</div>
              <div class="equip-type" ${edit(`weapons.${i}.type`)}>${w.type}</div>
            </div>
            <span class="equip-rarity rarity-${w.rarity}" ${enumField(`weapons.${i}.rarity`, 'legendary,epic,rare,common')} onclick="event.stopPropagation();window._enumClick(event)">${rarityMap[w.rarity]||w.rarity}</span>
          </div>
          <div class="equip-stats">
            ${Object.entries(w.dmg).map(([k,v]) => `<span class="equip-stat"><span ${edit(`weapons.${i}.dmg.${k}`)}>${v}</span></span>`).join('')}
            ${Object.entries(w.scaling).map(([k,v]) => `<span class="equip-stat"><span ${edit(`weapons.${i}.scaling.${k}`)}>${v}</span></span>`).join('')}
          </div>
          <div style="font-size:0.72rem;color:var(--cyan);margin-top:6px;">战技：<span ${edit(`weapons.${i}.skill`)}>${w.skill}</span></div>
          <div class="equip-desc" ${edit(`weapons.${i}.desc`)}>${w.desc}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('weapons');
  }

  function renderArmor() {
    document.getElementById('etab-armor').innerHTML = `
      <div class="equip-grid">${TDE_DATA.armor.map((a, i) => `
        <div class="equip-card" ${editCard(`armor.${i}`)}>
          ${renderCardDelete(`armor.${i}`)}
          <div class="equip-header">
            <div>
              <div class="equip-name" ${edit(`armor.${i}.name`)}>${a.name}</div>
              <div class="equip-type">${a.type} — 重量：<span ${edit(`armor.${i}.weight`)}>${a.weight}</span></div>
            </div>
          </div>
          <div class="equip-stats">
            ${Object.entries(a.defense).map(([k,v]) => `<span class="equip-stat"><span ${edit(`armor.${i}.defense.${k}`)}>${v}</span></span>`).join('')}
          </div>
          <div class="equip-desc" ${edit(`armor.${i}.desc`)}>${a.desc}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('armor');
  }

  function renderTalismans() {
    const rarityMap = { legendary:'传说', epic:'史诗', rare:'稀有', common:'普通' };
    document.getElementById('etab-talismans').innerHTML = `
      <div class="equip-grid">${TDE_DATA.talismans.map((t, i) => `
        <div class="equip-card rarity-${t.rarity}" ${editCard(`talismans.${i}`)}>
          ${renderCardDelete(`talismans.${i}`)}
          <div class="equip-header">
            <div class="equip-name" ${edit(`talismans.${i}.name`)}>${t.name}</div>
            <span class="equip-rarity rarity-${t.rarity}" ${enumField(`talismans.${i}.rarity`, 'legendary,epic,rare,common')} onclick="event.stopPropagation();window._enumClick(event)">${rarityMap[t.rarity]||t.rarity}</span>
          </div>
          <div class="equip-desc" ${edit(`talismans.${i}.desc`)}>${t.desc}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('talismans');
  }

  function renderConsumables() {
    const rarityMap = { legendary:'传说', epic:'史诗', rare:'稀有', common:'普通' };
    document.getElementById('etab-consumables').innerHTML = `
      <div class="equip-grid">${TDE_DATA.consumables.map((c, i) => `
        <div class="equip-card rarity-${c.rarity}" ${editCard(`consumables.${i}`)}>
          ${renderCardDelete(`consumables.${i}`)}
          <div class="equip-header">
            <div class="equip-name" ${edit(`consumables.${i}.name`)}>${c.name}</div>
            <span class="equip-rarity rarity-${c.rarity}" ${enumField(`consumables.${i}.rarity`, 'legendary,epic,rare,common')} onclick="event.stopPropagation();window._enumClick(event)">${rarityMap[c.rarity]||c.rarity}</span>
          </div>
          <div class="equip-desc" ${edit(`consumables.${i}.desc`)}>${c.desc}</div>
        </div>
      `).join('')}</div>
    ` + renderArrayControls('consumables');
  }

  // --- 任务 ---
  function renderQuests() {
    document.getElementById('questGrid').innerHTML = TDE_DATA.quests.map((q, i) => `
      <div class="quest-card ${q.type === 'main' ? 'main-quest' : 'side-quest'}" ${editCard(`quests.${i}`)}>
        ${renderCardDelete(`quests.${i}`)}
        <div class="quest-header">
          <span class="quest-name" ${edit(`quests.${i}.name`)}>${q.name}</span>
          <span style="font-size:0.65rem;color:var(--text-muted);" ${enumField(`quests.${i}.type`, 'main,side')} onclick="event.stopPropagation();window._enumClick(event)">${q.type === 'main' ? '主线' : '支线'}</span>
        </div>
        <div class="quest-npc">发布者：<span ${edit(`quests.${i}.npc`)}>${q.npc}</span></div>
        <div class="quest-desc" ${edit(`quests.${i}.desc`)}>${q.desc}</div>
        <div style="margin-bottom:6px;" ${arrayContainer(`quests.${i}.stages`)}>
          ${q.stages.map((s, j) => `<div style="font-size:0.7rem;color:var(--text-muted);padding:2px 0;" ${arrayItem(j)}>${j+1}. <span ${edit(`quests.${i}.stages.${j}`)}>${s}</span>${renderArrayItemControls(j)}</div>`).join('')}
          ${`<button class="inline-add-btn" style="margin-top:4px;" onclick="event.stopPropagation();window._addItem(this)">+ 添加阶段</button>`}
        </div>
        <div class="quest-rewards" ${arrayContainer(`quests.${i}.rewards`)}>
          ${q.rewards.map((r, j) => `<span class="quest-reward" ${arrayItem(j)}><span ${edit(`quests.${i}.rewards.${j}`)}>${r}</span>${renderArrayItemControls(j)}</span>`).join('')}
          ${`<button class="inline-add-btn" style="margin-left:4px;" onclick="event.stopPropagation();window._addItem(this)">+ 添加奖励</button>`}
        </div>
      </div>
    `).join('') + renderArrayControls('quests');
  }

  // --- 开发 ---
  function renderTimeline() {
    document.getElementById('timeline').innerHTML = TDE_DATA.milestones.map((m, i) => `
      <div class="timeline-item ${m.status === 'done' ? 'done' : ''} ${m.status === 'active' ? 'active-milestone' : ''}" ${editCard(`milestones.${i}`)}>
        <div class="timeline-date" ${edit(`milestones.${i}.date`)}>${m.date}</div>
        <div class="timeline-title">
          <span ${edit(`milestones.${i}.title`)}>${m.title}</span>
          ${m.status === 'active' ? ' ◀ 进行中' : ''}
        </div>
        <div class="timeline-desc" ${edit(`milestones.${i}.desc`)}>${m.desc}</div>
        <span style="font-size:0.6rem;color:var(--text-muted);cursor:pointer;" ${enumField(`milestones.${i}.status`, 'done,active,pending')} onclick="event.stopPropagation();window._enumClick(event)">[${m.status}]</span>
      </div>
    `).join('') + renderArrayControls('milestones');
  }

  function renderSprints() {
    const statusMap = { wip:'进行中', todo:'待办', done:'已完成' };
    document.getElementById('sprintBoard').innerHTML = TDE_DATA.sprints.map((s, i) => `
      <div class="sprint-item" ${editCard(`sprints.${i}`)}>
        <span class="sprint-name" ${edit(`sprints.${i}.name`)}>${s.name}</span>
        <span class="sprint-status ${s.status}" ${enumField(`sprints.${i}.status`, 'wip,todo,done')} onclick="event.stopPropagation();window._enumClick(event)">${statusMap[s.status]||s.status}</span>
      </div>
    `).join('') + renderArrayControls('sprints');
  }

  function renderChangelog() {
    document.getElementById('changelog').innerHTML = TDE_DATA.changelog.map((c, i) => `
      <div class="changelog-item" ${editCard(`changelog.${i}`)}>
        <div class="changelog-ver" ${edit(`changelog.${i}.ver`)}>${c.ver} <span style="color:var(--text-muted);font-size:0.65rem;" ${edit(`changelog.${i}.date`)}>${c.date}</span></div>
        <div class="changelog-text" ${edit(`changelog.${i}.changes`)}>${c.changes}</div>
      </div>
    `).join('') + renderArrayControls('changelog');
  }

  // --- 词条 ---
  function renderGlossary(filterCat) {
    const cat = filterCat || 'all';
    const catNames = {
      faction:'阵营', family:'家族', organization:'组织', concept:'概念', race:'种族', event:'事件',
      region:'区域', status:'异常状态', attribute:'属性'
    };
    const entries = TDE_DATA.glossary || [];
    const filtered = cat === 'all' ? entries : entries.filter(e => e.category === cat);

    document.getElementById('glossaryGrid').innerHTML = filtered.map((g, i) => {
      const gIdx = entries.indexOf(g);
      return `
        <div class="glossary-card" ${editCard(`glossary.${gIdx}`)}>
          ${renderCardDelete(`glossary.${gIdx}`)}
          <div class="glossary-card-header">
            <span class="glossary-cat-badge cat-${g.category}">${catNames[g.category] || g.category}</span>
            <span class="glossary-name" ${edit(`glossary.${gIdx}.name`)}>${g.name}</span>
          </div>
          <div class="glossary-desc" ${edit(`glossary.${gIdx}.desc`)}>${g.desc}</div>
          ${g.related && g.related.length > 0 ? `
          <div class="glossary-related">
            <span class="glossary-related-label">关联：</span>
            ${g.related.map(r => `<span class="glossary-related-tag">${r}</span>`).join('')}
          </div>` : ''}
        </div>
      `;
    }).join('') + renderArrayControls('glossary');
  }

  // ============================
  // 详情弹窗 (编辑模式下仍可用)
  // ============================
  window._showCharDetail = function(id) {
    if (document.body.classList.contains('edit-mode')) return;
    const c = TDE_DATA.classes.find(x => x.id === id);
    if (!c) return;
    Modal.open(`
      <h3>${c.name} <span style="color:var(--text-muted);font-size:0.8rem;">— ${c.title}</span></h3>
      <p>${c.desc}</p>
      <div class="detail-grid">
        ${Object.entries(c.stats).map(([k,v]) => `<div class="detail-item"><span class="detail-label">${k}</span> <span class="detail-value">${v}</span></div>`).join('')}
      </div>
      <p><strong>武器：</strong>${c.weapon}</p>
      <p><strong>防具：</strong>${c.armor}</p>
      <p><strong>战技：</strong><span style="color:var(--cyan);">${c.skill}</span></p>
    `);
  };

  window._showBossDetail = function(id) {
    if (document.body.classList.contains('edit-mode')) return;
    const b = TDE_DATA.bosses.find(x => x.id === id);
    if (!b) return;
    const diffMap = { legendary:'传说', hard:'困难', medium:'中等', easy:'简单' };
    Modal.open(`
      <h3>${b.name} <span class="boss-difficulty diff-${b.difficulty}" style="margin-left:10px;">${diffMap[b.difficulty]||b.difficulty}</span></h3>
      <p>${b.desc}</p>
      <p style="color:var(--text-muted);font-style:italic;">"${b.lore}"</p>
      <div class="detail-grid">
        <div class="detail-item">${glossLink('生命值')} <span class="detail-value">${b.hp}</span></div>
        <div class="detail-item"><span class="detail-label">阶段数</span> <span class="detail-value">${b.phases}</span></div>
        <div class="detail-item"><span class="detail-label">所在区域</span> <span class="detail-value">${b.location}</span></div>
        <div class="detail-item"><span class="detail-label">伤害类型</span> <span class="detail-value">${glossLinks(b.damageTypes)}</span></div>
        <div class="detail-item"><span class="detail-label">弱点属性</span> <span class="detail-value" style="color:var(--green);">${glossLinks(b.weaknesses)}</span></div>
        <div class="detail-item"><span class="detail-label">抗性属性</span> <span class="detail-value" style="color:var(--red);">${glossLinks(b.resistances)}</span></div>
      </div>
      <p><strong>掉落：</strong>${b.drops.join(' / ')}</p>
    `);
  };

  // ============================
  // 全局编辑事件代理
  // ============================
  function initEditEvents() {
    // 编辑模式下点击卡片 → 打开编辑面板
    document.getElementById('content').addEventListener('click', function(e) {
      if (!editMode) return;
      // 忽略各种按钮、输入、特殊元素
      if (e.target.closest('.edit-card-delete')) return;
      if (e.target.closest('.edit-btn')) return;
      if (e.target.closest('[data-edit-enum]')) return;
      if (e.target.closest('.tab-btn')) return;
      if (e.target.closest('.rd-inline-input')) return;
      if (e.target.closest('.rd-inline-textarea')) return;
      if (e.target.closest('.rd-add-btn')) return;
      if (e.target.closest('.rd-tag-remove')) return;
      if (e.target.closest('.rd-card-remove-btn')) return;
      if (e.target.closest('.rd-lm-add-btn')) return;

      const card = e.target.closest('[data-edit-card]');
      if (card) {
        e.preventDefault();
        e.stopPropagation();
        openEditPanel(card.dataset.editCard);
      }
    });

    // 自动补全键盘导航（在编辑面板的 textarea/input 内）
    document.addEventListener('keydown', function(e) {
      if (autocompleteState.active) {
        handleAutocompleteKey(e);
      }
    });

    // 编辑面板内的 textarea/input 输入检测 @ 和 [[
    document.addEventListener('input', function(e) {
      if (editMode && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') && e.target.closest('#editPanelBody')) {
        detectAutocompleteTrigger(e);
      }
    });

    // 点击其他区域关闭自动补全
    document.addEventListener('mousedown', function(e) {
      const ac = document.getElementById('autocomplete');
      if (ac && !ac.contains(e.target)) hideAutocomplete();
    });

    // 区域详情页内联编辑自动保存 (focusout 冒泡)
    document.getElementById('content').addEventListener('focusout', function(e) {
      if (!editMode) return;
      var el = e.target;
      if (!el || !el.dataset) return;
      var regionId = el.dataset.rdRegion;
      if (regionId) saveRegionInline(regionId);
    });
  }

  // 暴露给内联 onclick 的方法
  window._delItem = function(btn) { handleArrayDelete(btn); };
  window._addItem = function(btn) { handleArrayAdd(btn); };
  window._delCard = function(btn) { handleCardDelete(btn); };
  window._enumClick = function(e) { handleEnumClick(e); };
  window._editCard = function(path) { openEditPanel(path); };
  window._addPanelArrayItem = function(btn) { addPanelArrayItem(btn); };
  window._filterGlossaryPicker = function(input) { filterGlossaryPicker(input); };
  window._toggleGlossaryChip = function(opt) { toggleGlossaryChip(opt); };
  window._updateGlossPickerHidden = function(el) { updateGlossPickerHidden(el); };
  window._startMapConnection = function(from) { startMapConnection(from); };
  window._deleteMapConnection = function(from, to) { deleteMapConnection(from, to); };
  window._startDragNode = function(e, name) { startDragNode(e, name); };
  window._goGlossary = function(cat) {
    Router.navigate('glossary');
    setTimeout(function() {
      var btns = document.querySelectorAll('#page-glossary .tab-btn');
      btns.forEach(function(b) { b.classList.remove('active'); });
      var target = document.querySelector('#page-glossary .tab-btn[data-gtab="' + cat + '"]');
      if (target) target.classList.add('active');
      renderGlossary(cat);
    }, 60);
  };

  // ============================
  // 标签页切换
  // ============================
  function initTabs() {
    function setupTabs(pageId, tabAttr, contentPrefix) {
      document.querySelectorAll(`#${pageId} .tab-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset[tabAttr];
          document.querySelectorAll(`#${pageId} .tab-btn`).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.querySelectorAll(`#${pageId} .tab-content`).forEach(c => c.classList.remove('active'));
          document.getElementById(`${contentPrefix}${tab}`).classList.add('active');
        });
      });
    }
    setupTabs('page-characters', 'tab', 'tab-');
    setupTabs('page-bestiary', 'btab', 'btab-');
    setupTabs('page-equipment', 'etab', 'etab-');

    // 词条系统标签页
    document.querySelectorAll('#page-glossary .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.gtab;
        document.querySelectorAll('#page-glossary .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGlossary(cat);
      });
    });
  }

  function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        window.location.hash = link.dataset.page;
      });
    });
  }

  // ============================
  // 数据管理面板
  // ============================
  function initDataManager() {
    const btnSaveFiles = document.getElementById('btnSaveFiles');
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');
    const btnReset = document.getElementById('btnReset');
    const fileInput = document.getElementById('fileInput');

    if (btnSaveFiles) btnSaveFiles.addEventListener('click', downloadDataFiles);
    if (btnExport) btnExport.addEventListener('click', exportJSON);
    if (btnImport) btnImport.addEventListener('click', () => fileInput.click());
    if (btnReset) btnReset.addEventListener('click', resetData);
    if (fileInput) fileInput.addEventListener('change', e => {
      if (e.target.files[0]) importJSON(e.target.files[0]);
      e.target.value = '';
    });

  }

  // ============================
  // 下载数据源文件 (ZIP)
  // ============================

  // 数据文件定义：{ filename, keys: [TDE_DATA 键名] }
  var DATA_FILE_MAP = [
    { file: '_init.js',       keys: [] },
    { file: 'dashboard.js',   keys: ['projectStartDate','progress','updates','tasks','milestones','sprints'] },
    { file: 'classes.js',     keys: ['classes'] },
    { file: 'npcs.js',        keys: ['npcs','merchants'] },
    { file: 'bestiary.js',    keys: ['bosses','elites','common'] },
    { file: 'regions.js',     keys: ['regions','worldMap'] },
    { file: 'equipment.js',   keys: ['weapons','armor','talismans','consumables'] },
    { file: 'mechanics.js',   keys: ['statusEffects','damageMatrix'] },
    { file: 'quests.js',      keys: ['quests'] },
    { file: 'glossary.js',    keys: ['glossary'] },
    { file: 'changelog.js',   keys: ['changelog'] }
  ];

  var FILE_LABELS = {
    _init: '数据命名空间',
    dashboard: '总览 / 仪表盘',
    classes: '初始职业',
    npcs: 'NPC 与商人',
    bestiary: '敌人图鉴',
    regions: '区域与世界地图',
    equipment: '武器、防具、护符与消耗品',
    mechanics: '异常状态与伤害类型',
    quests: '任务',
    glossary: '词条系统',
    changelog: '开发变更日志'
  };

  function generateDataFile(label, keys) {
    var lines = [];
    lines.push('// 无眠纪 — ' + label + '数据');
    lines.push('// Part of TDE_DATA. Edit directly or use the web UI.');
    lines.push('');
    if (keys.length === 0) {
      lines.push('const TDE_DATA = {};');
    } else {
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (TDE_DATA.hasOwnProperty(key)) {
          lines.push('TDE_DATA.' + key + ' = ' + JSON.stringify(TDE_DATA[key], null, 2) + ';');
          lines.push('');
        }
      }
    }
    return lines.join('\n');
  }

  function downloadDataFiles() {
    var files = [];
    for (var i = 0; i < DATA_FILE_MAP.length; i++) {
      var def = DATA_FILE_MAP[i];
      var label = FILE_LABELS[def.file.replace('.js','')] || def.file;
      var content = generateDataFile(label, def.keys);
      files.push([def.file, content]);
    }
    var zipBytes = buildZip(files);
    var blob = new Blob([zipBytes], { type: 'application/zip' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'tde-data-' + new Date().toISOString().slice(0,10) + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    showToast('数据源文件已下载 — 解压到 data/ 目录并提交到仓库');
  }

  // ============================
  // 最小 ZIP 构建器 (无压缩，纯 Store 模式)
  // ============================

  function crc32(bytes) {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function buildZip(files) {
    var encoder = new TextEncoder();
    var localHeaders = [];
    var centralHeaders = [];
    var fileDataParts = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var name = files[i][0];
      var content = files[i][1];
      var nameBytes = encoder.encode(name);
      var contentBytes = encoder.encode(content);
      var crc = crc32(contentBytes);
      var compSize = contentBytes.length;
      var uncompSize = contentBytes.length;

      // Local file header (30 bytes + filename)
      var lh = new Uint8Array(30 + nameBytes.length);
      var dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0, true);
      dv.setUint16(8, 0, true);   // store (no compression)
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, compSize, true);
      dv.setUint32(22, uncompSize, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      localHeaders.push(lh);

      // Central directory header (46 bytes + filename)
      var cd = new Uint8Array(46 + nameBytes.length);
      dv = new DataView(cd.buffer);
      dv.setUint32(0, 0x02014b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 20, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, 0, true);
      dv.setUint16(12, 0, true);
      dv.setUint16(14, 0, true);
      dv.setUint32(16, crc, true);
      dv.setUint32(20, compSize, true);
      dv.setUint32(24, uncompSize, true);
      dv.setUint16(28, nameBytes.length, true);
      dv.setUint16(30, 0, true);
      dv.setUint16(32, 0, true);
      dv.setUint16(34, 0, true);
      dv.setUint32(36, 0, true);
      dv.setUint32(42, offset, true);
      cd.set(nameBytes, 46);
      centralHeaders.push(cd);

      fileDataParts.push(contentBytes);
      offset += 30 + nameBytes.length + compSize;
    }

    var centralDirOffset = offset;
    var centralDirSize = 0;
    for (var j = 0; j < centralHeaders.length; j++) {
      centralDirSize += centralHeaders[j].length;
    }
    var totalSize = offset + centralDirSize + 22;
    var result = new Uint8Array(totalSize);
    var pos = 0;
    for (var m = 0; m < localHeaders.length; m++) {
      result.set(localHeaders[m], pos); pos += localHeaders[m].length;
      result.set(fileDataParts[m], pos); pos += fileDataParts[m].length;
    }
    for (var n = 0; n < centralHeaders.length; n++) {
      result.set(centralHeaders[n], pos); pos += centralHeaders[n].length;
    }
    // End of central directory record (22 bytes)
    var eocd = new DataView(result.buffer, pos, 22);
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(4, 0, true);
    eocd.setUint16(6, 0, true);
    eocd.setUint16(8, files.length, true);
    eocd.setUint16(10, files.length, true);
    eocd.setUint32(12, centralDirSize, true);
    eocd.setUint32(16, centralDirOffset, true);
    eocd.setUint16(20, 0, true);

    return result;
  }

  // ============================
  // 渲染全部
  // ============================
  function renderAll() {
    renderClasses();
    renderNPCs();
    renderMerchants();
    renderBosses();
    renderElites();
    renderCommon();
    renderWorldMap();
    renderRegions();
    if (Router.currentPage.startsWith('region/')) {
      renderRegionDetail(Router.currentSub, Router.currentLandmark);
    }
    renderWeapons();
    renderArmor();
    renderTalismans();
    renderConsumables();
    renderQuests();
    renderGlossary();
    renderEntityStats();
    renderRegionOverview();
  }

  // ============================
  // 启动
  // ============================
  function boot() {
    ParticleSystem.init();
    Router.init();
    Modal.init();
    EditPanel.init();
    initNavigation();
    initTabs();
    initEditEvents();
    initDataManager();

    // 一次性迁移：将旧版 localStorage 数据导入内存，提示用户下载保存
    (function migrateLocalStorage() {
      try {
        var saved = localStorage.getItem('tde_dev_data');
        if (saved) {
          var parsed = JSON.parse(saved);
          if (parsed._version === 2) {
            delete parsed._version;
            Object.keys(parsed).forEach(function(k) {
              if (TDE_DATA.hasOwnProperty(k)) TDE_DATA[k] = parsed[k];
            });
            console.log('%c已从本地存储迁移旧数据。请立即点击「下载源文件」保存到仓库！', 'color:#ffab40;');
            showToast('检测到浏览器本地存储的旧数据，已加载。请点击「下载源文件」保存到仓库！', 8000);
            localStorage.removeItem('tde_dev_data');
          }
        }
      } catch(e) { localStorage.removeItem('tde_dev_data'); }
    })();

    buildMentionIndex();
    renderAll();
    updateDashboardStats();

    // 编辑模式切换按钮
    const editBtn = document.getElementById('editToggle');
    if (editBtn) {
      editBtn.addEventListener('click', toggleEditMode);
    }

    // Ctrl+E 快捷键切换编辑模式
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleEditMode();
      }
      // Esc 取消地图连接模式 或 拖拽
      if (e.key === 'Escape') {
        if (_mapConnSource) {
          e.preventDefault();
          cancelMapConnection();
          showToast('已取消连接');
        }
        if (_dragNode) {
          e.preventDefault();
          onDragEnd(e);
        }
      }
    });

    // 地图节点拖拽全局事件
    document.addEventListener('mousemove', function(e) {
      if (_dragNode) onDragMove(e);
    });
    document.addEventListener('mouseup', function(e) {
      if (_dragNode) onDragEnd(e);
    });

    console.log('%c 无眠纪 %c The Dreamless Era %c 开发文档已就绪',
      'color:#00f0ff;font-size:1.2em;font-weight:bold;',
      'color:#00bfa5;font-size:1em;',
      'color:#889898;');
    console.log('%cTDE 开发文档系统 v0.1.0-alpha %c| Ctrl+E 编辑 | 下载源文件保存',
      'color:#556060;font-style:italic;',
      'color:#00bfa5;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
