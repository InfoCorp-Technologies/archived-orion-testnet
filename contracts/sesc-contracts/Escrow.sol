pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Exchange.sol";

/**
  * @title Escrow Contract.
  */
contract Escrow is Ownable {

    address public buyer;
    address public exchange;
    address public token;
    address public oracle;
    uint256 public value; // must be in wei
    uint256 public rate; // must be in wei

    enum State { Created, Initialized, Active, Finalized }
    State public state;

    event Withdraw(address indexed buyer, uint256 value);
    event Initialized(uint256 value);

    modifier inState(State _state) {
        require(state == _state, "Invalid state.");
        _;
    }

    modifier sufficientFunds(uint256 _value) {
        require(this.balance >= _value, "Insuficient funds.");
        _;
    }

    constructor(
        uint256 _value,
        address _buyer,
        address _exchange,
        address _token,
        address _oracle
    ) public {
        buyer = _buyer;
        value = _value;
        exchange = _exchange;
        token = _token;
        oracle = _oracle;
        state = State.Created;
    }

    function () public payable inState(State.Initialized) {
        require(msg.sender == buyer, "Only buyer can send SENI to contract.");
        require(msg.value == convertLct(value), "The amount of SENI is incorrect");
        state = State.Active;
        Exchange(exchange).escrowActived();
    }

    function initialize(uint256 _rate) external inState(State.Created) {
        require(msg.sender == oracle, "Only Oracle can initialize escrow.");
        require(_rate != 0, "Rate is required");
        rate = _rate;
        state = State.Initialized;
        emit Initialized(convertLct(value));
    }

    function withdraw(uint256 _value) public
        inState(State.Active)
        sufficientFunds(_value)
    {
        require(msg.sender == token, "Only LCT contract can execute withdraws.");
        buyer.transfer(_value);
        if (this.balance == 0) {
            state = State.Finalized;
        }
        emit Withdraw(owner, _value);
    }

    // TODO: remove this function (only for testing)
    // return: seni
    function convertLct(uint256 _value) public view returns(uint256) {
        return _value * 10 ** 18 / rate;
    }

    // TODO: remove this function (only for testing)
    // return: lct
    function convertSeni(uint256 _value) public view returns(uint256) {
        return _value * rate / 10 ** 18;
    }
}