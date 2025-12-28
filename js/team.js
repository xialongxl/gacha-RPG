// ==================== 队伍系统 ====================

// 记录上次渲染的队伍状态
let lastRenderedTeam = null;

// 清除队伍渲染缓存（供外部调用）
function clearTeamRenderCache() {
  lastRenderedTeam = null;
}

// 更新队伍UI
function updateTeamUI() {
  renderTeamSlots();
  renderCharacterList();
}

// 渲染队伍槽位（用Spine）
function renderTeamSlots() {
  const slotsDiv = document.getElementById('team-slots');
  
  // 检查队伍是否有变化
  const currentTeam = JSON.stringify(state.team);
  if (lastRenderedTeam === currentTeam && slotsDiv.children.length > 0) {
    return;
  }
  lastRenderedTeam = currentTeam;
  
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
      const spineData = data.id && typeof SkinSystem !== 'undefined' 
        ? SkinSystem.getCurrentSpine(data.id, data.spine) 
        : data.spine;
      const renderData = { ...data, spine: spineData };
      const mediaHtml = createSpineMedia(renderData, charName, 'slot-spine', 125, 160);
      
      const hasLeaderSkill = typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[charName];
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

// 渲染角色列表（显示干员数据）
function renderCharacterList() {
  const listDiv = document.getElementById('char-list');
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
    
    const hasLeaderSkill = typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[name];
    const leaderIcon = hasLeaderSkill ? '👑' : '';
    
    const item = document.createElement('div');
    item.className = `char-item star-${data.rarity}`;
    
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
    
    // 单击查看详情
    // 左键查看详情
    item.onclick = (e) => {
      e.stopPropagation();
      showCharDetail(name);
    };

    // 右键编队
    item.oncontextmenu = (e) => {
      e.preventDefault(); // 阻止默认右键菜单
      e.stopPropagation();
      assignToSlot(name);
      
    };
    
    listDiv.appendChild(item);
  });
  
  if (sorted.length === 0) {
    listDiv.innerHTML = '<div style="color:#aaa;padding:20px;">还没有角色，去抽卡吧！</div>';
  }
}

// 选择槽位
function selectSlot(index) {
  if (selectedSlot === index) {
    if (state.team[index]) {
      state.team[index] = null;
      lastRenderedTeam = null;
      saveState();
    }
    selectedSlot = null;
  } else {
    selectedSlot = index;
  }
  renderTeamSlots();
}

// 分配角色到槽位
function assignToSlot(charName) {
  if (selectedSlot === null) {
    alert('请先点击上方的队伍槽位');
    return;
  }
  
  const existingIndex = state.team.indexOf(charName);
  if (existingIndex !== -1) {
    state.team[existingIndex] = null;
  }
  
  state.team[selectedSlot] = charName;
  selectedSlot = null;
  lastRenderedTeam = null;
  
  updateTeamUI();
  saveState();
}
