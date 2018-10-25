pragma solidity ^0.4.23;

import "./ERC677/IBurnableMintableERC677Token.sol";
import "./ERC677/ERC677Receiver.sol";
import "./Exchange.sol";

/**
  * @title Escrow Contract.
  */
contract Escrow is ERC677Receiver {

    address public buyer;
    address public exchange;
    address public token;
    uint256 public value;
    uint256 public rate;
    uint256 public unlockDate;

    enum State { Created, Initialized, Active, Finalized }
    State public state;

    // value is in SENI
    event Withdraw(uint256 value);
    // value is in SENI
    event Initialized(uint256 value);

    modifier inState(State _state) {
        require(state == _state, "Invalid state.");
        _;
    }

    constructor(
        uint256 _value,
        uint256 _vesting,
        address _buyer,
        address _exchange,
        address _token
    ) public {
        value = _value;
        buyer = _buyer;
        exchange = _exchange;
        token = _token;
        unlockDate = now + _vesting;
        state = State.Created;
    }

    function initialize(uint256 _rate) external inState(State.Created) {
        require(msg.sender == Exchange(exchange).oracle(), "Only Oracle can initialize escrow.");
        require(_rate != 0, "Rate is required");
        rate = _rate;
        state = State.Initialized;
        emit Initialized(convertToSeni(value));
    }

    function () public payable inState(State.Initialized) {
        require(msg.sender == buyer, "Only buyer can send SENI to contract.");
        require(msg.value == convertToSeni(value), "The amount of SENI is incorrect");
        state = State.Active;
        require(Exchange(exchange).escrowActived(buyer, value, token), "Token minting is required");
    }

    function onTokenTransfer(address _from, uint256 _value, bytes /*_data*/)
        external
        inState(State.Active)
        returns(bool)
    {
        require(msg.sender == token, "Only LCT contract can execute withdraws.");
        require(_from == buyer, "Only Buyer can execute witdraw function");
        require(address(this).balance >= convertToSeni(_value), "Insuficient funds.");
        require(now >= unlockDate, "Withdraw denied, vesting period.");

        IBurnableMintableERC677Token(token).burn(_value);
        buyer.transfer(convertToSeni(_value));
        if (address(this).balance == 0) {
            state = State.Finalized;
        }

        emit Withdraw(_value);
    }

    function convertToSeni(uint256 _value) public view returns(uint256) {
        return _value * 10 ** 18 / rate;
    }
}