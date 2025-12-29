// ==================== 战斗系统 ====================

// 已渲染的Spine容器ID记录
const renderedSpineUnits = new Set();

// 获取词缀提示文本
function getAffixTooltipText(affixes) {
  if (!affixes || affixes.length === 0) return '';
  
  return affixes.map(affix => {
    const data = CONFIG.AFFIX?.TYPES?.[affix];
    if (!data) return affix;
    
    let desc = data.desc || '';
    // 替换模板变量
    if (data.value !== undefined) {
      desc = desc.replace('{value}', data.value);
    }
    if (data.threshold !== undefined) {
      desc = desc.replace('{threshold}', data.threshold);
    }
    
    return `${data.icon} ${data.name}: ${desc}`;
  }).join('&#10;');  // 使用换行符
}

// 更新关卡UI
function updateStageUI() {
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  
  STAGES.forEach(stage => {
    const btn = document.createElement('button');
    btn.className = 'stage-btn';
    btn.innerHTML = `
      <div><b>${stage.name}</b></div>
      <small>金币: ${stage.rewards.gold} | 抽卡券：${stage.rewards.tickets}</small>
    `;
    btn.onclick = () => startBattle(stage);
    list.appendChild(btn);
  });
}

// 开始战斗
function startBattle(stage) {
  const team = state.team.filter(c => c !== null);
  if (team.length === 0) {
    alert('请先编队！');
    return;
  }

  saveState();
  
  // 清理所有Spine实例，防止WebGL上下文过多
  if (typeof clearAllSpineInstances === 'function') {
    clearAllSpineInstances();
  }
  
  resetBattle();
  renderedSpineUnits.clear();
  battle.active = true;
  battle.stage = stage;
  
  battle.allies = team.map((name, index) => {
    const data = CHARACTER_DATA[name];
    const potential = state.inventory[name]?.potential || 1;
    return {
      id: `ally_${name}_${Date.now()}_${index}`,  // 添加唯一ID
      name,
      rarity: data.rarity,
      hp: applyPotentialBonus(data.hp, potential),
      atk: applyPotentialBonus(data.atk, potential),
      def: applyPotentialBonus(data.def, potential),
      spd: data.spd,
      skills: [...data.skills],
      currentHp: applyPotentialBonus(data.hp, potential),
      maxHp: applyPotentialBonus(data.hp, potential),
      energy: 0,
      maxEnergy: 100,
      buffAtk: 0,
      buffAtkPercent: 0,      // 百分比ATK加成（召唤技能用）
      buffSpd: 0,             // SPD加成（召唤技能用）
      stunDuration: 0,
      isEnemy: false,
      isLeader: index === 0,
      isSummoner: data.summoner || false,  // 是否是召唤师
      isSummon: false,                      // 不是召唤物
      unitId: `ally-${name}-${Date.now()}-${index}`
    };
  });
  
  battle.enemies = stage.enemies.map((e, idx) => ({
    id: `enemy_${e.name}_${Date.now()}_${idx}`,  // 添加唯一ID
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
    unitId: `enemy-${e.name}-${idx}-${Date.now()}`
  }));
  
  // ====== 初始化召唤系统 ======
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.init(battle.allies);
  }
  
  // ====== 初始化充能技能（夜莺等） ======
  battle.allies.forEach(ally => {
    if (typeof initChargeSkills === 'function') {
      initChargeSkills(ally);
    }
  });
  
  document.getElementById('stage-panel').style.display = 'none';
  document.getElementById('battle-field').classList.add('active');
  
  // 切换战斗BGM
  AudioManager.playBGM('battle');
  
  addBattleLog('⚔️ 战斗开始！', 'system');
  calculateTurnOrder();
  battle.currentTurn = 0;
  
  renderBattleInitial();
  setTimeout(() => nextTurn(), 500);
}

// 计算行动顺序（包含召唤物）
function calculateTurnOrder() {
  // 同步召唤物到战斗状态
  syncSummons();
  
  // 包含干员、召唤物、敌人
  const allUnits = [...battle.allies, ...battle.summons, ...battle.enemies].filter(u => u.currentHp > 0);
  
  // 按SPD排序（考虑buff加成）
  battle.turnOrder = allUnits.sort((a, b) => {
    const spdA = getUnitSpd(a);
    const spdB = getUnitSpd(b);
    return spdB - spdA;
  });
}

// 获取单位实际SPD（含buff）
function getUnitSpd(unit) {
  let spd = unit.spd;
  
  // 固定值加成
  if (unit.buffSpd) {
    spd += unit.buffSpd;
  }
  
  // 召唤物的buff
  if (unit.isSummon && unit.buffs) {
    spd += unit.buffs.spdFlat || 0;
  }
  
  return spd;
}

// getUnitAtk函数已移至skills.js，避免重复定义

// 获取单位实际ATK（含buff）
function getUnitAtkDisplay(unit) {
  let atk = unit.atk;
  
  // 固定值加成
  if (unit.buffAtk) {
    atk += unit.buffAtk;
  }
  
  // 百分比加成
  if (unit.buffAtkPercent) {
    atk = Math.floor(atk * (1 + unit.buffAtkPercent / 100));
  }
  
  // 召唤物的buff
  if (unit.isSummon && unit.buffs) {
    if (unit.buffs.atkPercent > 0) {
      atk = Math.floor(atk * (1 + unit.buffs.atkPercent / 100));
    }
  }
  
  return atk;
}

// 获取单位实际DEF（含buff/debuff）
function getUnitDefDisplay(unit) {
  let def = unit.def;
  
  // DEF debuff（护盾破碎时为0）
  if (unit.shieldBroken) {
    return 0;
  }
  
  return def;
}

// 获取单位的buff/debuff显示文本
function getUnitBuffDebuffText(unit) {
  const buffs = [];
  const debuffs = [];
  
  // ATK buff
  if (unit.buffAtk && unit.buffAtk > 0) {
    buffs.push(`ATK+${unit.buffAtk}`);
  }
  if (unit.buffAtkPercent && unit.buffAtkPercent > 0) {
    buffs.push(`ATK+${unit.buffAtkPercent}%`);
  }
  
  // SPD buff/debuff
  if (unit.buffSpd) {
    if (unit.buffSpd > 0) {
      buffs.push(`SPD+${unit.buffSpd}`);
    } else {
      const duration = unit.spdDebuffDuration || '';
      debuffs.push(`SPD${unit.buffSpd}${duration ? `(${duration}回合)` : ''}`);
    }
  }
  
  // 持续debuff（如SPD减速）
  if (unit.durationDebuffs && unit.durationDebuffs.length > 0) {
    unit.durationDebuffs.forEach(debuff => {
      if (debuff.type === 'spd' && debuff.value) {
        debuffs.push(`SPD${debuff.value}(${debuff.duration}回合)`);
      }
    });
  }
  
  // 每回合回血
  if (unit.healPerTurn && unit.healPerTurn > 0) {
    const duration = unit.healPerTurnDuration || '';
    buffs.push(`回血${unit.healPerTurn}%${duration ? `(${duration}回合)` : ''}`);
  }
  
  // 眩晕状态
  if (unit.stunDuration && unit.stunDuration > 0) {
    debuffs.push(`💫眩晕(${unit.stunDuration}回合)`);
  }
  
  // 护盾破碎
  if (unit.shieldBroken) {
    debuffs.push(`💥DEF归零`);
  }
  
  // 召唤物特有buff
  if (unit.isSummon && unit.buffs) {
    if (unit.buffs.atkPercent > 0) buffs.push(`ATK+${unit.buffs.atkPercent}%`);
    if (unit.buffs.spdFlat > 0) buffs.push(`SPD+${unit.buffs.spdFlat}`);
    if (unit.buffs.healPerTurn > 0) {
      const dur = unit.buffs.healPerTurnDuration || '';
      buffs.push(`回血${unit.buffs.healPerTurn}%${dur ? `(${dur}回合)` : ''}`);
    }
    if (unit.buffs.doubleAttack) {
      const dur = unit.buffs.doubleAttackDuration || '';
      buffs.push(`二连击${dur ? `(${dur}回合)` : ''}`);
    }
    if (unit.buffs.stunOnHit) {
      const dur = unit.buffs.stunOnHitDuration || '';
      buffs.push(`附带眩晕${dur ? `(${dur}回合)` : ''}`);
    }
  }
  
  // 组合显示
  let result = '';
  if (buffs.length > 0) {
    result += `<span class="buff-text">🔺${buffs.join(' | ')}</span>`;
  }
  if (debuffs.length > 0) {
    if (result) result += ' ';
    result += `<span class="debuff-text">🔻${debuffs.join(' | ')}</span>`;
  }
  
  return result;
}

// ==================== AT条系统 ====================

// 渲染AT条（包含召唤物）
function renderATBar() {
  const container = document.getElementById('at-bar-units');
  if (!container) return;
  
  container.innerHTML = '';
  
  // 同步召唤物
  syncSummons();
  
  const allUnits = [...battle.allies, ...battle.summons, ...battle.enemies].filter(u => u.currentHp > 0);
  const sorted = allUnits.sort((a, b) => getUnitSpd(b) - getUnitSpd(a));
  
  const displayCount = Math.min(10, sorted.length);  // 增加显示数量
  
  for (let i = 0; i < displayCount; i++) {
    const unit = sorted[i];
    const isCurrent = (battle.turnOrder[battle.currentTurn] === unit);
    
    const div = document.createElement('div');
    
    // 区分干员、召唤物、敌人
    let unitClass = unit.isEnemy ? 'enemy' : 'ally';
    if (unit.isSummon) unitClass = 'summon';
    
    div.className = `at-unit ${unitClass} ${isCurrent ? 'current' : ''}`;
    
    // 图标区分
    let icon;
    if (unit.isEnemy) {
      icon = '👹';
    } else if (unit.isSummon) {
      icon = '🔮';  // 召唤物图标
    } else if (unit.isLeader) {
      icon = '👑';
    } else {
      icon = '👤';
    }
    
    const stunIcon = unit.stunDuration > 0 ? '💫' : '';
    const shieldIcon = (unit.isEnemy && unit.shieldBroken) ? '💥' : '';
    
    div.innerHTML = `
      <div class="at-unit-icon">${icon}${stunIcon}${shieldIcon}</div>
      <div class="at-unit-name">${unit.name}</div>
      <div class="at-unit-spd">SPD ${getUnitSpd(unit)}</div>
    `;
    
    container.appendChild(div);
  }
}

// ==================== 战斗渲染 ====================

// 首次渲染战斗界面
function renderBattleInitial() {
  renderBattleSideInitial('ally-side', battle.allies, '我方', false);
  renderSummonsSideInitial();  // 新增：渲染召唤物
  renderBattleSideInitial('enemy-side', battle.enemies, '敌方', true);
  renderBattleLog();
  renderATBar();
}

// 更新战斗界面
function renderBattle() {
  syncSummons();  // 同步召唤物状态
  updateBattleSide(battle.allies, false);
  updateSummonsSide();  // 新增：更新召唤物
  updateBattleSide(battle.enemies, true);
  renderBattleLog();
  renderATBar();
}

// 首次渲染召唤物区域
function renderSummonsSideInitial() {
  let container = document.getElementById('summon-side');
  
  // 如果容器不存在，创建它
  if (!container) {
    const allyContainer = document.getElementById('ally-side');
    container = document.createElement('div');
    container.id = 'summon-side';
    container.className = 'battle-side summon-side';
    allyContainer.parentNode.insertBefore(container, allyContainer.nextSibling);
    
    // 初始化拖拽功能
    initSummonSideDrag(container);
  }
  
  // 添加可拖拽标题栏和内容区
  container.innerHTML = `
    <div class="summon-side-header">
      <span class="summon-side-title">🔮 召唤物</span>
      <button class="summon-side-minimize" onclick="toggleSummonSideMinimize()">−</button>
    </div>
    <div class="summon-side-content"></div>
  `;
  
  const content = container.querySelector('.summon-side-content');
  
  // 如果没有召唤物，显示空位提示
  if (battle.summons.length === 0) {
    container.innerHTML += `<div class="summon-empty">召唤位: 0/${CONFIG.SUMMON.MAX_SLOTS}</div>`;
    return;
  }
  
  battle.summons.forEach(summon => {
    renderSummonUnit(container, summon);
  });
  
  // 显示召唤位使用情况
  container.innerHTML += `<div class="summon-slots">召唤位: ${battle.summons.length}/${CONFIG.SUMMON.MAX_SLOTS}</div>`;
}

// 渲染单个召唤物单位
function renderSummonUnit(container, summon) {
  const hpPercent = Math.max(0, (summon.currentHp / summon.maxHp) * 100);
  const isLow = hpPercent < 30;
  const isDead = summon.currentHp <= 0;
  const isActing = battle.turnOrder[battle.currentTurn] === summon;
  
  const div = document.createElement('div');
  div.className = `battle-unit summon ${isDead ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
  div.id = `unit-${summon.id}`;
  
  // 召唤物使用特殊图标
  // 召唤物头像：优先使用Spine，否则用emoji
  let avatarHtml;
  if (summon.spine && summon.spine.skel && summon.spine.atlas) {
    avatarHtml = createSpineMedia(summon, summon.id, 'summon-spine', 60, 70);
  } else {
    avatarHtml = `<div class="summon-avatar">🔮</div>`;
  }
  
  // 显示召唤者信息
  
  // buff显示
  let buffText = '';
  if (summon.buffs) {
    const buffList = [];
    if (summon.buffs.atkPercent > 0) buffList.push(`ATK+${summon.buffs.atkPercent}%`);
    if (summon.buffs.spdFlat > 0) buffList.push(`SPD+${summon.buffs.spdFlat}`);
    if (summon.buffs.healPerTurn > 0) buffList.push(`回血${summon.buffs.healPerTurn}%`);
    if (summon.buffs.doubleAttack) buffList.push('二连击');
    if (summon.buffs.stunOnHit) buffList.push('附带眩晕');
    if (buffList.length > 0) {
      buffText = `<div class="summon-buffs">${buffList.join(' | ')}</div>`;
    }
  }
  
  const infoHtml = `
    <div class="unit-info">
      <div class="unit-name">${summon.name}</div>
      <div class="hp-bar">
        <div class="hp-bar-fill ${isLow ? 'low' : ''}" style="width:${hpPercent}%"></div>
      </div>
      <div class="unit-stats">
        HP:${Math.max(0, summon.currentHp)}/${summon.maxHp} | ATK:${SummonSystem.getSummonAtk(summon)} | SPD:${SummonSystem.getSummonSpd(summon)}
      </div>
      ${buffText}
    </div>
  `;
  
  div.innerHTML = avatarHtml + infoHtml;
  container.appendChild(div);
}

// 更新召唤物区域
function updateSummonsSide() {
  let container = document.getElementById('summon-side');
  
  if (!container) {
    renderSummonsSideInitial();
    return;
  }
  
  // 检查是否有新召唤物需要添加
  const existingIds = new Set();
  container.querySelectorAll('.battle-unit.summon').forEach(el => {
    const id = el.id.replace('unit-', '');
    existingIds.add(id);
  });
  
  // 移除已死亡的召唤物
  container.querySelectorAll('.battle-unit.summon').forEach(el => {
    const id = el.id.replace('unit-', '');
    const summon = battle.summons.find(s => s.id === id);
    if (!summon || summon.currentHp <= 0) {
      el.remove();
    }
  });

  // 添加新召唤物
  battle.summons.forEach(summon => {
    if (summon.currentHp > 0 && !existingIds.has(summon.id)) {
      // 创建临时容器
      const tempContainer = document.createElement('div');
      renderSummonUnit(tempContainer, summon);
      const newUnit = tempContainer.firstChild;
      
      // 插入到 summon-slots 之前
      const slotsDiv = container.querySelector('.summon-slots');
      if (slotsDiv && newUnit) {
        container.insertBefore(newUnit, slotsDiv);
      } else if (newUnit) {
        container.appendChild(newUnit);
      }
    }
  });

  
  // 更新现有召唤物状态
  battle.summons.forEach(summon => {
    const div = document.getElementById(`unit-${summon.id}`);
    if (!div || summon.currentHp <= 0) return;
    
    const hpPercent = Math.max(0, (summon.currentHp / summon.maxHp) * 100);
    const isLow = hpPercent < 30;
    const isActing = battle.turnOrder[battle.currentTurn] === summon;
    
    div.className = `battle-unit summon ${summon.currentHp <= 0 ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
    
    const hpFill = div.querySelector('.hp-bar-fill');
    if (hpFill) {
      hpFill.style.width = `${hpPercent}%`;
      hpFill.className = `hp-bar-fill ${isLow ? 'low' : ''}`;
    }
    
    // 更新数值
    const stats = div.querySelector('.unit-stats');
    if (stats) {
      stats.innerHTML = `HP:${Math.max(0, summon.currentHp)}/${summon.maxHp} | ATK:${SummonSystem.getSummonAtk(summon)} | SPD:${SummonSystem.getSummonSpd(summon)}`;
    }
    
    // 更新buff显示
    let buffText = '';
    if (summon.buffs) {
      const buffList = [];
      if (summon.buffs.atkPercent > 0) buffList.push(`ATK+${summon.buffs.atkPercent}%`);
      if (summon.buffs.spdFlat > 0) buffList.push(`SPD+${summon.buffs.spdFlat}`);
      if (summon.buffs.healPerTurn > 0) buffList.push(`回血${summon.buffs.healPerTurn}%`);
      if (summon.buffs.doubleAttack) buffList.push('二连击');
      if (summon.buffs.stunOnHit) buffList.push('附带眩晕');
      buffText = buffList.join(' | ');
    }
    
    let buffsDiv = div.querySelector('.summon-buffs');
    if (buffText) {
      if (buffsDiv) {
        buffsDiv.textContent = buffText;
      } else {
        const info = div.querySelector('.unit-info');
        if (info) {
          const newBuffDiv = document.createElement('div');
          newBuffDiv.className = 'summon-buffs';
          newBuffDiv.textContent = buffText;
          info.appendChild(newBuffDiv);
        }
      }
    } else if (buffsDiv) {
      buffsDiv.remove();
    }
  });
  
  // 更新召唤位显示
  let slotsDiv = container.querySelector('.summon-slots');
  if (!slotsDiv) {
    slotsDiv = document.createElement('div');
    slotsDiv.className = 'summon-slots';
    container.appendChild(slotsDiv);
  }

  const aliveSummons = battle.summons.filter(s => s.currentHp > 0).length;
  let countdownText = '';

  // 获取召唤倒计时
  const summoners = battle.allies.filter(a => a.isSummoner && a.currentHp > 0);
  if (summoners.length > 0 && typeof SummonSystem !== 'undefined') {
    const countdown = SummonSystem.getSummonCountdown(summoners[0]);
    if (countdown) {
      if (countdown.full) {
        countdownText = ' | 已满';
      } else {
        countdownText = ` | ${countdown.text}`;
      }
    }
  }

  slotsDiv.textContent = `召唤位: ${aliveSummons}/${CONFIG.SUMMON.MAX_SLOTS}${countdownText}`;
  
  // 如果没有召唤物，显示空位
  let emptyDiv = container.querySelector('.summon-empty');
  if (battle.summons.length === 0) {
    if (!emptyDiv) {
      emptyDiv = document.createElement('div');
      emptyDiv.className = 'summon-empty';
      const h3 = container.querySelector('h3');
      if (h3) h3.after(emptyDiv);
    }
    emptyDiv.textContent = `召唤位: 0/${CONFIG.SUMMON.MAX_SLOTS}`;
    if (slotsDiv) slotsDiv.remove();
  } else if (emptyDiv) {
    emptyDiv.remove();
  }
}

// 首次渲染一侧单位
function renderBattleSideInitial(containerId, units, title, isEnemy) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<h3>${title}</h3>`;
  
  units.forEach(unit => {
    const hpPercent = Math.max(0, (unit.currentHp / unit.maxHp) * 100);
    const energyPercent = Math.max(0, (unit.energy / unit.maxEnergy) * 100);
    const isLow = hpPercent < 30;
    const isDead = unit.currentHp <= 0;
    const isActing = battle.turnOrder[battle.currentTurn] === unit;
    
    const div = document.createElement('div');
    div.className = `battle-unit ${isEnemy ? 'enemy' : ''} ${isDead ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
    div.id = `unit-${unit.unitId}`;
    
    const charData = CHARACTER_DATA[unit.name];
    let avatarHtml;
    
    // 获取时装spine（如果有）
    let spineData = charData?.spine;
    if (!isEnemy && charData && charData.id && typeof SkinSystem !== 'undefined') {
      spineData = SkinSystem.getCurrentSpine(charData.id, charData.spine);
    }
    const renderData = charData ? { ...charData, spine: spineData } : null;
    
    if (!isEnemy && renderData && spineData && spineData.skel && spineData.atlas) {
      avatarHtml = createSpineMedia(renderData, unit.name, 'unit-spine', 100, 120);
      renderedSpineUnits.add(unit.unitId);
    } else {
      const emoji = isEnemy ? '👹' : '👤';
      avatarHtml = `<div class="img-placeholder" style="width:100px;height:120px;display:flex;align-items:center;justify-content:center;font-size:32px;">${emoji}</div>`;
    }
    
    // 队长标识
    const leaderBadge = unit.isLeader ? '<div class="battle-leader-badge">👑队长</div>' : '';
    
    // 词缀显示（仅敌人）
    let affixHtml = '';
    if (isEnemy && unit.affixes && unit.affixes.length > 0) {
      const affixIcons = unit.affixes.map(affix => {
        const data = CONFIG.AFFIX?.TYPES?.[affix];
        return data ? data.icon : '';
      }).join('');
      const affixTooltip = getAffixTooltipText(unit.affixes);
      affixHtml = `<div class="unit-affixes" title="${affixTooltip}">${affixIcons}</div>`;
    }
    
    let infoHtml = `
      <div class="unit-info">
        <div class="unit-name">${unit.name}${affixHtml}</div>
        <div class="hp-bar">
          <div class="hp-bar-fill ${isLow ? 'low' : ''}" style="width:${hpPercent}%"></div>
        </div>
    `;
    
    // 我方显示能量条
    if (!isEnemy) {
      infoHtml += `
        <div class="energy-bar">
          <div class="energy-bar-fill" style="width:${energyPercent}%"></div>
        </div>
      `;
    }
    
    // 敌方显示护盾
    let shieldText = '';
    if (isEnemy && unit.shield > 0) {
      if (unit.shieldBroken) {
        shieldText = ' | 🛡️<span class="shield-broken">已破</span>';
      } else {
        shieldText = ` | 🛡️${unit.currentShield}/${unit.shield}`;
      }
    }
    
    // 获取buff显示（使用召唤物风格）
    let buffText = '';
    const buffList = [];
    if (unit.buffAtk && unit.buffAtk > 0) buffList.push(`ATK+${unit.buffAtk}`);
    if (unit.buffAtkPercent && unit.buffAtkPercent > 0) buffList.push(`ATK+${unit.buffAtkPercent}%`);
    if (unit.buffSpd && unit.buffSpd > 0) buffList.push(`SPD+${unit.buffSpd}`);
    if (unit.buffDef && unit.buffDef > 0) buffList.push(`DEF+${unit.buffDef}`);
    if (unit.dodgeChance && unit.dodgeChance > 0) buffList.push(`闪避${unit.dodgeChance}%`);
    if (unit.healPerTurn && unit.healPerTurn > 0) {
      const dur = unit.healPerTurnDuration || '';
      buffList.push(`回血${unit.healPerTurn}%${dur ? `(${dur}回合)` : ''}`);
    }
    
    // 显示持续性buff（圣域等）
    if (unit.durationBuffs && unit.durationBuffs.length > 0) {
      unit.durationBuffs.forEach(buff => {
        let statName = buff.stat === 'dodge' ? '闪避' : buff.stat.toUpperCase();
        if (buff.stat !== 'def' && buff.stat !== 'dodge') {
          buffList.push(`${statName}+${buff.value}(${buff.duration}回合)`);
        }
      });
    }
    
    // debuff
    if (unit.buffSpd && unit.buffSpd < 0) {
      const dur = unit.spdDebuffDuration || '';
      buffList.push(`SPD${unit.buffSpd}${dur ? `(${dur}回合)` : ''}`);
    }
    if (unit.stunDuration && unit.stunDuration > 0) buffList.push(`💫眩晕(${unit.stunDuration}回合)`);
    if (unit.shieldBroken) buffList.push(`💥DEF归零`);
    
    if (buffList.length > 0) {
      buffText = `<div class="summon-buffs">${buffList.join(' | ')}</div>`;
    }
    
    infoHtml += `
        <div class="unit-stats">
          HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}
          ${!isEnemy ? ` | ⚡${unit.energy}` : ''}
          | ATK:${getUnitAtkDisplay(unit)} | DEF:${getUnitDefDisplay(unit)} | SPD:${getUnitSpd(unit)}
          ${shieldText}
        </div>
        ${buffText}
      </div>
    `;
    
    div.innerHTML = leaderBadge + avatarHtml + infoHtml;
    container.appendChild(div);
  });
}

// 更新一侧单位
function updateBattleSide(units, isEnemy) {
  units.forEach(unit => {
    const div = document.getElementById(`unit-${unit.unitId}`);
    if (!div) return;
    
    const hpPercent = Math.max(0, (unit.currentHp / unit.maxHp) * 100);
    const energyPercent = Math.max(0, (unit.energy / unit.maxEnergy) * 100);
    const isLow = hpPercent < 30;
    const isDead = unit.currentHp <= 0;
    const isActing = battle.turnOrder[battle.currentTurn] === unit;
    
    div.className = `battle-unit ${isEnemy ? 'enemy' : ''} ${isDead ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
    
    const hpFill = div.querySelector('.hp-bar-fill');
    if (hpFill) {
      hpFill.style.width = `${hpPercent}%`;
      hpFill.className = `hp-bar-fill ${isLow ? 'low' : ''}`;
    }
    
    if (!isEnemy) {
      const energyFill = div.querySelector('.energy-bar-fill');
      if (energyFill) {
        energyFill.style.width = `${energyPercent}%`;
      }
    }
    
    // 更新护盾显示
    let shieldText = '';
    if (isEnemy && unit.shield > 0) {
      if (unit.shieldBroken) {
        shieldText = ' | 🛡️<span class="shield-broken">已破</span>';
      } else {
        shieldText = ` | 🛡️${unit.currentShield}/${unit.shield}`;
      }
    }
    
    // 我方单位显示临时护盾
    let tempShieldText = '';
    if (!isEnemy && unit.tempShield && unit.tempShield > 0) {
      tempShieldText = ` | 🔰护盾:${unit.tempShield}`;
    }
    
    // 显示充能技能（如法术护盾）
    let chargeText = '';
    if (!isEnemy && unit.chargeSkills) {
      const chargeInfo = [];
      for (const [skillName, data] of Object.entries(unit.chargeSkills)) {
        const skill = SKILL_EFFECTS[skillName];
        if (skill && skill.maxCharges) {
          chargeInfo.push(`${skillName.slice(0,2)}:${data.charges}/${skill.maxCharges}`);
        }
      }
      if (chargeInfo.length > 0) {
        chargeText = ` | ⚡${chargeInfo.join(' ')}`;
      }
    }
    
    // 显示圣域模式
    let sanctuaryText = '';
    if (!isEnemy && unit.sanctuaryMode) {
      sanctuaryText = ' | 🌟圣域';
    }
    
    // 更新完整属性显示
    const stats = div.querySelector('.unit-stats');
    if (stats) {
      stats.innerHTML = `HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}${!isEnemy ? ` | ⚡${unit.energy}` : ''} | ATK:${getUnitAtkDisplay(unit)} | DEF:${getUnitDefDisplay(unit)} | SPD:${getUnitSpd(unit)}${shieldText}${tempShieldText}${chargeText}${sanctuaryText}`;
    }
    
    // 更新buff显示（使用召唤物风格）
    const buffList = [];
    if (unit.buffAtk && unit.buffAtk > 0) buffList.push(`ATK+${unit.buffAtk}`);
    if (unit.buffAtkPercent && unit.buffAtkPercent > 0) buffList.push(`ATK+${unit.buffAtkPercent}%`);
    if (unit.buffSpd && unit.buffSpd > 0) buffList.push(`SPD+${unit.buffSpd}`);
    if (unit.buffDef && unit.buffDef > 0) buffList.push(`DEF+${unit.buffDef}`);
    if (unit.dodgeChance && unit.dodgeChance > 0) buffList.push(`闪避${unit.dodgeChance}%`);
    if (unit.healPerTurn && unit.healPerTurn > 0) {
      const dur = unit.healPerTurnDuration || '';
      buffList.push(`回血${unit.healPerTurn}%${dur ? `(${dur}回合)` : ''}`);
    }
    
    // 显示持续性buff（圣域等）
    if (unit.durationBuffs && unit.durationBuffs.length > 0) {
      unit.durationBuffs.forEach(buff => {
        let statName = buff.stat === 'dodge' ? '闪避' : buff.stat.toUpperCase();
        // 避免重复显示（已在上面单独显示的跳过）
        if (buff.stat !== 'def' && buff.stat !== 'dodge') {
          buffList.push(`${statName}+${buff.value}(${buff.duration}回合)`);
        }
      });
    }
    
    if (unit.buffSpd && unit.buffSpd < 0) {
      const dur = unit.spdDebuffDuration || '';
      buffList.push(`SPD${unit.buffSpd}${dur ? `(${dur}回合)` : ''}`);
    }
    if (unit.stunDuration && unit.stunDuration > 0) buffList.push(`💫眩晕(${unit.stunDuration}回合)`);
    if (unit.shieldBroken) buffList.push(`💥DEF归零`);
    
    let buffsDiv = div.querySelector('.summon-buffs');
    if (buffList.length > 0) {
      const buffText = buffList.join(' | ');
      if (buffsDiv) {
        buffsDiv.textContent = buffText;
      } else {
        const info = div.querySelector('.unit-info');
        if (info) {
          const newBuffDiv = document.createElement('div');
          newBuffDiv.className = 'summon-buffs';
          newBuffDiv.textContent = buffText;
          info.appendChild(newBuffDiv);
        }
      }
    } else if (buffsDiv) {
      buffsDiv.remove();
    }
  });
}

// ==================== 技能UI ====================

// 显示技能按钮
function showSkillButtons(unit) {
  const div = document.getElementById('skill-buttons');
  div.innerHTML = '';
  
  // 召唤物只有普攻
  const skills = unit.isSummon ? ['普攻'] : unit.skills;
  
  skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    if (!skill) return;
    
    // 计算实际消耗（队长技能可能减少消耗）
    let actualCost = skill.cost;
    let isLeaderBoosted = false;
    
    if (unit.isLeader && typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[unit.name]) {
      const bonus = LEADER_BONUS[unit.name];
      if (skillName === bonus.skill && bonus.costReduce) {
        actualCost = Math.max(0, skill.cost - bonus.costReduce);
        isLeaderBoosted = true;
      }
    }
    
    // 召唤物没有能量限制，普攻不消耗能量
    // 同时检查充能技能是否有充能
    const chargeOK = typeof canUseChargeSkill === 'function' ? 
      canUseChargeSkill(unit, skillName) : true;
    const canUse = unit.isSummon ? true : (unit.energy >= actualCost && chargeOK);
    
    const btn = document.createElement('button');
    btn.className = `skill-btn ${canUse ? '' : 'disabled'} ${isLeaderBoosted ? 'leader-boosted' : ''}`;
    
    // 添加技能悬浮提示
    let tooltip = `【${skillName}】\n`;
    tooltip += `消耗: ${actualCost} 能量 | 获得: ${skill.gain} 能量\n`;
    tooltip += `目标: ${skill.target === 'single' ? '单体敌人' : skill.target === 'all' ? '全体敌人' : skill.target === 'ally' ? '单体队友' : skill.target === 'self' ? '自身' : '全体'}`;
    if (skill.damage) tooltip += `\n伤害: ${skill.damage}% ATK`;
    if (skill.heal) tooltip += `\n治疗: ${skill.heal}% HP`;
    if (skill.stun) tooltip += `\n眩晕: ${skill.stun}回合`;
    if (skill.buff) tooltip += `\n增益: ATK+${skill.buff}%`;
    btn.title = tooltip;
    
    // 召唤物显示特殊标识
    if (unit.isSummon) {
      btn.innerHTML = `🔮 ${skillName}`;
    } else {
      btn.innerHTML = `
        ${isLeaderBoosted ? '👑' : ''}${skillName}
        <span class="skill-cost">${actualCost > 0 ? `⚡${actualCost}` : '+⚡30'}</span>
      `;
    }
    
    if (canUse) {
      btn.onclick = () => selectSkill(skillName, unit);
    }
    
    div.appendChild(btn);
  });
  
  document.getElementById('target-select').innerHTML = '';
}

// 选择技能
function selectSkill(skillName, unit) {
  const skill = SKILL_EFFECTS[skillName];
  if (!skill) return;
  
  battle.selectedSkill = {
    name: skillName,
    ...skill,
    user: unit
  };
  
  if (skill.target === 'single') {
    showEnemyTargetSelect();
  } else if (skill.target === 'ally') {
    showAllyTargetSelect(unit);
  } else {
    executePlayerSkill(battle.selectedSkill, null);
  }
}

// 显示敌人目标选择（支持点击单位）
function showEnemyTargetSelect() {
  const div = document.getElementById('target-select');
  div.innerHTML = '<span>选择目标：（可点击敌方单位）</span>';
  
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  
  // 检查是否有嘲讽词缀的敌人
  const tauntEnemies = aliveEnemies.filter(e => 
    e.affixes && e.affixes.includes('taunt')
  );
  const hasTaunt = tauntEnemies.length > 0;
  
  // 给敌方单位添加点击事件
  aliveEnemies.forEach(enemy => {
    const unitDiv = document.getElementById(`unit-${enemy.unitId}`);
    if (unitDiv) {
      const isTauntEnemy = enemy.affixes && enemy.affixes.includes('taunt');
      const isDisabled = hasTaunt && !isTauntEnemy;
      
      if (!isDisabled) {
        unitDiv.classList.add('selectable');
        unitDiv.onclick = () => {
          clearUnitSelection();
          executePlayerSkill(battle.selectedSkill, enemy);
        };
      } else {
        unitDiv.classList.add('disabled-target');
      }
    }
  });
  
  aliveEnemies.forEach(enemy => {
    let shieldInfo = '';
    if (enemy.shield > 0) {
      if (enemy.shieldBroken) {
        shieldInfo = ' 💥已破';
      } else {
        shieldInfo = ` 🛡️${enemy.currentShield}/${enemy.shield}`;
      }
    }
    
    // 检查这个敌人是否可选（有嘲讽敌人时，只能选嘲讽目标）
    const isTauntEnemy = enemy.affixes && enemy.affixes.includes('taunt');
    const isDisabled = hasTaunt && !isTauntEnemy;
    
    const btn = document.createElement('button');
    btn.className = `target-btn ${isDisabled ? 'disabled' : ''} ${isTauntEnemy ? 'taunt-target' : ''}`;
    
    // 显示嘲讽标识
    const tauntIcon = isTauntEnemy ? '😠 ' : '';
    const disabledText = isDisabled ? ' (被嘲讽)' : '';
    btn.textContent = `${tauntIcon}${enemy.name} (HP:${enemy.currentHp}${shieldInfo})${disabledText}`;
    
    if (!isDisabled) {
      btn.onclick = () => executePlayerSkill(battle.selectedSkill, enemy);
    }
    
    div.appendChild(btn);
  });
  
  // 如果有嘲讽敌人，显示提示
  if (hasTaunt) {
    const hint = document.createElement('div');
    hint.className = 'taunt-hint';
    hint.textContent = '😠 必须先击败嘲讽目标！';
    div.insertBefore(hint, div.firstChild.nextSibling);
  }
}

// 显示队友目标选择（包含召唤物）
function showAllyTargetSelect(currentUnit) {
  const div = document.getElementById('target-select');
  div.innerHTML = '<span>选择队友：</span>';
  
  // 我方干员
  battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
    const btn = document.createElement('button');
    btn.className = 'target-btn ally';
    btn.textContent = `${ally.name} (HP:${ally.currentHp})`;
    btn.onclick = () => executePlayerSkill(battle.selectedSkill, ally);
    div.appendChild(btn);
  });
  
  // 我方召唤物
  battle.summons.filter(s => s.currentHp > 0).forEach(summon => {
    const btn = document.createElement('button');
    btn.className = 'target-btn ally summon';
    btn.textContent = `🔮${summon.name} (HP:${summon.currentHp})`;
    btn.onclick = () => executePlayerSkill(battle.selectedSkill, summon);
    div.appendChild(btn);
  });
}

// ==================== 技能执行（玩家） ====================

// 执行玩家技能
function executePlayerSkill(skill, target) {
  const user = skill.user;
  
  // 召唤物不消耗能量
  if (!user.isSummon) {
    // 计算实际消耗（队长技能可能减少消耗）
    let actualCost = skill.cost;
    if (user.isLeader && typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[user.name]) {
      const bonus = LEADER_BONUS[user.name];
      if (skill.name === bonus.skill && bonus.costReduce) {
        actualCost = Math.max(0, skill.cost - bonus.costReduce);
      }
    }
    
    // 消耗和获得能量
    user.energy -= actualCost;
    user.energy = Math.min(user.maxEnergy, user.energy + skill.gain);
    
    // 消耗充能技能的充能
    if (typeof consumeCharge === 'function') {
      consumeCharge(user, skill.name);
    }
  }
  
  // 清空UI
  document.getElementById('skill-buttons').innerHTML = '';
  document.getElementById('target-select').innerHTML = '';
  
  // 播放技能动画
  if (typeof playSkillAnimation === 'function') {
    playSkillAnimation(user.name, skill.name);
  }
  
  // 在 addBattleLog(`${user.name} 使用【${skill.name}】`, 'system'); 之前添加

  // ====== 新增：记录玩家行动给SmartAI ======
  if (battle.isEndless && typeof SmartAI_Battle !== 'undefined') {
    SmartAI_Battle.recordPlayerSkill(user, skill.name, target);
  }
  // ====== 新增结束 ======

  // 日志（区分召唤物）
  const unitPrefix = user.isSummon ? '🔮' : '';
  addBattleLog(`${unitPrefix}${user.name} 使用【${skill.name}】`, 'system');
  
  // 执行技能效果，获取结果
  const result = executeSkillEffects(skill, user, target, false);
  
  // 处理结果
  handleSkillResult(result);
  
  // 检查死亡
  checkDeaths();
  
  // ====== 回合结束处理：buff持续时间递减 ======
  processUnitTurnEnd(user);
  
  // 进入下一回合
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 处理单位回合结束（buff持续时间递减）
function processUnitTurnEnd(unit) {
  // 召唤物的buff持续时间递减
  if (unit.isSummon && typeof SummonSystem !== 'undefined') {
    const result = SummonSystem.onSummonTurnEnd(unit);
    if (result && result.expiredBuffs && result.expiredBuffs.length > 0) {
      result.expiredBuffs.forEach(buff => {
        addBattleLog(`  → 🔮${unit.name} 的${buff.name}效果结束！`, 'system');
      });
    }
  }
  
  // 干员的healPerTurn持续时间递减
  if (!unit.isEnemy && !unit.isSummon) {
    if (unit.healPerTurnDuration && unit.healPerTurnDuration > 0) {
      unit.healPerTurnDuration--;
      if (unit.healPerTurnDuration <= 0) {
        unit.healPerTurn = 0;
        addBattleLog(`  → ${unit.name} 的每回合回血效果结束！`, 'system');
      }
    }
  }
}

// 处理技能执行结果
function handleSkillResult(result) {
  // 输出日志
  result.logs.forEach(log => {
    addBattleLog(log.text, log.type);
  });
}

// ==================== 死亡检查 ====================

// 检查所有单位死亡状态
function checkDeaths() {
  // 检查敌人死亡（含词缀处理）
  const deadEnemies = battle.enemies.filter(e => e.currentHp <= 0 && !e.deathLogged);
  deadEnemies.forEach(enemy => {
    enemy.deathLogged = true;
    
    // 处理死亡词缀（爆炸、分裂）
    if (typeof processAffixOnDeath === 'function' && enemy.affixes && enemy.affixes.length > 0) {
      const result = { logs: [] };
      const newUnits = processAffixOnDeath(enemy, result);
      
      // 输出词缀效果日志
      result.logs.forEach(log => addBattleLog(log.text, log.type));
      
      // 添加分裂单位到敌人列表
      if (newUnits && newUnits.length > 0) {
        battle.enemies.push(...newUnits);
        calculateTurnOrder();  // 重新计算行动顺序
      }
    }
    
    addBattleLog(`💀 ${enemy.name} 被击败！`, 'system');
  });
  
  // 检查普通干员死亡
  const deadAllies = battle.allies.filter(a => a.currentHp <= 0 && !a.deathLogged);
  deadAllies.forEach(ally => {
    // 检查免死金牌（Roguelike强化）
    if (ally.hasExtraLife && !ally.extraLifeUsed) {
      ally.extraLifeUsed = true;
      ally.currentHp = Math.floor(ally.maxHp * 0.3);  // 恢复30%HP
      addBattleLog(`💖 ${ally.name} 触发【额外生命】！复活并恢复30%HP！`, 'system');
      return;  // 不标记为死亡，跳过
    }
    
    ally.deathLogged = true;
    addBattleLog(`💔 ${ally.name} 倒下了！`, 'system');
    
    // 如果是召唤者，处理召唤物联动消失
    if (ally.isSummoner) {
      const summons = SummonSystem.getSummonsByOwner(ally);
      if (summons.length > 0) {
        addBattleLog(`${ally.name} 的召唤物一同消失！`, 'system');
        SummonSystem.onOwnerDeath(ally);
      }
    }
  });
  
  // 检查召唤物死亡（直接从 SummonSystem.summons 检查，不是 battle.summons）
  if (typeof SummonSystem !== 'undefined') {
    const deadSummons = SummonSystem.summons.filter(s => s.currentHp <= 0 && !s.deathLogged);
    deadSummons.forEach(summon => {
      summon.deathLogged = true;
      addBattleLog(`🔮 ${summon.name} 被消灭！`, 'system');
      SummonSystem.onSummonDeath(summon);
    });
  }
  
  // 最后再同步召唤物状态
  syncSummons();
}

// ==================== 回合控制 ====================

// 下一回合
function nextTurn() {
  if (!battle.active) return;
  
  // 同步召唤物
  syncSummons();
  
  const aliveAllies = battle.allies.filter(u => u.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(u => u.currentHp > 0);
  const aliveSummons = battle.summons.filter(s => s.currentHp > 0);
  
  if (aliveEnemies.length === 0) {
    endBattle(true);
    return;
  }
  if (aliveAllies.length === 0 && aliveSummons.length === 0) {
    endBattle(false);
    return;
  }
  
  if (battle.currentTurn >= battle.turnOrder.length) {
    calculateTurnOrder();
    battle.currentTurn = 0;
    addBattleLog('--- 新回合 ---', 'system');
  }
  
  let current = battle.turnOrder[battle.currentTurn];
  
  // 跳过死亡单位
  while (current && (current.currentHp <= 0)) {
    battle.currentTurn++;
    if (battle.currentTurn >= battle.turnOrder.length) {
      setTimeout(() => nextTurn(), 500);
      return;
    }
    current = battle.turnOrder[battle.currentTurn];
  }
  
  if (!current) {
    setTimeout(() => nextTurn(), 500);
    return;
  }
  
  // ====== 干员每回合回血处理（生态耦合等技能） ======
  if (!current.isEnemy && !current.isSummon && current.healPerTurn && current.healPerTurn > 0) {
    const healAmount = Math.floor(current.maxHp * current.healPerTurn / 100);
    const oldHp = current.currentHp;
    current.currentHp = Math.min(current.maxHp, current.currentHp + healAmount);
    const actualHeal = current.currentHp - oldHp;
    
    if (actualHeal > 0) {
      addBattleLog(`  💚 ${current.name} 回复 ${actualHeal} HP！`, 'heal');
    }
    
    // 注意：持续时间递减已移至回合结束时处理（executePlayerSkill中）
  }
  
  // ====== 处理充能技能（夜莺法术护盾等） ======
  if (!current.isEnemy && !current.isSummon && typeof processChargeSkills === 'function') {
    const chargeLogs = processChargeSkills(current);
    chargeLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 处理持续buff（圣域DEF/闪避等） ======
  if (!current.isEnemy && !current.isSummon && typeof processDurationBuffs === 'function') {
    const buffLogs = processDurationBuffs(current);
    buffLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 召唤物回合开始处理 ======
  if (current.isSummon) {
    // 处理召唤物回合开始效果（如回血）
    const result = SummonSystem.onSummonTurnStart(current);
    if (result && result.healed > 0) {
      addBattleLog(`🔮${current.name} 回复了 ${result.healed} HP`, 'heal');
    }
    
    renderBattle();
    showSkillButtons(current);
    return;
  }
  
  // ====== 召唤师回合开始处理 ======
  if (current.isSummoner && !current.isEnemy) {
    const newSummons = SummonSystem.onSummonerTurnStart(current);
    newSummons.forEach(summon => {
      addBattleLog(`🔮 ${current.name} 召唤了【${summon.name}】！`, 'system');
    });
    
    // 同步并重新计算行动顺序（新召唤物需要加入）
    if (newSummons.length > 0) {
      syncSummons();
      calculateTurnOrder();
      renderBattle();
    }
  }
  
  // 处理眩晕
  if (current.stunDuration > 0) {
    current.stunDuration--;
    addBattleLog(`${current.name} 处于眩晕状态，跳过行动！`, 'system');
    // 眩晕时不恢复护盾，只跳过行动
    renderBattle();
    battle.currentTurn++;
    setTimeout(() => nextTurn(), 800);
    return;
  }
  
  // 正常行动开始时，检查是否需要恢复护盾
  if (current.shieldBroken) {
    current.shieldBroken = false;
    current.currentShield = current.shield;
    current.def = current.originalDef;
    addBattleLog(`${current.name} 护盾恢复！`, 'system');
  }
  
  renderBattle();
  
  if (current.isEnemy) {
    setTimeout(() => enemyTurn(current), 800);
  } else {
    showSkillButtons(current);
  }
}

// 敌人回合
function enemyTurn(enemy) {
  const aliveAllies = battle.allies.filter(a => a.currentHp > 0);
  const aliveSummons = battle.summons.filter(s => s.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  
  // ====== 处理敌人回合开始的词缀效果 ======
  if (typeof processAffixTurnStart === 'function' && enemy.affixes && enemy.affixes.length > 0) {
    const affixResult = { logs: [] };
    processAffixTurnStart(enemy, affixResult);
    affixResult.logs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // ====== 处理敌人身上的持续debuff ======
  if (typeof processDurationDebuffs === 'function' && enemy.durationDebuffs && enemy.durationDebuffs.length > 0) {
    const debuffLogs = processDurationDebuffs(enemy);
    debuffLogs.forEach(log => addBattleLog(log.text, log.type));
  }
  
  // 合并所有我方目标（干员+召唤物）
  const allTargets = [...aliveAllies, ...aliveSummons];
  
  if (allTargets.length === 0) return;
  
  // 获取敌人决策(修改后)
  let decision;
  if (battle.isEndless && typeof EndlessMode !== 'undefined') {
    decision = EndlessMode.getEnemyDecision(enemy, aliveAllies, aliveEnemies);
  } else {
    decision = getEnemyDecision(enemy, aliveAllies, aliveEnemies);
  }

  // 日志
  addBattleLog(`${enemy.name}【${decision.strategy}·${decision.skill.name}】`, 'system');
  
  // 执行技能效果
  const result = executeSkillEffects(decision.skill, enemy, decision.target, true);
  
  // 处理结果
  handleSkillResult(result);
  
  // 检查死亡
  checkDeaths();
  
  // 进入下一回合
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// ==================== 战斗结束 ====================

// 结束战斗
function endBattle(victory) {
  battle.active = false;
  renderedSpineUnits.clear();

  // 切换回主界面BGM
  AudioManager.playBGM('main');

  // ====== 新增：无尽模式处理 ======
  if (battle.isEndless && typeof EndlessMode !== 'undefined') {
    if (victory) {
      EndlessMode.onVictory();
    } else {
      EndlessMode.onDefeat();
    }
    return;  // 无尽模式有自己的弹窗，直接返回
  }

  // 清理召唤系统
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.clear();
  }
  
  if (victory) {
    const rewards = battle.stage.rewards;
    state.gold += rewards.gold;
    state.tickets += rewards.tickets;
    
    if (!state.clearedStages.includes(battle.stage.id)) {
      state.clearedStages.push(battle.stage.id);
    }
    
    saveState();
    updateResourceUI();
    
    showModal('🎉 战斗胜利！', `
      <p>金币 +${rewards.gold}</p>
      <p>抽卡券 +${rewards.tickets}</p>
      <button class="btn btn-primary" onclick="closeModal(); closeBattleField();">确定</button>
    `, false);
  } else {
    showModal('💀 战斗失败', `
      <p>队伍全灭，请重整旗鼓！</p>
      <button class="btn btn-primary" onclick="closeModal(); closeBattleField();">确定</button>
    `, false);
  }
}

// 清除单位选择状态
function clearUnitSelection() {
  document.querySelectorAll('.battle-unit.selectable').forEach(el => {
    el.classList.remove('selectable');
    el.onclick = null;
  });
  document.querySelectorAll('.battle-unit.disabled-target').forEach(el => {
    el.classList.remove('disabled-target');
  });
}

// 撤退
function fleeBattle() {
  battle.active = false;
  renderedSpineUnits.clear();
  
  // 切换回主界面BGM
  AudioManager.playBGM('main');
  
  // 清理召唤系统
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.clear();
  }
  
  addBattleLog('撤退了...', 'system');
  closeBattleField();
}
