/**
 * 星仪 Live2D 伴侣页面 - 主逻辑
 * WebSocket 连接 Gateway → 实时驱动 Live2D 表情/动作/对话
 */

// ============ 配置 ============
const CONFIG = {
  modelPath: 'model/Hiyori/Hiyori.model3.json',
  wsUrl: `ws://${location.hostname}:19002/ws`,
  defaultMotion: 'Hiyori_m01',
  emotionMotions: {
    happy:     { motion: 'Hiyori_m02', expression: 'smile' },
    surprised: { motion: 'Hiyori_m03', expression: 'surprised' },
    sad:       { motion: 'Hiyori_m04', expression: 'sad' },
    angry:     { motion: 'Hiyori_m05', expression: 'angry' },
    blush:     { motion: 'Hiyori_m06', expression: 'shy' },
    idle:      { motion: 'Hiyori_m01', expression: 'neutral' },
  },
};

// ============ 全局状态 ============
const state = {
  app: null,
  model: null,
  ws: null,
  connected: false,
  currentEmotion: 'idle',
  speechTimer: null,
};

// ============ DOM 引用 ============
const canvas = document.getElementById('live2d-canvas');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const emotionTag = document.getElementById('emotion-tag');
const speechBubble = document.getElementById('speech-bubble');

// ============ PixiJS 初始化 ============
async function initPixi() {
  state.app = new PIXI.Application({
    view: canvas,
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  // 加载 Live2D 模型
  try {
    state.model = await PIXI.live2d.Live2DModel.from(CONFIG.modelPath);
    state.app.stage.addChild(state.model);

    // 模型缩放和位置
    const scale = Math.min(
      window.innerWidth / state.model.width * 0.7,
      window.innerHeight / state.model.height * 0.9
    );
    state.model.scale.set(scale);
    state.model.anchor.set(0.5, 0.5);
    state.model.x = window.innerWidth / 2;
    state.model.y = window.innerHeight * 0.55;

    // 初始待机动作
    state.model.motion(CONFIG.defaultMotion);

    statusText.textContent = '星仪就绪';
    statusDot.classList.add('connected');
    console.log('[星仪] Live2D 模型加载成功');
  } catch (err) {
    console.error('[星仪] 模型加载失败:', err);
    statusText.textContent = '模型加载失败';
  }
}

// ============ WebSocket 连接 Gateway ============
function connectWS() {
  try {
    state.ws = new WebSocket(CONFIG.wsUrl);
    
    state.ws.onopen = () => {
      state.connected = true;
      statusDot.classList.add('connected');
      statusText.textContent = '已连接 Gateway';
      console.log('[星仪] WebSocket 已连接');
      
      // 发送身份注册
      state.ws.send(JSON.stringify({
        type: 'register',
        role: 'xingyi-live2d',
        name: '星仪',
      }));
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleGatewayMessage(msg);
      } catch (e) {
        console.warn('[星仪] 无法解析消息:', event.data);
      }
    };

    state.ws.onclose = () => {
      state.connected = false;
      statusDot.classList.remove('connected');
      statusText.textContent = '连接断开 · 5秒后重连';
      setTimeout(connectWS, 5000);
    };

    state.ws.onerror = () => {
      statusText.textContent = '连接失败';
    };
  } catch (e) {
    statusText.textContent = 'WS不可用 · 10秒后重试';
    setTimeout(connectWS, 10000);
  }
}

function handleGatewayMessage(msg) {
  switch (msg.type) {
    case 'emotion':
      // 驱动表情变化
      setEmotion(msg.emotion || msg.state);
      break;

    case 'speak':
      // 显示对话气泡
      showSpeech(msg.text, msg.duration || 4000);
      break;

    case 'motion':
      // 直接播放指定动作
      if (state.model && msg.name) {
        state.model.motion(msg.name);
      }
      break;

    case 'mood':
      // 心情更新
      if (msg.mood) {
        setEmotion(msg.mood);
      }
      break;

    case 'heartbeat':
      // 心跳：保持连接
      break;

    default:
      console.log('[星仪] 未知消息类型:', msg.type);
  }
}

// ============ 表情控制 ============
function setEmotion(emotion) {
  if (state.currentEmotion === emotion) return;
  
  const config = CONFIG.emotionMotions[emotion];
  if (!config) {
    console.warn('[星仪] 未知表情:', emotion);
    return;
  }

  state.currentEmotion = emotion;
  
  // 播放动作
  if (state.model) {
    state.model.motion(config.motion);
    if (config.expression) {
      state.model.expression(config.expression);
    }
  }

  // 更新 UI
  const labels = {
    happy: '😊 开心', surprised: '😮 惊讶', sad: '😢 难过',
    angry: '😠 生气', blush: '😳 害羞', idle: '💤 待机',
  };
  emotionTag.textContent = labels[emotion] || emotion;
  emotionTag.classList.add('show');
}

// ============ 对话气泡 ============
function showSpeech(text, duration = 4000) {
  if (state.speechTimer) clearTimeout(state.speechTimer);
  
  speechBubble.textContent = text;
  speechBubble.classList.add('show');
  
  state.speechTimer = setTimeout(() => {
    speechBubble.classList.remove('show');
  }, duration);
}

// ============ 按钮控制 ============
document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const motion = btn.dataset.motion;
    setEmotion(motion);
    
    // 同步到 Gateway
    if (state.connected && state.ws) {
      state.ws.send(JSON.stringify({
        type: 'emotion_change',
        emotion: motion,
        source: 'manual',
      }));
    }
  });
});

// ============ 窗口自适应 ============
window.addEventListener('resize', () => {
  if (state.app) {
    state.app.renderer.resize(window.innerWidth, window.innerHeight);
    if (state.model) {
      state.model.x = window.innerWidth / 2;
      state.model.y = window.innerHeight * 0.55;
    }
  }
});

// ============ 启动 ============
(async () => {
  statusText.textContent = '加载模型中...';
  await initPixi();
  connectWS();
})();
