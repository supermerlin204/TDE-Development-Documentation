// 无眠纪 — 武器、防具、护符与消耗品数据
TDE_DATA.weapons = [
  { id: 'wintertide', name: '凛冬', type: '巨剑', rarity: 'legendary', dmg: { 物理: 180, 冰霜: 60 }, scaling: { 力量: 'B', 敏捷: 'D' }, skill: '冰霜新星——猛击地面，制造扩散冰环', desc: '冰霜之王的佩剑。千年之后，剑刃依旧冰冷刺骨。' },
  { id: 'ember_blade', name: '余烬巨剑', type: '巨剑', rarity: 'rare', dmg: { 物理: 140, 火焰: 40 }, scaling: { 力量: 'C', 敏捷: 'E' }, skill: '灰烬斩——重劈留下火焰轨迹', desc: '灰烬骑士的武器。剑身仍散发着残热的光芒。' },
  { id: 'void_catalyst', name: '虚空之心触媒', type: '触媒', rarity: 'legendary', dmg: { 虚空: 120 }, scaling: { 智力: 'A', 信仰: 'C' }, skill: '深渊射线——引导穿透性的虚空能量光束', desc: '由虚空先驱的心脏雕琢而成。黑暗能量在其中脉动。' },
  { id: 'thorn_whip', name: '荆棘鞭', type: '鞭', rarity: 'epic', dmg: { 物理: 90, 毒素: 45 }, scaling: { 敏捷: 'B' }, skill: '荆棘抽击——超远距离鞭打，附带毒素累积', desc: '以荆棘母体的藤蔓编织而成。仍滴落着剧毒的汁液。' },
  { id: 'twin_shades', name: '双影', type: '弯刀', rarity: 'rare', dmg: { 物理: 110 }, scaling: { 敏捷: 'A', 力量: 'E' }, skill: '暗影之舞——6连击组合，附带无敌帧', desc: '求道者教团的双持佩刀。完美平衡，专为双手挥砍而设计。' },
  { id: 'guardian_halberd', name: '守护者戟', type: '长柄', rarity: 'rare', dmg: { 物理: 150 }, scaling: { 力量: 'C', 敏捷: 'C' }, skill: '旋风扫——360度旋转斩击', desc: '守望者军团的标准武器。可靠且致命。' },
  { id: 'sacred_chime', name: '赎罪圣铃', type: '圣铃', rarity: 'epic', dmg: { 神圣: 100 }, scaling: { 信仰: 'A' }, skill: '治愈祈祷——范围内持续回血', desc: '铃声回响着被宽恕的罪孽。' },
  { id: 'void_dagger', name: '仪式匕首', type: '匕首', rarity: 'common', dmg: { 物理: 60, 虚空: 25 }, scaling: { 敏捷: 'D', 智力: 'D' }, skill: '疾步——短距离冲刺，附带无敌帧', desc: '虚空召唤仪式所用的礼器。' },
  { id: 'longsword', name: '骑士长剑', type: '直剑', rarity: 'common', dmg: { 物理: 110 }, scaling: { 力量: 'C', 敏捷: 'C' }, skill: '架势切换——在进攻与防御架势间切换', desc: '磨损但可靠的剑刃。骑士最好的伙伴。' },
  { id: 'stiletto', name: '暗影刺剑', type: '匕首', rarity: 'rare', dmg: { 物理: 75 }, scaling: { 敏捷: 'A' }, skill: '影袭——传送至目标背后发动暴击', desc: '细如耳语，锐如背叛。' }
];

TDE_DATA.armor = [
  { id: 'knight_set', name: '骑士套装', type: '重甲', weight: 32, defense: { 物理: 180, 魔法: 90, 火焰: 70, 冰霜: 100, 虚空: 40 }, desc: '经典重甲。高韧性，翻滚距离短。' },
  { id: 'seeker_garb', name: '求道者之衣', type: '轻甲', weight: 12, defense: { 物理: 70, 魔法: 120, 火焰: 60, 冰霜: 80, 虚空: 100 }, desc: '轻质织物，提升机动性和无敌帧窗口。' },
  { id: 'void_robes', name: '虚空法袍', type: '轻甲', weight: 8, defense: { 物理: 40, 魔法: 160, 火焰: 50, 冰霜: 60, 虚空: 180 }, desc: '注入虚空能量的法袍。虚空法术伤害+15%。' },
  { id: 'penitent_set', name: '忏悔者圣衣', type: '中甲', weight: 20, defense: { 物理: 130, 魔法: 110, 火焰: 140, 冰霜: 70, 虚空: 60 }, desc: '受祝福的铠甲。生命值低于30%时缓慢恢复。' },
  { id: 'shade_wrap', name: '暗影缠布', type: '轻甲', weight: 6, defense: { 物理: 50, 魔法: 90, 火焰: 40, 冰霜: 50, 虚空: 130 }, desc: '近乎透明的缠绕布。消除脚步声，缩短被察觉距离。' },
  { id: 'warden_set', name: '守望者铠甲', type: '中甲', weight: 22, defense: { 物理: 150, 魔法: 80, 火焰: 90, 冰霜: 100, 虚空: 50 }, desc: '坚固的中型铠甲。长柄武器攻击范围+10%。' }
];

TDE_DATA.talismans = [
  { id: 'dream_fragment', name: '梦境碎片', desc: '最大耐力+15%。一片被遗忘的梦的碎屑。', rarity: 'rare' },
  { id: 'void_heart', name: '虚空之心吊坠', desc: '虚空伤害+20%，但最大生命值-15%。', rarity: 'legendary' },
  { id: 'blightseed', name: '枯萎种子护符', desc: '敌人中毒累积速度+30%。', rarity: 'epic' },
  { id: 'crystal_tear', name: '水晶之泪', desc: '冰霜抗性+10%，免疫冰冻状态。', rarity: 'rare' },
  { id: 'ember_brand', name: '余烬烙印', desc: '火焰攻击附带3秒灼烧持续伤害。', rarity: 'epic' },
  { id: 'timeworn_gear', name: '时光齿轮', desc: '战技冷却时间-12%。', rarity: 'rare' },
  { id: 'silence_charm', name: '寂静咒符', desc: '完全消除脚步声。与重甲不兼容。', rarity: 'common' },
  { id: 'dragon_crest', name: '龙纹戒指', desc: '所有物理伤害-8%。', rarity: 'rare' }
];

TDE_DATA.consumables = [
  { id: 'ember_flask', name: '余烬圣瓶', desc: '标准回复道具。恢复350生命值。', rarity: 'common' },
  { id: 'voidward', name: '避虚药水', desc: '60秒内虚空抗性+30%。', rarity: 'rare' },
  { id: 'resin_fire', name: '火焰松脂', desc: '右手武器附加火焰伤害，持续90秒。', rarity: 'common' },
  { id: 'resin_frost', name: '冰霜松脂', desc: '右手武器附加冰霜累积，持续90秒。', rarity: 'common' },
  { id: 'resin_void', name: '虚空松脂', desc: '右手武器附加虚空伤害，持续90秒。', rarity: 'rare' },
  { id: 'effigy', name: '人形化身', desc: '恢复人形。消除空洞化累积。', rarity: 'rare' },
  { id: 'pale_tongue', name: '苍白之舌', desc: '可在织肉者莉迪亚处进行一次属性重分配。', rarity: 'epic' },
  { id: 'dream_shard', name: '梦境碎片', desc: '捏碎后获得大量灵魂（货币）。', rarity: 'common' },
  { id: 'antidote', name: '枯萎解药', desc: '解除中毒并获得30秒中毒免疫。', rarity: 'common' },
  { id: 'bomb_ember', name: '余烬炸弹', desc: '投掷物，爆炸产生火焰范围伤害。', rarity: 'common' }
];
