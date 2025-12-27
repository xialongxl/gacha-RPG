// ==================== 深度学习AI - 数据层 ====================

// 初始化数据库
const SmartAI_DB = new Dexie('SmartAI_Database');
SmartAI_DB.version(1).stores({
  // 战斗记录
  battles: '++id, timestamp, result, totalTurns, playerTeam',
  // 训练数据（每个回合的状态和玩家行动）
  trainingData: '++id, battleId, turn, state, action, result',
  // 模型参数
  modelParams: 'id, weights, updatedAt'
});

// ==================== 数据收集器 ====================

const SmartAI_Data = {
  // 当前战斗状态
  currentBattleId: null,
  currentTurn: 0,
  
  // ==================== 战斗记录 ====================
  
  // 开始记录战斗
  async startBattleRecord(playerTeam) {
    const battle = {
      timestamp: Date.now(),
      result: null,
      totalTurns: 0,
      playerTeam: playerTeam.map(p => p.name || p)
    };
    
    this.currentBattleId = await SmartAI_DB.battles.add(battle);
    this.currentTurn = 0;
    console.log(`🎮 开始记录战斗 #${this.currentBattleId}`);
    
    return this.currentBattleId;
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
      result: null
    };
    
    await SmartAI_DB.trainingData.add(record);
    console.log(`📝 记录行动: ${action.skillName} → ${action.targetName || '无目标'}`);
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
    // 胜利的行动权重高，失败的行动权重低
    const resultWeight = victory ? 1.0 : -0.3;
    await SmartAI_DB.trainingData
      .where('battleId')
      .equals(this.currentBattleId)
      .modify({ result: resultWeight });
    
    console.log(`📝 战斗 #${this.currentBattleId} 记录完成: ${victory ? '胜利' : '失败'}`);
    
    const battleId = this.currentBattleId;
    this.currentBattleId = null;
    
    return battleId;
  },
  
  // ==================== 特征提取 ====================
  
  // 提取战场状态特征
  extractFeatures(battleState) {
    const features = [];
    
    // 我方单位特征（最多4个干员 + 4个召唤物 = 8个）
    const maxAllies = 8;
    const allies = [...(battleState.allies || []), ...(battleState.summons || [])];
    
    for (let i = 0; i < maxAllies; i++) {
      const unit = allies[i];
      if (unit && unit.currentHp > 0) {
        features.push(
          unit.currentHp / unit.maxHp,                    // HP%
          (unit.energy || 0) / (unit.maxEnergy || 100),   // 能量%
          this.normalize(unit.atk, 500),                  // ATK归一化
          this.normalize(unit.def, 100),                  // DEF归一化
          this.normalize(unit.spd, 150),                  // SPD归一化
          unit.isSummon ? 1 : 0,                          // 是否召唤物
          unit.stunDuration > 0 ? 1 : 0,                  // 是否眩晕
          unit.isSummoner ? 1 : 0                         // 是否召唤师
        );
      } else {
        features.push(0, 0, 0, 0, 0, 0, 0, 0);  // 空位或死亡
      }
    }
    
    // 敌方单位特征（最多4个）
    const maxEnemies = 4;
    const enemies = battleState.enemies || [];
    
    for (let i = 0; i < maxEnemies; i++) {
      const unit = enemies[i];
      if (unit && unit.currentHp > 0) {
        features.push(
          unit.currentHp / unit.maxHp,                    // HP%
          this.normalize(unit.atk, 500),                  // ATK
          this.normalize(unit.def, 100),                  // DEF
          this.normalize(unit.spd, 150),                  // SPD
          unit.shieldBroken ? 1 : 0,                      // 护盾已破
          (unit.currentShield || 0) / Math.max(1, unit.shield || 1),  // 护盾%
          unit.stunDuration > 0 ? 1 : 0,                  // 是否眩晕
          this.normalize(unit.buffAtk || 0, 200)          // buff加成
        );
      } else {
        features.push(0, 0, 0, 0, 0, 0, 0, 0);
      }
    }
    
    // 当前行动单位特征
    const current = battleState.currentUnit;
    if (current) {
      features.push(
        current.currentHp / current.maxHp,
        (current.energy || 0) / (current.maxEnergy || 100),
        current.isEnemy ? 1 : 0,
        current.isSummon ? 1 : 0
      );
    } else {
      features.push(0, 0, 0, 0);
    }
    
    // 战斗信息
    features.push(
      this.normalize(battleState.turn || 0, 100),         // 回合数
      this.normalize(battleState.floor || 1, 100),        // 无尽模式层数
      allies.filter(a => a && a.currentHp > 0).length / maxAllies,  // 我方存活率
      enemies.filter(e => e && e.currentHp > 0).length / maxEnemies // 敌方存活率
    );
    
    return features;
  },
  
  // 归一化
  normalize(value, max) {
    return Math.min(1, Math.max(0, value / max));
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
  
  // ==================== 数据获取 ====================
  
  // 获取所有训练数据
  async getAllTrainingData() {
    return await SmartAI_DB.trainingData.toArray();
  },
  
  // 获取战斗统计
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
      trainingDataCount: dataCount
    };
  },
  
  // 获取战斗数量
  async getBattleCount() {
    return await SmartAI_DB.battles.count();
  },
  
  // ==================== 模型存储 ====================
  
  // 保存模型参数
  async saveModelParams(weights) {
    await SmartAI_DB.modelParams.put({
      id: 'main',
      weights: JSON.stringify(weights),
      updatedAt: Date.now()
    });
    console.log('💾 模型参数已保存');
  },
  
  // 加载模型参数
  async loadModelParams() {
    const saved = await SmartAI_DB.modelParams.get('main');
    if (saved) {
      return JSON.parse(saved.weights);
    }
    return null;
  },
  
  // ==================== 数据清理 ====================
  
  // 清除所有数据
  async clearAllData() {
    await SmartAI_DB.battles.clear();
    await SmartAI_DB.trainingData.clear();
    await SmartAI_DB.modelParams.clear();
    this.currentBattleId = null;
    this.currentTurn = 0;
    console.log('🗑️ 所有AI数据已清除');
  }
};
