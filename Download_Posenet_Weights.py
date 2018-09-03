from auto_everything.base import IO, Terminal
io = IO()
t = Terminal()

import urllib.request
import json


def download(version):
    base_url = "https://storage.googleapis.com/tfjs-models/weights/posenet/"

    manifest_url = base_url + version + "manifest.json"
    local_manifest = "posenet_weights/" + version + "manifest.json" 
    if not t.exists(local_manifest):
        response = urllib.request.urlopen(manifest_url)
        data = response.read()      # a `bytes` object
        text = data.decode('utf-8') # a `str`; this step ca
        t.run_command("mkdir posenet_weights")
        t.run_command("mkdir posenet_weights/" + version)
        io.write(local_manifest, text)
    

    with open(local_manifest, encoding='utf-8-sig') as json_file:
            json_data = json.load(json_file)

            url = base_url + version

            for sectionKey in json_data:
                    section = json_data[sectionKey]
                    
                    filename = section["filename"]
                    print(url+filename)
                    response = urllib.request.urlopen(url + filename)
                    data = response.read()      # a `bytes` object

                    with open("posenet_weights/" + version + filename, 'bw+') as f:
                            f.write(data)


input("Are you 100% sure you want to do this? (Ctrl+C to cancel)")
#https://storage.googleapis.com/tfjs-models/weights/posenet/mobilenet_v1_075/manifest.json
versions = [
#        "mobilenet_v1_050/",
        "mobilenet_v1_075/",
#        "mobilenet_v1_100/",
#        "mobilenet_v1_101/",
        ]

for version in versions:
    download(version)
