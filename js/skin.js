// ==================== 时装系统 ====================

// ==================== 时装数据 ====================
const SKIN_DATA = {
  // 缪尔赛思 - 2个时装位
  'mlyss_skin_1': {
    charId: 'char_249_mlyss',
    name: '时装1（占位）',
    price: 20,
    skinhead: null,
    spine: null  // 暂无资源

  },
  'mlyss_skin_2': {
    charId: 'char_249_mlyss',
    name: '时装2（占位）',
    price: 20,
    skinhead: null,
    spine: null
  },
  
  // 铃兰 - 3个时装位
  'lisa_skin_1': {
    charId: 'char_358_lisa',
    name: '弃土花开',
    price: 20,
    skinhead: "assets/skinhead/char_358_lisa/char_358_lisa_skin1.png",
    spine: null
  },
  'lisa_skin_2': {
    charId: 'char_358_lisa',
    name: '春之颂',
    price: 20,
    skinhead: "assets/skinhead/char_358_lisa/char_358_lisa_skin2.png",
    spine: null
  },
  'lisa_skin_3': {
    charId: 'char_358_lisa',
    name: '雪霁',
    price: 20,
    skinhead: "assets/skinhead/char_358_lisa/char_358_lisa_skin3.png",
    spine: null
  }
};

// ==================== 时装系统 ====================
const SkinSystem = {
  
  // 获取角色可用时装列表
  getCharSkins(charId) {
    const skins = [];
    for (const [skinId, data] of Object.entries(SKIN_DATA)) {
      if (data.charId === charId) {
        skins.push({
          id: skinId,
          ...data,
          owned: state.ownedSkins?.includes(skinId) || false,
          equipped: state.equippedSkins?.[charId] === skinId
        });
      }
    }
    return skins;
  },
  
  // 购买时装
  buySkin(skinId) {
    const skin = SKIN_DATA[skinId];
    if (!skin) {
      console.error('时装不存在:', skinId);
      return { success: false, message: '时装不存在' };
    }
    
    // 检查是否已拥有
    if (state.ownedSkins?.includes(skinId)) {
      return { success: false, message: '已拥有该时装' };
    }
    
    // 检查时装券是否足够
    if ((state.skinTickets || 0) < skin.price) {
      return { success: false, message: `时装券不足（需要${skin.price}张）` };
    }
    
    // 扣除时装券
    state.skinTickets -= skin.price;
    
    // 添加到已拥有列表
    if (!state.ownedSkins) state.ownedSkins = [];
    state.ownedSkins.push(skinId);
    
    // 保存
    saveState();
    
    return { success: true, message: `成功购买时装：${skin.name}` };
  },
  
  // 装备时装
  equipSkin(charId, skinId) {
    // skinId为null表示使用默认外观
    if (skinId === null) {
      if (!state.equippedSkins) state.equippedSkins = {};
      delete state.equippedSkins[charId];
      saveState();
      return { success: true, message: '已切换为默认外观' };
    }
    
    const skin = SKIN_DATA[skinId];
    if (!skin) {
      return { success: false, message: '时装不存在' };
    }
    
    // 检查是否拥有
    if (!state.ownedSkins?.includes(skinId)) {
      return { success: false, message: '未拥有该时装' };
    }
    
    // 装备
    if (!state.equippedSkins) state.equippedSkins = {};
    state.equippedSkins[charId] = skinId;
    saveState();
    
    return { success: true, message: `已装备：${skin.name}` };
  },
  
  // 获取角色当前装备的时装ID
  getEquippedSkin(charId) {
    return state.equippedSkins?.[charId] || null;
  },
  
  // 获取角色当前使用的Spine路径（含时装）
  getCurrentSpine(charId, defaultSpine) {
    const equippedSkinId = this.getEquippedSkin(charId);
    if (!equippedSkinId) {
      return defaultSpine;  // 使用默认外观
    }
    
    const skin = SKIN_DATA[equippedSkinId];
    if (skin && skin.spine) {
      return skin.spine;  // 使用时装外观
    }
    
    return defaultSpine;  // 时装没有资源，使用默认
  },
  
  // 获取角色当前使用的立绘路径（含时装）
  getSkinArt(charId) {
    const equippedSkinId = this.getEquippedSkin(charId);
    if (!equippedSkinId) {
      return null;  // 使用默认外观
    }
    
    const skin = SKIN_DATA[equippedSkinId];
    if (skin && skin.art) {
      return skin.art;  // 使用时装立绘
    }
    
    return null;  // 时装没有立绘资源，使用默认
  },
  
  // ==================== 兑换系统 ====================
  
  // 无尽币兑换时装券
  exchangeCoinToTicket(amount) {
    const rate = CONFIG.ENDLESS_COIN?.EXCHANGE?.COIN_TO_TICKET || 100;
    const coinNeeded = amount * rate;
    
    if ((state.endlessCoin || 0) < coinNeeded) {
      return { 
        success: false, 
        message: `无尽币不足（需要${coinNeeded}，当前${state.endlessCoin || 0}）` 
      };
    }
    
    state.endlessCoin -= coinNeeded;
    state.skinTickets = (state.skinTickets || 0) + amount;
    saveState();
    
    return { 
      success: true, 
      message: `成功兑换${amount}张时装券` 
    };
  },
  
  // ==================== UI ====================
  
  // 显示时装商店
  showShop() {
    const allSkins = Object.entries(SKIN_DATA).map(([id, data]) => ({
      id,
      ...data,
      owned: state.ownedSkins?.includes(id) || false
    }));
    
    // 按角色分组
    const groupedByChar = {};
    allSkins.forEach(skin => {
      if (!groupedByChar[skin.charId]) {
        groupedByChar[skin.charId] = [];
      }
      groupedByChar[skin.charId].push(skin);
    });
    
    let html = `
      <div class="skin-shop">
        <div class="skin-shop-header">
          <div class="skin-currency">
            <span>🎖️ 无尽币: <b>${state.endlessCoin || 0}</b></span>
            <span>🎫 时装券: <b>${state.skinTickets || 0}</b></span>
            <button class="btn-exchange-ticket" onclick="SkinSystem.showExchangeDialog()">兑换时装券</button>
          </div>
        </div>
        <div class="skin-shop-list">
    `;
    
    for (const [charId, skins] of Object.entries(groupedByChar)) {
      // 获取角色名
      const charData = Object.values(CHARACTER_DATA).find(c => c.id === charId);
      const charName = charData?.name || charId;
      
      html += `<div class="skin-char-group">`;
      html += `<h3>${charName}</h3>`;
      html += `<div class="skin-list">`;
      
      skins.forEach(skin => {
        const statusClass = skin.owned ? 'owned' : 'not-owned';
        const btnText = skin.owned ? '已拥有' : `购买 (${skin.price}券)`;
        const btnDisabled = skin.owned || (state.skinTickets || 0) < skin.price;
        
        html += `
          <div class="skin-card ${statusClass}">
            <div class="skin-preview">🎨</div>
            <div class="skin-info">
              <div class="skin-name">${skin.name}</div>
              <div class="skin-price">${skin.price} 时装券</div>
            </div>
            <button class="skin-buy-btn" 
                    ${btnDisabled ? 'disabled' : ''} 
                    onclick="SkinSystem.handleBuy('${skin.id}')">
              ${btnText}
            </button>
          </div>
        `;
      });
      
      html += `</div></div>`;
    }
    
    html += `</div></div>`;
    
    showModal('🎨 时装商店', html, false);
  },
  
  // 显示兑换对话框
  showExchangeDialog() {
    const rate = CONFIG.ENDLESS_COIN?.EXCHANGE?.COIN_TO_TICKET || 100;
    const maxAmount = Math.floor((state.endlessCoin || 0) / rate);
    
    const html = `
      <div class="exchange-dialog">
        <p>兑换比例: ${rate} 无尽币 = 1 时装券</p>
        <p>当前无尽币: ${state.endlessCoin || 0}</p>
        <p>最多可兑换: ${maxAmount} 张</p>
        <div class="exchange-input">
          <label>兑换数量:</label>
          <input type="number" id="exchange-amount" min="1" max="${maxAmount}" value="1">
        </div>
        <div class="exchange-buttons">
          <button onclick="SkinSystem.doExchange()">确认兑换</button>
          <button onclick="closeModal()">取消</button>
        </div>
      </div>
    `;
    
    showModal('🔄 兑换时装券', html, false);
  },
  
  // 执行兑换
  doExchange() {
    const input = document.getElementById('exchange-amount');
    const amount = parseInt(input?.value) || 0;
    
    if (amount <= 0) {
      alert('请输入有效数量');
      return;
    }
    
    const result = this.exchangeCoinToTicket(amount);
    alert(result.message);
    
    if (result.success) {
      closeModal();
      updateResourceUI();
    }
  },
  
  // 处理购买
  handleBuy(skinId) {
    const result = this.buySkin(skinId);
    alert(result.message);
    
    if (result.success) {
      this.showShop();  // 刷新商店界面
      updateResourceUI();
    }
  },
  
  // 显示角色时装切换界面 - PRTS风格
  showCharSkinPanel(charId) {
    const skins = this.getCharSkins(charId);
    const charData = Object.values(CHARACTER_DATA).find(c => c.id === charId);
    const charName = charData?.name || charId;
    const currentSkinId = this.getEquippedSkin(charId);
    
    // 获取状态标签文字
    const getLabel = (isEquipped, canEquip) => {
      if (isEquipped) return '使用中';
      if (canEquip) return '已获得';
      return '未获得';
    };
    
    let html = `
      <div class="skin-switch-panel">
        <div class="skin-switch-list">
          <!-- 默认外观 -->
          <div class="skin-option default ${!currentSkinId ? 'equipped' : ''}" 
               onclick="SkinSystem.handleEquip('${charId}', null)">
            <div class="skin-option-label">${!currentSkinId ? '使用中' : '已获得'}</div>
            <div class="skin-option-preview">👤</div>
            <div class="skin-option-info">
              <div class="skin-option-name">默认外观</div>
            </div>
          </div>
    `;
    
    skins.forEach(skin => {
      const isEquipped = skin.id === currentSkinId;
      const canEquip = skin.owned;
      const label = getLabel(isEquipped, canEquip);
      
      html += `
        <div class="skin-option ${isEquipped ? 'equipped' : ''} ${!canEquip ? 'locked' : ''}"
             onclick="${canEquip ? `SkinSystem.handleEquip('${charId}', '${skin.id}')` : ''}">
          <div class="skin-option-label">${label}</div>
          <div class="skin-option-preview">🎨</div>
          <div class="skin-option-info">
            <div class="skin-option-name">${skin.name}</div>
          </div>
        </div>
      `;
    });
    
    html += `</div></div>`;
    
    showModal(`🎨 ${charName} - 时装切换`, html, false);
  },
  
  // 处理装备
  handleEquip(charId, skinId) {
    const result = this.equipSkin(charId, skinId);
    
    if (result.success) {
      closeModal();
      // 刷新详情界面
      if (typeof refreshCharDetail === 'function') {
        refreshCharDetail();
      }
    } else {
      alert(result.message);
    }
  }
};

// ==================== 商店系统已移至 shop.js ====================
