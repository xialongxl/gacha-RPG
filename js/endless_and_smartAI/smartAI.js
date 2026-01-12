
// ==================== TensorFlow.js 深度学习AI系统 ====================
//
// 使用 TensorFlow.js 重写的 SmartAI 系统
// 特性：
// - 自动微分（不再需要手写反向传播）
// - GPU 加速（通过 WebGL backend）
// - Experience Replay（经验回放）
// - ε-greedy 衰减探索策略
// - 改进的奖励塑形
// - 模型自动保存/加载到 IndexedDB
//
// ========================================================================

import { SKILL_EFFECTS } from '../skillData.js';
import { CHARACTER_DATA } from '../data.js';
import { SmartAI_DB, AFFIX_LIST, BUFF_LIST, DEBUFF_STAT_LIST, CLASS_LIST, CLASS_PRIORITY_REWARD, AI_CONFIG } from './smartAI_data.js';

// 重新导出数据库供其他模块使用
export { SmartAI_DB };

// ==================== 核心AI对象 ====================

export const SmartAI = {
  // 配置（从数据模块导入）
  config: AI_CONFIG,
  
  // 模型状态
  model: null,
  isModelReady: false,
  battleCount: 0,
  currentBattleId: null,
  currentTurn: 0,
  epsilon: 1.0,                   // 当前探索率
  trainingHistory: [],            // 训练历史
  
  // 模型版本
  // V8: 添加行动条(Action Gauge)特征
  MODEL_VERSION: 8,
  
  // ==================== 初始化 ====================
  
  async init() {
    console.log('🧠 SmartAI (TensorFlow.js) 初始化...');
    
    // 检查 TensorFlow.js 是否可用
    if (typeof tf === 'undefined') {
      console.error('❌ TensorFlow.js 未加载！');
      return this;
    }
    
    console.log(`📦 TensorFlow.js 版本: ${tf.version.tfjs}`);
    
    // 等待后端初始化完成
    try {
      await tf.ready();
      console.log(`🖥️ Backend: ${tf.getBackend()}`);
    } catch (e) {
      console.error('❌ TensorFlow.js 后端初始化失败:', e);
      // 尝试设置 CPU 后端作为后备
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log(`🖥️ Backend (fallback): ${tf.getBackend()}`);
      } catch (e2) {
        console.error('❌ CPU 后端也失败:', e2);
        return this;
      }
    }
    
    // 检查模型版本
    await this.checkModelVersion();
    
    // 获取战斗统计
    this.battleCount = await SmartAI_DB.battles.count();
    console.log(`📊 历史战斗记录: ${this.battleCount} 场`);
    
    // 恢复探索率
    this.epsilon = Math.max(
      this.config.EPSILON_END,
      this.config.EPSILON_START * Math.pow(this.config.EPSILON_DECAY, this.battleCount)
    );
    console.log(`🎲 当前探索率: ${(this.epsilon * 100).toFixed(1)}%`);
    
    // 如果有足够数据，加载或训练模型
    if (this.battleCount >= this.config.MIN_BATTLES_TO_TRAIN) {
      await this.loadOrTrainModel();
    } else {
      console.log(`⏳ 需要 ${this.config.MIN_BATTLES_TO_TRAIN - this.battleCount} 场更多战斗数据`);
      // 创建新模型但不训练
      this.model = this.createModel();
    }
    
    return this;
  },
  
  // 检查模型版本，清除不兼容的旧数据
  async checkModelVersion() {
    const saved = await SmartAI_DB.modelParams.get('main');
    
    if (saved) {
      const savedVersion = saved.version || 1;
      if (savedVersion < this.MODEL_VERSION) {
        console.log(`⚠️ 检测到旧版本模型 (V${savedVersion} → V${this.MODEL_VERSION})`);
        console.log('🔄 TensorFlow.js 版本更新，清除旧数据...');
        await this.clearAllData();
        console.log('✅ 旧数据已清除，请重新进行无尽模式战斗！');
        return;
      }
    }
    
    // 清除旧版本训练数据
    const oldData = await SmartAI_DB.trainingData
      .filter(d => !d.dataVersion || d.dataVersion < this.MODEL_VERSION)
      .count();
    
    if (oldData > 0) {
      console.log(`🗑️ 清除 ${oldData} 条旧版本数据...`);
      await SmartAI_DB.trainingData
        .filter(d => !d.dataVersion || d.dataVersion < this.MODEL_VERSION)
        .delete();
      await SmartAI_DB.battles
        .filter(b => !b.dataVersion || b.dataVersion < this.MODEL_VERSION)
        .delete();
    }
  },
  
  // ==================== TensorFlow.js 模型 ====================
  
  // 创建神经网络模型
  createModel() {
    console.log('🏗️ 创建 TensorFlow.js 神经网络模型...');
    
    const model = tf.sequential();
    
    // 输入层 + 隐藏层1
    model.add(tf.layers.dense({
      inputShape: [this.config.INPUT_SIZE],
      units: this.config.HIDDEN_UNITS_1,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: this.config.DROPOUT_RATE }));
    
    // 隐藏层2
    model.add(tf.layers.dense({
      units: this.config.HIDDEN_UNITS_2,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: this.config.DROPOUT_RATE }));
    
    // 隐藏层3
    model.add(tf.layers.dense({
      units: this.config.HIDDEN_UNITS_3,
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));
    
    // 输出层（技能 + 目标 = 18维）
    model.add(tf.layers.dense({
      units: this.config.SKILL_OUTPUT + this.config.TARGET_OUTPUT,
      activation: 'linear'  // 使用 linear，后面手动 softmax
    }));
    
    // 编译模型
    model.compile({
      optimizer: tf.train.adam(this.config.LEARNING_RATE),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    console.log('✅ 模型创建完成');
    model.summary();
    
    return model;
  },
  
  // ==================== 数据收集 ====================
  
  async startBattleRecord(playerTeam) {
    const battle = {
      timestamp: Date.now(),
      result: null,
      totalTurns: 0,
      playerTeam: playerTeam.map(p => p.name),
      dataVersion: this.MODEL_VERSION
    };
    
    this.currentBattleId = await SmartAI_DB.battles.add(battle);
    this.currentTurn = 0;
    console.log(`🎮 开始记录战斗 #${this.currentBattleId} (V${this.MODEL_VERSION})`);
  },
  
  /**
   * 记录敌人行动（用于训练敌人AI）
   * @param {Object} battleState - 战场状态（敌人视角）
   * @param {Object} action - 敌人的行动
   */
  async recordEnemyAction(battleState, action, evaluationScore = 3) {
    if (!this.currentBattleId) return;
    
    this.currentTurn++;
    
    // 计算基础奖励
    const baseReward = this.calculateEnemyReward(battleState, action);
    
    // 融合评价分数 (Reward Shaping)
    // 3分是及格，不奖不罚；5分奖励 +0.2；0分惩罚 -0.3
    const scoreAdjustment = (evaluationScore - 3) * 0.1;
    const finalReward = baseReward + scoreAdjustment;
    
    const record = {
      battleId: this.currentBattleId,
      turn: this.currentTurn,
      state: this.extractFeatures(battleState),
      action: this.encodeAction(action),
      reward: finalReward,
      result: null,
      dataVersion: this.MODEL_VERSION
    };
    
    await SmartAI_DB.trainingData.add(record);
  },

  /**
   * 评价敌人行动 (自我反思系统)
   * @param {Object} skill - 使用的技能
   * @param {Object} target - 目标单位
   * @param {Object} result - 执行结果 (包含 logs, deaths 等)
   * @returns {Object} { score, comments, stars }
   */
  evaluateAction(skill, target, result) {
    // 🔍 调试评分数据
    console.log("🔍 调试评分数据:", { skill, target, result });

    let score = 3; // 初始 3 分 (及格)
    let comments = [];
    
    if (!skill) return { score: 3, comments: "无行动", stars: "⭐⭐⭐" };

    // 获取主要效果类型
    const mainEffect = skill.effects && skill.effects.length > 0 ? skill.effects[0] : null;
    const skillType = mainEffect ? mainEffect.type : 'unknown';
    const skillTarget = skill.target || 'single';

    // 0. 特殊技能保底 (召唤、变身等)
    if (skillType === 'summon_buff' || skillType === 'team_energy' || skillType === 'sanctuary_mode' || skillType === 'team_temp_shield') {
      score = 4;
      comments.push("✨ 战术技能");
    }

    // 1. 治疗/Buff 类评价
    // 1. Buff/强化 类评价 (优先于治疗判断，避免混合类型被误判)
    if (skillType === 'buff' || skillType === 'team_buff_duration' || skillType === 'self_buff_then_attack' || skillType === 'summon_buff') {
      score += 1;
      
      if (skillTarget === 'self' || skillType === 'self_buff_then_attack') {
        comments.push("💪 自我强化");
      } else if (skillTarget === 'all_ally' || skillTarget === 'all_ally_enemy' || skillType === 'team_buff_duration') {
        score += 1; // 群体Buff价值更高
        comments.push("🙌 全员强化");
      } else {
        comments.push("🛡️ 战术强化");
      }
    }

    // 2. 治疗 类评价
    if (skillType === 'heal') {
      const totalHeal = result.totalHeal || 0;
      
      // 群体治疗
      if (skillTarget === 'all_ally' || skillTarget === 'all_ally_enemy') {
        if (totalHeal > 0) {
          score += 2; // 群奶基础分高
          if (totalHeal > 1000) {
             score += 1;
             comments.push("🌟 强力群疗");
          } else {
             comments.push("💚 群体治疗");
          }
        } else {
          // 只有纯治疗技能才判无效，如果是混合技能(如带Buff)在上面已经加分了
          score -= 6;
          comments.push("🤡 无效群奶");
        }
      }
      // 智能单体治疗 (ally_lowest)
      else if (skillTarget === 'ally_lowest') {
        if (totalHeal > 0) {
          // 估算回血前比例
          const prevHp = Math.max(0, target.currentHp - totalHeal);
          const prevHpRatio = prevHp / target.maxHp;
          
          if (prevHpRatio < 0.3) {
            score += 2;
            comments.push("🚑 关键急救");
          } else {
            score += 1;
            comments.push("💚 有效治疗");
          }
        } else {
          score -= 6;
          comments.push("🤡 满血强奶");
        }
      }
    }
    
    // 2. 攻击/伤害 类评价
    if (skillType === 'damage' || skillType === 'debuff' || skillType === 'splash_damage' || skillType === 'aftershock') {
      
      const totalDamage = result.totalDamage || 0;
      
      // AOE/群体攻击
      // 补充：dual (双目标)
      if (skillTarget === 'all' || skillTarget === 'all_enemy' || skillTarget === 'random3' || skillTarget === 'random6' || skillTarget === 'random2' || skillTarget === 'dual') {
        if (totalDamage > 0) {
          score += 1;
          
          // 补充：AOE 多目标奖励
          if (result.hitCount >= 2) {
            const multiHitBonus = (result.hitCount - 1) * 0.5;
            score += multiHitBonus;
            comments.push(`🎯 命中${result.hitCount}人(+${multiHitBonus})`);
          }

          // 根据伤害量额外加分 (每 500 点伤害 +0.5 分，最多 +2)
          const damageBonus = Math.min(2, Math.floor(totalDamage / 500) * 0.5);
          if (damageBonus > 0) {
             score += damageBonus;
             comments.push(`💥 AOE爆发(${totalDamage})`);
          } else {
             comments.push("⚔️ 群体攻击");
          }
        } else {
          score -= 1;
          comments.push("💨 AOE挥空");
        }
      }
      // 单体攻击
      else {
        const isTaunted = target && target.buffs && target.buffs.taunt;
        
        if (isTaunted) {
          comments.push("🛡️ 被嘲讽强迫");
        } else if (target) {
          // 目标是召唤物
          if (target.isSummon) {
             const killed = result.deaths && (result.deaths.includes(target) || target.currentHp <= 0);
             if (!killed) {
               score -= 2;
               comments.push("📉 殴打召唤物");
             }
          }
          
          // 伤害有效性 (修正：仅当技能本该造成伤害小于等于5时才扣分)
          const isDamageSkill = skillType === 'damage' || skillType === 'splash_damage' || skillType === 'aftershock';
          
          if (isDamageSkill && totalDamage <= 5) {
            if (result.dodged) {
              score -= 1;
              comments.push("💨 惨遭闪避");
            } else {
              score -= 2;
              comments.push("🤡 刮痧师傅");
            }
          } else if (totalDamage > 0) {
            // 区分破盾和有效命中
            if (result.tempShieldBroken) {
              score += 1; // 破盾额外加分
              comments.push("💥 击碎护盾！");
            } else if (result.hitShield) {
              comments.push("🛡️ 破盾攻击");
            } else {
              comments.push("⚔️ 有效命中");
            }
          }

          // 优先攻击高价值目标 (基于职业优先级)
          const charData = CHARACTER_DATA[target.name];
          const targetClass = charData ? charData.class : target.class;
          
          // 补充：明确的高价值目标 (Medic, Supporter, High ATK)
          if (targetClass === 'Medic' || targetClass === 'Supporter' || (target.atk > 1000)) {
            score += 1;
            comments.push("🎯 锁定高威胁/核心");
          }
          
          if (targetClass && CLASS_PRIORITY_REWARD[targetClass]) {
            const priority = CLASS_PRIORITY_REWARD[targetClass];
            // 医疗(6), 先锋(5), 辅助(5), 术师(4) -> 高价值
            if (priority >= 4) {
              score += 1;
              comments.push(`🎯 优先击杀${targetClass}`);
            }
            // 狙击(3), 特种(3) -> 中等价值
            else if (priority === 3) {
              score += 0.5;
              comments.push(`🏹 击杀${targetClass}`);
            }
            // 近卫(2), 重装(1) -> 低优先级 (通常是肉盾)
            // 不加分，也不扣分，除非有更好的选择 (难以判断)
          }
          
          // 溢出伤害 (杀鸡用牛刀)
          // 仅当伤害远超目标最大生命值(200%)时才判为溢出，避免误判满血秒杀
          if (totalDamage > target.maxHp * 2.0 && target.currentHp <= 0) {
             score -= 1;
             comments.push("🔪 杀鸡用牛刀");
          }
        }
      }
      
      // 成功击杀 (任意目标)
      if (result.deaths && result.deaths.length > 0) {
        score += 2;
        comments.push("💀 成功击杀");
      }
      
      // Debuff/控制
      if (skillType === 'debuff' || skillType === 'stun' || skillType === 'debuff_duration') {
         // 简单判断：只要使用了控制技能，就加分
         score += 1;
         comments.push("🕸️ 施加控制");
      }
    }
    
    // 3. v6.0 时间轴机制 (TTA/Action Gauge)
    if (target && (skillType === 'stun' || (skill.effects && skill.effects.some(e => e.type === 'stun')))) {
      const tta = Math.max(0, (10000 - (target.actionGauge || 0)) / 100);
      if (tta < 20) {
        // 目标即将行动 (TTA小)
        score += 2;
        comments.push("⚡ 压起身打断！");
      } else if (tta > 80) {
        // 目标刚行动完 (TTA大)
        score -= 1;
        comments.push("💤 控制时机不佳");
      }
    }
    
    // 限制分数范围 0-5
    score = Math.max(0, Math.min(5, score));
    
    // 生成星级
    const stars = "⭐".repeat(Math.round(score)) || "🤡";
    
    return {
      score,
      comments: comments.length > 0 ? comments.join(' | ') : "🤔 普通操作",
      stars
    };
  },
  
  /**
   * @deprecated 保留兼容，不再使用
   */
  async recordPlayerAction(battleState, action) {
    // 不再记录玩家操作
    return;
  },
  
  /**
   * 计算敌人行动的即时奖励
   * 奖励敌人做出好的决策
   * V6: 添加基于职业的优先级奖励
   */
  calculateEnemyReward(battleState, action) {
    let reward = 0;
    
    // 基础奖励：存活时间
    reward += 0.1;
    
    // 技能选择奖励
    const skill = SKILL_EFFECTS[action.skillName];
    if (skill) {
      // 攻击低血量玩家单位
      const target = battleState.enemies.find(e => e.name === action.targetName);
      if (target && target.currentHp < target.maxHp * 0.3) {
        reward += 5;  // 补刀奖励
      }
      
      // 使用治疗技能且有受伤友方敌人
      if (skill.type === 'heal') {
        const injured = battleState.allies.some(a => a.currentHp < a.maxHp * 0.5);
        if (injured) reward += 4;
      }
      
      // 使用控制技能
      if (skill.stun || skill.silence) {
        reward += 3;
      }
      
      // 使用群体攻击技能
      if (skill.aoe || skill.multi) {
        const targetCount = battleState.enemies.length;
        if (targetCount >= 3) reward += 4;
        else if (targetCount >= 2) reward += 2;
      }
      
      // 攻击召唤师（斩首策略）
      if (target && target.summoner) {
        reward += 4;  // 召唤师优先级提高
      }
      
      // V6: 基于职业的优先级奖励
      if (target) {
        // 从干员数据获取职业
        const charData = CHARACTER_DATA[target.name];
        const targetClass = charData ? charData.class : target.class;
        
        if (targetClass && CLASS_PRIORITY_REWARD[targetClass]) {
          reward += CLASS_PRIORITY_REWARD[targetClass];
        }
        
        // 特殊情况：召唤物没有职业，给予较低奖励
        if (target.isSummon) {
          reward += 2;  // 清理召唤物
        }
      }
    }
    
    return reward;
  },
  
  /**
   * 结束战斗记录
   * @param {boolean} playerVictory - 玩家是否胜利
   *
   * 注意：对于敌人AI训练，奖励逻辑是反转的：
   * - 玩家胜利（撤退）= 敌人失败 → 负奖励
   * - 玩家失败 = 敌人胜利 → 正奖励
   */
  async endBattleRecord(playerVictory) {
    if (!this.currentBattleId) return;
    
    // 从敌人视角：玩家胜利=敌人失败，玩家失败=敌人胜利
    const enemyVictory = !playerVictory;
    
    // 更新战斗结果（记录的是敌人的胜负）
    await SmartAI_DB.battles.update(this.currentBattleId, {
      result: enemyVictory ? 'win' : 'lose',
      totalTurns: this.currentTurn
    });
    
    // 终局奖励（从敌人视角）
    // 敌人赢了（玩家输了）= 正奖励，敌人应该学习这些操作
    // 敌人输了（玩家赢了）= 负奖励，敌人应该避免这些操作
    const finalReward = enemyVictory ? 100 : -50;
    
    // 使用衰减的终局奖励（越早的回合衰减越多）
    const records = await SmartAI_DB.trainingData
      .where('battleId')
      .equals(this.currentBattleId)
      .toArray();
    
    for (const record of records) {
      const decay = Math.pow(0.99, this.currentTurn - record.turn);
      const totalReward = record.reward + finalReward * decay;
      await SmartAI_DB.trainingData.update(record.id, {
        result: totalReward,
        reward: totalReward
      });
    }
    
    const resultText = enemyVictory ? '敌人胜利(玩家失败)' : '敌人失败(玩家撤退)';
    console.log(`📝 战斗 #${this.currentBattleId}: ${resultText} (${this.currentTurn}回合)`);
    
    // 更新计数和探索率
    this.battleCount++;
    this.epsilon = Math.max(
      this.config.EPSILON_END,
      this.epsilon * this.config.EPSILON_DECAY
    );
    
    console.log(`🎲 探索率更新: ${(this.epsilon * 100).toFixed(1)}%`);
    
    // 检查是否可以训练
    if (this.battleCount === this.config.MIN_BATTLES_TO_TRAIN) {
      console.log('🎓 数据足够，开始首次训练！');
      await this.trainModel();
    } else if (this.battleCount > this.config.MIN_BATTLES_TO_TRAIN && this.battleCount % 3 === 0) {
      // 每3场更新一次模型
      console.log('🔄 增量训练模型...');
      await this.trainModel();
    }
    
    this.currentBattleId = null;
  },
  
  // ==================== 特征提取 ====================
  
  extractFeatures(battleState) {
    const features = [];
    
    // 我方单位特征 (8 * 13 = 104) - V8: 添加行动条特征
    const maxAllies = 8;
    const allies = [...(battleState.allies || []), ...(battleState.summons || [])];
    
    for (let i = 0; i < maxAllies; i++) {
      const unit = allies[i];
      if (unit && unit.currentHp > 0) {
        // 检查是否有嘲讽
        let hasTaunt = 0;
        if (unit.isSummon && unit.buffs && unit.buffs.taunt) {
          hasTaunt = 1;
        } else if (!unit.isSummon && unit.tauntBuff) {
          hasTaunt = 1;
        }
        
        features.push(
          unit.currentHp / unit.maxHp,
          (unit.energy || 0) / (unit.maxEnergy || 100),
          unit.atk / 500,
          unit.def / 100,
          unit.spd / 150,
          unit.isSummon ? 1 : 0,
          unit.stunDuration > 0 ? 1 : 0,
          (unit.buffAtk || 0) / 500,
          (unit.buffAtkPercent || 0),
          (unit.buffDef || 0) / 100,
          (unit.skillUseCount || 0) / 10,
          hasTaunt,  // V7: 嘲讽特征
          (unit.actionGauge || 0) / 10000 // V8: 行动条特征
        );
      } else {
        for (let j = 0; j < 13; j++) features.push(0);  // V8: 13个特征
      }
    }
    
    // 敌方单位特征 (4 * 32 = 128) - V8: 添加行动条特征
    const maxEnemies = 4;
    const enemies = battleState.enemies || [];
    
    for (let i = 0; i < maxEnemies; i++) {
      const unit = enemies[i];
      if (unit && unit.currentHp > 0) {
        features.push(
          unit.currentHp / unit.maxHp,
          unit.atk / 500,
          unit.def / 100,
          unit.spd / 150,
          unit.shieldBroken ? 1 : 0,
          (unit.currentShield || 0) / (unit.shield || 1),
          unit.stunDuration > 0 ? 1 : 0,
          (unit.actionGauge || 0) / 10000 // V8: 行动条特征
        );
        
        // 词缀 one-hot (13个)
        const unitAffixes = unit.affixes || [];
        for (const affixName of AFFIX_LIST) {
          features.push(unitAffixes.includes(affixName) ? 1 : 0);
        }
        
        // Debuff状态 (3个)
        const debuffs = unit.durationDebuffs || [];
        for (const stat of DEBUFF_STAT_LIST) {
          features.push(debuffs.some(d => d.stat === stat) ? 1 : 0);
        }
        
        // V6: 职业 one-hot (8个)
        // 从干员数据获取职业（召唤物没有职业）
        const charData = CHARACTER_DATA[unit.name];
        const unitClass = charData ? charData.class : unit.class;
        for (const className of CLASS_LIST) {
          features.push(unitClass === className ? 1 : 0);
        }
      } else {
        // 空位填充: 8 + 13 + 3 + 8 = 32
        for (let j = 0; j < 32; j++) features.push(0);
      }
    }
    
    // 当前行动单位 (4) - V8: 添加行动条特征
    const current = battleState.currentUnit;
    if (current) {
      features.push(
        current.currentHp / current.maxHp,
        (current.energy || 0) / (current.maxEnergy || 100),
        current.isEnemy ? 1 : 0,
        (current.actionGauge || 0) / 10000 // V8: 行动条特征
      );
    } else {
      features.push(0, 0, 0, 0);
    }
    
    // 回合数 + 层数 (2)
    features.push(
      (battleState.turn || 0) / 100,
      (battleState.floor || 0) / 100
    );
    
    // 玩家强化 (8)
    const playerBuffs = battleState.playerBuffs || [];
    for (const buffKey of BUFF_LIST) {
      features.push(playerBuffs.includes(buffKey) ? 1 : 0);
    }
    
    // 确保长度正确
    while (features.length < this.config.INPUT_SIZE) {
      features.push(0);
    }
    
    return features.slice(0, this.config.INPUT_SIZE);
  },
  
  encodeAction(action) {
    return {
      skillIndex: action.skillIndex || 0,
      targetIndex: action.targetIndex || 0,
      skillName: action.skillName || '',
      targetName: action.targetName || ''
    };
  },
  
  // ==================== 训练 ====================
  
  async trainModel() {
    console.log('🎓 开始 TensorFlow.js 训练...');
    
    // 获取训练数据
    let data = await SmartAI_DB.trainingData.toArray();
    
    // Experience Replay：限制缓冲区大小
    if (data.length > this.config.REPLAY_BUFFER_SIZE) {
      data = data.slice(-this.config.REPLAY_BUFFER_SIZE);
    }
    
    if (data.length === 0) {
      console.log('❌ 没有训练数据');
      return;
    }
    
    console.log(`📚 训练数据量: ${data.length} 条`);
    
    // 创建模型（如果没有）
    if (!this.model) {
      this.model = this.createModel();
    }
    
    // 准备训练数据
    const validData = data.filter(d => d.state && d.action && d.result !== null);
    
    if (validData.length < 10) {
      console.log('❌ 有效训练数据不足');
      return;
    }
    
    // 构建输入和标签张量
    const states = validData.map(d => d.state);
    const actions = validData.map(d => {
      // One-hot 编码：技能 + 目标
      const label = new Array(this.config.SKILL_OUTPUT + this.config.TARGET_OUTPUT).fill(0);
      const skillIdx = Math.min(d.action.skillIndex || 0, this.config.SKILL_OUTPUT - 1);
      const targetIdx = Math.min(d.action.targetIndex || 0, this.config.TARGET_OUTPUT - 1);
      label[skillIdx] = 1;
      label[this.config.SKILL_OUTPUT + targetIdx] = 1;
      return label;
    });
    const rewards = validData.map(d => d.result || 0);
    
    // 根据奖励调整标签权重
    const maxReward = Math.max(...rewards.map(Math.abs), 1);
    const weightedActions = actions.map((action, i) => {
      const weight = 1 + (rewards[i] / maxReward) * 0.5;
      return action.map(v => v * Math.max(0.1, weight));
    });
    
    // 转换为张量
    const xs = tf.tensor2d(states);
    const ys = tf.tensor2d(weightedActions);
    
    try {
      // 训练
      const history = await this.model.fit(xs, ys, {
        epochs: this.config.EPOCHS,
        batchSize: this.config.BATCH_SIZE,
        shuffle: true,
        validationSplit: 0.1,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            console.log(`  Epoch ${epoch + 1}/${this.config.EPOCHS} - loss: ${logs.loss.toFixed(4)} - acc: ${(logs.acc * 100).toFixed(1)}%`);
            
            // 记录训练历史
            await SmartAI_DB.trainingStats.put({
              id: `epoch_${Date.now()}_${epoch}`,
              epoch: epoch,
              loss: logs.loss,
              accuracy: logs.acc,
              timestamp: Date.now()
            });
          }
        }
      });
      
      this.trainingHistory.push({
        timestamp: Date.now(),
        finalLoss: history.history.loss[history.history.loss.length - 1],
        finalAccuracy: history.history.acc[history.history.acc.length - 1],
        dataSize: validData.length
      });
      
      // 保存模型
      await this.saveModel();
      this.isModelReady = true;
      
      console.log('✅ TensorFlow.js 训练完成！');
      
    } finally {
      // 清理张量
      xs.dispose();
      ys.dispose();
    }
  },
  
  // ==================== 模型保存/加载 ====================
  
  async saveModel() {
    if (!this.model) return;
    
    try {
      // 使用 TensorFlow.js 内置的 IndexedDB 保存
      await this.model.save('indexeddb://smartai-model');
      
      // 同时保存元数据到我们的数据库
      await SmartAI_DB.modelParams.put({
        id: 'main',
        version: this.MODEL_VERSION,
        epsilon: this.epsilon,
        battleCount: this.battleCount,
        updatedAt: Date.now()
      });
      
      console.log(`💾 模型已保存 (V${this.MODEL_VERSION})`);
    } catch (e) {
      console.error('❌ 模型保存失败:', e);
    }
  },
  
  async loadOrTrainModel() {
    const saved = await SmartAI_DB.modelParams.get('main');
    
    if (saved && saved.version === this.MODEL_VERSION) {
      try {
        console.log('📦 加载已保存的 TensorFlow.js 模型...');
        this.model = await tf.loadLayersModel('indexeddb://smartai-model');
        
        // 重新编译模型
        this.model.compile({
          optimizer: tf.train.adam(this.config.LEARNING_RATE),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        });
        
        // 恢复元数据
        this.epsilon = saved.epsilon || this.config.EPSILON_END;
        
        this.isModelReady = true;
        console.log('✅ 模型加载成功');
        return;
      } catch (e) {
        console.log('⚠️ 模型加载失败，重新训练:', e.message);
      }
    }
    
    console.log('🆕 开始训练新模型...');
    await this.trainModel();
  },
  
  // ==================== AI决策 ====================
  
  getDecision(battleState, availableSkills, availableTargets) {
    // 检查模型状态
    if (!this.model) {
      console.log('🎲 模型未就绪，使用随机决策');
      return this.getRandomDecision(availableSkills, availableTargets);
    }
    
    // ε-greedy 探索
    if (Math.random() < this.epsilon) {
      console.log(`🎲 探索模式 (ε=${(this.epsilon * 100).toFixed(1)}%)`);
      return this.getRandomDecision(availableSkills, availableTargets);
    }
    
    // 提取特征
    const features = this.extractFeatures(battleState);
    
    // 前向传播
    const input = tf.tensor2d([features]);
    const output = this.model.predict(input);
    const predictions = output.dataSync();
    
    // 清理张量
    input.dispose();
    output.dispose();
    
    // 分离技能和目标概率
    const skillLogits = predictions.slice(0, this.config.SKILL_OUTPUT);
    const targetLogits = predictions.slice(this.config.SKILL_OUTPUT);
    
    // Softmax
    const skillProbs = this.softmax(Array.from(skillLogits));
    const targetProbs = this.softmax(Array.from(targetLogits));
    
    // 在可用选项中选择最佳
    let bestSkillIdx = 0;
    let bestSkillProb = -1;
    for (let i = 0; i < availableSkills.length && i < skillProbs.length; i++) {
      if (skillProbs[i] > bestSkillProb) {
        bestSkillProb = skillProbs[i];
        bestSkillIdx = i;
      }
    }
    
    let bestTargetIdx = 0;
    let bestTargetProb = -1;
    for (let i = 0; i < availableTargets.length && i < targetProbs.length; i++) {
      if (targetProbs[i] > bestTargetProb) {
        bestTargetProb = targetProbs[i];
        bestTargetIdx = i;
      }
    }
    
    const skill = availableSkills[bestSkillIdx] || availableSkills[0];
    const target = availableTargets[bestTargetIdx] || availableTargets[0];
    const skillName = typeof skill === 'string' ? skill : skill.name;
    const confidence = (bestSkillProb * bestTargetProb * 100).toFixed(1);
    
    console.log(`🧠 AI决策: ${skillName} → ${target.name} (置信度: ${confidence}%)`);
    
    return {
      skill: { name: skillName, ...SKILL_EFFECTS[skillName] },
      target: target,
      strategy: '🧠TensorFlow.js',
      confidence: confidence + '%'
    };
  },
  
  // Softmax 函数
  softmax(arr) {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  },
  
  // 随机决策
  getRandomDecision(availableSkills, availableTargets) {
    const skillIdx = Math.floor(Math.random() * availableSkills.length);
    const targetIdx = Math.floor(Math.random() * availableTargets.length);
    
    const skill = availableSkills[skillIdx] || availableSkills[0];
    const target = availableTargets[targetIdx] || availableTargets[0];
    const skillName = typeof skill === 'string' ? skill : skill.name;
    
    return {
      skill: { name: skillName, ...SKILL_EFFECTS[skillName] },
      target: target,
      strategy: '🎲随机探索',
      confidence: '0%'
    };
  },
  
  // ==================== 统计 ====================
  
  async getStats() {
    const battles = await SmartAI_DB.battles.toArray();
    const wins = battles.filter(b => b.result === 'win').length;
    const losses = battles.filter(b => b.result === 'lose').length;
    const dataCount = await SmartAI_DB.trainingData.count();
    
    // 获取最近训练历史
    const recentTraining = this.trainingHistory.slice(-5);
    
    return {
      totalBattles: battles.length,
      wins,
      losses,
      winRate: battles.length > 0 ? (wins / battles.length * 100).toFixed(1) + '%' : '0%',
      trainingDataCount: dataCount,
      isModelReady: this.isModelReady,
      needMoreData: battles.length < this.config.MIN_BATTLES_TO_TRAIN,
      battlesNeeded: Math.max(0, this.config.MIN_BATTLES_TO_TRAIN - battles.length),
      epsilon: this.epsilon,
      recentTraining: recentTraining,
      modelVersion: this.MODEL_VERSION,
      backend: typeof tf !== 'undefined' ? tf.getBackend() : 'N/A'
    };
  },
  
  // 清除所有数据
  async clearAllData() {
    const battleCount = await SmartAI_DB.battles.count();
    const dataCount = await SmartAI_DB.trainingData.count();
    const totalCount = battleCount + dataCount;

    await SmartAI_DB.battles.clear();
    await SmartAI_DB.trainingData.clear();
    await SmartAI_DB.modelParams.clear();
    await SmartAI_DB.trainingStats.clear();
    
    // 删除 TensorFlow.js 保存的模型
    try {
      await tf.io.removeModel('indexeddb://smartai-model');
    } catch (e) {
      // 模型可能不存在
    }
    
    this.model = null;
    this.isModelReady = false;
    this.battleCount = 0;
    this.epsilon = this.config.EPSILON_START;
    this.trainingHistory = [];
    
    console.log(`🗑️ 所有AI数据已清除（共清除${totalCount}条AI数据）`);
  },
  
  // 导出数据（调试用）
  async exportData() {
    const battles = await SmartAI_DB.battles.toArray();
    const trainingData = await SmartAI_DB.trainingData.toArray();
    const stats = await SmartAI_DB.trainingStats.toArray();
    
    return {
      battles,
      trainingData,
      trainingStats: stats,
      model: this.model ? 'loaded' : null,
      config: this.config,
      epsilon: this.epsilon
    };
  }
};
