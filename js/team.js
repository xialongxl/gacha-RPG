// ==================== 队伍系统 ====================

// 更新队伍UI
function updateTeamUI() {
  renderTeamSlots();
  renderCharacterList();
}

// 渲染队伍槽位（用Spine）
function renderTeamSlots() {
  const slotsDiv = document.getElementById('team-slots');
  slotsDiv.innerHTML = '';
  
  state.team.forEach((charName, i) => {
    const slot = document.createElement('div');
    slot.className = `team-slot ${charName ? 'filled' : ''} ${selectedSlot === i ? 'selected' : ''}`;
    
    if (charName) {
      const data = CHARACTER_DATA[charName];
      const mediaHtml = createSpineMedia(data, charName, 'slot-spine', 125, 160);
      
      slot.innerHTML = `
        ${mediaHtml}
        <div class="slot-name">${charName}</div>
        <div class="slot-info">${data.rarity} | ATK:${data.atk}</div>
      `;
    } else {
      slot.innerHTML = `
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
  
  const sortOrder = { SSR: 0, SR: 1, R: 2, N: 3 };
  const sorted = Object.entries(state.inventory).sort((a, b) => {
    const rarityA = CHARACTER_DATA[a[0]].rarity;
    const rarityB = CHARACTER_DATA[b[0]].rarity;
    return sortOrder[rarityA] - sortOrder[rarityB];
  });
  
  sorted.forEach(([name, info]) => {
    const data = CHARACTER_DATA[name];
    const item = document.createElement('div');
    item.className = `char-item ${data.rarity.toLowerCase()}`;
    
    item.innerHTML = `
      <div class="char-header">
        <span class="char-rarity">${data.rarity}</span>
        <span class="char-count">x${info.count}</span>
      </div>
      <div class="char-name">${name}</div>
      <div class="char-stats-grid">
        <div>HP:${data.hp}</div>
        <div>ATK:${data.atk}</div>
        <div>DEF:${data.def}</div>
        <div>SPD:${data.spd}</div>
      </div>
    `;
    item.onclick = () => assignToSlot(name);
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
  
  updateTeamUI();
  saveState();
}