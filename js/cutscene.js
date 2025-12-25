// ==================== 抽卡演出系统 ====================

// 演出队列
let cutsceneQueue = [];
let isCutscenePlaying = false;

// 播放6星演出
function playCutscene(charName) {
  const data = CHARACTER_DATA[charName];
  if (!data) return;
  
  const modal = document.getElementById('ssr-cutscene');
  const artImg = document.getElementById('cutscene-art');
  const bgImg = document.getElementById('cutscene-bg-img');
  const nameDiv = document.getElementById('cutscene-name');
  const textDiv = document.getElementById('cutscene-text');
  const voiceWrapper = document.getElementById('charvoice-wrapper');
  const voice = document.getElementById('cutscene-voice');
  
  // 设置背景图
  if (bgImg) {
    if (data.artBg) {
      // 有专属背景
      bgImg.src = 'assets/bg/Bg_default.png';
    } else {
      // 用默认背景
      bgImg.src = 'assets/bg/Bg_default.png';
    }
    bgImg.style.display = 'block';
  }
  
  // 设置立绘
  if (data.art) {
    artImg.src = data.art;
    artImg.style.display = 'block';
  } else {
    artImg.style.display = 'none';
  }
  
  // 设置名字
  nameDiv.textContent = charName;
  
  // 设置字幕文本
  if (data.voiceText) {
    textDiv.textContent = data.voiceText;
  } else {
    textDiv.textContent = '……';
  }
  
  // 播放语音
  if (data.voice) {
    voice.src = data.voice;
    voice.play().catch(e => console.log('语音播放失败:', e));
  }
  
  // 显示演出和字幕
  modal.classList.add('active');
  if (voiceWrapper) {
    voiceWrapper.classList.add('active');
  }
  isCutscenePlaying = true;
}

// 关闭演出
function closeCutscene() {
  const modal = document.getElementById('ssr-cutscene');
  const voiceWrapper = document.getElementById('charvoice-wrapper');
  const voice = document.getElementById('cutscene-voice');
  
  modal.classList.remove('active');
  if (voiceWrapper) {
    voiceWrapper.classList.remove('active');
  }
  voice.pause();
  voice.currentTime = 0;
  isCutscenePlaying = false;
  
  // 检查队列
  if (cutsceneQueue.length > 0) {
    const nextChar = cutsceneQueue.shift();
    setTimeout(() => playCutscene(nextChar), 300);
  }
}

// 添加到队列
function queueCutscene(charName) {
  if (isCutscenePlaying) {
    cutsceneQueue.push(charName);
  } else {
    playCutscene(charName);
  }
}

// 点击关闭
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('ssr-cutscene');
  if (modal) {
    modal.addEventListener('click', () => {
      closeCutscene();
    });
  }
});