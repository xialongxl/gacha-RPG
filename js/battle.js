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
    buffAtk: 0,
    isEnemy: true
  }));
  
  document.getElementById('stage-panel').style.display = 'none';
  document.getElementById('battle-field').classList.add('active');
  
  addBattleLog('⚔️ 战斗开始！', 'system');
  
  // 初始化回合
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
    const isLow = hpPercent < 30;
    const isDead = unit.currentHp <= 0;
    const isActing = battle.turnOrder[battle.currentTurn] === unit;
    
    const div = document.createElement('div');
    div.className = `battle-unit ${isEnemy ? 'enemy' : ''} ${isDead ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
    div.innerHTML = `
      <div class="unit-name">${unit.name}</div>
      <div class="hp-bar">
        <div class="hp-bar-fill ${isLow ? 'low' : ''}" style="width: ${hpPercent}%"></div>
      </div>
      <div class="unit-stats">
        HP: ${Math.max(0, unit.currentHp)} / ${unit.maxHp} | 
        ATK: ${unit.atk + unit.buffAtk}
      </div>
    `;
    container.appendChild(div);
  });
}

// 下一回合（已修复）
function nextTurn() {
  if (!battle.active) return;
  
  // 检查胜负
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
  
  // 如果回合用完，重新计算顺序
  if (battle.currentTurn >= battle.turnOrder.length) {
    calculateTurnOrder();
    battle.currentTurn = 0;
    addBattleLog('--- 新回合 ---', 'system');
  }
  
  // 获取当前行动单位
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
    const btn = document.createElement('button');
    btn.className = 'skill-btn';
    btn.textContent = skillName;
    btn.onclick = () => selectSkill(skillName, unit);
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

// 执行技能（已修复）
function executeSkill(skill, target) {
  const user = skill.user;
  const atk = user.atk + user.buffAtk;
  
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
  battle.currentTurn++;  // 修复：增加回合计数
  setTimeout(() => nextTurn(), 1000);
}

// 执行伤害技能
function executeDamageSkill(skill, user, atk, target) {
  const calcDamage = (t) => {
    const dmg = Math.floor(atk * skill.multiplier - t.def * 0.5);
    return Math.max(1, dmg);
  };
  
  switch (skill.target) {
    case 'single':
      if (target) {
        const dmg = calcDamage(target);
        target.currentHp -= dmg;
        addBattleLog(`${user.name} 使用【${skill.name}】→ ${target.name}，造成 ${dmg} 伤害！`, 'damage');
      }
      break;
      
    case 'all':
      battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
        const dmg = calcDamage(enemy);
        enemy.currentHp -= dmg;
        addBattleLog(`${user.name} 使用【${skill.name}】→ ${enemy.name}，造成 ${dmg} 伤害！`, 'damage');
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
        t.currentHp -= dmg;
        addBattleLog(`${user.name} 攻击 ${t.name}，造成 ${dmg} 伤害！`, 'damage');
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
        addBattleLog(`${user.name} 治疗 ${target.name}，恢复 ${healAmt} HP！`, 'heal');
      }
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healAmt);
      });
      addBattleLog(`${user.name} 群体治疗，全体恢复 ${healAmt} HP！`, 'heal');
      break;
  }
}

// 执行增益技能
function executeBuffSkill(skill, user, atk) {
  const buffAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'self':
      user.buffAtk += buffAmt;
      addBattleLog(`${user.name} 强化自身，攻击力 +${buffAmt}！`, 'system');
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.buffAtk += buffAmt;
      });
      addBattleLog(`${user.name} 全体强化，攻击力 +${buffAmt}！`, 'system');
      break;
  }
}

// 敌人AI（已修复）
function enemyAI(enemy) {
  const aliveAllies = battle.allies.filter(a => a.currentHp > 0);
  if (aliveAllies.length === 0) return;
  
  const target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
  const dmg = Math.floor(enemy.atk - target.def * 0.5);
  const finalDmg = Math.max(1, dmg);
  target.currentHp -= finalDmg;
  
  addBattleLog(`${enemy.name} 攻击 ${target.name}，造成 ${finalDmg} 伤害！`, 'damage');
  
  renderBattle();
  battle.currentTurn++;  // 修复：增加回合计数
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
      <p>获得金币：${rewards.gold}</p>
      <p>获得抽卡券：${rewards.tickets}</p>
    `);
  } else {
    showModal('💀 战斗失败...', '<p>队伍全灭，请重整旗鼓再来！</p>');
  }
}

// 撤退
function fleeBattle() {
  battle.active = false;
  addBattleLog('撤退了...', 'system');
  closeBattleField();
}
