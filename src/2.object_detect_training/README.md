### install nvidia-docker 
https://github.com/NVIDIA/nvidia-docker


### build docker
```
mkdir model-builder
nvidia-docker build -f Dockerfile.gpu model-builder
```


### fix a problem
use `nvidia-docker images`, you will see a non-tag image, that should be named `model-builder`

so you change it by `nvidia-docker image tag image_id model-builder`


### papare data
```
data
└── images
    ├── cat
    │   ├── cat1.jpg
    │   ├── cat2.jpg
    │   └── ...
    └── dog
        ├── dog1.jpg
        ├── dog2.jpg
        └── ...
```


### traning
```
nvidia-docker run -v /home/yingshaoxo/Codes/tensorflowjs-research/src/2.object_detect_training/data:/data -it model-builder
```


### move files (move_model_to_the_right_place)
```
mkdir ../../object_detect_models

cp ./data/saved_model_web/* ../../object_detect_models/ -f
```
