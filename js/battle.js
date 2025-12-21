// 战斗系统

// 更新关卡UI
function updateStageUI() {
  const list = document.getElementById('stage-list');
  list.innerHTML = '';
  
  STAGES.forEach(stage => {
    const btn = document.createElement('button');
    btn.className = 'stage-btn';
    btn.innerHTML = `
      <div><b>${stage.name}</b></div>
      <small>体力: ${stage.stamina} | 金币: ${stage.rewards.gold}</small>
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
  
  if (state.stamina < stage.stamina) {
    alert('体力不足！');
    return;
  }
  
  state.stamina -= stage.stamina;
  updateResourceUI();
  saveState();
  
  resetBattle();
  battle.active = true;
  battle.stage = stage;
  
  battle.allies = team.map(name => {
    const data = CHARACTER_DATA[name];
    return {
      name,
      rarity: data.rarity,
      hp: data.hp,
      atk: data.atk,
      def: data.def,
      spd: data.spd,
      skills: [...data.skills],
      currentHp: data.hp,
      maxHp: data.hp,
      energy: 0,
      maxEnergy: 100,
      buffAtk: 0,
      isEnemy: false
    };
  });
  
  battle.enemies = stage.enemies.map(e => ({
    name: e.name,
    hp: e.hp,
    atk: e.atk,
    def: e.def,
    spd: e.spd,
    skills: ['普攻'],
    currentHp: e.hp,
    maxHp: e.hp,
    energy: 0,
    maxEnergy: 100,
    buffAtk: 0,
    isEnemy: true
  }));
  
  document.getElementById('stage-panel').style.display = 'none';
  document.getElementById('battle-field').classList.add('active');
  
  addBattleLog('⚔️ 战斗开始！', 'system');
  calculateTurnOrder();
  battle.currentTurn = 0;
  renderBattle();
  setTimeout(() => nextTurn(), 500);
}

// 计算行动顺序
function calculateTurnOrder() {
  const allUnits = [...battle.allies, ...battle.enemies].filter(u => u.currentHp > 0);
  battle.turnOrder = allUnits.sort((a, b) => b.spd - a.spd);
}

// 渲染战斗界面
function renderBattle() {
  renderBattleSide('ally-side', battle.allies, '我方', false);
  renderBattleSide('enemy-side', battle.enemies, '敌方', true);
  renderBattleLog();
}

// 渲染一侧单位
function renderBattleSide(containerId, units, title, isEnemy) {
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
    
    let html = `
      <div class="unit-name">${unit.name}</div>
      <div class="hp-bar">
        <div class="hp-bar-fill ${isLow ? 'low' : ''}" style="width: ${hpPercent}%"></div>
      </div>
    `;
    
    if (!isEnemy) {
      html += `
        <div class="energy-bar">
          <div class="energy-bar-fill" style="width: ${energyPercent}%"></div>
        </div>
      `;
    }
    
    html += `
      <div class="unit-stats">
        HP: ${Math.max(0, unit.currentHp)} / ${unit.maxHp}
        ${!isEnemy ? ` | ⚡${unit.energy}` : ''}
      </div>
    `;
    
    div.innerHTML = html;
    container.appendChild(div);
  });
}

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
  
  renderBattle();
  
  if (current.isEnemy) {
    setTimeout(() => enemyAI(current), 800);
  } else {
    showSkillButtons(current);
  }
}

// 显示技能按钮
function showSkillButtons(unit) {
  const div = document.getElementById('skill-buttons');
  div.innerHTML = '';
  
  unit.skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    const canUse = unit.energy >= skill.cost;
    
    const btn = document.createElement('button');
    btn.className = `skill-btn ${canUse ? '' : 'disabled'}`;
    btn.innerHTML = `
      ${skillName}
      <span class="skill-cost">${skill.cost > 0 ? `⚡${skill.cost}` : '+⚡30'}</span>
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
    executeSkill(battle.selectedSkill, null);
  }
}

// 显示敌人目标选择
function showEnemyTargetSelect() {
  const div = document.getElementById('target-select');
  div.innerHTML = '<span>选择目标：</span>';
  
  battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.textContent = `${enemy.name} (HP:${enemy.currentHp})`;
    btn.onclick = () => executeSkill(battle.selectedSkill, enemy);
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
    btn.onclick = () => executeSkill(battle.selectedSkill, ally);
    div.appendChild(btn);
  });
}

// 执行技能
function executeSkill(skill, target) {
  const user = skill.user;
  const atk = user.atk + user.buffAtk;
  
  user.energy -= skill.cost;
  user.energy = Math.min(user.maxEnergy, user.energy + skill.gain);
  
  document.getElementById('skill-buttons').innerHTML = '';
  document.getElementById('target-select').innerHTML = '';
  
  switch (skill.type) {
    case 'damage':
      executeDamageSkill(skill, user, atk, target);
      break;
    case 'heal':
      executeHealSkill(skill, user, atk, target);
      break;
    case 'buff':
      executeBuffSkill(skill, user, atk);
      break;
  }
  
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 执行伤害技能
function executeDamageSkill(skill, user, atk, target) {
  const calcDamage = (t) => {
    const dmg = Math.floor(atk * skill.multiplier - t.def * 0.5);
    return Math.max(1, dmg);
  };
  
  const applyDamage = (t, dmg) => {
    t.currentHp -= dmg;
    if (!t.isEnemy) {
      t.energy = Math.min(t.maxEnergy, t.energy + 20);
    }
  };
  
  switch (skill.target) {
    case 'single':
      if (target) {
        const dmg = calcDamage(target);
        applyDamage(target, dmg);
        addBattleLog(`${user.name}【${skill.name}】→ ${target.name}，${dmg} 伤害！`, 'damage');
      }
      break;
      
    case 'all':
      battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
        const dmg = calcDamage(enemy);
        applyDamage(enemy, dmg);
        addBattleLog(`${user.name}【${skill.name}】→ ${enemy.name}，${dmg} 伤害！`, 'damage');
      });
      break;
      
    case 'random3':
    case 'random2':
      const times = skill.target === 'random3' ? 3 : 2;
      for (let i = 0; i < times; i++) {
        const alive = battle.enemies.filter(e => e.currentHp > 0);
        if (alive.length === 0) break;
        const t = alive[Math.floor(Math.random() * alive.length)];
        const dmg = calcDamage(t);
        applyDamage(t, dmg);
        addBattleLog(`${user.name} 攻击 ${t.name}，${dmg} 伤害！`, 'damage');
      }
      break;
  }
}

// 执行治疗技能
function executeHealSkill(skill, user, atk, target) {
  const healAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'ally':
      if (target) {
        target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt);
        addBattleLog(`${user.name} 治疗 ${target.name}，+${healAmt} HP！`, 'heal');
      }
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healAmt);
      });
      addBattleLog(`${user.name} 群疗，全体 +${healAmt} HP！`, 'heal');
      break;
  }
}

// 执行增益技能
function executeBuffSkill(skill, user, atk) {
  const buffAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'self':
      user.buffAtk += buffAmt;
      addBattleLog(`${user.name} 强化，ATK +${buffAmt}！`, 'system');
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.buffAtk += buffAmt;
      });
      addBattleLog(`${user.name} 全体强化，ATK +${buffAmt}！`, 'system');
      break;
  }
}

// 敌人AI（完整智能版）
function enemyAI(enemy) {
  const aliveAllies = battle.allies.filter(a => a.currentHp > 0);
  if (aliveAllies.length === 0) return;
  
  // 计算对目标的预期伤害
  const calcExpectedDmg = (target) => {
    return Math.max(1, Math.floor(enemy.atk - target.def * 0.5));
  };
  
  // 评估每个目标的分数（分数越高越优先攻击）
  const evaluateTarget = (target) => {
    let score = 0;
    const expectedDmg = calcExpectedDmg(target);
    
    // 1. 能击杀：+1000分（最高优先级）
    if (target.currentHp <= expectedDmg) {
      score += 1000;
    }
    
    // 2. 残血（HP < 30%）：+200分
    if (target.currentHp / target.maxHp < 0.3) {
      score += 200;
    }
    
    // 3. 是治疗角色：+150分
    if (target.skills.some(s => s.includes('治疗') || s.includes('群疗'))) {
      score += 150;
    }
    
    // 4. 能量快满（>=70）：+100分（阻止大招）
    if (target.energy >= 70) {
      score += 100;
    }
    
    // 5. 攻击力高：+0~80分
    const maxAtk = Math.max(...aliveAllies.map(a => a.atk));
    score += (target.atk / maxAtk) * 80;
    
    // 6. 防御低（伤害效率高）：+0~50分
    const minDef = Math.min(...aliveAllies.map(a => a.def));
    const maxDef = Math.max(...aliveAllies.map(a => a.def));
    if (maxDef > minDef) {
      score += ((maxDef - target.def) / (maxDef - minDef)) * 50;
    }
    
    // 7. 随机扰动：+0~30分（增加不确定性）
    score += Math.random() * 30;
    
    return score;
  };
  
  // 评估所有目标
  const targetScores = aliveAllies.map(target => ({
    target,
    score: evaluateTarget(target)
  }));
  
  // 按分数排序，选最高的
  targetScores.sort((a, b) => b.score - a.score);
  const chosen = targetScores[0];
  const target = chosen.target;
  
  // 生成AI思考日志（可选，帮助理解AI决策）
  let reason = '';
  if (target.currentHp <= calcExpectedDmg(target)) {
    reason = '补刀！';
  } else if (target.currentHp / target.maxHp < 0.3) {
    reason = '集火残血';
  } else if (target.skills.some(s => s.includes('治疗'))) {
    reason = '针对治疗';
  } else if (target.energy >= 70) {
    reason = '阻断大招';
  } else if (target.atk >= Math.max(...aliveAllies.map(a => a.atk)) * 0.9) {
    reason = '压制输出';
  } else {
    reason = '择优攻击';
  }
  
  // 执行攻击
  const dmg = calcExpectedDmg(target);
  target.currentHp -= dmg;
  target.energy = Math.min(target.maxEnergy, target.energy + 20);
  
  addBattleLog(`${enemy.name}【${reason}】→ ${target.name}，${dmg} 伤害！`, 'damage');
  
  if (target.currentHp <= 0) {
    addBattleLog(`💀 ${target.name} 被击败！`, 'system');
  }
  
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 结束战斗
function endBattle(victory) {
  battle.active = false;
  
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
  addBattleLog('撤退了...', 'system');
  closeBattleField();
}