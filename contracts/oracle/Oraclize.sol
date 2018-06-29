pragma solidity ^0.4.20;

import "github.com/oraclize/ethereum-api/oraclizeAPI_0.5.sol";

contract Oraclize is usingOraclize {
    
    address owner = msg.sender;
    
    mapping(bytes => string) apiMap;
    mapping(bytes32 => address) queryMap;
    mapping(bytes32 => string) resultMap;

    event Query(bytes32 queryid, string url);
    event Result(address user, bytes32 myid);

    constructor() public {
        apiMap["user"] = "json(http://104.211.59.231/user/_crosspay_address).result";
        apiMap["attestator"] = "json(http://104.211.59.231/attestator/_crosspay_address).result";
        apiMap["livestock"] = "json(http://104.211.59.231/livestock/_crosspay_address).result";
        // OAR = OraclizeAddrResolverI(address(0));
        oraclize_setCustomGasPrice(1000000000);
    }

    function __callback(bytes32 myid, string result) public {
        require(queryMap[myid] != address(0));
        require(msg.sender == oraclize_cbAddress());
        resultMap[myid] = result;
        emit Result(queryMap[myid], myid);
    }
    
    function api(string name) view external returns(string) {
        bytes memory interfaces = bytes(name);
        return apiMap[interfaces];
    }
    
    function query(string url, uint gaslimit) payable external {
        bytes32 queryId = oraclize_query("URL", url, gaslimit);
        queryMap[queryId] = msg.sender;
        emit Query(queryId, url);
    }
    
    function result(bytes32 queryid) view external returns(string) {
        require(queryMap[queryid] == msg.sender);
        return resultMap[queryid];
    }
    
    function setAPI(string _name, string _api) external {
        require(msg.sender == owner);
        bytes memory interfaces = bytes(_name);
        apiMap[interfaces] = _api;
    }
}