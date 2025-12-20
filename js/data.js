// 角色数据
const CHARACTER_DATA = {
  // SSR
  '阿米娅': { rarity: 'SSR', hp: 800, atk: 150, def: 60, spd: 90, skills: ['普攻', '奥义·终结', '治疗'] },
  '陈': { rarity: 'SSR', hp: 900, atk: 180, def: 70, spd: 100, skills: ['普攻', '赤霄·拔刀', '剑雨'] },
  '银灰': { rarity: 'SSR', hp: 850, atk: 200, def: 50, spd: 85, skills: ['普攻', '真银斩', '强化'] },
  '艾雅法拉': { rarity: 'SSR', hp: 600, atk: 220, def: 40, spd: 80, skills: ['普攻', '火山', '灼烧'] },
  '凯尔希': { rarity: 'SSR', hp: 750, atk: 160, def: 65, spd: 88, skills: ['普攻', 'Mon3tr', '治疗'] },
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

// 技能效果
const SKILL_EFFECTS = {
  '普攻': { type: 'damage', multiplier: 1.0, target: 'single', desc: '造成100%攻击力伤害' },
  '奥义·终结': { type: 'damage', multiplier: 2.5, target: 'single', desc: '造成250%攻击力伤害' },
  '赤霄·拔刀': { type: 'damage', multiplier: 2.0, target: 'single', desc: '造成200%攻击力伤害' },
  '真银斩': { type: 'damage', multiplier: 1.5, target: 'all', desc: '对所有敌人造成150%攻击力伤害' },
  '火山': { type: 'damage', multiplier: 2.2, target: 'all', desc: '对所有敌人造成220%攻击力伤害' },
  '剑雨': { type: 'damage', multiplier: 1.3, target: 'all', desc: '对所有敌人造成130%攻击力伤害' },
  '治疗': { type: 'heal', multiplier: 1.5, target: 'ally', desc: '恢复目标150%攻击力的生命' },
  '群疗': { type: 'heal', multiplier: 0.8, target: 'all_ally', desc: '恢复所有队友80%攻击力的生命' },
  '毒刺': { type: 'damage', multiplier: 1.8, target: 'single', desc: '造成180%攻击力伤害' },
  '连射': { type: 'damage', multiplier: 0.6, target: 'random3', desc: '随机攻击3次，每次60%攻击力' },
  '处决': { type: 'damage', multiplier: 3.0, target: 'single', desc: '造成300%攻击力伤害' },
  '突刺': { type: 'damage', multiplier: 1.4, target: 'single', desc: '造成140%攻击力伤害' },
  '连斩': { type: 'damage', multiplier: 0.5, target: 'random2', desc: '随机攻击2次，每次50%攻击力' },
  '战吼': { type: 'buff', multiplier: 0.3, target: 'all_ally', desc: '提升全体攻击力30%' },
  '强化': { type: 'buff', multiplier: 0.5, target: 'self', desc: '提升自身攻击力50%' },
  '灼烧': { type: 'damage', multiplier: 1.2, target: 'all', desc: '对所有敌人造成120%攻击力伤害' },
  'Mon3tr': { type: 'damage', multiplier: 2.0, target: 'single', desc: '召唤Mon3tr攻击，造成200%伤害' },
  '眩晕': { type: 'damage', multiplier: 1.0, target: 'single', desc: '造成100%伤害并眩晕' },
  '钩索': { type: 'damage', multiplier: 1.2, target: 'single', desc: '造成120%攻击力伤害' },
  '投掷': { type: 'damage', multiplier: 1.5, target: 'single', desc: '造成150%攻击力伤害' },
  '潜行': { type: 'buff', multiplier: 0.5, target: 'self', desc: '提升自身攻击力50%' }
};

// 关卡数据
const STAGES = [
  {
    id: 1,
    name: '1-1 起源',
    stamina: 10,
    enemies: [
      { name: '源石虫', hp: 200, atk: 30, def: 10, spd: 50 },
      { name: '源石虫', hp: 200, atk: 30, def: 10, spd: 50 }
    ],
    rewards: { gold: 100, tickets: 2 }
  },
  {
    id: 2,
    name: '1-2 前进',
    stamina: 10,
    enemies: [
      { name: '源石虫', hp: 250, atk: 35, def: 12, spd: 52 },
      { name: '士兵', hp: 400, atk: 50, def: 20, spd: 55 }
    ],
    rewards: { gold: 150, tickets: 3 }
  },
  {
    id: 3,
    name: '1-3 遭遇',
    stamina: 15,
    enemies: [
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 58 },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 58 },
      { name: '精英士兵', hp: 800, atk: 80, def: 35, spd: 62 }
    ],
    rewards: { gold: 200, tickets: 5 }
  },
  {
    id: 4,
    name: '1-4 危机',
    stamina: 15,
    enemies: [
      { name: '精英士兵', hp: 900, atk: 90, def: 40, spd: 65 },
      { name: '术师', hp: 600, atk: 120, def: 20, spd: 70 }
    ],
    rewards: { gold: 250, tickets: 5 }
  },
  {
    id: 5,
    name: '1-5 BOSS',
    stamina: 20,
    enemies: [
      { name: '整合运动队长', hp: 2000, atk: 150, def: 50, spd: 75 }
    ],
    rewards: { gold: 500, tickets: 10 }
  }
];