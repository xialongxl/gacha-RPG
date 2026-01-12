// ==================== 无尽模式系统 ====================

console.log('🔄 无尽模式模块加载中...');

import { CHARACTER_DATA } from '../data.js';
import { state, store, GameDB, battle, resetBattle } from '../state.js';
import { CONFIG, applyPotentialBonus, canBreakthrough, getDisplayRarity } from '../config.js';
import { nextTurn } from '../battle.js';
import { BattleRenderer } from '../battleRenderer.js';
import { showModal, closeModal, updateResourceUI, addBattleLog, closeBattleField } from '../ui.js';
import { playEndlessBGM, playMainBGM } from '../audio.js';
import { SmartAI } from './smartAI.js';
import { SmartAI_Battle } from './smartAI_battle.js';
import { SmartTeamBuilder } from './smartAI_teamBuilder.js';
import { SummonSystem } from '../summon.js';
import { getEnemyDecision } from '../enemyAI.js';

export const EndlessMode = {
  // 状态
  active: false,
  currentFloor: 0,
  maxFloorReached: 0,
  savedProgress: null, // 保存的进度 { floor, buffs, active }
  currentStage: null,
  totalRewards: { gold: 0, tickets: 0 },  // 累计奖励
  currentBuffs: [],  // 当局获得的强化buff
  
  // 扫荡状态
  sweepActive: false,
  sweepMode: null,        // 'fast' 极速扫荡
  sweepCurrentFloor: 0,
  sweepTotalReward: { gold: 0, tickets: 0, endlessCoin: 0 },
  sweepCancelled: false,
  sweepTimer: null,
  
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
  
  // 读取进度
  async loadProgress() {
    try {
      // 优先从 state 存档读取
      if (state.maxFloorReached !== undefined) {
        this.maxFloorReached = state.maxFloorReached || 0;
        
        // 读取新版进度
        if (state.endlessProgress) {
          this.savedProgress = state.endlessProgress;
        } else {
          this.savedProgress = { floor: 0, buffs: [], active: false };
        }

        // 兼容旧版 relayFloor
        if (state.relayFloor) {
          console.log('📦 迁移旧版接力进度:', state.relayFloor);
          this.savedProgress = {
            floor: state.relayFloor,
            buffs: [],
            active: true
          };
          state.relayFloor = null; // 清除旧数据
        }

        console.log('📂 读取无尽进度:', this.savedProgress);
        return;
      }
      
      // 兼容性：从旧的 settings 迁移数据
      const saved = await GameDB.settings.get('endless_progress');
      if (saved && saved.value) {
        this.maxFloorReached = saved.value.maxFloorReached || 0;
        // 旧版迁移
        if (saved.value.relayFloor) {
            this.savedProgress = {
                floor: saved.value.relayFloor,
                buffs: [],
                active: true
            };
        }
        
        // 迁移到 state
        this.saveProgress();
      }
    } catch (e) {
      console.error('读取无尽模式进度失败:', e);
      this.maxFloorReached = state.maxFloorReached || 0;
      this.savedProgress = { floor: 0, buffs: [], active: false };
    }
  },
  
  // 保存进度
  async saveProgress() {
    try {
      state.maxFloorReached = this.maxFloorReached;
      
      // 更新 savedProgress
      if (this.active) {
          // 战斗中，保存当前状态
          this.savedProgress = {
              floor: this.currentFloor,
              buffs: this.currentBuffs,
              active: true
          };
      } else if (!this.savedProgress) {
          this.savedProgress = { floor: 0, buffs: [], active: false };
      }
      
      state.endlessProgress = this.savedProgress;
      store.save();  // 触发自动存档
      
      console.log('💾 无尽进度已保存:', this.savedProgress);
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
    
    // 检查是否有中断的进度
    if (this.savedProgress && this.savedProgress.active && this.savedProgress.floor > 0) {
      this.showContinueConfirmModal();
      return;
    }
    
    // 正常开始
    this.beginEndlessMode(0);
  },
  
  // 开始无尽模式（支持指定起始层）
  beginEndlessMode(startFloor = 0, initialBuffs = []) {
    this.active = true;
    this.currentFloor = startFloor;
    this.totalRewards = { gold: 0, tickets: 0 };  // 重置累计奖励
    this.currentBuffs = initialBuffs || [];  // 恢复或重置强化buff
    
    // 开始记录战斗数据（给SmartAI）
    const team = state.team.filter(c => c !== null);
    if (typeof SmartAI !== 'undefined') {
      const teamData = team.map(name => ({ name, ...CHARACTER_DATA[name] }));
      SmartAI.startBattleRecord(teamData);
    }
    
    // 进入下一层
    this.nextFloor();
  },
  
  // 显示继续挑战确认弹窗
  showContinueConfirmModal() {
    const progress = this.savedProgress;
    const buffCount = progress.buffs ? progress.buffs.length : 0;
    const relayCount = store.getRelayTickets();
    const hasBuffs = buffCount > 0;
    
    let buttonsHtml = '';
    
    if (hasBuffs) {
        // 有保存的Buff，需要选择是否消耗接力券恢复
        const canAfford = relayCount >= 1;
        buttonsHtml = `
            <button id="continue-with-buffs" class="btn-primary" ${canAfford ? '' : 'disabled'}>
                消耗1券恢复强化 (${relayCount}/1)
            </button>
            <button id="continue-without-buffs" class="btn-secondary">
                不恢复强化直接继续
            </button>
            <button id="continue-no" class="btn-danger" style="margin-top:10px;">放弃进度</button>
        `;
    } else {
        // 无Buff，直接继续
        buttonsHtml = `
            <button id="continue-simple" class="btn-primary">继续挑战</button>
            <button id="continue-no" class="btn-secondary">放弃并重新开始</button>
        `;
    }

    const content = `
      <div class="continue-confirm">
        <p style="font-size:18px;">📂 发现中断的挑战进度</p>
        <div class="progress-info" style="margin:15px 0;padding:10px;background:rgba(255,255,255,0.1);border-radius:8px;">
          <p>上次通关: 第 <b style="color:#ffd700;">${progress.floor}</b> 层</p>
          <p>继续挑战: 第 <b style="color:#ffd700;">${progress.floor + 1}</b> 层</p>
          ${hasBuffs ? `<p>保存强化: <b style="color:#90ee90;">${buffCount}</b> 个</p>` : '<p style="color:#aaa;">无保存的强化</p>'}
        </div>
        <div class="endless-buttons" style="margin-top:20px;display:flex;flex-direction:column;gap:10px;">
          ${buttonsHtml}
        </div>
      </div>
    `;
    
    showModal('📂 继续挑战', content, false);
    
    setTimeout(() => {
      // 绑定事件
      if (hasBuffs) {
          document.getElementById('continue-with-buffs')?.addEventListener('click', () => {
              if (store.consumeRelayTicket()) {
                  closeModal();
                  addBattleLog(`🎫 消耗接力券，恢复 ${buffCount} 个强化！`, 'system');
                  this.beginEndlessMode(progress.floor, progress.buffs);
              } else {
                  alert('接力券不足！');
              }
          });
          
          document.getElementById('continue-without-buffs')?.addEventListener('click', () => {
              if (confirm('确定不恢复强化吗？保存的强化将被清空。')) {
                  closeModal();
                  addBattleLog(`⚠️ 未使用接力券，强化已清空`, 'system');
                  this.beginEndlessMode(progress.floor, []); // 空buff
              }
          });
      } else {
          document.getElementById('continue-simple')?.addEventListener('click', () => {
              closeModal();
              this.beginEndlessMode(progress.floor, []);
          });
      }
      
      document.getElementById('continue-no')?.addEventListener('click', () => {
        closeModal();
        this.showRestartConfirmModal();
      });
    }, 100);
  },

  // 放弃进度确认
  showRestartConfirmModal() {
      if (confirm('确定要放弃当前进度吗？层数和强化将全部清空！')) {
          this.savedProgress = { floor: 0, buffs: [], active: false };
          this.saveProgress();
          this.beginEndlessMode(0);
      } else {
          this.showContinueConfirmModal();
      }
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

    // 30层以上启用智能组队 (非BOSS层)
    if (floor >= 30 && !isBossFloor) {
      try {
        const playerTeam = state.team.filter(c => c !== null).map(name => CHARACTER_DATA[name]);
        const smartEnemies = SmartTeamBuilder.generateCounterTeam(floor, playerTeam, this.enemyTemplates);
        if (smartEnemies && smartEnemies.length > 0) {
          console.log(`🧠 第${floor}层: 智能组队系统已激活`);
          return smartEnemies;
        }
      } catch (e) {
        console.error('智能组队生成失败，回退到普通生成:', e);
      }
    }
    
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
      const breakthrough = state.inventory[name]?.breakthrough || null;
      
      // 基础属性（先应用潜能加成）
      let baseHp = applyPotentialBonus(data.hp, potential);
      let baseAtk = applyPotentialBonus(data.atk, potential);
      let baseDef = applyPotentialBonus(data.def, potential);
      let baseSpd = data.spd;
      
      // 应用突破加成
      if (breakthrough === 'stats') {
        // 属性突破：额外+40%基础属性（加法方式，总共+100%）
        const extraBonus = CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS;
        baseHp += Math.floor(data.hp * extraBonus);
        baseAtk += Math.floor(data.atk * extraBonus);
        baseDef += Math.floor(data.def * extraBonus);
      } else if (breakthrough === 'speed') {
        // 速度突破：+40%速度
        baseSpd = Math.floor(baseSpd * (1 + CONFIG.BREAKTHROUGH.SPEED_BONUS));
      }
      
      // 应用Roguelike强化
      const hpBonus = this.getStatBonus('hp');
      const atkBonus = this.getStatBonus('atk');
      const defBonus = this.getStatBonus('def');
      const spdBonus = this.getStatBonus('spd');
      
      // 调试日志：显示强化应用情况
      if (hpBonus.bonusPercent > 0 || atkBonus.bonusPercent > 0 || defBonus.bonusPercent > 0 || spdBonus.bonus > 0) {
        console.log(`🎁 Roguelike强化应用到 ${name}:`, {
          hp: `+${Math.round(hpBonus.bonusPercent * 100)}%`,
          atk: `+${Math.round(atkBonus.bonusPercent * 100)}%`,
          def: `+${Math.round(defBonus.bonusPercent * 100)}%`,
          spd: `+${spdBonus.bonus}`
        });
      }
      
      baseHp = Math.floor(baseHp * (1 + hpBonus.bonusPercent));
      baseAtk = Math.floor(baseAtk * (1 + atkBonus.bonusPercent));
      baseDef = Math.floor(baseDef * (1 + defBonus.bonusPercent));
      baseSpd = baseSpd + spdBonus.bonus;
      
      // 获取特殊效果加成
      const critBonus = this.getSpecialBonus('crit');
      const vampBonus = this.getSpecialBonus('vamp');
      const hasExtraLife = this.hasSpecialEffect('extraLife');
      const regenPerTurn = this.getSpecialBonus('regenPerTurn');
      
      // 调试日志：显示特殊效果
      if (critBonus > 0 || vampBonus > 0 || hasExtraLife || regenPerTurn > 0) {
        console.log(`🎁 Roguelike特殊效果应用到 ${name}:`, {
          crit: `${Math.round(critBonus * 100)}%`,
          vamp: `${Math.round(vampBonus * 100)}%`,
          extraLife: hasExtraLife,
          regenPerTurn: `${Math.round(regenPerTurn * 100)}%`
        });
      }
      
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
        energy: this.getInitialEnergy(),  // 应用Roguelike能量强化
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
        critBonus: critBonus,
        vampBonus: vampBonus,
        hasExtraLife: hasExtraLife,
        // 每回合回血（备用医疗装置）
        healPerTurn: regenPerTurn
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
    
    // 应用战斗开始时的强化效果（护盾等）
    this.applyBattleStartUpgrades();
    
    // 初始化召唤系统
    if (typeof SummonSystem !== 'undefined') {
      SummonSystem.init(battle.allies);
    }
    
    // 显示战斗界面
    document.getElementById('stage-panel').style.display = 'none';
    document.getElementById('battle-field').classList.add('active');
    
    // 播放无尽模式BGM（使用歌单）
    playEndlessBGM();
    
    // 显示层数信息
    addBattleLog(`${stage.name}`, 'system');
    if (stage.useSmartAI) {
      addBattleLog('🧠 深度学习AI已激活！', 'system');
    }
    addBattleLog('⚔️ 战斗开始！', 'system');
    
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
    
    // 构建强化buff显示
    const buffsDisplay = this.getBuffsDisplay();
    const buffsHtml = buffsDisplay !== '无' ?
      `<span class="floor-buffs" title="${this.getBuffsTooltip()}">🎁${buffsDisplay}</span>` : '';
    
    div.innerHTML = `
      <div class="endless-floor-info">
        <span class="floor-number">第 ${this.currentFloor} 层</span>
        <span class="floor-record">最高: ${this.maxFloorReached}</span>
        ${battle.useSmartAI ? '<span class="ai-badge">🧠 SmartAI</span>' : ''}
        ${buffsHtml}
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

    // 记录智能组队战斗结果 (30层以上)
    if (this.currentFloor >= 30) {
      const playerTeam = battle.allies || [];
      const enemyTeam = battle.enemies || [];
      // 传入原始数据结构可能更稳妥，这里先传battle对象，SmartTeamBuilder那边需要适配一下
      // 为了保持一致性，我们重新构造一下简单对象
      // 但注意：recordMatchResult 需要的是特征分析，用 battle.allies 里的数据（包含 stats）也是可以的，只要 analyzePlayerTeam 能处理
      // 检查 analyzePlayerTeam: 它需要 char.class, char.skills, char.summoner, char.hp/atk/def/spd
      // battle.allies 里的对象有这些属性吗？
      // battle.allies 对象结构在 startBattle 中定义：
      //   name, rarity, hp, atk, def, spd, skills, isSummoner...
      //   它缺少 'class' 属性！
      //   所以我们需要回溯到 CHARACTER_DATA
      
      const playerTeamData = battle.allies.filter(a => !a.isSummon).map(a => {
        const original = CHARACTER_DATA[a.name];
        return original || a; // 优先用原始数据获取 class，如果找不到（可能是召唤物）则用 a
      });
      
      SmartTeamBuilder.recordMatchResult(playerTeamData, enemyTeam, true);
    }
    
    const rewards = this.currentStage.rewards;
    
    // 获取奖励加成倍率
    const rewardBonus = this.getRewardBonus();
    const rewardMultiplier = 1 + rewardBonus;
    
    // 累加奖励（应用奖励强化加成）
    const bonusGold = Math.floor(rewards.gold * rewardMultiplier);
    const bonusTickets = Math.floor(rewards.tickets * rewardMultiplier);
    this.totalRewards.gold += bonusGold;
    this.totalRewards.tickets += bonusTickets;
    
    // 如果有奖励加成，显示日志
    if (rewardBonus > 0) {
      console.log(`💰 奖励强化生效！金币: ${rewards.gold} → ${bonusGold}, 抽卡券: ${rewards.tickets} → ${bonusTickets}`);
    }
    
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
    
    // 获取奖励加成信息
    const rewardBonus = this.getRewardBonus();
    const rewardMultiplier = 1 + rewardBonus;
    const bonusGold = Math.floor(rewards.gold * rewardMultiplier);
    const bonusTickets = Math.floor(rewards.tickets * rewardMultiplier);
    const bonusPercent = Math.round(rewardBonus * 100);
    
    // 生成奖励显示HTML
    let rewardsHtml;
    if (rewardBonus > 0) {
      const goldExtra = bonusGold - rewards.gold;
      const ticketsExtra = bonusTickets - rewards.tickets;
      rewardsHtml = `
        <span>💰 ${rewards.gold}<span style="color:#90ee90;">(+${goldExtra})</span>=${bonusGold} <span style="color:#90ee90;">(+${bonusPercent}%)</span></span>
        <span>🎫 ${rewards.tickets}<span style="color:#90ee90;">(+${ticketsExtra})</span>=${bonusTickets} <span style="color:#90ee90;">(+${bonusPercent}%)</span></span>
      `;
    } else {
      rewardsHtml = `
        <span>💰 +${rewards.gold}</span>
        <span>🎫 +${rewards.tickets}</span>
      `;
    }
    
    const content = `
      <div class="upgrade-modal">
        <p>🎉 第 ${this.currentFloor} 层通关！</p>
        <div class="upgrade-rewards">
          ${rewardsHtml}
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
    return this.currentBuffs.map(b => b.icon).join('');
  },
  
  // 获取buff详细提示
  getBuffsTooltip() {
    if (this.currentBuffs.length === 0) return '';
    return this.currentBuffs.map(b => `${b.icon} ${b.name}: ${b.desc}`).join('\n');
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
  
  // 获取奖励加成倍率（奖励强化，可叠加）
  getRewardBonus() {
    let bonus = 0;
    this.currentBuffs.forEach(buff => {
      if (buff.type === 'special' && buff.effect === 'rewardUp') {
        bonus += buff.value || 0;
      }
    });
    return bonus;  // 返回累计加成值，如0.5表示+50%
  },
  
  // 检查是否有特殊效果
  hasSpecialEffect(effect) {
    return this.currentBuffs.some(buff => buff.type === 'special' && buff.effect === effect);
  },
  
  // 应用战斗开始时的强化效果
  applyBattleStartUpgrades() {
    this.currentBuffs.forEach(buff => {
      // battle_start 类型：护盾
      if (buff.type === 'battle_start' && buff.effect === 'shield') {
        battle.allies.forEach(ally => {
          const shieldAmount = Math.floor(ally.maxHp * buff.value);
          ally.tempShield = (ally.tempShield || 0) + shieldAmount;
        });
        addBattleLog(`🔰 战斗护盾生效！全队获得${Math.floor(buff.value * 100)}%HP护盾！`, 'system');
      }
    });
    
    // 如果有每回合回血强化，记录日志
    const regenBonus = this.getSpecialBonus('regenPerTurn');
    if (regenBonus > 0) {
      addBattleLog(`💚 备用医疗装置生效！全队每回合回复${Math.floor(regenBonus * 100)}%HP！`, 'system');
    }
  },
  
  // 获取初始能量（包含Roguelike能量强化）
  getInitialEnergy() {
    let energy = 0;
    this.currentBuffs.forEach(buff => {
      if (buff.type === 'instant' && buff.effect === 'energy') {
        energy += buff.value || 0;
      }
    });
    console.log(`🎁 初始能量: ${energy}（来自能量强化）`);
    return Math.min(100, energy);
  },
  
  // 失败
  async onDefeat() {
    if (!this.active) return;

    // 记录智能组队战斗结果 (30层以上)
    if (this.currentFloor >= 30) {
      const playerTeamData = battle.allies.filter(a => !a.isSummon).map(a => CHARACTER_DATA[a.name] || a);
      const enemyTeam = battle.enemies || [];
      SmartTeamBuilder.recordMatchResult(playerTeamData, enemyTeam, false);
    }
    
    // 检查是否有复活券
    const reviveCount = store.getReviveTickets();
    if (reviveCount > 0) {
      this.showReviveConfirmModal();
      return;
    }
    
    await this.end(false);
  },
  
  // 显示复活券使用提示弹窗（第一步：询问是否使用）
  showReviveConfirmModal() {
    const reviveCount = store.getReviveTickets();
    
    const content = `
      <div class="revive-confirm">
        <p style="font-size:18px;color:#ff6b6b;">💀 队伍全灭！</p>
        <div class="revive-info">
          <p>当前层数: 第 <b>${this.currentFloor}</b> 层</p>
          <p>累计奖励: 💰${this.totalRewards.gold} 🎫${this.totalRewards.tickets}</p>
        </div>
        <hr>
        <div class="revive-option">
          <p style="font-size:16px;color:#90ee90;">🎟️ 你有 <b>${reviveCount}</b> 张复活券</p>
          <p>使用复活券可以:</p>
          <ul style="text-align:left;margin:10px 0;padding-left:20px;">
            <li>重新挑战当前层</li>
            <li>全队满血满状态</li>
            <li>保留累计奖励</li>
          </ul>
        </div>
        <div class="endless-buttons" style="margin-top:20px;">
          <button id="revive-use" class="btn-primary">使用复活券</button>
          <button id="revive-decline" class="btn-danger">放弃挑战</button>
        </div>
      </div>
    `;
    
    showModal('🎟️ 复活机会', content, false);
    
    setTimeout(() => {
      document.getElementById('revive-use')?.addEventListener('click', () => {
        closeModal();
        // 进入二次确认
        this.showReviveConfirm2Modal();
      });
      document.getElementById('revive-decline')?.addEventListener('click', async () => {
        closeModal();
        await this.end(false);
      });
    }, 100);
  },
  
  // 显示复活券使用二次确认弹窗（第二步：确认使用）
  showReviveConfirm2Modal() {
    const reviveCount = store.getReviveTickets();
    
    const content = `
      <div class="revive-confirm">
        <p style="font-size:18px;color:#ffd700;">⚠️ 确定要使用复活券吗？</p>
        <div class="revive-info">
          <p>使用后将消耗 <b>1</b> 张复活券</p>
          <p>剩余复活券: <b>${reviveCount - 1}</b> 张</p>
        </div>
        <hr>
        <p style="color:#90ee90;">重新挑战第 <b>${this.currentFloor}</b> 层</p>
        <div class="endless-buttons" style="margin-top:20px;">
          <button id="revive-confirm" class="btn-primary">确认使用</button>
          <button id="revive-cancel" class="btn-secondary">取消</button>
        </div>
      </div>
    `;
    
    showModal('🎟️ 确认使用', content, false);
    
    setTimeout(() => {
      document.getElementById('revive-confirm')?.addEventListener('click', async () => {
        closeModal();
        await this.useReviveTicket();
      });
      document.getElementById('revive-cancel')?.addEventListener('click', () => {
        closeModal();
        // 返回第一个弹窗
        this.showReviveConfirmModal();
      });
    }, 100);
  },
  
  // 使用复活券（重新挑战当前层）
  async useReviveTicket() {
    // 消耗复活券
    const success = await store.consumeReviveTicket();
    if (!success) {
      addBattleLog('❌ 复活券使用失败！', 'system');
      await this.end(false);
      return;
    }
    
    addBattleLog(`🎟️ 使用复活券！重新挑战第 ${this.currentFloor} 层！`, 'system');
    
    // 重新开始当前层战斗（重新生成敌人，全队满血满状态）
    this.startBattle(this.currentStage);
  },
  
  // 结束无尽模式
  async end(victory) {
    this.active = false;
    
    // 如果是失败，清空保存的进度（只有撤退才保留）
    if (!victory) {
        this.savedProgress = { floor: 0, buffs: [], active: false };
        this.saveProgress();
    }
    
    // 切换回主界面BGM（使用歌单）
    playMainBGM();
    
    // 清理召唤系统
    if (typeof SummonSystem !== 'undefined') {
      SummonSystem.clear();
    }
    
    // 计算无尽币
    let endlessCoinEarned = 0;
    if (victory) {
      // 检查是否是局内撤退（战斗中撤退，当前层未通关）
      const isFleeInBattle = this._fleeInBattle === true;
      this._fleeInBattle = false;  // 重置标志
      
      // 局内撤退：按已通关层数计算（currentFloor - 1）
      // 通关后撤退：按当前层数计算
      const completedFloor = isFleeInBattle ? (this.currentFloor - 1) : this.currentFloor;
      
      const coinConfig = CONFIG.ENDLESS_COIN || { BASE_RATE: 2, BOSS_BONUS: 10 };
      const baseCoins = completedFloor * coinConfig.BASE_RATE;
      const bossCount = Math.floor(completedFloor / this.config.BOSS_INTERVAL);
      const bossBonus = bossCount * coinConfig.BOSS_BONUS;
      let rawEndlessCoin = Math.max(0, baseCoins + bossBonus);
      
      // 应用奖励强化加成
      const rewardBonus = this.getRewardBonus();
      const rewardMultiplier = 1 + rewardBonus;
      endlessCoinEarned = Math.floor(rawEndlessCoin * rewardMultiplier);
      
      if (rewardBonus > 0) {
        console.log(`🎖️ 奖励强化生效！无尽币: ${rawEndlessCoin} → ${endlessCoinEarned}`);
      }
      
      // 保存撤退类型供结算弹窗使用
      this._wasFleeInBattle = isFleeInBattle;
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
    // 获取奖励加成信息
    const rewardBonus = this.getRewardBonus();
    const rewardMultiplier = 1 + rewardBonus;
    const bonusGold = Math.floor(rewards.gold * rewardMultiplier);
    const bonusTickets = Math.floor(rewards.tickets * rewardMultiplier);
    const bonusPercent = Math.round(rewardBonus * 100);
    
    // 生成本层奖励显示HTML
    let floorRewardsHtml;
    if (rewardBonus > 0) {
      const goldExtra = bonusGold - rewards.gold;
      const ticketsExtra = bonusTickets - rewards.tickets;
      floorRewardsHtml = `
        <p>💰 金币: ${rewards.gold}<span style="color:#90ee90;">(+${goldExtra})</span> = ${bonusGold} <span style="color:#90ee90;">(+${bonusPercent}%)</span></p>
        <p>🎫 抽卡券: ${rewards.tickets}<span style="color:#90ee90;">(+${ticketsExtra})</span> = ${bonusTickets} <span style="color:#90ee90;">(+${bonusPercent}%)</span></p>
      `;
    } else {
      floorRewardsHtml = `
        <p>💰 金币 +${rewards.gold}</p>
        <p>🎫 抽卡券 +${rewards.tickets}</p>
      `;
    }
    
    // 生成累计奖励显示HTML（显示总加成）
    let totalRewardsHtml;
    if (rewardBonus > 0) {
      totalRewardsHtml = `
        <p>💰 金币: ${this.totalRewards.gold} <span style="color:#90ee90;">(含+${bonusPercent}%加成)</span></p>
        <p>🎫 抽卡券: ${this.totalRewards.tickets} <span style="color:#90ee90;">(含+${bonusPercent}%加成)</span></p>
      `;
    } else {
      totalRewardsHtml = `
        <p>💰 金币: ${this.totalRewards.gold}</p>
        <p>🎫 抽卡券: ${this.totalRewards.tickets}</p>
      `;
    }
    
    const content = `
      <div class="endless-victory">
        <p>🎉 第 ${this.currentFloor} 层通关！</p>
        <div class="endless-rewards">
          <p><b>本层奖励</b></p>
          ${floorRewardsHtml}
        </div>
        <div class="endless-total-rewards">
          <p><b>累计奖励</b></p>
          ${totalRewardsHtml}
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
      document.getElementById('endless-stop')?.addEventListener('click', () => {
        // 二次确认撤退
        this.showRetreatConfirmModal();
      });
    }, 100);
  },
  
  // 显示撤退二次确认弹窗（支持接力券记录层数）
  showRetreatConfirmModal() {
    // 计算预计获得的无尽币
    const coinConfig = CONFIG.ENDLESS_COIN || { BASE_RATE: 2, BOSS_BONUS: 10 };
    const baseCoins = this.currentFloor * coinConfig.BASE_RATE;
    const bossCount = Math.floor(this.currentFloor / this.config.BOSS_INTERVAL);
    const bossBonus = bossCount * coinConfig.BOSS_BONUS;
    const estimatedEndlessCoin = baseCoins + bossBonus;
    
    // 检查是否有接力券，有则显示记录选项
    const relayCount = store.getRelayTickets();
    let relaySection = '';
    
    // 需要现在有接力券才可以保存buff，下次恢复需要消耗接力券恢复buff
    if (relayCount > 0 && this.currentBuffs.length > 0) {
      relaySection = `
        <div class="relay-section" style="margin:15px 0;padding:12px;background:rgba(100,200,100,0.15);border-radius:8px;border:1px solid rgba(100,200,100,0.3);">
          <p style="margin-bottom:8px;">🎫 你有 <b style="color:#ffd700;">${relayCount}</b> 张接力券</p>
          <p style="font-size:13px;color:#90ee90;">撤退将保存层数，下次从第 <b>${this.currentFloor + 1}</b> 层继续</p>
          <p style="font-size:11px;color:#888;">（勾选下方选项可记录当前强化，下次挑战需消耗1张接力券恢复）</p>
          <label class="relay-checkbox-label" style="display:flex;align-items:center;margin-top:10px;cursor:pointer;justify-content: center;">
            <input type="checkbox" id="record-relay-checkbox" style="margin-right:8px;width:18px;height:18px;">
            <span>保存当前强化Buff</span>
          </label>
        </div>
      `;
    } else if (relayCount > 0) {
        relaySection = `
        <div class="relay-section" style="margin:15px 0;padding:12px;background:rgba(100,200,100,0.15);border-radius:8px;border:1px solid rgba(100,200,100,0.3);">
          <p style="margin-bottom:8px;">🎫 你有 <b style="color:#ffd700;">${relayCount}</b> 张接力券</p>
          <p style="font-size:13px;color:#90ee90;">撤退将保存层数，下次从第 <b>${this.currentFloor + 1}</b> 层继续</p>
          <p style="font-size:11px;color:#aaa;">(当前无强化Buff，无需保存)</p>
        </div>
      `;
    } else if (this.currentBuffs.length > 0) {
        relaySection = `
        <div class="relay-section" style="margin:15px 0;padding:12px;background:rgba(100,200,100,0.15);border-radius:8px;border:1px solid rgba(100,200,100,0.3);">
          <p style="font-size:13px;color:#90ee90;">撤退将保存层数，下次从第 <b>${this.currentFloor + 1}</b> 层继续</p>
          <p style="font-size:11px;color:#aaa;">(当前有强化Buff，但无接力券，无法保存)</p>
        </div>
      `;
    } else {
        relaySection = `
        <div class="relay-section" style="margin:15px 0;padding:12px;background:rgba(100,200,100,0.15);border-radius:8px;border:1px solid rgba(100,200,100,0.3);">
          <p style="font-size:13px;color:#90ee90;">撤退将保存层数，下次从第 <b>${this.currentFloor + 1}</b> 层继续</p>
          <p style="font-size:11px;color:#aaa;">(当前无强化Buff，无需保存；但同时也没有接力券，后续将无法保存)</p>
        </div>
      `;      
    }
    
    const content = `
      <div class="retreat-confirm">
        <p style="font-size:18px;color:#ff6b6b;">⚠️ 确定要撤退吗？</p>
        <div class="retreat-info">
          <p>当前层数: 第 <b>${this.currentFloor}</b> 层</p>
          <p>撤退后将获得以下奖励:</p>
          <div class="retreat-rewards">
            <p>💰 金币: ${this.totalRewards.gold}</p>
            <p>🎫 抽卡券: ${this.totalRewards.tickets}</p>
            <p>🎖️ 无尽币: ${estimatedEndlessCoin}</p>
          </div>
        </div>
        <hr style="border-color:rgba(255,255,255,0.2);margin:15px 0;">
        ${relaySection}
        <div class="endless-buttons" style="margin-top:20px;">
          <button id="retreat-confirm" class="btn-danger">确认撤退</button>
          <button id="retreat-cancel" class="btn-secondary">继续挑战</button>
        </div>
      </div>
    `;
    
    showModal('🚪 撤退确认', content, false);
    
    setTimeout(() => {
      document.getElementById('retreat-confirm')?.addEventListener('click', async () => {
        // 准备保存的数据
        this.savedProgress = {
            floor: this.currentFloor,
            buffs: [], // 默认清空Buff
            active: true
        };

        const recordCheckbox = document.getElementById('record-relay-checkbox');
        if (recordCheckbox && recordCheckbox.checked) {
          // 保存Buff（不消耗接力券）
          this.savedProgress.buffs = [...this.currentBuffs];
          addBattleLog(`💾 进度与强化已保存！`, 'system');
        } else {
          addBattleLog(`💾 进度已保存（强化未保存）`, 'system');
        }

        // 保存进度 (手动保存，避免被 saveProgress 覆盖导致勾选无效)
        state.maxFloorReached = this.maxFloorReached;
        state.endlessProgress = this.savedProgress;
        await store.save();
        
        console.log('💾 无尽进度已保存(撤退):', this.savedProgress);

        closeModal();
        await this.end(true);
      });
      document.getElementById('retreat-cancel')?.addEventListener('click', () => {
        closeModal();
        // 重新显示胜利弹窗
        const rewards = this.currentStage.rewards;
        this.showVictoryModal(rewards);
      });
    }, 100);
  },
  
  // 显示结算弹窗
  showEndModal(victory) {
    const title = victory ? '🏰 挑战结束' : '💀 挑战失败';
    
    // 获取奖励加成信息
    const rewardBonus = this.getRewardBonus();
    const bonusPercent = Math.round(rewardBonus * 100);
    
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
      // 生成带加成明细的奖励显示
      let rewardsHtml;
      if (rewardBonus > 0) {
        rewardsHtml = `
          <p>💰 金币: +${this.totalRewards.gold} <span style="color:#90ee90;">(含+${bonusPercent}%加成)</span></p>
          <p>🎫 抽卡券: +${this.totalRewards.tickets} <span style="color:#90ee90;">(含+${bonusPercent}%加成)</span></p>
          <p>🎖️ 无尽币: +${endlessCoinEarned} <span style="color:#90ee90;">(含+${bonusPercent}%加成)</span></p>
        `;
      } else {
        rewardsHtml = `
          <p>💰 金币: +${this.totalRewards.gold}</p>
          <p>🎫 抽卡券: +${this.totalRewards.tickets}</p>
          <p>🎖️ 无尽币: +${endlessCoinEarned}</p>
        `;
      }
      content += `
        <div class="endless-final-rewards success">
          <p><b>🎁 获得奖励</b></p>
          ${rewardsHtml}
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
  },
  
  // ==================== 扫荡系统 ====================
  
  /**
   * 检查是否可以扫荡
   * @returns {Object} { canSweep: boolean, reason: string, maxFloor: number }
   */
  canSweep() {
    // 检查每日次数
    const remaining = store.getSweepRemaining();
    
    if (remaining <= 0) {
      return { canSweep: false, reason: '今日扫荡次数已用完', maxFloor: 0 };
    }
    
    if (this.maxFloorReached < 1) {
      return { canSweep: false, reason: '请先手动挑战无尽模式', maxFloor: 0 };
    }
    
    if (this.active) {
      return { canSweep: false, reason: '正在进行无尽模式挑战', maxFloor: 0 };
    }
    
    if (this.sweepActive) {
      return { canSweep: false, reason: '正在扫荡中', maxFloor: 0 };
    }
    
    return { canSweep: true, maxFloor: this.maxFloorReached };
  },
  
  /**
   * 计算单层扫荡奖励
   * @param {number} floor - 层数
   * @returns {Object} { gold, tickets, endlessCoin }
   */
  calculateSweepReward(floor) {
    const isBossFloor = floor % this.config.BOSS_INTERVAL === 0;
    const scale = 1 + (floor - 1) * this.config.REWARD_SCALE_PER_FLOOR;
    const rewardRate = CONFIG.SWEEP?.fast?.rewardRate || 0.5;
    
    // 金币奖励
    let gold = Math.floor(this.config.BASE_GOLD * scale);
    if (isBossFloor) gold = Math.floor(gold * 3);
    gold = Math.floor(gold * rewardRate);
    
    // 抽卡券奖励
    let tickets = Math.floor(this.config.BASE_TICKETS + floor / 5);
    if (isBossFloor) tickets = Math.floor(tickets * 2);
    tickets = Math.floor(tickets * rewardRate);
    
    // 无尽币奖励
    const coinConfig = CONFIG.ENDLESS_COIN || { BASE_RATE: 2, BOSS_BONUS: 10 };
    let endlessCoin = coinConfig.BASE_RATE;
    if (isBossFloor) endlessCoin += coinConfig.BOSS_BONUS;
    endlessCoin = Math.floor(endlessCoin * rewardRate);
    
    return { gold, tickets, endlessCoin };
  },
  
  /**
   * 计算扫荡总奖励预估
   * @param {number} maxFloor - 最高层数
   * @returns {Object} { gold, tickets, endlessCoin, totalTime }
   */
  calculateTotalSweepReward(maxFloor) {
    let totalGold = 0;
    let totalTickets = 0;
    let totalEndlessCoin = 0;
    
    for (let floor = 1; floor <= maxFloor; floor++) {
      const reward = this.calculateSweepReward(floor);
      totalGold += reward.gold;
      totalTickets += reward.tickets;
      totalEndlessCoin += reward.endlessCoin;
    }
    
    const timePerFloor = CONFIG.SWEEP?.fast?.timePerFloor || 1;
    const totalTime = maxFloor * timePerFloor;
    
    return { gold: totalGold, tickets: totalTickets, endlessCoin: totalEndlessCoin, totalTime };
  },
  
  /**
   * 开始扫荡
   * @param {string} mode - 扫荡模式 'fast'
   */
  async startSweep(mode = 'fast') {
    const check = this.canSweep();
    if (!check.canSweep) {
      alert(check.reason);
      return;
    }
    
    // 初始化扫荡状态
    this.sweepActive = true;
    this.sweepMode = mode;
    this.sweepCurrentFloor = 0;
    this.sweepTotalReward = { gold: 0, tickets: 0, endlessCoin: 0 };
    this.sweepCancelled = false;
    
    const maxFloor = this.maxFloorReached;
    const timePerFloor = CONFIG.SWEEP?.[mode]?.timePerFloor || 1;
    
    console.log(`🧹 开始扫荡: 模式=${mode}, 目标层=${maxFloor}, 每层${timePerFloor}秒`);
    
    closeModal();
    this.showSweepProgress();
    
    // 开始扫荡循环
    for (let floor = 1; floor <= maxFloor; floor++) {
      if (this.sweepCancelled) {
        console.log(`🧹 扫荡被取消于第 ${floor} 层`);
        break;
      }
      
      this.sweepCurrentFloor = floor;
      
      // 计算该层奖励
      const reward = this.calculateSweepReward(floor);
      this.sweepTotalReward.gold += reward.gold;
      this.sweepTotalReward.tickets += reward.tickets;
      this.sweepTotalReward.endlessCoin += reward.endlessCoin;
      
      // 更新进度UI
      this.updateSweepProgress(floor, maxFloor);
      
      // 等待
      await this.sleep(timePerFloor * 1000);
    }
    
    // 扫荡结束
    this.finishSweep();
  },
  
  /**
   * 取消扫荡
   */
  cancelSweep() {
    if (!this.sweepActive) return;
    
    this.sweepCancelled = true;
    console.log('🧹 用户取消扫荡');
  },
  
  /**
   * 完成扫荡
   */
  finishSweep() {
    if (!this.sweepActive) return;
    
    // 发放奖励
    if (this.sweepTotalReward.gold > 0) {
      store.addGold(this.sweepTotalReward.gold);
    }
    if (this.sweepTotalReward.tickets > 0) {
      store.addTickets(this.sweepTotalReward.tickets);
    }
    if (this.sweepTotalReward.endlessCoin > 0) {
      store.addEndlessCoin(this.sweepTotalReward.endlessCoin);
    }
    
    // 扣除扫荡次数
    store.consumeSweepCount();
    
    // 更新UI
    updateResourceUI();
    
    const floorsSwept = this.sweepCurrentFloor;
    const wasCancelled = this.sweepCancelled;
    
    // 重置扫荡状态
    this.sweepActive = false;
    this.sweepMode = null;
    this.sweepCancelled = false;
    
    console.log(`🧹 扫荡完成: 层数=${floorsSwept}, 取消=${wasCancelled}`);
    
    // 显示完成界面
    this.showSweepComplete(floorsSwept, wasCancelled);
  },
  
  /**
   * 显示扫荡面板
   */
  showSweepPanel() {
    const check = this.canSweep();
    const maxFloor = this.maxFloorReached;
    const remaining = store.getSweepRemaining();
    const maxCount = store.getSweepMaxCount();
    const buyPrice = CONFIG.SWEEP?.buyPrice || 500;
    const currentEndlessCoin = state.endlessCoin || 0;
    
    // 计算预估奖励
    const estimated = this.calculateTotalSweepReward(maxFloor);
    const estimatedTimeStr = this.formatTime(estimated.totalTime);
    
    let content = `
      <div class="sweep-panel">
        <div class="sweep-info">
          <p>📊 历史最高层: <b style="color:#ffd700;">${maxFloor}</b> 层</p>
          <p>🎫 今日剩余次数: <b style="color:${remaining > 0 ? '#90ee90' : '#ff6b6b'};">${remaining}/${maxCount}</b></p>
        </div>
        
        <hr style="border-color:rgba(255,255,255,0.2);margin:15px 0;">
        
        <div class="sweep-mode-section">
          <h4 style="margin-bottom:10px;">⚡ 极速扫荡</h4>
          <div class="sweep-mode-info">
            <p>• 每层 1 秒</p>
            <p>• 奖励效率 50%</p>
            <p>• 预计时间: <b>${estimatedTimeStr}</b></p>
          </div>
          <div class="sweep-estimated-rewards">
            <p>预计奖励:</p>
            <p>💰 金币: <span style="color:#ffd700;">${estimated.gold.toLocaleString()}</span></p>
            <p>🎫 抽卡券: <span style="color:#90ee90;">${estimated.tickets}</span></p>
            <p>🎖️ 无尽币: <span style="color:#87ceeb;">${estimated.endlessCoin}</span></p>
          </div>
        </div>
    `;
    
    // 如果次数用完，显示购买选项
    if (remaining <= 0) {
      const canBuy = currentEndlessCoin >= buyPrice;
      content += `
        <hr style="border-color:rgba(255,255,255,0.2);margin:15px 0;">
        <div class="sweep-buy-section">
          <p style="color:#ff6b6b;">今日免费次数已用完</p>
          <p>🎖️ 当前无尽币: <b>${currentEndlessCoin}</b></p>
          <button id="sweep-buy" class="btn-secondary" ${canBuy ? '' : 'disabled'}>
            购买扫荡次数 (${buyPrice} 无尽币)
          </button>
          ${canBuy ? '' : '<p style="color:#888;font-size:12px;">无尽币不足</p>'}
        </div>
      `;
    }
    
    content += `
        <div class="sweep-buttons" style="margin-top:20px;">
          <button id="sweep-start" class="btn-primary" ${check.canSweep ? '' : 'disabled'}>
            开始扫荡
          </button>
          <button id="sweep-cancel" class="btn-secondary">返回</button>
        </div>
        ${!check.canSweep && check.reason ? `<p style="color:#ff6b6b;font-size:12px;margin-top:10px;">${check.reason}</p>` : ''}
      </div>
    `;
    
    showModal('🧹 无尽扫荡', content, false);
    
    setTimeout(() => {
      document.getElementById('sweep-start')?.addEventListener('click', () => {
        this.startSweep('fast');
      });
      document.getElementById('sweep-cancel')?.addEventListener('click', () => {
        closeModal();
      });
      document.getElementById('sweep-buy')?.addEventListener('click', () => {
        this.buySweepCount();
      });
    }, 100);
  },
  
  /**
   * 显示扫荡进度
   */
  showSweepProgress() {
    const maxFloor = this.maxFloorReached;
    
    const content = `
      <div class="sweep-progress-panel">
        <p style="font-size:18px;">⚡ 扫荡中...</p>
        <div class="sweep-progress-info">
          <p>当前层数: <span id="sweep-current-floor">0</span> / ${maxFloor}</p>
          <div class="sweep-progress-bar-container">
            <div id="sweep-progress-bar" class="sweep-progress-bar" style="width:0%"></div>
          </div>
          <p id="sweep-progress-percent">0%</p>
        </div>
        <div class="sweep-current-rewards">
          <p>已获得奖励:</p>
          <p>💰 金币: <span id="sweep-reward-gold">0</span></p>
          <p>🎫 抽卡券: <span id="sweep-reward-tickets">0</span></p>
          <p>🎖️ 无尽币: <span id="sweep-reward-coin">0</span></p>
        </div>
        <p id="sweep-remaining-time" style="color:#888;font-size:13px;">剩余时间: 计算中...</p>
        <div class="sweep-buttons" style="margin-top:20px;">
          <button id="sweep-cancel-btn" class="btn-danger">取消扫荡</button>
        </div>
        <p style="color:#888;font-size:11px;margin-top:10px;">取消后将结算已扫荡层数的奖励</p>
      </div>
    `;
    
    showModal('🧹 扫荡进度', content, false);
    
    setTimeout(() => {
      document.getElementById('sweep-cancel-btn')?.addEventListener('click', () => {
        this.cancelSweep();
      });
    }, 100);
  },
  
  /**
   * 更新扫荡进度UI
   */
  updateSweepProgress(currentFloor, maxFloor) {
    const percent = Math.floor((currentFloor / maxFloor) * 100);
    const timePerFloor = CONFIG.SWEEP?.fast?.timePerFloor || 1;
    const remainingTime = (maxFloor - currentFloor) * timePerFloor;
    
    const floorEl = document.getElementById('sweep-current-floor');
    const barEl = document.getElementById('sweep-progress-bar');
    const percentEl = document.getElementById('sweep-progress-percent');
    const goldEl = document.getElementById('sweep-reward-gold');
    const ticketsEl = document.getElementById('sweep-reward-tickets');
    const coinEl = document.getElementById('sweep-reward-coin');
    const timeEl = document.getElementById('sweep-remaining-time');
    
    if (floorEl) floorEl.textContent = currentFloor;
    if (barEl) barEl.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (goldEl) goldEl.textContent = this.sweepTotalReward.gold.toLocaleString();
    if (ticketsEl) ticketsEl.textContent = this.sweepTotalReward.tickets;
    if (coinEl) coinEl.textContent = this.sweepTotalReward.endlessCoin;
    if (timeEl) timeEl.textContent = `剩余时间: ${this.formatTime(remainingTime)}`;
  },
  
  /**
   * 显示扫荡完成界面
   */
  showSweepComplete(floorsSwept, wasCancelled) {
    const remaining = store.getSweepRemaining();
    const maxCount = store.getSweepMaxCount();
    
    const content = `
      <div class="sweep-complete-panel">
        <p style="font-size:20px;">${wasCancelled ? '⚠️ 扫荡已取消' : '✅ 扫荡完成！'}</p>
        <div class="sweep-complete-info">
          <p>扫荡层数: 1 → ${floorsSwept}</p>
        </div>
        <div class="sweep-final-rewards">
          <p><b>🎁 获得奖励</b></p>
          <p>💰 金币: <span style="color:#ffd700;">+${this.sweepTotalReward.gold.toLocaleString()}</span></p>
          <p>🎫 抽卡券: <span style="color:#90ee90;">+${this.sweepTotalReward.tickets}</span></p>
          <p>🎖️ 无尽币: <span style="color:#87ceeb;">+${this.sweepTotalReward.endlessCoin}</span></p>
        </div>
        <p style="margin-top:15px;">今日剩余次数: <b style="color:${remaining > 0 ? '#90ee90' : '#ff6b6b'};">${remaining}/${maxCount}</b></p>
        <div class="sweep-buttons" style="margin-top:20px;">
          <button id="sweep-complete-ok" class="btn-primary">确定</button>
        </div>
      </div>
    `;
    
    showModal('🧹 扫荡结果', content, false);
    
    setTimeout(() => {
      document.getElementById('sweep-complete-ok')?.addEventListener('click', () => {
        closeModal();
      });
    }, 100);
  },
  
  /**
   * 购买额外扫荡次数
   */
  buySweepCount() {
    const buyPrice = CONFIG.SWEEP?.buyPrice || 500;
    const currentEndlessCoin = state.endlessCoin || 0;
    
    if (currentEndlessCoin < buyPrice) {
      alert(`无尽币不足！需要 ${buyPrice}，当前 ${currentEndlessCoin}`);
      return;
    }
    
    if (!confirm(`确定花费 ${buyPrice} 无尽币购买 1 次扫荡机会？`)) {
      return;
    }
    
    const success = store.buySweepCount();
    if (success) {
      updateResourceUI();
      alert('购买成功！');
      // 刷新面板
      closeModal();
      this.showSweepPanel();
    } else {
      alert('购买失败！');
    }
  },
  
  /**
   * 格式化时间
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
    }
  },
  
  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ==================== 无尽模式UI入口 ====================

export function showEndlessMode() {
  const stats = EndlessMode.getStats();
  
  // 检查扫荡可用性
  const canShowSweep = stats.maxFloorReached >= 1;  // 历史最高层>=1才显示扫荡按钮
  // 扫荡按钮始终可点击（进入面板后可购买次数），只有正在扫荡时禁用
  const sweepBtnDisabled = EndlessMode.active || EndlessMode.sweepActive;
  const sweepBtnClass = sweepBtnDisabled ? 'btn-sweep-disabled' : 'btn-sweep';
  
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
        ${canShowSweep ? `<button id="start-sweep" class="${sweepBtnClass}">🧹 扫荡</button>` : ''}
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
    document.getElementById('start-sweep')?.addEventListener('click', () => {
      closeModal();
      EndlessMode.showSweepPanel();
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
