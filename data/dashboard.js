// 无眠纪 — 总览 / 仪表盘数据
TDE_DATA.projectStartDate = '2025-01-15';

TDE_DATA.progress = [
  { name: '核心战斗系统', pct: 72 },
  { name: '世界地图设计', pct: 45 },
  { name: '角色模型制作', pct: 38 },
  { name: 'Boss战设计', pct: 55 },
  { name: '任务系统', pct: 60 },
  { name: 'UI / HUD 设计', pct: 80 },
  { name: '音效与音乐', pct: 25 },
  { name: '关卡白盒搭建', pct: 50 }
];

TDE_DATA.updates = [
  { date: '2026-07-13', text: '修订伤害公式——追加架势崩解倍率' },
  { date: '2026-07-11', text: '新区域「余烬火山口」白盒搭建完成' },
  { date: '2026-07-08', text: 'Boss「虚空先驱」第二阶段机制定稿' },
  { date: '2026-07-05', text: 'NPC「星盲艾拉」任务线对话草案v2完成' },
  { date: '2026-07-02', text: '武器战技系统原型实装完毕' }
];

TDE_DATA.tasks = [
  { text: '实现架势崩解/处决的动作融合', priority: 'high' },
  { text: '平衡性调整：前期敌人HP曲线', priority: 'high' },
  { text: '制作虚空系技能的临时VFX特效', priority: 'medium' },
  { text: '撰写「寂静大圣堂」背景故事条目', priority: 'medium' },
  { text: '搭建本地化管线（中/英/日）', priority: 'low' }
];

TDE_DATA.milestones = [
  { date: '2025-Q4', title: '项目立项', desc: '核心概念确立、游戏类型定义、初始世界观圣经撰写', status: 'done' },
  { date: '2026-Q1', title: '原型阶段', desc: '战斗原型、移动系统、第一个可玩白盒关卡', status: 'done' },
  { date: '2026-Q2', title: '垂直切片', desc: '一个完整区域（余烬火山口）、2个Boss、全部核心系统', status: 'done' },
  { date: '2026-Q3', title: 'Alpha版本', desc: '全区域白盒完成、全部Boss实装、临时美术资源就位', status: 'active' },
  { date: '2026-Q4', title: '内容完成（Beta）', desc: '全部内容实装、第一轮数值平衡、本地化初稿', status: 'pending' },
  { date: '2027-Q1', title: '打磨阶段', desc: '最终美术、音效、视觉特效、第二轮数值平衡、QA测试', status: 'pending' },
  { date: '2027-Q2', title: '候选发布版', desc: '平台认证、营销、发行准备', status: 'pending' }
];

TDE_DATA.sprints = [
  { name: '实现Boss阶段转换系统', status: 'wip' },
  { name: '平衡伤害公式参数', status: 'wip' },
  { name: '创建虚空先驱Boss战场白盒', status: 'todo' },
  { name: '打磨玩家翻滚动画融合', status: 'done' },
  { name: '实现存档/读档系统', status: 'done' },
  { name: '设计NPC对话UI布局', status: 'todo' },
  { name: '优化余烬火山口的粒子特效', status: 'wip' },
  { name: '搭建版本控制分支策略', status: 'done' }
];
