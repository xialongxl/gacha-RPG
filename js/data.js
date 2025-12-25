// 角色数据
const CHARACTER_DATA = {
  // SSR
  '阿米娅': { 
    rarity: 6, 
    hp: 800, 
    atk: 150, 
    def: 60, 
    spd: 90, 
    skills: ['普攻', '奥义·终结', '治疗'] 
  },
  '陈': { 
    rarity: 6, 
    hp: 900, 
    atk: 180, 
    def: 70, 
    spd: 100, 
    skills: ['普攻', '赤霄·拔刀', '剑雨'] 
  },
  '银灰': { 
    rarity: 6, 
    hp: 850, 
    atk: 200, 
    def: 50, 
    spd: 85, 
    skills: ['普攻', '真银斩', '强化'] 
  },
  '艾雅法拉': { 
    rarity: 6, 
    hp: 600, 
    atk: 220, 
    def: 40, 
    spd: 80, 
    skills: ['普攻', '火山', '灼烧'] 
  },
  '凯尔希': { rarity: 6, 
    hp: 750, 
    atk: 160, 
    def: 65, 
    spd: 88, 
    skills: ['普攻', 'Mon3tr', '治疗'] 
  },
  '铃兰': { 
    rarity: 6, 
    hp: 700, 
    atk: 120, 
    def: 55, 
    spd: 85, 
    skills: ['普攻', '全力以赴', '儿时的舞乐', '狐火泯然'] ,
    spine: {
      skel: 'spine/char_358_lisa/char_358_lisa.skel',
      atlas: 'spine/char_358_lisa/char_358_lisa.atlas',
      animation: 'Idle'
    },
    art: 'assets/art/char_358_lisa.png',
    voice: 'assets/voice/char_358_lisa.wav',
    voiceText: '罗德岛干员丽萨……啊不对，是铃兰，干员铃兰！是我自己挑的代号喔，今天开始正式作为干员行动，请多指教！'
  },
  // SR
  '德克萨斯': { rarity: 5, hp: 650, atk: 130, def: 55, spd: 95, skills: ['普攻', '剑雨', '眩晕'] },
  '蓝毒': { rarity: 5, hp: 550, atk: 140, def: 45, spd: 92, skills: ['普攻', '毒刺', '连射'] },
  '白面鸮': { rarity: 5, hp: 600, atk: 100, def: 50, spd: 85, skills: ['普攻', '治疗', '群疗'] },
  '红': { rarity: 5, hp: 500, atk: 160, def: 35, spd: 110, skills: ['普攻', '处决', '潜行'] },
  '崖心': { rarity: 5, hp: 700, atk: 120, def: 60, spd: 80, skills: ['普攻', '钩索', '投掷'] },
  // R
  '芬': { rarity: 4, hp: 500, atk: 80, def: 40, spd: 75, skills: ['普攻', '战吼'] },
  '香草': { rarity: 4, hp: 450, atk: 60, def: 35, spd: 70, skills: ['普攻', '治疗'] },
  '翎羽': { rarity: 4, hp: 480, atk: 90, def: 38, spd: 78, skills: ['普攻', '突刺'] },
  '玫兰莎': { rarity: 4, hp: 520, atk: 100, def: 42, spd: 82, skills: ['普攻', '连斩'] },
  '安塞尔': { rarity: 4, hp: 400, atk: 55, def: 30, spd: 72, skills: ['普攻', '治疗'] },
  // N
  '巡林者': { rarity: 3, hp: 350, atk: 70, def: 25, spd: 70, skills: ['普攻'] },
  '杜林': { rarity: 3, hp: 300, atk: 50, def: 20, spd: 65, skills: ['普攻'] },
  '夜刀': { rarity: 3, hp: 380, atk: 65, def: 28, spd: 68, skills: ['普攻'] },
  '黑角': { rarity: 3, hp: 400, atk: 60, def: 35, spd: 60, skills: ['普攻'] },
  '12F': { rarity: 3, hp: 320, atk: 55, def: 22, spd: 62, skills: ['普攻'] }
};

// 技能效果（新增 cost 和 gain）

// 关卡数据（难度提升版）
// 关卡数据
const STAGES = [
  // 第一章：简单（无护盾）
  {
    id: 1,
    name: '1-1 起源',
    enemies: [
      { name: '源石虫', hp: 300, atk: 40, def: 10, spd: 50, shield: 0, skills: ['普攻'] },
      { name: '源石虫', hp: 300, atk: 40, def: 10, spd: 50, shield: 0, skills: ['普攻'] }
    ],
    rewards: { gold: 100, tickets: 2 }
  },
  {
    id: 2,
    name: '1-2 前进',
    enemies: [
      { name: '源石虫', hp: 350, atk: 45, def: 12, spd: 52, shield: 0, skills: ['普攻'] },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 55, shield: 0, skills: ['普攻'] },
      { name: '士兵', hp: 500, atk: 60, def: 25, spd: 55, shield: 0, skills: ['普攻'] }
    ],
    rewards: { gold: 150, tickets: 3 }
  },
  {
    id: 3,
    name: '1-3 遭遇',
    enemies: [
      { name: '士兵', hp: 600, atk: 70, def: 30, spd: 58, shield: 0, skills: ['普攻'] },
      { name: '士兵', hp: 600, atk: 70, def: 30, spd: 58, shield: 0, skills: ['普攻'] },
      { name: '术师', hp: 400, atk: 120, def: 15, spd: 65, shield: 0, skills: ['普攻', '火球'] }
    ],
    rewards: { gold: 200, tickets: 5 }
  },
  {
    id: 4,
    name: '1-4 危机',
    enemies: [
      { name: '精英士兵', hp: 1000, atk: 100, def: 50, spd: 62, shield: 2, skills: ['普攻', '重击'] },
      { name: '术师', hp: 500, atk: 140, def: 20, spd: 70, shield: 0, skills: ['普攻', '火球'] },
      { name: '医疗兵', hp: 600, atk: 80, def: 25, spd: 75, shield: 0, skills: ['普攻', '战地治疗'] }
    ],
    rewards: { gold: 250, tickets: 5 }
  },
  {
    id: 5,
    name: '1-5 BOSS',
    enemies: [
      { name: '整合运动队长', hp: 3500, atk: 180, def: 60, spd: 80, shield: 4, skills: ['普攻', '横扫', '鼓舞'] }
    ],
    rewards: { gold: 500, tickets: 10 }
  },
  
  // 第二章：困难（有护盾）
  {
    id: 6,
    name: '2-1 深入',
    enemies: [
      { name: '精英士兵', hp: 1200, atk: 110, def: 55, spd: 65, shield: 3, skills: ['普攻', '重击'] },
      { name: '精英士兵', hp: 1200, atk: 110, def: 55, spd: 65, shield: 3, skills: ['普攻', '重击'] },
      { name: '狙击手', hp: 600, atk: 160, def: 20, spd: 85, shield: 0, skills: ['普攻', '瞄准射击'] }
    ],
    rewards: { gold: 350, tickets: 6 }
  },
  {
    id: 7,
    name: '2-2 包围',
    enemies: [
      { name: '重装兵', hp: 2000, atk: 90, def: 80, spd: 40, shield: 5, skills: ['普攻', '盾击'] },
      { name: '术师', hp: 600, atk: 150, def: 25, spd: 72, shield: 0, skills: ['普攻', '火球', '烈焰风暴'] },
      { name: '术师', hp: 600, atk: 150, def: 25, spd: 72, shield: 0, skills: ['普攻', '火球'] },
      { name: '医疗兵', hp: 700, atk: 90, def: 30, spd: 78, shield: 0, skills: ['普攻', '战地治疗'] }
    ],
    rewards: { gold: 400, tickets: 7 }
  },
  {
    id: 8,
    name: '2-3 精锐',
    enemies: [
      { name: '萨卡兹战士', hp: 1800, atk: 140, def: 45, spd: 90, shield: 3, skills: ['普攻', '双刀斩', '狂暴'] },
      { name: '萨卡兹战士', hp: 1800, atk: 140, def: 45, spd: 90, shield: 3, skills: ['普攻', '双刀斩'] },
      { name: '萨卡兹术师', hp: 800, atk: 180, def: 30, spd: 75, shield: 2, skills: ['普攻', '暗影箭', '诅咒'] }
    ],
    rewards: { gold: 500, tickets: 8 }
  },
  {
    id: 9,
    name: '2-4 绝境',
    enemies: [
      { name: '重装兵', hp: 2500, atk: 100, def: 90, spd: 42, shield: 6, skills: ['普攻', '盾击'] },
      { name: '萨卡兹战士', hp: 2000, atk: 150, def: 50, spd: 92, shield: 4, skills: ['普攻', '双刀斩', '狂暴'] },
      { name: '萨卡兹术师', hp: 900, atk: 200, def: 35, spd: 78, shield: 2, skills: ['普攻', '暗影箭'] },
      { name: '高级医疗兵', hp: 1000, atk: 100, def: 40, spd: 82, shield: 0, skills: ['普攻', '战地治疗', '群体治疗'] }
    ],
    rewards: { gold: 600, tickets: 10 }
  },
  {
    id: 10,
    name: '2-5 首领',
    enemies: [
      { name: '「碎骨」', hp: 8000, atk: 250, def: 80, spd: 95, shield: 8, skills: ['普攻', '横扫', '死亡宣告', '狂暴'] }
    ],
    rewards: { gold: 1000, tickets: 20 }
  }
];