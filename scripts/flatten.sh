#!/bin/sh

rm -rf flats/*

files=(
    ./contracts/exchange/*.sol
    ./contracts/oracle/*.sol
    ./contracts/registry/*.sol
    ./contracts/shared/*.sol
    ./contracts/validator/*.sol
)

for filename in "${files[@]}"; do
    name=${filename##*/}
    ./node_modules/.bin/truffle-flattener $filename > ./flats/${name%.*}Flattened.sol
    echo "|> $filename ** Flattened"
done