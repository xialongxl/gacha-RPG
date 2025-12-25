// ==================== 兑换系统 ====================

// 兑换规则：5个低星满潜 → 1个高星潜能+1
const EXCHANGE_RULES = {
  3: { target: 4, cost: 5 },  // 5个3星满潜 → 4星潜能+1
  4: { target: 5, cost: 4 },  // 5个4星满潜 → 5星潜能+1
  5: { target: 6, cost: 3 }   // 5个5星满潜 → 6星潜能+1
};

// 获取某星级满潜角色列表
function getMaxPotentialChars(rarity) {
  const result = [];
  Object.entries(state.inventory).forEach(([name, info]) => {
    const data = CHARACTER_DATA[name];
    if (data.rarity === rarity && info.potential >= 12) {
      // 检查是否在队伍中
      const inTeam = state.team.includes(name);
      result.push({ name, inTeam });
    }
  });
  return result;
}

// 获取某星级可升潜的角色列表（已有且未满潜）
function getUpgradableChars(rarity) {
  const result = [];
  Object.entries(state.inventory).forEach(([name, info]) => {
    const data = CHARACTER_DATA[name];
    if (data.rarity === rarity && info.potential < 12) {
      result.push({ name, potential: info.potential });
    }
  });
  return result;
}

// 执行兑换
function doExchange(sourceRarity, targetCharName) {
  const rule = EXCHANGE_RULES[sourceRarity];
  if (!rule) {
    alert('无效的兑换规则');
    return false;
  }
  
  // 获取可消耗的满潜角色（不在队伍中的）
  const sources = getMaxPotentialChars(sourceRarity).filter(c => !c.inTeam);
  
  if (sources.length < rule.cost) {
    alert(`需要${rule.cost}个${sourceRarity}星满潜角色（不在队伍中）`);
    return false;
  }
  
  // 检查目标角色
  const targetInfo = state.inventory[targetCharName];
  const targetData = CHARACTER_DATA[targetCharName];
  
  if (!targetInfo) {
    alert('你没有这个角色');
    return false;
  }
  
  if (targetData.rarity !== rule.target) {
    alert(`只能兑换${rule.target}星角色`);
    return false;
  }
  
  if (targetInfo.potential >= 12) {
    alert('该角色已满潜');
    return false;
  }
  
  // 执行兑换：消耗5个满潜角色
  let consumed = 0;
  for (const source of sources) {
    if (consumed >= rule.cost) break;
    delete state.inventory[source.name];
    consumed++;
  }
  
  // 目标角色潜能+1
  state.inventory[targetCharName].potential++;
  
  saveState();
  alert(`兑换成功！${targetCharName} 潜能提升至 ${state.inventory[targetCharName].potential}`);
  
  return true;
}

// 渲染兑换界面
function renderExchangeUI() {
  const container = document.getElementById('exchange-panel');
  if (!container) return;
  
  let html = '<h3>角色兑换</h3>';
  html += '<p class="exchange-desc">消耗一定数量的满潜角色，提升高一星角色的潜能</p>';
  
  // 三个兑换选项：3→4, 4→5, 5→6
  [3, 4, 5].forEach(rarity => {
    const rule = EXCHANGE_RULES[rarity];
    const sources = getMaxPotentialChars(rarity);
    const availableSources = sources.filter(c => !c.inTeam);
    const targets = getUpgradableChars(rule.target);
    
    const canExchange = availableSources.length >= rule.cost && targets.length > 0;
    const stars = '★'.repeat(rarity);
    const targetStars = '★'.repeat(rule.target);
    
    html += `
      <div class="exchange-option ${canExchange ? '' : 'disabled'}">
        <div class="exchange-header">
          <span class="exchange-source">${stars} 满潜 x${rule.cost}</span>
          <span class="exchange-arrow">→</span>
          <span class="exchange-target">${targetStars} 潜能+1</span>
        </div>
        <div class="exchange-status">
          可用：${availableSources.length}/${rule.cost} 个满潜角色
          ${sources.length > availableSources.length ? `（${sources.length - availableSources.length}个在队伍中）` : ''}
        </div>
    `;
    
    if (canExchange) {
      html += `<div class="exchange-targets">选择目标角色：`;
      targets.forEach(t => {
        html += `
          <button class="exchange-target-btn" onclick="confirmExchange(${rarity}, '${t.name}')">
            ${t.name} (潜能${t.potential}→${t.potential + 1})
          </button>
        `;
      });
      html += `</div>`;
    }
    
    html += `</div>`;
  });
  
  container.innerHTML = html;
}

// 确认兑换
function confirmExchange(sourceRarity, targetName) {
  const rule = EXCHANGE_RULES[sourceRarity];
  const stars = '★'.repeat(sourceRarity);
  
  const confirmed = confirm(
    `确认兑换？\n\n` +
    `消耗：${rule.cost}个 ${stars} 满潜角色\n` +
    `获得：${targetName} 潜能+1\n\n` +
    `⚠️ 消耗的角色将被移除！`
  );
  
  if (confirmed) {
    if (doExchange(sourceRarity, targetName)) {
      renderExchangeUI();
      updateTeamUI();
    }
  }
}

// 打开兑换界面
function openExchange() {
  document.getElementById('exchange-modal').classList.add('active');
  renderExchangeUI();
}

// 关闭兑换界面
function closeExchange() {
  document.getElementById('exchange-modal').classList.remove('active');
}