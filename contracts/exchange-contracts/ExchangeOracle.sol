pragma solidity ^0.4.0;

import "../Ownable.sol";

contract ExchangeOracle is Ownable {

    struct ExchangeInfo {
        bool isWaiting;
        address caller;
        uint result;
    }

    string endpoint;
    uint countId;
    mapping(uint => ExchangeInfo) exchangeMap; // exchangeId => exchangeInfo

    constructor() public {
        endpoint = "http://localhost:65221/rates";
        countId = 0;
    }

    event Exchange(uint exchangeId, uint total, string fromCurrency, string toCurrency, string endpoint);
    event Result(bytes32 txId, uint exchangeId, uint value);

    function getNumberOfExchanges() public view returns (uint) {
        return countId;
    }

    function checkPending(uint id) public view returns (bool) {
        return exchangeMap[id].isWaiting;
    }

    function exchange(uint total, string fromCurrency, string toCurrency) public {
        exchangeMap[countId].isWaiting = true;
        exchangeMap[countId].caller = msg.sender;
        countId++;
        emit Exchange(countId, total, fromCurrency, toCurrency, endpoint);
    }

    function __callback(bytes32 txId, uint exchangeId, uint result) public {
        exchangeMap[exchangeId].isWaiting = false;
        exchangeMap[exchangeId].caller = msg.sender;
        exchangeMap[exchangeId].result = result;
        emit Result(txId, exchangeId, result);
    }

}
