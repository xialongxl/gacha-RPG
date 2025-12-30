// ==================== 主入口 ====================
//
// 功能说明：
// - 游戏初始化入口
// - 绑定UI事件
// - 加载存档并启动游戏
// - 存档管理界面
//
// 依赖：
// - state.js (存档系统)
// - ui.js (界面更新)
// - gacha.js (抽卡系统)
// - battle.js (战斗系统)
// - endless.js (无尽模式)
//
// ========================================================================

import { initSaveSystem, currentSaveSlot, getSaveList, loadState, deleteSave, createNewSave, exportSave, importSave } from './state.js';
import { updateResourceUI, showPage, showModal, closeModal, initSaveManagerScrollbar } from './ui.js';
import { dailyLogin, gachaSingle, gachaTen } from './gacha.js';
import { fleeBattle } from './battle.js';
import { showEndlessMode, initEndlessMode } from './endless_and_smartAI/endless.js';
import { AudioManager, BGMPlayer, toggleBGMPlayer } from './audio.js';
import { SmartAI } from './endless_and_smartAI/smartAI.js';
import './team.js'; // Ensure team.js runs for window bindings
import './exchange.js'; // Ensure exchange.js runs for window bindings
import './charDetail.js'; // Ensure charDetail.js runs for window bindings
import './shop.js'; // Ensure shop.js runs for window bindings
import { initShopPageObserver } from './shop.js';
import { initCutscene } from './cutscene.js';

/**
 * 初始化游戏
 * 异步函数，等待存档系统加载完成
 */
async function init() {
  console.log('🎮 游戏初始化中...');
  
  try {
    // 初始化存档系统（异步）
    await initSaveSystem();

    // 初始化SmartAI
    SmartAI.init().catch(err => console.error('SmartAI 初始化失败:', err));

    // 初始化无尽模式
    initEndlessMode();

    // 初始化Cutscene
    initCutscene();

    // 初始化商店页面观察器
    initShopPageObserver();
    
    // 更新UI
    updateResourceUI();
    
    // 绑定导航事件
    bindNavigationEvents();
    
    // 绑定抽卡按钮
    bindGachaEvents();
    
    // 绑定战斗按钮
    bindBattleEvents();
    
    // 绑定其他事件
    bindOtherEvents();
    
    // 初始化BGM播放器
    BGMPlayer.init();

    // 播放主界面BGM
    AudioManager.playBGM('main');
    
    // 初始化存档管理器滚动条（滚动时显示，停止后隐藏）
    if (typeof initSaveManagerScrollbar === 'function') {
      initSaveManagerScrollbar();
    }
    
    console.log('✅ 游戏初始化完成！');
  } catch (error) {
    console.error('❌ 游戏初始化失败:', error);
    alert('游戏初始化失败，请刷新页面重试');
  }
}

/**
 * 绑定导航事件
 */
function bindNavigationEvents() {
  document.querySelectorAll('.nav button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });
}

/**
 * 绑定抽卡按钮事件
 */
function bindGachaEvents() {
  const btnDaily = document.getElementById('btn-daily');
  const btnSingle = document.getElementById('btn-single');
  const btnTen = document.getElementById('btn-ten');
  
  if (btnDaily) btnDaily.addEventListener('click', dailyLogin);
  if (btnSingle) btnSingle.addEventListener('click', gachaSingle);
  if (btnTen) btnTen.addEventListener('click', gachaTen);
}

/**
 * 绑定战斗按钮事件
 */
function bindBattleEvents() {
  const btnFlee = document.getElementById('btn-flee');
  const btnCloseModal = document.getElementById('btn-close-modal');
  
  if (btnFlee) btnFlee.addEventListener('click', fleeBattle);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
}

/**
 * 绑定其他事件
 */
function bindOtherEvents() {
  // 无尽模式按钮（如果存在）
  const btnEndless = document.getElementById('btn-endless');
  if (btnEndless) {
    btnEndless.addEventListener('click', showEndlessMode);
  }
  
  // 存档管理按钮（如果存在）
  const btnSaveManage = document.getElementById('btn-save-manage');
  if (btnSaveManage) {
    btnSaveManage.addEventListener('click', showSaveManager);
  }
}

// ==================== 存档管理界面 ====================

/**
 * 显示存档管理界面
 */
async function showSaveManager() {
  const saves = await getSaveList();
  
  let content = '<div class="save-manager">';
  
  if (saves.length === 0) {
    content += '<p style="text-align:center;color:#888;">暂无存档</p>';
  } else {
    content += '<div class="save-list">';
    saves.forEach(save => {
      const date = new Date(save.timestamp).toLocaleString();
      const isCurrent = save.id === currentSaveSlot;
      content += `
        <div class="save-item ${isCurrent ? 'current' : ''}">
          <div class="save-info">
            <span class="save-name">${save.name}</span>
            <span class="save-date">${date}</span>
            ${isCurrent ? '<span class="save-current">当前</span>' : ''}
          </div>
          <div class="save-actions">
            <button onclick="loadSaveSlot('${save.id}')" ${isCurrent ? 'disabled' : ''}>加载</button>
            <button onclick="deleteSaveSlot('${save.id}')" class="btn-danger">删除</button>
          </div>
        </div>
      `;
    });
    content += '</div>';
  }
  
  content += `
    <div class="save-buttons">
      <button onclick="createNewSaveSlot()">新建存档</button>
      <button onclick="exportSaveToFile()">导出存档</button>
      <button onclick="importSaveFromFile()">导入存档</button>
    </div>
    <div class="save-buttons">
      <button onclick="closeModal()" class="btn-close">关闭</button>
    </div>
  `;
  content += '</div>';
  
  showModal('📂 存档管理', content, false);
}

/**
 * 加载指定存档槽位
 * 
 * @param {string} slotId - 存档槽位ID
 */
async function loadSaveSlot(slotId) {
  if (!confirm('确定要加载此存档吗？当前未保存的进度将丢失。')) {
    return;
  }
  
  await loadState(slotId);
  updateResourceUI();
  closeModal();
  alert('存档已加载');
}

/**
 * 删除指定存档槽位
 * 
 * @param {string} slotId - 存档槽位ID
 */
async function deleteSaveSlot(slotId) {
  if (slotId === currentSaveSlot) {
    alert('不能删除当前正在使用的存档');
    return;
  }
  
  if (!confirm('确定要删除此存档吗？此操作不可恢复。')) {
    return;
  }
  
  await deleteSave(slotId);
  showSaveManager();  // 刷新列表
}

/**
 * 创建新存档槽位
 */
async function createNewSaveSlot() {
  const name = prompt('请输入存档名称:', `存档 ${new Date().toLocaleString()}`);
  if (!name) return;
  
  await createNewSave(name);
  showSaveManager();  // 刷新列表
}

/**
 * 导出存档到文件
 */
async function exportSaveToFile() {
  try {
    const jsonStr = await exportSave();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gacha_rpg_save_${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    alert('存档已导出');
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
  }
}

/**
 * 从文件导入存档
 */
function importSaveFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      await importSave(text);
      updateResourceUI();
      closeModal();
      alert('存档已导入');
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + error.message);
    }
  };
  
  input.click();
}

// 绑定到 window 以支持 HTML 中的 onclick 调用
window.loadSaveSlot = loadSaveSlot;
window.deleteSaveSlot = deleteSaveSlot;
window.createNewSaveSlot = createNewSaveSlot;
window.exportSaveToFile = exportSaveToFile;
window.importSaveFromFile = importSaveFromFile;

// 绑定音频控制到 window
window.BGMPlayer = BGMPlayer;
window.toggleBGMPlayer = toggleBGMPlayer;

// ==================== DOM加载完成后初始化 ====================

document.addEventListener('DOMContentLoaded', init);
