pragma solidity ^0.4.24;

import "../Ownable.sol";

contract Exchange is Ownable {

    struct ExchangeInfo {
        bool isWaiting;
        address caller;
        uint result;
    }

    string endpoint;
    uint countId;
    mapping(uint => ExchangeInfo) exchangeMap; // exchangeId => exchangeInfo

    constructor() public {
        countId = 0;
    }

    event Exchange(uint exchangeId, uint total, string fromCurrency, string toCurrency);
    event Result(uint exchangeId, uint value);

    function getNumberOfExchanges() public view returns (uint) {
        return countId;
    }

    function checkPending(uint id) public view returns (bool) {
        return exchangeMap[id].isWaiting;
    }

    function exchange(uint total, string fromCurrency, string toCurrency) public {
        exchangeMap[countId].isWaiting = true;
        exchangeMap[countId].caller = msg.sender;
        emit Exchange(countId, total, fromCurrency, toCurrency);
        countId++;
    }

    function callback(uint exchangeId, uint result) public {
        exchangeMap[exchangeId].isWaiting = false;
        exchangeMap[exchangeId].caller = msg.sender;
        exchangeMap[exchangeId].result = result;
        emit Result(exchangeId, result);
    }

}
