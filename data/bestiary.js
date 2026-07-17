// 无眠纪 — 敌人图鉴数据
TDE_DATA.bosses = [
  {
    id: 'void_herald',
    name: '虚空先驱·深渊之喉',
    difficulty: 'legendary',
    hp: '18,500',
    phases: 3,
    location: '沉没大圣堂',
    desc: '无眠虚空的第一位先驱。巨大的蛇形实体，半身浸没在黑色脓液湖泊中。它的三张面孔同时吟唱着令人发疯的合声。',
    lore: '昔日天庭的使者，如今被自己奉命调查的寂静所腐蚀。',
    drops: ['虚空先驱的灵魂', '深渊鳞片×3', '虚空之心触媒'],
    damageTypes: ['虚空伤害', '物理攻击力'],
    weaknesses: ['神圣伤害', '火焰伤害'],
    resistances: ['虚空伤害', '暗黑伤害']
  },
  {
    id: 'frost_king',
    name: '冰霜之王·水晶尖塔之主',
    difficulty: 'hard',
    hp: '12,800',
    phases: 2,
    location: '水晶尖塔之巅',
    desc: '被永恒寒冰包裹的高大铠甲巨人。他的巨剑「凛冬」冻结了周围的空气，在战场上不断制造致命的冰霜区域。',
    lore: '一个追求永生的凡人国王，通过冷冻保存获得了不朽——付出了惨痛的代价。',
    drops: ['冰霜之王的灵魂', '凛冬巨剑', '冰封王冠'],
    damageTypes: ['冰霜伤害', '物理攻击力'],
    weaknesses: ['火焰伤害', '雷电伤害'],
    resistances: ['冰霜伤害', '毒素伤害']
  },
  {
    id: 'thorn_matriarch',
    name: '荆棘母体·腐朽之花',
    difficulty: 'medium',
    hp: '9,200',
    phases: 2,
    location: '碧翠谷深处',
    desc: '扎根于腐化森林中心的巨大植物生命体。她不断催生荆棘藤蔓，释放毒花粉云，将整片区域变成致命的陷阱。',
    lore: '远古森林的守护精魂，被不断蔓延的无眠腐化所扭曲。',
    drops: ['荆棘母体的灵魂', '荆棘鞭', '枯萎种子护符'],
    damageTypes: ['毒素伤害', '物理攻击力'],
    weaknesses: ['火焰伤害', '斩击伤害'],
    resistances: ['毒素伤害', '穿刺伤害']
  },
  {
    id: 'clockwork_sentinel',
    name: '发条哨兵·时间守护者',
    difficulty: 'hard',
    hp: '14,000',
    phases: 3,
    location: '时光守护者遗迹',
    desc: '由黄铜与水晶铸造的古老自动人偶。每个阶段切换不同的伤害类型和行为模式，迫使玩家不断调整策略。',
    lore: '一个试图丈量永恒的文明所建造的造物。它已经计时了一万多年。',
    drops: ['发条哨兵的灵魂', '克罗诺斯齿轮', '时光镀层×5'],
    damageTypes: ['雷电伤害', '物理攻击力'],
    weaknesses: ['虚空伤害', '打击伤害'],
    resistances: ['雷电伤害', '魔法攻击力']
  },
  {
    id: 'dreamless_one',
    name: '无眠者·寂静本体',
    difficulty: 'legendary',
    hp: '24,000',
    phases: 4,
    location: '寂静之心（最终区域）',
    desc: '最终Boss。无形的实体，显现为填充着无星虚空的人形轮廓。每个阶段剥夺一项核心游戏机制，最终回归纯粹的绝望搏杀。',
    lore: '无眠诅咒的源头。不是神，也不是恶魔——而是二者的缺席。',
    drops: ['无眠者的灵魂', '结局决定道具'],
    damageTypes: ['虚空', '全属性'],
    weaknesses: ['全属性均等（无特殊弱点）'],
    resistances: ['免疫所有异常状态']
  },
  {
    id: 'ashen_knight',
    name: '灰烬骑士奥德里克',
    difficulty: 'medium',
    hp: '7,500',
    phases: 1,
    location: '余烬火山口',
    desc: '第一个主要Boss。曾经高贵的骑士被烧成灰烬，挥舞着巨大的熔火大剑，攻击缓慢但范围极大，每一击都能撼动大地。',
    lore: '教程Boss，教授核心机制：闪避时机、耐力管理和反击窗口。',
    drops: ['灰烬骑士的灵魂', '余烬巨剑', '骑士的骨灰'],
    damageTypes: ['火焰伤害', '物理攻击力'],
    weaknesses: ['冰霜伤害', '打击伤害'],
    resistances: ['火焰伤害']
  }
];

TDE_DATA.elites = [
  { id: 'void_walker', name: '虚空行者', desc: '能够短距离传送的人形敌人，从死角发动攻击。掉落虚空碎片。', location: '沉没大圣堂', hp: '2,400' },
  { id: 'crystal_golem', name: '水晶魔像', desc: '行动缓慢但几乎不可摧毁的构造体。背部有弱点结晶。', location: '水晶尖塔', hp: '5,000' },
  { id: 'rot_hound', name: '腐化猎犬首领', desc: '能强化附近小型猎犬的族群首领。速度快，极具攻击性。', location: '碧翠谷', hp: '1,800' },
  { id: 'time_wraith', name: '时光魅影', desc: '命中后减缓玩家移动速度的灵体敌人。', location: '时光守护者遗迹', hp: '1,500' },
  { id: 'shade_assassin', name: '暗影刺客', desc: '攻击前完全隐形。仔细听脚步声判断其位置。', location: '各地（仅夜间出没）', hp: '900' }
];

TDE_DATA.common = [
  { id: 'husk', name: '空壳', desc: '最基础的敌人。攻击缓慢、前摇明显。曾是无眠之地的普通居民。', location: '全区域', hp: '200-600' },
  { id: 'ember_thrall', name: '余烬奴仆', desc: '携带阴燃之刃，攻击附带微量火焰累积。', location: '余烬火山口、余烬锻炉', hp: '400' },
  { id: 'frost_spider', name: '冰霜蜘蛛', desc: '喷射减速蛛网。在狭窄通道中集群出没。', location: '水晶尖塔', hp: '250' },
  { id: 'void_spawn', name: '虚空幼体', desc: '小型快速生物，死亡时爆炸造成虚空伤害。', location: '沉没大圣堂', hp: '150' },
  { id: 'corrupted_scholar', name: '腐化学者', desc: '远程施法者。发射追踪暗黑弹。脆弱但集群时非常危险。', location: '寂静大圣堂', hp: '350' }
];
