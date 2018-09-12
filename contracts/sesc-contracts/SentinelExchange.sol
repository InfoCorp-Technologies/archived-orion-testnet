pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "./LCToken.sol";
import "./Whitelist.sol";

/**
  * @title Sentinel Exchange Contract.
  */
contract SentinelExchange is Ownable {

    struct ExchangeInfo {
        bool isWaiting;
        address sender;
        uint value;
        string sellCurrency;
        string getCurrency;
    }

    uint public currentId;
    address public oracle;
    Whitelist public whitelist;

    mapping(bytes => LCToken) currencyMap;
    mapping(uint => ExchangeInfo) public exchangeMap;

    event CurrencyAdded(string name, address indexed addr);
    event CurrencyRemoved(string name, address indexed addr);
    event Exchange(uint exchangeId, uint value, string sellCurrency, string getCurrency);
    event Success(uint indexed exchangeId, uint indexed value);
    event Fail(uint indexed exchangeId, uint indexed value);

    modifier isCurrency(string _currency) {
        require(currencyMap[bytes(_currency)] != address(0), "Currency address must be different from 0x0");
        _;
    }

    constructor(address _owner, address _oracle, Whitelist _whitelist) public {
        require(_owner != address(0), "Owner address is required");
        require(_oracle != address(0), "Owner address is required");
        owner = _owner;
        oracle = _oracle;
        whitelist = _whitelist;
    }

    function startExchange(
        address sender,
        uint value,
        string sellCurrency,
        string getCurrency
    ) internal {
        require(value > 0, "Value not be zero");
        currentId++;
        exchangeMap[currentId].isWaiting = true;
        exchangeMap[currentId].sender = sender;
        exchangeMap[currentId].value = value;
        exchangeMap[currentId].sellCurrency = sellCurrency;
        exchangeMap[currentId].getCurrency = getCurrency;
        emit Exchange(currentId, value, sellCurrency, getCurrency);
    }

    /**
     * @dev This function start an exchange of SENI by LCToken
     * @param _currency specify the symbol of the LCToken
     */
    function exchangeSeni(string _currency) external payable isCurrency(_currency) {
        require(whitelist.isWhitelist(msg.sender), "Sender must be whitelisted");
        startExchange(msg.sender, msg.value, "SENI", _currency);
    }

    /**
     * @dev This function start an exchange of LCToken by SENI
     * @param _sender The seller's address
     * @param _value The amount that will be exchanged
     * @param _currency Specify the symbol of the LCToken to be exchanged
     */
    function exchangeLct(address _sender, uint _value, string _currency)
        external isCurrency(_currency)
    {
        address currency = currencyMap[bytes(_currency)];
        require(msg.sender == currency, "Sender mus be the currency address");
        startExchange(_sender, _value, _currency, "SENI");
    }

    /**
     * @dev This function is only executed by the oracle and ends the exchange process
     * @param _exchangeId The id of the exchange to be finalized
     * @param _value The amount that will be transferred
     */
    function callback(uint _exchangeId, uint _value) external {
        ExchangeInfo memory info = exchangeMap[_exchangeId];
        require(info.isWaiting, "Exchange must be waiting");
        require(msg.sender == oracle, "Sender must be the oracle address");
        exchangeMap[_exchangeId].isWaiting = false;
        LCToken token;
        if (keccak256(info.getCurrency) == keccak256("SENI")) {
            token = currencyMap[bytes(info.sellCurrency)];
            if (address(this).balance >= _value) {
                info.sender.transfer(_value);
                token.burn(info.value);
                emit Success(_exchangeId, _value);
            } else {
                token.transferFromOwner(info.sender, info.value);
                emit Fail(_exchangeId, _value);
            }
        } else {
            token = currencyMap[bytes(info.getCurrency)];
            token.mint(info.sender, _value);
            emit Success(_exchangeId, _value);
        }
    }

    /**
     * @notice The `claimTokens()` should only be called if a security issue is found.
     * @param _token to transfer, use 0x0 for ether.
     * @param _to the recipient that receives the tokens/ethers.
     */
    function claimTokens(address _token, address _to) external onlyOwner {
        require(_to != address(0), "To address must be different from 0x0");
        if (_token == address(0)) {
            _to.transfer(address(this).balance);
            return;
        }
        ERC20Basic token = ERC20Basic(_token);
        uint balance = token.balanceOf(this);
        require(token.transfer(_to, balance), "Transfer should be successfully");
    }

    /**
     * @dev This function retrieves the address of an registered currency
     * @param _name The symbol of the currency
     * @return The address of the currency
     */
    function currency(string _name) external view returns(address) {
        return currencyMap[bytes(_name)];
    }

    /**
     * @dev This function adds a new currency to the mapping
     * @param _currency The address of the LCToken currency
     */
    function setCurrency(LCToken _currency) external onlyOwner {
        bytes memory name = bytes(_currency.symbol());
        require(_currency.owner() == address(this), "The currency must have this Sentinel Exchange contract as owner");
        require(currencyMap[name] == address(0), "This currency is already set");
        currencyMap[name] = _currency;
        emit CurrencyAdded(_currency.symbol(), _currency);
    }

    /**
     * @dev This function removes an existing currency from mapping
     * @param _name The simbol name of the LCToken currency
     */
    function removeCurrency(string _name) external onlyOwner {
        bytes memory name = bytes(_name);
        LCToken token = currencyMap[name];
        require(token != address(0), "This currency hasn't been set");
        token.transferOwnership(msg.sender);
        currencyMap[name] = LCToken(0);
        emit CurrencyRemoved(_name, token);
    }

    /**
     * @dev The oracle variable setter
     * @param _oracle The address of the oracle
     */
    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    /**
     * @dev The whitelist variable setter
     * @param _whitelist The address of the whitelist
     */
    function setWhitelist(Whitelist _whitelist) external onlyOwner {
        whitelist = _whitelist;
    }
}
