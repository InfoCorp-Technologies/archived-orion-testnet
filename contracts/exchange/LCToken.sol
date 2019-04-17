pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../shared/ERC677/IBurnableMintableERC677Token.sol";
//import "../shared/Whitelist.sol";
import "./Exchange.sol";


contract LCToken is
    IBurnableMintableERC677Token,
    DetailedERC20,
    BurnableToken,
    MintableToken {

 //   Whitelist public whitelist;

//    modifier canTransfer(address _from, address _to) {
//        require(whitelist.isWhitelist(_from));
//        require(whitelist.isWhitelist(_to));
//        _;
//    }

    modifier validRecipient(address _recipient) {
        require(_recipient != address(0), "Recipient is required");
        require(_recipient != address(this), "Recipient cannot be the LCT contract");
        _;
    }

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        address _exchange
    ) public DetailedERC20(_name, _symbol, _decimals) {
        owner = _exchange;
    }

//    constructor(
//        string _name,
//        string _symbol,
//        uint8 _decimals,
//        Whitelist _whitelist,
//        address _exchange
//    ) public DetailedERC20(_name, _symbol, _decimals) {
//        owner = _exchange;
//        whitelist = _whitelist;
//    }

    function transferAndCall(address _to, uint _value, bytes _data)
        external validRecipient(_to) returns (bool)
    {
        require(superTransfer(_to, _value), "Token transfer is required");
        emit Transfer(msg.sender, _to, _value, _data);

        if (isContract(_to)) {
            require(contractFallback(_to, _value, _data), "Contract fallback is required");
        }
        return true;
    }

    function superTransfer(address _to, uint256 _value) internal returns(bool)
    {
        return super.transfer(_to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool)
    {
        require(superTransfer(_to, _value), "Token transfer is required");
        if (isContract(_to)) {
            contractFallback(_to, _value, new bytes(0));
        }
        return true;
    }

    function contractFallback(address _to, uint _value, bytes _data)
        private
        returns(bool)
    {
        return _to.call(abi.encodeWithSignature("onTokenTransfer(address,uint256,bytes)",  msg.sender, _value, _data));
    }

    function isContract(address _addr)
        private
        view
        returns (bool)
    {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }

    function finishMinting() public returns (bool) {
        revert();
    }

    function renounceOwnership() public onlyOwner {
        revert();
    }

    function claimTokens(address _token, address _to) public onlyOwner {
        require(_to != address(0), "Recipient is required");
        if (_token == address(0)) {
            _to.transfer(address(this).balance);
            return;
        }

        DetailedERC20 token = DetailedERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(_to, balance), "Token transfer is required");
    }

 //   /**
 //    * @dev The whitelist variable setter
 //    * @param _whitelist The address of the whitelist
 //    */
 //   function setWhitelist(Whitelist _whitelist) external onlyOwner {
 //       require(_whitelist != address(0), "Whitelist is required");
 //       whitelist = _whitelist;
 //   }
}
