// ==================== 词缀效果系统 ====================
// 处理敌人词缀相关的所有逻辑

import { CONFIG } from './config.js';
import { battle } from './state.js';

// ==================== 词缀检查函数 ====================

/**
 * 检查是否有词缀
 * @param {Object} unit - 单位
 * @param {string} affixName - 词缀名称
 * @returns {boolean}
 */
export function hasAffix(unit, affixName) {
  return unit.affixes && unit.affixes.includes(affixName);
}

/**
 * 获取词缀配置
 * @param {string} affixName - 词缀名称
 * @returns {Object|null}
 */
export function getAffixConfig(affixName) {
  return CONFIG.AFFIX?.TYPES?.[affixName] || null;
}

// ==================== 闪避词缀 ====================

/**
 * 处理闪避词缀
 * @param {Object} target - 目标单位
 * @param {Object} result - 结果对象（包含logs数组）
 * @returns {boolean} 是否闪避成功
 */
export function processAffixDodge(target, result) {
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

// ==================== 护盾词缀 ====================

/**
 * 处理词缀护盾（首次受击伤害减少50%，一次性效果）
 * @param {Object} target - 目标单位
 * @param {number} damage - 原始伤害
 * @param {Object} result - 结果对象
 * @returns {number} 处理后的伤害
 */
export function processAffixShield(target, damage, result) {
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

// ==================== 不死词缀 ====================

/**
 * 处理不死词缀
 * @param {Object} target - 目标单位
 * @param {Object} result - 结果对象
 * @returns {boolean} 是否触发不死效果
 */
export function processAffixUndying(target, result) {
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

// ==================== 反伤词缀 ====================

/**
 * 处理反伤词缀
 * @param {Object} target - 目标单位
 * @param {Object} attacker - 攻击者
 * @param {number} damage - 造成的伤害
 * @param {Object} result - 结果对象
 */
export function processAffixThorns(target, attacker, damage, result) {
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

// ==================== 吸血词缀 ====================

/**
 * 处理吸血词缀
 * @param {Object} attacker - 攻击者
 * @param {number} damage - 造成的伤害
 * @param {Object} result - 结果对象
 */
export function processAffixVampiric(attacker, damage, result) {
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

// ==================== 狂化词缀 ====================

/**
 * 获取狂化攻击加成
 * @param {Object} unit - 单位
 * @returns {number} 攻击加成比例（小数形式）
 */
export function getAffixBerserkBonus(unit) {
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

// ==================== 连击词缀 ====================

/**
 * 处理连击词缀
 * @param {Object} unit - 单位
 * @param {string} skillName - 技能名称
 * @returns {number} 攻击次数
 */
export function getAffixMultiStrikeCount(unit, skillName) {
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

// ==================== 回合开始词缀处理 ====================

/**
 * 处理回合开始时的词缀效果（回血等）
 * @param {Object} unit - 单位
 * @param {Object} result - 结果对象
 */
export function processAffixTurnStart(unit, result) {
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

// ==================== 死亡词缀处理 ====================

/**
 * 处理死亡时的词缀效果（分裂、爆炸）
 * @param {Object} unit - 死亡的单位
 * @param {Object} result - 结果对象
 * @returns {Array} 新创建的单位列表（分裂时）
 */
export function processAffixOnDeath(unit, result) {
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