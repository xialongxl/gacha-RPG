// UI 更新函数
// 生成角色媒体元素（支持webm视频和图片）
function createCharMedia(src, alt, className) {
  if (!src) {
    return `<div class="img-placeholder ${className}" style="width:100%;height:100%;">👤</div>`;
  }
  
  const isVideo = src.endsWith('.webm') || src.endsWith('.mp4');
  
  if (isVideo) {
    return `
      <video class="${className}" 
             src="${src}" 
             autoplay 
             loop 
             muted 
             playsinline
             onerror="this.outerHTML='<div class=\\'img-placeholder ${className}\\'>?</div>'"
      ></video>
    `;
  } else {
    return `
      <img class="${className}" 
           src="${src}" 
           alt="${alt}"
           onerror="this.outerHTML='<div class=\\'img-placeholder ${className}\\'>?</div>'"
      >
    `;
  }
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
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // 移除所有导航按钮高亮
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  
  // 显示目标页面
  document.getElementById(`page-${pageName}`).classList.add('active');
  // 高亮对应按钮
  document.querySelector(`.nav button[data-page="${pageName}"]`).classList.add('active');
  
  // 页面特定更新
  if (pageName === 'team') {
    updateTeamUI();
  } else if (pageName === 'battle') {
    updateStageUI();
  }
}

// 显示抽卡结果
function showGachaResult(results) {
  const container = document.getElementById('gacha-result');
  container.innerHTML = '';
  
  results.forEach((r, i) => {
    setTimeout(() => {
      const data = CHARACTER_DATA[r.name];
      const card = document.createElement('div');
      card.className = `card ${r.rarity.toLowerCase()}`;
      
      const mediaHtml = createCharMedia(data.img, r.name, 'card-video');
      
      card.innerHTML = `
        ${mediaHtml}
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