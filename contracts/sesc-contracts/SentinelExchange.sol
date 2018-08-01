pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import './LCToken.sol';
import './Whitelist.sol';

contract SentinelExchange is Ownable {
    
    struct ExchangeInfo {
        bool isWaiting;
        address sender;
        uint value;
        string sellCurrency;
        string getCurrency;
    }
    
    uint currentId;
    Whitelist public whitelist;
    address public oracle = 0x6415CB729a27e9b69891dadaFcbBCae21e5B6F9C;
    
    mapping(string => address) currencyMap;
    mapping(bytes32 => ExchangeInfo) public exchangeMap;
    
    event Currency(string name, address indexed addr);
    event Exchange(bytes32 exchangeId, uint value, string sellCurrency, string getCurrency);
    event Success(bytes32 indexed exchangeId, uint indexed value);
    event Fail(bytes32 indexed exchangeId, uint indexed value);
    
    modifier isCurrency(string _currency) {
        require(currencyMap[_currency] != 0);
        _;
    }
    
    constructor(Whitelist _whitelist) public {
        whitelist = _whitelist;
    }
    
    function startExchange(
        address sender, 
        uint value, 
        string sellCurrency, 
        string getCurrency) internal 
    {
        require(value > 0);
        bytes32 idHash = keccak256(currentId);
        exchangeMap[idHash].isWaiting = true;
        exchangeMap[idHash].sender = sender;
        exchangeMap[idHash].value = value;
        exchangeMap[idHash].sellCurrency = sellCurrency;
        exchangeMap[idHash].getCurrency = getCurrency;
        currentId++;
        emit Exchange(idHash, value, sellCurrency, getCurrency);
    }
    
    function exchangeSeni(string _currency) payable external isCurrency(_currency) {
        require(whitelist.isWhitelist(msg.sender));
        startExchange(msg.sender, msg.value, "SENI", _currency);
    }
    
    function exchangeLct(string _currency, address _sender, uint _value) 
        external isCurrency(_currency) 
    {
        require(msg.sender == currencyMap[_currency]);
        startExchange(_sender, _value, _currency, "SENI");
    }
    
    function callback(bytes32 _exchangeId, uint _value) external {
        ExchangeInfo memory info = exchangeMap[_exchangeId];
        require(info.isWaiting);
        require(msg.sender == oracle);
        exchangeMap[_exchangeId].isWaiting = false;
        if (keccak256(info.getCurrency) != keccak256("SENI")) {
            LCToken(currencyMap[info.getCurrency]).mint(info.sender, _value);
            emit Success(_exchangeId, _value);
        } else {
            if (address(this).balance >= _value) {
                info.sender.transfer(_value);
                LCToken(currencyMap[info.sellCurrency]).burn(info.value);
                emit Success(_exchangeId, _value);
            } else {
                LCToken(currencyMap[info.sellCurrency]).transferFromOwner(info.sender, info.value);
                emit Fail(_exchangeId, _value);
            }
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
