import asyncio
import websockets
import sys

async def hello(uri):
    async with websockets.connect(uri) as websocket:
        await websocket.send(sys.argv[1])
        exit()

asyncio.get_event_loop().run_until_complete(
    hello('ws://localhost:8000'))
