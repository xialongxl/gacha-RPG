// 主入口

// 初始化
function init() {
  // 加载存档
  loadState();
  
  // 更新UI
  updateResourceUI();
  
  // 绑定导航事件
  document.querySelectorAll('.nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      showPage(page);
    });
  });
  
  // 绑定抽卡按钮
  document.getElementById('btn-daily').addEventListener('click', dailyLogin);
  document.getElementById('btn-single').addEventListener('click', gachaSingle);
  document.getElementById('btn-ten').addEventListener('click', gachaTen);
  
  // 绑定战斗按钮
  document.getElementById('btn-flee').addEventListener('click', fleeBattle);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  
  console.log('游戏初始化完成！');
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', init);