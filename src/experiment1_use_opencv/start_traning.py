from auto_everything.base import IO, Terminal
import os
import time

io = IO()
t = Terminal()


def split_lines():
    print('\n\n' + '-'*12 + '\n\n')


# 0. make sure running in the right place
if "3.use_opencv" not in t.current_dir:
    print("You must run this script at 3.use_opencv folder!")
    exit()


split_lines()


t.run_command("cp ../1.pose_detect_training/data/sitting.mp4 ../demo.mp4")
t.run_command("cp js/video_index.js ../video_index.js")
t.run_py("py/websockets_server.py")

t.run("""
cd ../..
yarn video
""", wait=False)


input("Do we finished?")
t.kill("webpack")
t.kill("websockets_server.py")
t.run_command("rm ../demo.mp4")
