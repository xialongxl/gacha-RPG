// 角色数据
const CHARACTER_DATA = {
  // SSR
  '阿米娅': { rarity: 'SSR', hp: 800, atk: 150, def: 60, spd: 90, skills: ['普攻', '奥义·终结', '治疗'] },
  '陈': { rarity: 'SSR', hp: 900, atk: 180, def: 70, spd: 100, skills: ['普攻', '赤霄·拔刀', '剑雨'] },
  '银灰': { rarity: 'SSR', hp: 850, atk: 200, def: 50, spd: 85, skills: ['普攻', '真银斩', '强化'] },
  '艾雅法拉': { rarity: 'SSR', hp: 600, atk: 220, def: 40, spd: 80, skills: ['普攻', '火山', '灼烧'] },
  '凯尔希': { rarity: 'SSR', hp: 750, atk: 160, def: 65, spd: 88, skills: ['普攻', 'Mon3tr', '治疗'] },
  '铃兰': { rarity: 'SSR', hp: 700, atk: 120, def: 55, spd: 85, skills: ['普攻', '强化', '群疗'] ,spine: {skel: 'spine/char_358_lisa/char_358_lisa.skel',atlas: 'spine/char_358_lisa/char_358_lisa.atlas',animation: 'Idle'}},
  // SR
  '德克萨斯': { rarity: 'SR', hp: 650, atk: 130, def: 55, spd: 95, skills: ['普攻', '剑雨', '眩晕'] },
  '蓝毒': { rarity: 'SR', hp: 550, atk: 140, def: 45, spd: 92, skills: ['普攻', '毒刺', '连射'] },
  '白面鸮': { rarity: 'SR', hp: 600, atk: 100, def: 50, spd: 85, skills: ['普攻', '治疗', '群疗'] },
  '红': { rarity: 'SR', hp: 500, atk: 160, def: 35, spd: 110, skills: ['普攻', '处决', '潜行'] },
  '崖心': { rarity: 'SR', hp: 700, atk: 120, def: 60, spd: 80, skills: ['普攻', '钩索', '投掷'] },
  // R
  '芬': { rarity: 'R', hp: 500, atk: 80, def: 40, spd: 75, skills: ['普攻', '战吼'] },
  '香草': { rarity: 'R', hp: 450, atk: 60, def: 35, spd: 70, skills: ['普攻', '治疗'] },
  '翎羽': { rarity: 'R', hp: 480, atk: 90, def: 38, spd: 78, skills: ['普攻', '突刺'] },
  '玫兰莎': { rarity: 'R', hp: 520, atk: 100, def: 42, spd: 82, skills: ['普攻', '连斩'] },
  '安塞尔': { rarity: 'R', hp: 400, atk: 55, def: 30, spd: 72, skills: ['普攻', '治疗'] },
  // N
  '巡林者': { rarity: 'N', hp: 350, atk: 70, def: 25, spd: 70, skills: ['普攻'] },
  '杜林': { rarity: 'N', hp: 300, atk: 50, def: 20, spd: 65, skills: ['普攻'] },
  '夜刀': { rarity: 'N', hp: 380, atk: 65, def: 28, spd: 68, skills: ['普攻'] },
  '黑角': { rarity: 'N', hp: 400, atk: 60, def: 35, spd: 60, skills: ['普攻'] },
  '12F': { rarity: 'N', hp: 320, atk: 55, def: 22, spd: 62, skills: ['普攻'] }
};

// 技能效果（新增 cost 和 gain）
const SKILL_EFFECTS = {
  // 普攻：不消耗，获得能量
  '普攻': { 
    type: 'damage', 
    multiplier: 1.0, 
    target: 'single', 
    cost: 0, 
    gain: 30,
    desc: '造成100%攻击力伤害，获得30能量' 
  },
  
  // 大招：高消耗
  '奥义·终结': { 
    type: 'damage', 
    multiplier: 2.5, 
    target: 'single', 
    cost: 100, 
    gain: 0,
    desc: '消耗100能量，造成250%攻击力伤害' 
  },
  '赤霄·拔刀': { 
    type: 'damage', 
    multiplier: 2.0, 
    target: 'single', 
    cost: 80, 
    gain: 0,
    desc: '消耗80能量，造成200%攻击力伤害' 
  },
  '真银斩': { 
    type: 'damage', 
    multiplier: 1.5, 
    target: 'all', 
    cost: 100, 
    gain: 0,
    desc: '消耗100能量，对所有敌人造成150%攻击力伤害' 
  },
  '火山': { 
    type: 'damage', 
    multiplier: 2.2, 
    target: 'all', 
    cost: 100, 
    gain: 0,
    desc: '消耗100能量，对所有敌人造成220%攻击力伤害' 
  },
  '处决': { 
    type: 'damage', 
    multiplier: 3.0, 
    target: 'single', 
    cost: 100, 
    gain: 0,
    desc: '消耗100能量，造成300%攻击力伤害' 
  },
  'Mon3tr': { 
    type: 'damage', 
    multiplier: 2.0, 
    target: 'single', 
    cost: 80, 
    gain: 0,
    desc: '消耗80能量，召唤Mon3tr造成200%伤害' 
  },
  
  // 中等技能：中等消耗
  '剑雨': { 
    type: 'damage', 
    multiplier: 1.3, 
    target: 'all', 
    cost: 50, 
    gain: 0,
    desc: '消耗50能量，对所有敌人造成130%攻击力伤害' 
  },
  '毒刺': { 
    type: 'damage', 
    multiplier: 1.8, 
    target: 'single', 
    cost: 40, 
    gain: 0,
    desc: '消耗40能量，造成180%攻击力伤害' 
  },
  '连射': { 
    type: 'damage', 
    multiplier: 0.6, 
    target: 'random3', 
    cost: 50, 
    gain: 0,
    desc: '消耗50能量，随机攻击3次，每次60%攻击力' 
  },
  '灼烧': { 
    type: 'damage', 
    multiplier: 1.2, 
    target: 'all', 
    cost: 40, 
    gain: 0,
    desc: '消耗40能量，对所有敌人造成120%攻击力伤害' 
  },
  '眩晕': { 
    type: 'damage', 
    multiplier: 1.0, 
    target: 'single', 
    cost: 50, 
    gain: 0,
    desc: '消耗50能量，造成100%伤害并眩晕' 
  },
  '突刺': { 
    type: 'damage', 
    multiplier: 1.4, 
    target: 'single', 
    cost: 30, 
    gain: 0,
    desc: '消耗30能量，造成140%攻击力伤害' 
  },
  '连斩': { 
    type: 'damage', 
    multiplier: 0.5, 
    target: 'random2', 
    cost: 30, 
    gain: 0,
    desc: '消耗30能量，随机攻击2次，每次50%攻击力' 
  },
  '钩索': { 
    type: 'damage', 
    multiplier: 1.2, 
    target: 'single', 
    cost: 30, 
    gain: 0,
    desc: '消耗30能量，造成120%攻击力伤害' 
  },
  '投掷': { 
    type: 'damage', 
    multiplier: 1.5, 
    target: 'single', 
    cost: 40, 
    gain: 0,
    desc: '消耗40能量，造成150%攻击力伤害' 
  },
  
  // 治疗技能
  '治疗': { 
    type: 'heal', 
    multiplier: 1.5, 
    target: 'ally', 
    cost: 40, 
    gain: 0,
    desc: '消耗40能量，恢复目标150%攻击力的生命' 
  },
  '群疗': { 
    type: 'heal', 
    multiplier: 0.8, 
    target: 'all_ally', 
    cost: 80, 
    gain: 0,
    desc: '消耗80能量，恢复所有队友80%攻击力的生命' 
  },
  
  // 增益技能
  '战吼': { 
    type: 'buff', 
    multiplier: 0.3, 
    target: 'all_ally', 
    cost: 50, 
    gain: 0,
    desc: '消耗50能量，提升全体攻击力30%' 
  },
  '强化': { 
    type: 'buff', 
    multiplier: 0.5, 
    target: 'self', 
    cost: 30, 
    gain: 0,
    desc: '消耗30能量，提升自身攻击力50%' 
  },
  '潜行': { 
    type: 'buff', 
    multiplier: 0.5, 
    target: 'self', 
    cost: 30, 
    gain: 0,
    desc: '消耗30能量，提升自身攻击力50%' 
  },
    // ========== 敌人技能 ==========
  '火球': {
    type: 'damage',
    multiplier: 1.5,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '对单体造成150%伤害'
  },
  '烈焰风暴': {
    type: 'damage',
    multiplier: 1.2,
    target: 'all_enemy',
    cost: 0,
    gain: 0,
    desc: '对全体造成120%伤害'
  },
  '重击': {
    type: 'damage',
    multiplier: 2.0,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '对单体造成200%伤害'
  },
  '横扫': {
    type: 'damage',
    multiplier: 1.0,
    target: 'all_enemy',
    cost: 0,
    gain: 0,
    desc: '对全体造成100%伤害'
  },
  '瞄准射击': {
    type: 'damage',
    multiplier: 2.5,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '对单体造成250%伤害'
  },
  '盾击': {
    type: 'damage',
    multiplier: 1.3,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '造成130%伤害'
  },
  '双刀斩': {
    type: 'damage',
    multiplier: 0.8,
    target: 'random2',
    cost: 0,
    gain: 0,
    desc: '随机攻击2次'
  },
  '暗影箭': {
    type: 'damage',
    multiplier: 1.8,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '对单体造成180%伤害'
  },
  '死亡宣告': {
    type: 'damage',
    multiplier: 3.0,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '对单体造成300%伤害'
  },
  '战地治疗': {
    type: 'enemy_heal',
    multiplier: 2.0,
    target: 'ally_lowest',
    cost: 0,
    gain: 0,
    desc: '治疗血量最低的友军'
  },
  '群体治疗': {
    type: 'enemy_heal',
    multiplier: 1.0,
    target: 'all_ally_enemy',
    cost: 0,
    gain: 0,
    desc: '治疗全体友军'
  },
  '鼓舞': {
    type: 'enemy_buff',
    multiplier: 0.3,
    target: 'self',
    cost: 0,
    gain: 0,
    desc: '提升自身攻击力30%'
  },
  '狂暴': {
    type: 'enemy_buff',
    multiplier: 0.5,
    target: 'self',
    cost: 0,
    gain: 0,
    desc: '提升自身攻击力50%'
  },
  '诅咒': {
    type: 'enemy_debuff',
    multiplier: 0.3,
    target: 'single',
    cost: 0,
    gain: 0,
    desc: '降低目标防御30%'
  }  
};

// 关卡数据（难度提升版）
const STAGES = [
  // 第一章：简单
  {
    id: 1,
    name: '1-1 起源',
    stamina: 10,
    enemies: [
      { name: '源石虫', hp: 300, atk: 40, def: 10, spd: 50, skills: ['普攻'] },
      { name: '源石虫', hp: 300, atk: 40, def: 10, spd: 50, skills: ['普攻'] }
    ],
    rewards: { gold: 100, tickets: 2 }
  },
  {
    id: 2,
    name: '1-2 前进',
    stamina: 10,
    enemies: [
      { name: '源石虫', hp: 350, atk: 45, def: 12, spd: 52, skills: ['普攻'] },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 55, skills: ['普攻'] },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 55, skills: ['普攻'] }
    ],
    rewards: { gold: 150, tickets: 3 }
  },
  {
    id: 3,
    name: '1-3 遭遇',
    stamina: 15,
    enemies: [
      { name: '士兵', hp: 600, atk: 70, def: 30, spd: 58, skills: ['普攻'] },
      { name: '士兵', hp: 600, atk: 70, def: 30, spd: 58, skills: ['普攻'] },
      { name: '术师', hp: 400, atk: 120, def: 15, spd: 65, skills: ['普攻', '火球'] }
    ],
    rewards: { gold: 200, tickets: 5 }
  },
  {
    id: 4,
    name: '1-4 危机',
    stamina: 15,
    enemies: [
      { name: '精英士兵', hp: 1000, atk: 100, def: 50, spd: 62, skills: ['普攻', '重击'] },
      { name: '术师', hp: 500, atk: 140, def: 20, spd: 70, skills: ['普攻', '火球'] },
      { name: '医疗兵', hp: 600, atk: 80, def: 25, spd: 75, skills: ['普攻', '战地治疗'] }
    ],
    rewards: { gold: 250, tickets: 5 }
  },
  {
    id: 5,
    name: '1-5 BOSS',
    stamina: 20,
    enemies: [
      { name: '整合运动队长', hp: 3500, atk: 180, def: 60, spd: 80, skills: ['普攻', '横扫', '鼓舞'] }
    ],
    rewards: { gold: 500, tickets: 10 }
  },
  
  // 第二章：困难
  {
    id: 6,
    name: '2-1 深入',
    stamina: 20,
    enemies: [
      { name: '精英士兵', hp: 1200, atk: 110, def: 55, spd: 65, skills: ['普攻', '重击'] },
      { name: '精英士兵', hp: 1200, atk: 110, def: 55, spd: 65, skills: ['普攻', '重击'] },
      { name: '狙击手', hp: 600, atk: 160, def: 20, spd: 85, skills: ['普攻', '瞄准射击'] }
    ],
    rewards: { gold: 350, tickets: 6 }
  },
  {
    id: 7,
    name: '2-2 包围',
    stamina: 20,
    enemies: [
      { name: '重装兵', hp: 2000, atk: 90, def: 80, spd: 40, skills: ['普攻', '盾击'] },
      { name: '术师', hp: 600, atk: 150, def: 25, spd: 72, skills: ['普攻', '火球', '烈焰风暴'] },
      { name: '术师', hp: 600, atk: 150, def: 25, spd: 72, skills: ['普攻', '火球'] },
      { name: '医疗兵', hp: 700, atk: 90, def: 30, spd: 78, skills: ['普攻', '战地治疗'] }
    ],
    rewards: { gold: 400, tickets: 7 }
  },
  {
    id: 8,
    name: '2-3 精锐',
    stamina: 25,
    enemies: [
      { name: '萨卡兹战士', hp: 1800, atk: 140, def: 45, spd: 90, skills: ['普攻', '双刀斩', '狂暴'] },
      { name: '萨卡兹战士', hp: 1800, atk: 140, def: 45, spd: 90, skills: ['普攻', '双刀斩'] },
      { name: '萨卡兹术师', hp: 800, atk: 180, def: 30, spd: 75, skills: ['普攻', '暗影箭', '诅咒'] }
    ],
    rewards: { gold: 500, tickets: 8 }
  },
  {
    id: 9,
    name: '2-4 绝境',
    stamina: 25,
    enemies: [
      { name: '重装兵', hp: 2500, atk: 100, def: 90, spd: 42, skills: ['普攻', '盾击'] },
      { name: '萨卡兹战士', hp: 2000, atk: 150, def: 50, spd: 92, skills: ['普攻', '双刀斩', '狂暴'] },
      { name: '萨卡兹术师', hp: 900, atk: 200, def: 35, spd: 78, skills: ['普攻', '暗影箭'] },
      { name: '高级医疗兵', hp: 1000, atk: 100, def: 40, spd: 82, skills: ['普攻', '战地治疗', '群体治疗'] }
    ],
    rewards: { gold: 600, tickets: 10 }
  },
  {
    id: 10,
    name: '2-5 首领',
    stamina: 30,
    enemies: [
      { name: '「碎骨」', hp: 8000, atk: 250, def: 80, spd: 95, skills: ['普攻', '横扫', '死亡宣告', '狂暴'] }
    ],
    rewards: { gold: 1000, tickets: 20 }
  }
];