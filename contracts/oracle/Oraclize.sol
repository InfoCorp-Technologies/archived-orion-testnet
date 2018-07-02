pragma solidity ^0.4.20;

import "github.com/oraclize/ethereum-api/oraclizeAPI_0.5.sol";

contract Oraclize is usingOraclize {
    
    mapping(bytes => string) apiMap;
    mapping(bytes32 => address) queryMap;
    mapping(bytes32 => string) resultMap;

    event Query(bytes32 queryid, string url);
    event Result(bytes32 queryid, address user);

    constructor() public {
        apiMap["user"] = "http://104.211.59.231/user/";
        apiMap["attestator"] = "http://104.211.59.231/attestator";
        apiMap["livestock"] = "http://104.211.59.231/livestock";
        OAR = OraclizeAddrResolverI(address(0xA536fBAdb9658A980cf36f2b6F0ff075612C9BBc));
        oraclize_setCustomGasPrice(1000000000);
    }

    function __callback(bytes32 queryid, string result) public {
        require(queryMap[queryid] != 0x0);
        require(msg.sender == oraclize_cbAddress());
        resultMap[queryid] = result;
        emit Result(queryid, queryMap[queryid]);
    }
    
    function api(string name) view external returns(string) {
        bytes memory interfaces = bytes(name);
        return apiMap[interfaces];
    }
    
    function query(string name, string walletaddress, uint gaslimit) payable external {
        bytes memory interfaces = bytes(name);
        string memory url = strConcat("json(", apiMap[interfaces], walletaddress, ").result");
        bytes32 queryId = oraclize_query("URL", url, gaslimit);
        queryMap[queryId] = msg.sender;
        emit Query(queryId, url);
    }
    
    function result(bytes32 queryid) view external returns(string) {
        require(queryMap[queryid] == msg.sender);
        return resultMap[queryid];
    }
    
    function oar() view external returns(address) {
        return OAR;
    }
    
    function setAPI(string _name, string _api) external {
        bytes memory interfaces = bytes(_name);
        apiMap[interfaces] = _api;
    }
}