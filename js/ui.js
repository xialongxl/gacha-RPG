// ==================== UI通用函数 ====================

// Spine播放器实例管理
const spineInstances = new Map();

// 全局删除Spine水印和控制栏
function removeAllSpineUI() {
  const selectors = [
    '.spine-player-controls',
    '.spine-player-buttons',
    '.spine-player-timeline',
    '.spine-player-popup',
    '#spine-player-button-logo',
    '.spine-player-button-icon-spine-logo',
    '[id*="spine-player-button"]'
  ];
  
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove());
  });
}

// 创建Spine播放器
function createSpinePlayer(containerId, spineData) {
  if (!spineData || !spineData.skel || !spineData.atlas) {
    console.warn('Spine数据不完整');
    return false;
  }
  
  if (typeof spine === 'undefined') {
    console.warn('Spine库未加载');
    return false;
  }
  
  setTimeout(() => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // viewport参数
    const vpWidth = 50;
    const vpHeight = 500;
    
    try {
      const player = new spine.SpinePlayer(containerId, {
        skelUrl: spineData.skel,
        atlasUrl: spineData.atlas,
        animation: spineData.animation || 'Idle',
        premultipliedAlpha: true,
        backgroundColor: '#00000000',
        alpha: true,
        showControls: false,
        viewport: {
          x: -vpWidth / 2,
          y: -30,
          width: vpWidth,
          height: vpHeight
        },
        success: function(player) {
          console.log('Spine加载成功:', containerId);
          removeAllSpineUI();
          setTimeout(removeAllSpineUI, 100);
          setTimeout(removeAllSpineUI, 300);
          setTimeout(removeAllSpineUI, 500);
          setTimeout(removeAllSpineUI, 1000);
        },
        error: function(player, msg) {
          console.error('Spine加载失败:', msg);
          showPlaceholder(containerId);
        }
      });
      
      spineInstances.set(containerId, player);
    } catch (e) {
      console.error('Spine初始化失败:', e);
      showPlaceholder(containerId);
    }
  }, 100);
  
  return true;
}

// 显示占位符
function showPlaceholder(containerId) {
  const cont = document.getElementById(containerId);
  if (cont) {
    cont.innerHTML = '<div class="img-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">👤</div>';
  }
}

// 生成Spine角色（队伍槽位和战斗界面用）
function createSpineMedia(charData, charName, className, width, height) {
  width = width || 125;
  height = height || 160;
  
  const containerId = `char-${charName.replace(/\s/g, '_')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  if (charData && charData.spine && charData.spine.skel && charData.spine.atlas) {
    createSpinePlayer(containerId, charData.spine);
    return `<div id="${containerId}" class="${className} spine-container" style="width:${width}px;height:${height}px;overflow:hidden;"></div>`;
  }
  
  // 没有spine资源，显示占位符
  return `<div class="img-placeholder ${className}" style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;">👤</div>`;
}

// 更新资源显示
function updateResourceUI() {
  document.getElementById('tickets').textContent = state.tickets;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('stamina').textContent = state.stamina;
  document.getElementById('pity').textContent = state.pity;
}

// 页面切换
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  
  document.getElementById(`page-${pageName}`).classList.add('active');
  document.querySelector(`.nav button[data-page="${pageName}"]`).classList.add('active');
  
  if (pageName === 'team') {
    updateTeamUI();
  } else if (pageName === 'battle') {
    updateStageUI();
  }
}

// 显示抽卡结果（显示干员数据）
function showGachaResult(results) {
  const container = document.getElementById('gacha-result');
  container.innerHTML = '';
  
  results.forEach((r, i) => {
    setTimeout(() => {
      const data = CHARACTER_DATA[r.name];
      const card = document.createElement('div');
      card.className = `card ${r.rarity.toLowerCase()}`;
      
      card.innerHTML = `
        <div class="card-stats">
          <div class="card-hp">HP: ${data.hp}</div>
          <div class="card-atk">ATK: ${data.atk}</div>
          <div class="card-def">DEF: ${data.def}</div>
          <div class="card-spd">SPD: ${data.spd}</div>
        </div>
        <div class="card-info">
          <div class="card-rarity">${r.rarity}</div>
          <div class="card-name">${r.name}</div>
        </div>
      `;
      container.appendChild(card);
    }, i * 150);
  });
}

// 显示模态框
function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-rewards').innerHTML = content;
  document.getElementById('result-modal').classList.add('active');
}

// 关闭模态框
function closeModal() {
  document.getElementById('result-modal').classList.remove('active');
  closeBattleField();
}

// 关闭战斗界面
function closeBattleField() {
  document.getElementById('battle-field').classList.remove('active');
  document.getElementById('stage-panel').style.display = 'block';
  document.getElementById('skill-buttons').innerHTML = '';
  document.getElementById('target-select').innerHTML = '';
}

// 添加战斗日志
function addBattleLog(text, type = 'normal') {
  battle.log.push({ text, type });
  if (battle.log.length > 50) battle.log.shift();
}

// 渲染战斗日志
function renderBattleLog() {
  const logDiv = document.getElementById('battle-log');
  logDiv.innerHTML = battle.log.map(l => 
    `<div class="log-entry ${l.type}">${l.text}</div>`
  ).join('');
  logDiv.scrollTop = logDiv.scrollHeight;
}