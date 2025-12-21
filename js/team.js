// 队伍系统

// 更新队伍UI
function updateTeamUI() {
  renderTeamSlots();
  renderCharacterList();
}

// 渲染队伍槽位
function renderTeamSlots() {
  const slotsDiv = document.getElementById('team-slots');
  slotsDiv.innerHTML = '';
  
  state.team.forEach((charName, i) => {
    const slot = document.createElement('div');
    slot.className = `team-slot ${charName ? 'filled' : ''} ${selectedSlot === i ? 'selected' : ''}`;
    
    if (charName) {
      const data = CHARACTER_DATA[charName];
      const mediaHtml = createCharMedia(data.img, charName, 'slot-video');
      
      slot.innerHTML = `
        ${mediaHtml}
        <div class="slot-name">${charName}</div>
        <div class="slot-info">${data.rarity} | ATK:${data.atk}</div>
      `;
    } else {
      slot.innerHTML = `
        <div class="img-placeholder" style="width:80px;height:100px;">+</div>
        <div class="slot-name">空槽位</div>
        <div class="slot-info">点击选择</div>
      `;
    }
    
    slot.onclick = () => selectSlot(i);
    slotsDiv.appendChild(slot);
  });
}

// 渲染角色列表
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
    
    const mediaHtml = createCharMedia(data.img, name, 'char-video');
    
    item.innerHTML = `
      ${mediaHtml}
      <div class="char-name">${name}</div>
      <div class="char-stats">${data.rarity} x${info.count}</div>
    `;
    item.onclick = () => assignToSlot(name);
    listDiv.appendChild(item);
  });
  
  if (sorted.length === 0) {
    listDiv.innerHTML = '<div style="color:#aaa;padding:20px;">还没有角色，去抽卡吧！</div>';
  }
}

// 渲染角色列表
function renderCharacterList() {
  const listDiv = document.getElementById('char-list');
  listDiv.innerHTML = '';
  
  // 按稀有度排序
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
      <div class="char-name">${name}</div>
      <div class="char-stats">HP: ${data.hp}</div>
      <div class="char-stats">ATK: ${data.atk}</div>
      <div class="char-stats">持有: x${info.count}</div>
    `;
    item.onclick = () => assignToSlot(name);
    listDiv.appendChild(item);
  });
  
  if (sorted.length === 0) {
    listDiv.innerHTML = '<div style="color:#aaa;">还没有角色，去抽卡吧！</div>';
  }
}

// 选择槽位
function selectSlot(index) {
  if (selectedSlot === index) {
    // 再次点击取消选择，或移除角色
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
  
  // 如果角色已在队伍中，先移除
  const existingIndex = state.team.indexOf(charName);
  if (existingIndex !== -1) {
    state.team[existingIndex] = null;
  }
  
  // 分配到选中槽位
  state.team[selectedSlot] = charName;
  selectedSlot = null;
  
  updateTeamUI();
  saveState();
}