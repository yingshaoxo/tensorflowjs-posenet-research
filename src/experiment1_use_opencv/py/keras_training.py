import os
from auto_everything.base import IO
io = IO()

import json
from pprint import pprint

import numpy as np


files = os.listdir("../data")
files = [file for file in files if '.json' in file]


global x, y

for index, file in enumerate(files):
    # get x
    xx = json.loads(io.read("../data/{name}".format(name=file)))
    xx = np.array(xx)
    print(xx.shape)
    # get y
    #yy = np.zeros(xx.shape[0])
    yy = np.full(xx.shape[0], index)

    if index == 0:
        x = xx
        y = yy
    else:
        x = np.append(x, xx, axis=0)
        y = np.append(y, yy, axis=0)


# randomnize data
index = np.arange(x.shape[0])
np.random.shuffle(index)


# 3D to 2D
x = x[index]
x = x.reshape(len(x), -1)

y = y[index]
print(x.shape)
print(y.shape[0])

print(x)
print(y)


from keras.models import Sequential
from keras.layers import Dense

model = Sequential()

model.add(Dense(34, input_dim=34, activation='relu'))
model.add(Dense(21, activation='relu'))
model.add(Dense(1))

model.compile(loss='logcosh', optimizer='adam', metrics=['accuracy'])

model.fit(x, y, batch_size=10, epochs=500)

test_x = x[5:50]
test_y = y[5:50]

predicted = model.predict(test_x)

print(test_y)
print(predicted)

model.save("../pose_detect_model.h5")
