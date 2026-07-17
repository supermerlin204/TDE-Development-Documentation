# 无眠纪 The Dreamless Era — 开发文档

类魂 RPG《无眠纪》的开发文档与设计资料站。包含世界观设定、角色数据、装备道具、敌人图鉴、任务系统及区域 3D 预览。

## 功能模块

- **总览面板** — 项目进度、实体统计、开发日志、数据管理
- **世界地图** — 区域拓扑图，点击节点进入详情，支持拖拽编辑
- **区域详情** — 设定描述、地标列表、Boss 关联，嵌入 Three.js 3D 模型预览
- **角色资料** — 初始职业、NPC、商人数据，含属性面板与编辑器
- **敌人图鉴** — Boss / 精英 / 普通敌人三级分类，含掉落表
- **装备道具** — 武器、防具、护符、消耗品数据库
- **任务系统** — 主线支线任务链与分支描述
- **词条系统** — 阵营、种族、概念、事件、属性等 45+ 词条，支持交叉引用和富文本

## 编辑与持久化

开启编辑模式（侧边栏按钮或 `Ctrl+E`）后可直接在页面上编辑所有数据。修改完成后点击「下载源文件 (ZIP)」导出 `data/*.js` 文件，覆盖仓库对应文件后 commit + push 即可将变更永久化。

数据按功能域拆分为 `data/` 目录下的 11 个独立文件：

```
data/
  _init.js        — TDE_DATA 命名空间初始化
  dashboard.js    — 项目日期、进度、里程碑、Sprint
  classes.js      — 初始职业
  npcs.js         — NPC 与商人
  bestiary.js     — Boss、精英、普通敌人
  regions.js      — 区域设定与世界地图节点坐标
  equipment.js    — 武器、防具、护符、消耗品
  mechanics.js    — 异常状态、伤害矩阵
  quests.js       — 任务数据
  glossary.js     — 词条系统
  changelog.js    — 版本变更日志
```

## 3D 区域预览

区域详情页嵌入 Three.js 场景，支持 GLB 模型加载（Draco 压缩）。模型文件置于 `models/` 目录，命名与区域名称对应（如 `北风前哨站.glb`）。

首次加载自动将模型缓存至 IndexedDB，后续访问秒开。编辑器模式下可直接在页面上修改模型文件名。

## 技术栈

纯静态站点，零构建步骤：HTML + CSS + Vanilla JS，Three.js (r160) ES 模块驱动 3D 渲染，GitHub Pages 部署。

在线访问：**[supermerlin204.github.io/TDE-Development-Documentation](https://supermerlin204.github.io/TDE-Development-Documentation/)**

## 本地开发

```bash
npx serve . -p 3000
```

访问 `http://localhost:3000`。
