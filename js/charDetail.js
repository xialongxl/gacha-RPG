// ==================== 干员详情系统 ====================

import { CHARACTER_DATA, applyPotentialBonus } from './data.js';
import { state } from './state.js';
import { CONFIG } from './config.js';
import { SKILL_EFFECTS, LEADER_BONUS } from './skills.js';
import { SkinSystem } from './skin.js';
import { showModal, clearSpineInstances } from './ui.js';
import { clearTeamRenderCache, updateTeamUI } from './team.js';

// 当前查看的干员
let currentDetailChar = null;

// 显示干员详情
export function showCharDetail(charName) {
  currentDetailChar = charName;
  const data = CHARACTER_DATA[charName];
  if (!data) return;
  
  const info = state.inventory[charName];
  const potential = info?.potential || 1;
  const bonus = Math.round((potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100);
  
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
  
  // 设置星级
  const stars = '★'.repeat(data.rarity);
  document.getElementById('char-detail-stars').textContent = stars;
  
  // 设置名字
  document.getElementById('char-detail-name').textContent = charName;
  
  // 设置潜能
  const potentialText = `潜能 ${potential} 级${bonus > 0 ? ` (+${bonus}% 属性)` : ''}`;
  document.getElementById('char-detail-potential').textContent = potentialText;
  
  // 设置属性
  // 设置属性区块
  const statsDiv = document.getElementById('char-detail-stats');
  statsDiv.innerHTML = `
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">HP</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.hp, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">ATK</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.atk, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">DEF</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.def, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">SPD</span>
      <span class="char-detail-stat-value">${data.spd}</span>
  </div>
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
    
    skillDiv.innerHTML = `
      <div class="char-detail-skill-name">${skillName}</div>
      <div class="char-detail-skill-cost">${costText}</div>
      <div class="char-detail-skill-desc">${skill.desc || ''}</div>
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
      bonusText += `• 额外效果：全队攻击力+10%<br>`;
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

// 绑定到 window 以支持 HTML 中的 onclick 调用
window.showCharDetail = showCharDetail;
window.closeCharDetail = closeCharDetail;
window.toggleDetailSection = toggleDetailSection;
window.openCharSkinPanel = openCharSkinPanel;
window.exitSkinMode = exitSkinMode;
window.selectSkinFromList = selectSkinFromList;
