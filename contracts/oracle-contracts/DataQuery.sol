pragma solidity ^0.4.20;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

contract DataQuery is Ownable {

    struct QueryInfo {
        uint statusCode;
        string result;
    }
    uint public lastUsedId = 0;
    address public oracle;
    mapping(uint => QueryInfo) queryMap;
    event Query(uint indexed queryId, string livestockId, string pubkey);
    event Result(uint indexed queryId, string result, uint indexed statusCode);

    constructor (address _oracle) public{
        require(_oracle != address(0), "Oracle address is required");
        owner = msg.sender;
        oracle = _oracle;
    }

    function query(string livestockId, string pubkey) external {
        lastUsedId++;
        queryMap[lastUsedId].statusCode = 0;
        emit Query(lastUsedId, livestockId, pubkey);
    }

    function callback(uint _queryId, string _result, uint256 _statusCode) public {
        require(queryMap[_queryId].statusCode == 0);
        require(msg.sender == oracle);
        queryMap[_queryId].statusCode = _statusCode;         
        queryMap[_queryId].result = _result;
        emit Result(_queryId, _result, _statusCode);
    }

    function isQueryWaiting(uint _queryId) view external returns(bool) {
        if(queryMap[_queryId].statusCode== 0)
            return true;
        else
            return false;
    }

    function result(uint _queryId) view external returns(string) {
        require(queryMap[_queryId].statusCode != 0);
        return queryMap[_queryId].result;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}
