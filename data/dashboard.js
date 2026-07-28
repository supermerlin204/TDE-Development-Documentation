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
  { name: '关卡白盒搭建', pct: 50 },
  { name: '动画系统', pct: 40 },
  { name: 'AI行为树框架', pct: 65 },
  { name: '网络联机模块', pct: 15 },
  { name: '本地化管线', pct: 30 },
  { name: '存档与数据持久化', pct: 85 },
  { name: '粒子特效系统', pct: 55 },
  { name: '物理与碰撞检测', pct: 70 }
];

TDE_DATA.updates = [
  { date: '2026-07-13', text: '修订伤害公式——追加架势崩解倍率' },
  { date: '2026-07-11', text: '新区域「余烬火山口」白盒搭建完成' },
  { date: '2026-07-08', text: 'Boss「虚空先驱」第二阶段机制定稿' },
  { date: '2026-07-05', text: 'NPC「星盲艾拉」任务线对话草案v2完成' },
  { date: '2026-07-02', text: '武器战技系统原型实装完毕' },
  { date: '2026-06-28', text: '初始职业平衡性调整——全职业属性重分配' },
  { date: '2026-06-22', text: '新区域"碧翠谷"概念美术定稿' },
  { date: '2026-06-18', text: 'Boss"荆棘母体"AI行为树v1完成' },
  { date: '2026-06-14', text: '异常状态系统框架重构——新增灼烧、麻痹类型' },
  { date: '2026-06-10', text: 'NPC"余烬魔女"角色设计与对话初稿' },
  { date: '2026-06-05', text: '世界地图交互原型——区域传送与迷雾解锁' },
  { date: '2026-05-28', text: '架势/韧性/处决三系统联动测试通过' },
  { date: '2026-05-20', text: '音效设计文档——环境音与脚步声系统' },
  { date: '2026-05-15', text: '初始开发文档站点搭建' }
];

TDE_DATA.tasks = [
  { text: '实现架势崩解/处决的动作融合', priority: 'high' },
  { text: '平衡性调整：前期敌人HP曲线', priority: 'high' },
  { text: '制作虚空系技能的临时VFX特效', priority: 'medium' },
  { text: '撰写「寂静大圣堂」背景故事条目', priority: 'medium' },
  { text: '搭建本地化管线（中/英/日）', priority: 'low' },
  { text: '优化Boss阶段转换时的粒子特效性能', priority: 'high' },
  { text: '实现NPC好感度系统与对话分支', priority: 'medium' },
  { text: '设计猩红宫殿的血泉机关机制', priority: 'medium' },
  { text: '撰写"无尽之海"区域背景故事', priority: 'medium' },
  { text: '制作余烬魔女的锻造动画', priority: 'low' },
  { text: '优化梦海区域的浮空岛屿碰撞体', priority: 'low' },
  { text: '调整噩梦异常状态的视觉反馈', priority: 'medium' }
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
  { name: '搭建版本控制分支策略', status: 'done' },
  { name: '实现NPC好感度系统', status: 'todo' },
  { name: '设计血族诅咒机制', status: 'wip' },
  { name: '创建猩红宫殿白盒关卡', status: 'todo' },
  { name: '优化梦海传送门触发逻辑', status: 'wip' },
  { name: '调整各区域敌人等级曲线', status: 'todo' },
  { name: '编写Boss出场动画脚本', status: 'done' }
];
