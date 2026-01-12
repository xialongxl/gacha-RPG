// ==================== 商店系统 ====================
// 从skin.js分离出来的商店系统

import { state, store } from './state.js';
import { CONFIG } from './config.js';
import { CHARACTER_DATA } from './data.js';
import { updateResourceUI } from './ui.js';
import { SkinSystem, SKIN_DATA } from './skin.js';

// ==================== 商店系统对象 ====================
export const ShopSystem = {
  // 初始化商店
  init() {
    console.log('🛍️ 商店系统初始化...');
    this.bindTabEvents();
    this.renderSkinShop();
    this.renderEndlessShop();
    this.updateCurrency();
    console.log('✅ 商店系统初始化完成');
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
    const reviveTicketsEl = document.getElementById('shop-revive-tickets');
    const relayTicketsEl = document.getElementById('shop-relay-tickets');
    
    if (endlessCoinEl) {
      endlessCoinEl.textContent = state.endlessCoin || 0;
    }
    if (skinTicketsEl) {
      skinTicketsEl.textContent = state.skinTickets || 0;
    }
    if (reviveTicketsEl) {
      reviveTicketsEl.textContent = state.reviveTickets || 0;
    }
    if (relayTicketsEl) {
      relayTicketsEl.textContent = state.relayTickets || 0;
    }
    
    // 同时更新顶部资源栏
    const topEndlessCoin = document.getElementById('endless-coin');
    const topSkinTickets = document.getElementById('skin-tickets');
    const topReviveTickets = document.getElementById('revive-tickets');
    const topRelayTickets = document.getElementById('relay-tickets');
    
    if (topEndlessCoin) {
      topEndlessCoin.textContent = state.endlessCoin || 0;
    }
    if (topSkinTickets) {
      topSkinTickets.textContent = state.skinTickets || 0;
    }
    if (topReviveTickets) {
      topReviveTickets.textContent = state.reviveTickets || 0;
    }
    if (topRelayTickets) {
      topRelayTickets.textContent = state.relayTickets || 0;
    }
  },
  
  // ==================== 时装商店 ====================
  
  // 渲染时装商店
  renderSkinShop() {
    const container = document.getElementById('skin-shop-list');
    if (!container) return;
    
    // 检查SKIN_DATA是否存在
    if (!SKIN_DATA) {
      container.innerHTML = '<p style="text-align:center;color:#888;">时装数据加载中...</p>';
      return;
    }
    
    const allSkins = Object.entries(SKIN_DATA).map(([id, data]) => ({
      id,
      ...data,
      owned: state.ownedSkins?.includes(id) || false
    }));
    
    // 按干员分组
    const groupedByChar = {};
    allSkins.forEach(skin => {
      if (!groupedByChar[skin.charId]) {
        groupedByChar[skin.charId] = [];
      }
      groupedByChar[skin.charId].push(skin);
    });
    
    let html = '';
    
    for (const [charId, skins] of Object.entries(groupedByChar)) {
      // 获取干员名（CHARACTER_DATA的key是干员名，value.id是干员ID）
      let charName = charId;
      if (CHARACTER_DATA) {
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
                    onclick="window.ShopSystem.buySkin('${skin.id}')">
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
    if (!SkinSystem) {
      alert('时装系统未加载');
      return;
    }
    
    const result = SkinSystem.buySkin(skinId);
    
    if (result.success) {
      alert(result.message);
      this.renderSkinShop();
      this.updateCurrency();
      updateResourceUI();
    } else {
      alert(result.message);
    }
  },
  
  // ==================== 无尽币商店 ====================
  
  // 渲染无尽商店（复活券、接力券）
  renderEndlessShop() {
    const container = document.getElementById('coin-shop-list');
    if (!container) return;
    
    // ==================== 复活券商品 ====================
    const reviveConfig = CONFIG.ENDLESS_SHOP?.REVIVE_TICKET;
    if (reviveConfig) {
      // 移除旧的复活券商品（如果存在）
      const oldReviveItem = document.getElementById('revive-ticket-item');
      if (oldReviveItem) oldReviveItem.remove();
      
      // 创建复活券商品元素
      const reviveItem = document.createElement('div');
      reviveItem.className = 'coin-shop-item';
      reviveItem.id = 'revive-ticket-item';
      reviveItem.innerHTML = `
        <div class="coin-shop-icon">${reviveConfig.icon}</div>
        <div class="coin-shop-info">
          <div class="coin-shop-name">${reviveConfig.name}</div>
          <div class="coin-shop-desc">${reviveConfig.desc}</div>
          <div class="coin-shop-price">🎖️ ${reviveConfig.price} 无尽币 = 1 复活券</div>
        </div>
        <div class="coin-shop-actions">
          <input type="number" id="revive-buy-amount" min="1" value="1" class="coin-exchange-input">
          <button class="btn btn-primary" onclick="window.ShopSystem.buyReviveTicket()">购买</button>
        </div>
      `;
      
      // 插入到列表最前面
      container.insertBefore(reviveItem, container.firstChild);
    }
    
    // ==================== 接力券商品 ====================
    const relayConfig = CONFIG.ENDLESS_SHOP?.RELAY_TICKET;
    if (relayConfig) {
      // 移除旧的接力券商品（如果存在）
      const oldRelayItem = document.getElementById('relay-ticket-item');
      if (oldRelayItem) oldRelayItem.remove();
      
      // 创建接力券商品元素
      const relayItem = document.createElement('div');
      relayItem.className = 'coin-shop-item';
      relayItem.id = 'relay-ticket-item';
      relayItem.innerHTML = `
        <div class="coin-shop-icon">${relayConfig.icon}</div>
        <div class="coin-shop-info">
          <div class="coin-shop-name">${relayConfig.name}</div>
          <div class="coin-shop-desc">${relayConfig.desc}</div>
          <div class="coin-shop-price">🎖️ ${relayConfig.price} 无尽币 = 1 接力券</div>
        </div>
        <div class="coin-shop-actions">
          <input type="number" id="relay-buy-amount" min="1" value="1" class="coin-exchange-input">
          <button class="btn btn-primary" onclick="window.ShopSystem.buyRelayTicket()">购买</button>
        </div>
      `;
      
      // 插入到复活券后面（如果有的话）
      const reviveItem = document.getElementById('revive-ticket-item');
      if (reviveItem && reviveItem.nextSibling) {
        container.insertBefore(relayItem, reviveItem.nextSibling);
      } else if (reviveItem) {
        container.appendChild(relayItem);
      } else {
        container.insertBefore(relayItem, container.firstChild);
      }
    }
  },
  
  // 购买复活券
  buyReviveTicket() {
    const reviveConfig = CONFIG.ENDLESS_SHOP?.REVIVE_TICKET;
    if (!reviveConfig) {
      alert('商品配置错误');
      return;
    }
    
    // 获取购买数量
    const input = document.getElementById('revive-buy-amount');
    const amount = parseInt(input?.value) || 0;
    
    if (amount <= 0) {
      alert('请输入有效数量');
      return;
    }
    
    const totalPrice = reviveConfig.price * amount;
    
    if ((state.endlessCoin || 0) < totalPrice) {
      alert(`无尽币不足！需要 ${totalPrice}，当前 ${state.endlessCoin || 0}`);
      return;
    }
    
    // 扣除无尽币
    store.consumeEndlessCoin(totalPrice);
    
    // 增加复活券
    store.addReviveTickets(amount);
    
    // 更新界面
    this.updateCurrency();
    this.renderEndlessShop();
    updateResourceUI();
    
    alert(`成功购买 ${amount} 张${reviveConfig.name}！`);
  },
  
  // 购买接力券
  buyRelayTicket() {
    const relayConfig = CONFIG.ENDLESS_SHOP?.RELAY_TICKET;
    if (!relayConfig) {
      alert('商品配置错误');
      return;
    }
    
    // 获取购买数量
    const input = document.getElementById('relay-buy-amount');
    const amount = parseInt(input?.value) || 0;
    
    if (amount <= 0) {
      alert('请输入有效数量');
      return;
    }
    
    const totalPrice = relayConfig.price * amount;
    
    if ((state.endlessCoin || 0) < totalPrice) {
      alert(`无尽币不足！需要 ${totalPrice}，当前 ${state.endlessCoin || 0}`);
      return;
    }
    
    // 扣除无尽币
    store.consumeEndlessCoin(totalPrice);
    
    // 增加接力券
    store.addRelayTickets(amount);
    
    // 更新界面
    this.updateCurrency();
    this.renderEndlessShop();
    updateResourceUI();
    
    alert(`成功购买 ${amount} 张${relayConfig.name}！`);
  },
  
  // 无尽币兑换时装券
  exchangeCoinToTicket() {
    const input = document.getElementById('coin-exchange-amount');
    const amount = parseInt(input?.value) || 0;
    
    if (amount <= 0) {
      alert('请输入有效数量');
      return;
    }
    
    // 获取兑换比例
    const rate = CONFIG.ENDLESS_COIN?.EXCHANGE?.COIN_TO_TICKET || 10;
    const coinNeeded = amount * rate;
    
    // 检查无尽币是否足够
    if ((state.endlessCoin || 0) < coinNeeded) {
      alert(`无尽币不足！需要 ${coinNeeded}，当前 ${state.endlessCoin || 0}`);
      return;
    }
    
    // 扣除无尽币
    store.consumeEndlessCoin(coinNeeded);
    
    // 增加时装券
    store.addSkinTickets(amount);
    
    // 更新界面
    this.updateCurrency();
    this.renderSkinShop();  // 刷新时装商店（可能可以购买了）
    
    updateResourceUI();
    
    alert(`成功购买 ${amount} 张时装券！`);
  }
};

// ==================== 页面切换时刷新商店 ====================
export function initShopPageObserver() {
  const shopPage = document.getElementById('page-shop');
  if (shopPage) {
    // 使用MutationObserver监听class变化
    const observer = new MutationObserver((mutations) => {
      let shouldInit = false;
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (shopPage.classList.contains('active')) {
            shouldInit = true;
          }
        }
      });
      
      if (shouldInit) {
        ShopSystem.init();
      }
    });
    
    observer.observe(shopPage, { attributes: true });
    console.log('👀 商店页面观察器已启动');
  }
}

// 绑定到 window 以支持 HTML 中的 onclick 调用
window.ShopSystem = ShopSystem;
