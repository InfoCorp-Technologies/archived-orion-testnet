#!/bin/bash

rm -rf flats/*

files=(
    ./contracts/registry-contracts/*.sol
    ./contracts/operation-contracts/*.sol
    ./contracts/oracle-contracts/*.sol
    ./contracts/sesc-contracts/*.sol
    ./contracts/validator-contracts/*.sol
)

for filename in "${files[@]}"; do
    name=${filename##*/}
    ./node_modules/.bin/truffle-flattener $filename > ./flats/${name%.*}Flattened.sol
    echo "|> $filename ** Flattened"
done