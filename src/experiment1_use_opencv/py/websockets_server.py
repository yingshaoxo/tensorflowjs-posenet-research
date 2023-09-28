# you need to install websockets before you use this
print('\n'*50)

import asyncio
import websockets

from auto_everything.base import IO
io = IO()

import json
from opencv import MyOpencv

myopencv = MyOpencv()


async def hello(websocket, path):
    global one_frame_of_data
    while 1:
        data = await websocket.recv()

        if isinstance(data, str):
            json_data = json.loads(data)
            print(json_data)
            print('\n'*2)
        elif isinstance(data, bytes):
            myopencv.show(data)


start_server = websockets.serve(hello, 'localhost', 8000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
