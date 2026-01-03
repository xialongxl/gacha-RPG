
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
  // V6: 添加职业 one-hot 编码到特征，添加职业优先级奖励
  MODEL_VERSION: 6,
  
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
  async recordEnemyAction(battleState, action) {
    if (!this.currentBattleId) return;
    
    this.currentTurn++;
    
    // 计算敌人行动的即时奖励
    const immediateReward = this.calculateEnemyReward(battleState, action);
    
    const record = {
      battleId: this.currentBattleId,
      turn: this.currentTurn,
      state: this.extractFeatures(battleState),
      action: this.encodeAction(action),
      reward: immediateReward,
      result: null,
      dataVersion: this.MODEL_VERSION
    };
    
    await SmartAI_DB.trainingData.add(record);
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
    
    // 我方单位特征 (8 * 11 = 88)
    const maxAllies = 8;
    const allies = [...(battleState.allies || []), ...(battleState.summons || [])];
    
    for (let i = 0; i < maxAllies; i++) {
      const unit = allies[i];
      if (unit && unit.currentHp > 0) {
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
          (unit.skillUseCount || 0) / 10
        );
      } else {
        for (let j = 0; j < 11; j++) features.push(0);
      }
    }
    
    // 敌方单位特征 (4 * 31 = 124) - V6: 添加职业 one-hot
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
          unit.stunDuration > 0 ? 1 : 0
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
        // 空位填充: 7 + 13 + 3 + 8 = 31
        for (let j = 0; j < 31; j++) features.push(0);
      }
    }
    
    // 当前行动单位 (3)
    const current = battleState.currentUnit;
    if (current) {
      features.push(
        current.currentHp / current.maxHp,
        (current.energy || 0) / (current.maxEnergy || 100),
        current.isEnemy ? 1 : 0
      );
    } else {
      features.push(0, 0, 0);
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
    
    console.log('🗑️ 所有AI数据已清除');
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
