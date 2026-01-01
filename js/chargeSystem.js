// ==================== 充能技能系统 ====================
// 处理充能类技能（如夜莺的法术护盾）

import { SKILL_EFFECTS } from './skillData.js';

// ==================== 充能技能初始化 ====================

/**
 * 初始化充能技能
 * @param {Object} unit - 单位
 */
export function initChargeSkills(unit) {
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

// ==================== 充能处理 ====================

/**
 * 处理充能技能的回合充能
 * @param {Object} unit - 单位
 * @returns {Array} 日志数组
 */
export function processChargeSkills(unit) {
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

// ==================== 充能技能可用性检查 ====================

/**
 * 检查充能技能是否可用
 * @param {Object} unit - 单位
 * @param {string} skillName - 技能名称
 * @returns {boolean} 是否可用
 */
export function canUseChargeSkill(unit, skillName) {
  const skill = SKILL_EFFECTS[skillName];
  if (!skill || !skill.chargeSkill) return true;  // 非充能技能直接返回true
  
  if (!unit.chargeSkills || !unit.chargeSkills[skillName]) {
    initChargeSkills(unit);
  }
  
  return unit.chargeSkills[skillName].charges > 0;
}

// ==================== 消耗充能 ====================

/**
 * 消耗充能技能的充能
 * @param {Object} unit - 单位
 * @param {string} skillName - 技能名称
 */
export function consumeCharge(unit, skillName) {
  if (!unit.chargeSkills || !unit.chargeSkills[skillName]) return;
  
  const skill = SKILL_EFFECTS[skillName];
  if (!skill || !skill.chargeSkill) return;
  
  if (unit.chargeSkills[skillName].charges > 0) {
    unit.chargeSkills[skillName].charges--;
  }
}