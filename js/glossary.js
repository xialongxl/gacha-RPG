// ==================== 术语表 ====================
// 技能描述中的专业术语及其解释

export const GLOSSARY = {
  // ====== 属性计算（消除歧义）======

  
  // ====== 状态效果 ======
  '眩晕': {
    tip: '无法行动，跳过当前回合',
    type: 'debuff'
  },
  '嘲讽': {
    tip: '强制敌方优先攻击该单位',
    type: 'special'
  },
  '二连击': {
    tip: '普攻时连续攻击2次',
    type: 'buff'
  },
  '闪避': {
    tip: '有概率完全避开攻击',
    type: 'buff'
  },
  
  // ====== 伤害机制 ======
  '溅射': {
    tip: '对主目标以外的敌人造成额外伤害',
    type: 'damage'
  },
  '破盾': {
    tip: '削减护盾格数，破尽后眩晕+防御归零',
    type: 'damage'
  },
  '可叠加': {
    tip: '多次使用效果会累加',
    type: 'buff'
  },
  
  // ====== 游戏特有术语 ======
  '护盾': {
    tip: '吸收伤害，优先于HP消耗',
    type: 'buff'
  },
  '自身100%攻击力': {
    tip: '基于施法者的ATK计算',
    type: 'special'
  },
  '流形': {
    tip: '缪尔赛思的专属召唤物',
    type: 'special'
  },
  '圣域': {
    tip: '夜莺专属状态：疗愈变为全体疗愈，全队闪避+25%、DEF+50%',
    type: 'special'
  },
  '召唤物': {
    tip: '继承召唤师属性，召唤师死亡时消失',
    type: 'special'
  },
  '余震': {
    tip: '对目标造成50%ATK的额外伤害',
    type: 'special'
  },
  '范围化': {
    tip: '攻击范围变为目标与其相邻敌人',
    type: 'special'
  },
};

/**
 * 应用帮助提示到文本
 * 使用两阶段替换：先标记所有匹配位置，再统一替换
 * @param {string} text - 原始文本
 * @returns {string} - 带有帮助提示的HTML文本
 */
export function applyHelpTips(text) {
  if (!text || typeof text !== 'string') return text;
  
  // 按术语长度降序排序，避免短术语替换长术语的一部分
  // 例如："攻击力" 应该优先于 "攻击"
  const sortedTerms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  
  // 第一阶段：收集所有需要替换的位置和内容
  // 使用结构: { start: number, end: number, term: string, info: object }
  const matches = [];
  
  sortedTerms.forEach(term => {
    const info = GLOSSARY[term];
    let searchStartIndex = 0;
    
    while (searchStartIndex < text.length) {
      // 查找术语在原文中的位置
      const foundIndex = text.indexOf(term, searchStartIndex);
      
      // 没找到，结束对该术语的搜索
      if (foundIndex === -1) break;
      
      const matchEnd = foundIndex + term.length;
      
      // 检查该位置是否与已有匹配重叠
      const hasOverlap = matches.some(existingMatch => {
        // 检查区间是否重叠：[foundIndex, matchEnd) 与 [existingMatch.start, existingMatch.end)
        return !(matchEnd <= existingMatch.start || foundIndex >= existingMatch.end);
      });
      
      if (!hasOverlap) {
        // 没有重叠，记录这个匹配
        matches.push({
          start: foundIndex,
          end: matchEnd,
          term: term,
          info: info
        });
      }
      
      // 继续搜索下一个可能的匹配
      searchStartIndex = foundIndex + 1;
    }
  });
  
  // 如果没有匹配项，直接返回原文
  if (matches.length === 0) return text;
  
  // 第二阶段：按位置从后往前替换，避免位置偏移问题
  // 按 start 降序排序
  matches.sort((a, b) => b.start - a.start);
  
  let result = text;
  
  matches.forEach(match => {
    const { start, end, term, info } = match;
    const typeClass = info.type ? `tip-${info.type}` : '';
    
    // 构建替换HTML
    const replacement = `<span class="help-tip ${typeClass}" data-tip="${escapeHtml(info.tip)}">${escapeHtml(term)}</span>`;
    
    // 执行替换：从后往前替换不会影响前面的位置
    result = result.substring(0, start) + replacement + result.substring(end);
  });
  
  return result;
}

/**
 * 转义HTML特殊字符，防止XSS攻击
 * @param {string} str - 需要转义的字符串
 * @returns {string} - 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return '';
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 需要转义的字符串
 * @returns {string} - 转义后的字符串
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 初始化帮助提示系统
 * 创建全局tooltip元素，并绑定事件监听
 */
export function initHelpTipSystem() {
  // 检查是否已初始化
  if (document.getElementById('help-tip-tooltip')) return;
  
  // 创建tooltip容器
  const tooltip = document.createElement('div');
  tooltip.id = 'help-tip-tooltip';
  tooltip.className = 'help-tip-tooltip';
  tooltip.style.cssText = 'display: none; position: fixed;';
  document.body.appendChild(tooltip);
  
  // 创建箭头
  const arrow = document.createElement('div');
  arrow.className = 'help-tip-tooltip-arrow';
  tooltip.appendChild(arrow);
  
  // 创建内容区
  const content = document.createElement('div');
  content.className = 'help-tip-tooltip-content';
  tooltip.appendChild(content);
  
  // 当前悬停的元素
  let currentTarget = null;
  
  /**
   * 显示tooltip
   */
  function showTooltip(target) {
    const tipText = target.getAttribute('data-tip');
    if (!tipText) return;
    
    currentTarget = target;
    
    // 设置内容
    content.textContent = tipText;
    
    // 先设置为可见但透明，以便测量尺寸
    tooltip.style.display = 'block';
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
    
    // 强制重绘以获取正确尺寸
    tooltip.offsetHeight;
    
    // 获取目标元素和tooltip的尺寸
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // 计算位置 - 默认显示在元素上方
    let top = targetRect.top - tooltipRect.height - 10;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    
    // 检查是否超出视口顶部
    if (top < 10) {
      // 显示在下方
      top = targetRect.bottom + 10;
      tooltip.classList.add('below');
      tooltip.classList.remove('above');
    } else {
      // 显示在上方
      tooltip.classList.add('above');
      tooltip.classList.remove('below');
    }
    
    // 检查是否超出左边界
    if (left < 10) {
      left = 10;
    }
    
    // 检查是否超出右边界
    const rightEdge = left + tooltipRect.width;
    if (rightEdge > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // 应用位置
    tooltip.style.top = Math.round(top) + 'px';
    tooltip.style.left = Math.round(left) + 'px';
    
    // 显示tooltip
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
  }
  
  /**
   * 隐藏tooltip
   */
  function hideTooltip() {
    currentTarget = null;
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
    tooltip.style.visibility = 'hidden';
  }
  
  // 使用事件委托监听 mouseenter 和 mouseleave
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.help-tip');
    if (target && target !== currentTarget) {
      showTooltip(target);
    }
  });
  
  document.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.help-tip');
    if (target) {
      // 检查是否移动到了tooltip本身
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (relatedTarget.closest('.help-tip') === target || relatedTarget.closest('#help-tip-tooltip'))) {
        return;
      }
      hideTooltip();
    }
  });
  
  // 防止tooltip自身触发隐藏
  tooltip.addEventListener('mouseenter', () => {
    // 保持显示
  });
  
  tooltip.addEventListener('mouseleave', () => {
    hideTooltip();
  });
}

// 挂载到 window 以便全局使用
window.applyHelpTips = applyHelpTips;
window.GLOSSARY = GLOSSARY;
window.initHelpTipSystem = initHelpTipSystem;

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHelpTipSystem);
} else {
  initHelpTipSystem();
}