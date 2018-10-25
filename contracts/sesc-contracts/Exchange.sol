pragma solidity ^0.4.23;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LCToken.sol";
import "./Escrow.sol";
// TODO: Check this whitelisting:
//import "./Whitelist.sol";

/**
  * @title Exchange Contract.
  */
contract Exchange is Ownable {

    address public oracle;
    uint256 public vesting;
//    Whitelist public whitelist;

    struct User {
        Escrow[] escrow;
    }

    mapping(bytes => LCToken) currencyMap;
    mapping(address => address) userByEscrow;
    mapping(address => User) escrowByUser;

    event CurrencyAdded(string name, address indexed addr);
    event CurrencyRemoved(string name, address indexed addr);
    event NewEscrow(address indexed buyer, address indexed escrow, uint256 value, string symbol);
    event EscrowActived(address indexed buyer, address indexed escrow);

    modifier isCurrency(string _currency) {
        require(currency(_currency) != address(0), "The currency is not added to the exchange");
        _;
    }

//    constructor(address _owner, address _oracle, Whitelist _whitelist) public {
//        require(_owner != address(0), "Owner address is required");
//        require(_oracle != address(0), "Oracle address is required");
//        owner = _owner;
//        oracle = _oracle;
//        whitelist = _whitelist;
//    }

    constructor(address _owner, address _oracle, uint256 _vesting) public {
        require(_owner != address(0), "Owner address is required");
        require(_oracle != address(0), "Oracle address is required");
        owner = _owner;
        oracle = _oracle;
        vesting = _vesting;
    }

    function exchange(uint256 _value, string _symbol)
        external
        isCurrency(_symbol)
    {
//        require(whitelist.isWhitelist(msg.sender), "Sender must be whitelisted");
        require(_value != 0, "Value is required");

        Escrow escrow = new Escrow(
            _value,
            vesting,
            msg.sender,
            address(this),
            currency(_symbol)
        );
        userByEscrow[address(escrow)] = msg.sender;
        escrowByUser[msg.sender].escrow.push(escrow);

        emit NewEscrow(msg.sender, address(escrow), _value, _symbol);
    }

    function escrowActived(address _recipient, uint256 _value, address _token)
        external
        returns(bool)
    {
        require(
            userByEscrow[msg.sender] != address(0),
            "Escrow must be created by exchange, and it has to have an associated user."
        );
        IBurnableMintableERC677Token(_token).mint(_recipient, _value);
        emit EscrowActived(_recipient, msg.sender);
        return true;
    }

    /**
     * @dev This function removes an existing currency from mapping
     * and transfer ownership to the owner account.
     * @param _symbol The symbol of the LCToken currency to be removed.
     */
    function removeCurrency(string _symbol)
        external
        onlyOwner
        isCurrency(_symbol)
    {
        LCToken token = currency(_symbol);
        token.transferOwnership(owner);
        setCurrency(_symbol, LCToken(0));
        emit CurrencyRemoved(_symbol, token);
    }

    /**
     * @dev This function adds a new currency to the mapping.
     * @param _currency The address of the LCToken currency.
     */
    function addCurrency(LCToken _currency) external onlyOwner {
        string memory symbol = _currency.symbol();
        require(_currency.owner() == address(this), "The owner of the currency must be the Exchange");
        require(currency(symbol) == address(0), "This currency is already set");
        setCurrency(symbol, _currency);
        emit CurrencyAdded(symbol, _currency);
    }

    /**
     * @dev This function retrieves the address of an registered currency
     * @param _symbol The symbol of the currency
     * @return The address of the currency
     */
    function currency(string _symbol) public view returns(LCToken) {
        return currencyMap[bytes(_symbol)];
    }

    /**
     * @dev This function set the the currency to the mapping
     * @param _symbol The symbol of the currency
     * @param _currency The currency contract
     */
    function setCurrency(string _symbol, LCToken _currency) internal {
        currencyMap[bytes(_symbol)] = _currency;
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
     * @dev The vesting variable setter
     * @param _vesting The address of the oracle
     */
    function setOracle(uint256 _vesting) external onlyOwner {
        vesting = _vesting;
    }

//    /**
//     * @dev The whitelist variable setter
//     * @param _whitelist The address of the whitelist
//     */
//    function setWhitelist(Whitelist _whitelist) external onlyOwner {
//        require(_whitelist != address(0), "Whitelist is required");
//        whitelist = _whitelist;
//    }
}