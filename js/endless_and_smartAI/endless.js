// ==================== 无尽模式系统 ====================

console.log('🔄 无尽模式模块加载中...');

import { CHARACTER_DATA, applyPotentialBonus } from '../data.js';
import { state, store, GameDB, battle, resetBattle } from '../state.js';
import { CONFIG } from '../config.js';
import { calculateTurnOrder, nextTurn } from '../battle.js';
import { BattleRenderer } from '../battleRenderer.js';
import { showModal, closeModal, updateResourceUI, addBattleLog, closeBattleField } from '../ui.js';
import { SmartAI } from './smartAI.js';
import { SmartAI_Battle } from './smartAI_battle.js';
import { SummonSystem } from '../summon.js';
import { getEnemyDecision } from '../enemyAI.js';

export const EndlessMode = {
  // 状态
  active: false,
  currentFloor: 0,
  maxFloorReached: 0,
  currentStage: null,
  totalRewards: { gold: 0, tickets: 0 },  // 累计奖励
  currentBuffs: [],  // 当局获得的强化buff
  
  // 配置
  config: {
    BOSS_INTERVAL: 10,              // 每10层BOSS
    ENEMY_SCALE_PER_FLOOR: 0.05,    // 每层敌人属性+5%
    REWARD_SCALE_PER_FLOOR: 0.03,   // 每层奖励+3%
    MAX_ENEMIES_PER_FLOOR: 4,       // 每层最多敌人数
    BASE_GOLD: 50,                  // 基础金币奖励
    BASE_TICKETS: 1                 // 基础抽卡券奖励
  },
  
  // ==================== 敌人模板 ====================
  
  enemyTemplates: {
    // 普通敌人
    normal: [
      { name: '源石虫', hp: 300, atk: 40, def: 10, spd: 50, skills: ['普攻'] },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 55, skills: ['普攻'] },
      { name: '术师', hp: 400, atk: 100, def: 15, spd: 65, skills: ['普攻', '火球'] },
      { name: '狙击手', hp: 350, atk: 120, def: 12, spd: 70, skills: ['普攻', '瞄准射击'] },
      { name: '医疗兵', hp: 450, atk: 50, def: 20, spd: 60, skills: ['普攻', '战地治疗'] }
    ],
    // 精英敌人
    elite: [
      { name: '精英士兵', hp: 1000, atk: 100, def: 50, spd: 62, shield: 2, skills: ['普攻', '重击'] },
      { name: '重装兵', hp: 1500, atk: 80, def: 80, spd: 40, shield: 4, skills: ['普攻', '盾击'] },
      { name: '萨卡兹战士', hp: 1200, atk: 130, def: 45, spd: 85, shield: 2, skills: ['普攻', '双刀斩', '狂暴'] },
      { name: '萨卡兹术师', hp: 800, atk: 150, def: 30, spd: 75, shield: 2, skills: ['普攻', '暗影箭', '诅咒'] },
      { name: '高级医疗兵', hp: 900, atk: 70, def: 35, spd: 70, skills: ['普攻', '战地治疗', '群体治疗'] }
    ],
    // BOSS
    boss: [
      { name: '整合运动队长', hp: 3500, atk: 180, def: 60, spd: 80, shield: 4, skills: ['普攻', '横扫', '鼓舞'] },
      { name: '「碎骨」', hp: 5000, atk: 220, def: 70, spd: 90, shield: 6, skills: ['普攻', '横扫', '死亡宣告', '狂暴'] },
      { name: '「霜星」', hp: 4500, atk: 250, def: 50, spd: 100, shield: 5, skills: ['普攻', '暗影箭', '烈焰风暴', '狂暴'] },
      { name: '「浮士德」', hp: 4000, atk: 300, def: 40, spd: 110, shield: 3, skills: ['普攻', '瞄准射击', '死亡宣告'] },
      { name: '「W」', hp: 6000, atk: 280, def: 60, spd: 95, shield: 8, skills: ['普攻', '横扫', '烈焰风暴', '狂暴', '死亡宣告'] }
    ]
  },
  
  // ==================== 初始化 ====================
  
  async init() {
    await this.loadProgress();
    console.log('🏰 无尽模式初始化完成，历史最高:', this.maxFloorReached, '层');
  },
  
  // 读取进度（使用Dexie）
  async loadProgress() {
    try {
      const saved = await GameDB.settings.get('endless_progress');
      if (saved && saved.value) {
        this.maxFloorReached = saved.value.maxFloorReached || 0;
      }
    } catch (e) {
      console.error('读取无尽模式进度失败:', e);
      this.maxFloorReached = 0;
    }
  },
  
  // 保存进度（使用Dexie）
  async saveProgress() {
    try {
      await GameDB.settings.put({
        id: 'endless_progress',
        value: {
          maxFloorReached: this.maxFloorReached
        }
      });
    } catch (e) {
      console.error('保存无尽模式进度失败:', e);
    }
  },
  
  // ==================== 开始无尽模式 ====================
  
  async start() {
    const team = state.team.filter(c => c !== null);
    if (team.length === 0) {
      alert('请先编队！');
      return;
    }
    
    this.active = true;
    this.currentFloor = 0;
    this.totalRewards = { gold: 0, tickets: 0 };  // 重置累计奖励
    this.currentBuffs = [];  // 重置强化buff
    
    // 开始记录战斗数据（给SmartAI）
    if (typeof SmartAI !== 'undefined') {
      const teamData = team.map(name => ({ name, ...CHARACTER_DATA[name] }));
      await SmartAI.startBattleRecord(teamData);
    }
    
    // 进入第一层
    this.nextFloor();
  },
  
  // ==================== 下一层 ====================
  
  nextFloor() {
    if (!this.active) return;
    
    this.currentFloor++;
    
    // 更新最高记录
    if (this.currentFloor > this.maxFloorReached) {
      this.maxFloorReached = this.currentFloor;
      this.saveProgress();
    }
    
    // 生成敌人
    const enemies = this.generateEnemies();
    
    // 判断是否使用SmartAI（只要模型训练好了，从第1层就用）
    const useSmartAI = typeof SmartAI !== 'undefined' && SmartAI.isModelReady;
    
    // 创建关卡数据
    const stage = {
      id: `endless_${this.currentFloor}`,
      name: this.getFloorName(),
      enemies: enemies,
      rewards: this.calculateRewards(),
      isEndless: true,
      floor: this.currentFloor,
      useSmartAI: useSmartAI,
      isBoss: this.currentFloor % this.config.BOSS_INTERVAL === 0
    };
    
    this.currentStage = stage;
    
    // 开始战斗
    this.startBattle(stage);
  },
  
  // ==================== 敌人生成 ====================
  
  generateEnemies() {
    const floor = this.currentFloor;
    const isBossFloor = floor % this.config.BOSS_INTERVAL === 0;
    const scale = 1 + (floor - 1) * this.config.ENEMY_SCALE_PER_FLOOR;
    
    let enemies = [];
    
    if (isBossFloor) {
      // BOSS层
      const bossIndex = Math.floor((floor / this.config.BOSS_INTERVAL - 1) % this.enemyTemplates.boss.length);
      const bossTemplate = this.enemyTemplates.boss[bossIndex];
      enemies.push(this.createEnemy(bossTemplate, scale * 1.5, 'boss'));
      
      // BOSS层可能有护卫（20层后）
      if (floor >= 20) {
        const guardCount = Math.min(2, Math.floor(floor / 20));
        for (let i = 0; i < guardCount; i++) {
          const guard = this.randomEnemy('elite');
          enemies.push(this.createEnemy(guard, scale, 'elite'));
        }
      }
    } else {
      // 普通层
      const enemyCount = this.calculateEnemyCount(floor);
      
      for (let i = 0; i < enemyCount; i++) {
        // 层数越高，精英概率越高
        const eliteChance = Math.min(0.5, floor * 0.02);
        const type = Math.random() < eliteChance ? 'elite' : 'normal';
        const template = this.randomEnemy(type);
        enemies.push(this.createEnemy(template, scale, type));
      }
    }
    
    return enemies;
  },
  
  // 创建敌人实例（含词缀）
  createEnemy(template, scale, enemyType = 'normal') {
    const floor = this.currentFloor;
    
    // 生成词缀
    const affixes = this.generateAffixes(floor, enemyType);
    
    // 基础属性
    let hp = Math.floor(template.hp * scale);
    let atk = Math.floor(template.atk * scale);
    let def = Math.floor(template.def * scale);
    let spd = template.spd;
    
    // 应用词缀的属性加成
    affixes.forEach(affix => {
      const affixData = CONFIG.AFFIX.TYPES[affix];
      if (!affixData) return;
      
      switch (affix) {
        case 'swift':
          spd += affixData.value;
          break;
        case 'fortify':
          def = Math.floor(def * (1 + affixData.value / 100));
          break;
        // shield词缀在战斗开始时应用，不在这里
      }
    });
    
    return {
      name: template.name,
      hp: hp,
      atk: atk,
      def: def,
      spd: spd,
      shield: template.shield || 0,
      skills: [...template.skills],
      affixes: affixes,         // 词缀列表
      enemyType: enemyType,     // 敌人类型
      // 词缀触发状态
      affixState: {
        undyingTriggered: false,  // 不死是否已触发
        berserkActive: false      // 狂化是否激活
      }
    };
  },
  
  // ==================== 词缀生成系统 ====================
  
  // 生成词缀
  generateAffixes(floor, enemyType) {
    const affixes = [];
    const affixConfig = CONFIG.AFFIX;
    
    // 获取基础词缀数量
    let affixCount = this.getBaseAffixCount(floor);
    
    // 精英/BOSS额外词缀
    if (enemyType === 'elite') {
      affixCount += affixConfig.ELITE.extraAffixes;
    } else if (enemyType === 'boss') {
      affixCount += affixConfig.BOSS.extraAffixes;
    }
    
    // 无词缀则返回空
    if (affixCount <= 0) return affixes;
    
    // 保底词缀处理
    let guaranteedRarity = null;
    if (enemyType === 'boss' && affixConfig.BOSS.guaranteedLegendary) {
      guaranteedRarity = 'legendary';
    } else if (enemyType === 'elite' && affixConfig.ELITE.guaranteedRare) {
      guaranteedRarity = 'rare';
    }
    
    // 生成保底词缀
    if (guaranteedRarity) {
      const guaranteedAffix = this.rollAffix(guaranteedRarity, affixes);
      if (guaranteedAffix) {
        affixes.push(guaranteedAffix);
        affixCount--;
      }
    }
    
    // 生成剩余词缀
    for (let i = 0; i < affixCount; i++) {
      const rarity = this.rollAffixRarity();
      const affix = this.rollAffix(rarity, affixes);
      if (affix) {
        affixes.push(affix);
      }
    }
    
    return affixes;
  },
  
  // 获取基础词缀数量
  getBaseAffixCount(floor) {
    const floorAffixConfig = CONFIG.AFFIX.FLOOR_AFFIX_COUNT;
    let count = 0;
    
    for (let i = floorAffixConfig.length - 1; i >= 0; i--) {
      if (floor >= floorAffixConfig[i][0]) {
        count = floorAffixConfig[i][1];
        break;
      }
    }
    
    return count;
  },
  
  // 随机词缀稀有度
  rollAffixRarity() {
    const weights = CONFIG.AFFIX.RARITY_WEIGHTS;
    const total = weights.common + weights.rare + weights.legendary;
    const roll = Math.random() * total;
    
    if (roll < weights.common) return 'common';
    if (roll < weights.common + weights.rare) return 'rare';
    return 'legendary';
  },
  
  // 随机选择词缀（排除已有）
  rollAffix(rarity, existingAffixes) {
    const affixTypes = CONFIG.AFFIX.TYPES;
    
    // 获取该稀有度的所有词缀
    const availableAffixes = Object.keys(affixTypes).filter(key => {
      return affixTypes[key].rarity === rarity && !existingAffixes.includes(key);
    });
    
    if (availableAffixes.length === 0) {
      // 如果该稀有度没有可用词缀，降级尝试
      if (rarity === 'legendary') return this.rollAffix('rare', existingAffixes);
      if (rarity === 'rare') return this.rollAffix('common', existingAffixes);
      return null;
    }
    
    return availableAffixes[Math.floor(Math.random() * availableAffixes.length)];
  },
  
  // 获取词缀显示文本
  getAffixDisplay(affixes) {
    if (!affixes || affixes.length === 0) return '';
    
    return affixes.map(affix => {
      const data = CONFIG.AFFIX.TYPES[affix];
      return data ? data.icon : '';
    }).join('');
  },
  
  // 获取词缀详细描述
  getAffixTooltip(affixes) {
    if (!affixes || affixes.length === 0) return '';
    
    return affixes.map(affix => {
      const data = CONFIG.AFFIX.TYPES[affix];
      if (!data) return '';
      
      let desc = data.desc;
      // 替换模板变量
      if (data.value !== undefined) {
        desc = desc.replace('{value}', data.value);
      }
      if (data.threshold !== undefined) {
        desc = desc.replace('{threshold}', data.threshold);
      }
      
      return `${data.icon} ${data.name}: ${desc}`;
    }).join('\n');
  },
  
  // 随机选择敌人
  randomEnemy(type) {
    const list = this.enemyTemplates[type];
    return list[Math.floor(Math.random() * list.length)];
  },
  
  // 计算敌人数量
  calculateEnemyCount(floor) {
    if (floor <= 5) return 2;
    if (floor <= 10) return 3;
    return Math.min(this.config.MAX_ENEMIES_PER_FLOOR, 2 + Math.floor(floor / 10));
  },
  
  // ==================== 奖励计算 ====================
  
  calculateRewards() {
    const floor = this.currentFloor;
    const isBossFloor = floor % this.config.BOSS_INTERVAL === 0;
    const scale = 1 + (floor - 1) * this.config.REWARD_SCALE_PER_FLOOR;
    
    let gold = Math.floor(this.config.BASE_GOLD * scale);
    let tickets = Math.floor(this.config.BASE_TICKETS + floor / 5);
    
    if (isBossFloor) {
      gold = Math.floor(gold * 3);
      tickets = Math.floor(tickets * 2);
    }
    
    return { gold, tickets };
  },
  
  // ==================== 层数显示 ====================
  
  getFloorName() {
    const floor = this.currentFloor;
    const isBossFloor = floor % this.config.BOSS_INTERVAL === 0;
    
    if (isBossFloor) {
      return `🏰 无尽 第${floor}层 【BOSS】`;
    }
    return `🏰 无尽 第${floor}层`;
  },
  
  // ==================== 战斗 ====================
  
  startBattle(stage) {
    const team = state.team.filter(c => c !== null);
    
    resetBattle();
    BattleRenderer.init();
    
    battle.active = true;
    battle.stage = stage;
    battle.isEndless = true;
    battle.useSmartAI = stage.useSmartAI;
    battle.endlessFloor = stage.floor;
    
    // 创建我方单位
    battle.allies = team.map((name, index) => {
      const data = CHARACTER_DATA[name];
      const potential = state.inventory[name]?.potential || 1;
      
      // 基础属性
      let baseHp = applyPotentialBonus(data.hp, potential);
      let baseAtk = applyPotentialBonus(data.atk, potential);
      let baseDef = applyPotentialBonus(data.def, potential);
      let baseSpd = data.spd;
      
      // 应用Roguelike强化
      const hpBonus = this.getStatBonus('hp');
      const atkBonus = this.getStatBonus('atk');
      const defBonus = this.getStatBonus('def');
      const spdBonus = this.getStatBonus('spd');
      
      baseHp = Math.floor(baseHp * (1 + hpBonus.bonusPercent));
      baseAtk = Math.floor(baseAtk * (1 + atkBonus.bonusPercent));
      baseDef = Math.floor(baseDef * (1 + defBonus.bonusPercent));
      baseSpd = baseSpd + spdBonus.bonus;
      
      return {
        id: `ally_${name}_${Date.now()}_${index}`,
        name,
        rarity: data.rarity,
        hp: baseHp,
        atk: baseAtk,
        def: baseDef,
        spd: baseSpd,
        skills: [...data.skills],
        currentHp: baseHp,
        maxHp: baseHp,
        energy: 0,
        maxEnergy: 100,
        buffAtk: 0,
        buffAtkPercent: 0,
        buffSpd: 0,
        stunDuration: 0,
        isEnemy: false,
        isLeader: index === 0,
        isSummoner: data.summoner || false,
        isSummon: false,
        unitId: `ally-${name}-${Date.now()}-${index}`,
        // Roguelike特殊效果
        critBonus: this.getSpecialBonus('crit'),
        vampBonus: this.getSpecialBonus('vamp'),
        hasExtraLife: this.hasSpecialEffect('extraLife')
      };
    });
    
    // 创建敌方单位（含词缀）
    battle.enemies = stage.enemies.map((e, idx) => {
      const unit = {
        id: `enemy_${e.name}_${Date.now()}_${idx}`,
        name: e.name,
        hp: e.hp,
        atk: e.atk,
        def: e.def,
        spd: e.spd,
        skills: e.skills || ['普攻'],
        currentHp: e.hp,
        maxHp: e.hp,
        energy: 0,
        maxEnergy: 100,
        buffAtk: 0,
        buffAtkPercent: 0,
        buffSpd: 0,
        stunDuration: 0,
        shield: e.shield || 0,
        currentShield: e.shield || 0,
        shieldBroken: false,
        originalDef: e.def,
        isEnemy: true,
        isSummon: false,
        unitId: `enemy-${e.name}-${idx}-${Date.now()}`,
        // 词缀相关
        affixes: e.affixes || [],
        enemyType: e.enemyType || 'normal',
        affixState: e.affixState || {
          undyingTriggered: false,
          berserkActive: false
        }
      };
      
      return unit;
    });
    
    // 应用光环词缀：增益友方攻击力
    this.applyAuraAffixes();
    
    // 初始化召唤系统
    if (typeof SummonSystem !== 'undefined') {
      SummonSystem.init(battle.allies);
    }
    
    // 显示战斗界面
    document.getElementById('stage-panel').style.display = 'none';
    document.getElementById('battle-field').classList.add('active');
    
    // 显示层数信息
    addBattleLog(`${stage.name}`, 'system');
    if (stage.useSmartAI) {
      addBattleLog('🧠 深度学习AI已激活！', 'system');
    }
    addBattleLog('⚔️ 战斗开始！', 'system');
    
    calculateTurnOrder();
    battle.currentTurn = 0;
    
    // renderBattleInitial();
    BattleRenderer.renderBattleInitial();
    
    // 显示无尽模式层数UI
    this.showFloorUI();
    
    setTimeout(() => nextTurn(), 500);
  },
  
  // 显示层数UI
  showFloorUI() {
    // 移除旧的
    const old = document.getElementById('endless-floor-display');
    if (old) old.remove();
    
    const div = document.createElement('div');
    div.id = 'endless-floor-display';
    div.innerHTML = `
      <div class="endless-floor-info">
        <span class="floor-number">第 ${this.currentFloor} 层</span>
        <span class="floor-record">最高: ${this.maxFloorReached}</span>
        ${battle.useSmartAI ? '<span class="ai-badge">🧠 AI</span>' : ''}
        <span class="floor-rewards">💰${this.totalRewards.gold} 🎫${this.totalRewards.tickets}</span>
      </div>
    `;
    
    const battleField = document.getElementById('battle-field');
    if (battleField) {
      battleField.insertBefore(div, battleField.firstChild);
    }
  },
  
  // ==================== 战斗结果处理 ====================
  
  // 胜利
  async onVictory() {
    if (!this.active) return;
    
    const rewards = this.currentStage.rewards;
    
    // 累加奖励（不发放）
    this.totalRewards.gold += rewards.gold;
    this.totalRewards.tickets += rewards.tickets;
    
    // 检查是否需要显示强化选择（每5层）
    const upgradeInterval = CONFIG.ROGUELIKE?.UPGRADE_INTERVAL || 5;
    if (this.currentFloor > 0 && this.currentFloor % upgradeInterval === 0) {
      // 显示强化选择UI
      this.showUpgradeModal(rewards);
    } else {
      // 直接显示胜利弹窗
      this.showVictoryModal(rewards);
    }
  },
  
  // ==================== Roguelike强化系统 ====================
  
  // 显示强化选择弹窗
  showUpgradeModal(rewards) {
    const options = this.getRandomUpgrades();
    
    let optionsHtml = options.map((opt, idx) => `
      <div class="upgrade-option" data-key="${opt.key}">
        <span class="upgrade-icon">${opt.icon}</span>
        <div class="upgrade-info">
          <div class="upgrade-name">${opt.name}</div>
          <div class="upgrade-desc">${opt.desc}</div>
        </div>
      </div>
    `).join('');
    
    const content = `
      <div class="upgrade-modal">
        <p>🎉 第 ${this.currentFloor} 层通关！</p>
        <div class="upgrade-rewards">
          <span>💰 +${rewards.gold}</span>
          <span>🎫 +${rewards.tickets}</span>
        </div>
        <hr>
        <p class="upgrade-title">🎁 选择一个强化</p>
        <div class="upgrade-options">
          ${optionsHtml}
        </div>
        <p class="upgrade-buffs">当前强化: ${this.getBuffsDisplay()}</p>
      </div>
    `;
    
    showModal('⬆️ 强化选择', content, false);
    
    // 绑定选择事件
    setTimeout(() => {
      document.querySelectorAll('.upgrade-option').forEach(el => {
        el.addEventListener('click', () => {
          const key = el.dataset.key;
          this.selectUpgrade(key);
        });
      });
    }, 100);
  },
  
  // 获取随机强化选项
  getRandomUpgrades() {
    const upgrades = CONFIG.ROGUELIKE?.UPGRADES || {};
    const count = CONFIG.ROGUELIKE?.OPTIONS_COUNT || 3;
    
    // 获取所有可用强化
    const available = Object.entries(upgrades).map(([key, data]) => ({
      key,
      ...data
    }));
    
    // 随机抽取
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  },
  
  // 选择强化
  selectUpgrade(key) {
    const upgrade = CONFIG.ROGUELIKE?.UPGRADES?.[key];
    if (!upgrade) return;
    
    // 应用强化效果
    this.applyUpgrade(key, upgrade);
    
    // 记录已获得的buff
    this.currentBuffs.push({
      key,
      name: upgrade.name,
      icon: upgrade.icon,
      desc: upgrade.desc,
      type: upgrade.type,
      ...upgrade
    });
    
    closeModal();
    
    // 显示选择结果后继续
    addBattleLog(`🎁 获得强化: ${upgrade.icon} ${upgrade.name}`, 'system');
    
    // 继续显示胜利弹窗
    const rewards = this.currentStage.rewards;
    this.showVictoryModal(rewards);
  },
  
  // 应用强化效果
  applyUpgrade(key, upgrade) {
    // instant类型立即生效
    if (upgrade.type === 'instant') {
      this.applyInstantUpgrade(upgrade);
    }
    // stat和special类型在战斗开始时应用，存入currentBuffs即可
  },
  
  // 应用即时效果强化
  applyInstantUpgrade(upgrade) {
    const aliveAllies = battle.allies?.filter(a => a.currentHp > 0) || [];
    
    switch (upgrade.effect) {
      case 'heal':
        // 全队恢复HP
        aliveAllies.forEach(ally => {
          const healAmount = Math.floor(ally.maxHp * upgrade.value);
          ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healAmount);
        });
        addBattleLog(`💚 全队恢复${Math.floor(upgrade.value * 100)}%HP！`, 'heal');
        break;
        
      case 'energy':
        // 全队增加能量
        aliveAllies.forEach(ally => {
          ally.energy = Math.min(ally.maxEnergy, ally.energy + upgrade.value);
        });
        addBattleLog(`⚡ 全队能量+${upgrade.value}！`, 'system');
        break;
        
      case 'shield':
        // 全队获得护盾
        aliveAllies.forEach(ally => {
          const shieldAmount = Math.floor(ally.maxHp * upgrade.value);
          ally.tempShield = (ally.tempShield || 0) + shieldAmount;
        });
        addBattleLog(`🔰 全队获得${Math.floor(upgrade.value * 100)}%HP护盾！`, 'system');
        break;
        
      case 'revive':
        // 复活一个死亡队友
        const deadAllies = battle.allies?.filter(a => a.currentHp <= 0) || [];
        if (deadAllies.length > 0) {
          const revived = deadAllies[0];
          revived.currentHp = Math.floor(revived.maxHp * 0.5);
          addBattleLog(`✨ ${revived.name}复活了！`, 'heal');
        } else {
          addBattleLog(`✨ 没有需要复活的队友`, 'system');
        }
        break;
    }
  },
  
  // 获取当前buff显示
  getBuffsDisplay() {
    if (this.currentBuffs.length === 0) return '无';
    return this.currentBuffs.map(b => b.icon).join(' ');
  },
  
  // 获取属性加成（供战斗使用）
  getStatBonus(stat) {
    let bonus = 0;
    let bonusPercent = 0;
    
    this.currentBuffs.forEach(buff => {
      if (buff.type === 'stat' && buff.stat === stat) {
        if (stat === 'spd') {
          // 速度是固定加成
          bonus += buff.value;
        } else {
          // 其他是百分比加成
          bonusPercent += buff.value;
        }
      }
    });
    
    return { bonus, bonusPercent };
  },
  
  // 获取特殊效果加成
  getSpecialBonus(effect) {
    let value = 0;
    this.currentBuffs.forEach(buff => {
      if (buff.type === 'special' && buff.effect === effect) {
        value += buff.value || 0;
      }
    });
    return value;
  },
  
  // 检查是否有特殊效果
  hasSpecialEffect(effect) {
    return this.currentBuffs.some(buff => buff.type === 'special' && buff.effect === effect);
  },
  
  // 失败
  async onDefeat() {
    if (!this.active) return;
    
    await this.end(false);
  },
  
  // 结束无尽模式
  async end(victory) {
    this.active = false;
    
    // 清理召唤系统
    if (typeof SummonSystem !== 'undefined') {
      SummonSystem.clear();
    }
    
    // 计算无尽币
    let endlessCoinEarned = 0;
    if (victory) {
      // 撤退时获得无尽币
      const coinConfig = CONFIG.ENDLESS_COIN || { BASE_RATE: 2, BOSS_BONUS: 10 };
      const baseCoins = this.currentFloor * coinConfig.BASE_RATE;
      const bossCount = Math.floor(this.currentFloor / this.config.BOSS_INTERVAL);
      const bossBonus = bossCount * coinConfig.BOSS_BONUS;
      endlessCoinEarned = baseCoins + bossBonus;
    }
    
    // 只有撤退才发放奖励，失败则清空
    if (victory && (this.totalRewards.gold > 0 || this.totalRewards.tickets > 0 || endlessCoinEarned > 0)) {
      store.addGold(this.totalRewards.gold);
      store.addTickets(this.totalRewards.tickets);
      store.addEndlessCoin(endlessCoinEarned);
      updateResourceUI();
    }
    
    // 保存无尽币数量供结算弹窗使用
    this._lastEndlessCoinEarned = endlessCoinEarned;
    
    // 结束战斗记录
    if (typeof SmartAI !== 'undefined') {
      await SmartAI.endBattleRecord(victory);
    }
    
    // 显示结算
    this.showEndModal(victory);
  },
  
  // 显示胜利弹窗
  showVictoryModal(rewards) {
    const content = `
      <div class="endless-victory">
        <p>🎉 第 ${this.currentFloor} 层通关！</p>
        <div class="endless-rewards">
          <p><b>本层奖励</b></p>
          <p>💰 金币 +${rewards.gold}</p>
          <p>🎫 抽卡券 +${rewards.tickets}</p>
        </div>
        <div class="endless-total-rewards">
          <p><b>累计奖励</b></p>
          <p>💰 金币: ${this.totalRewards.gold}</p>
          <p>🎫 抽卡券: ${this.totalRewards.tickets}</p>
        </div>
        <hr>
        <p>是否继续挑战下一层？</p>
        <p style="color:#ff6b6b;font-size:12px;">⚠️ 失败将失去所有累计奖励</p>
        <div class="endless-buttons">
          <button id="endless-continue" class="btn-primary">继续挑战</button>
          <button id="endless-stop" class="btn-secondary">撤退结算</button>
        </div>
      </div>
    `;
    
    showModal('🏰 无尽模式', content, false);
    
    setTimeout(() => {
      document.getElementById('endless-continue')?.addEventListener('click', () => {
        closeModal();
        this.nextFloor();
      });
      document.getElementById('endless-stop')?.addEventListener('click', async () => {
        closeModal();
        await this.end(true);
      });
    }, 100);
  },
  
  // 显示结算弹窗
  showEndModal(victory) {
    const title = victory ? '🏰 挑战结束' : '💀 挑战失败';
    
    let content = `
      <div class="endless-end">
        ${victory ? '<p>你选择撤退</p>' : '<p>💀 队伍全灭！</p>'}
        <div class="endless-stats">
          <p>🏆 最终到达: 第 <b>${this.currentFloor}</b> 层</p>
          <p>📊 历史最高: 第 <b>${this.maxFloorReached}</b> 层</p>
        </div>
    `;
    
    // 胜利显示获得奖励，失败显示损失奖励
    const endlessCoinEarned = this._lastEndlessCoinEarned || 0;
    if (victory) {
      content += `
        <div class="endless-final-rewards success">
          <p><b>🎁 获得奖励</b></p>
          <p>💰 金币: +${this.totalRewards.gold}</p>
          <p>🎫 抽卡券: +${this.totalRewards.tickets}</p>
          <p>🎖️ 无尽币: +${endlessCoinEarned}</p>
        </div>
      `;
    } else {
      content += `
        <div class="endless-final-rewards fail">
          <p><b>💔 奖励清空</b></p>
          <p>💰 金币: <s>${this.totalRewards.gold}</s> → 0</p>
          <p>🎫 抽卡券: <s>${this.totalRewards.tickets}</s> → 0</p>
          <p>🎖️ 无尽币: 0</p>
        </div>
      `;
    }
    
    // AI学习状态
    if (typeof SmartAI !== 'undefined') {
      content += `<div id="ai-stats-placeholder"><p>正在获取AI状态...</p></div>`;
    }
    
    content += `
        <div class="endless-buttons">
          <button id="endless-close" class="btn-primary">返回</button>
        </div>
      </div>
    `;
    
    showModal(title, content, false);
    
    // 异步获取AI状态
    if (typeof SmartAI !== 'undefined') {
      SmartAI.getStats().then(stats => {
        const placeholder = document.getElementById('ai-stats-placeholder');
        if (placeholder) {
          placeholder.innerHTML = `
            <hr>
            <p>🧠 <b>AI学习进度</b></p>
            <p>战斗记录: ${stats.totalBattles} 场</p>
            <p>训练数据: ${stats.trainingDataCount} 条</p>
            <p>模型状态: ${stats.isModelReady ? '✅ 已就绪' : `⏳ 需要${stats.battlesNeeded}场更多数据`}</p>
          `;
        }
      });
    }
    
    setTimeout(() => {
      document.getElementById('endless-close')?.addEventListener('click', () => {
        closeModal();
        closeBattleField();
      });
    }, 100);
  },
  
  // ==================== 词缀辅助函数 ====================
  
  // 应用光环词缀
  applyAuraAffixes() {
    // 查找有aura词缀的敌人
    const auraEnemies = battle.enemies.filter(e => e.affixes && e.affixes.includes('aura'));
    
    if (auraEnemies.length > 0) {
      const auraData = CONFIG.AFFIX.TYPES.aura;
      const bonusPercent = auraData.value;
      
      // 给所有敌人增加攻击力
      battle.enemies.forEach(enemy => {
        enemy.buffAtkPercent = (enemy.buffAtkPercent || 0) + bonusPercent;
      });
      
      addBattleLog(`✨ 强化光环生效，敌方全体攻击力+${bonusPercent}%！`, 'system');
    }
  },
  
  // 显示敌人词缀信息
  logEnemyAffixes() {
    battle.enemies.forEach(enemy => {
      if (enemy.affixes && enemy.affixes.length > 0) {
        const affixDisplay = this.getAffixDisplay(enemy.affixes);
        const affixNames = enemy.affixes.map(a => CONFIG.AFFIX.TYPES[a]?.name || a).join('、');
        addBattleLog(`${enemy.name} ${affixDisplay} [${affixNames}]`, 'system');
      }
    });
  },
  
  // ==================== 无尽模式敌人AI ====================
  
  // 获取敌人决策（无尽模式专用）
  getEnemyDecision(enemy, aliveAllies, aliveEnemies) {
    // 20层后尝试使用SmartAI
    if (battle.useSmartAI && typeof SmartAI_Battle !== 'undefined') {
      const smartDecision = SmartAI_Battle.getEndlessEnemyDecision(enemy, aliveAllies, aliveEnemies);
      if (smartDecision) {
        return smartDecision;
      }
    }
    
    // 否则使用普通AI
    return getEnemyDecision(enemy, aliveAllies, aliveEnemies);
  },
  
  // ==================== 统计信息 ====================
  
  getStats() {
    return {
      active: this.active,
      currentFloor: this.currentFloor,
      maxFloorReached: this.maxFloorReached,
      totalRewards: this.totalRewards
    };
  },
  
  // 重置进度
  resetProgress() {
    if (confirm('确定要重置无尽模式进度吗？')) {
      this.maxFloorReached = 0;
      this.saveProgress();
      console.log('🔄 无尽模式进度已重置');
    }
  }
};

// ==================== 无尽模式UI入口 ====================

export function showEndlessMode() {
  const stats = EndlessMode.getStats();
  
  let aiStatus = '';
  if (typeof SmartAI !== 'undefined') {
    aiStatus = `<p id="endless-ai-status">正在加载AI状态...</p>`;
  }
  
  const content = `
    <div class="endless-intro">
      <p>挑战无尽的敌人，看看你能走多远！</p>
      <div class="endless-info">
        <p>📊 历史最高: 第 <b>${stats.maxFloorReached}</b> 层</p>
        <p>⚔️ 每10层出现BOSS</p>
        <p>🧠 AI训练完成后，将全程使用深度学习决策</p>
        <p>⚠️ 失败将失去所有累计奖励</p>
      </div>
      ${aiStatus}
      <div class="endless-buttons">
        <button id="start-endless" class="btn-primary">开始挑战</button>
        <button id="close-endless" class="btn-secondary">返回</button>
      </div>
    </div>
  `;
  
  showModal('🏰 无尽模式', content, false);
  
  // 异步获取AI状态
  if (typeof SmartAI !== 'undefined') {
    SmartAI.getStats().then(stats => {
      const el = document.getElementById('endless-ai-status');
      if (el) {
        if (stats.isModelReady) {
          el.innerHTML = '🧠 AI状态: <span style="color:#90ee90">已就绪</span>';
        } else {
          el.innerHTML = `🧠 AI状态: 需要${stats.battlesNeeded}场更多数据`;
        }
      }
    });
  }
  
  setTimeout(() => {
    document.getElementById('start-endless')?.addEventListener('click', () => {
      closeModal();
      EndlessMode.start();
    });
    document.getElementById('close-endless')?.addEventListener('click', () => {
      closeModal();
    });
  }, 100);
}

// ==================== 模块导出 ====================

// 暴露给全局，以便在 main.js 中初始化
export function initEndlessMode() {
  EndlessMode.init();
}

// 已移除自动初始化
window.showEndlessMode = showEndlessMode;
console.log('✅ 无尽模式模块加载完成');
