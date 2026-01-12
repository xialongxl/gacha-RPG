// 游戏配置
export const CONFIG = {
  PITY: 20,              // 保底抽数（90抽保底6星）
  STORAGE_KEY: 'gachaRpgState',
  
  // 抽卡概率（百分比）
  RATES: {
    6: 2,    // 6星 2%
    5: 8,    // 5星 8%
    4: 50,   // 4星 50%
    3: 40    // 3星 40%
  },
  
  // 满潜转金币
  GOLD_CONVERT: {
    6: 500,
    5: 200,
    4: 50,
    3: 20
  },

  // 潜能加成（每级+5%）
  POTENTIAL_BONUS_PER_LEVEL: 0.05,

  // ==================== 突破系统配置 ====================
  BREAKTHROUGH: {
    REQUIRED_RARITY: 6,           // 需要6星
    REQUIRED_POTENTIAL: 13,       // 需要满潜能
    GOLD_COST: 10000,             // 突破消耗10000金币
    STATS_EXTRA_BONUS: 0.4,       // 属性突破：在潜能加成基础上额外+40%，总计+100%（从+60%补至+100%）
    SPEED_BONUS: 0.4,             // 速度突破：+40%速度
    EXTRA_STARS: 1                // 额外显示1颗星
  },

  // ==================== 召唤系统配置 ====================
  SUMMON: {
    MAX_SLOTS: 4,              // 召唤位总数（全队共享）
    FIRST_SUMMON_COUNT: 1,     // 首次行动召唤数量
    REFRESH_INTERVAL: 3,       // 召唤师行动X次后召唤下一只
    INHERIT_RATIO: 1.0,        // 属性继承比例（100%）
    OWNER_DEATH_REMOVE: true,  // 召唤者死亡时召唤物是否消失
    INSTANT_REFRESH_ON_DEATH: true  // 召唤物死亡后召唤师立即补充
  },

  // ==================== 词缀系统配置 ====================
  AFFIX: {
    // 词缀类型定义
    TYPES: {
      // === 普通词缀 (common) ===
      thorns: { 
        name: '反伤', 
        icon: '🦔',
        desc: '受到攻击时反弹{value}%伤害',
        value: 15,           // 反弹15%伤害
        rarity: 'common' 
      },
      regen: { 
        name: '回血', 
        icon: '💚',
        desc: '每回合恢复{value}%最大生命',
        value: 5,            // 每回合恢复5%HP
        rarity: 'common' 
      },
      berserk: { 
        name: '狂化', 
        icon: '😤',
        desc: 'HP低于{threshold}%时攻击力+{value}%',
        value: 50,           // 攻击力+50%
        threshold: 30,       // HP低于30%触发
        rarity: 'common' 
      },
      swift: { 
        name: '迅捷', 
        icon: '💨',
        desc: '速度+{value}',
        value: 15,           // 速度+15
        rarity: 'common' 
      },
      fortify: { 
        name: '坚韧', 
        icon: '🛡️',
        desc: '防御力+{value}%',
        value: 25,           // 防御力+25%
        rarity: 'common' 
      },

      // === 稀有词缀 (rare) ===
      multiStrike: { 
        name: '连击', 
        icon: '⚔️',
        desc: '普攻时有{value}%概率攻击两次',
        value: 30,           // 30%概率连击
        rarity: 'rare' 
      },
      taunt: { 
        name: '嘲讽', 
        icon: '😠',
        desc: '强制敌人优先攻击自己',
        rarity: 'rare' 
      },
      shield: { 
        name: '护盾', 
        icon: '🔰',
        desc: '首次受击伤害减少{value}%（一次性）',
        value: 50,           // 首次受击伤害减少50%
        consumable: true,    // 一次性效果
        rarity: 'rare' 
      },
      dodge: { 
        name: '闪避', 
        icon: '💫',
        desc: '{value}%概率闪避攻击',
        value: 20,           // 20%闪避率
        rarity: 'rare' 
      },
      vampiric: { 
        name: '吸血', 
        icon: '🩸',
        desc: '造成伤害时恢复{value}%',
        value: 15,           // 15%吸血
        rarity: 'rare' 
      },

      // === 传说词缀 (legendary) ===
      split: { 
        name: '分裂', 
        icon: '👥',
        desc: '死亡时分裂为{value}个小型单位',
        value: 2,            // 分裂成2个
        rarity: 'legendary' 
      },
      explosion: { 
        name: '爆炸', 
        icon: '💥',
        desc: '死亡时对所有敌人造成{value}%最大HP伤害',
        value: 30,           // 30%最大HP伤害
        rarity: 'legendary' 
      },
      undying: { 
        name: '不死', 
        icon: '💀',
        desc: '首次致死伤害时恢复{value}%HP',
        value: 30,           // 恢复30%HP
        rarity: 'legendary' 
      },
      aura: { 
        name: '强化光环', 
        icon: '✨',
        desc: '队友攻击力+{value}%',
        value: 15,           // 队友攻击力+15%
        rarity: 'legendary' 
      }
    },

    // 词缀稀有度权重
    RARITY_WEIGHTS: {
      common: 60,      // 60%
      rare: 30,        // 30%
      legendary: 10    // 10%
    },

    // 层数对应词缀数量 [起始层, 词缀数]
    FLOOR_AFFIX_COUNT: [
      [1, 0],      // 1-9层：无词缀
      [10, 1],     // 10-19层：1个词缀
      [20, 2],     // 20-29层：2个词缀
      [30, 3],     // 30-39层：3个词缀
      [40, 4],     // 40-49层：4个词缀
      [50, 5]      // 50+层：5个词缀
    ],

    // 精英/BOSS额外词缀
    ELITE: {
      interval: 5,       // 每5层刷新精英池
      extraAffixes: 1,   // 精英额外+1词缀
      guaranteedRare: true  // 精英保底1个稀有+词缀
    },
    BOSS: {
      interval: 10,      // 每10层BOSS
      extraAffixes: 2,   // BOSS额外+2词缀
      guaranteedLegendary: true  // BOSS保底1个传说词缀
    }
  },

  // ==================== 战斗规则配置 ====================
  BATTLE_RULES: {
    // 禁疗：治疗效果减少
    noHeal: {
      name: '禁疗',
      icon: '🚫',
      desc: '治疗效果降低{value}%',
      floors: [15, 25, 35, 45],  // 生效层数
      value: 50                   // 治疗效果-50%
    },
    // 先手：敌人优先行动
    enemyFirst: {
      name: '先手',
      icon: '⚡',
      desc: '敌人速度+{value}',
      floors: [20, 30, 40, 50],
      value: 20
    },
    // 削弱：玩家属性降低
    debuff: {
      name: '削弱',
      icon: '📉',
      desc: '我方攻击力-{value}%',
      floors: [25, 45],
      value: 15
    },
    // 限时：回合数限制
    turnLimit: {
      name: '限时',
      icon: '⏱️',
      desc: '{value}回合内未结束视为失败',
      floors: [30, 50],
      value: 20
    }
  },

  // ==================== 无尽币配置 ====================
  ENDLESS_COIN: {
    BASE_RATE: 2,           // 每层获得2无尽币
    BOSS_BONUS: 10,         // 击败BOSS额外+10
    // 兑换比例
    EXCHANGE: {
      COIN_TO_TICKET: 1   // 1无尽币 = 1时装券
    }
  },

  // ==================== 无尽币商店道具配置 ====================
  ENDLESS_SHOP: {
    REVIVE_TICKET: {
      name: '复活券',
      icon: '🎟️',
      desc: '无尽模式全军覆没时可使用，复活全队继续挑战',
      price: 1000
    },
    RELAY_TICKET: {
      name: '接力券',
      icon: '🔗',
      desc: '战斗胜利后撤退时可记录层数，下次从该层继续',
      price: 800
    }
  },

  // ==================== 扫荡系统配置 ====================
  SWEEP: {
    maxDailyCount: 3,           // 每日最大免费次数
    buyPrice: 500,              // 购买额外次数的价格（无尽币）
    
    // 极速扫荡配置（先只实现极速）
    fast: {
      timePerFloor: 1,          // 每层时间（秒）
      rewardRate: 0.5,          // 奖励效率 50%
      name: '极速扫荡'
    },
    
    // 普通扫荡配置（后续实现）
    normal: {
      timePerFloor: 60,         // 每层时间（秒）- 1分钟
      rewardRate: 0.9,          // 奖励效率 90%
      name: '普通扫荡'
    }
  },

  // ==================== Roguelike强化配置 ====================
  // 注意：所有百分比值统一使用小数形式（0.15表示15%）
  ROGUELIKE: {
    // 强化选项（每5层可选）
    UPGRADES: {
      atkUp: { name: '攻击强化', icon: '⚔️', desc: '全队攻击+25%', type: 'stat', stat: 'atk', value: 0.25 },
      defUp: { name: '防御强化', icon: '🛡️', desc: '全队防御+25%', type: 'stat', stat: 'def', value: 0.25 },
      hpUp: { name: '生命强化', icon: '❤️', desc: '全队生命+30%', type: 'stat', stat: 'hp', value: 0.30 },
      spdUp: { name: '速度强化', icon: '💨', desc: '全队速度+25', type: 'stat', stat: 'spd', value: 25 },
      critUp: { name: '暴击强化', icon: '🎯', desc: '暴击率+15%', type: 'special', effect: 'crit', value: 0.15 },
      vampUp: { name: '吸血强化', icon: '🩸', desc: '全队+10%吸血', type: 'special', effect: 'vamp', value: 0.10 },
      regenPerTurn: { name: '备用医疗装置', icon: '💚', desc: '全队每回合回复10%HP', type: 'special', effect: 'regenPerTurn', value: 0.10 },
      energyUp: { name: '能量强化', icon: '⚡', desc: '全队能量+50', type: 'instant', effect: 'energy', value: 50 },
      shieldAll: { name: '战斗护盾', icon: '🔰', desc: '每层战斗开始时获得25%HP护盾', type: 'battle_start', effect: 'shield', value: 0.25 },
      extraLife: { name: '免死金牌', icon: '💖', desc: '全队干员每层都拥有1次免死机会，触发时立即复活并恢复30%HP', type: 'special', effect: 'extraLife' },
      rewardUp: { name: '奖励强化', icon: '💰', desc: '每层奖励+50%（可叠加）', type: 'special', effect: 'rewardUp', value: 0.5 }
    },
    // 每次提供的选项数量
    OPTIONS_COUNT: 5,
    // 强化间隔层数
    UPGRADE_INTERVAL: 3
  }
};

// 计算潜能加成后的属性
export function applyPotentialBonus(baseValue, potential) {
  const bonus = 1 + (potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL;
  return Math.floor(baseValue * bonus);
}

// 获取潜能加成百分比
export function getPotentialBonusPercent(potential) {
  return (potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100;
}

// ==================== 突破系统函数 ====================

/**
 * 获取干员显示星级
 * @param {number} rarity - 原始星级
 * @param {string|null} breakthrough - 突破类型
 * @returns {number} 显示星级
 */
export function getDisplayRarity(rarity, breakthrough) {
  if (breakthrough) {
    return rarity + CONFIG.BREAKTHROUGH.EXTRA_STARS;
  }
  return rarity;
}

/**
 * 检查是否可以突破
 * @param {number} rarity - 星级
 * @param {number} potential - 潜能等级
 * @param {string|null} breakthrough - 当前突破状态
 * @returns {boolean} 是否可以突破
 */
export function canBreakthrough(rarity, potential, breakthrough) {
  return rarity >= CONFIG.BREAKTHROUGH.REQUIRED_RARITY &&
         potential >= CONFIG.BREAKTHROUGH.REQUIRED_POTENTIAL &&
         !breakthrough;
}

/**
 * 获取突破所需金币
 * @returns {number} 金币数量
 */
export function getBreakthroughCost() {
  return CONFIG.BREAKTHROUGH.GOLD_COST;
}
