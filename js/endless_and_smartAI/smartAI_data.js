// ==================== SmartAI 数据层 ====================
// 
// 包含：
// - IndexedDB 数据库定义
// - 特征编码常量
// - AI 配置参数
//
// ========================================================================

// 初始化数据库 - V5 TensorFlow.js版本
export const SmartAI_DB = new Dexie('SmartAI_Database');

// V5: TensorFlow.js 版本，增加即时奖励记录
SmartAI_DB.version(5).stores({
  battles: '++id, timestamp, result, totalTurns, playerTeam, floor, dataVersion',
  trainingData: '++id, battleId, turn, state, action, reward, result, dataVersion',
  modelParams: 'id, weights, updatedAt, version',
  trainingStats: 'id, epoch, loss, accuracy, timestamp'
});

// ==================== 特征编码常量 ====================

// 词缀列表（用于特征编码）- 13个
export const AFFIX_LIST = [
  'thorns',      // 荆棘反伤
  'regen',       // 回血
  'berserk',     // 狂暴（低血量增伤）
  'multiStrike', // 多段攻击
  'swift',       // 迅捷（速度加成）
  'fortify',     // 强韧（减伤）
  'dodge',       // 闪避
  'shield',      // 护盾
  'vampiric',    // 吸血
  'aura',        // 光环（队友增益）
  'undying',     // 不死（首次致死保留1HP）
  'split',       // 分裂（死亡召唤小怪）
  'explosion'    // 爆炸（死亡伤害）
];

// Roguelike强化列表（用于特征编码）- 8个
export const BUFF_LIST = [
  // stat类型
  'atkUp',     // 攻击力提升
  'defUp',     // 防御力提升
  'hpUp',      // 生命值提升
  'spdUp',     // 速度提升
  // special类型
  'critUp',    // 暴击率提升
  'vampUp',    // 吸血效果
  'shield',    // 护盾
  'extraLife'  // 额外生命
];

// 持续效果类型列表（用于特征编码）- 3个
export const DEBUFF_STAT_LIST = ['atk', 'def', 'spd'];

// ==================== 职业系统常量 ====================

// 职业列表（8种）- 用于特征编码
export const CLASS_LIST = ['先锋', '近卫', '狙击', '术师', '医疗', '重装', '特种', '辅助'];

// 职业击杀优先级奖励（敌人视角）
// 敌人攻击不同职业目标时的额外奖励
export const CLASS_PRIORITY_REWARD = {
  '医疗': 6,   // 持续治疗，最高优先级
  '先锋': 5,   // 供能全队（缪尔赛思等）
  '辅助': 5,   // 全队buff/debuff（铃兰等）
  '术师': 4,   // 高爆发AOE（艾雅法拉等）
  '狙击': 3,   // 远程单点输出
  '特种': 3,   // 控制/功能性（红、崖心等）
  '近卫': 2,   // 主力近战输出
  '重装': 1    // 肉盾，最后击杀
};

// ==================== AI 配置参数 ====================

export const AI_CONFIG = {
  // 训练门槛
  MIN_BATTLES_TO_TRAIN: 15,    // 最少15场战斗后开始训练

  // 优化器参数
  LEARNING_RATE: 0.001,         // Adam优化器学习率
  BATCH_SIZE: 32,               // 批量大小
  EPOCHS: 20,                   // 训练轮数

  // Experience Replay
  REPLAY_BUFFER_SIZE: 5000,     // 经验回放缓冲区大小

  // ε-greedy 探索策略
  EPSILON_START: 1.0,           // 初始探索率（100%随机）
  EPSILON_END: 0.05,            // 最终探索率（5%随机）
  EPSILON_DECAY: 0.995,         // 探索率衰减系数

  // 神经网络结构
  HIDDEN_UNITS_1: 128,          // 第一隐藏层神经元
  HIDDEN_UNITS_2: 64,           // 第二隐藏层神经元
  HIDDEN_UNITS_3: 32,           // 第三隐藏层神经元
  DROPOUT_RATE: 0.2,            // Dropout比率

  // 输入/输出维度
  // V8: 233 + 13(行动条特征) = 246
  INPUT_SIZE: 246,              // 输入特征维度（含行动条编码）
  SKILL_OUTPUT: 10,             // 技能输出维度
  TARGET_OUTPUT: 8              // 目标输出维度
};

// ==================== 特征维度说明 ====================
/*
 * INPUT_SIZE = 246 特征分布 (V8)：
 *
 * 我方单位 (最多8个，每个13特征) = 104
 *   - currentHp / maxHp          血量比例
 *   - energy / maxEnergy         能量比例
 *   - atk / 500                  攻击力归一化
 *   - def / 100                  防御力归一化
 *   - spd / 150                  速度归一化
 *   - isSummon                   是否召唤物
 *   - stunDuration > 0           是否眩晕
 *   - buffAtk / 500              攻击Buff
 *   - buffAtkPercent             百分比攻击Buff
 *   - buffDef / 100              防御Buff
 *   - skillUseCount / 10         技能使用次数
 *   - hasTaunt                   是否有嘲讽 (V7新增)
 *   - actionGauge / 10000        行动条进度 (V8新增)
 *
 * 敌方单位 (最多4个，每个32特征) = 128
 *   - currentHp / maxHp          血量比例
 *   - atk / 500                  攻击力归一化
 *   - def / 100                  防御力归一化
 *   - spd / 150                  速度归一化
 *   - shieldBroken               护盾是否破碎
 *   - currentShield / shield     护盾比例
 *   - stunDuration > 0           是否眩晕
 *   - actionGauge / 10000        行动条进度 (V8新增)
 *   - [13个词缀 one-hot]         词缀特征
 *   - [3个debuff状态]            持续减益状态
 *   - [8个职业 one-hot]          职业特征 (V6新增)
 *
 * 当前行动单位 = 4
 *   - currentHp / maxHp
 *   - energy / maxEnergy
 *   - isEnemy
 *   - actionGauge / 10000        行动条进度 (V8新增)
 *
 * 战斗信息 = 2
 *   - turn / 100                 回合数归一化
 *   - floor / 100                层数归一化
 *
 * 玩家Roguelike强化 = 8
 *   - [8个buff one-hot]
 *
 * 总计: 104 + 128 + 4 + 2 + 8 = 246 (V8)
 */
