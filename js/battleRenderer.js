// ==================== 战斗渲染器 ====================
// 负责战斗界面的所有DOM操作和动画展示

import { battle } from './state.js';
import { CONFIG } from './config.js';
import { CHARACTER_DATA } from './data.js';
import {
  addBattleLog, renderBattleLog, createSpineMedia,
  initSummonSideDrag, toggleSummonSideMinimize
} from './ui.js';
import { SkinSystem } from './skin.js';
import { SummonSystem } from './summon.js';
import {
  SKILL_EFFECTS, LEADER_BONUS, canUseChargeSkill,
  getUnitAtk, getUnitSpd, getUnitDef
} from './skillCore.js';

// 避免循环依赖：selectSkill 和 executePlayerSkill 通过延迟导入获取
let _battleModule = null;
async function getBattleModule() {
  if (!_battleModule) {
    _battleModule = await import('./battle.js');
  }
  return _battleModule;
}

// 同步获取 battle 模块（用于事件处理器，假设模块已加载）
function getBattleModuleSync() {
  return _battleModule;
}

// 属性显示函数（直接使用 skillCore 的函数）
function getUnitAtkDisplay(unit) {
  return getUnitAtk(unit);
}

function getUnitDefDisplay(unit) {
  return getUnitDef(unit);
}

export const BattleRenderer = {
  // 已渲染的Spine容器ID记录
  renderedSpineUnits: new Set(),

  // 初始化
  init() {
    this.renderedSpineUnits.clear();
  },

  // 首次渲染战斗界面
  renderBattleInitial() {
    this.renderBattleSideInitial('ally-side', battle.allies, '我方', false);
    this.renderSummonsSideInitial();
    this.renderBattleSideInitial('enemy-side', battle.enemies, '敌方', true);
    renderBattleLog();
    this.renderATBar();
  },

  // 更新战斗界面
  renderBattle() {
    // syncSummons(); // 这一步应该在逻辑层做，渲染层只负责画
    this.updateBattleSide(battle.allies, false);
    this.updateSummonsSide();
    this.updateBattleSide(battle.enemies, true);
    renderBattleLog();
    this.renderATBar();
  },

  // 渲染AT条
  renderATBar() {
    const container = document.getElementById('at-bar-units');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 假设逻辑层已经同步了召唤物并计算了turnOrder
    // 但为了保险，这里还是获取最新的单位列表
    const allUnits = [...battle.allies, ...battle.summons, ...battle.enemies].filter(u => u.currentHp > 0);
    const sorted = allUnits.sort((a, b) => getUnitSpd(b) - getUnitSpd(a));
    
    const displayCount = Math.min(10, sorted.length);
    
    for (let i = 0; i < displayCount; i++) {
      const unit = sorted[i];
      const isCurrent = (battle.turnOrder[battle.currentTurn] === unit);
      
      const div = document.createElement('div');
      
      let unitClass = unit.isEnemy ? 'enemy' : 'ally';
      if (unit.isSummon) unitClass = 'summon';
      
      div.className = `at-unit ${unitClass} ${isCurrent ? 'current' : ''}`;
      
      let icon;
      if (unit.isEnemy) {
        icon = '👹';
      } else if (unit.isSummon) {
        icon = '🔮';
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
  },

  // 首次渲染召唤物区域
  renderSummonsSideInitial() {
    let container = document.getElementById('summon-side');
    
    if (!container) {
      const allyContainer = document.getElementById('ally-side');
      container = document.createElement('div');
      container.id = 'summon-side';
      container.className = 'battle-side summon-side';
      allyContainer.parentNode.insertBefore(container, allyContainer.nextSibling);
      
      initSummonSideDrag(container);
    }
    
    container.innerHTML = `
      <div class="summon-side-header">
        <span class="summon-side-title">🔮 召唤物</span>
        <button class="summon-side-minimize" onclick="toggleSummonSideMinimize()">−</button>
      </div>
      <div class="summon-side-content"></div>
    `;
    
    if (battle.summons.length === 0) {
      container.innerHTML += `<div class="summon-empty">召唤位: 0/${CONFIG.SUMMON.MAX_SLOTS}</div>`;
      return;
    }
    
    battle.summons.forEach(summon => {
      this.renderSummonUnit(container, summon);
    });
    
    container.innerHTML += `<div class="summon-slots">召唤位: ${battle.summons.length}/${CONFIG.SUMMON.MAX_SLOTS}</div>`;
  },

  // 渲染单个召唤物单位
  renderSummonUnit(container, summon) {
    const hpPercent = Math.max(0, (summon.currentHp / summon.maxHp) * 100);
    const isLow = hpPercent < 30;
    const isDead = summon.currentHp <= 0;
    const isActing = battle.turnOrder[battle.currentTurn] === summon;
    
    const div = document.createElement('div');
    div.className = `battle-unit summon ${isDead ? 'dead' : ''} ${isActing ? 'acting' : ''}`;
    div.id = `unit-${summon.id}`;
    
    let avatarHtml;
    if (summon.spine && summon.spine.skel && summon.spine.atlas) {
      avatarHtml = createSpineMedia(summon, summon.id, 'summon-spine', 60, 70);
    } else {
      avatarHtml = `<div class="summon-avatar">🔮</div>`;
    }
    
    let buffText = '';
    if (summon.buffs) {
      const buffList = [];
      if (summon.buffs.atkMultiplier > 0) buffList.push(`ATK +${Math.round(summon.buffs.atkMultiplier * 100)}%`);
      if (summon.buffs.spdFlat > 0) buffList.push(`SPD +${summon.buffs.spdFlat}`);
      if (summon.buffs.healPerTurn > 0) buffList.push(`回血 ${Math.round(summon.buffs.healPerTurn * 100)}%`);
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
  },

  // 更新召唤物区域
  updateSummonsSide() {
    let container = document.getElementById('summon-side');
    if (!container) {
      this.renderSummonsSideInitial();
      return;
    }
    
    const existingIds = new Set();
    container.querySelectorAll('.battle-unit.summon').forEach(el => {
      const id = el.id.replace('unit-', '');
      existingIds.add(id);
    });
    
    container.querySelectorAll('.battle-unit.summon').forEach(el => {
      const id = el.id.replace('unit-', '');
      const summon = battle.summons.find(s => s.id === id);
      if (!summon || summon.currentHp <= 0) {
        el.remove();
      }
    });

    battle.summons.forEach(summon => {
      if (summon.currentHp > 0 && !existingIds.has(summon.id)) {
        const tempContainer = document.createElement('div');
        this.renderSummonUnit(tempContainer, summon);
        const newUnit = tempContainer.firstChild;
        
        const slotsDiv = container.querySelector('.summon-slots');
        if (slotsDiv && newUnit) {
          container.insertBefore(newUnit, slotsDiv);
        } else if (newUnit) {
          container.appendChild(newUnit);
        }
      }
    });

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
      
      const stats = div.querySelector('.unit-stats');
      if (stats) {
        stats.innerHTML = `HP:${Math.max(0, summon.currentHp)}/${summon.maxHp} | ATK:${SummonSystem.getSummonAtk(summon)} | SPD:${SummonSystem.getSummonSpd(summon)}`;
      }
      
      let buffText = '';
      if (summon.buffs) {
        const buffList = [];
        if (summon.buffs.atkMultiplier > 0) buffList.push(`ATK +${Math.round(summon.buffs.atkMultiplier * 100)}%`);
        if (summon.buffs.spdFlat > 0) buffList.push(`SPD +${summon.buffs.spdFlat}`);
        if (summon.buffs.healPerTurn > 0) buffList.push(`回血 ${Math.round(summon.buffs.healPerTurn * 100)}%`);
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
    
    let slotsDiv = container.querySelector('.summon-slots');
    if (!slotsDiv) {
      slotsDiv = document.createElement('div');
      slotsDiv.className = 'summon-slots';
      container.appendChild(slotsDiv);
    }

    const aliveSummons = battle.summons.filter(s => s.currentHp > 0).length;
    let countdownText = '';

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
  },

  // 首次渲染一侧单位
  renderBattleSideInitial(containerId, units, title, isEnemy) {
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
      
      let spineData = charData?.spine;
      if (!isEnemy && charData && charData.id && typeof SkinSystem !== 'undefined') {
        spineData = SkinSystem.getCurrentSpine(charData.id, charData.spine);
      }
      const renderData = charData ? { ...charData, spine: spineData } : null;
      
      if (!isEnemy && renderData && spineData && spineData.skel && spineData.atlas) {
        avatarHtml = createSpineMedia(renderData, unit.name, 'unit-spine', 100, 120);
        this.renderedSpineUnits.add(unit.unitId);
      } else {
        const emoji = isEnemy ? '👹' : '👤';
        avatarHtml = `<div class="img-placeholder" style="width:100px;height:120px;display:flex;align-items:center;justify-content:center;font-size:32px;">${emoji}</div>`;
      }
      
      const leaderBadge = unit.isLeader ? '<div class="battle-leader-badge">👑队长</div>' : '';
      
      let affixHtml = '';
      if (isEnemy && unit.affixes && unit.affixes.length > 0) {
        const affixIcons = unit.affixes.map(affix => {
          const data = CONFIG.AFFIX?.TYPES?.[affix];
          return data ? data.icon : '';
        }).join('');
        const affixTooltip = this.getAffixTooltipText(unit.affixes);
        affixHtml = `<div class="unit-affixes" title="${affixTooltip}">${affixIcons}</div>`;
      }
      
      let infoHtml = `
        <div class="unit-info">
          <div class="unit-name">${unit.name}${affixHtml}</div>
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
      
      let shieldText = '';
      if (isEnemy && unit.shield > 0) {
        if (unit.shieldBroken) {
          shieldText = ' | 🛡️<span class="shield-broken">已破</span>';
        } else {
          shieldText = ` | 🛡️${unit.currentShield}/${unit.shield}`;
        }
      }
      
      let buffText = '';
      const buffList = [];
      if (unit.buffAtk && unit.buffAtk > 0) buffList.push(`ATK +${unit.buffAtk}`);
      if (unit.buffAtkMultiplier && unit.buffAtkMultiplier > 0) buffList.push(`ATK +${Math.round(unit.buffAtkMultiplier * 100)}%`);
      if (unit.buffSpd && unit.buffSpd > 0) buffList.push(`SPD +${unit.buffSpd}`);
      if (unit.buffSpdMultiplier && unit.buffSpdMultiplier > 0) buffList.push(`SPD +${Math.round(unit.buffSpdMultiplier * 100)}%`);
      if (unit.buffDef && unit.buffDef > 0) buffList.push(`DEF +${unit.buffDef}`);
      if (unit.buffDefMultiplier && unit.buffDefMultiplier > 0) buffList.push(`DEF +${Math.round(unit.buffDefMultiplier * 100)}%`);
      if (unit.dodgeChance && unit.dodgeChance > 0) buffList.push(`闪避 +${Math.round(unit.dodgeChance * 100)}%`);
      if (unit.healPerTurn && unit.healPerTurn > 0) {
        const dur = unit.healPerTurnDuration || '';
        buffList.push(`回血 ${Math.round(unit.healPerTurn * 100)}%${dur ? `(${dur}回合)` : ''}`);
      }
      
      if (unit.durationBuffs && unit.durationBuffs.length > 0) {
        unit.durationBuffs.forEach(buff => {
          let statName = buff.stat === 'dodge' ? '闪避' : buff.stat.toUpperCase();
          let valueText = (buff.isPercent || buff.stat === 'dodge') ? `${Math.round(buff.value * 100)}%` : `${buff.value}`;
          if (buff.stat !== 'def' && buff.stat !== 'dodge') {
            buffList.push(`${statName} +${valueText}(${buff.duration}回合)`);
          }
        });
      }
      
      if (unit.buffSpd && unit.buffSpd < 0) {
        const dur = unit.spdDebuffDuration || '';
        buffList.push(`SPD ${unit.buffSpd}${dur ? `(${dur}回合)` : ''}`);
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
  },

  // 更新一侧单位
  updateBattleSide(units, isEnemy) {
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
      
      let shieldText = '';
      if (isEnemy && unit.shield > 0) {
        if (unit.shieldBroken) {
          shieldText = ' | 🛡️<span class="shield-broken">已破</span>';
        } else {
          shieldText = ` | 🛡️${unit.currentShield}/${unit.shield}`;
        }
      }
      
      let tempShieldText = '';
      if (!isEnemy && unit.tempShield && unit.tempShield > 0) {
        tempShieldText = ` | 🔰护盾:${unit.tempShield}`;
      }
      
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
      
      let sanctuaryText = '';
      if (!isEnemy && unit.sanctuaryMode) {
        sanctuaryText = ' | 🌟圣域';
      }
      
      const stats = div.querySelector('.unit-stats');
      if (stats) {
        stats.innerHTML = `HP:${Math.max(0, unit.currentHp)}/${unit.maxHp}${!isEnemy ? ` | ⚡${unit.energy}` : ''} | ATK:${getUnitAtkDisplay(unit)} | DEF:${getUnitDefDisplay(unit)} | SPD:${getUnitSpd(unit)}${shieldText}${tempShieldText}${chargeText}${sanctuaryText}`;
      }
      
      const buffList = [];
      if (unit.buffAtk && unit.buffAtk > 0) buffList.push(`ATK +${unit.buffAtk}`);
      if (unit.buffAtkMultiplier && unit.buffAtkMultiplier > 0) buffList.push(`ATK +${Math.round(unit.buffAtkMultiplier * 100)}%`);
      if (unit.buffSpd && unit.buffSpd > 0) buffList.push(`SPD +${unit.buffSpd}`);
      if (unit.buffDef && unit.buffDef > 0) buffList.push(`DEF +${unit.buffDef}`);
      if (unit.buffDefMultiplier && unit.buffDefMultiplier > 0) buffList.push(`DEF +${Math.round(unit.buffDefMultiplier * 100)}%`);
      if (unit.dodgeChance && unit.dodgeChance > 0) buffList.push(`闪避 +${Math.round(unit.dodgeChance * 100)}%`);
      if (unit.healPerTurn && unit.healPerTurn > 0) {
        const dur = unit.healPerTurnDuration || '';
        buffList.push(`回血 ${Math.round(unit.healPerTurn * 100)}%${dur ? `(${dur}回合)` : ''}`);
      }
      
      if (unit.durationBuffs && unit.durationBuffs.length > 0) {
        unit.durationBuffs.forEach(buff => {
          let statName = buff.stat === 'dodge' ? '闪避' : buff.stat.toUpperCase();
          let valueText = (buff.isPercent || buff.stat === 'dodge') ? `${Math.round(buff.value * 100)}%` : `${buff.value}`;
          if (buff.stat !== 'def' && buff.stat !== 'dodge') {
            buffList.push(`${statName} +${valueText}(${buff.duration}回合)`);
          }
        });
      }
      
      if (unit.buffSpd && unit.buffSpd < 0) {
        const dur = unit.spdDebuffDuration || '';
        buffList.push(`SPD ${unit.buffSpd}${dur ? `(${dur}回合)` : ''}`);
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
  },

  // 获取词缀提示文本
  getAffixTooltipText(affixes) {
    if (!affixes || affixes.length === 0) return '';
    
    return affixes.map(affix => {
      const data = CONFIG.AFFIX?.TYPES?.[affix];
      if (!data) return affix;
      
      let desc = data.desc || '';
      if (data.value !== undefined) {
        desc = desc.replace('{value}', data.value);
      }
      if (data.threshold !== undefined) {
        desc = desc.replace('{threshold}', data.threshold);
      }
      
      return `${data.icon} ${data.name}: ${desc}`;
    }).join('\n');
  },

  // 显示技能按钮
  showSkillButtons(unit) {
    const div = document.getElementById('skill-buttons');
    if (!div) return;
    div.innerHTML = '';
    
    const skills = unit.isSummon ? ['普攻'] : unit.skills;
    
    skills.forEach(skillName => {
      const skill = SKILL_EFFECTS[skillName];
      if (!skill) return;
      
      let actualCost = skill.cost;
      let isLeaderBoosted = false;
      
      if (unit.isLeader && typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[unit.name]) {
        const bonus = LEADER_BONUS[unit.name];
        if (skillName === bonus.skill && bonus.costReduce) {
          actualCost = Math.max(0, skill.cost - bonus.costReduce);
          isLeaderBoosted = true;
        }
      }
      
      const chargeOK = typeof canUseChargeSkill === 'function' ? 
        canUseChargeSkill(unit, skillName) : true;
      const canUse = unit.isSummon ? true : (unit.energy >= actualCost && chargeOK);
      
      const btn = document.createElement('button');
      btn.className = `skill-btn ${canUse ? '' : 'disabled'} ${isLeaderBoosted ? 'leader-boosted' : ''}`;
      
      let tooltip = `【${skillName}】\n`;
      //tooltip += `消耗: ${actualCost} 能量 | 获得: ${skill.gain} 能量\n`;
      //tooltip += `目标: ${skill.target === 'single' ? '单体敌人' : skill.target === 'all' ? '全体敌人' : skill.target === 'ally' ? '单体队友' : skill.target === 'self' ? '自身' : '全体'}`;
      //if (skill.damage) tooltip += `\n伤害: ${skill.damage}% ATK`;
      //if (skill.heal) tooltip += `\n治疗: ${skill.heal}% HP`;
      //if (skill.stun) tooltip += `\n眩晕: ${skill.stun}回合`;
      //if (skill.buff) tooltip += `\n增益: ATK+${skill.buff}%`;
      tooltip += `\n${skill.desc}`;
      btn.title = tooltip;
      
      if (unit.isSummon) {
        btn.innerHTML = `🔮 ${skillName}`;
      } else {
        btn.innerHTML = `
          ${isLeaderBoosted ? '👑' : ''}${skillName}
          <span class="skill-cost">${actualCost > 0 ? `⚡${actualCost}` : '+⚡30'}</span>
        `;
      }
      
      if (canUse) {
        btn.onclick = async () => {
          const battleModule = await getBattleModule();
          battleModule.selectSkill(skillName, unit);
        };
      }
      
      div.appendChild(btn);
    });
    
    const targetDiv = document.getElementById('target-select');
    if (targetDiv) targetDiv.innerHTML = '';
  },

  // 显示敌人目标选择
  showEnemyTargetSelect() {
    const div = document.getElementById('target-select');
    if (!div) return;
    div.innerHTML = '<span>选择目标：（可点击敌方单位）</span>';
    
    const aliveEnemies = battle.enemies.filter(e => e.currentHp > 0);
    
    const tauntEnemies = aliveEnemies.filter(e => 
      e.affixes && e.affixes.includes('taunt')
    );
    const hasTaunt = tauntEnemies.length > 0;
    
    aliveEnemies.forEach(enemy => {
      const unitDiv = document.getElementById(`unit-${enemy.unitId}`);
      if (unitDiv) {
        const isTauntEnemy = enemy.affixes && enemy.affixes.includes('taunt');
        const isDisabled = hasTaunt && !isTauntEnemy;
        
        if (!isDisabled) {
          unitDiv.classList.add('selectable');
          unitDiv.onclick = async () => {
            this.clearUnitSelection();
            const battleModule = await getBattleModule();
            battleModule.executePlayerSkill(battle.selectedSkill, enemy);
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
      
      const isTauntEnemy = enemy.affixes && enemy.affixes.includes('taunt');
      const isDisabled = hasTaunt && !isTauntEnemy;
      
      const btn = document.createElement('button');
      btn.className = `target-btn ${isDisabled ? 'disabled' : ''} ${isTauntEnemy ? 'taunt-target' : ''}`;
      
      const tauntIcon = isTauntEnemy ? '😠 ' : '';
      const disabledText = isDisabled ? ' (被嘲讽)' : '';
      btn.textContent = `${tauntIcon}${enemy.name} (HP:${enemy.currentHp}${shieldInfo})${disabledText}`;
      
      if (!isDisabled) {
        btn.onclick = async () => {
          const battleModule = await getBattleModule();
          battleModule.executePlayerSkill(battle.selectedSkill, enemy);
        };
      }
      
      div.appendChild(btn);
    });
    
    if (hasTaunt) {
      const hint = document.createElement('div');
      hint.className = 'taunt-hint';
      hint.textContent = '😠 必须先击败嘲讽目标！';
      div.insertBefore(hint, div.firstChild.nextSibling);
    }
  },

  // 显示队友目标选择
  showAllyTargetSelect(currentUnit) {
    const div = document.getElementById('target-select');
    if (!div) return;
    div.innerHTML = '<span>选择队友：</span>';
    
    battle.allies.filter(a => a.currentHp > 0).forEach(ally => {
      const btn = document.createElement('button');
      btn.className = 'target-btn ally';
      btn.textContent = `${ally.name} (HP:${ally.currentHp})`;
      btn.onclick = async () => {
        const battleModule = await getBattleModule();
        battleModule.executePlayerSkill(battle.selectedSkill, ally);
      };
      div.appendChild(btn);
    });
    
    battle.summons.filter(s => s.currentHp > 0).forEach(summon => {
      const btn = document.createElement('button');
      btn.className = 'target-btn ally summon';
      btn.textContent = `🔮${summon.name} (HP:${summon.currentHp})`;
      btn.onclick = async () => {
        const battleModule = await getBattleModule();
        battleModule.executePlayerSkill(battle.selectedSkill, summon);
      };
      div.appendChild(btn);
    });
  },

  // 清除单位选择状态
  clearUnitSelection() {
    document.querySelectorAll('.battle-unit.selectable').forEach(el => {
      el.classList.remove('selectable');
      el.onclick = null;
    });
    document.querySelectorAll('.battle-unit.disabled-target').forEach(el => {
      el.classList.remove('disabled-target');
    });
  }
};
