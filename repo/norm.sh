#!/bin/bash

whl=/data/git/archives/repo/pkg/$(basename $(pwd)).whl
echo Normalizing to mvp : $whl

for lib in $(find -type f |grep \\.so$)
do
    if /opt/python-wasm-sdk/emsdk/upstream/bin/wasm-emscripten-finalize -mvp $lib -o /tmp/norm.so
    then
        mv /tmp/norm.so  $lib
    else
        echo FAILED TO NORM $lib
    fi
done
[ -f $whl ] && rm $whl
zip $whl -r .
