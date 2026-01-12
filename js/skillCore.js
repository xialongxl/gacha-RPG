// ==================== 技能系统核心 ====================
// 核心逻辑 + 统一入口，重新导出所有技能相关的函数和数据

import { battle } from './state.js';
import { CONFIG } from './config.js';
import { SummonSystem } from './summon.js';

// ==================== 从子模块导入 ====================

// 数据层
import { SKILL_EFFECTS, LEADER_BONUS } from './skillData.js';

// 词缀系统
import { 
  hasAffix,
  getAffixConfig,
  processAffixDodge,
  processAffixShield,
  processAffixUndying,
  processAffixThorns,
  processAffixVampiric,
  getAffixBerserkBonus,
  getAffixMultiStrikeCount,
  processAffixTurnStart,
  processAffixOnDeath
} from './affixSystem.js';

// 充能系统
import { 
  initChargeSkills,
  processChargeSkills,
  canUseChargeSkill,
  consumeCharge
} from './chargeSystem.js';

// 效果执行层
import {
  getUnitDef as _getUnitDef,
  executeDamageEffect,
  executeShieldBreakEffect,
  executeHealEffect,
  executeBuffEffect,
  executeDebuffEffect,
  executeStunEffect,
  executeTeamEnergyEffect,
  executeSummonBuffEffect,
  executeOwnerBuffEffect,
  executeStackingAtkBuff,
  executeSplashDamage,
  executeDebuffDuration,
  executeSelfBuffThenAttack,
  executeTeamTempShield,
  executeTeamBuffDuration,
  executeSanctuaryMode,
  checkPlayerDodge,
  // 迷迭香专属
  executeAftershockEffect,
  executeAftershockCountBuff,
  executeAftershockAoeBuff,
  executeAftershockStunBuff
} from './skillEffects.js';

// 重新导出 getUnitDef 供外部使用
export const getUnitDef = _getUnitDef;

// ==================== 重新导出数据 ====================

export { SKILL_EFFECTS, LEADER_BONUS } from './skillData.js';

// ==================== 重新导出词缀系统 ====================

export { processAffixTurnStart, processAffixOnDeath } from './affixSystem.js';

// ==================== 重新导出充能系统 ====================

export { 
  initChargeSkills,
  processChargeSkills,
  canUseChargeSkill,
  consumeCharge
} from './chargeSystem.js';

// ==================== 属性计算函数 ====================

/**
 * 获取队长加成后的技能消耗
 * @param {string} skillName - 技能名
 * @param {Object} user - 使用者
 * @returns {number} 实际消耗
 */
export function getSkillCost(skillName, user) {
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
export function getUnitAtk(unit) {
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

/**
 * 获取单位实际SPD（含buff，内部计算用）
 * @param {Object} unit - 单位
 * @returns {number} 实际SPD
 */
export function getUnitSpd(unit) {
  let spd = unit.spd;
  
  // 固定值加成
  if (unit.buffSpd) {
    spd += unit.buffSpd;
  }
  
  // 召唤物buff
  if (unit.isSummon && unit.buffs && unit.buffs.spdFlat) {
    spd += unit.buffs.spdFlat;
  }
  
  // 百分比加成 - 使用小数倍率
  if (unit.buffSpdMultiplier) {
    spd = Math.floor(spd * (1 + unit.buffSpdMultiplier));
  }
  
  return spd;
}

// ==================== 伤害来源定义 ====================

/**
 * 伤害来源类型
 * 用于控制破盾逻辑和反伤触发
 */
export const DMG_SOURCE = {
  DIRECT: 'direct',       // 直接攻击 (普攻/技能) -> 破盾✅ 反伤✅
  ENVIRONMENT: 'env',     // 环境/余震 (冲击波) -> 破盾✅ 反伤❌
  DOT: 'dot'              // 持续伤害 (毒/灼烧) -> 破盾❌ 反伤❌
};

// ==================== 效果执行器映射表 ====================

/**
 * 效果类型 -> 执行函数的映射表
 * 所有执行函数接收统一的上下文对象 ctx
 */
const EFFECT_HANDLERS = {
  // 基础效果
  damage: executeDamageEffect,
  heal: executeHealEffect,
  buff: executeBuffEffect,
  debuff: executeDebuffEffect,
  stun: executeStunEffect,
  shield_break: executeShieldBreakEffect,
  
  // 召唤系统相关
  team_energy: executeTeamEnergyEffect,
  summon_buff: executeSummonBuffEffect,
  owner_buff: executeOwnerBuffEffect,
  
  // 艾雅法拉专属
  stacking_atk_buff: executeStackingAtkBuff,
  splash_damage: executeSplashDamage,
  debuff_duration: executeDebuffDuration,
  self_buff_then_attack: executeSelfBuffThenAttack,
  
  // 夜莺专属
  team_temp_shield: executeTeamTempShield,
  team_buff_duration: executeTeamBuffDuration,
  sanctuary_mode: executeSanctuaryMode,
  
  // 迷迭香专属
  aftershock: executeAftershockEffect,
  aftershock_count_buff: executeAftershockCountBuff,
  aftershock_aoe_buff: executeAftershockAoeBuff,
  aftershock_stun_buff: executeAftershockStunBuff
};

// ==================== 核心技能执行 ====================

/**
 * 执行技能效果
 * @param {Object} skill - 技能数据
 * @param {Object} user - 使用者
 * @param {Object} target - 目标（可为null）
 * @param {boolean} isEnemy - 是否敌人使用
 * @returns {Object} 执行结果
 */
export function executeSkillEffects(skill, user, target, isEnemy) {
  const result = {
    logs: [],
    deaths: [],
    energyChanges: [],
    shieldBreaks: [],
    totalDamage: 0,
    hitCount: 0,
    affectedTargets: []
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
  
  // 遍历效果并执行
  effects.forEach(effect => {
    const effectTarget = effect.target || skill.target;
    const handler = EFFECT_HANDLERS[effect.type];
    
    if (handler) {
      // 构建统一上下文对象
      const ctx = {
        effect,
        user,
        atk,
        target,
        effectTarget,
        isEnemy,
        result,
        skill  // 某些效果需要完整技能信息
      };
      
      handler(ctx);
    } else {
      // 未知效果类型，记录警告
      console.warn(`未知的效果类型: ${effect.type}`);
    }
  });
  
  return result;
}

// ==================== 持续效果处理 ====================

/**
 * 处理持续debuff的回合结束
 * 需要在battle.js的回合结束时调用
 * @param {Object} unit - 单位
 * @returns {Array} 日志数组
 */
export function processDurationDebuffs(unit) {
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

/**
 * 处理持续buff的回合结束
 * @param {Object} unit - 单位
 * @returns {Array} 日志数组
 */
export function processDurationBuffs(unit) {
  if (!unit.durationBuffs || unit.durationBuffs.length === 0) return [];
  
  const logs = [];
  const expiredBuffs = [];
  
  unit.durationBuffs.forEach((buff, index) => {
    buff.duration--;
    
    if (buff.duration <= 0) {
      // buff到期，移除效果
      if (buff.isPercent || buff.stat === 'dodge') {
        switch (buff.stat) {
          case 'def':
            unit.buffDefMultiplier = (unit.buffDefMultiplier || 0) - buff.value;
            break;
          case 'dodge':
            unit.dodgeChance = (unit.dodgeChance || 0) - buff.value;
            break;
        }
      } else {
        switch (buff.stat) {
          case 'def':
            unit.buffDef = (unit.buffDef || 0) - buff.value;
            break;
        }
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

// ==================== 动画播放 ====================

/**
 * 播放技能动画（占位符）
 * @param {string} userName - 使用者名称
 * @param {string} skillName - 技能名称
 */
export function playSkillAnimation(userName, skillName) {
  // console.log(`播放技能动画: ${userName} 使用 ${skillName}`);
  // 实际动画逻辑可以在这里实现，或者调用UI系统的动画函数
}