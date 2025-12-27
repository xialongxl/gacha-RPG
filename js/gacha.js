// ==================== 抽卡系统 ====================

// 单次抽取
function pull() {
  state.pity++;
  let rarity;
  const rand = Math.random() * 100;

  // 保底判定
  if (state.pity >= CONFIG.PITY) {
    rarity = 6;
    state.pity = 0;
  } else if (rand < CONFIG.RATES[6]) {
    // 6星
    rarity = 6;
    state.pity = 0;
  } else if (rand < CONFIG.RATES[6] + CONFIG.RATES[5]) {
    // 5星
    rarity = 5;
  } else if (rand < CONFIG.RATES[6] + CONFIG.RATES[5] + CONFIG.RATES[4]) {
    // 4星
    rarity = 4;
  } else {
    // 3星
    rarity = 3;
  }

  // 从对应稀有度池中随机选角色
  const pool = Object.entries(CHARACTER_DATA).filter(([_, d]) => d.rarity === rarity);
  const [charName] = pool[Math.floor(Math.random() * pool.length)];

  // 添加到仓库或提升潜能
  if (state.inventory[charName]) {
    // 已有该干员 - 确保 potential 有默认值
    const currentPotential = state.inventory[charName].potential || 1;
    if (currentPotential < 12) {
      state.inventory[charName].potential = currentPotential + 1;
    } else {
      // 满潜转金币
      state.gold += CONFIG.GOLD_CONVERT[rarity];
    }
    state.inventory[charName].count++;
  } else {
    // 新干员
    state.inventory[charName] = { count: 1, potential: 1 };
  }

  return { rarity, name: charName };
}

// 单抽
function gachaSingle() {
  if (state.tickets < 1) {
    alert('抽卡券不足！');
    return;
  }
  state.tickets -= 1;
  const results = [pull()];
  showGachaResult(results);
  updateResourceUI();
  saveState();
}

// 十连
function gachaTen() {
  if (state.tickets < 10) {
    alert('抽卡券不足！');
    return;
  }
  state.tickets -= 10;
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(pull());
  }
  showGachaResult(results);
  updateResourceUI();
  saveState();
}

// 每日签到
function dailyLogin() {
  const today = new Date().toDateString();
  if (state.lastDaily === today) {
    alert('今天已经签到过了！');
    return;
  }
  state.lastDaily = today;
  state.tickets += 100;
  alert('签到成功！+100抽卡券');
  updateResourceUI();
  saveState();
}