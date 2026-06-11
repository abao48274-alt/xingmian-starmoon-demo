# 星仪 Live2D 伴侣页面

星眠 AI 伴侣系统的 Live2D 可视化前端。当前使用 Hiyori 占位模型，后续替换为星仪专属模型。

## 启动

```bash
pip install aiohttp
python server.py
```

打开浏览器访问: **http://127.0.0.1:19002**

## 架构

```
浏览器 (Live2D) ←→ WebSocket :19002/ws ←→ server.py ←→ Gateway (:18888)
                                    ↑
                                    └── HTTP API /api/push (Gateway推送)
```

## API

### Gateway → Live2D 推送

```bash
# 情绪切换
curl -X POST http://127.0.0.1:19002/api/push \
  -H "Content-Type: application/json" \
  -d '{"type":"emotion","emotion":"happy"}'

# 对话气泡
curl -X POST http://127.0.0.1:19002/api/push \
  -H "Content-Type: application/json" \
  -d '{"type":"speak","text":"星眠，今天想聊什么？","duration":5000}'

# 直接播放动作
curl -X POST http://127.0.0.1:19002/api/push \
  -H "Content-Type: application/json" \
  -d '{"type":"motion","name":"Hiyori_m07"}'

# 查询状态
curl http://127.0.0.1:19002/api/status
```

## 生产流水线

完成星仪专有模型需要走：

1. **立绘**: Nano Banana / 火山引擎 Seedream → 生成星仪角色立绘
2. **拆分**: See-Through (https://modelscope.cn/studios/ljsabc/See-Through) → 自动拆23层PSD
3. **绑骨**: Stretchy Studio → 网格+骨骼绑定
4. **精修**: Cu → 骨骼权重精调

产出 .moc3 + .model3.json + 纹理 → 替换 `model/Hiyori/`

## 目录

```
xingmian-live2d/
├── index.html        # 主页面
├── server.py         # Python 桥接服务器
├── css/style.css     # 样式
├── js/app.js         # 前端逻辑 (PixiJS + Live2D)
└── model/
    └── Hiyori/       # 当前占位模型 → 替换为星仪
```
