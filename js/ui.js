// ==================== UI通用函数 ====================

// Spine播放器实例管理（存储Pixi App和Spine对象）
const spineInstances = new Map();

// 已加载的SpineData缓存（key为skel文件路径，value为spineData）
const spineDataCache = new Map();

// 最大WebGL上下文数量限制（浏览器通常限制8-16个）
const MAX_SPINE_INSTANCES = 8;

// 清理所有Spine实例
function clearAllSpineInstances() {
  spineInstances.forEach((instance, id) => {
    try {
      if (instance && instance.app && typeof instance.app.destroy === 'function') {
        instance.app.destroy(true, { children: true, texture: true, baseTexture: true });
      }
    } catch (e) {
      console.warn('销毁Pixi实例失败:', id, e);
    }
    const container = document.getElementById(id);
    if (container) container.innerHTML = '';
  });
  spineInstances.clear();
  
  // 清理Pixi纹理缓存
  if (typeof PIXI !== 'undefined') {
    try {
      // 清理Loader缓存
      if (PIXI.Loader && PIXI.Loader.shared) {
        PIXI.Loader.shared.reset();
      }
      // 清理纹理缓存
      if (PIXI.utils && PIXI.utils.clearTextureCache) {
        PIXI.utils.clearTextureCache();
      }
      // 清理BaseTexture缓存
      if (PIXI.utils && PIXI.utils.BaseTextureCache) {
        for (const key in PIXI.utils.BaseTextureCache) {
          delete PIXI.utils.BaseTextureCache[key];
        }
      }
      // 清理Texture缓存
      if (PIXI.utils && PIXI.utils.TextureCache) {
        for (const key in PIXI.utils.TextureCache) {
          delete PIXI.utils.TextureCache[key];
        }
      }
    } catch (e) {
      console.warn('清理Pixi缓存失败:', e);
    }
  }
  
  // 同时清理SpineData缓存，确保完全释放
  spineDataCache.clear();
  
  console.log('已清理所有Spine实例和纹理缓存');
}

// 限制Spine实例数量，清理最旧的
function limitSpineInstances() {
  while (spineInstances.size >= MAX_SPINE_INSTANCES) {
    // 清理最旧的实例
    const firstKey = spineInstances.keys().next().value;
    if (firstKey) {
      destroySingleSpineInstance(firstKey);
    } else {
      break;
    }
  }
}

// 销毁单个Spine实例
function destroySingleSpineInstance(id) {
  const instance = spineInstances.get(id);
  if (instance) {
    try {
      if (instance.app) {
        instance.app.destroy(true, { children: true, texture: true, baseTexture: true });
      }
    } catch (e) {}
  }
  const container = document.getElementById(id);
  if (container) container.innerHTML = '';
  spineInstances.delete(id);
}

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
  
  // 限制实例数量
  limitSpineInstances();
  
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
    
    // 立即记录实例，防止异步期间重复创建
    spineInstances.set(containerId, { app, spine: null });
    
    // 检查SpineData是否已缓存
    const cacheKey = spineData.skel;
    
    if (spineDataCache.has(cacheKey)) {
      // 直接使用缓存的SpineData
      const cachedSpineData = spineDataCache.get(cacheKey);
      createSpineFromData(app, cachedSpineData, containerId, spineData.animation, containerWidth, containerHeight);
      return true;
    }
    
    // 首次加载资源
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
        
        // 缓存SpineData
        spineDataCache.set(cacheKey, spineResource.spineData);
        
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

// 从缓存的SpineData创建Spine（用于重复使用同一角色资源）
function createSpineFromData(app, cachedSpineData, containerId, animation, containerWidth, containerHeight) {
  try {
    const spineAnim = new PIXI.spine.Spine(cachedSpineData);
    
    // 播放动画
    const targetAnim = animation || 'Idle';
    const animations = spineAnim.spineData.animations;
    let animToPlay = null;
    
    for (let i = 0; i < animations.length; i++) {
      if (animations[i].name === targetAnim) {
        animToPlay = targetAnim;
        break;
      }
    }
    if (!animToPlay && animations.length > 0) {
      animToPlay = animations[0].name;
    }
    if (animToPlay) {
      spineAnim.state.setAnimation(0, animToPlay, true);
    }
    
    // 计算缩放
    const bounds = spineAnim.getLocalBounds();
    const scaleX = (containerWidth * 0.85) / bounds.width;
    const scaleY = (containerHeight * 0.85) / bounds.height;
    const scale = Math.min(scaleX, scaleY);
    spineAnim.scale.set(scale);
    
    // 定位
    const boundsCenter = {
      x: (bounds.x + bounds.width / 2) * scale,
      y: (bounds.y + bounds.height / 2) * scale
    };
    spineAnim.x = containerWidth / 2 - boundsCenter.x;
    spineAnim.y = containerHeight / 2 - boundsCenter.y;
    
    app.stage.addChild(spineAnim);
    spineInstances.set(containerId, { app, spine: spineAnim });
    
    console.log('Spine从缓存加载:', containerId);
  } catch (e) {
    console.error('从缓存创建Spine失败:', containerId, e);
    showPlaceholder(containerId);
  }
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
  let container = document.getElementById('battle-log');
  
  // 添加可拖拽头部（如果不存在）
  if (!container.querySelector('.battle-log-header')) {
    const header = document.createElement('div');
    header.className = 'battle-log-header';
    header.innerHTML = `
      <span class="battle-log-title">📜 战斗日志</span>
      <button class="battle-log-minimize">−</button>
    `;
    
    const content = document.createElement('div');
    content.className = 'battle-log-content';
    content.id = 'battle-log-content';
    
    // 移动原有内容
    content.innerHTML = container.innerHTML;
    container.innerHTML = '';
    container.appendChild(header);
    container.appendChild(content);
    
    // 初始化拖拽
    initBattleLogDrag(container, header);
    
    // 最小化按钮
    header.querySelector('.battle-log-minimize').onclick = (e) => {
      e.stopPropagation();
      container.classList.toggle('minimized');
      e.target.textContent = container.classList.contains('minimized') ? '+' : '−';
    };
  }
  
  const content = document.getElementById('battle-log-content');
  content.innerHTML = battle.log.map(entry => 
    `<div class="log-entry ${entry.type}">${entry.text}</div>`
  ).join('');
  content.scrollTop = content.scrollHeight;
}

// 战斗日志拖拽功能
function initBattleLogDrag(container, header) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('battle-log-minimize')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    container.style.transition = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = (startLeft + dx) + 'px';
    container.style.top = (startTop + dy) + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.transition = '';
  });
}

// 召唤物区域拖拽功能
function initSummonSideDrag(container) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  container.addEventListener('mousedown', (e) => {
    if (!e.target.classList.contains('summon-side-header') && 
        !e.target.classList.contains('summon-side-title')) return;
    if (e.target.classList.contains('summon-side-minimize')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    container.style.transition = 'none';
    container.style.transform = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = (startLeft + dx) + 'px';
    container.style.top = (startTop + dy) + 'px';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.transition = '';
  });
}

// 召唤物区域最小化切换
function toggleSummonSideMinimize() {
  const container = document.getElementById('summon-side');
  if (container) {
    container.classList.toggle('minimized');
    const btn = container.querySelector('.summon-side-minimize');
    if (btn) {
      btn.textContent = container.classList.contains('minimized') ? '+' : '−';
    }
  }
}
