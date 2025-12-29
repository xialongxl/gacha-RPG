// ==================== 队长加成配置 ====================

const LEADER_BONUS = {
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
      { type: 'summon_buff', buffType: 'atkPercent', value: 10 }  // 额外+10% ATK给召唤物
    ]
  }
};

// ==================== 技能数据 ====================

const SKILL_EFFECTS = {
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
      { type: 'team_buff_duration', stat: 'dodge', value: 25, duration: 3 },
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
      { type: 'summon_buff', buffType: 'atkPercent', value: 40 },
      { type: 'summon_buff', buffType: 'spdFlat', value: 20 },
      { type: 'owner_buff', buffType: 'atkPercent', value: 40 },
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
      { type: 'owner_buff', buffType: 'healPerTurn', value: 15, duration: 5 },
      { type: 'summon_buff', buffType: 'healPerTurn', value: 15, duration: 5 },
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
      { type: 'owner_buff', buffType: 'atkPercent', value: 50 },
      { type: 'summon_buff', buffType: 'atkPercent', value: 50 },
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

// ==================== 技能执行（纯计算） ====================

/**
 * 获取队长加成后的技能消耗
 * @param {string} skillName - 技能名
 * @param {Object} user - 使用者
 * @returns {number} 实际消耗
 */
function getSkillCost(skillName, user) {
  const skill = SKILL_EFFECTS[skillName];
  if (!skill) return 0;
  
  let cost = skill.cost;
  
  // 队长加成减少消耗
  if (user.isLeader && LEADER_BONUS[user.name]) {
    const bonus = LEADER_BONUS[user.name];
    if (skillName === bonus.skill && bonus.costReduce) {
      cost = Math.max(0, cost - bonus.costReduce);
    }
  }
  
  return cost;
}

/**
 * 获取单位实际ATK（含所有buff）
 * @param {Object} unit - 单位
 * @returns {number} 实际ATK
 */
function getUnitAtk(unit) {
  let atk = unit.atk;
  
  // 固定值加成
  if (unit.buffAtk) {
    atk += unit.buffAtk;
  }
  
  // 百分比加成（干员）
  if (unit.buffAtkPercent) {
    atk = Math.floor(atk * (1 + unit.buffAtkPercent / 100));
  }
  
  // 召唤物专属buff
  if (unit.isSummon && unit.buffs) {
    atk = Math.floor(atk * (1 + (unit.buffs.atkPercent || 0) / 100));
  }
  
  return atk;
}

/**
 * 执行技能效果
 * @param {Object} skill - 技能数据
 * @param {Object} user - 使用者
 * @param {Object} target - 目标（可为null）
 * @param {boolean} isEnemy - 是否敌人使用
 * @returns {Object} 执行结果
 */
function executeSkillEffects(skill, user, target, isEnemy) {
  const result = {
    logs: [],
    deaths: [],
    energyChanges: [],
    shieldBreaks: []
  };
  
  // 复制技能效果
  let effects = skill.effects.map(e => ({ ...e }));
  
  // 检查队长加成
  if (!isEnemy && user.isLeader && LEADER_BONUS[user.name]) {
    const bonus = LEADER_BONUS[user.name];
    if (skill.name === bonus.skill) {
      result.logs.push({ text: `👑 队长技能加成！`, type: 'system' });
      
      // 修改效果
      effects = effects.map(effect => {
        const newEffect = { ...effect };
        if (effect.type === 'heal' && bonus.healBonus) {
          newEffect.multiplier = (effect.multiplier || 0) + bonus.healBonus;
        }
        if (effect.type === 'debuff' && bonus.debuffBonus) {
          newEffect.multiplier = (effect.multiplier || 0) + bonus.debuffBonus;
        }
        return newEffect;
      });
      
      // 添加额外效果
      if (bonus.extraEffects) {
        effects = [...effects, ...bonus.extraEffects];
      }
    }
  }
  
  // 获取实际ATK
  const atk = getUnitAtk(user);
  
  effects.forEach(effect => {
    const effectTarget = effect.target || skill.target;
    
    switch (effect.type) {
      case 'damage':
        executeDamageEffect(effect, user, atk, target, effectTarget, isEnemy, result);
        break;
      case 'heal':
        executeHealEffect(effect, user, atk, target, effectTarget, isEnemy, result);
        break;
      case 'buff':
        executeBuffEffect(effect, user, atk, effectTarget, isEnemy, result);
        break;
      case 'debuff':
        executeDebuffEffect(effect, user, atk, target, effectTarget, isEnemy, result);
        break;
      case 'stun':
        executeStunEffect(effect, target, effectTarget, isEnemy, result);
        break;
      case 'shield_break':
        executeShieldBreakEffect(effect, target, effectTarget, isEnemy, result);
        break;
      // ====== 新增：召唤系统相关效果 ======
      case 'team_energy':
        executeTeamEnergyEffect(effect, user, isEnemy, result);
        break;
      case 'summon_buff':
        executeSummonBuffEffect(effect, user, result);
        break;
      case 'owner_buff':
        executeOwnerBuffEffect(effect, user, result);
        break;
      // ====== 艾雅法拉专属效果 ======
      case 'stacking_atk_buff':
        executeStackingAtkBuff(effect, user, skill, result);
        break;
      case 'splash_damage':
        executeSplashDamage(effect, user, atk, target, isEnemy, result);
        break;
      case 'debuff_duration':
        executeDebuffDuration(effect, target, result);
        break;
      case 'self_buff_then_attack':
        executeSelfBuffThenAttack(effect, user, result);
        break;
      // ====== 夜莺专属效果 ======
      case 'team_temp_shield':
        executeTeamTempShield(effect, user, atk, isEnemy, result);
        break;
      case 'team_buff_duration':
        executeTeamBuffDuration(effect, user, isEnemy, result);
        break;
      case 'sanctuary_mode':
        executeSanctuaryMode(user, result);
        break;
    }
  });
  
  return result;
}

// ==================== 词缀效果系统 ====================

/**
 * 检查是否有词缀
 */
function hasAffix(unit, affixName) {
  return unit.affixes && unit.affixes.includes(affixName);
}

/**
 * 获取词缀配置
 */
function getAffixConfig(affixName) {
  return CONFIG.AFFIX?.TYPES?.[affixName] || null;
}

/**
 * 处理闪避词缀
 * @returns {boolean} 是否闪避成功
 */
function processAffixDodge(target, result) {
  if (!hasAffix(target, 'dodge')) return false;
  
  const dodgeConfig = getAffixConfig('dodge');
  if (!dodgeConfig) return false;
  
  const roll = Math.random() * 100;
  if (roll < dodgeConfig.value) {
    result.logs.push({ text: `  💫 ${target.name} 闪避了攻击！`, type: 'system' });
    return true;
  }
  return false;
}

/**
 * 处理词缀护盾（首次受击伤害减少50%，一次性效果）
 */
function processAffixShield(target, damage, result) {
  // 检查是否有护盾词缀且未使用
  if (!hasAffix(target, 'shield')) return damage;
  if (target.affixState?.shieldUsed) return damage;
  
  const shieldConfig = getAffixConfig('shield');
  if (!shieldConfig) return damage;
  
  // 标记护盾已使用
  if (!target.affixState) target.affixState = {};
  target.affixState.shieldUsed = true;
  
  // 计算减伤
  const reduction = shieldConfig.value / 100;  // 50%
  const reducedDamage = Math.floor(damage * (1 - reduction));
  const absorbed = damage - reducedDamage;
  
  result.logs.push({ 
    text: `  🔰 ${target.name}【护盾】首次受击减伤${shieldConfig.value}%！（-${absorbed}伤害）`, 
    type: 'system' 
  });
  
  return reducedDamage;
}

/**
 * 处理不死词缀
 */
function processAffixUndying(target, result) {
  if (!hasAffix(target, 'undying')) return false;
  if (target.affixState?.undyingTriggered) return false;
  
  const undyingConfig = getAffixConfig('undying');
  if (!undyingConfig) return false;
  
  // 标记已触发
  if (!target.affixState) target.affixState = {};
  target.affixState.undyingTriggered = true;
  
  // 恢复HP
  const healAmount = Math.floor(target.maxHp * undyingConfig.value / 100);
  target.currentHp = healAmount;
  
  result.logs.push({ 
    text: `  💀 ${target.name} 触发【不死】！恢复 ${healAmount} HP！`, 
    type: 'system' 
  });
  
  return true;
}

/**
 * 处理反伤词缀
 */
function processAffixThorns(target, attacker, damage, result) {
  if (!hasAffix(target, 'thorns')) return;
  if (target.currentHp <= 0) return;
  
  const thornsConfig = getAffixConfig('thorns');
  if (!thornsConfig) return;
  
  const reflectDamage = Math.floor(damage * thornsConfig.value / 100);
  if (reflectDamage > 0) {
    attacker.currentHp -= reflectDamage;
    result.logs.push({ 
      text: `  🦔 ${target.name} 反弹 ${reflectDamage} 伤害给 ${attacker.name}！`, 
      type: 'damage' 
    });
  }
}

/**
 * 处理吸血词缀
 */
function processAffixVampiric(attacker, damage, result) {
  if (!hasAffix(attacker, 'vampiric')) return;
  
  const vampConfig = getAffixConfig('vampiric');
  if (!vampConfig) return;
  
  const healAmount = Math.floor(damage * vampConfig.value / 100);
  if (healAmount > 0) {
    const oldHp = attacker.currentHp;
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
    const actualHeal = attacker.currentHp - oldHp;
    
    if (actualHeal > 0) {
      result.logs.push({ 
        text: `  🩸 ${attacker.name} 吸血恢复 ${actualHeal} HP！`, 
        type: 'heal' 
      });
    }
  }
}

/**
 * 获取狂化攻击加成
 */
function getAffixBerserkBonus(unit) {
  if (!hasAffix(unit, 'berserk')) return 0;
  
  const berserkConfig = getAffixConfig('berserk');
  if (!berserkConfig) return 0;
  
  const hpPercent = (unit.currentHp / unit.maxHp) * 100;
  
  if (hpPercent < berserkConfig.threshold) {
    // 标记狂化激活
    if (!unit.affixState) unit.affixState = {};
    if (!unit.affixState.berserkActive) {
      unit.affixState.berserkActive = true;
    }
    return berserkConfig.value / 100;
  }
  
  return 0;
}

/**
 * 处理连击词缀
 * @returns {number} 攻击次数
 */
function getAffixMultiStrikeCount(unit, skillName) {
  // 只对普攻生效
  if (skillName !== '普攻') return 1;
  if (!hasAffix(unit, 'multiStrike')) return 1;
  
  const multiConfig = getAffixConfig('multiStrike');
  if (!multiConfig) return 1;
  
  const roll = Math.random() * 100;
  if (roll < multiConfig.value) {
    return 2;  // 连击成功，攻击2次
  }
  return 1;
}

/**
 * 处理回合开始时的词缀效果（回血等）
 */
function processAffixTurnStart(unit, result) {
  if (!unit.affixes || unit.affixes.length === 0) return;
  
  // 回血词缀
  if (hasAffix(unit, 'regen')) {
    const regenConfig = getAffixConfig('regen');
    if (regenConfig) {
      const healAmount = Math.floor(unit.maxHp * regenConfig.value / 100);
      const oldHp = unit.currentHp;
      unit.currentHp = Math.min(unit.maxHp, unit.currentHp + healAmount);
      const actualHeal = unit.currentHp - oldHp;
      
      if (actualHeal > 0) {
        result.logs.push({ 
          text: `  💚 ${unit.name}【回血】恢复 ${actualHeal} HP！`, 
          type: 'heal' 
        });
      }
    }
  }
  
  // 狂化状态提示
  if (hasAffix(unit, 'berserk') && unit.affixState?.berserkActive) {
    const berserkConfig = getAffixConfig('berserk');
    if (berserkConfig) {
      result.logs.push({ 
        text: `  😤 ${unit.name}【狂化】攻击力+${berserkConfig.value}%！`, 
        type: 'system' 
      });
    }
  }
}

/**
 * 处理死亡时的词缀效果（分裂、爆炸）
 */
function processAffixOnDeath(unit, result) {
  if (!unit.affixes || unit.affixes.length === 0) return [];
  
  const newUnits = [];
  
  // 爆炸词缀
  if (hasAffix(unit, 'explosion')) {
    const explosionConfig = getAffixConfig('explosion');
    if (explosionConfig) {
      const explosionDamage = Math.floor(unit.maxHp * explosionConfig.value / 100);
      
      result.logs.push({ 
        text: `  💥 ${unit.name} 触发【爆炸】！`, 
        type: 'system' 
      });
      
      // 对所有我方单位造成伤害
      const targets = [...battle.allies, ...battle.summons].filter(u => u.currentHp > 0);
      targets.forEach(t => {
        t.currentHp -= explosionDamage;
        result.logs.push({ 
          text: `  → ${t.name} 受到 ${explosionDamage} 爆炸伤害！`, 
          type: 'damage' 
        });
      });
    }
  }
  
  // 分裂词缀
  if (hasAffix(unit, 'split')) {
    const splitConfig = getAffixConfig('split');
    if (splitConfig) {
      const splitCount = splitConfig.value || 2;
      
      result.logs.push({ 
        text: `  👥 ${unit.name} 触发【分裂】！分裂为 ${splitCount} 个小型单位！`, 
        type: 'system' 
      });
      
      // 创建分裂单位（属性减半）
      for (let i = 0; i < splitCount; i++) {
        const splitUnit = {
          id: `${unit.id}_split_${i}`,
          name: `${unit.name}(分裂)`,
          hp: Math.floor(unit.maxHp * 0.3),
          atk: Math.floor(unit.atk * 0.5),
          def: Math.floor(unit.def * 0.5),
          spd: unit.spd,
          skills: ['普攻'],
          currentHp: Math.floor(unit.maxHp * 0.3),
          maxHp: Math.floor(unit.maxHp * 0.3),
          energy: 0,
          maxEnergy: 100,
          buffAtk: 0,
          buffAtkPercent: 0,
          buffSpd: 0,
          stunDuration: 0,
          shield: 0,
          currentShield: 0,
          shieldBroken: false,
          originalDef: Math.floor(unit.def * 0.5),
          isEnemy: true,
          isSummon: false,
          affixes: [],  // 分裂单位没有词缀
          enemyType: 'normal',
          unitId: `enemy-split-${Date.now()}-${i}`
        };
        newUnits.push(splitUnit);
      }
    }
  }
  
  return newUnits;
}

// ==================== 伤害效果 ====================

function executeDamageEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  // 计算狂化加成
  const berserkBonus = getAffixBerserkBonus(user);
  const effectiveAtk = Math.floor(atk * (1 + berserkBonus));
  
  // 暴击判定（玩家Roguelike强化）
  const critBonus = user.critBonus || 0;  // 小数形式，如0.15表示15%
  let isCrit = false;
  if (!isEnemy && critBonus > 0) {
    isCrit = Math.random() < critBonus;  // 直接用小数比较，0.15就是15%概率
  }
  const critMultiplier = isCrit ? 1.5 : 1.0;  // 暴击伤害 +50%
  
  const calcDamage = (t) => {
    const shieldReduction = (t.currentShield > 0 && !t.shieldBroken) ? 0.5 : 1;
    let dmg = Math.floor(effectiveAtk * effect.multiplier * shieldReduction - t.def * 0.5);
    dmg = Math.floor(dmg * critMultiplier);  // 应用暴击
    return Math.max(1, dmg);
  };
  
  // 敌人攻击我方（包含召唤物），我方攻击敌人
  const enemies = isEnemy ? [...battle.allies, ...battle.summons] : battle.enemies;
  
  const applyDamage = (t) => {
    // 处理闪避词缀（敌人专属）
    if (processAffixDodge(t, result)) {
      return;  // 闪避成功，不造成伤害
    }
    
    // 处理玩家闪避（圣域效果）
    if (isEnemy && !t.isEnemy && typeof checkPlayerDodge === 'function') {
      if (checkPlayerDodge(t, result)) {
        return;  // 玩家闪避成功
      }
    }
    
    let dmg = calcDamage(t);
    
    // 处理词缀护盾
    dmg = processAffixShield(t, dmg, result);
    
    if (dmg <= 0) return;
    
    // 处理Roguelike临时护盾（玩家单位）
    if (!t.isEnemy && t.tempShield && t.tempShield > 0) {
      if (t.tempShield >= dmg) {
        t.tempShield -= dmg;
        result.logs.push({ 
          text: `  🔰 ${t.name} 护盾吸收 ${dmg} 伤害！（剩余护盾: ${t.tempShield}）`, 
          type: 'system' 
        });
        return;  // 伤害完全被护盾吸收
      } else {
        const absorbed = t.tempShield;
        dmg -= t.tempShield;
        t.tempShield = 0;
        result.logs.push({ 
          text: `  🔰 ${t.name} 护盾吸收 ${absorbed} 伤害并破碎！`, 
          type: 'system' 
        });
      }
    }
    
    t.currentHp -= dmg;
    
    const unitPrefix = t.isSummon ? '🔮' : '';
    const critText = isCrit ? '💥暴击！' : '';
    result.logs.push({ text: `  → ${unitPrefix}${t.name} 受到 ${dmg} 伤害！${critText}`, type: 'damage' });
    
    // 处理不死词缀
    if (t.currentHp <= 0) {
      if (processAffixUndying(t, result)) {
        // 不死触发，单位存活
      }
    }
    
    // 处理反伤词缀
    processAffixThorns(t, user, dmg, result);
    
    // 处理吸血词缀（敌人词缀）
    processAffixVampiric(user, dmg, result);
    
    // 处理玩家Roguelike吸血强化（非敌人使用时）
    if (!isEnemy && user.vampBonus && user.vampBonus > 0) {
      const vampHeal = Math.floor(dmg * user.vampBonus);  // 小数形式，0.10就是10%吸血
      if (vampHeal > 0) {
        const oldHp = user.currentHp;
        user.currentHp = Math.min(user.maxHp, user.currentHp + vampHeal);
        const actualHeal = user.currentHp - oldHp;
        if (actualHeal > 0) {
          result.logs.push({ 
            text: `  💉 ${user.name} 吸血恢复 ${actualHeal} HP！`, 
            type: 'heal' 
          });
        }
      }
    }
    
    // 普通攻击破盾1格（仅对敌人有效）
    if (!isEnemy && t.currentShield > 0 && !t.shieldBroken) {
      t.currentShield = Math.max(0, t.currentShield - 1);
      result.logs.push({ 
        text: `  → ${t.name} 护盾 -1（剩余 ${t.currentShield}/${t.shield}）`, 
        type: 'system' 
      });
      
      if (t.currentShield <= 0) {
        t.shieldBroken = true;
        t.stunDuration = (t.stunDuration || 0) + 1;
        t.originalDef = t.def;
        t.def = 0;
        
        result.shieldBreaks.push(t);
        result.logs.push({ 
          text: `  💥 ${t.name} 护盾破碎！眩晕1回合，防御归零！`, 
          type: 'damage' 
        });
      }
    }
    
    // 召唤物攻击附带眩晕（只对敌人生效）
    if (user.isSummon && user.buffs && user.buffs.stunOnHit && t.isEnemy) {
      t.stunDuration = (t.stunDuration || 0) + 1;
      result.logs.push({ text: `  → ${t.name} 被眩晕 1 回合！`, type: 'system' });
    }
    
    // 被攻击者获得能量（仅我方干员，不含召唤物）
    if (!t.isEnemy && !t.isSummon && t.currentHp > 0) {
      t.energy = Math.min(t.maxEnergy, t.energy + 20);
      result.energyChanges.push({ unit: t, amount: 20 });
    }
  };
  
  // 连击处理：召唤物二连击 或 敌人multiStrike词缀
  let attackCount = 1;
  
  // 召唤物二连击
  if (user.isSummon && user.buffs && user.buffs.doubleAttack) {
    attackCount = 2;
  }
  
  // 敌人multiStrike词缀（仅普攻生效）
  if (user.isEnemy && effect.multiplier === 1.0) {  // 普攻倍率1.0
    const multiStrikeCount = getAffixMultiStrikeCount(user, '普攻');
    if (multiStrikeCount > attackCount) {
      attackCount = multiStrikeCount;
    }
  }
  
  for (let attackIndex = 0; attackIndex < attackCount; attackIndex++) {
    if (attackCount > 1) {
      result.logs.push({ text: `  [第${attackIndex + 1}次攻击]`, type: 'system' });
    }
    
    switch (effectTarget) {
      case 'single':
        if (target && target.currentHp > 0) applyDamage(target);
        break;
        
      case 'all':
      case 'all_enemy':
        enemies.filter(e => e.currentHp > 0).forEach(applyDamage);
        break;
        
      case 'random2':
      case 'random3':
      case 'random6':
        const times = effectTarget === 'random6' ? 6 : (effectTarget === 'random3' ? 3 : 2);
        for (let i = 0; i < times; i++) {
          const alive = enemies.filter(e => e.currentHp > 0);
          if (alive.length === 0) break;
          const t = alive[Math.floor(Math.random() * alive.length)];
          applyDamage(t);
        }
        break;
    }
  }
}

// ==================== 护盾破坏效果 ====================

function executeShieldBreakEffect(effect, target, effectTarget, isEnemy, result) {
  const enemies = isEnemy ? battle.allies : battle.enemies;
  
  const applyShieldBreak = (t) => {
    if (!t.shield || t.shield <= 0 || t.shieldBroken) {
      return;
    }
    
    const breakAmount = effect.amount || 1;
    const oldShield = t.currentShield;
    t.currentShield = Math.max(0, oldShield - breakAmount);
    
    result.logs.push({ 
      text: `  → ${t.name} 护盾 -${breakAmount}（剩余 ${t.currentShield}/${t.shield}）`, 
      type: 'system' 
    });
    
    if (t.currentShield <= 0 && !t.shieldBroken) {
      t.shieldBroken = true;
      t.stunDuration = (t.stunDuration || 0) + 1;
      t.originalDef = t.def;
      t.def = 0;
      
      result.shieldBreaks.push(t);
      result.logs.push({ 
        text: `  💥 ${t.name} 护盾破碎！眩晕1回合，防御归零！`, 
        type: 'damage' 
      });
    }
  };
  
  switch (effectTarget) {
    case 'single':
      if (target) applyShieldBreak(target);
      break;
    case 'all':
    case 'all_enemy':
      enemies.filter(e => e.currentHp > 0).forEach(applyShieldBreak);
      break;
  }
}

// ==================== 治疗效果 ====================

function executeHealEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  const healAmt = Math.floor(atk * effect.multiplier);
  
  // 我方单位包含召唤物
  const allies = isEnemy ? battle.enemies : [...battle.allies, ...battle.summons];
  
  const applyHeal = (t) => {
    const oldHp = t.currentHp;
    t.currentHp = Math.min(t.maxHp, t.currentHp + healAmt);
    const actualHeal = t.currentHp - oldHp;
    const unitPrefix = t.isSummon ? '🔮' : '';
    if (actualHeal > 0) {
      result.logs.push({ text: `  → ${unitPrefix}${t.name} 恢复 ${actualHeal} HP！`, type: 'heal' });
    } else {
      result.logs.push({ text: `  → ${unitPrefix}${t.name} 已满血！`, type: 'system' });
    }
  };
  
  // 圣域模式：ally类型的治疗变为群体治疗
  let actualTarget = effectTarget;
  if (!isEnemy && user.sanctuaryMode && (effectTarget === 'ally')) {
    actualTarget = 'all_ally';
    result.logs.push({ text: `  🌟 圣域群体治疗！`, type: 'system' });
  }
  
  switch (actualTarget) {
    case 'ally':
      if (target) applyHeal(target);
      break;
      
    case 'all_ally':
    case 'all_ally_enemy':
      allies.filter(a => a.currentHp > 0).forEach(applyHeal);
      break;
      
    case 'ally_lowest':
      // 筛选存活的友军
      const aliveAllies = allies.filter(a => a.currentHp > 0);
      if (aliveAllies.length === 0) {
        result.logs.push({ text: `  → 没有可治疗的目标！`, type: 'system' });
        break;
      }
      // 找血量比例最低的
      const lowest = aliveAllies.reduce((a, b) => 
        (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
      );
      applyHeal(lowest);
      break;
  }
}

// ==================== 增益效果 ====================

function executeBuffEffect(effect, user, atk, effectTarget, isEnemy, result) {
  // 我方单位包含召唤物
  const allies = isEnemy ? battle.enemies : [...battle.allies, ...battle.summons];
  
  let buffValue;
  if (effect.value) {
    buffValue = effect.value;
  } else if (effect.multiplier) {
    buffValue = Math.floor(user[effect.stat] * effect.multiplier);
  }
  
  const applyBuff = (t) => {
    const unitPrefix = t.isSummon ? '🔮' : '';
    switch (effect.stat) {
      case 'atk':
        t.buffAtk = (t.buffAtk || 0) + buffValue;
        result.logs.push({ text: `  → ${unitPrefix}${t.name} ATK +${buffValue}！`, type: 'system' });
        break;
      case 'spd':
        // 使用buffSpd字段，以便在UI中显示
        t.buffSpd = (t.buffSpd || 0) + buffValue;
        result.logs.push({ text: `  → ${unitPrefix}${t.name} SPD +${buffValue}！`, type: 'system' });
        break;
      case 'def':
        t.def += buffValue;
        result.logs.push({ text: `  → ${unitPrefix}${t.name} DEF +${buffValue}！`, type: 'system' });
        break;
    }
  };
  
  switch (effectTarget) {
    case 'self':
      applyBuff(user);
      break;
    case 'all_ally':
      allies.filter(a => a.currentHp > 0).forEach(applyBuff);
      break;
  }
}

// ==================== 减益效果 ====================

function executeDebuffEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  const enemies = isEnemy ? [...battle.allies, ...battle.summons] : battle.enemies;
  
  const applyDebuff = (t) => {
    let debuffValue;
    if (effect.value) {
      debuffValue = effect.value;
    } else if (effect.multiplier) {
      debuffValue = Math.floor(t[effect.stat] * effect.multiplier);
    }
    
    switch (effect.stat) {
      case 'atk':
        t.atk = Math.max(1, t.atk - debuffValue);
        result.logs.push({ text: `  → ${t.name} ATK -${debuffValue}！`, type: 'system' });
        break;
      case 'spd':
        t.spd = Math.max(1, t.spd - debuffValue);
        result.logs.push({ text: `  → ${t.name} SPD -${debuffValue}！`, type: 'system' });
        break;
      case 'def':
        t.def = Math.max(0, t.def - debuffValue);
        result.logs.push({ text: `  → ${t.name} DEF -${debuffValue}！`, type: 'system' });
        break;
    }
  };
  
  switch (effectTarget) {
    case 'single':
      if (target) applyDebuff(target);
      break;
    case 'all_enemy':
      enemies.filter(e => e.currentHp > 0).forEach(applyDebuff);
      break;
  }
}

// ==================== 眩晕效果 ====================

function executeStunEffect(effect, target, effectTarget, isEnemy, result) {
  if (target) {
    target.stunDuration = (target.stunDuration || 0) + (effect.duration || 1);
    result.logs.push({ text: `  → ${target.name} 被眩晕 ${effect.duration} 回合！`, type: 'system' });
  }
}

// ==================== 召唤系统相关效果 ====================

/**
 * 全队回复能量（先锋供能，包含自身）
 */
function executeTeamEnergyEffect(effect, user, isEnemy, result) {
  if (isEnemy) return;  // 敌人不使用此效果
  
  const amount = effect.amount || 0;
  
  // 给全队（包含自身）回复能量
  battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
    ally.energy = Math.min(ally.maxEnergy, ally.energy + amount);
  });
  
  result.logs.push({ text: `  → 全队回复 ${amount} 能量！`, type: 'system' });
}

/**
 * 给召唤物添加buff（支持持续时间）
 */
function executeSummonBuffEffect(effect, user, result) {
  if (typeof SummonSystem === 'undefined') return;
  
  const buffType = effect.buffType;
  const value = effect.value;
  const duration = effect.duration || 0;  // 获取持续时间
  
  SummonSystem.addBuffToSummons(user, buffType, value, duration);
  
  // 日志
  const summons = SummonSystem.getSummonsByOwner(user);
  if (summons.length > 0) {
    let buffText = '';
    let durationText = duration > 0 ? `（${duration}回合）` : '';
    switch (buffType) {
      case 'atkPercent':
        buffText = `ATK +${value}%`;
        break;
      case 'spdFlat':
        buffText = `SPD +${value}`;
        break;
      case 'healPerTurn':
        buffText = `每回合回血 ${value}%${durationText}`;
        break;
      case 'doubleAttack':
        buffText = `获得二连击${durationText}`;
        break;
      case 'stunOnHit':
        buffText = `攻击附带眩晕${durationText}`;
        break;
    }
    result.logs.push({ text: `  → 🔮流形 ${buffText}！`, type: 'system' });
  } else {
    result.logs.push({ text: `  → （暂无召唤物，buff已记录）`, type: 'system' });
  }
}

/**
 * 给召唤者自己添加buff（支持持续时间）
 */
function executeOwnerBuffEffect(effect, user, result) {
  if (typeof SummonSystem === 'undefined') return;
  
  const buffType = effect.buffType;
  const value = effect.value;
  const duration = effect.duration || 0;  // 获取持续时间
  
  SummonSystem.addBuffToOwner(user, buffType, value, duration);
  
  // 日志
  let buffText = '';
  let durationText = duration > 0 ? `（${duration}回合）` : '';
  switch (buffType) {
    case 'atkPercent':
      buffText = `ATK +${value}%`;
      break;
    case 'spdFlat':
      buffText = `SPD +${value}`;
      break;
    case 'healPerTurn':
      buffText = `每回合回血 ${value}%${durationText}`;
      break;
  }
  result.logs.push({ text: `  → ${user.name} ${buffText}！`, type: 'system' });
}

// ==================== 艾雅法拉专属效果 ====================

/**
 * 叠加攻击力buff（二重咏唱）
 * 第二次使用起才生效
 */
function executeStackingAtkBuff(effect, user, skill, result) {
  // 初始化技能使用计数
  if (!user.skillUseCount) user.skillUseCount = {};
  const skillName = skill.name || '二重咏唱';
  user.skillUseCount[skillName] = (user.skillUseCount[skillName] || 0) + 1;
  
  const useCount = user.skillUseCount[skillName];
  const minUses = effect.minUses || 2;
  
  if (useCount >= minUses) {
    const buffValue = Math.floor(user.atk * effect.multiplier);
    user.buffAtk = (user.buffAtk || 0) + buffValue;
    result.logs.push({ 
      text: `  → 🔥 二重咏唱第${useCount}次！ATK +${buffValue}（+${Math.floor(effect.multiplier * 100)}%）！`, 
      type: 'system' 
    });
  } else {
    result.logs.push({ 
      text: `  → 二重咏唱第${useCount}次（第${minUses}次起追加ATK+${Math.floor(effect.multiplier * 100)}%）`, 
      type: 'system' 
    });
  }
}

/**
 * 溅射伤害（点燃）
 * 对主目标以外的敌人造成伤害
 */
function executeSplashDamage(effect, user, atk, target, isEnemy, result) {
  if (isEnemy) return;
  
  const enemies = battle.enemies.filter(e => e.currentHp > 0 && e !== target);
  if (enemies.length === 0) return;
  
  const splashDmg = Math.floor(atk * effect.multiplier);
  
  result.logs.push({ text: `  🔥 点燃爆炸！周围敌人受到溅射伤害：`, type: 'system' });
  
  enemies.forEach(enemy => {
    const actualDmg = Math.max(1, splashDmg - enemy.def * 0.5);
    enemy.currentHp -= actualDmg;
    result.logs.push({ text: `  → ${enemy.name} 受到 ${actualDmg} 溅射伤害！`, type: 'damage' });
  });
}

/**
 * 持续减益（支持单体和全体目标）
 */
function executeDebuffDuration(effect, target, result) {
  const effectTarget = effect.target || 'single';
  
  const applyDebuffToUnit = (t) => {
    if (!t || t.currentHp <= 0) return;
    
    // 使用原始属性值计算debuff（避免护盾破碎后DEF为0的问题）
    let baseValue = t[effect.stat];
    if (effect.stat === 'def' && t.originalDef !== undefined) {
      baseValue = t.originalDef;  // 使用护盾破碎前的原始DEF
    }
    const debuffValue = Math.floor(baseValue * effect.multiplier);
    
    // 初始化持续debuff列表
    if (!t.durationDebuffs) t.durationDebuffs = [];
    
    // 添加持续debuff
    t.durationDebuffs.push({
      stat: effect.stat,
      value: debuffValue,
      duration: effect.duration,
      originalValue: t[effect.stat]
    });
    
    // 立即应用debuff
    switch (effect.stat) {
      case 'def':
        t.def = Math.max(0, t.def - debuffValue);
        result.logs.push({ 
          text: `  → ${t.name} DEF -${debuffValue}（持续${effect.duration}回合）！`, 
          type: 'system' 
        });
        break;
      case 'atk':
        t.atk = Math.max(1, t.atk - debuffValue);
        result.logs.push({ 
          text: `  → ${t.name} ATK -${debuffValue}（持续${effect.duration}回合）！`, 
          type: 'system' 
        });
        break;
      case 'spd':
        t.spd = Math.max(1, t.spd - debuffValue);
        result.logs.push({ 
          text: `  → ${t.name} SPD -${debuffValue}（持续${effect.duration}回合）！`, 
          type: 'system' 
        });
        break;
    }
  };
  
  // 根据目标类型应用debuff
  switch (effectTarget) {
    case 'single':
      applyDebuffToUnit(target);
      break;
    case 'all_enemy':
      const enemies = battle.enemies.filter(e => e.currentHp > 0);
      enemies.forEach(applyDebuffToUnit);
      break;
  }
}

/**
 * 自我增益后攻击（火山）
 */
function executeSelfBuffThenAttack(effect, user, result) {
  const atkBonus = effect.atkBonus || 1.3;
  const buffValue = Math.floor(user.atk * atkBonus);
  user.buffAtk = (user.buffAtk || 0) + buffValue;
  
  result.logs.push({ 
    text: `  → 🌋 火山喷发！${user.name} ATK +${buffValue}（+${Math.floor(atkBonus * 100)}%）！`, 
    type: 'system' 
  });
}

/**
 * 处理持续debuff的回合结束
 * 需要在battle.js的回合结束时调用
 */
function processDurationDebuffs(unit) {
  if (!unit.durationDebuffs || unit.durationDebuffs.length === 0) return [];
  
  const logs = [];
  const expiredDebuffs = [];
  
  unit.durationDebuffs.forEach((debuff, index) => {
    debuff.duration--;
    
    if (debuff.duration <= 0) {
      // debuff到期，恢复属性
      switch (debuff.stat) {
        case 'def':
          unit.def += debuff.value;
          break;
        case 'atk':
          unit.atk += debuff.value;
          break;
        case 'spd':
          unit.spd += debuff.value;
          break;
      }
      logs.push({ 
        text: `  → ${unit.name} 的${debuff.stat.toUpperCase()}减益效果结束！`, 
        type: 'system' 
      });
      expiredDebuffs.push(index);
    }
  });
  
  // 移除到期的debuff（从后往前删除避免索引问题）
  expiredDebuffs.reverse().forEach(index => {
    unit.durationDebuffs.splice(index, 1);
  });
  
  return logs;
}

// ==================== 夜莺专属效果 ====================

/**
 * 给全体队友施加临时护盾（法术护盾）
 */
function executeTeamTempShield(effect, user, atk, isEnemy, result) {
  if (isEnemy) return;
  
  const shieldValue = Math.floor(atk * effect.multiplier);
  const allies = [...battle.allies, ...battle.summons].filter(a => a.currentHp > 0);
  
  allies.forEach(ally => {
    ally.tempShield = (ally.tempShield || 0) + shieldValue;
  });
  
  result.logs.push({ 
    text: `  → 🛡️ 全体队友获得护盾（${shieldValue}点）！`, 
    type: 'system' 
  });
}

/**
 * 给全体队友施加持续性buff（DEF、闪避等）
 */
function executeTeamBuffDuration(effect, user, isEnemy, result) {
  if (isEnemy) return;
  
  const allies = [...battle.allies, ...battle.summons].filter(a => a.currentHp > 0);
  
  allies.forEach(ally => {
    // 初始化持续buff列表
    if (!ally.durationBuffs) ally.durationBuffs = [];
    
    let buffValue;
    if (effect.value) {
      buffValue = effect.value;
    } else if (effect.multiplier) {
      buffValue = Math.floor(ally[effect.stat] * effect.multiplier);
    }
    
    // 添加持续buff
    ally.durationBuffs.push({
      stat: effect.stat,
      value: buffValue,
      duration: effect.duration
    });
    
    // 立即应用buff
    switch (effect.stat) {
      case 'def':
        ally.buffDef = (ally.buffDef || 0) + buffValue;
        ally.def += buffValue;
        break;
      case 'dodge':
        ally.dodgeChance = (ally.dodgeChance || 0) + buffValue;
        break;
    }
  });
  
  // 日志
  let statText = effect.stat === 'dodge' ? '闪避率' : effect.stat.toUpperCase();
  let valueText = effect.value ? `${effect.value}%` : `+${Math.floor(effect.multiplier * 100)}%`;
  result.logs.push({ 
    text: `  → 🌟 全体队友 ${statText} ${valueText}（${effect.duration}回合）！`, 
    type: 'system' 
  });
}

/**
 * 激活圣域模式（普攻变为群体治疗）
 */
function executeSanctuaryMode(user, result) {
  user.sanctuaryMode = true;
  result.logs.push({ 
    text: `  → 🌟 圣域展开！${user.name}的普攻变为群体治疗！`, 
    type: 'system' 
  });
}

/**
 * 处理持续buff的回合结束
 */
function processDurationBuffs(unit) {
  if (!unit.durationBuffs || unit.durationBuffs.length === 0) return [];
  
  const logs = [];
  const expiredBuffs = [];
  
  unit.durationBuffs.forEach((buff, index) => {
    buff.duration--;
    
    if (buff.duration <= 0) {
      // buff到期，移除效果
      switch (buff.stat) {
        case 'def':
          unit.def -= buff.value;
          unit.buffDef = (unit.buffDef || 0) - buff.value;
          break;
        case 'dodge':
          unit.dodgeChance = (unit.dodgeChance || 0) - buff.value;
          break;
      }
      logs.push({ 
        text: `  → ${unit.name} 的${buff.stat === 'dodge' ? '闪避' : buff.stat.toUpperCase()}增益效果结束！`, 
        type: 'system' 
      });
      expiredBuffs.push(index);
    }
  });
  
  // 移除到期的buff
  expiredBuffs.reverse().forEach(index => {
    unit.durationBuffs.splice(index, 1);
  });
  
  return logs;
}

/**
 * 检查玩家单位闪避（圣域效果）
 * 在伤害计算前调用
 */
function checkPlayerDodge(target, result) {
  if (!target.dodgeChance || target.dodgeChance <= 0) return false;
  
  const roll = Math.random() * 100;
  if (roll < target.dodgeChance) {
    result.logs.push({ 
      text: `  💫 ${target.name} 闪避了攻击！（圣域效果）`, 
      type: 'system' 
    });
    return true;
  }
  return false;
}

/**
 * 处理充能技能的回合充能
 */
function processChargeSkills(unit) {
  if (!unit.chargeSkills) return [];
  
  const logs = [];
  
  for (const [skillName, chargeData] of Object.entries(unit.chargeSkills)) {
    const skill = SKILL_EFFECTS[skillName];
    if (!skill || !skill.chargeSkill) continue;
    
    // 增加回合计数
    chargeData.turnCount = (chargeData.turnCount || 0) + 1;
    
    // 检查是否达到充能间隔
    if (chargeData.turnCount >= skill.chargeInterval) {
      if (chargeData.charges < skill.maxCharges) {
        chargeData.charges++;
        chargeData.turnCount = 0;
        logs.push({ 
          text: `  ⚡ ${unit.name}「${skillName}」充能 +1（${chargeData.charges}/${skill.maxCharges}）`, 
          type: 'system' 
        });
      }
    }
  }
  
  return logs;
}

/**
 * 初始化充能技能
 */
function initChargeSkills(unit) {
  if (!unit.skills) return;
  
  unit.chargeSkills = {};
  
  unit.skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    if (skill && skill.chargeSkill) {
      unit.chargeSkills[skillName] = {
        charges: 0,
        turnCount: 0
      };
    }
  });
}

/**
 * 检查充能技能是否可用
 */
function canUseChargeSkill(unit, skillName) {
  const skill = SKILL_EFFECTS[skillName];
  if (!skill || !skill.chargeSkill) return true;  // 非充能技能直接返回true
  
  if (!unit.chargeSkills || !unit.chargeSkills[skillName]) {
    initChargeSkills(unit);
  }
  
  return unit.chargeSkills[skillName].charges > 0;
}

/**
 * 消耗充能技能的充能
 */
function consumeCharge(unit, skillName) {
  if (!unit.chargeSkills || !unit.chargeSkills[skillName]) return;
  
  const skill = SKILL_EFFECTS[skillName];
  if (!skill || !skill.chargeSkill) return;
  
  if (unit.chargeSkills[skillName].charges > 0) {
    unit.chargeSkills[skillName].charges--;
  }
}
