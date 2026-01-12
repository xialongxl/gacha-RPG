// ==================== 战斗系统 ====================

import { state, battle, saveState, resetBattle, syncSummons } from './state.js';
import { CONFIG, applyPotentialBonus } from './config.js';
import { CHARACTER_DATA, STAGES } from './data.js';
import { AudioManager, playBattleBGM, playMainBGM } from './audio.js';
import { 
  addBattleLog, showModal, 
  closeBattleField, clearAllSpineInstances, updateResourceUI 
} from './ui.js';

// 原版 DOM 渲染器（备用）
import { BattleRenderer } from './battleRenderer.js';

// Pixi 版渲染器
//import { PixiBattleRenderer as BattleRenderer } from './pixiBattle/index.js';

// 预留 Import，将在后续步骤重构这些文件
import { getEnemyDecision } from './enemyAI.js';
import { SummonSystem } from './summon.js';
import { EndlessMode } from './endless_and_smartAI/endless.js';
import { SmartAI_Battle } from './endless_and_smartAI/smartAI_battle.js';
import { SmartAI } from './endless_and_smartAI/smartAI.js';
import {
  SKILL_EFFECTS, executeSkillEffects, LEADER_BONUS,
  initChargeSkills, canUseChargeSkill, consumeCharge, processChargeSkills,
  processDurationBuffs, processDurationDebuffs, playSkillAnimation,
  processAffixOnDeath, processAffixTurnStart,
  getUnitAtk, getUnitSpd as _getUnitSpd, getUnitDef
} from './skillCore.js';

// 已渲染的Spine容器ID记录 (保留导出以防其他模块依赖，但不再使用)
export const renderedSpineUnits = new Set();

// 更新关卡UI
export function updateStageUI() {
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  
  STAGES.forEach(stage => {
    const btn = document.createElement('button');
    btn.className = 'stage-btn';
    btn.innerHTML = `
      <div><b>${stage.name}</b></div>
      <small>金币: ${stage.rewards.gold} | 抽卡券：${stage.rewards.tickets}</small>
    `;
    btn.onclick = () => startBattle(stage);
    list.appendChild(btn);
  });
}

// 开始战斗
export function startBattle(stage) {
  const team = state.team.filter(c => c !== null);
  if (team.length === 0) {
    alert('请先编队！');
    return;
  }

  saveState();
  
  // 清理所有Spine实例，防止WebGL上下文过多
  if (typeof clearAllSpineInstances === 'function') {
    clearAllSpineInstances();
  }
  
  resetBattle();
  BattleRenderer.init();
  battle.active = true;
  battle.stage = stage;
  
  battle.allies = team.map((name, index) => {
    const data = CHARACTER_DATA[name];
    const potential = state.inventory[name]?.potential || 1;
    const breakthrough = state.inventory[name]?.breakthrough || null;
    
    // 先计算潜能加成
    let hp = applyPotentialBonus(data.hp, potential);
    let atk = applyPotentialBonus(data.atk, potential);
    let def = applyPotentialBonus(data.def, potential);
    let spd = data.spd;
    
    // 应用突破加成
    if (breakthrough === 'stats') {
      // 属性突破：额外 +40% 的基础值
      hp += Math.floor(data.hp * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
      atk += Math.floor(data.atk * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
      def += Math.floor(data.def * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
    } else if (breakthrough === 'speed') {
      // 速度突破：基础速度 × 1.4
      spd = Math.floor(data.spd * (1 + CONFIG.BREAKTHROUGH.SPEED_BONUS));
    }
    
    return {
      id: `ally_${name}_${Date.now()}_${index}`,  // 添加唯一ID
      name,
      rarity: data.rarity,
      hp: hp,
      atk: atk,
      def: def,
      spd: spd,
      skills: [...data.skills],
      currentHp: hp,
      maxHp: hp,
      energy: 0,
      maxEnergy: 100,
      buffAtk: 0,
      buffAtkMultiplier: 0,   // ATK倍率加成（召唤技能用，小数）
      buffSpd: 0,             // SPD加成（召唤技能用）
      stunDuration: 0,
      isEnemy: false,
      isLeader: index === 0,
      isSummoner: data.summoner || false,  // 是否是召唤师
      isSummon: false,                      // 不是召唤物
      breakthrough: breakthrough,           // 保存突破状态
      actionGauge: 0,                       // 初始化行动条
      unitId: `ally-${name}-${Date.now()}-${index}`
    };
  });
  
  battle.enemies = stage.enemies.map((e, idx) => ({
    id: `enemy_${e.name}_${Date.now()}_${idx}`,  // 添加唯一ID
    name: e.name,
    hp: e.hp,
    atk: e.atk,
    def: e.def,
    spd: e.spd,
    skills: e.skills || ['普攻'],
    currentHp: e.hp,
    maxHp: e.hp,
    energy: 0,
    maxEnergy: 100,
    buffAtk: 0,
    buffAtkMultiplier: 0,
    buffSpd: 0,
    stunDuration: 0,
    shield: e.shield || 0,
    currentShield: e.shield || 0,
    shieldBroken: false,
    originalDef: e.def,
    isEnemy: true,
    isSummon: false,
    actionGauge: 0,                         // 初始化行动条
    unitId: `enemy-${e.name}-${idx}-${Date.now()}`
  }));
  
  // ====== 初始化召唤系统 ======
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.init(battle.allies);
  }
  
  // ====== 初始化充能技能（夜莺等） ======
  battle.allies.forEach(ally => {
    if (typeof initChargeSkills === 'function') {
      initChargeSkills(ally);
    }
  });
  
  document.getElementById('stage-panel').style.display = 'none';
  document.getElementById('battle-field').classList.add('active');
  
  // 切换战斗BGM（使用歌单）
  playBattleBGM();
  
  addBattleLog('⚔️ 战斗开始！', 'system');
  // calculateTurnOrder(); // 不再需要预计算顺序
  battle.currentTurn = 0; // 这里的 currentTurn 改为总行动次数计数
  
  BattleRenderer.renderBattleInitial();
  setTimeout(() => nextTurn(), 500);
}

// ==================== 属性获取函数（从 skillCore.js 统一导入） ====================
// 重新导出供 battleRenderer.js 使用，保持向后兼容

export function getUnitSpd(unit) {
  return _getUnitSpd(unit);
}

export function getUnitAtkDisplay(unit) {
  return getUnitAtk(unit);
}

export function getUnitDefDisplay(unit) {
  return getUnitDef(unit);
}

// ==================== 战斗渲染 (代理到 BattleRenderer) ====================

export function renderBattleInitial() {
  BattleRenderer.renderBattleInitial();
}

export function renderBattle() {
  BattleRenderer.renderBattle();
}

// ==================== 技能UI ====================

// 选择技能
export function selectSkill(skillName, unit) {
  const skill = SKILL_EFFECTS[skillName];
  if (!skill) return;
  
  battle.selectedSkill = {
    name: skillName,
    ...skill,
    user: unit
  };
  
  if (skill.target === 'single') {
    BattleRenderer.showEnemyTargetSelect();
  } else if (skill.target === 'dual') {
    // 双目标技能（迷迭香"如你所愿"）
    BattleRenderer.showDualTargetSelect();
  } else if (skill.target === 'ally') {
    BattleRenderer.showAllyTargetSelect(unit);
  } else {
    executePlayerSkill(battle.selectedSkill, null);
  }
}

// 显示敌人目标选择（代理）
export function showEnemyTargetSelect() {
  BattleRenderer.showEnemyTargetSelect();
}

// 显示队友目标选择（代理）
export function showAllyTargetSelect(currentUnit) {
  BattleRenderer.showAllyTargetSelect(currentUnit);
}

// ==================== 技能执行（玩家） ====================

// 执行玩家技能
export function executePlayerSkill(skill, target) {
  const user = skill.user;
  
  // 召唤物不消耗能量
  if (!user.isSummon) {
    // 计算实际消耗（队长技能可能减少消耗）
    let actualCost = skill.cost;
    if (user.isLeader && typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[user.name]) {
      const bonus = LEADER_BONUS[user.name];
      if (skill.name === bonus.skill && bonus.costReduce) {
        actualCost = Math.max(0, skill.cost - bonus.costReduce);
      }
    }
    
    // 消耗和获得能量
    user.energy -= actualCost;
    user.energy = Math.min(user.maxEnergy, user.energy + skill.gain);
    
    // 消耗充能技能的充能
    if (typeof consumeCharge === 'function') {
      consumeCharge(user, skill.name);
    }
  }
  
  // 清空UI
  document.getElementById('skill-buttons').innerHTML = '';
  document.getElementById('target-select').innerHTML = '';
  
  // 播放技能动画
  if (typeof playSkillAnimation === 'function') {
    playSkillAnimation(user.name, skill.name);
  }

  // 日志（区分召唤物）
  const unitPrefix = user.isSummon ? '🔮' : '';
  addBattleLog(`${unitPrefix}${user.name} 使用【${skill.name}】`, 'system');
  
  // 执行技能效果，获取结果
  const result = executeSkillEffects(skill, user, target, false);
  
  // 处理结果
  handleSkillResult(result);
  
  // 检查死亡
  checkDeaths();
  
  // ====== 回合结束处理：buff持续时间递减 ======
  processUnitTurnEnd(user);
  
  // 进入下一回合
  // 行动结束，清除当前单位标记
  battle.currentUnit = null;
  BattleRenderer.renderBattle();
  battle.currentTurn++;
  
  // 扣除行动条 (保留溢出部分)
  user.actionGauge -= 10000;
  
  setTimeout(() => nextTurn(), 1000);
}

// 处理单位回合结束（buff持续时间递减）
function processUnitTurnEnd(unit) {
  // 召唤物的buff持续时间递减
  if (unit.isSummon && typeof SummonSystem !== 'undefined') {
    const result = SummonSystem.onSummonTurnEnd(unit);
    if (result && result.expiredBuffs && result.expiredBuffs.length > 0) {
      result.expiredBuffs.forEach(buff => {
        addBattleLog(`  → 🔮${unit.name} 的${buff.name}效果结束！`, 'system');
      });
    }
  }
  
  // 干员的healPerTurn持续时间递减
  if (!unit.isEnemy && !unit.isSummon) {
    if (unit.healPerTurnDuration && unit.healPerTurnDuration > 0) {
      unit.healPerTurnDuration--;
      if (unit.healPerTurnDuration <= 0) {
        unit.healPerTurn = 0;
        addBattleLog(`  → ${unit.name} 的每回合回血效果结束！`, 'system');
      }
    }
  }
}

// 处理技能执行结果
function handleSkillResult(result) {
  // 输出日志
  result.logs.forEach(log => {
    addBattleLog(log.text, log.type);
  });
}

// ==================== 死亡检查 ====================

// 检查所有单位死亡状态
function checkDeaths() {
  // 检查敌人死亡（含词缀处理）
  const deadEnemies = battle.enemies.filter(e => e.currentHp <= 0 && !e.deathLogged);
  deadEnemies.forEach(enemy => {
    enemy.deathLogged = true;
    
    // 处理死亡词缀（爆炸、分裂）
    if (typeof processAffixOnDeath === 'function' && enemy.affixes && enemy.affixes.length > 0) {
      const result = { logs: [] };
      const newUnits = processAffixOnDeath(enemy, result);
      
      // 输出词缀效果日志
      result.logs.forEach(log => addBattleLog(log.text, log.type));
      
      // 添加分裂单位到敌人列表
      if (newUnits && newUnits.length > 0) {
        // 初始化分裂单位的行动条
        newUnits.forEach(u => u.actionGauge = 0);
        battle.enemies.push(...newUnits);
      }
    }
    
    addBattleLog(`💀 ${enemy.name} 被击败！`, 'system');
  });
  
  // 检查普通干员死亡
  const deadAllies = battle.allies.filter(a => a.currentHp <= 0 && !a.deathLogged);
  deadAllies.forEach(ally => {
    // 检查免死金牌（Roguelike强化）
    if (ally.hasExtraLife && !ally.extraLifeUsed) {
      ally.extraLifeUsed = true;
      ally.currentHp = Math.floor(ally.maxHp * 0.3);  // 恢复30%HP
      addBattleLog(`💖 ${ally.name} 触发【免死金牌】！复活并恢复30%HP！`, 'system');
      return;  // 不标记为死亡，跳过
    }
    
    ally.deathLogged = true;
    addBattleLog(`💔 ${ally.name} 倒下了！`, 'system');
    
    // 如果是召唤者，处理召唤物联动消失
    if (ally.isSummoner) {
      const summons = SummonSystem.getSummonsByOwner(ally);
      if (summons.length > 0) {
        addBattleLog(`${ally.name} 的召唤物一同消失！`, 'system');
        SummonSystem.onOwnerDeath(ally);
      }
    }
  });
  
  // 检查召唤物死亡（直接从 SummonSystem.summons 检查，不是 battle.summons）
  if (typeof SummonSystem !== 'undefined') {
    const deadSummons = SummonSystem.summons.filter(s => s.currentHp <= 0 && !s.deathLogged);
    deadSummons.forEach(summon => {
      summon.deathLogged = true;
      addBattleLog(`🔮 ${summon.name} 被消灭！`, 'system');
      SummonSystem.onSummonDeath(summon);
    });
  }
  
  // 最后再同步召唤物状态
  syncSummons();
}

// ==================== 回合控制 ====================

// 下一回合
export function nextTurn() {
  if (!battle.active) return;
  
  // 同步召唤物（确保新召唤物加入战斗列表）
  syncSummons();
  
  const aliveAllies = battle.allies.filter(u => u.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(u => u.currentHp > 0);
  const aliveSummons = battle.summons.filter(s => s.currentHp > 0);
  const allUnits = [...aliveAllies, ...aliveSummons, ...aliveEnemies];
  
  // 检查战斗结束
  if (aliveEnemies.length === 0) {
    endBattle(true);
    return;
  }
  if (aliveAllies.length === 0 && aliveSummons.length === 0) {
    endBattle(false);
    return;
  }
  
  // 确保所有单位都有 actionGauge
  allUnits.forEach(u => {
    if (u.actionGauge === undefined) u.actionGauge = 0;
  });
  
  // 1. 寻找当前是否有已满行动条的单位 (AG >= 10000)
  // 如果有多个，选溢出最多的（即速度最快的）
  let readyUnits = allUnits.filter(u => u.actionGauge >= 10000);
  
  if (readyUnits.length === 0) {
    // 2. 如果没有单位满条，进行“跑条”
    // 计算每个单位到达 10000 所需的时间 (Time To Act)
    // TTA = (10000 - AG) / SPD
    let minTTA = Infinity;
    
    allUnits.forEach(u => {
      const spd = Math.max(1, getUnitSpd(u)); // 防止除以0
      const needed = 10000 - u.actionGauge;
      const tta = needed / spd;
      if (tta < minTTA) minTTA = tta;
    });
    
    // 推进时间
    allUnits.forEach(u => {
      const spd = Math.max(1, getUnitSpd(u));
      u.actionGauge += spd * minTTA;
    });
    
    // 重新获取满条单位
    readyUnits = allUnits.filter(u => u.actionGauge >= 10000);
    
    // 理论上此时必须有单位满条，但为了防止浮点数误差，做个保底
    if (readyUnits.length === 0) {
      // 强制让最接近的满条
      readyUnits = [allUnits.sort((a, b) => b.actionGauge - a.actionGauge)[0]];
      readyUnits[0].actionGauge = 10000;
    }
  }
  
  // 3. 选出行动单位（溢出最多的）
  readyUnits.sort((a, b) => b.actionGauge - a.actionGauge);
  const current = readyUnits[0];
  
  // 更新当前行动单位记录（供渲染器使用）
  battle.currentUnit = current;
  
  // 简单的回合分割线日志（每10次行动显示一次，或者根据累计时间显示）
  if (battle.currentTurn % 10 === 0 && battle.currentTurn > 0) {
    // addBattleLog('--- 时间流逝 ---', 'system');
  }
  
  // ====== 干员每回合回血处理（生态耦合等技能） ======
  if (!current.isEnemy && !current.isSummon && current.healPerTurn && current.healPerTurn > 0) {
    const healAmount = Math.floor(current.maxHp * current.healPerTurn);
    const oldHp = current.currentHp;
    current.currentHp = Math.min(current.maxHp, current.currentHp + healAmount);
    const actualHeal = current.currentHp - oldHp;
    
    if (actualHeal > 0) {
      addBattleLog(`  💚 ${current.name} 回复 ${actualHeal} HP！`, 'heal');
    }
  }
  
  // ====== 处理充能技能（夜莺法术护盾等） ======
  if (!current.isEnemy && !current.isSummon && typeof processChargeSkills === 'function') {
    const chargeLogs = processChargeSkills(current);
    chargeLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 处理持续buff（圣域DEF/闪避等） ======
  if (!current.isEnemy && !current.isSummon && typeof processDurationBuffs === 'function') {
    const buffLogs = processDurationBuffs(current);
    buffLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 召唤物回合开始处理 ======
  if (current.isSummon) {
    // 处理召唤物回合开始效果（如回血）
    const result = SummonSystem.onSummonTurnStart(current);
    if (result && result.healed > 0) {
      addBattleLog(`🔮${current.name} 回复了 ${result.healed} HP`, 'heal');
    }
    
    BattleRenderer.renderBattle();
    BattleRenderer.showSkillButtons(current);
    return;
  }
  
  // ====== 召唤师回合开始处理 ======
  if (current.isSummoner && !current.isEnemy) {
    const newSummons = SummonSystem.onSummonerTurnStart(current);
    newSummons.forEach(summon => {
      addBattleLog(`🔮 ${current.name} 召唤了【${summon.name}】！`, 'system');
    });
    
    // 同步并重新计算行动顺序（新召唤物需要加入）
    if (newSummons.length > 0) {
      syncSummons();
      // 初始化新召唤物的行动条
      newSummons.forEach(s => s.actionGauge = 0);
      BattleRenderer.renderBattle();
    }
  }
  
  // 处理眩晕
  if (current.stunDuration > 0) {
    current.stunDuration--;
    addBattleLog(`${current.name} 处于眩晕状态，跳过行动！`, 'system');
    BattleRenderer.renderBattle();
    battle.currentTurn++;
    
    // 眩晕也要扣除行动条，相当于空过一回合
    current.actionGauge -= 10000;
    
    setTimeout(() => nextTurn(), 800);
    return;
  }
  
  // 正常行动开始时，检查是否需要恢复护盾
  if (current.shieldBroken) {
    current.shieldBroken = false;
    current.currentShield = current.shield;
    current.def = current.originalDef;
    addBattleLog(`${current.name} 护盾恢复！`, 'system');
  }
  
  BattleRenderer.renderBattle();
  
  if (current.isEnemy) {
    setTimeout(() => enemyTurn(current), 800);
  } else {
    BattleRenderer.showSkillButtons(current);
  }
}

// 敌人回合
function enemyTurn(enemy) {
  const aliveAllies = battle.allies.filter(a => a.currentHp > 0);
  const aliveSummons = battle.summons.filter(s => s.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  
  // ====== 处理敌人回合开始的词缀效果 ======
  if (typeof processAffixTurnStart === 'function' && enemy.affixes && enemy.affixes.length > 0) {
    const affixResult = { logs: [] };
    processAffixTurnStart(enemy, affixResult);
    affixResult.logs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 处理敌人身上的持续debuff ======
  if (typeof processDurationDebuffs === 'function' && enemy.durationDebuffs && enemy.durationDebuffs.length > 0) {
    const debuffLogs = processDurationDebuffs(enemy);
    debuffLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // 合并所有我方目标（干员+召唤物）
  const allTargets = [...aliveAllies, ...aliveSummons];
  
  if (allTargets.length === 0) return;
  
  // 获取敌人决策（传入所有目标：干员+召唤物）
  let decision;
  if (battle.isEndless && typeof EndlessMode !== 'undefined') {
    decision = EndlessMode.getEnemyDecision(enemy, allTargets, aliveEnemies);
  } else {
    decision = getEnemyDecision(enemy, allTargets, aliveEnemies);
  }
  
  // 日志
  addBattleLog(`${enemy.name}【${decision.strategy}·${decision.skill.name}】`, 'system');
  
  // 执行技能效果
  const result = executeSkillEffects(decision.skill, enemy, decision.target, true);
  
  // ====== SmartAI 自我反思系统 ======
  if (battle.isEndless && typeof SmartAI_Battle !== 'undefined') {
    // 1. 评价行动
    const evaluation = SmartAI_Battle.evaluateAction(decision.skill, decision.target, result);
    
    // 2. 控制台输出思考过程
    if (evaluation) {
      const epsilon = typeof SmartAI !== 'undefined' ? (SmartAI.epsilon * 100).toFixed(1) + '%' : 'N/A';
      console.groupCollapsed(`🧠 SmartAI 思考: ${enemy.name} -> ${decision.skill.name}`);
      
      let targetDisplay = '无';
      if (decision.target) {
        targetDisplay = decision.target.name;
      } else if (result.affectedTargets && result.affectedTargets.length > 0) {
        // 如果是AOE或随机目标，显示实际命中的目标
        const names = result.affectedTargets.map(t => t.name);
        // 去重
        const uniqueNames = [...new Set(names)];
        targetDisplay = uniqueNames.join(', ');
        if (uniqueNames.length > 3) {
          targetDisplay = `${uniqueNames.slice(0, 3).join(', ')} 等${uniqueNames.length}人`;
        }
      } else {
        // 兜底显示
        const t = decision.skill.target;
        if (t === 'all' || t === 'all_enemy') targetDisplay = '全体敌人';
        else if (t === 'all_ally' || t === 'all_ally_enemy') targetDisplay = '全体队友';
        else if (t === 'self') targetDisplay = '自身';
      }
      
      console.log(`🎯 目标: ${targetDisplay}`);
      console.log(`🎲 探索率: ${epsilon}`);
      console.log(`📝 评语: ${evaluation.comments}`);
      console.log(`⭐ 评分: ${evaluation.score} ${evaluation.stars}`);
      console.groupEnd();
    }
    
    // 3. 记录行动并传入评分 (闭环学习)
    SmartAI_Battle.recordEnemyAction(enemy, decision, allTargets, aliveEnemies, evaluation ? evaluation.score : 3);
  }
  // ====== SmartAI 结束 ======
  
  // 处理结果
  handleSkillResult(result);
  
  // 检查死亡
  checkDeaths();
  
  // 进入下一回合
  // 行动结束，清除当前单位标记
  battle.currentUnit = null;
  BattleRenderer.renderBattle();
  battle.currentTurn++;
  
  // 扣除行动条
  enemy.actionGauge -= 10000;
  
  setTimeout(() => nextTurn(), 1000);
}

// ==================== 战斗结束 ====================

// 结束战斗
function endBattle(victory) {
  battle.active = false;
  // renderedSpineUnits.clear(); // 移至 BattleRenderer.init() 或不操作

  // ====== 无尽模式处理（BGM由EndlessMode.end()控制） ======
  if (battle.isEndless && typeof EndlessMode !== 'undefined') {
    if (victory) {
      EndlessMode.onVictory();
    } else {
      EndlessMode.onDefeat();
    }
    return;  // 无尽模式有自己的弹窗和BGM控制，直接返回
  }

  // 普通战斗结束，切换回主界面BGM（使用歌单）
  playMainBGM();

  // 清理召唤系统
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.clear();
  }
  
  if (victory) {
    const rewards = battle.stage.rewards;
    state.gold += rewards.gold;
    state.tickets += rewards.tickets;
    
    if (!state.clearedStages.includes(battle.stage.id)) {
      state.clearedStages.push(battle.stage.id);
    }
    
    saveState();
    updateResourceUI();
    
    showModal('🎉 战斗胜利！', `
      <p>金币 +${rewards.gold}</p>
      <p>抽卡券 +${rewards.tickets}</p>
      <button class="btn btn-primary" onclick="closeModal(); closeBattleField();">确定</button>
    `, false);
  } else {
    showModal('💀 战斗失败', `
      <p>队伍全灭，请重整旗鼓！</p>
      <button class="btn btn-primary" onclick="closeModal(); closeBattleField();">确定</button>
    `, false);
  }
}

// 清除单位选择状态 (代理)
export function clearUnitSelection() {
  BattleRenderer.clearUnitSelection();
}

// 撤退
export function fleeBattle() {
  // 无尽模式撤退需要二次确认
  if (battle.isEndless && typeof EndlessMode !== 'undefined') {
    showFleeConfirmModal();
    return;
  }
  
  // 普通战斗直接撤退
  doFlee();
}

// 显示局内撤退确认弹窗（无尽模式专用）
function showFleeConfirmModal() {
  // 局内撤退不获得当前层的无尽币
  const coinConfig = CONFIG.ENDLESS_COIN || { BASE_RATE: 2, BOSS_BONUS: 10 };
  const completedFloor = EndlessMode.currentFloor - 1;  // 只计算已通关的层数
  const baseCoins = completedFloor * coinConfig.BASE_RATE;
  const bossCount = Math.floor(completedFloor / EndlessMode.config.BOSS_INTERVAL);
  const bossBonus = bossCount * coinConfig.BOSS_BONUS;
  const estimatedEndlessCoin = Math.max(0, baseCoins + bossBonus);
  
  const content = `
    <div class="flee-confirm">
      <p style="font-size:18px;color:#ff6b6b;">⚠️ 确定要在战斗中撤退吗？</p>
      <p style="color:#ffcc00;font-size:14px;">当前层尚未通关，无法获得本层奖励！</p>
      <div class="flee-info">
        <p>当前层数: 第 <b>${EndlessMode.currentFloor}</b> 层（未通关）</p>
        <p>已通关层数: <b>${completedFloor}</b> 层</p>
        <p style="margin-top:10px;">撤退后将获得以下奖励:</p>
        <div class="flee-rewards">
          <p>💰 金币: ${EndlessMode.totalRewards.gold}</p>
          <p>🎫 抽卡券: ${EndlessMode.totalRewards.tickets}</p>
          <p>🎖️ 无尽币: ${estimatedEndlessCoin} <span style="color:#888;font-size:12px;">(不含当前层)</span></p>
        </div>
      </div>
      <div class="endless-buttons" style="margin-top:20px;">
        <button id="flee-confirm" class="btn-danger">确认撤退</button>
        <button id="flee-cancel" class="btn-secondary">继续战斗</button>
      </div>
    </div>
  `;
  
  showModal('🚪 撤退确认', content, false);
  
  setTimeout(() => {
    document.getElementById('flee-confirm')?.addEventListener('click', () => {
      closeModal();
      doFleeEndless();
    });
    document.getElementById('flee-cancel')?.addEventListener('click', () => {
      closeModal();
      // 返回战斗，不做任何操作
    });
  }, 100);
}

// 执行无尽模式局内撤退（不获得当前层奖励）
function doFleeEndless() {
  battle.active = false;
  addBattleLog('撤退了...', 'system');
  
  // 局内撤退，标记不获得当前层的无尽币
  EndlessMode._fleeInBattle = true;
  EndlessMode.end(true);  // true表示主动撤退，可以获得奖励（但无尽币按已通关层数计算）
}

// 执行普通撤退
function doFlee() {
  battle.active = false;
  
  // 普通战斗撤退，切换回主界面BGM（使用歌单）
  playMainBGM();
  
  // 清理召唤系统
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.clear();
  }
  
  addBattleLog('撤退了...', 'system');
  closeBattleField();
}

// ==================== 调试接口挂载 ====================
window.BattleSystem = {
  // 核心状态 (Getter确保获取最新状态)
  get state() { return state; },
  get battle() { return battle; },
  
  // 核心流程控制
  startBattle,
  nextTurn,
  fleeBattle,
  
  // 技能与交互
  selectSkill,
  executePlayerSkill,
  
  // 渲染与UI
  updateStageUI,
  renderBattle,
  
  // 内部调试 (暴露未导出的内部函数，方便强制结束战斗)
  // 注意：endBattle 是文件内定义的局部函数，在这里可以被闭包捕获
  endBattle: (victory) => endBattle(victory)
};

console.log('🔧 BattleSystem debug interface mounted to window.BattleSystem');
