// ==================== 队伍系统 ====================

import { state, store } from './state.js';
import { CHARACTER_DATA } from './data.js';
import { CONFIG, applyPotentialBonus } from './config.js';
import { createSpineMedia } from './ui.js';
import { showCharDetail } from './charDetail.js';
import { SkinSystem } from './skin.js';
import { LEADER_BONUS } from './skills.js';

// 记录上次渲染的队伍状态
let lastRenderedTeam = null;
// 当前选中的槽位
let selectedSlot = null;

// 清除队伍渲染缓存（供外部调用）
export function clearTeamRenderCache() {
  lastRenderedTeam = null;
}

// 更新队伍UI
export function updateTeamUI() {
  renderTeamSlots();
  renderCharacterList();
}

// 记录上次选中的槽位（用于缓存检查）
let lastSelectedSlot = null;

// 渲染队伍槽位（用Spine）
function renderTeamSlots() {
  const slotsDiv = document.getElementById('team-slots');
  if (!slotsDiv) return;
  
  // 检查队伍和选中状态是否有变化
  const currentTeam = JSON.stringify(state.team);
  const slotChanged = lastSelectedSlot !== selectedSlot;
  
  if (lastRenderedTeam === currentTeam && !slotChanged && slotsDiv.children.length > 0) {
    return;
  }
  lastRenderedTeam = currentTeam;
  lastSelectedSlot = selectedSlot;
  
  slotsDiv.innerHTML = '';
  
  state.team.forEach((charName, i) => {
    const slot = document.createElement('div');
    const isLeader = i === 0;
    slot.className = `team-slot ${charName ? 'filled' : ''} ${selectedSlot === i ? 'selected' : ''} ${isLeader ? 'leader' : ''}`;
    
    if (charName) {
      const data = CHARACTER_DATA[charName];
      const potential = state.inventory[charName]?.potential || 1;
      const stars = '★'.repeat(data.rarity);
      
      // 获取时装spine（如果有）
      const spineData = data.id && SkinSystem 
        ? SkinSystem.getCurrentSpine(data.id, data.spine) 
        : data.spine;
      const renderData = { ...data, spine: spineData };
      const mediaHtml = createSpineMedia(renderData, charName, 'slot-spine', 125, 160);
      
      const hasLeaderSkill = LEADER_BONUS && LEADER_BONUS[charName];
      const leaderBadge = isLeader ? '<div class="leader-badge">👑队长</div>' : '';
      const leaderSkillInfo = isLeader && hasLeaderSkill ? `<div class="leader-skill-info">队长技：${LEADER_BONUS[charName].skill}强化</div>` : '';
      
      slot.innerHTML = `
        ${leaderBadge}
        ${mediaHtml}
        <div class="slot-stars">${stars}</div>
        <div class="slot-name">${charName}</div>
        <div class="slot-info">潜能${potential} | ATK:${applyPotentialBonus(data.atk, potential)}</div>
        ${leaderSkillInfo}
      `;
    } else {
      const leaderHint = isLeader ? '<div class="leader-badge">👑队长位</div>' : '';
      slot.innerHTML = `
        ${leaderHint}
        <div class="img-placeholder" style="width:125px;height:160px;display:flex;align-items:center;justify-content:center;font-size:32px;">+</div>
        <div class="slot-name">空槽位</div>
        <div class="slot-info">点击选择</div>
      `;
    }
    
    slot.onclick = () => selectSlot(i);
    slotsDiv.appendChild(slot);
  });
}

// 渲染干员列表（显示干员数据）
function renderCharacterList() {
  const listDiv = document.getElementById('char-list');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  
  // 按星级排序（高到低）
  const sorted = Object.entries(state.inventory).sort((a, b) => {
    const rarityA = CHARACTER_DATA[a[0]].rarity;
    const rarityB = CHARACTER_DATA[b[0]].rarity;
    return rarityB - rarityA;
  });
  
  sorted.forEach(([name, info]) => {
    const data = CHARACTER_DATA[name];
    const potential = info.potential || 1;
    const bonus = Math.round((potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100);
    const stars = '★'.repeat(data.rarity);
    
    const hasLeaderSkill = LEADER_BONUS && LEADER_BONUS[name];
    const leaderIcon = hasLeaderSkill ? '👑' : '';
    
    const item = document.createElement('div');
    // 如果有槽位选中，添加 can-assign 类
    const canAssignClass = selectedSlot !== null ? ' can-assign' : '';
    item.className = `char-item star-${data.rarity}${canAssignClass}`;
    
    item.innerHTML = `
      <div class="char-header">
        <span class="char-stars">${stars}</span>
      </div>
      <div class="char-header">
        <span class="char-potential">潜能${potential}</span>
      </div>
      <div class="char-name">${leaderIcon}${name}</div>
      <div class="char-stats-grid">
        <div>HP:${applyPotentialBonus(data.hp, potential)}</div>
        <div>ATK:${applyPotentialBonus(data.atk, potential)}</div>
        <div>DEF:${applyPotentialBonus(data.def, potential)}</div>
        <div>SPD:${data.spd}</div>
      </div>
      ${bonus > 0 ? `<div class="char-bonus">+${bonus}% 属性</div>` : ''}
      ${hasLeaderSkill ? `<div class="char-leader-hint">可作为队长</div>` : ''}
    `;
    
    // 左键：槽位选中时编队，否则查看详情
    item.onclick = (e) => {
      e.stopPropagation();
      if (selectedSlot !== null) {
        // 有槽位选中，直接编队
        assignToSlot(name);
      } else {
        // 没有槽位选中，查看详情
        showCharDetail(name);
      }
    };

    // 右键：智能快速编队
    item.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      quickAssign(name);
    };
    
    listDiv.appendChild(item);
  });
  
  if (sorted.length === 0) {
    listDiv.innerHTML = '<div style="color:#aaa;padding:20px;">还没有干员，去抽卡吧！</div>';
  }
}

// 选择槽位
export function selectSlot(index) {
  if (selectedSlot === index) {
    // 再次点击已选中的槽位：清空该槽位的干员
    if (state.team[index]) {
      store.setTeamMember(index, null);
      lastRenderedTeam = null;
    }
    selectedSlot = null;
  } else {
    // 切换到新槽位
    selectedSlot = index;
  }
  updateTeamUI(); // 更新整个UI以刷新干员列表的 can-assign 状态
}

// 取消槽位选择
export function cancelSlotSelection() {
  if (selectedSlot !== null) {
    selectedSlot = null;
    updateTeamUI();
  }
}

// 分配干员到槽位（用于左键编队）
export function assignToSlot(charName) {
  if (selectedSlot === null) {
    return;
  }
  
  // 如果干员已在队伍中，先移除
  const existingIndex = state.team.indexOf(charName);
  if (existingIndex !== -1) {
    store.setTeamMember(existingIndex, null);
  }
  
  store.setTeamMember(selectedSlot, charName);
  selectedSlot = null; // 编队后取消选择
  lastRenderedTeam = null;
  
  updateTeamUI();
}

// 智能快速编队（右键）
export function quickAssign(charName) {
  // 检查干员是否已在队伍中
  const existingIndex = state.team.indexOf(charName);
  if (existingIndex !== -1) {
    alert(`${charName} 已在队伍中（位置${existingIndex + 1}）`);
    return;
  }
  
  // 查找第一个空槽位
  const emptySlot = state.team.findIndex(slot => slot === null);
  
  if (emptySlot !== -1) {
    // 有空槽位，自动编入
    store.setTeamMember(emptySlot, charName);
    lastRenderedTeam = null;
    updateTeamUI();
  } else {
    // 没有空槽位，提示选择替换位置
    alert('队伍已满，请先点击槽位选择替换位置');
    // 可选：自动选中第一个槽位
    // selectedSlot = 0;
    // updateTeamUI();
  }
}

// 初始化队伍页面的点击事件（取消槽位选择）及滚动条控制
export function initTeamPageEvents() {
  const teamPage = document.getElementById('page-team');
  if (teamPage) {
    teamPage.addEventListener('click', (e) => {
      // 如果点击的不是槽位或干员卡片，则取消选择
      if (!e.target.closest('.team-slot') && !e.target.closest('.char-item')) {
        cancelSlotSelection();
      }
    });

    // 滚动条隐藏逻辑（仿存档窗口）
    let scrollTimeout;
    teamPage.addEventListener('scroll', () => {
      teamPage.classList.add('scrolling');
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        teamPage.classList.remove('scrolling');
      }, 1000); // 停止滚动1秒后隐藏
    });
  }
}

// 页面加载时初始化 (Moved to main.js or init function)
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', initTeamPageEvents);
// } else {
//   initTeamPageEvents();
// }
