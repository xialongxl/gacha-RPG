// ==================== SmartAI 战斗整合模块（无尽模式专用） ====================
// 
// 功能说明：
// - 本模块仅在无尽模式中生效，不影响普通关卡
// - 负责记录玩家行动数据，用于训练SmartAI
// - 20层后启用SmartAI进行敌人决策
// - 提供调试工具用于查看AI状态、手动训练、导出数据等
//
// 依赖：
// - smartAI.js (SmartAI核心)
// - battle.js (战斗系统)
// - skills.js (SKILL_EFFECTS)
//
// ========================================================================

import { SmartAI } from './smartAI.js';
import { battle } from '../state.js';
import { SKILL_EFFECTS } from '../skillData.js';
import { EndlessMode } from './endless.js';

export const SmartAI_Battle = {
  
  // 是否启用AI学习（仅无尽模式）
  // 设为false可临时禁用数据收集
  learningEnabled: true,
  
  // ==================== 数据记录（仅无尽模式） ====================
  
  /**
   * 记录敌人技能使用（用于训练敌人AI）
   * 在敌人行动后调用，用于收集训练数据
   *
   * @param {Object} enemy - 使用技能的敌人
   * @param {Object} decision - 敌人的决策 { skill, target, strategy }
   * @param {Array} aliveAllies - 存活的玩家单位
   * @param {Array} aliveEnemies - 存活的敌人单位
   */
  async recordEnemyAction(enemy, decision, aliveAllies, aliveEnemies) {
    // 只在无尽模式记录
    if (!battle.isEndless) return;
    if (!this.learningEnabled) return;
    if (typeof SmartAI === 'undefined') return;
    
    // 构建当前战场状态（从敌人视角）
    const battleState = this.getEnemyBattleState(enemy, aliveAllies, aliveEnemies);
    
    // 编码敌人行动
    const action = {
      skillIndex: this.getEnemySkillIndex(enemy, decision.skill.name),
      targetIndex: this.getEnemyTargetIndex(decision.target, aliveAllies),
      skillName: decision.skill.name,
      targetName: decision.target ? decision.target.name : ''
    };
    
    // 记录到SmartAI数据库
    await SmartAI.recordEnemyAction(battleState, action);
  },
  
  /**
   * 记录玩家技能使用（保留但不再用于训练）
   * @deprecated 改用 recordEnemyAction
   */
  async recordPlayerSkill(user, skillName, target) {
    // 不再使用，保留函数签名避免报错
    return;
  },
  
  /**
   * 获取敌人视角的战场状态
   * 用于特征提取（敌人AI训练）
   *
   * @param {Object} enemy - 当前行动的敌人
   * @param {Array} aliveAllies - 存活的玩家单位
   * @param {Array} aliveEnemies - 存活的敌人单位
   * @returns {Object} 战场状态对象（敌人视角）
   */
  getEnemyBattleState(enemy, aliveAllies, aliveEnemies) {
    // 获取玩家Roguelike强化列表（敌人需要知道玩家有什么buff来反制）
    let playerBuffs = [];
    if (typeof EndlessMode !== 'undefined' && EndlessMode.currentBuffs) {
      playerBuffs = EndlessMode.currentBuffs.map(b => b.key);
    }
    
    // 从敌人视角：
    // - allies = 其他敌人（敌人的友方）
    // - enemies = 玩家单位（敌人的敌方）
    return {
      allies: aliveEnemies || [],            // 敌人视角：其他敌人是友方
      summons: [],                           // 敌人没有召唤物
      enemies: aliveAllies || [],            // 敌人视角：玩家单位是敌方
      currentUnit: enemy,                    // 当前行动的敌人
      turn: battle.currentTurn || 0,         // 当前回合数
      floor: battle.endlessFloor || 0,       // 无尽模式层数
      playerBuffs: playerBuffs               // 玩家的强化（敌人需要知道）
    };
  },
  
  /**
   * 获取当前战场状态（保留用于兼容）
   * @deprecated 改用 getEnemyBattleState
   */
  getBattleState(currentUnit) {
    return this.getEnemyBattleState(currentUnit, battle.allies, battle.enemies);
  },
  
  /**
   * 获取敌人技能在其技能列表中的索引
   *
   * @param {Object} enemy - 敌人单位
   * @param {string} skillName - 技能名称
   * @returns {number} 技能索引（从0开始）
   */
  getEnemySkillIndex(enemy, skillName) {
    if (!enemy || !enemy.skills) return 0;
    const index = enemy.skills.indexOf(skillName);
    return index >= 0 ? index : 0;
  },
  
  /**
   * 获取目标在玩家单位列表中的索引（敌人视角）
   *
   * @param {Object} target - 目标单位
   * @param {Array} aliveAllies - 存活的玩家单位（敌人的攻击目标）
   * @returns {number} 目标索引（从0开始）
   */
  getEnemyTargetIndex(target, aliveAllies) {
    if (!target) return 0;
    
    // 敌人攻击的目标是玩家单位
    const index = aliveAllies.findIndex(a => a.id === target.id || a.unitId === target.unitId);
    return index >= 0 ? index : 0;
  },
  
  /**
   * @deprecated 保留用于兼容
   */
  getSkillIndex(user, skillName) {
    return this.getEnemySkillIndex(user, skillName);
  },
  
  /**
   * @deprecated 保留用于兼容
   */
  getTargetIndex(target) {
    if (!target) return 0;
    const allies = [...battle.allies, ...battle.summons].filter(a => a.currentHp > 0);
    const index = allies.findIndex(a => a.id === target.id || a.unitId === target.unitId);
    return index >= 0 ? index : 0;
  },
  
  // ==================== AI决策（仅无尽模式20层后） ====================
  
  /**
   * 获取无尽模式敌人决策
   * 使用训练好的SmartAI模型进行决策
   * 
   * @param {Object} enemy - 当前行动的敌人
   * @param {Array} aliveAllies - 存活的玩家单位（包含召唤物）
   * @param {Array} aliveEnemies - 存活的敌人单位
   * @returns {Object|null} 决策对象，包含skill和target；如果不使用SmartAI则返回null
   */
  getEndlessEnemyDecision(enemy, aliveAllies, aliveEnemies) {
    // 检查是否满足使用SmartAI的条件
    
    // 必须是无尽模式
    if (!battle.isEndless) return null;
    
    // 必须启用了SmartAI（20层后）
    if (!battle.useSmartAI) return null;
    
    // SmartAI必须已加载
    if (typeof SmartAI === 'undefined') return null;
    
    // 模型必须已就绪
    if (!SmartAI.isModelReady) return null;
    
    // 构建战场状态（从敌人视角）
    // 注意：敌人的"友方"是其他敌人，"敌方"是玩家单位
    const battleState = {
      allies: aliveEnemies,          // 敌人视角：其他敌人是友方
      summons: [],                   // 敌人没有召唤物
      enemies: aliveAllies,          // 敌人视角：玩家单位是敌方
      currentUnit: enemy,            // 当前行动的敌人
      turn: battle.currentTurn || 0  // 当前回合数
    };
    
    // 获取敌人可用技能
    const availableSkills = (enemy.skills || ['普攻']).map(name => ({
      name: name,
      ...SKILL_EFFECTS[name]
    }));
    
    // 获取可用目标（玩家单位）
    const availableTargets = aliveAllies.filter(a => a.currentHp > 0);
    
    // 没有目标则返回null
    if (availableTargets.length === 0) return null;
    
    // 调用SmartAI进行决策
    return SmartAI.getDecision(battleState, availableSkills, availableTargets);
  },
  
  // ==================== 战斗生命周期（仅无尽模式） ====================
  
  /**
   * 战斗开始时调用
   * 开始记录新的一场战斗
   * 
   * @param {Array} playerTeam - 玩家队伍数据
   */
  async onBattleStart(playerTeam) {
    // 只在无尽模式记录
    if (!battle.isEndless) return;
    if (!this.learningEnabled) return;
    if (typeof SmartAI === 'undefined') return;
    
    await SmartAI.startBattleRecord(playerTeam);
  },
  
  /**
   * 战斗结束时调用
   * 结束当前战斗记录，更新胜负结果
   * 
   * @param {boolean} victory - 是否胜利
   */
  async onBattleEnd(victory) {
    // 只在无尽模式记录
    if (!battle.isEndless) return;
    if (!this.learningEnabled) return;
    if (typeof SmartAI === 'undefined') return;
    
    await SmartAI.endBattleRecord(victory);
  },
  
  // ==================== 调试工具 ====================
  
  /**
   * 显示AI状态
   * 在控制台输出当前AI的学习进度和模型状态
   * 
   * @returns {Object|null} 统计信息对象
   */
  async showAIStatus() {
    if (typeof SmartAI === 'undefined') {
      console.log('❌ SmartAI 未加载');
      return null;
    }
    
    const stats = await SmartAI.getStats();
    
    console.log(`
╔═══════════════════════════════════════╗
║        🧠 SmartAI 状态（无尽模式）      ║
╠═══════════════════════════════════════╣
║ 战斗记录: ${stats.totalBattles} 场
║ 胜/负: ${stats.wins}/${stats.losses} (${stats.winRate})
║ 训练数据: ${stats.trainingDataCount} 条
║ 模型状态: ${stats.isModelReady ? '✅ 就绪' : '⏳ 未就绪'}
${stats.needMoreData ? `║ 还需: ${stats.battlesNeeded} 场战斗数据` : ''}
╚═══════════════════════════════════════╝
    `);
    
    return stats;
  },
  
  /**
   * 手动触发训练
   * 强制开始训练模型，不管数据量是否足够
   */
  async forceTraining() {
    if (typeof SmartAI === 'undefined') {
      console.log('❌ SmartAI 未加载');
      return;
    }
    
    console.log('🎓 强制开始训练...');
    await SmartAI.trainModel();
  },
  
  /**
   * 清除所有AI数据
   * 删除所有战斗记录、训练数据和模型参数
   * 会弹出确认对话框
   */
  async clearAIData() {
    if (typeof SmartAI === 'undefined') {
      console.log('❌ SmartAI 未加载');
      return;
    }
    
    if (confirm('确定要清除所有AI学习数据吗？这将删除所有战斗记录和训练好的模型。')) {
      await SmartAI.clearAllData();
      console.log('✅ AI数据已清除');
    }
  },
  
  /**
   * 导出训练数据
   * 将所有战斗记录和训练数据导出到控制台
   * 用于调试和分析
   * 
   * @returns {Object|null} 包含battles、trainingData、model的对象
   */
  async exportTrainingData() {
    if (typeof SmartAI === 'undefined') {
      console.log('❌ SmartAI 未加载');
      return null;
    }
    
    const data = await SmartAI.exportData();
    console.log('📦 训练数据已导出:');
    console.log('  - 战斗记录:', data.battles?.length || 0, '场');
    console.log('  - 训练数据:', data.trainingData?.length || 0, '条');
    console.log('  - 模型状态:', data.model ? '已加载' : '未加载');
    console.log(data);
    return data;
  },
  
  /**
   * 获取统计信息
   * 返回AI的各项统计数据
   * 
   * @returns {Object|null} 统计信息对象
   */
  async getStats() {
    if (typeof SmartAI === 'undefined') {
      return null;
    }
    return await SmartAI.getStats();
  },
  
  /**
   * 启用/禁用AI学习
   * 
   * @param {boolean} enabled - 是否启用
   */
  setLearningEnabled(enabled) {
    this.learningEnabled = enabled;
    console.log(`🧠 AI学习已${enabled ? '启用' : '禁用'}`);
  }
};

// ==================== 全局快捷方法 ====================
// 这些方法可以直接在浏览器控制台中调用

/**
 * 显示AI状态
 * 用法：在控制台输入 showAIStatus()
 */
window.showAIStatus = function() {
  return SmartAI_Battle.showAIStatus();
};

/**
 * 强制训练AI
 * 用法：在控制台输入 forceTrainAI()
 */
window.forceTrainAI = function() {
  return SmartAI_Battle.forceTraining();
};

/**
 * 清除所有AI数据
 * 用法：在控制台输入 clearAIData()
 */
window.clearAIData = function() {
  return SmartAI_Battle.clearAIData();
};

/**
 * 导出训练数据
 * 用法：在控制台输入 exportAIData()
 */
window.exportAIData = function() {
  return SmartAI_Battle.exportTrainingData();
};
