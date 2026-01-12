// ==================== 干员详情系统 ====================

import { CHARACTER_DATA } from './data.js';
import { state, store } from './state.js';
import { CONFIG, applyPotentialBonus, canBreakthrough, getBreakthroughCost, getDisplayRarity } from './config.js';
import { SKILL_EFFECTS, LEADER_BONUS } from './skillData.js';
import { SkinSystem } from './skin.js';
import { showModal, clearSpineInstances, updateResourceUI } from './ui.js';
import { clearTeamRenderCache, updateTeamUI } from './team.js';
import { applyHelpTips } from './glossary.js';

// 当前查看的干员
let currentDetailChar = null;

// 显示干员详情
export function showCharDetail(charName) {
  currentDetailChar = charName;
  const data = CHARACTER_DATA[charName];
  if (!data) return;
  
  const info = state.inventory[charName];
  const potential = info?.potential || 1;
  const bonus = Math.round((potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100)          ;
  
  // 设置背景图
  const bgImg = document.getElementById('char-detail-bg-img');
  if (data.art) {
    // 用立绘做背景，加模糊
    bgImg.src = 'assets/bg/Bg_default.png';
  } else {
    bgImg.src = 'assets/bg/Bg_default.png';
    bgImg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  }
  
  // 设置立绘（优先使用时装立绘）
  const artWrapper = document.getElementById('char-detail-art-wrapper');
  const artImg = document.getElementById('char-detail-art');
  let artSrc = data.art;
  let artOffset = null;
  
  // 检查是否有装备时装
  if (data.id && typeof SkinSystem !== 'undefined') {
    const skinArt = SkinSystem.getSkinArt(data.id);
    if (skinArt) {
      artSrc = skinArt;
    }
    artOffset = SkinSystem.getSkinArtOffset(data.id);
  }
  
  // 如果没有皮肤偏移，检查干员数据是否有默认立绘偏移
  if (!artOffset && data.artOffset) {
    artOffset = data.artOffset;
  }
  
  if (artSrc) {
    artImg.src = artSrc;
    artImg.style.display = 'block';
    
  // 应用偏移到wrapper容器（使用CSS变量，配合CSS的transition实现平滑过渡）
    if (artOffset) {
      artWrapper.style.setProperty('--skin-offset-x', `${artOffset.x}px`);
      artWrapper.style.setProperty('--skin-offset-y', `${artOffset.y}px`);
      artWrapper.style.setProperty('--skin-offset-z', `${artOffset.z}px`);
    } else {
      artWrapper.style.setProperty('--skin-offset-x', '0px');
      artWrapper.style.setProperty('--skin-offset-y', '0px');
      artWrapper.style.setProperty('--skin-offset-z', '0px');
    }
  } else {
    artImg.style.display = 'none';
  }
  
  // 设置星级（考虑突破，突破后+1星）
  const breakthrough = info?.breakthrough || null;
  const displayRarity = getDisplayRarity(data.rarity, breakthrough);
  const stars = '★'.repeat(displayRarity);
  document.getElementById('char-detail-stars').textContent = stars;
  
  // 设置名字
  document.getElementById('char-detail-name').textContent = charName;
  
  // 设置潜能
  const breakthroughbonus = bonus + Math.round(CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS * 100);


  let potentialText = `潜能 ${potential} 级${bonus > 0 ? ` (+${bonus}% 属性)` : ''}`;

  if (breakthrough === 'stats') {
    potentialText = `潜能 ${potential} 级${bonus > 0 ? ` +${breakthroughbonus}% 属性` : ''}`;
  } else if (breakthrough === 'speed' && bonus > 0) {
    potentialText = `潜能 ${potential} 级${bonus > 0 ? ` (+${bonus}% 属性 +40% 速度)` : ''}`;
  } else if (bonus > 0) {
    potentialText = `潜能 ${potential} 级${bonus > 0 ? ` (+${bonus}% 属性)` : ''}`;
  }

  document.getElementById('char-detail-potential').textContent = potentialText;
  
  // 设置属性（考虑突破加成）
  const statsDiv = document.getElementById('char-detail-stats');
  
  // 先计算潜能加成
  let hpValue = applyPotentialBonus(data.hp, potential);
  let atkValue = applyPotentialBonus(data.atk, potential);
  let defValue = applyPotentialBonus(data.def, potential);
  let spdValue = data.spd;
  
  // 应用突破加成
  if (breakthrough === 'stats') {
    hpValue += Math.floor(data.hp * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
    atkValue += Math.floor(data.atk * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
    defValue += Math.floor(data.def * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
  } else if (breakthrough === 'speed') {
    spdValue = Math.floor(data.spd * (1 + CONFIG.BREAKTHROUGH.SPEED_BONUS));
  }
  
  // 突破类型标识
  const breakthroughBadge = breakthrough ?
    `<div class="breakthrough-badge">${breakthrough === 'stats' ? '💠属性突破' : '⚡速度突破'}</div>` : '';
  
  statsDiv.innerHTML = `
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">HP</span>
      <span class="char-detail-stat-value${breakthrough === 'stats' ? ' breakthrough-enhanced' : ''}">${hpValue}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">ATK</span>
      <span class="char-detail-stat-value${breakthrough === 'stats' ? ' breakthrough-enhanced' : ''}">${atkValue}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">DEF</span>
      <span class="char-detail-stat-value${breakthrough === 'stats' ? ' breakthrough-enhanced' : ''}">${defValue}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">SPD</span>
      <span class="char-detail-stat-value${breakthrough === 'speed' ? ' breakthrough-enhanced' : ''}">${spdValue}</span>
  </div>
  `;
  
  // 更新突破按钮显示
  updateBreakthroughButton(charName, data, info);

  const breakthroughBadgeDiv = document.getElementById('char-detail-breakthroughBadge');

  breakthroughBadgeDiv.innerHTML = `
  ${breakthroughBadge}
  `;
  
  // 设置技能
  const skillsDiv = document.getElementById('char-detail-skills');
  skillsDiv.innerHTML = '';
  
  data.skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    if (!skill) return;
    
    const skillDiv = document.createElement('div');
    skillDiv.className = 'char-detail-skill';
    
    let costText = '';
    if (skill.cost > 0) {
      costText = `消耗 ${skill.cost} 能量`;
    } else if (skill.gain > 0) {
      costText = `获得 ${skill.gain} 能量`;
    }
    
    // 应用帮助提示到技能描述
    const descWithTips = applyHelpTips(skill.desc || '');
    
    skillDiv.innerHTML = `
      <div class="char-detail-skill-name">${skillName}</div>
      <div class="char-detail-skill-cost">${costText}</div>
      <div class="char-detail-skill-desc">${descWithTips}</div>
    `;
    
    skillsDiv.appendChild(skillDiv);
  });
  
  // 设置队长技能
  const leaderSection = document.getElementById('char-detail-leader');
  const leaderInfo = document.getElementById('char-detail-leader-info');
  
  if (typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[charName]) {
    const bonus = LEADER_BONUS[charName];
    leaderSection.style.display = 'block';
    
    let bonusText = `目标技能：${bonus.skill}<br>`;
    if (bonus.costReduce) {
      bonusText += `• 能量消耗 -${bonus.costReduce}<br>`;
    }
    if (bonus.healBonus) {
      bonusText += `• 治疗效果 +${Math.round(bonus.healBonus * 100)}%<br>`;
    }
    if (bonus.debuffBonus) {
      bonusText += `• 减益效果 +${Math.round(bonus.debuffBonus * 100)}%<br>`;
    }
    if (bonus.extraEffects && bonus.extraEffects.length > 0) {
      const effectDescs = [];
      bonus.extraEffects.forEach(effect => {
        // 只处理有效的效果对象，使用 desc 字段
        if (effect && typeof effect === 'object' && effect.desc) {
          effectDescs.push(effect.desc);
        }
      });
      // 合并所有效果描述为一行
      if (effectDescs.length > 0) {
        bonusText += `• 额外效果：${effectDescs.join('，')}<br>`;
      }
    }
    
    leaderInfo.innerHTML = bonusText;
  } else {
    leaderSection.style.display = 'none';
  }
  
  // 显示弹窗
  const modal = document.getElementById('char-detail-modal');
  modal.classList.add('active');
}

// 关闭干员详情
export function closeCharDetail() {
  document.getElementById('char-detail-modal').classList.remove('active');
}

// 切换面板展开/折叠
export function toggleDetailSection(barElement) {
  event.stopPropagation(); // 阻止冒泡，避免关闭弹窗
  
  const section = barElement.parentElement;
  const isExpanded = section.classList.contains('expanded');
  
  if (isExpanded) {
    section.classList.remove('expanded');
  } else {
    section.classList.add('expanded');
  }
}

// 时装模式状态
let skinModeActive = false;

// 打开时装切换面板（进入时装模式）
export function openCharSkinPanel() {
  if (!currentDetailChar) return;
  
  const data = CHARACTER_DATA[currentDetailChar];
  if (!data || !data.id) return;
  
  enterSkinMode();
}

// 进入时装模式
export function enterSkinMode() {
  skinModeActive = true;
  const container = document.querySelector('.char-detail-container');
  container.classList.add('skin-mode');
  
  // 渲染时装列表
  renderSkinList();
}

// 退出时装模式
export function exitSkinMode() {
  skinModeActive = false;
  const container = document.querySelector('.char-detail-container');
  const skinList = document.getElementById('skin-mode-list');
  
  // 先移除类名触发滑出动画
  container.classList.remove('skin-mode');
  
  // 等待动画完成后再清空内容
  setTimeout(() => {
    skinList.innerHTML = '';
  }, 350); // 等待滑出动画完成
}

// 渲染时装列表
export function renderSkinList() {
  if (!currentDetailChar) return;
  
  const data = CHARACTER_DATA[currentDetailChar];
  if (!data || !data.id) return;
  
  const charId = data.id;
  const skins = SkinSystem.getCharSkins(charId);  // 已包含owned属性
  const currentSkinId = SkinSystem.getEquippedSkin(charId);
  
  // 获取干员立绘路径
  //const defaultArt = data.art || '';
  const defaultSkinhead = `assets/skinhead/${charId}_skin0.png`|| '';
  
  let html = '';
  
  // 默认外观
  const defaultEquipped = !currentSkinId;
  html += `
    <div class="skin-list-item ${defaultEquipped ? 'equipped' : 'owned'}" 
         onclick="selectSkinFromList('${charId}', null)">
      <div class="skin-item-thumb">
        ${defaultSkinhead ? `<img src="assets/skinhead/${charId}/${charId}_skin0.png" alt="默认">` : '👤'}
      </div>
      <div class="skin-item-name">默认外观</div>
    </div>
  `;
  
  // 时装列表
  skins.forEach(skin => {
    const owned = skin.owned;
    const equipped = skin.id === currentSkinId;
    
    let statusClass = 'locked';
    if (equipped) {
      statusClass = 'equipped';
    } else if (owned) {
      statusClass = 'owned';
    }
    
    // 时装缩略图
    const thumbSrc = skin.skinhead;
    
    html += `
      <div class="skin-list-item ${statusClass}" 
           onclick="${owned ? `selectSkinFromList('${charId}', '${skin.id}')` : ''}">
           <div class="skincolor" style="background: rgb(102, 125, 67); width: 7px;"></div>
        <div class="skin-item-thumb">
          ${thumbSrc ? `<img src="${thumbSrc}" alt="${skin.name}" width="100%">` : '🎨'}
        </div>
        <div class="skin-item-name">${skin.name}</div>
        ${!owned ? '<div class="skin-item-lock">🔒</div>' : ''}
      </div>
    `;
  });
  
  document.getElementById('skin-mode-list').innerHTML = html;
}

// 从列表选择时装
export function selectSkinFromList(charId, skinId) {
  if (skinId) {
    // 检查是否拥有 - 使用getCharSkins获取
    const skins = SkinSystem.getCharSkins(charId);
    const targetSkin = skins.find(s => s.id === skinId);
    if (!targetSkin || !targetSkin.owned) {
      showModal('❌ 未拥有', '您还未获得此时装', true);
      return;
    }
  }
  
  // 装备时装
  SkinSystem.equipSkin(charId, skinId);
  
  // 刷新立绘显示
  refreshCharDetailArt();
  
  // 重新渲染列表
  renderSkinList();
  
  // 刷新队伍UI（确保队伍页面也更新spine）
  if (typeof clearTeamRenderCache === 'function') {
    clearTeamRenderCache();
  }
  if (typeof clearSpineInstances === 'function') {
    clearSpineInstances('spine-slot-spine-');
  }
  const slotsDiv = document.getElementById('team-slots');
  if (slotsDiv) {
    slotsDiv.innerHTML = '';
  }
  if (typeof updateTeamUI === 'function') {
    updateTeamUI();
  }
}

// 刷新立绘显示（不退出时装模式）
export function refreshCharDetailArt() {
  if (!currentDetailChar) return;
  
  const data = CHARACTER_DATA[currentDetailChar];
  if (!data) return;
  
  // 获取当前装备的时装立绘和偏移
  let artSrc = data.art;
  let artOffset = null;
  
  if (data.id && typeof SkinSystem !== 'undefined') {
    const skinArt = SkinSystem.getSkinArt(data.id);
    if (skinArt) {
      artSrc = skinArt;
    }
    artOffset = SkinSystem.getSkinArtOffset(data.id);
  }
  
  // 如果没有皮肤偏移，检查干员数据是否有默认立绘偏移
  if (!artOffset && data.artOffset) {
    artOffset = data.artOffset;
  }
  
  const artWrapper = document.getElementById('char-detail-art-wrapper');
  const artImg = document.getElementById('char-detail-art');
  
  if (artSrc) {
    artImg.src = artSrc;
    artImg.style.display = 'block';
    
    // 应用偏移到wrapper容器（使用CSS变量，配合CSS的transition实现平滑过渡）
    if (artOffset) {
      artWrapper.style.setProperty('--skin-offset-x', `${artOffset.x}px`);
      artWrapper.style.setProperty('--skin-offset-y', `${artOffset.y}px`);
      artWrapper.style.setProperty('--skin-offset-z', `${artOffset.z}px`);
    } else {
      artWrapper.style.setProperty('--skin-offset-x', '0px');
      artWrapper.style.setProperty('--skin-offset-y', '0px');
      artWrapper.style.setProperty('--skin-offset-z', '0px');
    }
  }
}

// 刷新干员详情（用于时装切换后）
export function refreshCharDetail() {
  if (currentDetailChar) {
    showCharDetail(currentDetailChar);
  }
}

// ==================== 突破系统 ====================

// 更新突破按钮显示
function updateBreakthroughButton(charName, data, info) {
  const buttonsDiv = document.querySelector('.char-detail-buttons');
  if (!buttonsDiv) return;
  
  // 移除已有的突破按钮
  const existingBtn = buttonsDiv.querySelector('.char-detail-btn-breakthrough');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // 检查是否可以突破
  const potential = info?.potential || 1;
  const breakthrough = info?.breakthrough || null;
  
  if (canBreakthrough(data.rarity, potential, breakthrough)) {
    // 创建突破按钮
    const breakthroughBtn = document.createElement('div');
    breakthroughBtn.className = 'char-detail-btn-breakthrough';
    breakthroughBtn.onclick = (e) => {
      e.stopPropagation();
      openBreakthroughPanel(charName);
    };
    breakthroughBtn.innerHTML = `
      <div class="control-btn-flex">🌟</div>
      <span class="btn-text">突破</span>
    `;
    
    // 插入到时装按钮之前
    const skinBtn = buttonsDiv.querySelector('.char-detail-btn-skin');
    if (skinBtn) {
      buttonsDiv.insertBefore(breakthroughBtn, skinBtn);
    } else {
      buttonsDiv.prepend(breakthroughBtn);
    }
  }
}

// 打开突破选择面板
export function openBreakthroughPanel(charName) {
  const data = CHARACTER_DATA[charName];
  const info = state.inventory[charName];
  const cost = getBreakthroughCost();
  
  // 当前属性值（满潜能+60%）
  const potential = info?.potential || 1;
  const currentHp = applyPotentialBonus(data.hp, potential);
  const currentAtk = applyPotentialBonus(data.atk, potential);
  const currentDef = applyPotentialBonus(data.def, potential);
  const currentSpd = data.spd;
  
  // 属性突破后的值：潜能加成 + 额外40%
  const statsHp = currentHp + Math.floor(data.hp * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
  const statsAtk = currentAtk + Math.floor(data.atk * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
  const statsDef = currentDef + Math.floor(data.def * CONFIG.BREAKTHROUGH.STATS_EXTRA_BONUS);
  
  // 速度突破后的值：基础速度 × 1.4
  const speedSpd = Math.floor(data.spd * (1 + CONFIG.BREAKTHROUGH.SPEED_BONUS));
  
  showModal('🌟 干员突破', `
    <div class="breakthrough-panel">
      <p class="breakthrough-cost">消耗 <span class="gold-cost">${cost}</span> 金币（当前：${state.gold}）</p>
      <p class="breakthrough-hint">选择突破方向：</p>
      <div class="breakthrough-options">
        <div class="breakthrough-option" onclick="confirmBreakthrough('${charName}', 'stats')">
          <div class="breakthrough-icon">💠</div>
          <div class="breakthrough-name">属性突破</div>
          <div class="breakthrough-desc">
            HP/ATK/DEF 加成从+60%提升至+100%
          </div>
          <div class="breakthrough-preview">
            <div>HP: ${currentHp} → <span class="new-value">${statsHp}</span></div>
            <div>ATK: ${currentAtk} → <span class="new-value">${statsAtk}</span></div>
            <div>DEF: ${currentDef} → <span class="new-value">${statsDef}</span></div>
          </div>
        </div>
        <div class="breakthrough-option" onclick="confirmBreakthrough('${charName}', 'speed')">
          <div class="breakthrough-icon">⚡</div>
          <div class="breakthrough-name">速度突破</div>
          <div class="breakthrough-desc">
            获得+40%速度加成<br>其他属性保持+60%
          </div>
          <div class="breakthrough-preview">
            <div>SPD: ${currentSpd} → <span class="new-value">${speedSpd}</span></div>
            <div class="unchanged">HP/ATK/DEF 保持不变</div>
          </div>
        </div>
      </div>
      <p class="breakthrough-warning">⚠️ 突破后无法更改，请谨慎选择！</p>
      <button class="btn btn-secondary" onclick="closeModal();">取消</button>
    </div>
  `, true);
}

// 确认突破
export function confirmBreakthrough(charName, type) {
  const cost = getBreakthroughCost();
  
  // 检查金币是否足够
  if (state.gold < cost) {
    showModal('❌ 金币不足', `
      <p>突破需要 <span class="gold-cost">${cost}</span> 金币</p>
      <p>当前金币：${state.gold}</p>
      <button class="btn btn-primary" onclick="closeModal();">确定</button>
    `, false);
    return;
  }
  
  // 扣除金币
  store.consumeGold(cost);
  
  // 设置突破状态
  store.setBreakthrough(charName, type);
  
  // 更新资源UI
  updateResourceUI();
  
  // 刷新队伍UI（清除缓存确保队伍显示更新）
  clearTeamRenderCache();
  updateTeamUI();
  
  const typeName = type === 'stats' ? '属性' : '速度';
  const typeDesc = type === 'stats' ? 'HP/ATK/DEF加成提升至+100%' : '获得+40%速度加成';
  
  // 创建一个专门的确认按钮处理函数
  const confirmHandler = () => {
    const modal = document.getElementById('result-modal');
    if (modal) modal.classList.remove('active');
    // 刷新干员详情
    if (currentDetailChar) {
      showCharDetail(currentDetailChar);
    }
  };
  
  // 绑定到window以便onclick调用
  window._breakthroughConfirm = confirmHandler;
  
  showModal('✨ 突破成功！', `
    <div class="breakthrough-success">
      <div class="success-icon">🌟</div>
      <p class="success-name">${charName}</p>
      <p class="success-type">已完成【${typeName}突破】</p>
      <p class="success-desc">${typeDesc}</p>
      <p class="success-cost">消耗 ${cost} 金币</p>
      <button class="btn btn-primary" onclick="window._breakthroughConfirm();">确定</button>
    </div>
  `, false);
}

// 绑定到 window 以支持 HTML 中的 onclick 调用
window.showCharDetail = showCharDetail;
window.closeCharDetail = closeCharDetail;
window.toggleDetailSection = toggleDetailSection;
window.openCharSkinPanel = openCharSkinPanel;
window.exitSkinMode = exitSkinMode;
window.selectSkinFromList = selectSkinFromList;
window.openBreakthroughPanel = openBreakthroughPanel;
window.confirmBreakthrough = confirmBreakthrough;
window.refreshCharDetail = refreshCharDetail;
