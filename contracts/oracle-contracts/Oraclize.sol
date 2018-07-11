pragma solidity ^0.4.20;

import "github.com/oraclize/ethereum-api/oraclizeAPI_0.5.sol";

contract Oraclize is usingOraclize {
    
    struct QueryInfo {
        address caller;
        string result;
    }
    
    mapping(bytes => string) apiMap;
    mapping(bytes32 => QueryInfo) queryMap;

    event Query(bytes32 queryid, string url);
    event Result(bytes32 queryid, address user);

    constructor() public {
        apiMap["user"] = "http://104.211.59.231/user/";
        apiMap["attestator"] = "http://104.211.59.231/attestator/";
        apiMap["livestock"] = "http://104.211.59.231/livestock/";
        OAR = OraclizeAddrResolverI(0x67F4cd1E091BF7BE2813f88b302a23A3D1aFC5FE);
        oraclize_setCustomGasPrice(1000000000);
    }

    function __callback(bytes32 queryid, string result) public {
        require(queryMap[queryid].caller != 0x0);
        require(msg.sender == oraclize_cbAddress());
        queryMap[queryid].result = result;
        emit Result(queryid, queryMap[queryid].caller);
    }
    
    function api(string name) view external returns(string) {
        bytes memory interfaces = bytes(name);
        return apiMap[interfaces];
    }
    
    function query(string name, string walletaddress, uint gaslimit) payable external {
        bytes memory interfaces = bytes(name);
        string memory url = strConcat("json(", apiMap[interfaces], walletaddress, ").result");
        bytes32 queryId = oraclize_query("URL", url, gaslimit);
        queryMap[queryId].caller = msg.sender;
        emit Query(queryId, url);
    }
    
    function result(bytes32 queryid) view external returns(string) {
        return queryMap[queryid].result;
    }
    
    function oar() view external returns(address) {
        return OAR;
    }
    
    function setAPI(string _name, string _api) external {
        bytes memory interfaces = bytes(_name);
        apiMap[interfaces] = _api;
    }
}