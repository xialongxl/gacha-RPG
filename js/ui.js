// ==================== UI通用函数 ====================

// Spine播放器实例管理（存储Pixi App和Spine对象）
const spineInstances = new Map();

// 创建Spine播放器（使用Pixi渲染）
function createSpinePlayer(containerId, spineData) {
  if (!spineData || !spineData.skel || !spineData.atlas) {
    console.warn('Spine数据不完整');
    return false;
  }
  
  if (typeof PIXI === 'undefined') {
    console.warn('Pixi库未加载');
    return false;
  }
  
  const container = document.getElementById(containerId);
  if (!container) return false;
  
  // 已经有内容了，跳过
  if (container.children.length > 0) return true;
  
  // 获取容器尺寸
  const containerWidth = container.offsetWidth || 125;
  const containerHeight = container.offsetHeight || 160;
  
  try {
    // 创建Pixi应用 - 使用2倍分辨率渲染更清晰
    const app = new PIXI.Application({
      width: containerWidth,
      height: containerHeight,
      backgroundAlpha: 0,
      resolution: 2,
      autoDensity: true,
      antialias: true
    });
    
    // 设置canvas样式
    app.view.style.width = containerWidth + 'px';
    app.view.style.height = containerHeight + 'px';
    container.appendChild(app.view);
    
    // 使用 PIXI.Loader 加载Spine资源 (PixiJS 6.x)
    const loader = new PIXI.Loader();
    const assetName = containerId + '_spine';
    
    loader.add(assetName, spineData.skel);
    
    loader.load((loader, resources) => {
      try {
        const spineResource = resources[assetName];
        if (!spineResource || !spineResource.spineData) {
          console.error('Spine资源加载失败:', containerId, spineResource);
          showPlaceholder(containerId);
          return;
        }
        
        // 创建Spine动画对象
        const spineAnim = new PIXI.spine.Spine(spineResource.spineData);
        
        // 尝试播放动画
        const targetAnim = spineData.animation || 'Idle';
        const animations = spineAnim.spineData.animations;
        let animToPlay = null;
        
        // 查找目标动画
        for (let i = 0; i < animations.length; i++) {
          if (animations[i].name === targetAnim) {
            animToPlay = targetAnim;
            break;
          }
        }
        
        // 如果没找到，用第一个动画
        if (!animToPlay && animations.length > 0) {
          animToPlay = animations[0].name;
        }
        
        if (animToPlay) {
          spineAnim.state.setAnimation(0, animToPlay, true);
        }
        
        // 计算缩放比例使spine适应容器
        const bounds = spineAnim.getLocalBounds();
        const spineWidth = bounds.width;
        const spineHeight = bounds.height;
        
        // 计算适合容器的缩放比例（留15%边距）
        const scaleX = (containerWidth * 0.85) / spineWidth;
        const scaleY = (containerHeight * 0.85) / spineHeight;
        const scale = Math.min(scaleX, scaleY);
        
        spineAnim.scale.set(scale);
        
        // 计算spine边界的中心点（考虑bounds的偏移）
        const boundsCenter = {
          x: (bounds.x + bounds.width / 2) * scale,
          y: (bounds.y + bounds.height / 2) * scale
        };
        
        // 将spine放置在容器中心，补偿边界偏移
        spineAnim.x = containerWidth / 2 - boundsCenter.x;
        spineAnim.y = containerHeight / 2 - boundsCenter.y;
        
        // 添加到舞台
        app.stage.addChild(spineAnim);
        
        // 保存实例
        spineInstances.set(containerId, { app, spine: spineAnim });
        
        console.log('Pixi Spine加载成功:', containerId, {
          animation: animToPlay,
          scale: scale.toFixed(3),
          bounds: { w: spineWidth.toFixed(0), h: spineHeight.toFixed(0) }
        });
        
      } catch (e) {
        console.error('Spine创建失败:', containerId, e);
        showPlaceholder(containerId);
      }
    });
    
    loader.onError.add((error) => {
      console.error('Spine资源加载错误:', containerId, error);
      showPlaceholder(containerId);
    });
    
  } catch (e) {
    console.error('Pixi初始化失败:', e);
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
          const oldInstance = spineInstances.get(containerId);
          if (oldInstance && oldInstance.app) {
            try {
              oldInstance.app.destroy(true);
            } catch (e) {}
          }
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
    const instance = spineInstances.get(id);
    if (instance) {
      try {
        // 销毁Pixi应用
        if (instance.app && typeof instance.app.destroy === 'function') {
          instance.app.destroy(true);
        }
      } catch (e) {
        console.warn('销毁Pixi实例失败:', id, e);
      }
    }
    // 清空DOM容器
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = '';
    }
    spineInstances.delete(id);
  });
}

// 更新资源显示
function updateResourceUI() {
  document.getElementById('tickets').textContent = state.tickets;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('pity').textContent = state.pity;
  
  // 无尽币和时装券
  const endlessCoinEl = document.getElementById('endless-coin');
  const skinTicketsEl = document.getElementById('skin-tickets');
  if (endlessCoinEl) endlessCoinEl.textContent = state.endlessCoin || 0;
  if (skinTicketsEl) skinTicketsEl.textContent = state.skinTickets || 0;
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
function showModal(title, content, showDefaultBtn = true) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-rewards').innerHTML = content;
  
  // 控制默认按钮显示/隐藏
  const defaultBtn = document.getElementById('btn-close-modal');
  if (defaultBtn) {
    defaultBtn.style.display = showDefaultBtn ? 'block' : 'none';
  }
  
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
