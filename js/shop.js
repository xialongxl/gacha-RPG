// ==================== 商店系统 ====================
// 从skin.js分离出来的商店系统

// ==================== 商店系统对象 ====================
const ShopSystem = {
  // 初始化商店
  init() {
    this.bindTabEvents();
    this.renderSkinShop();
    this.updateCurrency();
  },
  
  // 绑定标签切换事件
  bindTabEvents() {
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // 切换标签激活状态
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // 切换内容显示
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.shop-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`shop-${tabName}`)?.classList.add('active');
      });
    });
  },
  
  // 更新货币显示
  updateCurrency() {
    // 更新商店页面的货币显示
    const endlessCoinEl = document.getElementById('shop-endless-coin');
    const skinTicketsEl = document.getElementById('shop-skin-tickets');
    
    if (endlessCoinEl) {
      endlessCoinEl.textContent = state.endlessCoin || 0;
    }
    if (skinTicketsEl) {
      skinTicketsEl.textContent = state.skinTickets || 0;
    }
    
    // 同时更新顶部资源栏
    const topEndlessCoin = document.getElementById('endless-coin');
    const topSkinTickets = document.getElementById('skin-tickets');
    
    if (topEndlessCoin) {
      topEndlessCoin.textContent = state.endlessCoin || 0;
    }
    if (topSkinTickets) {
      topSkinTickets.textContent = state.skinTickets || 0;
    }
  },
  
  // ==================== 时装商店 ====================
  
  // 渲染时装商店
  renderSkinShop() {
    const container = document.getElementById('skin-shop-list');
    if (!container) return;
    
    // 检查SKIN_DATA是否存在
    if (typeof SKIN_DATA === 'undefined') {
      container.innerHTML = '<p style="text-align:center;color:#888;">时装数据加载中...</p>';
      return;
    }
    
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
    
    let html = '';
    
    for (const [charId, skins] of Object.entries(groupedByChar)) {
      // 获取角色名（CHARACTER_DATA的key是角色名，value.id是角色ID）
      let charName = charId;
      if (typeof CHARACTER_DATA !== 'undefined') {
        for (const [name, char] of Object.entries(CHARACTER_DATA)) {
          if (char.id === charId) {
            charName = name;
            break;
          }
        }
      }
      
      html += `<div class="skin-char-group">`;
      html += `<h3>${charName}</h3>`;
      html += `<div class="skin-list">`;
      
      skins.forEach(skin => {
        const statusClass = skin.owned ? 'owned' : 'not-owned';
        const btnText = skin.owned ? '已拥有' : `购买 (${skin.price}券)`;
        const btnDisabled = skin.owned || (state.skinTickets || 0) < skin.price;
        
        // 使用缩略图
        const thumbSrc = skin.skinhead || '';
        const thumbHtml = thumbSrc 
          ? `<img src="${thumbSrc}" alt="${skin.name}" class="skin-card-thumb">`
          : `<div class="skin-card-placeholder">🎨</div>`;
        
        html += `
          <div class="skin-card ${statusClass}">
            <div class="skin-preview">${thumbHtml}</div>
            <div class="skin-info">
              <div class="skin-name">${skin.name}</div>
              <div class="skin-price">${skin.price} 时装券</div>
            </div>
            <button class="skin-buy-btn" 
                    ${btnDisabled ? 'disabled' : ''} 
                    onclick="ShopSystem.buySkin('${skin.id}')">
              ${btnText}
            </button>
          </div>
        `;
      });
      
      html += `</div></div>`;
    }
    
    if (html === '') {
      html = '<p style="text-align:center;color:#888;">暂无可购买的时装</p>';
    }
    
    container.innerHTML = html;
  },
  
  // 购买时装
  buySkin(skinId) {
    // 检查SkinSystem是否存在
    if (typeof SkinSystem === 'undefined') {
      alert('时装系统未加载');
      return;
    }
    
    const result = SkinSystem.buySkin(skinId);
    
    if (result.success) {
      alert(result.message);
      this.renderSkinShop();
      this.updateCurrency();
      if (typeof updateResourceUI === 'function') {
        updateResourceUI();
      }
    } else {
      alert(result.message);
    }
  },
  
  // ==================== 无尽币商店（只卖时装券） ====================
  
  // 无尽币兑换时装券
  exchangeCoinToTicket() {
    const input = document.getElementById('coin-exchange-amount');
    const amount = parseInt(input?.value) || 0;
    
    if (amount <= 0) {
      alert('请输入有效数量');
      return;
    }
    
    // 获取兑换比例
    const rate = CONFIG.ENDLESS_COIN?.EXCHANGE?.COIN_TO_TICKET || 100;
    const coinNeeded = amount * rate;
    
    // 检查无尽币是否足够
    if ((state.endlessCoin || 0) < coinNeeded) {
      alert(`无尽币不足！需要 ${coinNeeded}，当前 ${state.endlessCoin || 0}`);
      return;
    }
    
    // 扣除无尽币
    state.endlessCoin -= coinNeeded;
    
    // 增加时装券
    state.skinTickets = (state.skinTickets || 0) + amount;
    
    // 保存状态
    saveState();
    
    // 更新界面
    this.updateCurrency();
    this.renderSkinShop();  // 刷新时装商店（可能可以购买了）
    
    if (typeof updateResourceUI === 'function') {
      updateResourceUI();
    }
    
    alert(`成功兑换 ${amount} 张时装券！`);
  }
};

// ==================== 页面切换时刷新商店 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 监听商店页面显示
  const shopPage = document.getElementById('page-shop');
  if (shopPage) {
    // 使用MutationObserver监听class变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (shopPage.classList.contains('active')) {
            ShopSystem.init();
          }
        }
      });
    });
    
    observer.observe(shopPage, { attributes: true });
  }
});