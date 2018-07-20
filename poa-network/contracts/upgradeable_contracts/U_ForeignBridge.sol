pragma solidity ^0.4.23;
import "../libraries/SafeMath.sol";
import "../libraries/Message.sol";
import "./U_BasicBridge.sol";
import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol"; 


contract ForeignBridge is BasicBridge {

    using SafeMath for uint256;
    /// triggered when relay of deposit from HomeBridge is complete
    event Deposit(address recipient, uint value, bytes32 transactionHash);
    /// Event created on money withdraw.
    event Withdraw(address recipient, uint256 value);
    event GasConsumptionLimitsUpdated(uint256 gasLimitDepositRelay, uint256 gasLimitWithdrawConfirm);

    function initialize(
        address _validatorContract,
        address _token,
        uint256 _dailyLimit,
        uint256 _maxPerTx,
        uint256 _minPerTx,
        uint256 _foreignGasPrice,
        uint256 _requiredBlockConfirmations
    ) public returns(bool) {
        require(!isInitialized());
        require(_token != address(0));
        require(_validatorContract != address(0));
        require(_minPerTx > 0 && _maxPerTx > _minPerTx && _dailyLimit > _maxPerTx);
        require(_foreignGasPrice > 0);
        addressStorage[keccak256("erc20token")] = _token;
        addressStorage[keccak256("validatorContract")] = _validatorContract;
        uintStorage[keccak256("dailyLimit")] = _dailyLimit;
        uintStorage[keccak256("deployedAtBlock")] = block.number;
        uintStorage[keccak256("maxPerTx")] = _maxPerTx;
        uintStorage[keccak256("minPerTx")] = _minPerTx;
        uintStorage[keccak256("gasPrice")] = _foreignGasPrice;
        uintStorage[keccak256("requiredBlockConfirmations")] = _requiredBlockConfirmations;
        setInitialize(true);
        return isInitialized();
    }

    function onTokenTransfer(uint256 _value) external returns(bool) {
        require(withinLimit(_value));
        setTotalSpentPerDay(getCurrentDay(), totalSpentPerDay(getCurrentDay()).add(_value));
        erc20token().transferFrom(msg.sender, address(this), _value);
        emit Withdraw(msg.sender, _value);
        return true;
    }
    
    function claimTokens(address _token, address _to) external onlyOwner {
        require(_to != address(0));
        if (_token == address(0)) {
            _to.transfer(address(this).balance);
            return;
        }

        ERC20Basic token = ERC20Basic(_token);
        uint256 balance = token.balanceOf(this);
        require(token.transfer(_to, balance));
    }

    function gasLimitDepositRelay() public view returns(uint256) {
        return uintStorage[keccak256("gasLimitDepositRelay")];
    }

    function gasLimitWithdrawConfirm() public view returns(uint256) {
        return uintStorage[keccak256("gasLimitWithdrawConfirm")];
    }

    function erc20token() public view returns(ERC20) {
        return ERC20(addressStorage[keccak256("erc20token")]);
    }

    function setGasLimits(uint256 _gasLimitDepositRelay, uint256 _gasLimitWithdrawConfirm) external onlyOwner {
        uintStorage[keccak256("gasLimitDepositRelay")] = _gasLimitDepositRelay;
        uintStorage[keccak256("gasLimitWithdrawConfirm")] = _gasLimitWithdrawConfirm;
        emit GasConsumptionLimitsUpdated(gasLimitDepositRelay(), gasLimitWithdrawConfirm());
    }

    function deposit(uint8[] _vs, bytes32[] _rs, bytes32[] _ss, bytes _message) external {
        Message.hasEnoughValidSignatures(_message, _vs, _rs, _ss, validatorContract());
        address recipient;
        uint256 amount;
        bytes32 txHash;
        (recipient, amount, txHash) = Message.parseMessage(_message);
        require(!deposits(txHash));
        setDeposits(txHash, true);

        erc20token().transfer(recipient, amount);
        emit Deposit(recipient, amount, txHash);
    }

    function deposits(bytes32 _withdraw) public view returns(bool) {
        return boolStorage[keccak256("deposits", _withdraw)];
    }

    function setDeposits(bytes32 _withdraw, bool _status) private {
        boolStorage[keccak256("deposits", _withdraw)] = _status;
    }

    function setErc20token(address _token) private {
        require(_token != address(0));
        addressStorage[keccak256("erc20token")] = _token;
    }
}
