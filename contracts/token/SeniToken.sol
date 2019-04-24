pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../shared/ERC677/IBurnableMintableERC677Token.sol";
import "../shared/ERC677/ERC677Receiver.sol";
import "../shared/IWhitelist.sol";


contract SeniToken is
    IBurnableMintableERC677Token,
    DetailedERC20,
    BurnableToken,
    MintableToken {

    address public bridgeContract;
    address public whitelistContract;

    event ContractFallbackCallFailed(address from, address to, uint value);

    modifier validRecipient(address _recipient) {
        require(_recipient != address(0));
        require(_recipient != address(this));
        _;
    }

    modifier isWhitelisted(address _addr) {
        require(_whitelist().isWhitelisted(_addr) || _isContract(_addr));
        _;
    }

    constructor(
        string _name,
        string _symbol,
        uint8 _decimals,
        address _whitelistContract
    )
        public
        DetailedERC20(_name, _symbol, _decimals)
    {
        require(_whitelistContract != address(0));
        whitelistContract = _whitelistContract;
    }

    function transferAndCall(address _to, uint _value, bytes _data)
        external validRecipient(_to) returns (bool)
    {
        require(_superTransfer(_to, _value));
        emit Transfer(msg.sender, _to, _value, _data);

        if (_isContract(_to)) {
            require(_contractFallback(_to, _value, _data));
        }
        return true;
    }

    function setBridgeContract(address _bridgeContract) onlyOwner public {
        require(_bridgeContract != address(0) && _isContract(_bridgeContract));
        bridgeContract = _bridgeContract;
    }

    function setWhitelistContract(address _whitelistContract) onlyOwner public {
        require(
            _whitelistContract != address(0) && _isContract(_whitelistContract)
        );
        whitelistContract = _whitelistContract;
    }

    function transfer(address _to, uint256 _value) public returns (bool)
    {
        require(_superTransfer(_to, _value));
        if (_isContract(_to) && !_contractFallback(_to, _value, new bytes(0))) {
            if (_to == bridgeContract) {
                revert();
            } else {
                emit ContractFallbackCallFailed(msg.sender, _to, _value);
            }
        }
        return true;
    }

    function claimTokens(address _token, address _to) public onlyOwner {
        require(_to != address(0));
        if (_token == address(0)) {
            _to.transfer(address(this).balance);
            return;
        }

        DetailedERC20 token = DetailedERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(_to, balance));
    }

    function mint(address _to, uint256 _amount)
        public
        isWhitelisted(_to)
        returns (bool)
    {
        return super.mint(_to, _amount);
    }

    function finishMinting() public returns (bool) {
        revert();
    }

    function renounceOwnership() public onlyOwner {
        revert();
    }

    function transferFrom(address _from, address _to, uint256 _value)
        public
        isWhitelisted(_to)
        returns (bool)
    {
        super.transferFrom(_from, _to, _value);
    }

    function _contractFallback(address _to, uint _value, bytes _data)
        private
        returns(bool)
    {
        return _to.call(abi.encodeWithSignature("onTokenTransfer(address,uint256,bytes)",  msg.sender, _value, _data));
    }

    function _isContract(address _addr)
        private
        view
        returns (bool)
    {
        uint length;
        assembly { length := extcodesize(_addr) }
        return length > 0;
    }

    function _superTransfer(address _to, uint256 _value)
        internal
        isWhitelisted(_to)
        returns(bool)
    {
        return super.transfer(_to, _value);
    }

    function _whitelist() internal view returns(IWhitelist) {
        return IWhitelist(whitelistContract);
    }
}
