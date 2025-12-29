// ==================== 召唤系统 ====================

const SummonSystem = {
  // 当前战斗中的召唤物列表
  summons: [],
  
  // 召唤师状态追踪
  // { ownerId: { actionCount: 0, firstAction: true, needRefresh: false } }
  summonerState: new Map(),
  
  // ==================== 初始化 ====================
  
  // 初始化召唤系统（战斗开始时调用）
  init(team) {
    this.summons = [];
    this.summonerState.clear();
    
    // 找出队伍中的召唤师并初始化状态
    const summoners = this.getSummonersInTeam(team);
    summoners.forEach(summoner => {
      this.summonerState.set(summoner.id, {
        actionCount: 0,        // 行动计数
        firstAction: true,     // 是否首次行动
        needRefresh: false,    // 是否有召唤物死亡需要立即补充
        quota: 0               // 配额（稍后计算）
      });
    });
    
    // 计算配额
    this.distributeQuota(summoners.length);
  },
  
  // 分配召唤位配额
  distributeQuota(summonerCount) {
    if (summonerCount === 0) return;
    
    const totalSlots = CONFIG.SUMMON.MAX_SLOTS;
    const baseQuota = Math.floor(totalSlots / summonerCount);
    const remainder = totalSlots % summonerCount;
    
    let index = 0;
    this.summonerState.forEach((state, ownerId) => {
      // 前 remainder 个召唤师多分1个
      state.quota = baseQuota + (index < remainder ? 1 : 0);
      index++;
    });
  },
  
  // ==================== 召唤师识别 ====================
  
  // 获取队伍中的召唤师列表
  getSummonersInTeam(team) {
    return team.filter(char => this.isSummoner(char));
  },
  
  // 判断干员是否是召唤师
  isSummoner(char) {
    // 根据干员数据中的 summoner 标记判断
    return char.isSummoner === true;
  },
  
  // ==================== 召唤物创建 ====================
  
  // 创建召唤物
  createSummon(owner) {
    const summonData = this.getSummonData(owner);
    if (!summonData) return null;
    
    const ratio = CONFIG.SUMMON.INHERIT_RATIO;
    
    // 获取召唤者的实际属性（含潜能加成）
    const ownerHp = owner.maxHp || owner.hp;
    const ownerAtk = owner.atk;
    const ownerDef = owner.def;
    const ownerSpd = owner.spd;
    
    const summonHp = Math.floor(ownerHp * ratio);
    const summonAtk = Math.floor(ownerAtk * ratio);
    const summonDef = Math.floor(ownerDef * ratio);
    const summonSpd = Math.floor(ownerSpd * ratio);
    
    const summon = {
      id: `summon_${owner.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: summonData.name,
      ownerId: owner.id,
      ownerName: owner.name,
      isSummon: true,
      isEnemy: false,
      
      // 统一使用 currentHp / maxHp（和干员一致）
      currentHp: summonHp,
      maxHp: summonHp,
      atk: summonAtk,
      def: summonDef,
      spd: summonSpd,
      
      // 能量（召唤物不使用，但保持结构一致）
      energy: 0,
      maxEnergy: 100,
      
      // buff加成（和干员一致）
      buffAtk: 0,
      buffAtkPercent: 0,
      buffSpd: 0,
      stunDuration: 0,
      
      // 召唤物专属buff
      buffs: {
        atkPercent: 0,      // ATK百分比加成（技能叠加）
        spdFlat: 0,         // SPD固定值加成（技能叠加）
        healPerTurn: 0,     // 每回合回血百分比
        doubleAttack: false, // 二连击
        stunOnHit: false    // 攻击附带眩晕
      },
      
      // buff持续时间追踪（有持续时间的buff）
      buffDurations: {
        healPerTurn: 0,     // 每回合回血剩余回合数
        doubleAttack: 0,    // 二连击剩余回合数
        stunOnHit: 0        // 攻击附带眩晕剩余回合数
      },
      
      // 只有普攻
      skills: ['普攻'],
      
      // 死亡日志标记
      deathLogged: false,
      
      // 用于显示
      spine: summonData.spine || null,
      art: summonData.art || null,
      unitId: `summon-${summonData.name}-${Date.now()}`
    };
    
    this.summons.push(summon);
    return summon;
  },
  
  // 获取召唤物基础数据（名称、外观等）
  getSummonData(owner) {
    // 根据召唤师返回对应召唤物数据
    const summonMap = {
      '缪尔赛思': {
        name: '流形',
        spine: {
          skel: 'spine/token_10030_mlyss_wtrman/token_10030_mlyss_wtrman.skel',
          atlas: 'spine/token_10030_mlyss_wtrman/token_10030_mlyss_wtrman.atlas',
          animation: 'B_Idle'
      },
        art: null
      },
      '凯尔希': {
        name: 'Mon3tr',
        spine: null,
        art: null
      },
      '深海色': {
        name: '触手',
        spine: null,
        art: null
      }
      // 后续添加更多召唤师
    };
    
    return summonMap[owner.name] || { name: `${owner.name}的召唤物` };
  },
  
  // ==================== 召唤师行动处理 ====================
  
  // 召唤师行动时调用（回合开始时）
  onSummonerTurnStart(summoner) {
    const state = this.summonerState.get(summoner.id);
    if (!state) return [];
    
    const newSummons = [];
    const currentCount = this.getSummonsByOwner(summoner).length;
    
    // 情况1：首次行动，立即召唤
    if (state.firstAction) {
      state.firstAction = false;
      if (currentCount < state.quota && this.getTotalSummonCount() < CONFIG.SUMMON.MAX_SLOTS) {
        const summon = this.createSummon(summoner);
        if (summon) newSummons.push(summon);
      }
      return newSummons;
    }
    
    // 情况2：有召唤物死亡，立即补充
    if (state.needRefresh) {
      state.needRefresh = false;
      state.actionCount = 0;  // 重置计数
      if (currentCount < state.quota && this.getTotalSummonCount() < CONFIG.SUMMON.MAX_SLOTS) {
        const summon = this.createSummon(summoner);
        if (summon) newSummons.push(summon);
      }
      return newSummons;
    }
    
    // 情况3：正常计数
    if (currentCount < state.quota) {
      state.actionCount++;
      if (state.actionCount >= CONFIG.SUMMON.REFRESH_INTERVAL) {
        state.actionCount = 0;
        if (this.getTotalSummonCount() < CONFIG.SUMMON.MAX_SLOTS) {
          const summon = this.createSummon(summoner);
          if (summon) newSummons.push(summon);
        }
      }
    }
    
    return newSummons;
  },

  // 获取召唤师的召唤倒计时
  getSummonCountdown(summoner) {
    const state = this.summonerState.get(summoner.id);
    if (!state) return null;
    
    const currentCount = this.getSummonsByOwner(summoner).length;
    
    // 配额已满
    if (currentCount >= state.quota || this.getTotalSummonCount() >= CONFIG.SUMMON.MAX_SLOTS) {
      return { full: true };
    }
    
    // 有死亡召唤物待补充
    if (state.needRefresh) {
      return { countdown: 0, text: '待补充' };
    }
    
    // 正常计数
    const remaining = CONFIG.SUMMON.REFRESH_INTERVAL - state.actionCount;
    return { countdown: remaining, text: `下次召唤: ${remaining}轮后` };
  },

  
  // ==================== 死亡处理 ====================
  
  // 召唤物死亡
  onSummonDeath(summon) {
    // 从列表移除
    const index = this.summons.findIndex(s => s.id === summon.id);
    if (index !== -1) {
      this.summons.splice(index, 1);
    }
    
    // 标记召唤师需要立即补充
    const state = this.summonerState.get(summon.ownerId);
    if (state) {
      state.needRefresh = true;
    }
  },
  
  // 召唤者死亡
  onOwnerDeath(owner) {
    if (!CONFIG.SUMMON.OWNER_DEATH_REMOVE) return;
    
    // 移除该召唤者的所有召唤物
    this.summons = this.summons.filter(s => s.ownerId !== owner.id);
    
    // 清除召唤师状态
    this.summonerState.delete(owner.id);
    
    // 重新分配配额给剩余召唤师
    const remainingSummoners = this.summonerState.size;
    if (remainingSummoners > 0) {
      this.distributeQuota(remainingSummoners);
    }
  },
  
  // ==================== 查询方法 ====================
  
  // 获取某召唤师的所有召唤物
  getSummonsByOwner(owner) {
    return this.summons.filter(s => s.ownerId === owner.id);
  },
  
  // 获取所有存活召唤物
  getAliveSummons() {
    return this.summons.filter(s => s.currentHp > 0);
  },
  
  // 获取当前召唤物总数
  getTotalSummonCount() {
    return this.summons.length;
  },
  
  // 根据ID获取召唤物
  getSummonById(id) {
    return this.summons.find(s => s.id === id);
  },
  
  // 获取召唤物的召唤者
  getOwner(summon, team) {
    return team.find(char => char.id === summon.ownerId);
  },
  
  // ==================== buff相关 ====================
  
  // 给召唤物添加buff（技能调用，支持duration参数）
  addBuffToSummons(owner, buffType, value, duration = 0) {
    const summons = this.getSummonsByOwner(owner);
    summons.forEach(summon => {
      switch (buffType) {
        case 'atkPercent':
          summon.buffs.atkPercent += value;
          break;
        case 'spdFlat':
          summon.buffs.spdFlat += value;
          break;
        case 'healPerTurn':
          summon.buffs.healPerTurn = value;  // 不叠加，覆盖
          if (duration > 0) summon.buffDurations.healPerTurn = duration;
          break;
        case 'doubleAttack':
          summon.buffs.doubleAttack = value;
          if (duration > 0) summon.buffDurations.doubleAttack = duration;
          break;
        case 'stunOnHit':
          summon.buffs.stunOnHit = value;
          if (duration > 0) summon.buffDurations.stunOnHit = duration;
          break;
      }
    });
  },
  
  // 给召唤者自己也加buff（技能同时影响召唤者）
  addBuffToOwner(owner, buffType, value, duration = 0) {
    switch (buffType) {
      case 'atkPercent':
        owner.buffAtkPercent = (owner.buffAtkPercent || 0) + value;
        break;
      case 'spdFlat':
        owner.buffSpd = (owner.buffSpd || 0) + value;
        break;
      case 'healPerTurn':
        // 每回合回血效果（使用持续时间）
        owner.healPerTurn = value;
        if (duration > 0) owner.healPerTurnDuration = duration;
        break;
    }
  },
  
  // 获取召唤物实际ATK（含buff）
  getSummonAtk(summon) {
    const baseAtk = summon.atk;
    const percentBonus = (summon.buffs.atkPercent || 0) / 100;
    return Math.floor(baseAtk * (1 + percentBonus));
  },
  
  // 获取召唤物实际SPD（含buff）
  getSummonSpd(summon) {
    return summon.spd + (summon.buffs.spdFlat || 0);
  },
  
  // 召唤物回合开始时处理（回血等）
  onSummonTurnStart(summon) {
    const result = { healed: 0 };
    
    // 每回合回血
    if (summon.buffs.healPerTurn > 0) {
      const healAmount = Math.floor(summon.maxHp * summon.buffs.healPerTurn / 100);
      const oldHp = summon.currentHp;
      summon.currentHp = Math.min(summon.maxHp, summon.currentHp + healAmount);
      result.healed = summon.currentHp - oldHp;
    }
    
    // 注意：buff持续时间递减已移至 onSummonTurnEnd
    
    return result;
  },
  
  // 召唤物回合结束时处理（buff持续时间递减）
  onSummonTurnEnd(summon) {
    const result = { expiredBuffs: [] };
    
    // 处理buff持续时间（回合结束后再递减）
    result.expiredBuffs = this.processSummonBuffDurations(summon);
    
    return result;
  },
  
  // 处理召唤物buff持续时间（每回合结束时调用）
  processSummonBuffDurations(summon) {
    const expiredBuffs = [];
    
    // 处理healPerTurn
    if (summon.buffDurations.healPerTurn > 0) {
      summon.buffDurations.healPerTurn--;
      if (summon.buffDurations.healPerTurn <= 0) {
        summon.buffs.healPerTurn = 0;
        expiredBuffs.push({ buffType: 'healPerTurn', name: '每回合回血' });
      }
    }
    
    // 处理doubleAttack
    if (summon.buffDurations.doubleAttack > 0) {
      summon.buffDurations.doubleAttack--;
      if (summon.buffDurations.doubleAttack <= 0) {
        summon.buffs.doubleAttack = false;
        expiredBuffs.push({ buffType: 'doubleAttack', name: '二连击' });
      }
    }
    
    // 处理stunOnHit
    if (summon.buffDurations.stunOnHit > 0) {
      summon.buffDurations.stunOnHit--;
      if (summon.buffDurations.stunOnHit <= 0) {
        summon.buffs.stunOnHit = false;
        expiredBuffs.push({ buffType: 'stunOnHit', name: '攻击附带眩晕' });
      }
    }
    
    return expiredBuffs;
  },
  
  // ==================== 清理 ====================
  
  // 战斗结束清理
  clear() {
    this.summons = [];
    this.summonerState.clear();
  }
};
