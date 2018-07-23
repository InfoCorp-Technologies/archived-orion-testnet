pragma solidity ^0.4.23;

import "github.com/openzeppelin/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import './LCToken.sol';

contract SentinelExchange is Ownable {
    
    uint currentId;
    address public oracle = 0x6415CB729a27e9b69891dadaFcbBCae21e5B6F9C;
    
    mapping(string => address) currencyMap;
    mapping(bytes32 => bool) exchangeMap;
    
    event Currency(string indexed name, address indexed addr);
    event Exchange(bytes32 exchangeId, address sender, string indexed sellCurrency, uint indexed value, string indexed getCurrency);
    event Success(bytes32 indexed exchangeId, uint indexed value);
    event Fail(bytes32 indexed exchangeId);
    
    modifier isCurrency(string _currency) {
        require(currencyMap[_currency] != 0);
        _;
    }
    
    function exchangeSeni(string _currency) payable 
        external isCurrency(_currency) 
    {
        bytes32 idHash = keccak256(currentId);
        exchangeMap[idHash] = true;
        currentId++;
        emit Exchange(idHash, msg.sender, "SENI", msg.value, _currency);
    }
    
    function exchangeLct(string _currency, uint _value, address sender) 
        external isCurrency(_currency) 
    {
        require(msg.sender == currencyMap[_currency]);
        bytes32 idHash = keccak256(currentId);
        exchangeMap[idHash] = true;
        currentId++;
        emit Exchange(idHash, sender, _currency, _value, "SENI");
    }
    
    function callbackLct(
        bytes32 _exchangeId, 
        address _sender, 
        string _currency, 
        uint _value) 
        external isCurrency(_currency)
    {
        require(exchangeMap[_exchangeId]);
        require(msg.sender == oracle);
        exchangeMap[_exchangeId] = false;
        LCToken(currencyMap[_currency]).mint(_sender, _value);
        emit Success(_exchangeId, _value);
    }
    
    function callbackSeni(
        bytes32 _exchangeId, 
        address _sender, 
        uint _seni, 
        string _currency, 
        uint _lct) 
        external isCurrency(_currency)
    {
        require(exchangeMap[_exchangeId]);
        require(msg.sender == oracle);
        exchangeMap[_exchangeId] = false;
        if (_sender.balance > _seni) {
            _sender.transfer(_seni);
            LCToken(currencyMap[_currency]).burn(_lct);
            emit Success(_exchangeId, _seni);
        } else {
            LCToken(currencyMap[_currency]).transfer(_sender, _lct);
            emit Fail(_exchangeId);
        }
    }
    
    function currency(string _name) external view returns(address) {
        return currencyMap[_name];
    }
    
    function setCurrency(LCToken _currency) external onlyOwner {
        currencyMap[_currency.symbol()] = _currency;
        emit Currency(_currency.symbol(), _currency);
    }
    
    function removeCurrency(string _name) external onlyOwner {
        LCToken(currencyMap[_name]).transferOwnership(msg.sender);
        currencyMap[_name] = 0;
        emit Currency(_name, currencyMap[_name]);
    }
    
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }
}