// ==================== 抽卡系统 ====================

import { state, store } from './state.js';
import { CONFIG } from './config.js';
import { CHARACTER_DATA } from './data.js';
import { showGachaResult, updateResourceUI } from './ui.js';

// 单次抽取
function pull() {
  store.incrementPity();
  let rarity;
  const rand = Math.random() * 100;

  // 保底判定
  if (state.pity >= CONFIG.PITY) {
    rarity = 6;
    store.setPity(0);
  } else if (rand < CONFIG.RATES[6]) {
    // 6星
    rarity = 6;
    store.setPity(0);
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

  // 从对应稀有度池中随机选干员
  const pool = Object.entries(CHARACTER_DATA).filter(([_, d]) => d.rarity === rarity);
  const [charName] = pool[Math.floor(Math.random() * pool.length)];

  // 添加到仓库或提升潜能
  store.acquireCharacter(charName, rarity);

  return { rarity, name: charName };
}

// 单抽
export function gachaSingle() {
  if (state.tickets < 1) {
    alert('抽卡券不足！');
    return;
  }
  store.consumeTickets(1);
  const results = [pull()];
  showGachaResult(results);
  updateResourceUI();
}

// 十连
export function gachaTen() {
  if (state.tickets < 10) {
    alert('抽卡券不足！');
    return;
  }
  store.consumeTickets(10);
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(pull());
  }
  showGachaResult(results);
  updateResourceUI();
}

// 每日签到
export function dailyLogin() {
  const today = new Date().toDateString();
  if (store.checkDaily(today)) {
    alert('今天已经签到过了！');
    return;
  }
  store.setDaily(today);
  store.addTickets(100);
  alert('签到成功！+100抽卡券');
  updateResourceUI();
}
