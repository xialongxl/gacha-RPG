// ==================== 音频管理系统 ====================
// 使用 Howler.js 实现BGM和音效管理

import { getSetting, saveSetting } from './state.js';

export const AudioManager = {
  // BGM实例
  bgm: null,
  // 当前播放的BGM名称
  currentBGM: null,
  // BGM音量（0-1）
  bgmVolume: 0.5,
  // 音效音量（0-1）
  sfxVolume: 0.7,
  // 是否静音
  muted: false,
  
  // ==================== BGM配置 ====================
  BGM_LIST: {
    // 主界面BGM
    main: {
      src: 'assets/bgm/main.mp3',
      loop: true
    },
    // 战斗BGM（普通关卡和无尽模式共用）
    battle: {
      src: 'assets/bgm/battle.mp3',
      loop: true
    },
    // 无尽模式专属BGM
    endless: {
      src: 'assets/bgm/endless.mp3',
      loop: true
    }
    // 注：抽卡页面不使用BGM
  },
  
  // ==================== 音效配置 ====================
  SFX_LIST: {
    // 按钮点击
    click: 'assets/sfx/click.mp3',
    // 胜利
    victory: 'assets/sfx/victory.mp3',
    // 失败
    defeat: 'assets/sfx/defeat.mp3',
    // 抽卡
    pull: 'assets/sfx/pull.mp3',
    // 6星出货
    ssr: 'assets/sfx/ssr.mp3'
  },
  
  // ==================== 初始化 ====================
  async init() {
    // 从游戏设置数据库读取音量设置
    await this.loadSettings();
    console.log('音频系统初始化完成');
  },
  
  // 加载设置（使用 state.js 的 getSetting）
  async loadSettings() {
    try {
      this.bgmVolume = await getSetting('audio_bgmVolume', 0.5);
      this.sfxVolume = await getSetting('audio_sfxVolume', 0.7);
      this.muted = await getSetting('audio_muted', false);
    } catch (e) {
      console.warn('音频设置加载失败', e);
    }
  },
  
  // 保存设置（使用 state.js 的 saveSetting）
  async saveSettings() {
    try {
      await saveSetting('audio_bgmVolume', this.bgmVolume);
      await saveSetting('audio_sfxVolume', this.sfxVolume);
      await saveSetting('audio_muted', this.muted);
    } catch (e) {
      console.warn('音频设置保存失败', e);
    }
  },
  
  // ==================== BGM控制 ====================
  
  // 播放BGM
  playBGM(name, fadeIn = true) {
    // 如果已经在播放相同的BGM，不重复播放
    if (this.currentBGM === name && this.bgm && this.bgm.playing()) {
      return;
    }
    
    const bgmConfig = this.BGM_LIST[name];
    if (!bgmConfig) {
      console.warn('BGM不存在:', name);
      return;
    }
    
    // 停止当前BGM
    if (this.bgm) {
      if (fadeIn) {
        // 淡出后停止
        this.bgm.fade(this.bgm.volume(), 0, 500);
        setTimeout(() => {
          this.bgm.stop();
          this.bgm.unload();
          this._startNewBGM(name, bgmConfig, fadeIn);
        }, 500);
      } else {
        this.bgm.stop();
        this.bgm.unload();
        this._startNewBGM(name, bgmConfig, fadeIn);
      }
    } else {
      this._startNewBGM(name, bgmConfig, fadeIn);
    }
  },
  
  // 内部方法：开始播放新BGM
  _startNewBGM(name, config, fadeIn) {
    // 播放器模式下不自动循环，由BGMPlayer控制
    const useLoop = config.loop !== false && !BGMPlayer.isPlayerMode;
    
    this.bgm = new Howl({
      src: [config.src],
      loop: useLoop,
      volume: fadeIn ? 0 : (this.muted ? 0 : this.bgmVolume),
      onload: () => {
        console.log('BGM加载完成:', name);
      },
      onloaderror: (id, error) => {
        console.error('BGM加载失败:', name, error);
        // 播放器模式下，加载失败自动跳到下一首
        if (BGMPlayer.isPlayerMode) {
          console.log('加载失败，自动跳过');
          BGMPlayer.skipToNext();
        }
      },
      onend: () => {
        // 播放器模式下，曲目结束时触发
        if (BGMPlayer.isPlayerMode) {
          BGMPlayer.onTrackEnd();
        }
      }
    });
    
    this.currentBGM = name;
    this.bgm.play();
    
    if (fadeIn && !this.muted) {
      this.bgm.fade(0, this.bgmVolume, 1000);
    }
  },
  
  // 停止BGM
  stopBGM(fadeOut = true) {
    if (!this.bgm) return;
    
    if (fadeOut) {
      this.bgm.fade(this.bgm.volume(), 0, 500);
      setTimeout(() => {
        this.bgm.stop();
        this.currentBGM = null;
      }, 500);
    } else {
      this.bgm.stop();
      this.currentBGM = null;
    }
  },
  
  // 暂停BGM
  pauseBGM() {
    if (this.bgm && this.bgm.playing()) {
      this.bgm.pause();
    }
  },
  
  // 恢复BGM
  resumeBGM() {
    if (this.bgm && !this.bgm.playing()) {
      this.bgm.play();
    }
  },
  
  // ==================== 音效控制 ====================
  
  // 播放音效
  playSFX(name) {
    if (this.muted) return;
    
    const sfxSrc = this.SFX_LIST[name];
    if (!sfxSrc) {
      console.warn('音效不存在:', name);
      return;
    }
    
    const sfx = new Howl({
      src: [sfxSrc],
      volume: this.sfxVolume
    });
    
    sfx.play();
  },
  
  // ==================== 音量控制 ====================
  
  // 设置BGM音量
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgm && !this.muted) {
      this.bgm.volume(this.bgmVolume);
    }
    this.saveSettings();
  },
  
  // 设置音效音量
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  },
  
  // 静音/取消静音
  toggleMute() {
    this.muted = !this.muted;
    if (this.bgm) {
      this.bgm.volume(this.muted ? 0 : this.bgmVolume);
    }
    this.saveSettings();
    return this.muted;
  },
  
  // 设置静音状态
  setMute(muted) {
    this.muted = muted;
    if (this.bgm) {
      this.bgm.volume(this.muted ? 0 : this.bgmVolume);
    }
    this.saveSettings();
  }
};

// ==================== BGM播放器系统 ====================
export const BGMPlayer = {
  // 多播放列表配置
  PLAYLISTS: {
    main: {
      name: '🏠 主界面',
      tracks: [
        { name: 'BGM - 无限流', key: 'main' }
      ]
    },
    battle: {
      name: '⚔️ 战斗',
      tracks: [
        { name: '战斗BGM', key: 'battle' }
      ]
    },
    endless: {
      name: '🏰 无尽模式',
      tracks: [
        { name: '无尽BGM', key: 'endless' }
      ]
    }
  },
  
  currentPlaylistKey: 'main', // 当前播放列表
  playlist: [], // 当前播放列表的曲目
  currentIndex: 0,
  mode: 'list', // list/random/single
  progressTimer: null,
  isPlayerMode: false, // 播放器模式标志
  isDragging: false, // 拖拽状态
  MODES: {
    list: { icon: '🔁', text: '列表循环' },
    random: { icon: '🔀', text: '随机播放' },
    single: { icon: '🔂', text: '单曲循环' }
  },
  
  init() {
    this.switchPlaylist('main'); // 默认主界面播放列表
    this.updateUI();
    this.startProgressTimer();
    this.initDragEvents();
    this.initGlobalEvents();
    this.updateMuteIcon();
  },

  // 初始化全局事件（如点击外部关闭面板）
  initGlobalEvents() {
    document.addEventListener('click', (e) => {
      const player = document.getElementById('bgm-player');
      const panel = document.getElementById('bgm-panel');
      if (player && panel && !player.contains(e.target)) {
        panel.classList.remove('active');
      }
    });
  },
  
  // 切换播放列表
  switchPlaylist(key) {
    if (!this.PLAYLISTS[key]) {
      console.warn('播放列表不存在:', key);
      return;
    }
    this.currentPlaylistKey = key;
    this.playlist = this.PLAYLISTS[key].tracks;
    this.currentIndex = 0;
    this.renderPlaylist();
    this.updateUI();
  },
  
  // 获取当前播放列表名称
  getCurrentPlaylistName() {
    const pl = this.PLAYLISTS[this.currentPlaylistKey];
    return pl ? pl.name : '未知';
  },
  
  // 初始化进度条拖拽事件
  initDragEvents() {
    const bar = document.getElementById('bgm-progress-bar');
    if (!bar) return;
    
    bar.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.seekByEvent(e);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.seekByEvent(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  },
  
  // 根据事件位置跳转
  seekByEvent(e) {
    const bar = document.getElementById('bgm-progress-bar');
    const bgm = AudioManager.bgm;
    if (!bar || !bgm) return;
    
    const rect = bar.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    const duration = bgm.duration() || 0;
    const seekTime = percent * duration;
    
    bgm.seek(seekTime);
    this.updateProgress();
  },
  
  // 曲目结束回调
  onTrackEnd() {
    if (this.mode === 'single') {
      // 单曲循环：重新播放当前曲目
      this.play(this.currentIndex);
    } else if (this.mode === 'random') {
      // 随机播放
      const next = Math.floor(Math.random() * this.playlist.length);
      this.play(next);
    } else {
      // 列表循环
      this.next();
    }
  },
  
  // 切换静音
  toggleMute() {
    AudioManager.toggleMute();
    this.updateMuteIcon();
  },
  
  // 更新静音图标
  updateMuteIcon() {
    const icon = document.getElementById('bgm-volume-icon');
    if (icon) {
      icon.textContent = AudioManager.muted ? '🔇' : '🔊';
    }
  },
  
  // 格式化时间 mm:ss
  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  // 开始进度条定时器
  startProgressTimer() {
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => this.updateProgress(), 200);
  },
  
  // 更新进度条
  updateProgress() {
    const bgm = AudioManager.bgm;
    if (!bgm) {
      this.setProgress(0, 0);
      this.updateDiscState(false);
      return;
    }
    
    const current = bgm.seek() || 0;
    const total = bgm.duration() || 0;
    this.setProgress(current, total);
    
    // 更新播放按钮状态
    const playBtn = document.getElementById('bgm-play-btn');
    if (playBtn) {
      playBtn.textContent = bgm.playing() ? '⏸️' : '▶️';
    }
    
    // 更新唱片旋转状态
    this.updateDiscState(bgm.playing());
  },
  
  // 更新唱片旋转状态
  updateDiscState(isPlaying) {
    const toggle = document.querySelector('.bgm-player-toggle');
    if (!toggle) return;
    
    if (isPlaying) {
      toggle.classList.add('playing');
      toggle.classList.remove('paused');
    } else {
      toggle.classList.remove('playing');
      toggle.classList.add('paused');
    }
  },
  
  // 设置进度条显示
  setProgress(current, total) {
    const fill = document.getElementById('bgm-progress-fill');
    const handle = document.getElementById('bgm-progress-handle');
    const currentEl = document.getElementById('bgm-time-current');
    const totalEl = document.getElementById('bgm-time-total');
    
    const percent = total > 0 ? (current / total) * 100 : 0;
    
    if (fill) fill.style.width = percent + '%';
    if (handle) handle.style.left = percent + '%';
    if (currentEl) currentEl.textContent = this.formatTime(current);
    if (totalEl) totalEl.textContent = this.formatTime(total);
  },
  
  // 点击进度条跳转
  seek(event) {
    const bar = document.getElementById('bgm-progress-bar');
    const bgm = AudioManager.bgm;
    if (!bar || !bgm) return;
    
    const rect = bar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const duration = bgm.duration() || 0;
    const seekTime = percent * duration;
    
    bgm.seek(seekTime);
    this.updateProgress();
  },
  
  togglePlay() {
    if (AudioManager.bgm && AudioManager.bgm.playing()) {
      AudioManager.pauseBGM();
    } else if (AudioManager.currentBGM) {
      AudioManager.resumeBGM();
    } else {
      this.play(this.currentIndex);
    }
    this.updateUI();
  },
  
  play(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.isPlayerMode = true; // 启用播放器模式
    this.currentIndex = index;
    const bgm = this.playlist[index];
    AudioManager.playBGM(bgm.key, true);
    this.updateUI();
    this.setProgress(0, 0);
  },
  
  // 加载失败时跳到下一首（带防无限循环）
  skipToNext() {
    this.skipCount = (this.skipCount || 0) + 1;
    // 如果跳过次数超过播放列表长度，停止跳过
    if (this.skipCount >= this.playlist.length) {
      console.warn('所有曲目都无法播放');
      this.skipCount = 0;
      return;
    }
    // 直接跳到下一首
    let next = (this.currentIndex + 1) % this.playlist.length;
    this.currentIndex = next;
    const bgm = this.playlist[next];
    AudioManager.playBGM(bgm.key, true);
    this.updateUI();
  },
  
  next() {
    this.skipCount = 0; // 重置跳过计数
    let next = this.mode === 'random' 
      ? Math.floor(Math.random() * this.playlist.length)
      : (this.currentIndex + 1) % this.playlist.length;
    this.play(next);
  },
  
  prev() {
    let prev = this.mode === 'random'
      ? Math.floor(Math.random() * this.playlist.length)
      : (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.play(prev);
  },
  
  toggleMode() {
    const modes = ['list', 'random', 'single'];
    const idx = modes.indexOf(this.mode);
    this.mode = modes[(idx + 1) % modes.length];
    this.updateUI();
  },
  
  setVolume(val) {
    AudioManager.setBGMVolume(val / 100);
  },
  
  updateUI() {
    const playBtn = document.getElementById('bgm-play-btn');
    const modeBtn = document.getElementById('bgm-mode-btn');
    const modeText = document.getElementById('bgm-mode-text');
    const nameEl = document.getElementById('bgm-current-name');
    const playlistNameEl = document.getElementById('bgm-playlist-name');
    const slider = document.getElementById('bgm-volume-slider');
    
    if (playBtn) {
      playBtn.textContent = (AudioManager.bgm && AudioManager.bgm.playing()) ? '⏸️' : '▶️';
    }
    if (modeBtn && modeText) {
      const m = this.MODES[this.mode];
      modeBtn.textContent = m.icon;
      modeText.textContent = m.text;
    }
    if (nameEl && this.playlist[this.currentIndex]) {
      nameEl.textContent = this.playlist[this.currentIndex].name;
    }
    if (playlistNameEl) {
      playlistNameEl.textContent = this.getCurrentPlaylistName();
    }
    if (slider) {
      slider.value = AudioManager.bgmVolume * 100;
    }
    
    document.querySelectorAll('.bgm-playlist-item').forEach((el, i) => {
      el.classList.toggle('playing', i === this.currentIndex);
    });
    
    // 更新播放列表切换按钮状态
    document.querySelectorAll('.bgm-playlist-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.playlist === this.currentPlaylistKey);
    });
  },
  
  renderPlaylist() {
    const container = document.getElementById('bgm-playlist-items');
    if (!container) return;
    container.innerHTML = '';
    
    if (this.playlist.length === 0) {
      container.innerHTML = '<div class="bgm-playlist-empty">暂无曲目</div>';
      return;
    }
    
    this.playlist.forEach((bgm, i) => {
      const item = document.createElement('div');
      item.className = `bgm-playlist-item ${i === this.currentIndex ? 'playing' : ''}`;
      item.textContent = bgm.name;
      item.onclick = () => this.play(i);
      container.appendChild(item);
    });
  },
  
  // 渲染播放列表切换标签
  renderPlaylistTabs() {
    const container = document.getElementById('bgm-playlist-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(this.PLAYLISTS).forEach(key => {
      const pl = this.PLAYLISTS[key];
      const tab = document.createElement('button');
      tab.className = `bgm-playlist-tab ${key === this.currentPlaylistKey ? 'active' : ''}`;
      tab.dataset.playlist = key;
      tab.textContent = pl.name;
      tab.onclick = () => {
        this.switchPlaylist(key);
        // 自动播放第一首
        if (this.playlist.length > 0) {
          this.play(0);
        }
      };
      container.appendChild(tab);
    });
  }
};

export function toggleBGMPlayer() {
  const panel = document.getElementById('bgm-panel');
  if (panel) panel.classList.toggle('active');
}

// ==================== 场景BGM切换辅助函数 ====================

/**
 * 切换到主界面BGM
 * 用于：抽卡页、队伍页、商店页等非战斗场景
 */
export function playMainBGM() {
  BGMPlayer.switchPlaylist('main');
  BGMPlayer.isPlayerMode = true;
  if (BGMPlayer.playlist.length > 0) {
    BGMPlayer.play(0);
  }
}

/**
 * 切换到战斗BGM
 * 用于：普通关卡战斗
 */
export function playBattleBGM() {
  BGMPlayer.switchPlaylist('battle');
  BGMPlayer.isPlayerMode = true;
  if (BGMPlayer.playlist.length > 0) {
    BGMPlayer.play(0);
  }
}

/**
 * 切换到无尽模式BGM
 * 用于：无尽模式
 */
export function playEndlessBGM() {
  BGMPlayer.switchPlaylist('endless');
  BGMPlayer.isPlayerMode = true;
  if (BGMPlayer.playlist.length > 0) {
    BGMPlayer.play(0);
  }
}

/**
 * 停止BGM
 * 用于：抽卡页（不播放BGM）
 */
export function stopBGM() {
  AudioManager.stopBGM();
}
