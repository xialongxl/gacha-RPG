// ==================== 队长加成配置 ====================

const LEADER_BONUS = {
  '铃兰': {
    skill: '狐火泯然',
    costReduce: 10,
    healBonus: 0.05,
    debuffBonus: 0.05,
    extraEffects: [
      { type: 'buff', stat: 'atk', multiplier: 0.1, target: 'all_ally' }
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
  '火山': {
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
  '狐火泯然': {
    cost: 70,
    gain: 0,
    target: 'all',
    desc: '消耗70能量，全体队友回复20%攻击力的HP，敌人全体减速30%',
    effects: [
      { type: 'heal', multiplier: 0.2, target: 'all_ally' },
      { type: 'debuff', stat: 'spd', multiplier: 0.3, target: 'all_enemy' }
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
  
  const atk = user.atk + (user.buffAtk || 0);
  
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
    }
  });
  
  return result;
}

// 伤害效果
function executeDamageEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  const calcDamage = (t) => {
    const shieldReduction = (t.currentShield > 0 && !t.shieldBroken) ? 0.5 : 1;
    return Math.max(1, Math.floor(atk * effect.multiplier * shieldReduction - t.def * 0.5));
  };
  
  const enemies = isEnemy ? battle.allies : battle.enemies;
  
  const applyDamage = (t) => {
    const dmg = calcDamage(t);
    t.currentHp -= dmg;
    result.logs.push({ text: `  → ${t.name} 受到 ${dmg} 伤害！`, type: 'damage' });
    
    // 普通攻击破盾1格
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
    
    // 被攻击者获得能量
    if (!t.isEnemy && t.currentHp > 0) {
      t.energy = Math.min(t.maxEnergy, t.energy + 20);
      result.energyChanges.push({ unit: t, amount: 20 });
    }
    
    // 检查死亡
    if (t.currentHp <= 0) {
      t.currentHp = 0;
      result.deaths.push(t);
      result.logs.push({ text: `💀 ${t.name} 被击败！`, type: 'system' });
    }
  };
  
  switch (effectTarget) {
    case 'single':
      if (target) applyDamage(target);
      break;
      
    case 'all':
    case 'all_enemy':
      enemies.filter(e => e.currentHp > 0).forEach(applyDamage);
      break;
      
    case 'random2':
    case 'random3':
      const times = effectTarget === 'random3' ? 3 : 2;
      for (let i = 0; i < times; i++) {
        const alive = enemies.filter(e => e.currentHp > 0);
        if (alive.length === 0) break;
        const t = alive[Math.floor(Math.random() * alive.length)];
        applyDamage(t);
      }
      break;
  }
}

// 护盾破坏效果
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

// 治疗效果
function executeHealEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  const healAmt = Math.floor(atk * effect.multiplier);
  const allies = isEnemy ? battle.enemies : battle.allies;
  
  const applyHeal = (t) => {
    const oldHp = t.currentHp;
    t.currentHp = Math.min(t.maxHp, t.currentHp + healAmt);
    const actualHeal = t.currentHp - oldHp;
    result.logs.push({ text: `  → ${t.name} 恢复 ${actualHeal} HP！`, type: 'heal' });
  };
  
  switch (effectTarget) {
    case 'ally':
      if (target) applyHeal(target);
      break;
      
    case 'all_ally':
    case 'all_ally_enemy':
      allies.filter(a => a.currentHp > 0).forEach(applyHeal);
      break;
      
    case 'ally_lowest':
      const lowest = allies.filter(a => a.currentHp > 0).reduce((a, b) => 
        (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b, allies[0]
      );
      if (lowest && lowest.currentHp > 0) applyHeal(lowest);
      break;
  }
}

// 增益效果
function executeBuffEffect(effect, user, atk, effectTarget, isEnemy, result) {
  const allies = isEnemy ? battle.enemies : battle.allies;
  
  let buffValue;
  if (effect.value) {
    buffValue = effect.value;
  } else if (effect.multiplier) {
    buffValue = Math.floor(user[effect.stat] * effect.multiplier);
  }
  
  const applyBuff = (t) => {
    switch (effect.stat) {
      case 'atk':
        t.buffAtk = (t.buffAtk || 0) + buffValue;
        result.logs.push({ text: `  → ${t.name} ATK +${buffValue}！`, type: 'system' });
        break;
      case 'spd':
        t.spd += buffValue;
        result.logs.push({ text: `  → ${t.name} SPD +${buffValue}！`, type: 'system' });
        break;
      case 'def':
        t.def += buffValue;
        result.logs.push({ text: `  → ${t.name} DEF +${buffValue}！`, type: 'system' });
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

// 减益效果
function executeDebuffEffect(effect, user, atk, target, effectTarget, isEnemy, result) {
  const enemies = isEnemy ? battle.allies : battle.enemies;
  
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

// 眩晕效果
function executeStunEffect(effect, target, effectTarget, isEnemy, result) {
  if (target) {
    target.stunDuration = (target.stunDuration || 0) + (effect.duration || 1);
    result.logs.push({ text: `  → ${target.name} 被眩晕 ${effect.duration} 回合！`, type: 'system' });
  }
}