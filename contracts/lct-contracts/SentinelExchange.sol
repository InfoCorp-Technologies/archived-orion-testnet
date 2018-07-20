pragma solidity ^0.4.23;

import "github.com/openzeppelin/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import './LCToken.sol';

contract SentinelExchange is Ownable {
    
    address public oracle = 0x876BaDa62006F4d3b4063fd97618D666575efb07;
    mapping(string => address) currencyMap;
    
    event Currency(string indexed name, address indexed addr);
    event Exchange(string indexed sellCurrency, uint indexed value, string indexed getCurrency);
    event Result(bytes32 indexed txid, uint value);
    
    modifier isCurrency(string _currency) {
        require(currencyMap[_currency] != 0);
        _;
    }
    
    function exchangeSeni(string _currency) payable external isCurrency(_currency) {
        emit Exchange("SENI", msg.value, _currency);
    }
    
    function exchangeLct(string _currency, uint _value) external isCurrency(_currency) {
        LCToken(currencyMap[_currency]).transferFrom(msg.sender, this, _value);
        emit Exchange(_currency, _value, "SENI");
    }
    
    function callbackLct(bytes32 _txid, address _user, string _currency, uint _value) 
        external isCurrency(_currency)
    {
        require(msg.sender == oracle);
        LCToken(currencyMap[_currency]).mint(_user, _value);
        emit Result(_txid, _value);
    }
    
    function callbackSeni(bytes32 _txid, address _user, uint _value, string _currency) 
        external isCurrency(_currency)
    {
        require(msg.sender == oracle);
        _user.transfer(_value);
        LCToken(currencyMap[_currency]).burn(_value);
        emit Result(_txid, _value);
    }
    
    function currency(string _name) external view returns(address) {
        return currencyMap[_name];
    }
    
    function setCurrency(LCToken _currency) external onlyOwner {
        currencyMap[_currency.symbol()] = _currency;
    }
    
    function removeCurrency(string _name) external onlyOwner {
        LCToken(currencyMap[_name]).transferOwnership(msg.sender);
        currencyMap[_name] = 0;
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}