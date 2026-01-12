// ==================== SmartTeamBuilder 数据层 ====================
// 
// 包含：
// - 独立的 IndexedDB 数据库定义 (SmartTeam_Database)
// - 避免与主 AI (SmartAI_Database) 冲突
//
// ========================================================================

// 初始化数据库 - SmartTeam 版本
// 这是一个独立的数据库，专门用于存储队伍构建/克制逻辑的历史数据
export const SmartTeam_DB = new Dexie('SmartTeam_Database');

// V1: 初始版本
SmartTeam_DB.version(1).stores({
  // 队伍对战历史
  // playerHash: 玩家队伍特征哈希
  // enemyHash: 敌人队伍特征哈希
  // result: 'win' | 'lose' (敌人视角)
  // floor: 层数
  teamMatchHistory: '++id, playerHash, enemyHash, result, floor, timestamp'
});

console.log('📦 SmartTeam_DB (智能组队数据库) 初始化完成');