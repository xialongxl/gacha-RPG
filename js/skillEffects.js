// ==================== 技能效果执行层 ====================
// 包含所有技能效果的具体执行函数

import { battle } from './state.js';
import { SummonSystem } from './summon.js';
import { SKILL_EFFECTS } from './skillData.js';
import { DMG_SOURCE } from './skillCore.js';
import {
  processAffixDodge,
  processAffixShield,
  processAffixUndying, 
  processAffixThorns, 
  processAffixVampiric,
  getAffixBerserkBonus,
  getAffixMultiStrikeCount
} from './affixSystem.js';

// ==================== 属性获取函数 ====================

/**
 * 获取单位实际DEF（含buff，内部计算用）
 * @param {Object} unit - 单位
 * @returns {number}
 */
export function getUnitDef(unit) {
  let def = unit.def;
  
  if (unit.shieldBroken) return 0;
  
  // 固定值加成
  if (unit.buffDef) {
    def += unit.buffDef;
  }
  
  // 百分比加成 - 使用小数倍率
  if (unit.buffDefMultiplier) {
    def = Math.floor(def * (1 + unit.buffDefMultiplier));
  }
  
  return def;
}

// ==================== 本地ATK计算函数 ====================

/**
 * 获取单位实际ATK（含所有buff）- 本地版本
 * 用于避免循环依赖，在伤害计算时实时获取最新ATK
 * @param {Object} unit - 单位
 * @returns {number} 实际ATK
 */
function getLocalUnitAtk(unit) {
  let atk = unit.atk;
  
  // 固定值加成
  if (unit.buffAtk) {
    atk += unit.buffAtk;
  }
  
  // 百分比加成（干员）- 使用小数倍率
  if (unit.buffAtkMultiplier) {
    atk = Math.floor(atk * (1 + unit.buffAtkMultiplier));
  }
  
  // 召唤物专属buff - 使用小数倍率
  if (unit.isSummon && unit.buffs) {
    atk = Math.floor(atk * (1 + (unit.buffs.atkMultiplier || 0)));
  }
  
  return atk;
}

// ==================== 相邻敌人判定 ====================

/**
 * 获取目标的相邻敌人
 * 敌人排列为 A-B-C-D，攻击B时相邻为A和C（索引 i-1 和 i+1）
 * @param {Object} target - 目标敌人
 * @returns {Array} 相邻敌人数组
 */
export function getAdjacentEnemies(target) {
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  const targetIndex = aliveEnemies.indexOf(target);
  
  if (targetIndex === -1) return [];
  
  const adjacent = [];
  
  // 左边相邻
  if (targetIndex > 0) {
    adjacent.push(aliveEnemies[targetIndex - 1]);
  }
  // 右边相邻
  if (targetIndex < aliveEnemies.length - 1) {
    adjacent.push(aliveEnemies[targetIndex + 1]);
  }
  
  return adjacent;
}

// ==================== 伤害效果 ====================

/**
 * 核心伤害处理函数
 * 封装了：眩晕必中、闪避、防御计算、护盾吸收、Break机制、HP扣除
 * @param {Object} target - 目标单位
 * @param {number} rawIncomingDamage - 原始传入伤害 (Atk * Multiplier)
 * @param {Object} ctx - 上下文 { user, result, sourceType, isCrit, critMultiplier, isEnemy }
 * @returns {Object} { damage: number, dodged: boolean, isKill: boolean, absorbed: boolean }
 */
function applyDamageCore(target, rawIncomingDamage, ctx) {
  const { user, result, sourceType, isCrit, critMultiplier = 1.0, isEnemy } = ctx;

  // 1. 眩晕必中判定
  const isStunned = target.stunDuration && target.stunDuration > 0;
  
  if (!isStunned) {
    // 2. 闪避判定
    // 敌人闪避词缀
    if (processAffixDodge(target, result)) {
      return { dodged: true, damage: 0 };
    }
    // 玩家闪避 (圣域) - 仅当使用者是敌人(攻击玩家)时触发
    if (isEnemy && !target.isEnemy) {
      if (checkPlayerDodge(target, result)) {
        return { dodged: true, damage: 0 };
      }
    }
  } else {
    result.logs.push({ text: `  🎯 ${target.name} 处于眩晕状态，无法闪避！`, type: 'system' });
  }

  // 3. 伤害计算
  // 霸体减伤：如果护盾未破，受到的伤害减半
  const shieldReduction = (target.currentShield > 0 && !target.shieldBroken) ? 0.5 : 1;
  const def = getUnitDef(target);
  
  // 基础公式
  let dmg = Math.floor(rawIncomingDamage * shieldReduction - def * 0.5);
  // 应用暴击
  dmg = Math.floor(dmg * critMultiplier);
  // 保底伤害
  dmg = Math.max(1, dmg);

  // 4. 词缀护盾 (Affix Shield)
  dmg = processAffixShield(target, dmg, result);
  
  if (dmg <= 0) return { dodged: false, damage: 0 };

  // 5. 临时护盾 (Temp Shield) - 玩家单位
  if (!target.isEnemy && target.tempShield && target.tempShield > 0) {
    result.hitShield = true;
    if (target.tempShield >= dmg) {
      target.tempShield -= dmg;
      result.logs.push({
        text: `  🔰 ${target.name} 护盾吸收 ${dmg} 伤害！（剩余护盾: ${target.tempShield}）`,
        type: 'system'
      });
      result.totalDamage = (result.totalDamage || 0) + dmg;
      result.hitCount = (result.hitCount || 0) + 1;
      if (!result.affectedTargets.includes(target)) result.affectedTargets.push(target);
      return { dodged: false, damage: 0, absorbed: true };
    } else {
      const absorbed = target.tempShield;
      result.totalDamage = (result.totalDamage || 0) + absorbed;
      dmg -= target.tempShield;
      target.tempShield = 0;
      result.tempShieldBroken = true;
      result.logs.push({
        text: `  🔰 ${target.name} 护盾吸收 ${absorbed} 伤害并破碎！`,
        type: 'system'
      });
    }
  }

  // 6. Break (破盾) 逻辑
  // DIRECT 和 ENVIRONMENT 均可破盾
  // 6. Break (破盾) 逻辑
  // DIRECT 和 ENVIRONMENT 均可破盾，但仅限我方攻击（!isEnemy）能触发破盾
  if (!isEnemy && target.currentShield > 0 && !target.shieldBroken &&
     (sourceType === DMG_SOURCE.DIRECT || sourceType === DMG_SOURCE.ENVIRONMENT)) {
    
    target.currentShield = Math.max(0, target.currentShield - 1);
    result.logs.push({
      text: `  → ${target.name} 护盾 -1（剩余 ${target.currentShield}/${target.shield}）`,
      type: 'system'
    });
    
    if (target.currentShield <= 0) {
      target.shieldBroken = true;
      target.stunDuration = (target.stunDuration || 0) + 1;
      target.originalDef = target.def;
      target.def = 0;
      
      result.shieldBreaks.push(target);
      result.logs.push({
        text: `  💥 BREAK! ${target.name} 护盾破碎！眩晕1回合，防御归零！`,
        type: 'damage'
      });
    }
  }

  // 7. 扣除 HP
  target.currentHp -= dmg;
  result.totalDamage = (result.totalDamage || 0) + dmg;
  result.hitCount = (result.hitCount || 0) + 1;
  if (!result.affectedTargets.includes(target)) result.affectedTargets.push(target);

  return { dodged: false, damage: dmg, isKill: target.currentHp <= 0 };
}

/**
 * 执行伤害效果
 * @param {Object} ctx - 上下文对象
 * @param {Object} ctx.effect - 效果数据
 * @param {Object} ctx.user - 使用者
 * @param {number} ctx.atk - 实际攻击力（预计算值，可能已过时）
 * @param {Object} ctx.target - 目标
 * @param {string} ctx.effectTarget - 目标类型
 * @param {boolean} ctx.isEnemy - 是否敌人使用
 * @param {Object} ctx.result - 结果对象
 * @param {string} ctx.sourceType - 伤害来源 (默认 DIRECT)
 */
export function executeDamageEffect(ctx) {
  const { effect, user, target, effectTarget, isEnemy, result } = ctx;
  const sourceType = ctx.sourceType || DMG_SOURCE.DIRECT;
  
  // 【修复Bug 1】重新获取最新的ATK值
  const atk = getLocalUnitAtk(user);
  // 计算狂化加成
  const berserkBonus = getAffixBerserkBonus(user);
  const effectiveAtk = Math.floor(atk * (1 + berserkBonus));
  
  // 暴击判定（玩家Roguelike强化）
  const critBonus = user.critBonus || 0;
  let isCrit = false;
  if (!isEnemy && critBonus > 0) {
    isCrit = Math.random() < critBonus;
  }
  const critMultiplier = isCrit ? 1.5 : 1.0;
  
  // 准备核心上下文
  const coreCtx = { user, result, sourceType, isCrit, critMultiplier, isEnemy };
  const rawDamage = Math.floor(effectiveAtk * effect.multiplier);

  // 敌人攻击我方（包含召唤物），我方攻击敌人
  const enemies = isEnemy ? [...battle.allies, ...battle.summons] : battle.enemies;
  
  const applyDamage = (t) => {
    // 调用核心伤害处理
    const outcome = applyDamageCore(t, rawDamage, coreCtx);
    
    // 如果被闪避、被护盾完全吸收，或伤害被减免至0，则不输出伤害日志
    if (outcome.dodged || outcome.absorbed || outcome.damage <= 0) return;
    
    const dmg = outcome.damage;
    const unitPrefix = t.isSummon ? '🔮' : '';
    const critText = isCrit ? '💥暴击！' : '';
    
    result.logs.push({ text: `  → ${unitPrefix}${t.name} 受到 ${dmg} 伤害！${critText}`, type: 'damage' });
    
    // 处理概率眩晕（迷迭香末梢阻断：检查用户身上的attackStunChance或效果自带的stunChance）
    const stunChance = user.attackStunChance || effect.stunChance || 0;
    if (stunChance > 0 && t.currentHp > 0) {
      // 霸体检测：有护盾且未破盾时免疫眩晕
      if (t.currentShield > 0 && !t.shieldBroken) {
        result.logs.push({ text: `  🛡️ ${t.name} 霸体免疫眩晕！`, type: 'system' });
      } else {
        if (Math.random() < stunChance) {
          t.stunDuration = (t.stunDuration || 0) + 1;
          result.logs.push({ text: `  → 💫 ${t.name} 被眩晕 1 回合！`, type: 'system' });
        }
      }
    }
    
    // 处理不死词缀
    if (t.currentHp <= 0) {
      if (processAffixUndying(t, result)) {
        // 不死触发，单位存活
      }
    }
    
    // 处理反伤词缀 (仅 DIRECT)
    if (sourceType === DMG_SOURCE.DIRECT) {
      processAffixThorns(t, user, dmg, result);
    }
    
    // 处理吸血词缀
    processAffixVampiric(user, dmg, result);
    
    // 处理玩家Roguelike吸血强化
    if (!isEnemy && user.vampBonus && user.vampBonus > 0) {
      const vampHeal = Math.floor(dmg * user.vampBonus);
      if (vampHeal > 0) {
        const oldHp = user.currentHp;
        user.currentHp = Math.min(user.maxHp, user.currentHp + vampHeal);
        const actualHeal = user.currentHp - oldHp;
        if (actualHeal > 0) {
          result.logs.push({ text: `  💉 ${user.name} 吸血恢复 ${actualHeal} HP！`, type: 'heal' });
        }
      }
    }
    
    // 召唤物攻击附带眩晕（只对敌人生效）
    if (user.isSummon && user.buffs && user.buffs.stunOnHit && t.isEnemy) {
      // 霸体检测
      if (t.currentShield > 0 && !t.shieldBroken) {
        result.logs.push({ text: `  🛡️ ${t.name} 霸体免疫召唤物眩晕！`, type: 'system' });
      } else {
        t.stunDuration = (t.stunDuration || 0) + 1;
        result.logs.push({ text: `  → ${t.name} 被眩晕 1 回合！`, type: 'system' });
      }
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

/**
 * 执行护盾破坏效果
 * @param {Object} ctx - 上下文对象
 */
export function executeShieldBreakEffect(ctx) {
  const { effect, target, effectTarget, isEnemy, result } = ctx;
  const enemies = isEnemy ? battle.allies : battle.enemies;
  
  const applyShieldBreak = (t) => {
    if (!t.shield || t.shield <= 0 || t.shieldBroken) {
      return;
    }
    
    const breakAmount = effect.amount || 1;
    const oldShield = t.currentShield;
    t.currentShield = Math.max(0, oldShield - breakAmount);
    
    if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
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

/**
 * 执行治疗效果
 * @param {Object} ctx - 上下文对象
 */
export function executeHealEffect(ctx) {
  const { effect, user, atk, target, effectTarget, isEnemy, result } = ctx;
  const healAmt = Math.floor(atk * effect.multiplier);
  
  // 我方单位包含召唤物
  const allies = isEnemy ? battle.enemies : [...battle.allies, ...battle.summons];
  
  const applyHeal = (t) => {
    const oldHp = t.currentHp;
    t.currentHp = Math.min(t.maxHp, t.currentHp + healAmt);
    const actualHeal = t.currentHp - oldHp;
    // 记录总治疗量，用于AI评分
    result.totalHeal = (result.totalHeal || 0) + actualHeal;
    
    const unitPrefix = t.isSummon ? '🔮' : '';
    if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
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
    result.logs.push({ text: `  🌟 圣域全体疗愈！`, type: 'system' });
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

/**
 * 执行增益效果
 * @param {Object} ctx - 上下文对象
 */
export function executeBuffEffect(ctx) {
  const { effect, user, atk, effectTarget, isEnemy, result } = ctx;
  // 我方单位包含召唤物
  const allies = isEnemy ? battle.enemies : [...battle.allies, ...battle.summons];
  
  const applyBuff = (t) => {
    const unitPrefix = t.isSummon ? '🔮' : '';
    let logText = '';
    
    // 百分比加成 (使用小数倍率)
    if (effect.multiplier) {
      const mult = effect.multiplier;
      switch (effect.stat) {
        case 'atk':
          t.buffAtkMultiplier = (t.buffAtkMultiplier || 0) + mult;
          break;
        case 'spd':
          t.buffSpdMultiplier = (t.buffSpdMultiplier || 0) + mult;
          break;
        case 'def':
          t.buffDefMultiplier = (t.buffDefMultiplier || 0) + mult;
          break;
      }
      logText = `${effect.stat.toUpperCase()} +${Math.round(mult * 100)}%`;
    } 
    // 固定值加成
    else if (effect.value) {
      const val = effect.value;
      switch (effect.stat) {
        case 'atk':
          t.buffAtk = (t.buffAtk || 0) + val;
          break;
        case 'spd':
          t.buffSpd = (t.buffSpd || 0) + val;
          break;
        case 'def':
          t.buffDef = (t.buffDef || 0) + val;
          break;
      }
      logText = `${effect.stat.toUpperCase()} +${val}`;
    }
    
    if (logText) {
      if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
      result.logs.push({ text: `  → ${unitPrefix}${t.name} ${logText}！`, type: 'system' });
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

/**
 * 执行减益效果
 * @param {Object} ctx - 上下文对象
 */
export function executeDebuffEffect(ctx) {
  const { effect, user, atk, target, effectTarget, isEnemy, result } = ctx;
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
        if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
        result.logs.push({ text: `  → ${t.name} ATK -${debuffValue}！`, type: 'system' });
        break;
      case 'spd':
        t.spd = Math.max(1, t.spd - debuffValue);
        if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
        result.logs.push({ text: `  → ${t.name} SPD -${debuffValue}！`, type: 'system' });
        break;
      case 'def':
        t.def = Math.max(0, t.def - debuffValue);
        if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
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

/**
 * 执行眩晕效果
 * 支持单体和全体目标
 * @param {Object} ctx - 上下文对象
 */
export function executeStunEffect(ctx) {
  const { effect, target, isEnemy, result } = ctx;
  const effectTarget = effect.target || 'single';
  const duration = effect.duration || 1;
  
  const applyStun = (t) => {
    if (!t || t.currentHp <= 0) return;
    
    // 霸体检测
    if (t.currentShield > 0 && !t.shieldBroken) {
      result.logs.push({ text: `  🛡️ ${t.name} 霸体免疫眩晕！`, type: 'system' });
      return;
    }
    
    t.stunDuration = (t.stunDuration || 0) + duration;
    if (!result.affectedTargets.includes(t)) result.affectedTargets.push(t);
    result.logs.push({ text: `  → ${t.name} 被眩晕 ${duration} 回合！`, type: 'system' });
  };
  
  switch (effectTarget) {
    case 'single':
      if (target) applyStun(target);
      break;
    case 'all_enemy':
      // 我方使用时眩晕敌人，敌人使用时眩晕我方
      const enemies = isEnemy ? [...battle.allies, ...battle.summons] : battle.enemies;
      enemies.filter(e => e.currentHp > 0).forEach(applyStun);
      break;
  }
}

// ==================== 迷迭香专属效果 ====================

/**
 * 余震效果
 * 对主目标造成N次50%ATK伤害，范围化后对主目标+相邻敌人造成伤害
 * @param {Object} ctx - 上下文对象
 */
export function executeAftershockEffect(ctx) {
  const { effect, user, target, isEnemy, result } = ctx;
  // 敌人不使用余震
  if (isEnemy) return;
  
  const atk = getLocalUnitAtk(user);
  const aftershockCount = user.aftershockCount || 1;  // 默认1次
  const isAoe = user.aftershockAoe || false;  // 是否范围化
  // 优先使用用户身上的眩晕概率，其次是效果自带的
  const stunChance = user.attackStunChance || effect.stunChance || 0;
  
  // 获取所有存活敌人
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  if (aliveEnemies.length === 0) return;  // 没有存活敌人，不触发余震
  
  // 获取余震目标
  let aftershockTargets = [];
  
  if (isAoe) {
    // 范围化：如果原目标存活，攻击原目标+相邻；否则攻击所有存活敌人
    if (target && target.currentHp > 0) {
      const adjacent = getAdjacentEnemies(target);
      aftershockTargets = [target, ...adjacent];
    } else {
      // 原目标死亡，攻击所有存活敌人
      aftershockTargets = aliveEnemies;
    }
  } else {
    // 非范围化：如果原目标存活，攻击原目标；否则攻击随机存活敌人
    if (target && target.currentHp > 0) {
      aftershockTargets = [target];
    } else {
      // 原目标死亡，选择随机存活敌人
      //const randomTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      //aftershockTargets = [randomTarget];
      //result.logs.push({ text: `  ⚡ 原目标已死亡，余震转向 ${randomTarget.name}！`, type: 'system' });
    }
  }
  
  result.logs.push({ text: `  ⚡ 余震发动！（${aftershockCount}次${isAoe ? '，范围化' : ''}）`, type: 'system' });
  
  // 准备核心上下文 (ENVIRONMENT类型)
  const coreCtx = {
    user,
    result,
    sourceType: DMG_SOURCE.ENVIRONMENT,
    isCrit: false,
    isEnemy: false
  };
  
  // 基础伤害值
  const rawDamage = Math.floor(atk * effect.multiplier);

  // 对每个目标造成N次余震伤害
  for (let i = 0; i < aftershockCount; i++) {
    aftershockTargets.forEach(t => {
      if (t.currentHp <= 0) return;
      
      const outcome = applyDamageCore(t, rawDamage, coreCtx);
      
      if (outcome.dodged || outcome.absorbed || outcome.damage <= 0) return;
      
      const dmg = outcome.damage;
      result.logs.push({ text: `  → ${t.name} 受到 ${dmg} 余震伤害！`, type: 'damage' });
      
      // 处理概率眩晕
      if (stunChance > 0 && t.currentHp > 0) {
        // 霸体检测
        if (t.currentShield > 0 && !t.shieldBroken) {
          result.logs.push({ text: `  🛡️ ${t.name} 霸体免疫余震眩晕！`, type: 'system' });
        } else {
          if (Math.random() < stunChance) {
            t.stunDuration = (t.stunDuration || 0) + 1;
            result.logs.push({ text: `  → 💫 ${t.name} 被眩晕 1 回合！`, type: 'system' });
          }
        }
      }
    });
  }
}

/**
 * 余震次数叠加（永久）
 * @param {Object} ctx - 上下文对象
 */
export function executeAftershockCountBuff(ctx) {
  const { effect, user, result } = ctx;
  const count = effect.count || 2;
  
  user.aftershockCount = (user.aftershockCount || 1) + count;
  
  result.logs.push({
    text: `  → ⚡ ${user.name} 余震次数 +${count}（当前${user.aftershockCount}次）！`,
    type: 'system'
  });
}

/**
 * 余震范围化（永久）
 * @param {Object} ctx - 上下文对象
 */
export function executeAftershockAoeBuff(ctx) {
  const { user, result } = ctx;
  
  user.aftershockAoe = true;
  
  result.logs.push({
    text: `  → ⚡ ${user.name} 余震范围化！攻击主目标及相邻敌人！`,
    type: 'system'
  });
}

/**
 * 余震眩晕buff（永久）- 给攻击和余震添加眩晕概率
 * @param {Object} ctx - 上下文对象
 */
export function executeAftershockStunBuff(ctx) {
  const { effect, user, result } = ctx;
  const stunChance = effect.stunChance || 0.2;
  
  // 设置用户的攻击眩晕概率
  user.attackStunChance = stunChance;
  
  result.logs.push({
    text: `  → 💫 ${user.name} 普攻和余震获得 ${Math.round(stunChance * 100)}% 眩晕概率！`,
    type: 'system'
  });
}

// ==================== 召唤系统相关效果 ====================

/**
 * 全队回复能量（先锋供能，包含自身）
 * @param {Object} ctx - 上下文对象
 */
export function executeTeamEnergyEffect(ctx) {
  const { effect, isEnemy, result } = ctx;
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
 * @param {Object} ctx - 上下文对象
 */
export function executeSummonBuffEffect(ctx) {
  const { effect, user, result } = ctx;
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
      case 'atkMultiplier':
        buffText = `ATK +${Math.round(value * 100)}%`;
        break;
      case 'spdFlat':
        buffText = `SPD +${value}`;
        break;
      case 'healPerTurn':
        // 【修复Bug 2】value是小数形式（0.15表示15%），显示时需要乘以100
        buffText = `每回合回血 ${value * 100}%${durationText}`;
        break;
      case 'doubleAttack':
        buffText = `获得二连击${durationText}`;
        break;
      case 'stunOnHit':
        buffText = `攻击附带眩晕${durationText}`;
        break;
      case 'taunt':
        buffText = `获得嘲讽${durationText}`;
        break;
    }
    result.logs.push({ text: `  → 🔮流形 ${buffText}！`, type: 'system' });
  } else {
    result.logs.push({ text: `  → （暂无召唤物，buff已记录）`, type: 'system' });
  }
}

/**
 * 给召唤者自己添加buff（支持持续时间）
 * @param {Object} ctx - 上下文对象
 */
export function executeOwnerBuffEffect(ctx) {
  const { effect, user, result } = ctx;
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
    case 'atkMultiplier':
      buffText = `ATK +${Math.round(value * 100)}%`;
      break;
    case 'spdFlat':
      buffText = `SPD +${value}`;
      break;
    case 'healPerTurn':
      // 【修复Bug 2】value是小数形式（0.15表示15%），显示时需要乘以100
      buffText = `每回合回血 ${value * 100}%${durationText}`;
      break;
  }
  result.logs.push({ text: `  → ${user.name} ${buffText}！`, type: 'system' });
}

// ==================== 艾雅法拉专属效果 ====================

/**
 * 叠加攻击力buff（二重咏唱）
 * 第二次使用起才生效
 * @param {Object} ctx - 上下文对象
 */
export function executeStackingAtkBuff(ctx) {
  const { effect, user, skill, result } = ctx;
  // 初始化技能使用计数
  if (!user.skillUseCount) user.skillUseCount = {};
  const skillName = skill.name || '二重咏唱';
  user.skillUseCount[skillName] = (user.skillUseCount[skillName] || 0) + 1;
  
  const useCount = user.skillUseCount[skillName];
  const minUses = effect.minUses || 2;
  const mult = effect.multiplier;
  
  
  if (useCount >= minUses) {
    user.buffAtkMultiplier = (user.buffAtkMultiplier || 0) + mult;
    result.logs.push({ 
      text: `  → 🔥 二重咏唱第${useCount}次！ATK +${Math.floor(mult * 100)}%！`, 
      type: 'system' 
    });
  } else {
    result.logs.push({ 
      text: `  → 二重咏唱第${useCount}次（第${minUses}次起追加ATK+${Math.floor(mult * 100)}%）`, 
      type: 'system' 
    });
  }
}

/**
 * 溅射伤害（点燃）
 * 对主目标以外的敌人造成伤害
 * @param {Object} ctx - 上下文对象
 */
export function executeSplashDamage(ctx) {
  const { effect, user, atk, target, isEnemy, result } = ctx;
  if (isEnemy) return;
  
  const enemies = battle.enemies.filter(e => e.currentHp > 0 && e !== target);
  if (enemies.length === 0) return;
  
  // 溅射伤害基础值 (使用快照ATK)
  const splashDmg = Math.floor(atk * effect.multiplier);
  
  result.logs.push({ text: `  🔥 点燃爆炸！周围敌人受到溅射伤害：`, type: 'system' });
  
  // 准备核心上下文 (ENVIRONMENT类型)
  const coreCtx = {
    user,
    result,
    sourceType: DMG_SOURCE.ENVIRONMENT,
    isCrit: false,
    isEnemy
  };
  
  enemies.forEach(enemy => {
    const outcome = applyDamageCore(enemy, splashDmg, coreCtx);
    
    if (outcome.dodged || outcome.absorbed || outcome.damage <= 0) return;
    
    const dmg = outcome.damage;
    result.logs.push({ text: `  → ${enemy.name} 受到 ${dmg} 溅射伤害！`, type: 'damage' });
  });
}

/**
 * 持续减益（支持单体和全体目标）
 * @param {Object} ctx - 上下文对象
 */
export function executeDebuffDuration(ctx) {
  const { effect, target, result } = ctx;
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
 * @param {Object} ctx - 上下文对象
 */
export function executeSelfBuffThenAttack(ctx) {
  const { effect, user, skill, result } = ctx;
  const mult = effect.multiplier;
  user.buffAtkMultiplier = (user.buffAtkMultiplier || 0) + mult;



  if (skill.name === '火山') {
  result.logs.push({ 
    text: `  → 🌋 火山喷发！${user.name} ATK +${Math.floor(mult * 100)}%！`, 
    type: 'system' 
  });
} else {
  result.logs.push({ 
    text: `  → ${user.name} ATK +${Math.floor(mult * 100)}%！`, 
    type: 'system' 
  });
}

}

// ==================== 夜莺专属效果 ====================

/**
 * 给全体队友施加临时护盾（法术护盾）
 * @param {Object} ctx - 上下文对象
 */
export function executeTeamTempShield(ctx) {
  const { effect, user, atk, isEnemy, result } = ctx;
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
 * @param {Object} ctx - 上下文对象
 */
export function executeTeamBuffDuration(ctx) {
  const { effect, user, isEnemy, result } = ctx;
  if (isEnemy) return;
  
  const allies = [...battle.allies, ...battle.summons].filter(a => a.currentHp > 0);
  
  allies.forEach(ally => {
    // 初始化持续buff列表
    if (!ally.durationBuffs) ally.durationBuffs = [];
    
    let buffValue;
    let isPercent = false;
    
    if (effect.multiplier) {
      buffValue = effect.multiplier; // 存储小数
      isPercent = true;
    } else if (effect.value) {
      buffValue = effect.value;
    }
    
    // 添加持续buff
    ally.durationBuffs.push({
      stat: effect.stat,
      value: buffValue,
      duration: effect.duration,
      isPercent: isPercent
    });
    
    // 立即应用buff
    if (isPercent || effect.stat === 'dodge') { // dodge 总是视为百分比(概率)
      switch (effect.stat) {
        case 'def':
          ally.buffDefMultiplier = (ally.buffDefMultiplier || 0) + buffValue;
          break;
        case 'dodge':
          ally.dodgeChance = (ally.dodgeChance || 0) + buffValue;
          break;
      }
    } else {
      switch (effect.stat) {
        case 'def':
          ally.buffDef = (ally.buffDef || 0) + buffValue;
          break;
      }
    }
  });
  
  // 日志
  let statText = effect.stat === 'dodge' ? '闪避率' : effect.stat.toUpperCase();
  // 统一显示为百分比
  let valToShow = (effect.multiplier || effect.value) * 100;
  if (effect.stat !== 'dodge' && !effect.multiplier) valToShow = effect.value; // 非百分比数值保持原样
  
  let valueText = (effect.multiplier || effect.stat === 'dodge') ? `+${Math.round(valToShow)}%` : `+${valToShow}`;
  
  result.logs.push({
    text: `  → 🌟 全体队友 ${statText} ${valueText}（${effect.duration}回合）！`,
    type: 'system'
  });
}

/**
 * 激活圣域模式（普攻变为群体治疗）
 * @param {Object} ctx - 上下文对象
 */
export function executeSanctuaryMode(ctx) {
  const { user, result } = ctx;
  user.sanctuaryMode = true;
  result.logs.push({
    text: `  → 🌟 圣域展开！${user.name}的疗愈变为全体疗愈！`,
    type: 'system'
  });
}

// ==================== 玩家闪避检查 ====================

/**
 * 检查玩家单位闪避（圣域效果）
 * 在伤害计算前调用
 */
export function checkPlayerDodge(target, result) {
  if (!target.dodgeChance || target.dodgeChance <= 0) return false;
  
  // 统一使用 0-1 概率
  const roll = Math.random();
  if (roll < target.dodgeChance) {
    result.dodged = true; // 标记为已闪避
    result.logs.push({
      text: `  💫 ${target.name} 闪避了攻击！（圣域效果）`,
      type: 'system'
    });
    return true;
  }
  return false;
}