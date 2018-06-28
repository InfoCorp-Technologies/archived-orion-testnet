pragma solidity ^0.4.23;

import './ERC820ImplementerInterface.sol';

contract ERC820Registry {
    
    struct Implementer {
        address sentinel;
        string crosspay;
    }
    
    bytes public info;
    bytes4 constant InvalidID = 0xffffffff;
    bytes4 constant ERC165ID = 0x01ffc9a7;
    bytes32 constant ERC820_ACCEPT_MAGIC = keccak256("ERC820_ACCEPT_MAGIC");

    mapping (string => bool) registered;
    mapping (address => address) public managers;
    mapping (address => mapping(bytes32 => Implementer)) interfaces;
    mapping (address => mapping(bytes4 => bool)) erc165Cache;

    modifier canManage(address addr) {
        require(getManager(addr) == msg.sender);
        _;
    }

    event InterfaceImplementerSet(address indexed addr, bytes32 indexed interfaceHash, Implementer indexed implementer);
    event ManagerChanged(address indexed addr, address indexed newManager);

    /// @notice Query the hash of an interface given a name
    /// @param interfaceName Name of the interfce
    function interfaceHash(string interfaceName) public pure returns(bytes32) {
        return keccak256(interfaceName);
    }
    
    function setInfo(bytes _info) external {
        info = _info;
    }

    /// @notice GetManager
    function getManager(address addr) public view returns(address) {
        // By default the manager of an address is the same address
        if (managers[addr] == 0) {
            return addr;
        } else {
            return managers[addr];
        }
    }

    /// @notice Sets an external `manager` that will be able to call `setInterfaceImplementer()`
    ///  on behalf of the address.
    /// @param addr Address that you are defining the manager for.
    /// @param newManager The address of the manager for the `addr` that will replace
    ///  the old one.  Set to 0x0 if you want to remove the manager.
    function setManager(address addr, address newManager) public canManage(addr) {
        managers[addr] = newManager == addr ? 0 : newManager;
        emit ManagerChanged(addr, newManager);
    }

    /// @notice Query if an address implements an interface and thru which contract
    /// @param addr Address that is being queried for the implementation of an interface
    /// @param iHash SHA3 of the name of the interface as a string
    ///  Example `web3.utils.sha3('ERC777Token`')`
    /// @return The address of the contract that implements a specific interface
    ///  or 0x0 if `addr` does not implement this interface
    function getInterfaceImplementer(address addr, bytes32 iHash) constant public returns (address, string) {
        address sentinel;
        if (isERC165Interface(iHash)) {
            bytes4 i165Hash = bytes4(iHash);
            sentinel = erc165InterfaceSupported(addr, i165Hash) ? addr : 0;
        } else {
            sentinel = interfaces[addr][iHash].sentinel;
        }
        return (sentinel, interfaces[addr][iHash].crosspay);
    }

    /// @notice Sets the contract that will handle a specific interface; only
    ///  the address itself or a `manager` defined for that address can set it
    /// @param addr Address that you want to define the interface for
    /// @param iHash SHA3 of the name of the interface as a string
    ///  For example `web3.utils.sha3('Ierc777')` for the Ierc777
    function setInterfaceImplementer(address addr, bytes32 iHash, address sentinel, string crosspay) public canManage(addr)  {
        require(!isERC165Interface(iHash));
        bytes memory crosspayBytes = bytes(crosspay);
        if (crosspayBytes.length > 0) {
            require(!registered[crosspay]);
        }
        if ((sentinel != 0) && (sentinel != msg.sender)) {
            require(ERC820ImplementerInterface(sentinel).canImplementInterfaceForAddress(addr, iHash) == ERC820_ACCEPT_MAGIC);
        }
        if (registered[interfaces[addr][iHash].crosspay]) {
            registered[interfaces[addr][iHash].crosspay] = false;
        }
        interfaces[addr][iHash].sentinel = sentinel;
        interfaces[addr][iHash].crosspay = crosspay;
        registered[crosspay] = true;
        emit InterfaceImplementerSet(addr, iHash, interfaces[addr][iHash]);
    }
    
    function changeInterfaceImplementer(address oldAddr, bytes32 iHash, address newAddr) public canManage(oldAddr) {
        if (interfaces[oldAddr][iHash].sentinel == oldAddr) {
            string crosspay = interfaces[oldAddr][iHash].crosspay;
            interfaces[newAddr][iHash] = Implementer(newAddr, crosspay);
        } else {
            interfaces[newAddr][iHash] = interfaces[oldAddr][iHash];
        }
        interfaces[oldAddr][iHash] = Implementer(address(0), "");
    }

    /// ERC165 Specific

    function isERC165Interface(bytes32 iHash) internal pure returns (bool) {
        return iHash & 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF == 0;
    }

    function erc165InterfaceSupported(address _contract, bytes4 _interfaceId) constant public returns (bool) {
        if (!erc165Cache[_contract][_interfaceId]) {
            erc165UpdateCache(_contract, _interfaceId);
        }
        return interfaces[_contract][_interfaceId].sentinel != 0;
    }

    function erc165UpdateCache(address _contract, bytes4 _interfaceId) public {
        interfaces[_contract][_interfaceId].sentinel =
            erc165InterfaceSupported_NoCache(_contract, _interfaceId) ? _contract : 0;
        erc165Cache[_contract][_interfaceId] = true;
    }

    function erc165InterfaceSupported_NoCache(address _contract, bytes4 _interfaceId) public constant returns (bool) {
        uint256 success;
        uint256 result;

        (success, result) = noThrowCall(_contract, ERC165ID);
        if ((success==0)||(result==0)) {
            return false;
        }

        (success, result) = noThrowCall(_contract, InvalidID);
        if ((success==0)||(result!=0)) {
            return false;
        }

        (success, result) = noThrowCall(_contract, _interfaceId);
        if ((success==1)&&(result==1)) {
            return true;
        }
        return false;
    }

    function noThrowCall(address _contract, bytes4 _interfaceId) constant internal returns (uint256 success, uint256 result) {
        bytes4 erc165ID = ERC165ID;

        assembly {
                let x := mload(0x40)               // Find empty storage location using "free memory pointer"
                mstore(x, erc165ID)                // Place signature at begining of empty storage
                mstore(add(x, 0x04), _interfaceId) // Place first argument directly next to signature

                success := staticcall(
                                    30000,         // 30k gas
                                    _contract,     // To addr
                                    x,             // Inputs are stored at location x
                                    0x08,          // Inputs are 8 bytes long
                                    x,             // Store output over input (saves space)
                                    0x20)          // Outputs are 32 bytes long

                result := mload(x)                 // Load the result
        }
    }
}