// ==================== 敌人AI系统 ====================

import { SKILL_EFFECTS } from './skillData.js';

// ==================== 技能目标处理器映射表 ====================

/**
 * 技能目标类型 -> 处理函数的映射表
 * 每个处理器接收 ctx 上下文对象，返回 { target, strategy }
 */
const TARGET_HANDLERS = {
  single: (ctx) => ({
    target: chooseTarget(ctx.enemy, ctx.aliveAllies),
    strategy: null  // 稍后由 getStrategy 决定
  }),
  
  ally_lowest: (ctx) => ({
    target: ctx.aliveEnemies.reduce((a, b) =>
      (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
    ),
    strategy: '治疗'
  }),
  
  all_enemy: () => ({ target: null, strategy: '群攻' }),
  all: () => ({ target: null, strategy: '群攻' }),
  all_ally_enemy: () => ({ target: null, strategy: '群疗' }),
  self: () => ({ target: null, strategy: '强化' }),
  random2: () => ({ target: null, strategy: '连击' }),
  random3: () => ({ target: null, strategy: '连击' }),
  random6: () => ({ target: null, strategy: '连击' })
};

/**
 * 获取敌人决策
 * @param {Object} enemy - 敌人单位
 * @param {Array} aliveAllies - 存活的玩家单位（包含干员和召唤物）
 * @param {Array} aliveEnemies - 存活的敌人单位
 * @returns {Object} { skill, target, strategy }
 */
export function getEnemyDecision(enemy, aliveAllies, aliveEnemies) {
  const skill = chooseEnemySkill(enemy, aliveAllies, aliveEnemies);
  
  // 构建上下文
  const ctx = { enemy, aliveAllies, aliveEnemies, skill };
  
  // 根据技能目标类型选择处理器
  const handler = TARGET_HANDLERS[skill.target];
  let target = null;
  let strategy = '攻击';  // 默认策略
  
  if (handler) {
    const result = handler(ctx);
    target = result.target;
    strategy = result.strategy || getStrategy(enemy, target, aliveAllies);
  }
  
  return { skill, target, strategy };
}

// 敌人选择技能
function chooseEnemySkill(enemy, aliveAllies, aliveEnemies) {
  const skills = enemy.skills || ['普攻'];
  
  if (skills.length === 1) {
    return { name: '普攻', ...SKILL_EFFECTS['普攻'] };
  }
  
  const hpPercent = enemy.currentHp / enemy.maxHp;
  // 受伤的友军（血量低于90%）
  const injuredAllies = aliveEnemies.filter(e => e.currentHp / e.maxHp < 0.9);
  
  // 统计目标数量（干员+召唤物）
  const totalTargets = aliveAllies.length;
  const summonCount = aliveAllies.filter(a => a.isSummon).length;
  const operatorCount = totalTargets - summonCount;
  
  // 优先治疗（需要有受伤目标）
  if (injuredAllies.length > 0) {
    // 群疗优先（2个以上受伤且血量低于50%）
    const criticalAllies = aliveEnemies.filter(e => e.currentHp / e.maxHp < 0.5);
    if (skills.includes('群体治疗') && criticalAllies.length >= 2 && SKILL_EFFECTS['群体治疗']) {
      return { name: '群体治疗', ...SKILL_EFFECTS['群体治疗'] };
    }
    // 单体治疗
    if (skills.includes('战地治疗') && SKILL_EFFECTS['战地治疗']) {
      return { name: '战地治疗', ...SKILL_EFFECTS['战地治疗'] };
    }
  }
  
  // 低血量时狂暴
  if (hpPercent < 0.3 && skills.includes('狂暴') && SKILL_EFFECTS['狂暴']) {
    return { name: '狂暴', ...SKILL_EFFECTS['狂暴'] };
  }
  
  // 中等血量鼓舞
  if (hpPercent < 0.5 && skills.includes('鼓舞') && SKILL_EFFECTS['鼓舞']) {
    return { name: '鼓舞', ...SKILL_EFFECTS['鼓舞'] };
  }
  
  // 多目标时群攻（包含召唤物）
  if (totalTargets >= 3) {
    if (skills.includes('烈焰风暴') && SKILL_EFFECTS['烈焰风暴']) {
      return { name: '烈焰风暴', ...SKILL_EFFECTS['烈焰风暴'] };
    }
    if (skills.includes('横扫') && SKILL_EFFECTS['横扫']) {
      return { name: '横扫', ...SKILL_EFFECTS['横扫'] };
    }
  }
  
  // 随机使用特殊技能
  if (Math.random() < 0.6) {
    const specialSkills = skills.filter(s => s !== '普攻' && SKILL_EFFECTS[s]);
    if (specialSkills.length > 0) {
      const chosen = specialSkills[Math.floor(Math.random() * specialSkills.length)];
      return { name: chosen, ...SKILL_EFFECTS[chosen] };
    }
  }
  
  return { name: '普攻', ...SKILL_EFFECTS['普攻'] };
}

// 智能选择目标
function chooseTarget(enemy, aliveAllies) {
  // ====== 玩家嘲讽机制：检查是否有嘲讽单位 ======
  const tauntTargets = aliveAllies.filter(target => {
    // 召唤物嘲讽
    if (target.isSummon && target.buffs && target.buffs.taunt) {
      return true;
    }
    // 干员嘲讽（未来扩展用）
    if (!target.isSummon && target.tauntBuff) {
      return true;
    }
    return false;
  });
  
  // 如果有嘲讽单位，只能从嘲讽单位中选择目标
  const validTargets = tauntTargets.length > 0 ? tauntTargets : aliveAllies;
  
  const calcExpectedDmg = (t) => {
    const tDef = t.def || 0;
    return Math.max(1, Math.floor(enemy.atk - tDef * 0.5));
  };
  
  const scores = validTargets.map(target => {
    let score = 0;
    const expectedDmg = calcExpectedDmg(target);
    const targetHp = target.currentHp;
    const targetMaxHp = target.maxHp;
    const hpPercent = targetHp / targetMaxHp;
    
    // ====== 召唤物特殊处理 ======
    if (target.isSummon) {
      // 能击杀召唤物优先（清理场面）
      if (targetHp <= expectedDmg) score += 800;
      // 残血召唤物
      if (hpPercent < 0.3) score += 150;
      // 召唤物基础优先级较低（除非能击杀）
      score -= 50;
      // 随机因子
      score += Math.random() * 20;
      
      return { target, score };
    }
    
    // ====== 干员处理 ======
    
    // 能击杀优先
    if (targetHp <= expectedDmg) score += 1000;
    // 残血优先
    if (hpPercent < 0.3) score += 200;
    
    // 召唤师优先（杀死召唤师则召唤物消失）
    if (target.isSummoner) {
      score += 120;
      // 如果场上有召唤物，更优先攻击召唤师
      const hasSummons = aliveAllies.some(a => a.isSummon && a.ownerId === target.id);
      if (hasSummons) score += 80;
    }
    
    // 治疗职业优先
    if (target.skills && target.skills.some(s => s.includes('治疗') || s.includes('群疗'))) {
      score += 150;
    }
    
    // 高能量优先（能量快满的干员可能放大招）
    const targetEnergy = target.energy || 0;
    if (targetEnergy >= 70) score += 100;
    
    // 高攻击优先
    const operators = aliveAllies.filter(a => !a.isSummon);
    if (operators.length > 0) {
      const maxAtk = Math.max(...operators.map(a => a.atk || 0));
      if (maxAtk > 0) {
        score += ((target.atk || 0) / maxAtk) * 80;
      }
    }
    
    // 随机因子
    score += Math.random() * 30;
    
    return { target, score };
  });
  
  scores.sort((a, b) => b.score - a.score);
  
  // 如果选中的是嘲讽单位，添加调试日志
  const selectedTarget = scores[0].target;
  if (tauntTargets.length > 0 && tauntTargets.includes(selectedTarget)) {
    console.log(`🎯 敌人 ${enemy.name} 被嘲讽！必须攻击 ${selectedTarget.name}`);
  }
  
  return selectedTarget;
}

// 获取AI策略描述
function getStrategy(enemy, target, aliveAllies) {
  // 召唤物特殊描述
  if (target.isSummon) {
    const calcExpectedDmg = (t) => Math.max(1, Math.floor(enemy.atk - (t.def || 0) * 0.5));
    const expectedDmg = calcExpectedDmg(target);
    
    if (target.currentHp <= expectedDmg) return '清除召唤物';
    if (target.currentHp / target.maxHp < 0.3) return '消灭残血召唤物';
    return '攻击召唤物';
  }
  
  // 干员策略描述
  const calcExpectedDmg = (t) => Math.max(1, Math.floor(enemy.atk - (t.def || 0) * 0.5));
  const expectedDmg = calcExpectedDmg(target);
  
  if (target.currentHp <= expectedDmg) return '补刀';
  if (target.currentHp / target.maxHp < 0.3) return '集火残血';
  
  // 召唤师特殊策略
  if (target.isSummoner) {
    const hasSummons = aliveAllies.some(a => a.isSummon && a.ownerId === target.id);
    if (hasSummons) return '斩首召唤师';
    return '攻击召唤师';
  }
  
  if (target.skills && target.skills.some(s => s.includes('治疗') || s.includes('群疗'))) {
    return '针对治疗';
  }
  
  const targetEnergy = target.energy || 0;
  if (targetEnergy >= 70) return '阻断大招';
  
  const operators = aliveAllies.filter(a => !a.isSummon);
  if (operators.length > 0) {
    const maxAtk = Math.max(...operators.map(a => a.atk || 0));
    if (maxAtk > 0 && (target.atk || 0) >= maxAtk * 0.9) return '压制输出';
  }
  
  return '择优攻击';
}
