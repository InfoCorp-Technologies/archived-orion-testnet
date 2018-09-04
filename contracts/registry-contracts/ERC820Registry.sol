pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Administration.sol";
import "./Livestock.sol";
import '../sesc-contracts/Whitelist.sol';

contract ERC820Registry is Ownable {

    struct Implementer {
        address implementer;
        bytes multichain;
        bool verified;
        bool removing;
    }

    Administration public administration;

    mapping (address => address) managers;
    mapping (bytes28 => Livestock) livestockMap;
    mapping (bytes32 => address) registeredLivestock;
    mapping (bytes => bool) registeredMultichain;
    mapping (address => mapping(bytes32 => Implementer)) interfacesMap;

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }

    event LivestockAdded(string name, address indexed addr);
    event LivestockRemoved(string name, address indexed addr);
    event ManagerChanged(address indexed addr, address indexed newManager);
    event InterfaceImplementerSet(
        address indexed addr,
        bytes32 indexed interfaceHash,
        string multichain
    );
    event InterfaceImplementerRemoving(
        address indexed addr,
        bytes32 indexed interfaceHash
    );
    event InterfaceImplementerVerified(
        address indexed addr,
        bytes32 indexed interfaceHash,
        string action
    );

    constructor(address _owner, Administration _administration) public {
        require(_owner != address(0), "Owner address is required");
        require(_administration != address(0), "Administrator address is required");
        owner = _owner;
        administration = _administration;
    }

    /// @notice GetManager
    function getManager(address _addr) public view returns(address) {
        // By default the manager of an address is the same address
        return managers[_addr] == address(0) ? _addr : managers[_addr];
    }

    function setManager(address _addr, address _newManager)
        external canManage(_addr)
    {
        managers[_addr] = _newManager == _addr ? address(0) : _newManager;
        emit ManagerChanged(_addr, _newManager);
    }

    function getLivestock(string _name) external view returns(address) {
        return livestockMap[strToBytes28(_name)];
    }

    function setLivestock(Livestock _livestock) external onlyOwner {
        bytes28 name = strToBytes28(_livestock.symbol());
        require(livestockMap[name] == address(0), "This livestock is already set");
        require(_livestock.owner() == address(this), "The livestock contract must have this Registry contract as owner");
        livestockMap[name] = _livestock;
        emit LivestockAdded(_livestock.symbol(), _livestock);
    }

    function removeLivestock(string _name) external onlyOwner {
        bytes28 name = strToBytes28(_name);
        Livestock livestock = livestockMap[name];
        require(livestock != address(0), "This livestock hasn't been set");
        livestock.transferOwnership(msg.sender);
        livestockMap[name] = Livestock(0);
        emit LivestockRemoved(_name, livestock);
    }

    function setAdministration(Administration _administration) external onlyOwner {
        require(_administration != address(0), "Administrator address is required");
        administration = _administration;
    }

    /// @notice Query the combined interface given a name and id
    /// @param _interfaceName Name of the interfce
    function interfaceHash(string _interfaceName, uint _id)
        public pure returns(bytes32)
    {
        bytes32 interfaceBytes;
        bytes32 idBytes = bytes32(_id);
        assembly {
            interfaceBytes := mload(add(_interfaceName, 32))
        }
        if (bytes(_interfaceName).length > 28 || idBytes > 0xffffffff) {
            return 0;
        }
        return interfaceBytes | idBytes;
    }

    function getInterfaceImplementer(address _addr, bytes32 _iHash) public view
        returns (address implementer, string multichain, bool verified)
    {
        Implementer memory interfaces = getInterfaces(_addr, _iHash);
        implementer = interfaces.implementer;
        multichain = string(interfaces.multichain);
        verified = interfaces.verified;
    }

    function setInterfaceImplementer(address _addr, bytes32 _iHash, string _multichain)
        external canManage(_addr)
    {
        Implementer memory interfaces = interfacesMap[_addr][_iHash];
        bytes memory multichainBytes = bytes(_multichain);
        require(multichainBytes.length == 38, "The Multichain address string length must longer than 38");
        require(!interfaces.verified, "The registered information must not be registered and verified before");
        require(!registeredMultichain[multichainBytes], "The Multichain address has been claimed");
        (uint id, bytes28 name) = decodeHash(_iHash);
        requiredRule(_addr, name, 0);
        forbiddenRule(_addr, name, 2);
        if (id > 0) {
            require(livestockMap[name] != address(0), "This livestock contract is not set");
            require(!livestockMap[name].exists(id), "The token has already been minted");
        }
        registeredMultichain[interfaces.multichain] = false;
        interfacesMap[_addr][_iHash].implementer = msg.sender;
        interfacesMap[_addr][_iHash].multichain = multichainBytes;
        emit InterfaceImplementerSet(_addr, _iHash, _multichain);
    }

    function verifyInterfaceImplementer(address _addr, bytes32 _iHash) external {
        Implementer memory interfaces = interfacesMap[_addr][_iHash];
        require(interfaces.implementer != address(0), "This registered information hasn't existed");
        require(!interfaces.verified, "This registered information has already been verified");
        require(!registeredMultichain[interfaces.multichain], "The Multichain address has been claimed");
        (uint id, bytes28 name) = decodeHash(_iHash);
        requiredRule(_addr, name, 0);
        requiredRule(_addr, name, 1);
        forbiddenRule(_addr, name, 2);
        forbiddenRule(_addr, name, 3);
        if (id > 0) {
            require(registeredLivestock[_iHash] == address(0), "The TokenId is allready registered");
            registeredLivestock[_iHash] = _addr;
            livestockMap[name].mint(_addr, id);
        }
        registeredMultichain[interfaces.multichain] = true;
        interfacesMap[_addr][_iHash].verified = true;
        emit InterfaceImplementerVerified(_addr, _iHash, "Added");
    }

    function removeInterfaceImplementer(address _addr, bytes32 _iHash)
        external canManage(_addr)
    {
        Implementer memory interfaces = getInterfaces(_addr, _iHash);
        require(interfaces.verified, "This registered information is not verified");
        require(!interfaces.removing, "This registered information is allready marked as removing");
        bytes28 name = bytes28(_iHash);
        requiredRule(_addr, name, 4);
        forbiddenRule(_addr, name, 6);
        interfacesMap[_addr][_iHash].removing = true;
        emit InterfaceImplementerRemoving(_addr, _iHash);
    }

    function verifyInterfaceRemoval(address _addr, bytes32 _iHash) external {
        require(interfacesMap[_addr][_iHash].removing, "This registered information is not marked as removing");
        Implementer memory empty = Implementer(0x0, "", false, false);
        (uint id, bytes28 name) = decodeHash(_iHash);
        requiredRule(_addr, name, 4);
        requiredRule(_addr, name, 5);
        forbiddenRule(_addr, name, 6);
        forbiddenRule(_addr, name, 7);
        if (id > 0) {
            registeredLivestock[_iHash] = address(0);
            livestockMap[name].burn(_addr, id);
        }
        registeredMultichain[interfacesMap[_addr][_iHash].multichain] = false;
        interfacesMap[_addr][_iHash] = empty;
        emit InterfaceImplementerVerified(_addr, _iHash, "Removed");
    }

    function requiredRule(address addr, bytes28 ruleName,  uint ruleType)
        internal view
    {
        require(ruleType / 2 == 0 || ruleType / 2 == 2);
        string memory name = string(abi.encodePacked(ruleName));
        bytes28[] memory rules = administration.getRules(name, ruleType);
        bool result;
        if (rules.length < 1 && (ruleType == 0 || ruleType == 4)) {
            result = true;
        }
        for (uint i = 0; i < rules.length; i++) {
            bytes28 rule = rules[i];
            if (isFitWithRule(addr, rule, ruleType)) {
                result = true;
                break;
            }
        }
        require(result);
    }

    function forbiddenRule(address addr, bytes28 ruleName,  uint ruleType)
        internal view
    {
        require(ruleType / 2 == 1 || ruleType / 2 == 3);
        string memory name = string(abi.encodePacked(ruleName));
        bytes28[] memory rules = administration.getRules(name, ruleType);
        bool result = true;
        for (uint i = 0; i < rules.length; i++) {
            bytes28 rule = rules[i];
            if (isFitWithRule(addr, rule, ruleType)) {
                result = false;
                break;
            }
        }
        require(result);
    }

    function strToBytes28(string name) internal pure returns(bytes28 result) {
        assembly {
            result := mload(add(name, 32))
        }
    }

    function isFitWithRule(address addr, bytes28 rule, uint ruleType)
        internal view returns(bool)
    {
        return (ruleType % 2 == 0 && interfacesMap[addr][rule].verified ||
        ruleType % 2 == 0 && rule == "admin" && addr == administration.owner() ||
        ruleType % 2 != 0 && interfacesMap[msg.sender][rule].verified ||
        ruleType % 2 != 0 && rule == "admin" && msg.sender == administration.owner());
    }

    function getInterfaces(address _addr, bytes32 _iHash) internal view
        returns(Implementer interfaces)
    {
        uint id = uint(bytes4(_iHash << (8 * 28)));
        bytes28 name = bytes28(_iHash);
        address registered = registeredLivestock[_iHash];
        if (address(livestockMap[name]) != address(0) &&
            livestockMap[name].exists(id))
        {
            if (livestockMap[name].ownerOf(id) == _addr) {
                interfaces = interfacesMap[registered][_iHash];
            } else {
                interfaces = interfacesMap[_addr][0x0];
            }
        } else {
            interfaces = interfacesMap[_addr][_iHash];
        }
    }

    function decodeHash(bytes32 _iHash) public pure
        returns(uint id, bytes28 name)
    {
        id = uint(bytes4(_iHash << (8 * 28)));
        name = bytes28(_iHash);
    }
}