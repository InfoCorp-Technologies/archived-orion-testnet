pragma solidity 0.4.24;

import "../shared/ERC677/IBurnableMintableERC677Token.sol";
import "../shared/ERC677/ERC677Receiver.sol";
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
    uint256 public vesting;
    uint256 public expiration;
    uint256 public unlockVesting;
    uint256 public expirationDate;

    enum State { Created, Initialized, Active, Finalized }
    State public state;

    event Initialized(uint256 value);
    event Actived(address indexed buyer, address indexed escrow);
    event Withdraw(uint256 value);
    event Finalized(address indexed buyer, address indexed escrow);

    modifier inState(State _state) {
        require(state == _state, "Invalid state.");
        _;
    }

    constructor(
        uint256 _value,
        uint256 _vesting,
        uint256 _expiration,
        address _buyer,
        address _exchange,
        address _token
    ) public {
        value = _value;
        vesting = _vesting;
        expiration = _expiration;
        buyer = _buyer;
        exchange = _exchange;
        token = _token;
        state = State.Created;
    }

    function initialize(uint256 _rate) external inState(State.Created) {
        require(msg.sender == Exchange(exchange).oracle(), "Only Oracle can initialize escrow.");
        require(_rate != 0, "Rate is required.");
        rate = _rate;
        expirationDate = now + expiration;
        state = State.Initialized;
        emit Initialized(convertToSeni(value));
    }

    function () public payable inState(State.Initialized) {
        require(msg.sender == buyer, "Only buyer can send SENI to contract.");
        require(msg.value == convertToSeni(value), "The amount of SENI is incorrect.");
        require(now <= expirationDate, "Escrow expired.");
        unlockVesting = now + vesting;
        state = State.Active;
        require(Exchange(exchange).escrowActived(buyer, value, token), "Token minting is required.");
        emit Actived(buyer, address(this));
    }

    function onTokenTransfer(address _from, uint256 _value, bytes /*_data*/)
        external
        inState(State.Active)
        returns(bool)
    {
        uint256 seniValue = convertToSeni(_value);
        require(address(this).balance >= seniValue, "Insuficient funds.");
        require(msg.sender == token, "Only LCT contract can execute withdraws.");
        require(_from == buyer, "Only Buyer can execute witdraw function");
        require(now >= unlockVesting, "Withdraw denied, vesting period.");

        IBurnableMintableERC677Token(token).burn(_value);
        buyer.transfer(seniValue);
        if (address(this).balance == 0) {
            state = State.Finalized;
            emit Finalized(buyer, address(this));
        }

        emit Withdraw(seniValue);
    }

    function convertToSeni(uint256 _value) public view returns(uint256) {
        return _value * 10 ** 18 / rate;
    }
}