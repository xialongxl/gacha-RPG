// ==================== 游戏存档系统（Dexie.js版） ====================
//
// 功能说明：
// - 使用 Dexie.js (IndexedDB) 替代 localStorage
// - 支持更大容量的数据存储
// - 支持多存档槽位
// - 自动迁移旧的 localStorage 数据
//
// 依赖：
// - Dexie.js
// - config.js
//
// ========================================================================

// ==================== 初始化数据库 ====================

const GameDB = new Dexie('GachaRPG_Database');
GameDB.version(1).stores({
  // 游戏存档
  saves: 'id, name, timestamp, data',
  // 游戏设置
  settings: 'id, value',
  // 统计数据
  statistics: 'id, value'
});

// ==================== 游戏状态 ====================

// 默认游戏状态
const DEFAULT_STATE = {
  tickets: 50,
  gold: 1000,
  pity: 0,
  lastDaily: null,
  inventory: {},
  team: [null, null, null, null],
  clearedStages: [],
  // 无尽币与时装系统
  endlessCoin: 0,           // 无尽币
  skinTickets: 0,           // 时装券
  ownedSkins: [],           // 已拥有的时装ID列表
  equippedSkins: {}         // 已装备的时装 { 干员ID: 时装ID }
};

// 当前游戏状态
let state = { ...DEFAULT_STATE };

// 战斗状态
let battle = {
  active: false,
  stage: null,
  allies: [],
  enemies: [],
  summons: [],
  turnOrder: [],
  currentTurn: 0,
  selectedSkill: null,
  log: [],
  isEndless: false,
  useSmartAI: false,
  endlessFloor: 0
};

// 队伍选择状态
let selectedSlot = null;

// 当前存档槽位
let currentSaveSlot = 'auto';

// ==================== 存档管理 ====================

/**
 * 初始化存档系统
 * 页面加载时调用，检查并迁移旧数据
 */
async function initSaveSystem() {
  console.log('💾 初始化存档系统...');
  
  try {
    // 检查是否有旧的 localStorage 数据需要迁移
    await migrateFromLocalStorage();
    
    // 加载自动存档
    await loadState();
    
    console.log('✅ 存档系统初始化完成');
  } catch (error) {
    console.error('❌ 存档系统初始化失败:', error);
    // 使用默认状态
    state = { ...DEFAULT_STATE };
  }
}

/**
 * 从 localStorage 迁移数据
 * 只在首次使用时执行一次
 */
async function migrateFromLocalStorage() {
  // 检查是否已迁移
  const migrated = await GameDB.settings.get('migrated_from_localstorage');
  if (migrated) return;
  
  // 检查是否有旧数据
  const oldData = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!oldData) {
    // 没有旧数据，标记为已迁移
    await GameDB.settings.put({ id: 'migrated_from_localstorage', value: true });
    return;
  }
  
  console.log('📦 发现旧存档，开始迁移...');
  
  try {
    const parsed = JSON.parse(oldData);
    
    // 数据迁移：确保所有干员都有 potential 字段
    if (parsed.inventory) {
      Object.keys(parsed.inventory).forEach(name => {
        if (!parsed.inventory[name].potential) {
          parsed.inventory[name].potential = 1;
        }
      });
    }
    
    // 保存到新数据库
    await GameDB.saves.put({
      id: 'auto',
      name: '自动存档（已迁移）',
      timestamp: Date.now(),
      data: parsed
    });
    
    // 标记为已迁移
    await GameDB.settings.put({ id: 'migrated_from_localstorage', value: true });
    
    // 可选：删除旧的 localStorage 数据
    // localStorage.removeItem(CONFIG.STORAGE_KEY);
    
    console.log('✅ 存档迁移完成');
  } catch (error) {
    console.error('❌ 存档迁移失败:', error);
  }
}

/**
 * 读取存档
 * 
 * @param {string} slotId - 存档槽位ID，默认 'auto'
 */
async function loadState(slotId = 'auto') {
  try {
    const save = await GameDB.saves.get(slotId);
    
    if (save && save.data) {
      state = { ...DEFAULT_STATE, ...save.data };
      currentSaveSlot = slotId;
      
      // 数据迁移：确保所有干员都有 potential 字段
      Object.keys(state.inventory).forEach(name => {
        if (!state.inventory[name].potential) {
          state.inventory[name].potential = 1;
        }
      });
      
      console.log(`📂 已加载存档: ${save.name || slotId}`);
    } else {
      console.log('📂 没有找到存档，使用默认状态');
      state = { ...DEFAULT_STATE };
    }
  } catch (error) {
    console.error('❌ 读取存档失败:', error);
    state = { ...DEFAULT_STATE };
  }
}

/**
 * 保存存档
 * 
 * @param {string} slotId - 存档槽位ID，默认使用当前槽位
 * @param {string} name - 存档名称（可选）
 */
async function saveState(slotId = currentSaveSlot, name = null) {
  try {
    const saveData = {
      id: slotId,
      name: name || (slotId === 'auto' ? '自动存档' : `存档 ${slotId}`),
      timestamp: Date.now(),
      data: { ...state }
    };
    
    await GameDB.saves.put(saveData);
    currentSaveSlot = slotId;
    
    // 静默保存，不输出日志（避免刷屏）
    // console.log(`💾 已保存到: ${saveData.name}`);
  } catch (error) {
    console.error('❌ 保存存档失败:', error);
  }
}

/**
 * 获取所有存档列表
 * 
 * @returns {Array} 存档列表
 */
async function getSaveList() {
  try {
    const saves = await GameDB.saves.toArray();
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('❌ 获取存档列表失败:', error);
    return [];
  }
}

/**
 * 删除存档
 * 
 * @param {string} slotId - 存档槽位ID
 */
async function deleteSave(slotId) {
  try {
    await GameDB.saves.delete(slotId);
    console.log(`🗑️ 已删除存档: ${slotId}`);
  } catch (error) {
    console.error('❌ 删除存档失败:', error);
  }
}

/**
 * 创建新存档
 * 
 * @param {string} name - 存档名称
 * @returns {string} 新存档的ID
 */
async function createNewSave(name) {
  const slotId = `save_${Date.now()}`;
  await saveState(slotId, name);
  return slotId;
}

/**
 * 导出当前存档为JSON
 * 用于备份
 * 
 * @returns {string} JSON字符串
 */
async function exportSave() {
  const currentSave = await GameDB.saves.get(currentSaveSlot);
  if (!currentSave) {
    throw new Error('当前存档不存在');
  }
  
  const exportData = {
    version: 1,
    exportTime: Date.now(),
    saves: [currentSave]  // 只导出当前存档
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * 导出所有存档为JSON
 * 用于完整备份
 * 
 * @returns {string} JSON字符串
 */
async function exportAllSaves() {
  const saves = await GameDB.saves.toArray();
  const exportData = {
    version: 1,
    exportTime: Date.now(),
    saves: saves
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * 导入存档
 * 
 * @param {string} jsonString - JSON字符串
 */
async function importSave(jsonString) {
  try {
    const importData = JSON.parse(jsonString);
    
    if (!importData.saves || !Array.isArray(importData.saves)) {
      throw new Error('无效的存档格式');
    }
    
    for (const save of importData.saves) {
      await GameDB.saves.put(save);
    }
    
    console.log(`✅ 已导入 ${importData.saves.length} 个存档`);
    
    // 重新加载当前存档
    await loadState(currentSaveSlot);
  } catch (error) {
    console.error('❌ 导入存档失败:', error);
    throw error;
  }
}

// ==================== 战斗状态管理 ====================

/**
 * 重置战斗状态
 */
function resetBattle() {
  battle = {
    active: false,
    stage: null,
    allies: [],
    enemies: [],
    summons: [],
    turnOrder: [],
    currentTurn: 0,
    selectedSkill: null,
    log: [],
    isEndless: false,
    useSmartAI: false,
    endlessFloor: 0
  };
  
  // 清理召唤系统
  if (typeof SummonSystem !== 'undefined') {
    SummonSystem.clear();
  }
}

// ==================== 召唤物状态辅助函数 ====================

/**
 * 获取所有我方单位（干员 + 召唤物）
 * 
 * @returns {Array} 存活的我方单位数组
 */
function getAllAllies() {
  return [...battle.allies, ...battle.summons].filter(unit => unit && unit.currentHp > 0);
}

/**
 * 判断单位是否是召唤物
 * 
 * @param {Object} unit - 单位对象
 * @returns {boolean}
 */
function isSummon(unit) {
  return unit && unit.isSummon === true;
}

/**
 * 同步召唤物到战斗状态
 * 从 SummonSystem 获取存活召唤物列表
 */
function syncSummons() {
  if (typeof SummonSystem !== 'undefined') {
    battle.summons = SummonSystem.getAliveSummons();
  }
}

// ==================== 统计数据 ====================

/**
 * 更新统计数据
 * 
 * @param {string} key - 统计项名称
 * @param {number} increment - 增加值，默认1
 */
async function updateStatistic(key, increment = 1) {
  try {
    const stat = await GameDB.statistics.get(key);
    const newValue = (stat?.value || 0) + increment;
    await GameDB.statistics.put({ id: key, value: newValue });
  } catch (error) {
    console.error('❌ 更新统计失败:', error);
  }
}

/**
 * 获取统计数据
 * 
 * @param {string} key - 统计项名称
 * @returns {number} 统计值
 */
async function getStatistic(key) {
  try {
    const stat = await GameDB.statistics.get(key);
    return stat?.value || 0;
  } catch (error) {
    console.error('❌ 获取统计失败:', error);
    return 0;
  }
}

/**
 * 获取所有统计数据
 * 
 * @returns {Object} 统计数据对象
 */
async function getAllStatistics() {
  try {
    const stats = await GameDB.statistics.toArray();
    const result = {};
    stats.forEach(s => result[s.id] = s.value);
    return result;
  } catch (error) {
    console.error('❌ 获取统计失败:', error);
    return {};
  }
}

// ==================== 游戏设置 ====================

/**
 * 保存设置
 * 
 * @param {string} key - 设置项名称
 * @param {any} value - 设置值
 */
async function saveSetting(key, value) {
  try {
    await GameDB.settings.put({ id: key, value: value });
  } catch (error) {
    console.error('❌ 保存设置失败:', error);
  }
}

/**
 * 获取设置
 * 
 * @param {string} key - 设置项名称
 * @param {any} defaultValue - 默认值
 * @returns {any} 设置值
 */
async function getSetting(key, defaultValue = null) {
  try {
    const setting = await GameDB.settings.get(key);
    return setting?.value ?? defaultValue;
  } catch (error) {
    console.error('❌ 获取设置失败:', error);
    return defaultValue;
  }
}

// ==================== 调试工具 ====================

/**
 * 显示存档信息
 */
async function showSaveInfo() {
  const saves = await getSaveList();
  console.log('📂 存档列表:');
  saves.forEach(save => {
    const date = new Date(save.timestamp).toLocaleString();
    console.log(`  - ${save.id}: ${save.name} (${date})`);
  });
}

/**
 * 清除所有游戏数据
 * 危险操作，需要确认
 */
async function clearAllGameData() {
  if (!confirm('⚠️ 确定要清除所有游戏数据吗？这将删除所有存档、设置和统计数据！')) {
    return;
  }
  
  if (!confirm('⚠️ 再次确认：此操作不可恢复！')) {
    return;
  }
  
  try {
    await GameDB.saves.clear();
    await GameDB.settings.clear();
    await GameDB.statistics.clear();
    
    // 重置状态
    state = { ...DEFAULT_STATE };
    currentSaveSlot = 'auto';
    
    console.log('✅ 所有游戏数据已清除');
    
    // 刷新页面
    location.reload();
  } catch (error) {
    console.error('❌ 清除数据失败:', error);
  }
}
