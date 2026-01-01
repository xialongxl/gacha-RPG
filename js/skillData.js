// ==================== 技能数据层 ====================
// 此文件只包含纯数据定义，无逻辑代码

// ==================== 队长加成配置 ====================

export const LEADER_BONUS = {
  '铃兰': {
    skill: '狐火渺然',
    costReduce: 10,
    healBonus: 0.05,
    debuffBonus: 0.05,
    extraEffects: [
      { type: 'buff', stat: 'atk', multiplier: 0.1, target: 'all_ally' }
    ]
  },
  '缪尔赛思': {
    skill: '浅层非熵适应',
    costReduce: 10,
    extraEffects: [
      { type: 'summon_buff', buffType: 'atkMultiplier', value: 0.1 }  // 额外+10% ATK给召唤物
    ]
  }
};

// ==================== 技能数据 ====================

export const SKILL_EFFECTS = {
  // ========== 通用技能 ==========
  '普攻': {
    cost: 0,
    gain: 30,
    target: 'single',
    desc: '造成100%攻击力伤害，获得30能量',
    effects: [
      { type: 'damage', multiplier: 1.0 }
    ]
  },

  // ========== 伤害技能 ==========
  '奥义·终结': {
    cost: 100,
    gain: 0,
    target: 'single',
    desc: '消耗100能量，造成250%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 2.5 }
    ]
  },
  '赤霄·拔刀': {
    cost: 80,
    gain: 0,
    target: 'single',
    desc: '消耗80能量，造成200%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 2.0 }
    ]
  },
  '真银斩': {
    cost: 100,
    gain: 0,
    target: 'all',
    desc: '消耗100能量，对所有敌人造成150%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.5 }
    ]
  },
  '旧火山': {
    cost: 100,
    gain: 0,
    target: 'all',
    desc: '消耗100能量，对所有敌人造成220%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 2.2 }
    ]
  },
  '处决': {
    cost: 100,
    gain: 0,
    target: 'single',
    desc: '消耗100能量，造成300%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 3.0 }
    ]
  },
  'Mon3tr': {
    cost: 80,
    gain: 0,
    target: 'single',
    desc: '消耗80能量，召唤Mon3tr造成200%伤害',
    effects: [
      { type: 'damage', multiplier: 2.0 }
    ]
  },
  '剑雨': {
    cost: 50,
    gain: 0,
    target: 'all',
    desc: '消耗50能量，对所有敌人造成130%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.3 }
    ]
  },
  '毒刺': {
    cost: 40,
    gain: 0,
    target: 'single',
    desc: '消耗40能量，造成180%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.8 }
    ]
  },
  '连射': {
    cost: 50,
    gain: 0,
    target: 'random3',
    desc: '消耗50能量，随机攻击3次，每次60%攻击力',
    effects: [
      { type: 'damage', multiplier: 0.6 }
    ]
  },
  '灼烧': {
    cost: 40,
    gain: 0,
    target: 'all',
    desc: '消耗40能量，对所有敌人造成120%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.2 }
    ]
  },

  // ========== 艾雅法拉专属技能 ==========
  '二重咏唱': {
    cost: 20,
    gain: 0,
    target: 'self',
    desc: '消耗20能量，SPD+60。第二次起额外ATK+60%（可叠加）',
    effects: [
      { type: 'buff', stat: 'spd', value: 60 },
      { type: 'stacking_atk_buff', multiplier: 0.6, minUses: 2 }
    ]
  },
  '点燃': {
    cost: 30,
    gain: 0,
    target: 'single',
    desc: '消耗30能量，造成370%伤害，周围敌人受185%溅射伤害，目标DEF-25%持续2回合',
    effects: [
      { type: 'damage', multiplier: 3.7 },
      { type: 'splash_damage', multiplier: 1.85 },
      { type: 'debuff_duration', stat: 'def', multiplier: 0.25, duration: 2 }
    ]
  },
  '火山': {
    cost: 100,
    gain: 0,
    target: 'random6',
    desc: '消耗100能量，ATK+130%后随机攻击6个敌人',
    effects: [
      { type: 'self_buff_then_attack', atkBonus: 1.3 },
      { type: 'damage', multiplier: 1.0 }
    ]
  },
  '眩晕': {
    cost: 50,
    gain: 0,
    target: 'single',
    desc: '消耗50能量，造成100%伤害并眩晕',
    effects: [
      { type: 'damage', multiplier: 1.0 },
      { type: 'stun', duration: 1 }
    ]
  },
  '突刺': {
    cost: 30,
    gain: 0,
    target: 'single',
    desc: '消耗30能量，造成140%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.4 }
    ]
  },
  '连斩': {
    cost: 30,
    gain: 0,
    target: 'random2',
    desc: '消耗30能量，随机攻击2次，每次50%攻击力',
    effects: [
      { type: 'damage', multiplier: 0.5 }
    ]
  },
  '钩索': {
    cost: 30,
    gain: 0,
    target: 'single',
    desc: '消耗30能量，造成120%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.2 }
    ]
  },
  '投掷': {
    cost: 40,
    gain: 0,
    target: 'single',
    desc: '消耗40能量，造成150%攻击力伤害',
    effects: [
      { type: 'damage', multiplier: 1.5 }
    ]
  },

  // ========== 破盾技能 ==========
  '破甲斩': {
    cost: 40,
    gain: 0,
    target: 'single',
    desc: '消耗40能量，造成120%伤害，破盾2格',
    effects: [
      { type: 'damage', multiplier: 1.2 },
      { type: 'shield_break', amount: 2 }
    ]
  },
  '重锤': {
    cost: 60,
    gain: 0,
    target: 'single',
    desc: '消耗60能量，造成150%伤害，破盾3格',
    effects: [
      { type: 'damage', multiplier: 1.5 },
      { type: 'shield_break', amount: 3 }
    ]
  },
  '粉碎': {
    cost: 80,
    gain: 0,
    target: 'single',
    desc: '消耗80能量，造成180%伤害，破盾4格',
    effects: [
      { type: 'damage', multiplier: 1.8 },
      { type: 'shield_break', amount: 4 }
    ]
  },

  // ========== 治疗技能 ==========
  '治疗': {
    cost: 40,
    gain: 0,
    target: 'ally',
    desc: '消耗40能量，恢复目标150%攻击力的生命',
    effects: [
      { type: 'heal', multiplier: 1.5 }
    ]
  },
  '群疗': {
    cost: 80,
    gain: 0,
    target: 'all_ally',
    desc: '消耗80能量，恢复所有队友80%攻击力的生命',
    effects: [
      { type: 'heal', multiplier: 0.8 }
    ]
  },

  // ========== 夜莺专属技能 ==========
  '医疗普攻': {
    cost: 0,
    gain: 30,
    target: 'ally',
    desc: '治疗选定的队友，恢复100%攻击力HP，获得30能量',
    effects: [
      { type: 'heal', multiplier: 1.0 }
    ]
  },
  '治疗强化·γ型': {
    cost: 30,
    gain: 0,
    target: 'self',
    desc: '消耗30能量，自身ATK+90%（可叠加），大幅提升治疗强度',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.9 }
    ]
  },
  '法术护盾': {
    cost: 50,
    gain: 0,
    target: 'all_ally',
    chargeSkill: true,      // 充能技能标记
    maxCharges: 3,          // 最大充能层数
    chargeInterval: 2,      // 每2回合获得1层充能
    desc: '消耗50能量和1层充能，为全体队友施加护盾（90%ATK），DEF+20%持续3回合',
    effects: [
      { type: 'team_temp_shield', multiplier: 0.9 },
      { type: 'team_buff_duration', stat: 'def', multiplier: 0.2, duration: 3 }
    ]
  },
  '圣域': {
    cost: 80,
    gain: 0,
    target: 'self',
    desc: '消耗80能量，ATK+80%，普攻变为群体治疗，全体队友获得25%闪避率+DEF+50%（3回合）',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.8 },
      { type: 'sanctuary_mode' },
      { type: 'team_buff_duration', stat: 'dodge', value: 0.25, duration: 3 },
      { type: 'team_buff_duration', stat: 'def', multiplier: 0.5, duration: 3 }
    ]
  },

  // ========== 增益技能 ==========
  '战吼': {
    cost: 50,
    gain: 0,
    target: 'all_ally',
    desc: '消耗50能量，提升全体攻击力30%',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.3 }
    ]
  },
  '强化': {
    cost: 30,
    gain: 0,
    target: 'self',
    desc: '消耗30能量，提升自身攻击力50%',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.5 }
    ]
  },
  '潜行': {
    cost: 30,
    gain: 0,
    target: 'self',
    desc: '消耗30能量，提升自身攻击力50%',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.5 }
    ]
  },

  // ========== 铃兰技能 ==========
  '全力以赴': {
    cost: 20,
    gain: 0,
    target: 'self',
    desc: '消耗20能量，自身攻击力+80%，速度+30',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.8 },
      { type: 'buff', stat: 'spd', value: 30 }
    ]
  },
  '儿时的舞乐': {
    cost: 80,
    gain: 0,
    target: 'random3',
    desc: '消耗80能量，攻击力+60%，同时攻击3个敌方单位',
    effects: [
      { type: 'damage', multiplier: 1.6 }
    ]
  },
  '狐火渺然': {
    cost: 70,
    gain: 0,
    target: 'all',
    desc: '消耗70能量，全体队友回复20%攻击力的HP，敌人全体减速30%(2回合)',
    effects: [
      { type: 'heal', multiplier: 0.2, target: 'all_ally' },
      { type: 'debuff_duration', stat: 'spd', multiplier: 0.3, target: 'all_enemy', duration: 2 }
    ]
  },

  // ========== 缪尔赛思技能 ==========
  '渐进性润化': {
    cost: 30,
    gain: 0,
    target: 'self',
    desc: '消耗30能量，全队回复15能量，自身与流形ATK+40%、SPD+20（可叠加）',
    effects: [
      { type: 'team_energy', amount: 15 },
      { type: 'summon_buff', buffType: 'atkMultiplier', value: 0.4 },
      { type: 'summon_buff', buffType: 'spdFlat', value: 20 },
      { type: 'owner_buff', buffType: 'atkMultiplier', value: 0.4 },
      { type: 'owner_buff', buffType: 'spdFlat', value: 20 }
    ]
  },
  '生态耦合': {
    cost: 50,
    gain: 0,
    target: 'self',
    desc: '消耗50能量，全队回复20能量，自身与流形每回合回复15%HP(持续5回合) ，流形普攻变为二连击(持续3回合)',
    effects: [
      { type: 'team_energy', amount: 20 },
      { type: 'owner_buff', buffType: 'healPerTurn', value: 0.15, duration: 5 },
      { type: 'summon_buff', buffType: 'healPerTurn', value: 0.15, duration: 5 },
      { type: 'summon_buff', buffType: 'doubleAttack', value: true, duration: 3 }
    ]
  },
  '浅层非熵适应': {
    cost: 70,
    gain: 0,
    target: 'self',
    desc: '消耗70能量，全队回复25能量，自身与流形ATK+50%，流形普攻附带眩晕(持续2回合)',
    effects: [
      { type: 'team_energy', amount: 25 },
      { type: 'owner_buff', buffType: 'atkMultiplier', value: 0.5 },
      { type: 'summon_buff', buffType: 'atkMultiplier', value: 0.5 },
      { type: 'summon_buff', buffType: 'stunOnHit', value: true, duration: 2 }
    ]
  },

  // ========== 敌人技能 ==========
  '火球': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '对单体造成150%伤害',
    effects: [
      { type: 'damage', multiplier: 1.5 }
    ]
  },
  '烈焰风暴': {
    cost: 0,
    gain: 0,
    target: 'all_enemy',
    desc: '对全体造成120%伤害',
    effects: [
      { type: 'damage', multiplier: 1.2 }
    ]
  },
  '重击': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '对单体造成200%伤害',
    effects: [
      { type: 'damage', multiplier: 2.0 }
    ]
  },
  '横扫': {
    cost: 0,
    gain: 0,
    target: 'all_enemy',
    desc: '对全体造成100%伤害',
    effects: [
      { type: 'damage', multiplier: 1.0 }
    ]
  },
  '瞄准射击': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '对单体造成250%伤害',
    effects: [
      { type: 'damage', multiplier: 2.5 }
    ]
  },
  '盾击': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '造成130%伤害',
    effects: [
      { type: 'damage', multiplier: 1.3 }
    ]
  },
  '双刀斩': {
    cost: 0,
    gain: 0,
    target: 'random2',
    desc: '随机攻击2次',
    effects: [
      { type: 'damage', multiplier: 0.8 }
    ]
  },
  '暗影箭': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '对单体造成180%伤害',
    effects: [
      { type: 'damage', multiplier: 1.8 }
    ]
  },
  '死亡宣告': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '对单体造成300%伤害',
    effects: [
      { type: 'damage', multiplier: 3.0 }
    ]
  },
  '战地治疗': {
    cost: 0,
    gain: 0,
    target: 'ally_lowest',
    desc: '治疗血量最低的友军',
    effects: [
      { type: 'heal', multiplier: 2.0 }
    ]
  },
  '群体治疗': {
    cost: 0,
    gain: 0,
    target: 'all_ally_enemy',
    desc: '治疗全体友军',
    effects: [
      { type: 'heal', multiplier: 1.0 }
    ]
  },
  '鼓舞': {
    cost: 0,
    gain: 0,
    target: 'self',
    desc: '提升自身攻击力30%',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.3 }
    ]
  },
  '狂暴': {
    cost: 0,
    gain: 0,
    target: 'self',
    desc: '提升自身攻击力50%',
    effects: [
      { type: 'buff', stat: 'atk', multiplier: 0.5 }
    ]
  },
  '诅咒': {
    cost: 0,
    gain: 0,
    target: 'single',
    desc: '降低目标防御30%',
    effects: [
      { type: 'debuff', stat: 'def', multiplier: 0.3 }
    ]
  }
};