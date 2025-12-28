// ==================== 自动填充角色资源路径 ====================

function processCharacterData(data) {
  const processed = {};
  
  for (const [name, char] of Object.entries(data)) {
    const id = char.id;
    
    processed[name] = {
      ...char,
      // 自动生成spine路径
      spine: char.spine || (id ? {
        skel: `spine/${id}/${id}.skel`,
        atlas: `spine/${id}/${id}.atlas`,
        animation: 'Idle'
      } : null),
      // 自动生成立绘路径
      art: char.art || (id ? `assets/art/${id}/${id}_skin0.png` : null),
      // 自动生成语音路径
      voice: char.voice || (id ? `assets/voice/${id}.wav` : null)
    };
  }
  
  return processed;
}

// ==================== 角色原始数据 ====================

const CHARACTER_DATA_RAW = {
  // ========== 6星 ==========
  '阿米娅': { 
    id: 'char_002_amiya',
    rarity: 6, 
    hp: 800, 
    atk: 150, 
    def: 60, 
    spd: 90, 
    skills: ['普攻', '奥义·终结', '治疗'],
    voiceText: ''
  },
  '陈': { 
    id: 'char_010_chen',
    rarity: 6, 
    hp: 900, 
    atk: 180, 
    def: 70, 
    spd: 100, 
    skills: ['普攻', '赤霄·拔刀', '剑雨'],
    voiceText: ''
  },
  '银灰': { 
    id: 'char_017_huang',
    rarity: 6, 
    hp: 850, 
    atk: 200, 
    def: 50, 
    spd: 85, 
    skills: ['普攻', '真银斩', '强化'],
    voiceText: ''
  },
  '艾雅法拉': { 
    id: 'char_180_amgoat',
    rarity: 6, 
    hp: 600, 
    atk: 220, 
    def: 40, 
    spd: 80, 
    skills: ['普攻', '火山', '灼烧'],
    voiceText: ''
  },
  '凯尔希': { 
    id: 'char_003_kalts',
    rarity: 6, 
    hp: 750, 
    atk: 160, 
    def: 65, 
    spd: 88, 
    skills: ['普攻', 'Mon3tr', '治疗'],
    voiceText: ''
  },
  '铃兰': { 
    id: 'char_358_lisa',
    rarity: 6, 
    hp: 700, 
    atk: 160, 
    def: 55, 
    spd: 85, 
    skills: ['普攻', '全力以赴', '儿时的舞乐', '狐火渺然'],
    voiceText: '罗德岛干员丽萨……啊不对，是铃兰，干员铃兰！是我自己挑的代号喔，今天开始正式作为干员行动，请多指教！'
  },
    '缪尔赛思': { 
    id: 'char_249_mlyss',
    rarity: 6, 
    hp: 800, 
    atk: 150, 
    def: 40, 
    spd: 95, 
    summoner: true,
    skills: ['普攻', '渐进性润化', '生态耦合', '浅层非熵适应'],
    voiceText: '莱茵生命，生态科主任，缪尔赛思。不过我们之间应该不需要这么正式的问候吧，博士。毕竟，我们早就是朋友了。'
  },

  // ========== 5星 ==========
  '德克萨斯': { 
    id: 'char_102_texas',
    rarity: 5, 
    hp: 650, 
    atk: 130, 
    def: 55, 
    spd: 95, 
    skills: ['普攻', '剑雨', '眩晕'],
    voiceText: ''
  },
  '蓝毒': { 
    id: 'char_129_bluep',
    rarity: 5, 
    hp: 550, 
    atk: 140, 
    def: 45, 
    spd: 92, 
    skills: ['普攻', '毒刺', '连射'],
    voiceText: ''
  },
  '白面鸮': { 
    id: 'char_128_plosis',
    rarity: 5, 
    hp: 600, 
    atk: 100, 
    def: 50, 
    spd: 85, 
    skills: ['普攻', '治疗', '群疗'],
    voiceText: ''
  },
  '红': { 
    id: 'char_140_hpred',
    rarity: 5, 
    hp: 500, 
    atk: 160, 
    def: 35, 
    spd: 110, 
    skills: ['普攻', '处决', '潜行'],
    voiceText: ''
  },
  '崖心': { 
    id: 'char_143_ghost',
    rarity: 5, 
    hp: 700, 
    atk: 120, 
    def: 60, 
    spd: 80, 
    skills: ['普攻', '钩索', '投掷'],
    voiceText: ''
  },

  // ========== 4星 ==========
  '芬': { 
    id: 'char_123_fang',
    rarity: 4, 
    hp: 500, 
    atk: 80, 
    def: 40, 
    spd: 75, 
    skills: ['普攻', '战吼'],
    voiceText: ''
  },
  '香草': { 
    id: 'char_121_lava',
    rarity: 4, 
    hp: 450, 
    atk: 60, 
    def: 35, 
    spd: 70, 
    skills: ['普攻', '治疗'],
    voiceText: ''
  },
  '翎羽': { 
    id: 'char_192_falco',
    rarity: 4, 
    hp: 480, 
    atk: 90, 
    def: 38, 
    spd: 78, 
    skills: ['普攻', '突刺'],
    voiceText: ''
  },
  '玫兰莎': { 
    id: 'char_208_melan',
    rarity: 4, 
    hp: 520, 
    atk: 100, 
    def: 42, 
    spd: 82, 
    skills: ['普攻', '连斩'],
    voiceText: ''
  },
  '安塞尔': { 
    id: 'char_212_ansel',
    rarity: 4, 
    hp: 400, 
    atk: 55, 
    def: 30, 
    spd: 72, 
    skills: ['普攻', '治疗'],
    voiceText: ''
  },

  // ========== 3星 ==========
  '巡林者': { 
    id: 'char_122_ranger',
    rarity: 3, 
    hp: 350, 
    atk: 70, 
    def: 25, 
    spd: 70, 
    skills: ['普攻'],
    voiceText: ''
  },
  '杜林': { 
    id: 'char_285_medic2',
    rarity: 3, 
    hp: 300, 
    atk: 50, 
    def: 20, 
    spd: 65, 
    skills: ['普攻'],
    voiceText: ''
  },
  '夜刀': { 
    id: 'char_502_nblade',
    rarity: 3, 
    hp: 380, 
    atk: 65, 
    def: 28, 
    spd: 68, 
    skills: ['普攻'],
    voiceText: ''
  },
  '黑角': { 
    id: 'char_503_hphn',
    rarity: 3, 
    hp: 400, 
    atk: 60, 
    def: 35, 
    spd: 60, 
    skills: ['普攻'],
    voiceText: ''
  },
  '12F': { 
    id: 'char_500_12fce',
    rarity: 3, 
    hp: 320, 
    atk: 55, 
    def: 22, 
    spd: 62, 
    skills: ['普攻'],
    voiceText: ''
  }
};

// 处理后的角色数据
const CHARACTER_DATA = processCharacterData(CHARACTER_DATA_RAW);

// ==================== 关卡数据 ====================

const STAGES = [
  // 第一章：简单
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
  
  // 第二章：困难
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