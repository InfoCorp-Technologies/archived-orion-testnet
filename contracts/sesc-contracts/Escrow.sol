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
    address public oracle;
    uint256 public value; // must be in wei
    uint256 public rate; // must be in wei

    enum State { Created, Initialized, Active, Finalized }
    State public state;

    event Withdraw(uint256 value);
    event Initialized(uint256 value);

    modifier inState(State _state) {
        require(state == _state, "Invalid state.");
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

    function initialize(uint256 _rate) external inState(State.Created) {
        require(msg.sender == oracle, "Only Oracle can initialize escrow.");
        require(_rate != 0, "Rate is required");
        rate = _rate;
        state = State.Initialized;
        emit Initialized(convertLct(value));
    }

    function () public payable inState(State.Initialized) {
        require(msg.sender == buyer, "Only buyer can send SENI to contract.");
        require(msg.value == convertLct(value), "The amount of SENI is incorrect");
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
        require(address(this).balance >= convertLct(_value), "Insuficient funds.");

        IBurnableMintableERC677Token(token).burn(_value);
        buyer.transfer(convertLct(_value));
        if (address(this).balance == 0) {
            state = State.Finalized;
        }

        emit Withdraw(_value);
    }

    function convertLct(uint256 _value) public view returns(uint256) {
        return _value * 10 ** 18 / rate;
    }
}