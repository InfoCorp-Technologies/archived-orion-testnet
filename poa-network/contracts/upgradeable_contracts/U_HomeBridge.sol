pragma solidity ^0.4.23;
import "./U_BasicBridge.sol";
import "../libraries/SafeMath.sol";
import "../libraries/Message.sol";
import "../upgradeability/EternalStorage.sol";
import "../zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../IBurnableMintableERC677Token.sol";

contract HomeBridge is EternalStorage, BasicBridge {
    
    using SafeMath for uint256;
    event GasConsumptionLimitsUpdated(uint256 gas);
    event Deposit (address recipient, uint256 value);
    event Withdraw (address recipient, uint256 value, bytes32 transactionHash);
    event DailyLimit(uint256 newLimit);

    function initialize (
        address _validatorContract,
        address _erc20token,
        uint256 _homeDailyLimit,
        uint256 _maxPerTx,
        uint256 _minPerTx,
        uint256 _homeGasPrice,
        uint256 _requiredBlockConfirmations) 
        public returns(bool)
    {
        require(!isInitialized());
        require(isContract(_erc20token));
        require(isContract(_validatorContract));
        require(_homeGasPrice > 0);
        require(_requiredBlockConfirmations > 0);
        require(_minPerTx > 0 && _maxPerTx > _minPerTx && _homeDailyLimit > _maxPerTx);
        addressStorage[keccak256("validatorContract")] = _validatorContract;
        addressStorage[keccak256("erc677token")] = _erc20token;
        uintStorage[keccak256("deployedAtBlock")] = block.number;
        uintStorage[keccak256("homeDailyLimit")] = _homeDailyLimit;
        uintStorage[keccak256("maxPerTx")] = _maxPerTx;
        uintStorage[keccak256("minPerTx")] = _minPerTx;
        uintStorage[keccak256("gasPrice")] = _homeGasPrice;
        uintStorage[keccak256("requiredBlockConfirmations")] = _requiredBlockConfirmations;
        setInitialize(true);
        return isInitialized();
    }
    
    function isContract(address token) private view returns(bool) {
        uint size;
        assembly { size := extcodesize(token) }
        return size > 0;
    }

    function deposit (uint value) public {
        require(value > 0);
        require(withinLimit(value));
        setTotalSpentPerDay(getCurrentDay(), totalSpentPerDay(getCurrentDay()).add(value));
        erc20token().transferFrom(msg.sender, this, value);
        emit Deposit(msg.sender, value);
    }

    function gasLimitWithdrawRelay() public view returns(uint256) {
        return uintStorage[keccak256("gasLimitWithdrawRelay")];
    }

    function deployedAtBlock() public view returns(uint256) {
        return uintStorage[keccak256("deployedAtBlock")];
    }

    function homeDailyLimit() public view returns(uint256) {
        return uintStorage[keccak256("homeDailyLimit")];
    }

    function totalSpentPerDay(uint256 _day) public view returns(uint256) {
        return uintStorage[keccak256("totalSpentPerDay", _day)];
    }

    function withdraws(bytes32 _withdraw) public view returns(bool) {
        return boolStorage[keccak256("withdraws", _withdraw)];
    }

    function setGasLimitWithdrawRelay(uint256 _gas) external onlyOwner {
        uintStorage[keccak256("gasLimitWithdrawRelay")] = _gas;
        emit GasConsumptionLimitsUpdated(_gas);
    }
    
    function erc20token() public view returns(ERC20) {
        return ERC20(addressStorage[keccak256("erc677token")]);
    }

    function withdraw(uint8[] vs, bytes32[] rs, bytes32[] ss, bytes message) external {
        Message.hasEnoughValidSignatures(message, vs, rs, ss, validatorContract());
        address recipient;
        uint256 amount;
        bytes32 txHash;
        (recipient, amount, txHash) = Message.parseMessage(message);
        require(!withdraws(txHash));
        setWithdraws(txHash, true);
        erc20token().transfer(recipient, amount);
        emit Withdraw(recipient, amount, txHash);
    }

    function setHomeDailyLimit(uint256 _homeDailyLimit) external onlyOwner {
        uintStorage[keccak256("homeDailyLimit")] = _homeDailyLimit;
        emit DailyLimit(_homeDailyLimit);
    }

    function setMaxPerTx(uint256 _maxPerTx) external onlyOwner {
        require(_maxPerTx < homeDailyLimit());
        uintStorage[keccak256("maxPerTx")] = _maxPerTx;
    }

    function setMinPerTx(uint256 _minPerTx) external onlyOwner {
        require(_minPerTx < homeDailyLimit() && _minPerTx < maxPerTx());
        uintStorage[keccak256("minPerTx")] = _minPerTx;
    }

    function minPerTx() public view returns(uint256) {
        return uintStorage[keccak256("minPerTx")];
    }

    function getCurrentDay() public view returns(uint256) {
        return now / 1 days;
    }

    function maxPerTx() public view returns(uint256) {
        return uintStorage[keccak256("maxPerTx")];
    }

    function withinLimit(uint256 _amount) public view returns(bool) {
        uint256 nextLimit = totalSpentPerDay(getCurrentDay()).add(_amount);
        return homeDailyLimit() >= nextLimit && _amount <= maxPerTx() && _amount >= minPerTx();
    }

    function isInitialized() public view returns(bool) {
        return boolStorage[keccak256("isInitialized")];
    }

    function setTotalSpentPerDay(uint256 _day, uint256 _value) private {
        uintStorage[keccak256("totalSpentPerDay", _day)] = _value;
    }

    function setWithdraws(bytes32 _withdraw, bool _status) private {
        boolStorage[keccak256("withdraws", _withdraw)] = _status;
    }

    function setInitialize(bool _status) private {
        boolStorage[keccak256("isInitialized")] = _status;
    }
}
