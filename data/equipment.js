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
  { id: 'stiletto', name: '暗影刺剑', type: '匕首', rarity: 'rare', dmg: { 物理: 75 }, scaling: { 敏捷: 'A' }, skill: '影袭——传送至目标背后发动暴击', desc: '细如耳语，锐如背叛。' },
  { id: 'dragonbone_hammer', name: '龙骨战锤', type: '大锤', rarity: 'legendary', dmg: { 物理: 200, 火焰: 80 }, scaling: { 力量: 'A' }, skill: '龙碎——蓄力跳跃重砸，大范围冲击波', desc: '以枯萎之龙的脊骨锻造。锤头仍散发着远古巨龙的气息。' },
  { id: 'storm_spear', name: '风暴之矛', type: '长矛', rarity: 'epic', dmg: { 物理: 130, 雷电: 55 }, scaling: { 敏捷: 'B', 智力: 'C' }, skill: '雷枪投掷——将雷电源注入长矛并投出', desc: '风暴海兽的獠牙打磨而成。矛尖永远闪烁着电弧。' },
  { id: 'crimson_blade', name: '猩红贵族刺剑', type: '刺剑', rarity: 'epic', dmg: { 物理: 100, 暗黑: 40 }, scaling: { 敏捷: 'A', 智力: 'D' }, skill: '鲜血华尔兹——快速三连刺，每击回复少量生命', desc: '猩红宫廷的传家宝。剑身泛着不祥的暗红色光泽。' },
  { id: 'mindbreaker', name: '碎心者', type: '法杖', rarity: 'epic', dmg: { 虚空: 110, 暗黑: 40 }, scaling: { 智力: 'A', 信仰: 'C' }, skill: '心灵震爆——释放锥形范围的灵能冲击', desc: '噬心魔的触须盘绕在枯萎的古老树枝上。持有者能听见微弱的低语。' },
  { id: 'iron_fists', name: '巨像铁拳', type: '拳套', rarity: 'epic', dmg: { 物理: 160 }, scaling: { 力量: 'B', 敏捷: 'C' }, skill: '碎钢连打——连续五拳，最后一击必定暴击', desc: '用钢铁巨像的手指关节打造的巨大拳套。一拳可碎城墙。' },
  { id: 'soul_scythe', name: '灵魂收割者', type: '镰刀', rarity: 'legendary', dmg: { 物理: 170, 暗黑: 70 }, scaling: { 力量: 'B', 敏捷: 'B', 智力: 'D' }, skill: '灵魂收割——横扫收割前方敌人的灵魂，获得额外灵魂掉落', desc: '幽魂之王的王权象征。每当镰刀划过，都能听到无数灵魂的叹息。' },
  { id: 'mycelial_bow', name: '菌丝长弓', type: '弓', rarity: 'rare', dmg: { 物理: 90, 毒素: 35 }, scaling: { 敏捷: 'B' }, skill: '毒菌箭——射出会在地面留下毒菌毯的箭矢', desc: '弓身由菌丝母体的纤维编织而成，弓弦来自碧翠谷的巨型蜘蛛丝。' },
  { id: 'phoenix_talon', name: '凤凰之爪', type: '弯刀', rarity: 'legendary', dmg: { 物理: 120, 火焰: 90, 虚空: 40 }, scaling: { 敏捷: 'A', 智力: 'C' }, skill: '黑焰旋斩——旋转斩击释放黑焰之环', desc: '虚空凤凰的一根利爪被打磨成弯刀。刀身永远被暗色火焰包裹。' }
];

TDE_DATA.armor = [
  { id: 'knight_set', name: '骑士套装', type: '重甲', weight: 32, defense: { 物理: 180, 魔法: 90, 火焰: 70, 冰霜: 100, 虚空: 40 }, desc: '经典重甲。高韧性，翻滚距离短。' },
  { id: 'seeker_garb', name: '求道者之衣', type: '轻甲', weight: 12, defense: { 物理: 70, 魔法: 120, 火焰: 60, 冰霜: 80, 虚空: 100 }, desc: '轻质织物，提升机动性和无敌帧窗口。' },
  { id: 'void_robes', name: '虚空法袍', type: '轻甲', weight: 8, defense: { 物理: 40, 魔法: 160, 火焰: 50, 冰霜: 60, 虚空: 180 }, desc: '注入虚空能量的法袍。虚空法术伤害+15%。' },
  { id: 'penitent_set', name: '忏悔者圣衣', type: '中甲', weight: 20, defense: { 物理: 130, 魔法: 110, 火焰: 140, 冰霜: 70, 虚空: 60 }, desc: '受祝福的铠甲。生命值低于30%时缓慢恢复。' },
  { id: 'shade_wrap', name: '暗影缠布', type: '轻甲', weight: 6, defense: { 物理: 50, 魔法: 90, 火焰: 40, 冰霜: 50, 虚空: 130 }, desc: '近乎透明的缠绕布。消除脚步声，缩短被察觉距离。' },
  { id: 'warden_set', name: '守望者铠甲', type: '中甲', weight: 22, defense: { 物理: 150, 魔法: 80, 火焰: 90, 冰霜: 100, 虚空: 50 }, desc: '坚固的中型铠甲。长柄武器攻击范围+10%。' },
  { id: 'dragon_plate', name: '龙鳞重甲', type: '重甲', weight: 38, defense: { 物理: 220, 魔法: 100, 火焰: 180, 冰霜: 140, 虚空: 80 }, desc: '以枯萎龙的鳞片锻造的终极重甲。火焰抗性极高，但重量令大多数角色难以承受。' },
  { id: 'storm_mantle', name: '风暴披风', type: '轻甲', weight: 10, defense: { 物理: 60, 魔法: 140, 火焰: 50, 冰霜: 80, 虚空: 100 }, desc: '风暴海兽的表皮制成的披风。雷电伤害+12%，移动时留下电弧尾迹。' },
  { id: 'crimson_robe', name: '猩红礼装', type: '轻甲', weight: 7, defense: { 物理: 45, 魔法: 150, 火焰: 60, 冰霜: 50, 虚空: 170 }, desc: '血祭领主的礼服。击杀敌人时恢复8%生命值，但受到的火焰伤害+15%。' },
  { id: 'fungal_plate', name: '菌衣铠甲', type: '中甲', weight: 18, defense: { 物理: 120, 魔法: 100, 火焰: 40, 冰霜: 90, 虚空: 80 }, desc: '菌丝母体的纤维织成的铠甲。中毒免疫，附近的敌人持续受到微量毒素累积。' },
  { id: 'wraith_shroud', name: '幽魂裹布', type: '轻甲', weight: 4, defense: { 物理: 30, 魔法: 180, 火焰: 40, 冰霜: 120, 虚空: 150 }, desc: '幽魂之王残留的裹尸布。翻滚时短暂隐形（1.5秒），但物理防御极低。' }
];

TDE_DATA.talismans = [
  { id: 'dream_fragment', name: '梦境碎片', desc: '最大耐力+15%。一片被遗忘的梦的碎屑。', rarity: 'rare' },
  { id: 'void_heart', name: '虚空之心吊坠', desc: '虚空伤害+20%，但最大生命值-15%。', rarity: 'legendary' },
  { id: 'blightseed', name: '枯萎种子护符', desc: '敌人中毒累积速度+30%。', rarity: 'epic' },
  { id: 'crystal_tear', name: '水晶之泪', desc: '冰霜抗性+10%，免疫冰冻状态。', rarity: 'rare' },
  { id: 'ember_brand', name: '余烬烙印', desc: '火焰攻击附带3秒灼烧持续伤害。', rarity: 'epic' },
  { id: 'timeworn_gear', name: '时光齿轮', desc: '战技冷却时间-12%。', rarity: 'rare' },
  { id: 'silence_charm', name: '寂静咒符', desc: '完全消除脚步声。与重甲不兼容。', rarity: 'common' },
  { id: 'dragon_crest', name: '龙纹戒指', desc: '所有物理伤害-8%。', rarity: 'rare' },
  { id: 'phoenix_feather', name: '凤凰尾羽', desc: '死亡后原地满血复活一次，使用后破碎。', rarity: 'legendary' },
  { id: 'blood_ruby', name: '血族红宝石', desc: '每次击杀恢复最大生命值的8%。', rarity: 'epic' },
  { id: 'storm_pearl', name: '风暴明珠', desc: '雷电伤害+15%，雷电抗性+10%。', rarity: 'epic' },
  { id: 'mycelial_spore', name: '菌丝孢子囊', desc: '中毒状态下的敌人对你造成的伤害-20%。', rarity: 'rare' },
  { id: 'soul_prison', name: '囚魂笼', desc: '击杀敌人时获得的灵魂+25%，但最大生命值-10%。', rarity: 'rare' },
  { id: 'ironcore_band', name: '铁心戒指', desc: '韧性+30%，被击中后3秒内防御力+15%。', rarity: 'epic' }
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
  { id: 'bomb_ember', name: '余烬炸弹', desc: '投掷物，爆炸产生火焰范围伤害。', rarity: 'common' },
  { id: 'lightning_urn', name: '雷电瓮', desc: '投掷物，破碎后释放大范围雷电脉冲，对湿身目标伤害翻倍。', rarity: 'common' },
  { id: 'bleed_bandage', name: '止血绷带', desc: '立即解除出血异常状态。', rarity: 'common' },
  { id: 'sedative', name: '镇静剂', desc: '解除疯狂异常状态，并提供30秒疯狂免疫。', rarity: 'rare' },
  { id: 'warming_stone', name: '暖身石', desc: '解除冰霜异常状态，并提供60秒冰霜抗性+15%。', rarity: 'common' },
  { id: 'focus_draught', name: '专注灵药', desc: '恢复全部专注值(FP)。', rarity: 'rare' },
  { id: 'elixir_flame', name: '火焰灵药', desc: '180秒内火焰伤害+20%，但冰霜抗性-15%。', rarity: 'epic' },
  { id: 'homeward_bone', name: '归途骨片', desc: '捏碎后立即返回上一次休息的余烬祭坛。不丢失灵魂。', rarity: 'common' },
  { id: 'dream_incense', name: '梦境香', desc: '在任意位置使用，临时开启通往梦海的传送门（一次性）。', rarity: 'epic' }
];
