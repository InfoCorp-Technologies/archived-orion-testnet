#!/bin/sh

rm -rf flats/*

files=(
    ./contracts/exchange/*.sol
    ./contracts/oracle/*.sol
    ./contracts/registry/*.sol
    ./contracts/shared/*.sol
    ./contracts/validator/*.sol
    ./contracts/token/*.sol
    ./contracts/bridge/upgradeability/EternalStorageProxy.sol
    ./contracts/bridge/upgradeable_contracts/erc20_to_erc20/ForeignBridgeErcToErc.sol
    ./contracts/bridge/upgradeable_contracts/erc20_to_erc20/HomeBridgeErcToErc.sol
    ./contracts/bridge/upgradeable_contracts/BridgeValidators.sol
    ./contracts/bridge/TollBox.sol
)

for filename in "${files[@]}"; do
    name=${filename##*/}
    ./node_modules/.bin/truffle-flattener $filename > ./flats/${name%.*}Flattened.sol
    echo "|> $filename ** Flattened"
done
