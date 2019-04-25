pragma solidity 0.4.24;

import "../shared/ERC677/ERC677Receiver.sol";
import "../shared/ERC677/ERC677.sol";
import "../shared/Operatable.sol";


contract TollBox is Operatable, ERC677Receiver {

    ERC677 public token;
    address public homeContract;
    uint8 public dailyLimitRate;
    mapping(uint256 => bool) public dailyWhitdraw;
    mapping(address => bool) public creditors;

    event LogAddedCreditor(address indexed creditor);
    event LogRemovedCreditor(address indexed creditor);
    event LogWithdraw(address indexed creditor, uint256 amount);
    event LogDailyLimitRateChanged(uint8 rate);
    event LogUnlockedSenc(address indexed creditor, uint256 amount);

    modifier onlyCreditor() {
        require(_isCreditor(msg.sender));
        _;
    }

    constructor(uint8 _rate, ERC677 _token, address _homeContract) public {
        require(_rate > 0);
        require(_token != address(0));
        require(_homeContract != address(0));
        dailyLimitRate = _rate;
        token = _token;
        homeContract = _homeContract;
    }

    // Convert SENI to SENC without pay toll
    function onTokenTransfer(address _from, uint256 _value, bytes /*_data*/)
        external
        onlyCreditor
        returns(bool)
    {
        require(msg.sender == address(token));
        require(
            token.transferAndCall(homeContract, _value, _toBytes(_from))
        );
        emit LogUnlockedSenc(_from, _value);
        return true;
    }

    function addCreditor(address _creditor) external onlyOperator {
        require(_creditor != address(0));
        require(!_isCreditor(_creditor));
        creditors[_creditor] = true;
        emit LogAddedCreditor(_creditor);
    }

    function removeCreditor(address _creditor) external onlyOperator {
        require(_creditor != address(0));
        require(_isCreditor(_creditor));
        creditors[_creditor] = false;
        emit LogRemovedCreditor(_creditor);
    }

    function withdraw(uint256 _amount) external onlyCreditor {
        require(_amount > 0);
        require(_canWithdraw(_amount));
        dailyWhitdraw[_currentDay()] = true;
        token.transfer(msg.sender, _amount);
        emit LogWithdraw(msg.sender, _amount);
    }

    function setDailyLimitRate(uint8 _rate) external onlyOperator {
        dailyLimitRate = _rate;
        emit LogDailyLimitRateChanged(_rate);
    }

    function _currentDay() internal view returns(uint256) {
        return now / 1 days;
    }

    function _isCreditor(address _creditor) internal view returns(bool) {
        return creditors[_creditor];
    }

    function _canWithdraw(uint256 _amount) internal view returns(bool) {
        uint256 currentBalance = token.balanceOf(address(this));
        uint256 enabledAmount = dailyLimitRate * currentBalance / 100;
        return !dailyWhitdraw[_currentDay()] && _amount <= enabledAmount;
    }

    function _toBytes(address _a) internal pure returns (bytes memory b) {
        assembly {
            let m := mload(0x40)
            _a := and(_a, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
            mstore(add(m, 20), xor(0x140000000000000000000000000000000000000000, _a))
            mstore(0x40, add(m, 52))
            b := m
        }
    }

}