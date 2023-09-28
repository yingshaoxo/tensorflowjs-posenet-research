from auto_everything.base import IO, Terminal
import os
import time

io = IO()
t = Terminal()


def split_lines():
    print('\n\n' + '-'*12 + '\n\n')

def move_files(source_dir, target_dir):
    for f in os.listdir(source_dir):
        source_file = os.path.join(source_dir, f)
        r = t.run_command("cp -f {from_} {to}".format(from_=source_file, to=target_dir))
        print(r)


# 0. make sure running in the right place
if "4.are_they_looking_product_training" not in t.current_dir:
    print("You must run this script at 4.are_they_looking_product_training folder!")
    exit()


split_lines()


# 1. papare data
introduction = """

You should put your pose data, I mean *.mp4 file in data folder

like be_straight.mp4 or be_left.mp4 , be_right.mp4

make sure those file names are meaningful

"""
print(introduction)
input("Are you ready? ")


data_files = os.listdir("data")
data_files = [file for file in data_files if ".mp4" in file]
if len(data_files) < 1:
    print("You data folder doesn't have any file!")
    exit()



split_lines()



# 2. get json data
if len(t.run_command("ls data/*.json -l").split("\n")) == len(t.run_command("ls data/*.mp4 -l").split("\n")):
    anser = input("You alread have all those data, would you like to collect it again? (y/n)")

if "y" in anser:
    move_files("js", "../")
    for file in data_files:
        t.run_command("cp data/{name} ../demo.mp4".format(name=file))
        t.run_py("py/websockets_server.py")
        time.sleep(2)

        basename = file.split(".")[0]
        if basename + '.json' in os.listdir('data'):
            anwser = input("\n\nYou alread collected {basename} data, would you like to do it again? (y/n)".format(basename=basename+".json"))
            if 'y' not in anwser:
                continue

        t.run("""
    cd ../..
    yarn video
    """, wait=False)
        input("\n\nIs the video finished?")

        t.kill("webpack_for_video")
        t.run("python3 py/websockets_end.py {name}".format(name=basename), wait=True)
        time.sleep(2)
        t.kill("websockets_server.py")
        t.kill("chrome")
        t.kill("firefox")
        time.sleep(2)




t.run_py("py/generate_js_index.py", wait=True)
move_files("js", "../")
t.run_command("rm ../demo.mp4".format(name=file))
