import { SmartTeam_DB } from './smartTeam_data.js';
import { CONFIG } from '../config.js';
import { SUMMON_DATA } from '../data.js';

export const SmartTeamBuilder = {
  initialized: false,

  // ==================== 初始化与自检 ====================
  
  /**
   * 初始化 SmartTeamBuilder
   * 执行自检并打印状态
   */
  async init() {
    if (this.initialized) return;

    console.group('🧠 SmartTeamBuilder 初始化程序');
    try {
      console.log('📦 正在加载依赖...');
      
      // 检查依赖
      if (!SmartTeam_DB) throw new Error('SmartTeam_DB 未加载');
      if (!CONFIG) throw new Error('CONFIG 未加载');
      if (!SUMMON_DATA) throw new Error('SUMMON_DATA 未加载');
      console.log('✅ 依赖加载完成');

      // 检查数据库连接
      console.log('💾 正在检查数据库连接...');
      // 简单的读写测试或者仅确认对象存在
      if (SmartTeam_DB.teamMatchHistory) {
         console.log('✅ SmartTeam_DB.teamMatchHistory 已就绪');
      } else {
         console.warn('⚠️ SmartTeam_DB.teamMatchHistory 可能缺失');
      }

      this.initialized = true;
      console.log('🚀 SmartTeamBuilder 初始化成功');
    } catch (e) {
      console.error('❌ SmartTeamBuilder 初始化失败:', e);
    }
    console.groupEnd();
  },

  // ==================== 核心对外接口 ====================

  /**
   * 生成针对性的敌人队伍
   * @param {number} floor 当前层数
   * @param {Array} playerTeam 玩家队伍数据 (from state.team -> CHARACTER_DATA)
   * @param {Object} enemyTemplates 敌人模板库 (from EndlessMode.enemyTemplates)
   * @returns {Array} 敌人实例列表
   */
  generateCounterTeam(floor, playerTeam, enemyTemplates) {
    if (!this.initialized) {
        console.warn('SmartTeamBuilder 未初始化，正在运行 init()...');
        this.init();
    }

    console.group(`🧠 SmartTeamBuilder: 生成针对性敌人队伍 (第${floor}层)`);
    
    try {
        // 1. 分析玩家队伍特征
        console.time('分析耗时');
        const analysis = this.analyzePlayerTeam(playerTeam);
        console.timeEnd('分析耗时');
        console.log('📊 玩家队伍分析:', analysis);

        // 2. 制定克制策略
        console.time('策略耗时');
        const strategy = this.deviseStrategy(analysis, floor);
        console.timeEnd('策略耗时');
        console.log('🛡️ 策略制定:', strategy);

        // 3. 构建敌人队伍
        console.time('构建耗时');
        const enemies = this.constructTeam(strategy, floor, enemyTemplates);
        console.timeEnd('构建耗时');
        
        console.log('⚔️ 生成的敌人:', enemies.map(e => `${e.name} [${e.affixes.join(', ')}]`));
        
        return enemies;
    } catch (error) {
        console.error('❌ 生成敌人队伍时出错:', error);
        // Fallback: 返回空数组让 EndlessMode 使用默认逻辑
        return [];
    } finally {
        console.groupEnd();
    }
  },

  /**
   * 记录战斗结果（用于后续学习）
   * @param {Array} playerTeam 玩家队伍
   * @param {Array} enemyTeam 敌方队伍
   * @param {boolean} isWin 玩家是否胜利 (我们需要记录的是敌人的胜率，所以如果玩家赢了，敌人就是输了)
   */
  async recordMatchResult(playerTeam, enemyTeam, isWin) {
    try {
      const playerSign = this.getPlayerTeamSignature(playerTeam);
      const enemySign = this.getEnemyTeamSignature(enemyTeam);
      
      // 记录到 IndexedDB
      // result: 0 = 敌人输(玩家赢), 1 = 敌人赢(玩家输)
      const result = isWin ? 0 : 1;
      
      await SmartTeam_DB.teamMatchHistory.add({
        playerHash: playerSign,
        enemyHash: enemySign,
        result: result,
        floor: enemyTeam[0]?.level || 0, // 记录大致等级/层数
        timestamp: Date.now()
      });
      
      console.log(`📝 SmartTeamBuilder: 战斗记录已保存 (Result: ${result})`);
    } catch (e) {
      console.error('SmartTeamBuilder: 记录战斗失败', e);
    }
  },

  // ==================== 内部逻辑 ====================

  /**
   * 分析玩家队伍
   */
  analyzePlayerTeam(team) {
    const stats = {
      avgHp: 0,
      avgAtk: 0,
      avgDef: 0,
      avgSpd: 0,
      roles: {
        healer: 0,
        summoner: 0,
        tank: 0,
        dps: 0
      },
      count: 0
    };

    team.forEach(char => {
      if (!char) return;
      stats.count++;
      stats.avgHp += char.hp;
      stats.avgAtk += char.atk;
      stats.avgDef += char.def;
      stats.avgSpd += char.spd;

      // 简单的角色判定
      if (char.class === '医疗' || (char.skills && char.skills.some(s => s.includes('治疗')))) stats.roles.healer++;
      
      // 召唤判定：只检查 summoner 属性
      if (char.summoner) {
        stats.roles.summoner++;
      }

      if (char.class === '重装' || char.def > 80) stats.roles.tank++;
      if (char.class === '术师' || char.class === '狙击' || char.class === '近卫' || char.class === '先锋' || char.class === '特种') stats.roles.dps++;
    });

    if (stats.count > 0) {
      stats.avgHp /= stats.count;
      stats.avgAtk /= stats.count;
      stats.avgDef /= stats.count;
      stats.avgSpd /= stats.count;
    }

    // 判定核心特征
    const traits = [];
    if (stats.roles.healer >= 2) traits.push('heavy_sustain'); // 强续航
    if (stats.roles.summoner >= 1) traits.push('summoner_comp'); // 召唤流
    if (stats.avgSpd > 95) traits.push('high_speed'); // 高速队
    if (stats.avgDef > 60) traits.push('high_defense'); // 高防队
    if (stats.avgAtk > 200) traits.push('high_burst'); // 高爆发

    return { stats, traits };
  },

  /**
   * 制定策略
   */
  deviseStrategy(analysis, floor) {
    const traits = analysis.traits;
    let strategy = {
      core: 'balanced', // 核心思路: balanced, rush, tanky, aoe, anti_heal
      priorityAffixes: [],
      preferredEnemyTypes: [] // 'normal', 'elite', 'boss' (boss只能在boss层)
    };

    // 基于特征的启发式克制 (Heuristic Counter)
    
    // 1. 针对【高速队】 (High Speed)
    // 策略：使用“迅捷”词缀强行抢一速，或者使用“反伤/高防”硬抗
    if (traits.includes('high_speed')) {
      if (Math.random() < 0.5) {
        strategy.core = 'rush';
        strategy.priorityAffixes.push('swift'); // 抢速度
      } else {
        strategy.core = 'tanky';
        strategy.priorityAffixes.push('thorns', 'fortify'); // 反伤+高防
      }
    }
    
    // 2. 针对【强续航/奶队】 (Heavy Sustain)
    // 策略：高爆发秒人，或者禁疗（如果有禁疗词缀的话，暂时用高攻代替）
    else if (traits.includes('heavy_sustain')) {
      strategy.core = 'burst';
      strategy.priorityAffixes.push('berserk', 'multiStrike'); // 狂暴+连击
    }
    
    // 3. 针对【召唤流】 (Summoner)
    // 策略：AOE伤害（目前用术师代替），或者分裂/反伤
    else if (traits.includes('summoner_comp')) {
      strategy.core = 'aoe';
      strategy.priorityAffixes.push('thorns', 'explosion'); // 反伤+亡语爆炸
    }
    
    // 4. 针对【高防队】 (High Defense)
    // 策略：法术伤害（术师）
    else if (traits.includes('high_defense')) {
      strategy.core = 'magic';
      strategy.priorityAffixes.push('berserk'); // 增加伤害
    }
    
    // 5. 默认/高爆发
    else {
      strategy.core = 'balanced';
      strategy.priorityAffixes.push('shield', 'regen'); // 护盾+回血增加容错
    }

    return strategy;
  },

  /**
   * 构建队伍实例
   */
  constructTeam(strategy, floor, templates) {
    const enemies = [];
    const scale = 1 + (floor - 1) * 0.05; // 基础属性成长
    const isBossFloor = floor % 10 === 0;
    
    // 筛选合适的单位模板
    let pool = [];
    
    // 根据策略筛选
    if (strategy.core === 'magic') {
      pool = [...templates.normal.filter(e => e.name.includes('术师')), ...templates.elite.filter(e => e.name.includes('术师'))];
    } else if (strategy.core === 'tanky') {
      pool = [...templates.normal.filter(e => e.name.includes('重装') || e.def > 20), ...templates.elite.filter(e => e.name.includes('重装'))];
    } else if (strategy.core === 'rush') {
      pool = [...templates.normal.filter(e => e.spd > 60), ...templates.elite.filter(e => e.spd > 70)];
    }
    
    // 保底池
    if (pool.length === 0) {
      pool = [...templates.normal, ...templates.elite];
    }

    // 确定数量 (BOSS层通常由外部控制，但如果是纯SmartAI生成，这里需要处理)
    // 假设 EndlessMode 会在 BOSS 层单独处理 BOSS，这里主要负责生成普通层或者 BOSS 层的随从
    // 为了兼容性，如果是 BOSS 层，我们只生成 2 个精英护卫（BOSS 本体由 EndlessMode 生成）
    // 如果是普通层，生成 3-4 个敌人
    
    let count = 0;
    if (isBossFloor) {
        count = 0; // BOSS层逻辑暂交还给 EndlessMode，或者只生成护卫
    } else {
        count = floor > 10 ? 4 : 3;
    }

    // 如果 count 为 0，直接返回空数组
    if (count === 0) return [];

    for (let i = 0; i < count; i++) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      
      // 实例化
      const enemy = this.instantiateEnemy(template, scale, strategy.priorityAffixes, floor);
      enemies.push(enemy);
    }

    return enemies;
  },

  /**
   * 实例化单个敌人（应用属性和词缀）
   */
  instantiateEnemy(template, scale, priorityAffixes, floor) {
    // 基础属性计算
    let hp = Math.floor(template.hp * scale);
    let atk = Math.floor(template.atk * scale);
    let def = Math.floor(template.def * scale);
    let spd = template.spd;

    // 确定词缀
    // 智能系统会强制塞入策略需要的词缀，但也受限于层数强度控制（稍微放宽一点给AI）
    let affixes = [];
    
    // 30层以上才启用智能词缀分配
    if (floor >= 30 && priorityAffixes.length > 0) {
      // 随机选1-2个策略词缀
      const count = Math.min(priorityAffixes.length, 1 + (floor > 50 ? 1 : 0));
      for(let i=0; i<count; i++) {
        affixes.push(priorityAffixes[i]);
      }
    }

    // 应用词缀属性加成
    affixes.forEach(affix => {
      const data = CONFIG.AFFIX.TYPES[affix];
      if (data) {
        if (affix === 'swift') spd += data.value;
        if (affix === 'fortify') def = Math.floor(def * (1 + data.value / 100));
        // 其他词缀多为战斗内效果
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
      affixes: [...new Set(affixes)], // 去重
      enemyType: template.hp > 800 ? 'elite' : 'normal', // 简单判定
      affixState: {
        undyingTriggered: false,
        berserkActive: false
      },
      // 标记这是AI生成的针对性单位
      isSmartCounter: true
    };
  },

  // ==================== 签名生成 ====================

  /**
   * 生成玩家队伍签名
   * 格式: "Role1:Role2:AvgSpdRange"
   */
  getPlayerTeamSignature(team) {
    const analysis = this.analyzePlayerTeam(team);
    const roles = Object.entries(analysis.stats.roles)
      .filter(([role, count]) => count > 0)
      .map(([role, count]) => `${role}${count}`)
      .sort()
      .join('_');
    
    // 速度分段，每20一段
    const spdRange = Math.floor(analysis.stats.avgSpd / 20) * 20;
    
    return `${roles}_spd${spdRange}`;
  },

  /**
   * 生成敌方队伍签名
   * 格式: "Unit1_Unit2_Affix1_Affix2"
   */
  getEnemyTeamSignature(team) {
    // 简化：只记录主要单位名称和主要词缀
    const unitNames = team.map(e => e.name).sort().join('_');
    const allAffixes = [...new Set(team.flatMap(e => e.affixes))].sort().join('_');
    return `${unitNames}|${allAffixes}`;
  }
};