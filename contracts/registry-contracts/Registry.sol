pragma solidity ^0.4.23;

import "./Administration.sol";
import "./Livestock.sol";
import "../sesc-contracts/Whitelist.sol";

contract Registry is Administration {

    struct Implementer {
        address implementer;
        bytes multichain;
        bool verified;
        bool removing;
    }

    mapping (address => address) managers;
    mapping (bytes28 => Livestock) livestockMap;
    mapping (bytes32 => address) registeredLivestock;
    mapping (bytes => bool) registeredMultichain;
    mapping (address => mapping(bytes32 => Implementer)) interfacesMap;

    event LivestockAdded(string name, address indexed addr);
    event LivestockRemoved(string name, address indexed addr);
    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, string multichain);
    event InterfaceImplementerRemoving(address indexed addr, bytes32 indexed interfaceHash);
    event InterfaceImplementerVerified(address indexed addr, bytes32 indexed interfaceHash, string action);
    event ManagerChanged(address indexed addr, address indexed newManager);

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender, "Sender can't manage this address");
        _;
    }

    constructor(address _admin) public {
        require(_admin != address(0), "Admin address is required");
        owner = _admin;
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

    /**
     * @dev Query the combined interface given a name and id
     * @param _interfaceName Name of the interface
     * @param _id Id of the livestock, left empty (id = 0) if not livestock
     */
    function interfaceHash(string _interfaceName, uint _id)
        public pure returns(bytes32)
    {
        bytes32 interfaceBytes = bytes32(strToBytes28(_interfaceName));
        bytes32 idBytes = bytes32(_id);
        if (bytes(_interfaceName).length > 28 || idBytes > 0xffffffff) {
            return 0;
        }
        return interfaceBytes | idBytes;
    }

    /**
     * @dev Query the registered information of an address by the interface
     * @param _addr The address used to query
     * @param _iHash The interface used to query
     */
    function getInterfaceImplementer(address _addr, bytes32 _iHash) public
        view returns (address implementer, string multichain, bool verified)
    {
        Implementer memory interfaces = _getInterfaces(_addr, _iHash);
        implementer = interfaces.implementer;
        multichain = string(interfaces.multichain);
        verified = interfaces.verified;
    }

    /**
     * @dev Register interface to an address with the Multichain address.
     * @param _addr The address that is registered
     * @param _iHash The combined interface registered to the address.
     * @param _multichain The Multichain address that is registered to the address
     */
    function setInterfaceImplementer(address _addr, bytes32 _iHash, string _multichain)
        external canManage(_addr)
    {
        Implementer memory interfaces = interfacesMap[_addr][_iHash];
        bytes memory multichainBytes = bytes(_multichain);
        require(multichainBytes.length == 38, "The Multichain address string length must longer than 38");
        require(!interfaces.verified, "The registered information must not be registered and verified before");
        require(!registeredMultichain[multichainBytes], "The Multichain address has been claimed");
        (uint id, bytes28 name) = decodeHash(_iHash);
        _canExecute(_addr, name, Actions.SET_INTERFACE);
        if (id > 0) {
            require(livestockMap[name] != address(0), "This livestock contract is not set");
            require(!livestockMap[name].exists(id), "The token has already been minted");
        }
        registeredMultichain[interfaces.multichain] = false;
        interfacesMap[_addr][_iHash].implementer = msg.sender;
        interfacesMap[_addr][_iHash].multichain = multichainBytes;
        emit InterfaceImplementerSet(_addr, _iHash, _multichain);
    }

    /**
     * @dev Verify the register of an address through an interface.
     * @param _addr The address that is registered
     * @param _iHash The combined interface registered to the address.
     */
    function verifyInterfaceImplementer(address _addr, bytes32 _iHash) external {
        Implementer memory interfaces = interfacesMap[_addr][_iHash];
        require(interfaces.implementer != address(0), "This registered information hasn't existed");
        require(!interfaces.verified, "This registered information has already been verified");
        require(!registeredMultichain[interfaces.multichain], "The Multichain address has been claimed");
        (uint id, bytes28 name) = decodeHash(_iHash);
        _canExecute(_addr, name, Actions.VERIFY_INTERFACE);
        if (id > 0) {
            require(registeredLivestock[_iHash] == address(0), "The TokenId is allready registered");
            registeredLivestock[_iHash] = _addr;
            livestockMap[name].mint(_addr, id);
        }
        registeredMultichain[interfaces.multichain] = true;
        interfacesMap[_addr][_iHash].verified = true;
        emit InterfaceImplementerVerified(_addr, _iHash, "Added");
    }

    /**
     * @dev Remove the register of an address through an interface.
     * @param _addr The address that is registered
     * @param _iHash The combined interface registered to the address.
     */
    function removeInterfaceImplementer(address _addr, bytes32 _iHash)
        external canManage(_addr)
    {
        Implementer memory interfaces = _getInterfaces(_addr, _iHash);
        require(interfaces.verified, "This registered information is not verified");
        require(!interfaces.removing, "This registered information is allready marked as removing");
        bytes28 name = bytes28(_iHash);
        _canExecute(_addr, name, Actions.REMOVE_INTERFACE);
        interfacesMap[_addr][_iHash].removing = true;
        emit InterfaceImplementerRemoving(_addr, _iHash);
    }

    /**
     * @dev Verify the register removal of an address through an interface.
     * @param _addr The address that is registered
     * @param _iHash The combined interface registered to the address.
     */
    function verifyInterfaceRemoval(address _addr, bytes32 _iHash) external {
        require(interfacesMap[_addr][_iHash].removing, "This registered information is not marked as removing");
        Implementer memory empty = Implementer(0x0, "", false, false);
        (uint id, bytes28 name) = decodeHash(_iHash);
        _canExecute(_addr, name, Actions.VERIFY_REMOVE_INTERFACE);
        if (id > 0) {
            registeredLivestock[_iHash] = address(0);
            livestockMap[name].burn(_addr, id);
        }
        registeredMultichain[interfacesMap[_addr][_iHash].multichain] = false;
        interfacesMap[_addr][_iHash] = empty;
        emit InterfaceImplementerVerified(_addr, _iHash, "Removed");
    }

    function _getInterfaces(address _addr, bytes32 _iHash) internal view
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

    function _isFitWithRule(address _addr, bytes28 _role, uint _action) internal view
        returns(bool)
    {
        // _action % 2
        //  = 0 indicates that it's a set/remove action type,
        // != 0 indicates that it's a verify action type.
        address addr = _action % 2 == 0 ? _addr : msg.sender;
        return (interfacesMap[addr][_role].implementer != address(0) || _role == "admin" && addr == owner);
    }

    function decodeHash(bytes32 _iHash) public pure returns(uint id, bytes28 name) {
        id = uint(bytes4(_iHash << (8 * 28)));
        name = bytes28(_iHash);
    }
}