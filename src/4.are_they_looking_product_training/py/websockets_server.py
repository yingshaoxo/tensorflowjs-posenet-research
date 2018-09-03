# you need to install websockets before you use this

import asyncio
import websockets

from auto_everything.base import IO
io = IO()

import json


global frames
frames = []


async def hello(websocket, path):
    global one_frame_of_data
    while 1:
        data = await websocket.recv()

        if ("[" in data) and ("]" in data) and ("," in data):
            json_data = json.loads(data)
            print(json_data)
            frames.append(json_data)
            print('\n'*2)
        else:
            text = json.dumps(frames)
            io.write("../data/{name}.json".format(name=data), text)
            exit()


start_server = websockets.serve(hello, 'localhost', 8000)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
