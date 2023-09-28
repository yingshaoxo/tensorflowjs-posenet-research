### First, install env

```
wget https://github.com/yingshaoxo/auto_everything/raw/master/env_setup.sh
sudo bash env_setup.sh

sudo pip3 install numpy
sudo pip3 install tensorflow
sudo pip3 install keras
sudo pip3 install websockets
sudo pip3 install tensorflowjs_converter
```


### Then, get json data

```
python3 collect_json_data.py
```

Just follow what he said.


### Finally, run jupyter

```
jupyter notebook
```

Read `start_traning.ipynb` for details.

