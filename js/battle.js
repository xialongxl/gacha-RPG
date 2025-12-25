// ==================== 战斗系统 ====================

// 已渲染的Spine容器ID记录
const renderedSpineUnits = new Set();

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
  
  resetBattle();
  renderedSpineUnits.clear();
  battle.active = true;
  battle.stage = stage;
  
  battle.allies = team.map((name, index) => {
    const data = CHARACTER_DATA[name];
    const potential = state.inventory[name]?.potential || 1;
    return {
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
      stunDuration: 0,
      isEnemy: false,
      isLeader: index === 0,
      unitId: `ally-${name}-${Date.now()}-${index}`
    };
  });
  
  battle.enemies = stage.enemies.map((e, idx) => ({
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
    stunDuration: 0,
    shield: e.shield || 0,
    currentShield: e.shield || 0,
    shieldBroken: false,
    originalDef: e.def,
    isEnemy: true,
    unitId: `enemy-${e.name}-${idx}-${Date.now()}`
  }));
  
  document.getElementById('stage-panel').style.display = 'none';
  document.getElementById('battle-field').classList.add('active');
  
  addBattleLog('⚔️ 战斗开始！', 'system');
  calculateTurnOrder();
  battle.currentTurn = 0;
  
  renderBattleInitial();
  setTimeout(() => nextTurn(), 500);
}

// 计算行动顺序
function calculateTurnOrder() {
  const allUnits = [...battle.allies, ...battle.enemies].filter(u => u.currentHp > 0);
  battle.turnOrder = allUnits.sort((a, b) => b.spd - a.spd);
}

// ==================== AT条系统 ====================

// 渲染AT条
function renderATBar() {
  const container = document.getElementById('at-bar-units');
  if (!container) return;
  
  container.innerHTML = '';
  
  const allUnits = [...battle.allies, ...battle.enemies].filter(u => u.currentHp > 0);
  const sorted = allUnits.sort((a, b) => b.spd - a.spd);
  
  const displayCount = Math.min(8, sorted.length);
  
  for (let i = 0; i < displayCount; i++) {
    const unit = sorted[i];
    const isCurrent = (battle.turnOrder[battle.currentTurn] === unit);
    
    const div = document.createElement('div');
    div.className = `at-unit ${unit.isEnemy ? 'enemy' : 'ally'} ${isCurrent ? 'current' : ''}`;
    
    const icon = unit.isEnemy ? '👹' : (unit.isLeader ? '👑' : '👤');
    const stunIcon = unit.stunDuration > 0 ? '💫' : '';
    const shieldIcon = (unit.isEnemy && unit.shieldBroken) ? '💥' : '';
    
    div.innerHTML = `
      <div class="at-unit-icon">${icon}${stunIcon}${shieldIcon}</div>
      <div class="at-unit-name">${unit.name}</div>
      <div class="at-unit-spd">SPD ${unit.spd}</div>
    `;
    
    container.appendChild(div);
  }
}

// ==================== 战斗渲染 ====================

// 首次渲染战斗界面
function renderBattleInitial() {
  renderBattleSideInitial('ally-side', battle.allies, '我方', false);
  renderBattleSideInitial('enemy-side', battle.enemies, '敌方', true);
  renderBattleLog();
  renderATBar();
}

// 更新战斗界面
function renderBattle() {
  updateBattleSide(battle.allies, false);
  updateBattleSide(battle.enemies, true);
  renderBattleLog();
  renderATBar();
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
    
    if (!isEnemy && charData && charData.spine && charData.spine.skel && charData.spine.atlas) {
      avatarHtml = createSpineMedia(charData, unit.name, 'unit-spine', 100, 120);
      renderedSpineUnits.add(unit.unitId);
    } else {
      const emoji = isEnemy ? '👹' : '👤';
      avatarHtml = `<div class="img-placeholder" style="width:100px;height:120px;display:flex;align-items:center;justify-content:center;font-size:32px;">${emoji}</div>`;
    }
    
    // 队长标识
    const leaderBadge = unit.isLeader ? '<div class="battle-leader-badge">👑队长</div>' : '';
    
    let infoHtml = `
      <div class="unit-info">
        <div class="unit-name">${unit.name}</div>
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
    
    infoHtml += `
        <div class="unit-stats">
          HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}
          ${!isEnemy ? ` | ⚡${unit.energy}` : ''}
          ${shieldText}
        </div>
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
    
    const stats = div.querySelector('.unit-stats');
    if (stats) {
      stats.innerHTML = `HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}${!isEnemy ? ` | ⚡${unit.energy}` : ''}${shieldText}`;
    }
  });
}

// ==================== 技能UI ====================

// 显示技能按钮
function showSkillButtons(unit) {
  const div = document.getElementById('skill-buttons');
  div.innerHTML = '';
  
  unit.skills.forEach(skillName => {
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
    
    const canUse = unit.energy >= actualCost;
    
    const btn = document.createElement('button');
    btn.className = `skill-btn ${canUse ? '' : 'disabled'} ${isLeaderBoosted ? 'leader-boosted' : ''}`;
    btn.innerHTML = `
      ${isLeaderBoosted ? '👑' : ''}${skillName}
      <span class="skill-cost">${actualCost > 0 ? `⚡${actualCost}` : '+⚡30'}</span>
    `;
    
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
    showAllyTargetSelect();
  } else {
    executePlayerSkill(battle.selectedSkill, null);
  }
}

// 显示敌人目标选择
function showEnemyTargetSelect() {
  const div = document.getElementById('target-select');
  div.innerHTML = '<span>选择目标：</span>';
  
  battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
    let shieldInfo = '';
    if (enemy.shield > 0) {
      if (enemy.shieldBroken) {
        shieldInfo = ' 💥已破';
      } else {
        shieldInfo = ` 🛡️${enemy.currentShield}/${enemy.shield}`;
      }
    }
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.textContent = `${enemy.name} (HP:${enemy.currentHp}${shieldInfo})`;
    btn.onclick = () => executePlayerSkill(battle.selectedSkill, enemy);
    div.appendChild(btn);
  });
}

// 显示队友目标选择
function showAllyTargetSelect() {
  const div = document.getElementById('target-select');
  div.innerHTML = '<span>选择队友：</span>';
  
  battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
    const btn = document.createElement('button');
    btn.className = 'target-btn ally';
    btn.textContent = `${ally.name} (HP:${ally.currentHp})`;
    btn.onclick = () => executePlayerSkill(battle.selectedSkill, ally);
    div.appendChild(btn);
  });
}

// ==================== 技能执行（玩家） ====================

// 执行玩家技能
function executePlayerSkill(skill, target) {
  const user = skill.user;
  
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
  
  // 清空UI
  document.getElementById('skill-buttons').innerHTML = '';
  document.getElementById('target-select').innerHTML = '';
  
  // 播放技能动画
  if (typeof playSkillAnimation === 'function') {
    playSkillAnimation(user.name, skill.name);
  }
  
  addBattleLog(`${user.name} 使用【${skill.name}】`, 'system');
  
  // 执行技能效果，获取结果
  const result = executeSkillEffects(skill, user, target, false);
  
  // 处理结果
  handleSkillResult(result);
  
  // 进入下一回合
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 处理技能执行结果
function handleSkillResult(result) {
  // 输出日志
  result.logs.forEach(log => {
    addBattleLog(log.text, log.type);
  });
}

// ==================== 回合控制 ====================

// 下一回合
function nextTurn() {
  if (!battle.active) return;
  
  const aliveAllies = battle.allies.filter(u => u.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(u => u.currentHp > 0);
  
  if (aliveEnemies.length === 0) {
    endBattle(true);
    return;
  }
  if (aliveAllies.length === 0) {
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
  while (current && current.currentHp <= 0) {
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
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  
  if (aliveAllies.length === 0) return;
  
  // 获取敌人决策
  const decision = getEnemyDecision(enemy, aliveAllies, aliveEnemies);
  
  // 日志
  addBattleLog(`${enemy.name}【${decision.strategy}·${decision.skill.name}】`, 'system');
  
  // 执行技能效果
  const result = executeSkillEffects(decision.skill, enemy, decision.target, true);
  
  // 处理结果
  handleSkillResult(result);
  
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
    `);
  } else {
    showModal('💀 战斗失败', '<p>队伍全灭，请重整旗鼓！</p>');
  }
}

// 撤退
function fleeBattle() {
  battle.active = false;
  renderedSpineUnits.clear();
  addBattleLog('撤退了...', 'system');
  closeBattleField();
}