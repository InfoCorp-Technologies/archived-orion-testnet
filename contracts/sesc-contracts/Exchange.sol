pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LCToken.sol";
import "./Escrow.sol";
import "./Whitelist.sol";

/**
  * @title Exchange Contract.
  */
contract Exchange is Ownable {

    address public oracle;
    Whitelist public whitelist;

    mapping(bytes => address) public currencyMap;
    mapping(address => address) public userByEscrow;

    event CurrencyAdded(string name, address indexed addr);
    event CurrencyRemoved(string name, address indexed addr);
    event NewEscrow(address indexed buyer, address indexed escrow, uint256 value, string symbol);

    modifier isCurrency(string _currency) {
        require(currency(_currency) != address(0), "The currency is not added to the exchange");
        _;
    }

    constructor(address _owner, address _oracle, address _whitelist) public {
        require(_owner != address(0), "Owner address is required");
        require(_oracle != address(0), "Oracle address is required");
        owner = _owner;
        oracle = _oracle;
        whitelist = _whitelist;
    }

    function createEscrow(uint256 _value, string _symbol)
        external
        isCurrency(_symbol)
    {
        require(whitelist.isWhitelist(msg.sender), "Sender must be whitelisted");
        require(_value != 0, "Value is required");
        Escrow escrow = new Escrow(
            _value,
            msg.sender,
            address(this),
            currency(_symbol),
            oracle
        );
        userByEscrow[address(escrow)] = msg.sender;
        emit NewEscrow(msg.sender, address(escrow), _value, _symbol);
    }

    function escrowActived() external {
        require(userByEscrow[msg.sender] != address(0), "Escrow must be created by exchange");
        // TODO: complete this method.
    }

    /**
     * @dev This function retrieves the address of an registered currency
     * @param _name The symbol of the currency
     * @return The address of the currency
     */
    function currency(string _name) public view returns(address) {
        return currencyMap[bytes(_name)];
    }

    /**
     * @dev This function removes an existing currency from mapping
     * and transfer ownership to the owner account.
     * @param _name The symbol of the LCToken currency to be removed.
     */
    function removeCurrency(string _symbol)
        external
        onlyOwner
        isCurrency(_symbol)
    {
        LCToken token = currency(_symbol);
        token.transferOwnership(owner);
        currencyMap[bytes(_symbol)] = address(0);
        emit CurrencyRemoved(_symbol, token);
    }

    /**
     * @dev This function adds a new currency to the mapping.
     * @param _currency The address of the LCToken currency.
     */
    function setCurrency(LCToken _currency) external onlyOwner {
        bytes memory symbol = _currency.symbol();
        require(_currency.owner() == address(this), "The owner of the currency must be the Exchange");
        require(currency(symbol) == address(0), "This currency is already set");
        currencyMap[bytes(symbol)] = _currency;
        emit CurrencyAdded(symbol, _currency);
    }

    /**
     * @dev The oracle variable setter
     * @param _oracle The address of the oracle
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Oracle address is required");
        oracle = _oracle;
    }

    /**
     * @dev The whitelist variable setter
     * @param _whitelist The address of the whitelist
     */
    function setWhitelist(address _whitelist) external onlyOwner {
        require(_whitelist != address(0), "Whitelist is required");
        whitelist = _whitelist;
    }
}
