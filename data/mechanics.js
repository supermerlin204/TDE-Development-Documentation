// 无眠纪 — 异常状态与伤害类型数据
TDE_DATA.statusEffects = [
  { name: '出血', icon: 'bleed', buildup: '累积型', effect: '累积满：立即损失30%最大生命值', cure: '止血绷带 / 自然消退' },
  { name: '中毒', icon: 'poison', buildup: '累积型', effect: '每秒损失4%最大生命值，持续15秒', cure: '枯萎解药 / 自然消退' },
  { name: '冰霜', icon: 'frost', buildup: '累积型', effect: '累积满：冻结2秒，期间受伤+20%', cure: '暖身 / 自然消退' },
  { name: '诅咒', icon: 'curse', buildup: '永久', effect: '每层降低5%最大生命值（最多5层）', cure: '人形化身' },
  { name: '疯狂', icon: 'madness', buildup: '累积型', effect: '累积满：画面扭曲，操作混乱3秒', cure: '镇静剂 / 自然消退' }
];

TDE_DATA.damageMatrix = [
  { type: '物理', slash: '', strike: '', pierce: '', fire: '弱', frost: '', lightning: '', void: '抗', holy: '', poison: '' },
  { type: '火焰', slash: '', strike: '', pierce: '', fire: '免', frost: '弱', lightning: '', void: '', holy: '抗', poison: '' },
  { type: '冰霜', slash: '', strike: '弱', pierce: '', fire: '抗', frost: '免', lightning: '', void: '', holy: '', poison: '' },
  { type: '雷电', slash: '', strike: '', pierce: '弱', fire: '', frost: '', lightning: '抗', void: '弱', holy: '', poison: '' },
  { type: '虚空', slash: '', strike: '', pierce: '', fire: '', frost: '', lightning: '', void: '抗', holy: '弱', poison: '' },
  { type: '神圣', slash: '', strike: '', pierce: '', fire: '', frost: '', lightning: '', void: '弱', holy: '抗', poison: '' }
];
