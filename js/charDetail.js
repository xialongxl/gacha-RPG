// ==================== 干员详情系统 ====================

// 显示干员详情
function showCharDetail(charName) {
  const data = CHARACTER_DATA[charName];
  if (!data) return;
  
  const info = state.inventory[charName];
  const potential = info?.potential || 1;
  const bonus = Math.round((potential - 1) * CONFIG.POTENTIAL_BONUS_PER_LEVEL * 100);
  
  // 设置背景图
  const bgImg = document.getElementById('char-detail-bg-img');
  if (data.art) {
    // 用立绘做背景，加模糊
    bgImg.src = 'assets/bg/Bg_default.png';
  } else {
    bgImg.src = 'assets/bg/Bg_default.png';
    bgImg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  }
  
  // 设置立绘
  const artImg = document.getElementById('char-detail-art');
  if (data.art) {
    artImg.src = data.art;
    artImg.style.display = 'block';
  } else {
    artImg.style.display = 'none';
  }
  
  // 设置星级
  const stars = '★'.repeat(data.rarity);
  document.getElementById('char-detail-stars').textContent = stars;
  
  // 设置名字
  document.getElementById('char-detail-name').textContent = charName;
  
  // 设置潜能
  const potentialText = `潜能 ${potential} 级${bonus > 0 ? ` (+${bonus}% 属性)` : ''}`;
  document.getElementById('char-detail-potential').textContent = potentialText;
  
  // 设置属性
  // 设置属性区块
  const statsDiv = document.getElementById('char-detail-stats');
  statsDiv.innerHTML = `
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">HP</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.hp, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">ATK</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.atk, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">DEF</span>
      <span class="char-detail-stat-value">${applyPotentialBonus(data.def, potential)}</span>
  </div>
  <div class="char-detail-stat">
      <span class="char-detail-stat-label">SPD</span>
      <span class="char-detail-stat-value">${data.spd}</span>
  </div>
  `;

  
  // 设置技能
  const skillsDiv = document.getElementById('char-detail-skills');
  skillsDiv.innerHTML = '';
  
  data.skills.forEach(skillName => {
    const skill = SKILL_EFFECTS[skillName];
    if (!skill) return;
    
    const skillDiv = document.createElement('div');
    skillDiv.className = 'char-detail-skill';
    
    let costText = '';
    if (skill.cost > 0) {
      costText = `消耗 ${skill.cost} 能量`;
    } else if (skill.gain > 0) {
      costText = `获得 ${skill.gain} 能量`;
    }
    
    skillDiv.innerHTML = `
      <div class="char-detail-skill-name">${skillName}</div>
      <div class="char-detail-skill-cost">${costText}</div>
      <div class="char-detail-skill-desc">${skill.desc || ''}</div>
    `;
    
    skillsDiv.appendChild(skillDiv);
  });
  
  // 设置队长技能
  const leaderSection = document.getElementById('char-detail-leader');
  const leaderInfo = document.getElementById('char-detail-leader-info');
  
  if (typeof LEADER_BONUS !== 'undefined' && LEADER_BONUS[charName]) {
    const bonus = LEADER_BONUS[charName];
    leaderSection.style.display = 'block';
    
    let bonusText = `目标技能：${bonus.skill}<br>`;
    if (bonus.costReduce) {
      bonusText += `• 能量消耗 -${bonus.costReduce}<br>`;
    }
    if (bonus.healBonus) {
      bonusText += `• 治疗效果 +${Math.round(bonus.healBonus * 100)}%<br>`;
    }
    if (bonus.debuffBonus) {
      bonusText += `• 减益效果 +${Math.round(bonus.debuffBonus * 100)}%<br>`;
    }
    if (bonus.extraEffects && bonus.extraEffects.length > 0) {
      bonusText += `• 额外效果：全队攻击力+10%<br>`;
    }
    
    leaderInfo.innerHTML = bonusText;
  } else {
    leaderSection.style.display = 'none';
  }
  
  // 显示弹窗
  const modal = document.getElementById('char-detail-modal');
  modal.classList.add('active');
}

// 关闭干员详情
function closeCharDetail() {
  document.getElementById('char-detail-modal').classList.remove('active');
}

// 切换面板展开/折叠
function toggleDetailSection(barElement) {
  event.stopPropagation(); // 阻止冒泡，避免关闭弹窗
  
  const section = barElement.parentElement;
  const isExpanded = section.classList.contains('expanded');
  
  if (isExpanded) {
    section.classList.remove('expanded');
  } else {
    section.classList.add('expanded');
  }
}