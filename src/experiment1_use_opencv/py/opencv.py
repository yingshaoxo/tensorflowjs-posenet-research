import cv2
import numpy as np


class MyOpencv():

    def __init__(self):
        pass

    def __decode_bytes(self, bytes_):
        #use numpy to construct an array from the bytes
        x = np.fromstring(bytes_, dtype='uint8')
        #decode the array into an image
        img = cv2.imdecode(x, cv2.IMREAD_UNCHANGED)
        return img

    def handle(self, img):
        pass

    def show(self, bytes_):
        img = self.__decode_bytes(bytes_)
        cv2.imshow("viewer", img)
        if cv2.waitKey(110) & 0xff == 27:
            exit()
