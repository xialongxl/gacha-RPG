// 抽卡系统

// 单次抽取
function pull() {
  state.pity++;
  let rarity;
  const rand = Math.random();

  // 保底判定
  if (state.pity >= CONFIG.PITY) {
    rarity = 'SSR';
    state.pity = 0;
  } else if (rand < CONFIG.SSR_RATE) {
    rarity = 'SSR';
    state.pity = 0;
  } else if (rand < CONFIG.SSR_RATE + CONFIG.SR_RATE) {
    rarity = 'SR';
  } else if (rand < CONFIG.SSR_RATE + CONFIG.SR_RATE + CONFIG.R_RATE) {
    rarity = 'R';
  } else {
    rarity = 'N';
  }

  // 从对应稀有度池中随机选角色
  const pool = Object.entries(CHARACTER_DATA).filter(([_, d]) => d.rarity === rarity);
  const [charName] = pool[Math.floor(Math.random() * pool.length)];

  // 添加到仓库
  if (!state.inventory[charName]) {
    state.inventory[charName] = { count: 0 };
  }
  state.inventory[charName].count++;

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
  state.tickets += 10;
  state.stamina = CONFIG.STAMINA_MAX;
  alert('签到成功！+10抽卡券，体力已恢复满');
  updateResourceUI();
  saveState();
}