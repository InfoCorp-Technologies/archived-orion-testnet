pragma solidity ^0.4.20;

import "../Ownable.sol";

contract Oracle is Ownable {
    
    struct QueryInfo {
        bool isWaiting;
        address caller;
        string result;
    }
    
    uint currentId;
    address public bridge = 0x6415CB729a27e9b69891dadaFcbBCae21e5B6F9C;
    
    mapping(bytes => string) apiMap;
    mapping(bytes32 => QueryInfo) queryMap;

    event Query(bytes32 queryid, string url, string pubkey);
    event Result(bytes32 queryid, address user);

    constructor() public {
        apiMap["user"] = "http://104.211.59.231/user/";
        apiMap["attestator"] = "http://104.211.59.231/attestator/";
        apiMap["livestock"] = "http://104.211.59.231/livestock/";
    }

    function __callback(bytes32 _queryid, string _result) public {
        require(queryMap[_queryid].isWaiting);
        require(msg.sender == bridge);
        queryMap[_queryid].isWaiting = false;
        queryMap[_queryid].result = _result;
        emit Result(_queryid, queryMap[_queryid].caller);
    }
    
    function api(string name) view external returns(string) {
        bytes memory interfaces = bytes(name);
        return apiMap[interfaces];
    }
    
    function query(string name, string input, string pubkey) external {
        bytes memory interfaces = bytes(name);
        string memory url = strConcat(apiMap[interfaces], input);
        bytes32 idHash = keccak256(currentId);
        queryMap[idHash].caller = msg.sender;
        queryMap[idHash].isWaiting = true;
        currentId++;
        emit Query(idHash, url, pubkey);
    }
    
    function result(bytes32 _queryid) view external returns(string) {
        return queryMap[_queryid].result;
    }
    
    function setAPI(string _name, string _api) external onlyOwner {
        bytes memory interfaces = bytes(_name);
        apiMap[interfaces] = _api;
    }
    
    function setBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }
    
    function strConcat(string _a, string _b) internal pure returns (string) {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        string memory abcde = new string(_ba.length + _bb.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        for (uint i = 0; i < _ba.length; i++) babcde[k++] = _ba[i];
        for (i = 0; i < _bb.length; i++) babcde[k++] = _bb[i];
        return string(babcde);
    }
}