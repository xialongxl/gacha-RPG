// 游戏配置
const CONFIG = {
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

    // 潜能加成（每级+3%）
  POTENTIAL_BONUS_PER_LEVEL: 0.05
};

// 计算潜能加成后的属性
function applyPotentialBonus(baseValue, potential) {
  const bonus = 1 + (potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL;
  return Math.floor(baseValue * bonus);
}

// 获取潜能加成百分比
function getPotentialBonusPercent(potential) {
  return (potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100;
}