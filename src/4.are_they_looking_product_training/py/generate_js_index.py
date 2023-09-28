from auto_everything.base import IO
io = IO()

import os
import json


files = os.listdir("../data")
files = [file for file in files if '.json' in file]


item_list = []
for index, file in enumerate(files):
    file = file.replace(".json", "")
    item_list.append({'index': index, 'label_name': file})
    print(index, file)


start = """
export const looking_classes = {
"""
end = "}"


final_js = start
for item in item_list:
    final_js += '{index}: "{name}",'.format(index=item['index'], name=item['label_name']) + '\n'
final_js += end


io.write('../js/looking_classes.js', final_js)
