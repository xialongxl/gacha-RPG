// ==================== 战斗系统 ====================

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
    skills: e.skills || ['普攻'],
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
    
    const charData = CHARACTER_DATA[unit.name];
    let avatarHtml;
    
    if (!isEnemy && charData && charData.spine && charData.spine.skel && charData.spine.atlas) {
      // 我方角色用Spine
      avatarHtml = createSpineMedia(charData, unit.name, 'unit-spine', 100, 120);
    } else {
      // 敌方或没有spine的用占位符
      const emoji = isEnemy ? '👹' : '👤';
      avatarHtml = `<div class="img-placeholder" style="width:100px;height:120px;display:flex;align-items:center;justify-content:center;font-size:32px;">${emoji}</div>`;
    }
    
    let infoHtml = `
      <div class="unit-info">
        <div class="unit-name">${unit.name}</div>
        <div class="hp-bar">
          <div class="hp-bar-fill ${isLow ? 'low' : ''}" style="width:${hpPercent}%"></div>
        </div>
    `;
    
    if (!isEnemy) {
      infoHtml += `
        <div class="energy-bar">
          <div class="energy-bar-fill" style="width:${energyPercent}%"></div>
        </div>
      `;
    }
    
    infoHtml += `
        <div class="unit-stats">
          HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}
          ${!isEnemy ? ` | ⚡${unit.energy}` : ''}
        </div>
      </div>
    `;
    
    div.innerHTML = avatarHtml + infoHtml;
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

// ==================== 玩家操作 ====================

// 显示技能按钮
function showSkillButtons(unit) {
  const div = document.getElementById('skill-buttons');
  div.innerHTML = '';
  
  unit.skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    if (!skill) return;
    
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
      executePlayerDamage(skill, user, atk, target);
      break;
    case 'heal':
      executePlayerHeal(skill, user, atk, target);
      break;
    case 'buff':
      executePlayerBuff(skill, user, atk);
      break;
    case 'debuff':
      executePlayerDebuff(skill, user, atk, target);
      break;
  }
  
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 玩家伤害技能
function executePlayerDamage(skill, user, atk, target) {
  const calcDamage = (t) => Math.max(1, Math.floor(atk * skill.multiplier - t.def * 0.5));
  
  const applyDamage = (t, dmg) => {
    t.currentHp -= dmg;
  };
  
  switch (skill.target) {
    case 'single':
      if (target) {
        const dmg = calcDamage(target);
        applyDamage(target, dmg);
        addBattleLog(`${user.name}【${skill.name}】→ ${target.name}，${dmg} 伤害！`, 'damage');
        if (target.currentHp <= 0) {
          addBattleLog(`💀 ${target.name} 被击败！`, 'system');
        }
      }
      break;
      
    case 'all':
      addBattleLog(`${user.name}【${skill.name}】！`, 'damage');
      battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
        const dmg = calcDamage(enemy);
        applyDamage(enemy, dmg);
        addBattleLog(`  → ${enemy.name} 受到 ${dmg} 伤害！`, 'damage');
        if (enemy.currentHp <= 0) {
          addBattleLog(`💀 ${enemy.name} 被击败！`, 'system');
        }
      });
      break;
      
    case 'random3':
    case 'random2':
      const times = skill.target === 'random3' ? 3 : 2;
      addBattleLog(`${user.name}【${skill.name}】！`, 'damage');
      for (let i = 0; i < times; i++) {
        const alive = battle.enemies.filter(e => e.currentHp > 0);
        if (alive.length === 0) break;
        const t = alive[Math.floor(Math.random() * alive.length)];
        const dmg = calcDamage(t);
        applyDamage(t, dmg);
        addBattleLog(`  → ${t.name} 受到 ${dmg} 伤害！`, 'damage');
        if (t.currentHp <= 0) {
          addBattleLog(`💀 ${t.name} 被击败！`, 'system');
        }
      }
      break;
  }
}

// 玩家治疗技能
function executePlayerHeal(skill, user, atk, target) {
  const healAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'ally':
      if (target) {
        target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt);
        addBattleLog(`${user.name}【${skill.name}】→ ${target.name}，+${healAmt} HP！`, 'heal');
      }
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.currentHp = Math.min(ally.maxHp, ally.currentHp + healAmt);
      });
      addBattleLog(`${user.name}【${skill.name}】全体恢复 ${healAmt} HP！`, 'heal');
      break;
  }
}

// 玩家增益技能
function executePlayerBuff(skill, user, atk) {
  const buffAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'self':
      user.buffAtk += buffAmt;
      addBattleLog(`${user.name}【${skill.name}】ATK +${buffAmt}！`, 'system');
      break;
      
    case 'all_ally':
      battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
        ally.buffAtk += buffAmt;
      });
      addBattleLog(`${user.name}【${skill.name}】全体 ATK +${buffAmt}！`, 'system');
      break;
  }
}

// 玩家减益技能
function executePlayerDebuff(skill, user, atk, target) {
  const debuffAmt = skill.multiplier;
  
  switch (skill.target) {
    case 'all':
      battle.enemies.filter(e => e.currentHp > 0).forEach(enemy => {
        const reduction = Math.floor(enemy.atk * debuffAmt);
        enemy.atk = Math.max(1, enemy.atk - reduction);
      });
      addBattleLog(`${user.name}【${skill.name}】敌方全体 ATK 降低！`, 'system');
      break;
      
    case 'single':
      if (target) {
        const reduction = Math.floor(target.atk * debuffAmt);
        target.atk = Math.max(1, target.atk - reduction);
        addBattleLog(`${user.name}【${skill.name}】→ ${target.name}，ATK -${reduction}！`, 'system');
      }
      break;
  }
}

// ==================== 敌人AI ====================

// 敌人AI主函数
function enemyAI(enemy) {
  const aliveAllies = battle.allies.filter(a => a.currentHp > 0);
  const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
  if (aliveAllies.length === 0) return;
  
  const skill = chooseEnemySkill(enemy, aliveAllies, aliveEnemies);
  executeEnemySkill(enemy, skill, aliveAllies, aliveEnemies);
  
  renderBattle();
  battle.currentTurn++;
  setTimeout(() => nextTurn(), 1000);
}

// 敌人选择技能
function chooseEnemySkill(enemy, aliveAllies, aliveEnemies) {
  const skills = enemy.skills || ['普攻'];
  
  if (skills.length === 1) {
    return { ...SKILL_EFFECTS['普攻'], name: '普攻' };
  }
  
  const hpPercent = enemy.currentHp / enemy.maxHp;
  const injuredAllies = aliveEnemies.filter(e => e.currentHp / e.maxHp < 0.5);
  
  if (injuredAllies.length > 0) {
    if (skills.includes('群体治疗') && injuredAllies.length >= 2 && SKILL_EFFECTS['群体治疗']) {
      return { ...SKILL_EFFECTS['群体治疗'], name: '群体治疗' };
    }
    if (skills.includes('战地治疗') && SKILL_EFFECTS['战地治疗']) {
      return { ...SKILL_EFFECTS['战地治疗'], name: '战地治疗' };
    }
  }
  
  if (hpPercent < 0.3 && skills.includes('狂暴') && SKILL_EFFECTS['狂暴']) {
    return { ...SKILL_EFFECTS['狂暴'], name: '狂暴' };
  }
  
  if (hpPercent < 0.5 && skills.includes('鼓舞') && SKILL_EFFECTS['鼓舞']) {
    return { ...SKILL_EFFECTS['鼓舞'], name: '鼓舞' };
  }
  
  if (aliveAllies.length >= 3) {
    if (skills.includes('烈焰风暴') && SKILL_EFFECTS['烈焰风暴']) {
      return { ...SKILL_EFFECTS['烈焰风暴'], name: '烈焰风暴' };
    }
    if (skills.includes('横扫') && SKILL_EFFECTS['横扫']) {
      return { ...SKILL_EFFECTS['横扫'], name: '横扫' };
    }
  }
  
  if (Math.random() < 0.6) {
    const specialSkills = skills.filter(s => s !== '普攻' && SKILL_EFFECTS[s]);
    if (specialSkills.length > 0) {
      const chosen = specialSkills[Math.floor(Math.random() * specialSkills.length)];
      return { ...SKILL_EFFECTS[chosen], name: chosen };
    }
  }
  
  return { ...SKILL_EFFECTS['普攻'], name: '普攻' };
}

// 执行敌人技能
function executeEnemySkill(enemy, skill, aliveAllies, aliveEnemies) {
  const atk = enemy.atk + (enemy.buffAtk || 0);
  
  switch (skill.type) {
    case 'damage':
      executeEnemyDamage(enemy, skill, atk, aliveAllies);
      break;
    case 'enemy_heal':
      executeEnemyHeal(enemy, skill, atk, aliveEnemies);
      break;
    case 'enemy_buff':
      executeEnemyBuff(enemy, skill, atk);
      break;
    case 'enemy_debuff':
      executeEnemyDebuff(enemy, skill, atk, aliveAllies);
      break;
    default:
      executeEnemyDamage(enemy, skill, atk, aliveAllies);
  }
}

// 智能选择目标
function chooseTarget(enemy, aliveAllies) {
  const calcExpectedDmg = (t) => Math.max(1, Math.floor(enemy.atk - t.def * 0.5));
  
  const scores = aliveAllies.map(target => {
    let score = 0;
    const expectedDmg = calcExpectedDmg(target);
    
    if (target.currentHp <= expectedDmg) score += 1000;
    if (target.currentHp / target.maxHp < 0.3) score += 200;
    if (target.skills && target.skills.some(s => s.includes('治疗') || s.includes('群疗'))) score += 150;
    if (target.energy >= 70) score += 100;
    
    const maxAtk = Math.max(...aliveAllies.map(a => a.atk));
    score += (target.atk / maxAtk) * 80;
    score += Math.random() * 30;
    
    return { target, score };
  });
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0].target;
}

// 获取AI策略描述
function getStrategy(enemy, target, aliveAllies) {
  const calcExpectedDmg = (t) => Math.max(1, Math.floor(enemy.atk - t.def * 0.5));
  const expectedDmg = calcExpectedDmg(target);
  
  if (target.currentHp <= expectedDmg) return '补刀';
  if (target.currentHp / target.maxHp < 0.3) return '集火残血';
  if (target.skills && target.skills.some(s => s.includes('治疗') || s.includes('群疗'))) return '针对治疗';
  if (target.energy >= 70) return '阻断大招';
  
  const maxAtk = Math.max(...aliveAllies.map(a => a.atk));
  if (target.atk >= maxAtk * 0.9) return '压制输出';
  
  return '择优攻击';
}

// 敌人伤害技能
function executeEnemyDamage(enemy, skill, atk, aliveAllies) {
  const calcDamage = (t) => Math.max(1, Math.floor(atk * skill.multiplier - t.def * 0.5));
  
  const applyDamage = (t, dmg) => {
    t.currentHp -= dmg;
    t.energy = Math.min(t.maxEnergy, t.energy + 20);
  };
  
  switch (skill.target) {
    case 'single': {
      const target = chooseTarget(enemy, aliveAllies);
      const dmg = calcDamage(target);
      const strategy = getStrategy(enemy, target, aliveAllies);
      applyDamage(target, dmg);
      addBattleLog(`${enemy.name}【${strategy}·${skill.name}】→ ${target.name}，${dmg} 伤害！`, 'damage');
      if (target.currentHp <= 0) {
        addBattleLog(`💀 ${target.name} 被击败！`, 'system');
      }
      break;
    }
    case 'all_enemy': {
      addBattleLog(`${enemy.name}【群攻·${skill.name}】！`, 'damage');
      aliveAllies.forEach(target => {
        const dmg = calcDamage(target);
        applyDamage(target, dmg);
        addBattleLog(`  → ${target.name} 受到 ${dmg} 伤害！`, 'damage');
        if (target.currentHp <= 0) {
          addBattleLog(`💀 ${target.name} 被击败！`, 'system');
        }
      });
      break;
    }
    case 'random2': {
      addBattleLog(`${enemy.name}【连击·${skill.name}】！`, 'damage');
      for (let i = 0; i < 2; i++) {
        const alive = aliveAllies.filter(a => a.currentHp > 0);
        if (alive.length === 0) break;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg = calcDamage(target);
        applyDamage(target, dmg);
        addBattleLog(`  → ${target.name} 受到 ${dmg} 伤害！`, 'damage');
        if (target.currentHp <= 0) {
          addBattleLog(`💀 ${target.name} 被击败！`, 'system');
        }
      }
      break;
    }
    case 'random3': {
      addBattleLog(`${enemy.name}【连击·${skill.name}】！`, 'damage');
      for (let i = 0; i < 3; i++) {
        const alive = aliveAllies.filter(a => a.currentHp > 0);
        if (alive.length === 0) break;
        const target = alive[Math.floor(Math.random() * alive.length)];
        const dmg = calcDamage(target);
        applyDamage(target, dmg);
        addBattleLog(`  → ${target.name} 受到 ${dmg} 伤害！`, 'damage');
        if (target.currentHp <= 0) {
          addBattleLog(`💀 ${target.name} 被击败！`, 'system');
        }
      }
      break;
    }
  }
}

// 敌人治疗
function executeEnemyHeal(enemy, skill, atk, aliveEnemies) {
  const healAmt = Math.floor(atk * skill.multiplier);
  
  switch (skill.target) {
    case 'ally_lowest': {
      const target = aliveEnemies.reduce((a, b) => 
        (a.currentHp / a.maxHp) < (b.currentHp / b.maxHp) ? a : b
      );
      target.currentHp = Math.min(target.maxHp, target.currentHp + healAmt);
      addBattleLog(`${enemy.name}【${skill.name}】→ ${target.name}，+${healAmt} HP！`, 'heal');
      break;
    }
    case 'all_ally_enemy': {
      aliveEnemies.forEach(e => {
        e.currentHp = Math.min(e.maxHp, e.currentHp + healAmt);
      });
      addBattleLog(`${enemy.name}【${skill.name}】全体恢复 ${healAmt} HP！`, 'heal');
      break;
    }
  }
}

// 敌人增益
function executeEnemyBuff(enemy, skill, atk) {
  const buffAmt = Math.floor(atk * skill.multiplier);
  enemy.buffAtk = (enemy.buffAtk || 0) + buffAmt;
  addBattleLog(`${enemy.name}【${skill.name}】ATK +${buffAmt}！`, 'system');
}

// 敌人减益（对玩家）
function executeEnemyDebuff(enemy, skill, atk, aliveAllies) {
  const target = chooseTarget(enemy, aliveAllies);
  const debuffAmt = Math.floor(target.def * skill.multiplier);
  target.def = Math.max(0, target.def - debuffAmt);
  addBattleLog(`${enemy.name}【${skill.name}】→ ${target.name}，DEF -${debuffAmt}！`, 'system');
}

// ==================== 战斗结束 ====================

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