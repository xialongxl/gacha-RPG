// ==================== 时装系统 ====================

import { state, store } from './state.js';
import { CHARACTER_DATA } from './data.js';
import { showModal, closeModal, clearSpineInstances } from './ui.js';
import { clearTeamRenderCache, updateTeamUI } from './team.js';
// 假设 charDetail.js 将被重构为导出 refreshCharDetail
import { refreshCharDetail } from './charDetail.js';

// ==================== 自动填充时装资源路径 ====================
export function processSkinData(data) {
  const processed = {};
  for (const [skinId, skin] of Object.entries(data)) {
    // 从 skinId 解析 skinIndex: "mlyss_skin_1" → 1
    const match = skinId.match(/_skin_(\d+)$/);
    const skinIndex = match ? parseInt(match[1]) : null;
    const { charId } = skin;
    
    // 构建处理后的数据
    const processedSkin = {
      ...skin,
      // 自动填充路径（已手动指定则优先使用手动值）
      skinhead: skin.skinhead || (charId && skinIndex ?
        `assets/skinhead/${charId}/${charId}_skin${skinIndex}.png` : null),
      art: skin.art || (charId && skinIndex ?
        `assets/art/${charId}/${charId}_skin${skinIndex}.png` : null)
    };
    
    // 如果指定了 spineFile，自动生成完整 spine 配置
    // spineFile 只需写文件名，如 "char_358_lisa_epoque_22"
    if (skin.spineFile && !skin.spine) {
      const spineDir = `spine/${charId}/${charId}_skin${skinIndex}`;
      processedSkin.spine = {
        skel: `${spineDir}/${skin.spineFile}.skel`,
        atlas: `${spineDir}/${skin.spineFile}.atlas`,
        animation: skin.spineAnimation || 'Idle'
      };
    }
    
    processed[skinId] = processedSkin;
  }
  return processed;
}

// ==================== 时装原始数据（简化配置） ====================
// 说明：
// - skinhead、art 自动根据 charId 和 skinIndex 生成
// - spineFile 只需写文件名，会自动生成完整 spine 配置
// - 如需自定义动画，可添加 spineAnimation 字段（默认 'Idle'）
// - 仍可使用完整的 spine 对象覆盖自动生成
export const SKIN_DATA_RAW = {
  // 缪尔赛思 - 2个时装位
  'mlyss_skin_1': {
    charId: 'char_249_mlyss',
    name: '新枝',
    price: 20,
    artOffset: { x: 0, y: -205, z: 0 },
    spineFile: 'char_249_mlyss_boc_8'
  },
  'mlyss_skin_2': {
    charId: 'char_249_mlyss',
    name: '漫步于黄金之梦',
    price: 20,
    artOffset: { x: 0, y: -230, z: 0 },
    spineFile: 'char_249_mlyss_ambienceSynesthesia_6'  // 只需文件名，自动生成完整路径
  },
  
  // 铃兰 - 3个时装位
  'lisa_skin_1': {
    charId: 'char_358_lisa',
    name: '弃土花开',
    price: 20,
    artOffset: { x: 0, y: -282, z: 0 }
  },
  'lisa_skin_2': {
    charId: 'char_358_lisa',
    name: '春之颂',
    price: 20,
    artOffset: { x: 0, y: -300, z: 0 }
  },
  'lisa_skin_3': {
    charId: 'char_358_lisa',
    name: '雪霁',
    price: 20,
    artOffset: { x: 0, y: -299, z: 0 },
    spineFile: 'char_358_lisa_epoque_22'  // 只需文件名，自动生成完整路径
  }
};

// 处理后的时装数据
export const SKIN_DATA = processSkinData(SKIN_DATA_RAW);

// ==================== 时装系统 ====================
export const SkinSystem = {
  
  // 获取干员可用时装列表
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
    store.consumeSkinTickets(skin.price);
    
    // 添加到已拥有列表
    store.addSkin(skinId);
    
    return { success: true, message: `成功购买时装：${skin.name}` };
  },
  
  // 装备时装
  equipSkin(charId, skinId) {
    // skinId为null表示使用默认外观
    if (skinId === null) {
      store.equipSkin(charId, null);
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
    store.equipSkin(charId, skinId);
    
    return { success: true, message: `已装备：${skin.name}` };
  },
  
  // 获取干员当前装备的时装ID
  getEquippedSkin(charId) {
    return state.equippedSkins?.[charId] || null;
  },
  
  // 获取干员当前使用的Spine路径（含时装）
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
  
  // 获取干员当前使用的立绘路径（含时装）
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
  
  // 获取干员当前使用的立绘偏移（含时装）
  getSkinArtOffset(charId) {
    const equippedSkinId = this.getEquippedSkin(charId);
    if (!equippedSkinId) {
      return null;  // 使用默认偏移（0,0,0）
    }
    
    const skin = SKIN_DATA[equippedSkinId];
    if (skin && skin.artOffset) {
      return skin.artOffset;  // 使用时装偏移
    }
    
    return null;  // 时装没有偏移配置，使用默认
  },
  
  // ==================== UI（干员详情页时装切换） ====================
  
  // 显示干员时装切换界面 - PRTS风格
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
      
      // 清除队伍渲染缓存
      if (typeof clearTeamRenderCache === 'function') {
        clearTeamRenderCache();
      }
      
      // 清除spine实例缓存
      if (typeof clearSpineInstances === 'function') {
        clearSpineInstances('spine-slot-spine-');
      }
      
      // 强制清空队伍槽位容器，确保重新渲染
      const slotsDiv = document.getElementById('team-slots');
      if (slotsDiv) {
        slotsDiv.innerHTML = '';
      }
      
      // 刷新队伍UI
      if (typeof updateTeamUI === 'function') {
        updateTeamUI();
      }
    } else {
      alert(result.message);
    }
  }
};

// ==================== 商店系统已移至 shop.js ====================

// 绑定到 window 以支持 HTML 中的 onclick 调用
window.SkinSystem = SkinSystem;
