// ==================== 深度学习AI系统 ====================

// 初始化数据库 - V3加入训练数据版本追踪
const SmartAI_DB = new Dexie('SmartAI_Database');

// V2: 词缀支持
SmartAI_DB.version(2).stores({
  battles: '++id, timestamp, result, totalTurns, playerTeam, floor',
  trainingData: '++id, battleId, turn, state, action, result',
  modelParams: 'id, weights, updatedAt, version'
});

// V3: 训练数据增加版本字段，用于精确版本控制
SmartAI_DB.version(3).stores({
  battles: '++id, timestamp, result, totalTurns, playerTeam, floor, dataVersion',
  trainingData: '++id, battleId, turn, state, action, result, dataVersion',
  modelParams: 'id, weights, updatedAt, version'
}).upgrade(tx => {
  // 升级时给现有数据添加版本号（假设是V3之前的数据，标记为V3以便保留）
  // 因为用户可能刚用V4收集了数据，不能随便删除
  return tx.table('trainingData').toCollection().modify(data => {
    if (data.dataVersion === undefined) {
      // 无法确定版本，标记为0表示需要检查
      data.dataVersion = 0;
    }
  });
});

// 词缀列表（用于特征编码）
const AFFIX_LIST = [
  'thorns', 'regen', 'berserk', 'multiStrike', 'swift', 'fortify',
  'dodge', 'shield', 'vampiric', 'aura', 'undying', 'split', 'explosion'
];

// Roguelike强化列表（用于特征编码）
const BUFF_LIST = [
  // stat类型
  'atkUp', 'defUp', 'hpUp', 'spdUp',
  // special类型
  'critUp', 'vampUp', 'shield', 'extraLife'
];

// 持续效果类型列表（用于特征编码）
const DEBUFF_STAT_LIST = ['atk', 'def', 'spd'];

// ==================== 核心AI对象 ====================

const SmartAI = {
  // 配置
  config: {
    MIN_BATTLES_TO_TRAIN: 20,    // 最少20场战斗后开始训练
    LEARNING_RATE: 0.01,
    BATCH_SIZE: 32,
    EPOCHS: 10,
    IMITATE_WEIGHT: 0.6,         // 模仿玩家权重
    COUNTER_WEIGHT: 0.4          // 反制玩家权重
  },
  
  // 模型状态
  model: null,
  isModelReady: false,
  battleCount: 0,
  currentBattleId: null,
  currentTurn: 0,
  
  // ==================== 初始化 ====================
  
  async init() {
    console.log('🧠 SmartAI 初始化...');
    
    // 先检查模型版本（特征维度变化需要清除旧数据）
    await this.checkModelVersion();
    
    // 获取战斗统计
    this.battleCount = await SmartAI_DB.battles.count();
    console.log(`📊 历史战斗记录: ${this.battleCount} 场`);
    
    // 如果有足够数据，加载或训练模型
    if (this.battleCount >= this.config.MIN_BATTLES_TO_TRAIN) {
      await this.loadOrTrainModel();
    } else {
      console.log(`⏳ 需要 ${this.config.MIN_BATTLES_TO_TRAIN - this.battleCount} 场更多战斗数据`);
    }
    
    return this;
  },
  
  // 检查模型版本，清除不兼容的旧数据
  async checkModelVersion() {
    const saved = await SmartAI_DB.modelParams.get('main');
    
    // 1. 检查保存的模型版本
    if (saved) {
      const savedVersion = saved.version || 1;
      if (savedVersion < this.MODEL_VERSION) {
        console.log(`⚠️ 检测到旧版本模型 (V${savedVersion} → V${this.MODEL_VERSION})`);
        console.log('🔄 特征维度已更新，自动清除旧数据...');
        await this.clearAllData();
        console.log('✅ 旧数据已清除，请重新进行无尽模式战斗以收集新数据！');
        return;
      }
    }
    
    // 2. 精确检查训练数据版本（基于 dataVersion 字段）
    // 查找版本低于当前版本的旧数据
    const oldTrainingData = await SmartAI_DB.trainingData
      .filter(data => {
        const version = data.dataVersion;
        // dataVersion 为 undefined、null、0 或小于当前版本的数据都是旧数据
        return version === undefined || version === null || version === 0 || version < this.MODEL_VERSION;
      })
      .count();
    
    if (oldTrainingData > 0) {
      console.log(`⚠️ 检测到 ${oldTrainingData} 条旧版本训练数据 (V<${this.MODEL_VERSION})，正在清除...`);
      
      // 只删除旧版本数据，保留当前版本数据
      await SmartAI_DB.trainingData
        .filter(data => {
          const version = data.dataVersion;
          return version === undefined || version === null || version === 0 || version < this.MODEL_VERSION;
        })
        .delete();
      
      // 同时清除对应的旧战斗记录
      const oldBattles = await SmartAI_DB.battles
        .filter(battle => {
          const version = battle.dataVersion;
          return version === undefined || version === null || version === 0 || version < this.MODEL_VERSION;
        })
        .count();
      
      if (oldBattles > 0) {
        await SmartAI_DB.battles
          .filter(battle => {
            const version = battle.dataVersion;
            return version === undefined || version === null || version === 0 || version < this.MODEL_VERSION;
          })
          .delete();
        console.log(`🗑️ 已清除 ${oldBattles} 条旧版本战斗记录`);
      }
      
      // 如果模型是基于旧数据训练的，也需要清除
      if (saved && (saved.version || 1) < this.MODEL_VERSION) {
        await SmartAI_DB.modelParams.delete('main');
        this.model = null;
        this.isModelReady = false;
        console.log('🗑️ 已清除旧版本模型');
      }
      
      console.log('✅ 旧数据清除完成！当前版本数据已保留。');
      
      // 统计剩余数据
      const remainingData = await SmartAI_DB.trainingData.count();
      const remainingBattles = await SmartAI_DB.battles.count();
      console.log(`📊 剩余数据: ${remainingBattles} 场战斗, ${remainingData} 条训练数据`);
    }
  },
  
  // ==================== 数据收集 ====================
  
  // 开始记录战斗
  async startBattleRecord(playerTeam) {
    const battle = {
      timestamp: Date.now(),
      result: null,
      totalTurns: 0,
      playerTeam: playerTeam.map(p => p.name),
      dataVersion: this.MODEL_VERSION  // 记录数据版本
    };
    
    this.currentBattleId = await SmartAI_DB.battles.add(battle);
    this.currentTurn = 0;
    console.log(`🎮 开始记录战斗 #${this.currentBattleId} (V${this.MODEL_VERSION})`);
  },
  
  // 记录玩家行动
  async recordPlayerAction(battleState, action) {
    if (!this.currentBattleId) return;
    
    this.currentTurn++;
    
    const record = {
      battleId: this.currentBattleId,
      turn: this.currentTurn,
      state: this.extractFeatures(battleState),
      action: this.encodeAction(action),
      result: null, // 战斗结束时回填
      dataVersion: this.MODEL_VERSION  // 记录数据版本
    };
    
    await SmartAI_DB.trainingData.add(record);
  },
  
  // 结束战斗记录
  async endBattleRecord(victory) {
    if (!this.currentBattleId) return;
    
    // 更新战斗结果
    await SmartAI_DB.battles.update(this.currentBattleId, {
      result: victory ? 'win' : 'lose',
      totalTurns: this.currentTurn
    });
    
    // 更新所有回合的结果权重
    const resultWeight = victory ? 1.0 : -0.5;
    await SmartAI_DB.trainingData
      .where('battleId')
      .equals(this.currentBattleId)
      .modify({ result: resultWeight });
    
    console.log(`📝 战斗 #${this.currentBattleId} 记录完成: ${victory ? '胜利' : '失败'}`);
    
    // 更新计数
    this.battleCount++;
    
    // 检查是否可以训练
    if (this.battleCount === this.config.MIN_BATTLES_TO_TRAIN) {
      console.log('🎓 数据足够，开始首次训练！');
      await this.trainModel();
    } else if (this.battleCount > this.config.MIN_BATTLES_TO_TRAIN && this.battleCount % 5 === 0) {
      // 每5场更新一次模型
      console.log('🔄 增量训练模型...');
      await this.trainModel();
    }
    
    this.currentBattleId = null;
  },
  
  // ==================== 特征提取 ====================
  
  // 提取战场状态特征（V4: 增加buff/debuff状态信息）
  extractFeatures(battleState) {
    const features = [];
    
    // 我方单位特征（最多4个干员 + 4个召唤物）
    // V4: 每个单位 7基础 + 4buff状态 = 11个特征
    // 8 * 11 = 88
    const maxAllies = 8;
    const allies = [...(battleState.allies || []), ...(battleState.summons || [])];
    
    for (let i = 0; i < maxAllies; i++) {
      const unit = allies[i];
      if (unit && unit.currentHp > 0) {
        // 基础属性 (7个)
        features.push(
          unit.currentHp / unit.maxHp,                    // HP%
          (unit.energy || 0) / (unit.maxEnergy || 100),   // 能量%
          unit.atk / 500,                                  // ATK归一化
          unit.def / 100,                                  // DEF归一化
          unit.spd / 150,                                  // SPD归一化
          unit.isSummon ? 1 : 0,                          // 是否召唤物
          unit.stunDuration > 0 ? 1 : 0                   // 是否眩晕
        );
        
        // V4新增: buff状态 (4个)
        features.push(
          (unit.buffAtk || 0) / 500,                      // 固定ATK加成
          (unit.buffAtkPercent || 0),                     // 百分比ATK加成
          (unit.buffDef || 0) / 100,                      // 固定DEF加成
          (unit.skillUseCount || 0) / 10                  // 技能使用次数(二重咏唱)
        );
      } else {
        // 空位或死亡：7基础 + 4buff = 11个零
        for (let j = 0; j < 11; j++) {
          features.push(0);
        }
      }
    }
    
    // 敌方单位特征（最多4个）
    // V4: 每个单位 7基础 + 13词缀 + 3持续debuff = 23个特征
    // 4 * 23 = 92
    const maxEnemies = 4;
    const enemies = battleState.enemies || [];
    
    for (let i = 0; i < maxEnemies; i++) {
      const unit = enemies[i];
      if (unit && unit.currentHp > 0) {
        // 基础属性 (7个)
        features.push(
          unit.currentHp / unit.maxHp,
          unit.atk / 500,
          unit.def / 100,
          unit.spd / 150,
          unit.shieldBroken ? 1 : 0,
          (unit.currentShield || 0) / (unit.shield || 1),
          unit.stunDuration > 0 ? 1 : 0
        );
        
        // 词缀特征 (13个，每个词缀一个布尔值)
        const unitAffixes = unit.affixes || [];
        for (const affixName of AFFIX_LIST) {
          features.push(unitAffixes.includes(affixName) ? 1 : 0);
        }
        
        // V4新增: 持续debuff状态 (3个，对应atk/def/spd减益)
        const debuffs = unit.durationDebuffs || [];
        for (const stat of DEBUFF_STAT_LIST) {
          const hasDebuff = debuffs.some(d => d.stat === stat);
          features.push(hasDebuff ? 1 : 0);
        }
      } else {
        // 空位或死亡：7基础 + 13词缀 + 3持续debuff = 23个零
        for (let j = 0; j < 23; j++) {
          features.push(0);
        }
      }
    }
    
    // 当前行动单位特征 (3个)
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
    
    // 回合数归一化 (1个)
    features.push((battleState.turn || 0) / 100);
    
    // 无尽模式层数 (1个)
    features.push((battleState.floor || 0) / 100);
    
    // V3: 玩家Roguelike强化特征 (8个)
    const playerBuffs = battleState.playerBuffs || [];
    for (const buffKey of BUFF_LIST) {
      features.push(playerBuffs.includes(buffKey) ? 1 : 0);
    }
    
    // V4总特征数: 88(我方) + 92(敌方) + 3(当前) + 1(回合) + 1(层数) + 8(强化) = 193
    return features;
  },
  
  // 编码玩家行动
  encodeAction(action) {
    return {
      skillIndex: action.skillIndex || 0,
      targetIndex: action.targetIndex || 0,
      skillName: action.skillName || '',
      targetName: action.targetName || ''
    };
  },
  
  // ==================== 神经网络模型 ====================
  
  // 模型版本（特征维度变化时需要更新）
  MODEL_VERSION: 4,
  
  // 创建模型 (V4: 增加buff/debuff状态信息)
  createModel() {
    // V4特征维度: 88(我方含buff) + 92(敌方含词缀+debuff) + 3(当前) + 1(回合) + 1(层数) + 8(强化) = 193
    const inputSize = 8 * 11 + 4 * 23 + 3 + 1 + 1 + 8;  // 193个特征
    
    const model = {
      inputSize: inputSize,
      version: this.MODEL_VERSION,
      weights: {
        hidden1: this.randomMatrix(inputSize, 64),
        hidden1Bias: this.randomArray(64),
        hidden2: this.randomMatrix(64, 32),
        hidden2Bias: this.randomArray(32),
        skillOutput: this.randomMatrix(32, 10),   // 最多10个技能
        skillBias: this.randomArray(10),
        targetOutput: this.randomMatrix(32, 8),   // 最多8个目标
        targetBias: this.randomArray(8)
      }
    };
    
    return model;
  },
  
  // 随机矩阵（Xavier初始化）
  randomMatrix(rows, cols) {
    const matrix = [];
    const scale = Math.sqrt(2.0 / (rows + cols));
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = (Math.random() - 0.5) * 2 * scale;
      }
    }
    return matrix;
  },
  
  // 随机数组
  randomArray(size) {
    return Array(size).fill(0).map(() => (Math.random() - 0.5) * 0.1);
  },
  
  // ReLU激活函数
  relu(x) {
    return Math.max(0, x);
  },
  
  // Leaky ReLU
  leakyRelu(x) {
    return x > 0 ? x : 0.01 * x;
  },
  
  // Softmax
  softmax(arr) {
    const max = Math.max(...arr);
    const exp = arr.map(x => Math.exp(x - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(x => x / sum);
  },
  
  // 前向传播
  forward(features) {
    if (!this.model) return null;
    
    const w = this.model.weights;
    
    // 确保特征长度正确
    while (features.length < this.model.inputSize) {
      features.push(0);
    }
    
    // 隐藏层1
    let hidden1 = [];
    for (let j = 0; j < 64; j++) {
      let sum = w.hidden1Bias[j];
      for (let i = 0; i < features.length && i < w.hidden1.length; i++) {
        sum += (features[i] || 0) * (w.hidden1[i]?.[j] || 0);
      }
      hidden1[j] = this.leakyRelu(sum);
    }
    
    // 隐藏层2
    let hidden2 = [];
    for (let j = 0; j < 32; j++) {
      let sum = w.hidden2Bias[j];
      for (let i = 0; i < 64; i++) {
        sum += hidden1[i] * w.hidden2[i][j];
      }
      hidden2[j] = this.leakyRelu(sum);
    }
    
    // 技能输出
    let skillLogits = [];
    for (let j = 0; j < 10; j++) {
      let sum = w.skillBias[j];
      for (let i = 0; i < 32; i++) {
        sum += hidden2[i] * w.skillOutput[i][j];
      }
      skillLogits[j] = sum;
    }
    
    // 目标输出
    let targetLogits = [];
    for (let j = 0; j < 8; j++) {
      let sum = w.targetBias[j];
      for (let i = 0; i < 32; i++) {
        sum += hidden2[i] * w.targetOutput[i][j];
      }
      targetLogits[j] = sum;
    }
    
    return {
      skillProbs: this.softmax(skillLogits),
      targetProbs: this.softmax(targetLogits),
      hidden1,
      hidden2
    };
  },
  
  // ==================== 训练 ====================
  
  async trainModel() {
    console.log('🎓 开始训练模型...');
    
    // 获取所有训练数据
    const data = await SmartAI_DB.trainingData.toArray();
    if (data.length === 0) {
      console.log('❌ 没有训练数据');
      return;
    }
    
    console.log(`📚 训练数据量: ${data.length} 条`);
    
    // 创建或获取模型
    if (!this.model) {
      this.model = this.createModel();
    }
    
    // 训练循环
    for (let epoch = 0; epoch < this.config.EPOCHS; epoch++) {
      let totalLoss = 0;
      let sampleCount = 0;
      
      // 随机打乱数据
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      
      for (const sample of shuffled) {
        if (!sample.state || !sample.action) continue;
        
        const output = this.forward(sample.state);
        if (!output) continue;
        
        // 计算损失并调整权重
        const resultWeight = sample.result || 0;
        const lr = this.config.LEARNING_RATE * (1 + resultWeight * 0.5);
        
        const targetSkill = sample.action.skillIndex || 0;
        const targetIdx = sample.action.targetIndex || 0;
        
        // 模仿学习：向玩家的选择靠拢
        if (targetSkill < 10) {
          for (let i = 0; i < 32; i++) {
            const error = output.skillProbs[targetSkill] - 1;
            const gradient = error * output.hidden2[i];
            this.model.weights.skillOutput[i][targetSkill] -= lr * gradient * this.config.IMITATE_WEIGHT;
          }
          this.model.weights.skillBias[targetSkill] -= lr * (output.skillProbs[targetSkill] - 1) * this.config.IMITATE_WEIGHT;
        }
        
        if (targetIdx < 8) {
          for (let i = 0; i < 32; i++) {
            const error = output.targetProbs[targetIdx] - 1;
            const gradient = error * output.hidden2[i];
            this.model.weights.targetOutput[i][targetIdx] -= lr * gradient * this.config.IMITATE_WEIGHT;
          }
          this.model.weights.targetBias[targetIdx] -= lr * (output.targetProbs[targetIdx] - 1) * this.config.IMITATE_WEIGHT;
        }
        
        // 反制学习：如果玩家输了，降低这些选择的权重
        if (resultWeight < 0) {
          if (targetSkill < 10) {
            for (let i = 0; i < 32; i++) {
              this.model.weights.skillOutput[i][targetSkill] += lr * 0.1 * this.config.COUNTER_WEIGHT;
            }
          }
          if (targetIdx < 8) {
            for (let i = 0; i < 32; i++) {
              this.model.weights.targetOutput[i][targetIdx] += lr * 0.1 * this.config.COUNTER_WEIGHT;
            }
          }
        }
        
        totalLoss += Math.abs(output.skillProbs[targetSkill] - 1);
        sampleCount++;
      }
      
      if (sampleCount > 0) {
        console.log(`  Epoch ${epoch + 1}/${this.config.EPOCHS}, Loss: ${(totalLoss / sampleCount).toFixed(4)}`);
      }
    }
    
    // 保存模型
    await this.saveModel();
    this.isModelReady = true;
    console.log('✅ 模型训练完成！');
  },
  
  // 保存模型
  async saveModel() {
    if (!this.model) return;
    
    await SmartAI_DB.modelParams.put({
      id: 'main',
      weights: JSON.stringify(this.model.weights),
      inputSize: this.model.inputSize,
      version: this.MODEL_VERSION,
      updatedAt: Date.now()
    });
    
    console.log(`💾 模型已保存 (V${this.MODEL_VERSION})`);
  },
  
  // 加载模型
  async loadOrTrainModel() {
    const saved = await SmartAI_DB.modelParams.get('main');
    
    if (saved && saved.weights) {
      // 检查模型版本
      const savedVersion = saved.version || 1;
      if (savedVersion < this.MODEL_VERSION) {
        console.log(`⚠️ 模型版本过旧 (V${savedVersion} → V${this.MODEL_VERSION})`);
        console.log('🔄 特征维度已更新，需要清除旧数据并重新训练...');
        // 清除旧数据（特征维度不兼容）
        await this.clearAllData();
        console.log('📢 请重新进行无尽模式战斗以收集新数据！');
        return;
      }
      
      console.log(`📦 加载已保存的模型 (V${savedVersion})...`);
      try {
        this.model = {
          inputSize: saved.inputSize || 141,
          version: savedVersion,
          weights: JSON.parse(saved.weights)
        };
        this.isModelReady = true;
        console.log('✅ 模型加载成功');
      } catch (e) {
        console.error('❌ 模型加载失败，重新训练', e);
        await this.trainModel();
      }
    } else {
      console.log('🆕 没有已保存模型，开始训练...');
      await this.trainModel();
    }
  },
  
  // ==================== AI决策 ====================
  
  // 获取AI决策
  getDecision(battleState, availableSkills, availableTargets) {
    // 如果模型没准备好，使用随机决策
    if (!this.isModelReady || !this.model) {
      console.log('🎲 模型未就绪，使用随机决策');
      return this.getRandomDecision(availableSkills, availableTargets);
    }
    
    // 提取特征
    const features = this.extractFeatures(battleState);
    
    // 前向传播
    const output = this.forward(features);
    if (!output) {
      return this.getRandomDecision(availableSkills, availableTargets);
    }
    
    // 根据概率选择技能（只在可用技能中选择）
    let bestSkillIdx = 0;
    let bestSkillProb = -1;
    for (let i = 0; i < availableSkills.length; i++) {
      const prob = output.skillProbs[i] || 0;
      if (prob > bestSkillProb) {
        bestSkillProb = prob;
        bestSkillIdx = i;
      }
    }
    
    // 根据概率选择目标（只在可用目标中选择）
    let bestTargetIdx = 0;
    let bestTargetProb = -1;
    for (let i = 0; i < availableTargets.length; i++) {
      const prob = output.targetProbs[i] || 0;
      if (prob > bestTargetProb) {
        bestTargetProb = prob;
        bestTargetIdx = i;
      }
    }
    
    // 添加探索性（10%随机）
    if (Math.random() < 0.1) {
      bestSkillIdx = Math.floor(Math.random() * availableSkills.length);
    }
    if (Math.random() < 0.1) {
      bestTargetIdx = Math.floor(Math.random() * availableTargets.length);
    }
    
    const skill = availableSkills[bestSkillIdx] || availableSkills[0];
    const target = availableTargets[bestTargetIdx] || availableTargets[0];
    
    const skillName = typeof skill === 'string' ? skill : skill.name;
    const confidence = (bestSkillProb * bestTargetProb * 100).toFixed(1);
    
    console.log(`🧠 AI决策: ${skillName} → ${target.name} (置信度: ${confidence}%)`);
    
    return {
      skill: { name: skillName, ...SKILL_EFFECTS[skillName] },
      target: target,
      strategy: '🧠深度学习',
      confidence: confidence + '%'
    };
  },
  
  // 随机决策（后备方案）
  getRandomDecision(availableSkills, availableTargets) {
    const skillIdx = Math.floor(Math.random() * availableSkills.length);
    const targetIdx = Math.floor(Math.random() * availableTargets.length);
    
    const skill = availableSkills[skillIdx] || availableSkills[0];
    const target = availableTargets[targetIdx] || availableTargets[0];
    
    const skillName = typeof skill === 'string' ? skill : skill.name;
    
    return {
      skill: { name: skillName, ...SKILL_EFFECTS[skillName] },
      target: target,
      strategy: '🎲随机',
      confidence: '0%'
    };
  },
  
  // ==================== 统计 ====================
  
  async getStats() {
    const battles = await SmartAI_DB.battles.toArray();
    const wins = battles.filter(b => b.result === 'win').length;
    const losses = battles.filter(b => b.result === 'lose').length;
    const dataCount = await SmartAI_DB.trainingData.count();
    
    return {
      totalBattles: battles.length,
      wins,
      losses,
      winRate: battles.length > 0 ? (wins / battles.length * 100).toFixed(1) + '%' : '0%',
      trainingDataCount: dataCount,
      isModelReady: this.isModelReady,
      needMoreData: battles.length < this.config.MIN_BATTLES_TO_TRAIN,
      battlesNeeded: Math.max(0, this.config.MIN_BATTLES_TO_TRAIN - battles.length)
    };
  },
  
  // 清除所有数据
  async clearAllData() {
    await SmartAI_DB.battles.clear();
    await SmartAI_DB.trainingData.clear();
    await SmartAI_DB.modelParams.clear();
    this.model = null;
    this.isModelReady = false;
    this.battleCount = 0;
    console.log('🗑️ 所有AI数据已清除');
  },
  
  // 导出数据（调试用）
  async exportData() {
    const battles = await SmartAI_DB.battles.toArray();
    const trainingData = await SmartAI_DB.trainingData.toArray();
    return { battles, trainingData, model: this.model };
  }
};

// ==================== 页面加载时初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
  SmartAI.init().catch(err => {
    console.error('SmartAI 初始化失败:', err);
  });
});
