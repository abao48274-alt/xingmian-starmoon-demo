"""
星仪 Live2D 伴侣页面 - 桥接服务器
端口 19002
功能：
  1. 静态文件服务 (index.html + model 文件)
  2. WebSocket 端点 → 前端实时通信
  3. HTTP API → Gateway 推送情绪/语音指令
"""

import asyncio
import json
import logging
import time
from pathlib import Path

import aiohttp
from aiohttp import web, WSMsgType

logging.basicConfig(level=logging.INFO, format='[星仪Bridge] %(message)s')
logger = logging.getLogger('xingyi-bridge')

ROOT = Path(__file__).parent
STATIC = ROOT

# 已连接的 WebSocket 客户端集合
ws_clients: set[web.WebSocketResponse] = set()


# ============ WebSocket 处理 ============
async def ws_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    ws_clients.add(ws)
    client_ip = request.remote
    logger.info(f"WebSocket 连接: {client_ip}  (当前 {len(ws_clients)} 个客户端)")

    # 欢迎消息
    await ws.send_json({
        "type": "welcome",
        "name": "星仪",
        "message": "星仪 Live2D 伴侣已就绪",
        "timestamp": int(time.time() * 1000),
    })

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    data = json.loads(msg.data)
                    logger.info(f"收到: {data.get('type', 'unknown')} / {data.get('emotion', '')}")
                    
                    # 转发情绪变更到 Gateway（如果配置了）
                    if data.get('type') == 'emotion_change':
                        await forward_to_gateway(data)
                        
                except json.JSONDecodeError:
                    logger.warning(f"无效JSON: {msg.data[:100]}")
                    
            elif msg.type == WSMsgType.ERROR:
                logger.error(f"WS错误: {ws.exception()}")
    finally:
        ws_clients.discard(ws)
        logger.info(f"WebSocket 断开: {client_ip}  (剩余 {len(ws_clients)} 个客户端)")
    
    return ws


# ============ 广播消息到所有前端 ============
async def broadcast(msg: dict):
    """向所有已连接的 Live2D 前端广播消息"""
    dead = set()
    for ws in ws_clients:
        try:
            if not ws.closed:
                await ws.send_json(msg)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)


# ============ HTTP API：Gateway 推送指令 ============
async def api_push(request: web.Request):
    """
    POST /api/push
    Gateway 调用此接口向 Live2D 前端推送指令。
    
    Body (JSON):
    {
      "type": "emotion",    // emotion | speak | motion | mood
      "emotion": "happy",   // 表情名
      "text": "你好星眠",    // speak 时的文字
      "duration": 4000,     // speak 气泡持续时间 ms
      "name": "motion01"    // motion 名
    }
    """
    try:
        data = await request.json()
        msg_type = data.get('type', 'emotion')
        logger.info(f"Gateway推送: type={msg_type} emotion={data.get('emotion','')} text={data.get('text','')[:30]}")
        
        await broadcast(data)
        return web.json_response({"ok": True, "clients": len(ws_clients)})
    
    except json.JSONDecodeError:
        return web.json_response({"ok": False, "error": "invalid json"}, status=400)


# ============ HTTP API：状态查询 ============
async def api_status(request: web.Request):
    """GET /api/status — 查询当前连接状态"""
    return web.json_response({
        "ok": True,
        "clients": len(ws_clients),
        "model": "Hiyori (placeholder)",
        "uptime": int(time.time() * 1000),
    })


# ============ 转发到 Gateway ============
GATEWAY_URL = "http://127.0.0.1:18888"

async def forward_to_gateway(data: dict):
    """将前端的情绪变更转发到 Gateway"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{GATEWAY_URL}/live2d/emotion",
                json=data,
                timeout=aiohttp.ClientTimeout(total=3),
            ) as resp:
                if resp.status == 200:
                    logger.info(f"已转发到Gateway: {data.get('emotion')}")
                else:
                    logger.warning(f"Gateway返回 {resp.status}")
    except aiohttp.ClientError as e:
        logger.debug(f"Gateway不可达 (正常，Gateway可能未配置/live2d/emotion端点): {e}")
    except Exception as e:
        logger.debug(f"转发异常: {e}")


# ============ 启动服务器 ============
def create_app() -> web.Application:
    app = web.Application()
    
    # WebSocket
    app.router.add_get('/ws', ws_handler)
    
    # HTTP API
    app.router.add_post('/api/push', api_push)
    app.router.add_get('/api/status', api_status)
    
    # 静态文件
    app.router.add_static('/', STATIC, show_index=True)
    
    return app


async def main():
    app = create_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 19002)
    
    logger.info("=" * 50)
    logger.info("  星仪 Live2D 伴侣服务器启动")
    logger.info(f"  页面: http://127.0.0.1:19002")
    logger.info(f"  WS:   ws://127.0.0.1:19002/ws")
    logger.info(f"  API:  http://127.0.0.1:19002/api/push")
    logger.info("=" * 50)
    
    await site.start()
    
    # 保持运行
    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        pass


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("服务器已停止")
