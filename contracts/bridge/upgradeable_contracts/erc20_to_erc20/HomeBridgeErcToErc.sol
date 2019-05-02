pragma solidity 0.4.24;

import "../../libraries/SafeMath.sol";
import "../../libraries/Message.sol";
import "../BasicBridge.sol";
import "../../upgradeability/EternalStorage.sol";
import "../../../shared/ERC677/IBurnableMintableERC677Token.sol";
import "../../../shared/ERC677/ERC677Receiver.sol";
import "../BasicHomeBridge.sol";
import "../ERC677Bridge.sol";
import "../OverdrawManagement.sol";


contract HomeBridgeErcToErc is
    ERC677Receiver,
    EternalStorage,
    BasicBridge,
    BasicHomeBridge,
    ERC677Bridge,
    OverdrawManagement {

    event AmountLimitExceeded(
        address recipient,
        uint256 value,
        bytes32 transactionHash
    );

    function initialize (
        address _validatorContract,
        address _whitelistContract,
        address _tollAddress,
        uint256 _tollFee,
        uint256 _dailyLimit,
        uint256 _maxPerTx,
        uint256 _minPerTx,
        uint256 _homeGasPrice,
        uint256 _requiredBlockConfirmations,
        address _erc677token,
        uint256 _foreignDailyLimit,
        uint256 _foreignMaxPerTx,
        address _owner
    )
        public
        returns(bool)
    {
        require(!isInitialized());
        require(_validatorContract != address(0) && isContract(_validatorContract));
        require(_whitelistContract != address(0) && isContract(_whitelistContract));
        require(_tollAddress != address(0) && isContract(_tollAddress));
        require(_requiredBlockConfirmations > 0);
        require(_minPerTx > 0 && _maxPerTx > _minPerTx && _dailyLimit > _maxPerTx);
        require(_foreignMaxPerTx < _foreignDailyLimit);
        require(_owner != address(0));
        addressStorage[keccak256(abi.encodePacked("validatorContract"))] = _validatorContract;
        addressStorage[keccak256(abi.encodePacked("whitelistContract"))] = _whitelistContract;
        addressStorage[keccak256(abi.encodePacked("tollAddress"))] = _tollAddress;
        uintStorage[keccak256(abi.encodePacked("tollFee"))] = _tollFee;
        uintStorage[keccak256(abi.encodePacked("deployedAtBlock"))] = block.number;
        uintStorage[keccak256(abi.encodePacked("dailyLimit"))] = _dailyLimit;
        uintStorage[keccak256(abi.encodePacked("maxPerTx"))] = _maxPerTx;
        uintStorage[keccak256(abi.encodePacked("minPerTx"))] = _minPerTx;
        uintStorage[keccak256(abi.encodePacked("gasPrice"))] = _homeGasPrice;
        uintStorage[keccak256(abi.encodePacked("requiredBlockConfirmations"))] = _requiredBlockConfirmations;
        uintStorage[keccak256(abi.encodePacked("executionDailyLimit"))] = _foreignDailyLimit;
        uintStorage[keccak256(abi.encodePacked("executionMaxPerTx"))] = _foreignMaxPerTx;
        setOwner(_owner);
        setInitialize(true);
        setErc677token(_erc677token);

        return isInitialized();
    }

    function onExecuteAffirmation(address _recipient, uint256 _value)
        internal
        returns(bool)
    {
        if (_value > tollFee() && _isWhitelisted(_recipient)) {
            uint256 valueToTransfer = _value - tollFee();
            setTotalExecutedPerDay(
                getCurrentDay(),
                totalExecutedPerDay(getCurrentDay()).add(_value)
            );
            erc677token().mint(tollAddress(), tollFee());
            return erc677token().mint(_recipient, valueToTransfer);
        } else {
            return erc677token().mint(tollAddress(), _value);
        }
    }

    function fireEventOnTokenTransfer(address _from, uint256 _value) internal {
        emit UserRequestForSignature(_from, _value);
    }

    function onFailedAffirmation(
        address _recipient,
        uint256 _value,
        bytes32 _txHash
    ) internal {
        address recipient;
        uint256 value;
        (recipient, value) = txAboveLimits(_txHash);
        require(recipient == address(0) && value == 0);
        setOutOfLimitAmount(outOfLimitAmount().add(_value));
        setTxAboveLimits(_recipient, _value, _txHash);
        emit AmountLimitExceeded(_recipient, _value, _txHash);
    }

    function affirmationWithinLimits(uint256 _amount)
        internal
        view
        returns(bool)
    {
        return withinExecutionLimit(_amount);
    }
}
