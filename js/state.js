// ==================== 游戏状态 ====================

// 游戏状态
let state = {
  tickets: 50,
  gold: 1000,
  pity: 0,
  lastDaily: null,
  inventory: {},
  team: [null, null, null, null],
  clearedStages: []
};

// 战斗状态
let battle = {
  active: false,
  stage: null,
  allies: [],
  enemies: [],
  turnOrder: [],
  currentTurn: 0,
  selectedSkill: null,
  log: []
};

// 队伍选择状态
let selectedSlot = null;

// 读取存档
function loadState() {
  const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
    
    // 数据迁移：确保所有角色都有 potential 字段
    Object.keys(state.inventory).forEach(name => {
      if (!state.inventory[name].potential) {
        state.inventory[name].potential = 1;
      }
    });
    
    // 保存迁移后的数据
    saveState();
  }
}

// 保存存档
function saveState() {
  localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
}

// 重置战斗状态
function resetBattle() {
  battle = {
    active: false,
    stage: null,
    allies: [],
    enemies: [],
    turnOrder: [],
    currentTurn: 0,
    selectedSkill: null,
    log: []
  };
}