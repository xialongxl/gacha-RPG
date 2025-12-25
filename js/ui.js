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
  
  const container = document.getElementById(containerId);
  if (!container) return false;
  
  // 已经有内容了，跳过
  if (container.children.length > 0) return true;
  
  // viewport参数
  const vpWidth = 100;
  const vpHeight = 350;
  
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
        y: 0,
        width: vpWidth,
        height: vpHeight
      },
      success: function(player) {
        console.log('Spine加载成功:', containerId);
        removeAllSpineUI();
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
  
  // 用固定ID，避免重复加载
  const containerId = `spine-${className}-${charName.replace(/\s/g, '_')}`;
  
  if (charData && charData.spine && charData.spine.skel && charData.spine.atlas) {
    // 延迟加载，等DOM渲染完成
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container && container.children.length === 0) {
        // 清理旧实例（如果有）
        if (spineInstances.has(containerId)) {
          spineInstances.delete(containerId);
        }
        createSpinePlayer(containerId, charData.spine);
      }
    }, 50);
    
    return `<div id="${containerId}" class="${className} spine-container" style="width:${width}px;height:${height}px;overflow:hidden;"></div>`;
  }
  
  // 没有spine资源，显示占位符
  return `<div class="img-placeholder ${className}" style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;">👤</div>`;
}

// 清理指定前缀的Spine实例
function clearSpineInstances(prefix) {
  const toDelete = [];
  spineInstances.forEach((instance, id) => {
    if (id.startsWith(prefix)) {
      toDelete.push(id);
    }
  });
  toDelete.forEach(id => {
    spineInstances.delete(id);
  });
}

// 更新资源显示
function updateResourceUI() {
  document.getElementById('tickets').textContent = state.tickets;
  document.getElementById('gold').textContent = state.gold;
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

// 显示抽卡结果（显示星级和干员数据）
function showGachaResult(results) {
  const container = document.getElementById('gacha-result');
  container.innerHTML = '';
  
  // 收集6星角色，播放演出
  const sixStarResults = results.filter(r => r.rarity === 6);
  sixStarResults.forEach(r => {
    if (typeof queueCutscene === 'function') {
      queueCutscene(r.name);
    }
  });
  
  // 显示所有抽卡结果卡片
  results.forEach((r, i) => {
    setTimeout(() => {
      const data = CHARACTER_DATA[r.name];
      const card = document.createElement('div');
      card.className = `card star-${r.rarity}`;
      
      const stars = '★'.repeat(r.rarity);
      const potential = state.inventory[r.name]?.potential || 1;
      const isNew = potential === 1 && state.inventory[r.name]?.count === 1;
      
      card.innerHTML = `
        <div class="card-stars">${stars}</div>
        ${isNew ? '<div class="card-new">NEW!</div>' : `<div class="card-potential">潜能${potential}</div>`}
        <div class="card-stats">
          <div>HP: ${data.hp}</div>
          <div>ATK: ${data.atk}</div>
          <div>DEF: ${data.def}</div>
          <div>SPD: ${data.spd}</div>
        </div>
        <div class="card-info">
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
  
  // 清理战斗界面的Spine实例
  clearSpineInstances('spine-unit-spine-');
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