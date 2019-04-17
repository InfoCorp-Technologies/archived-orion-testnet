pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./LCToken.sol";
import "./Escrow.sol";


/**
  * @title Exchange Contract.
  */
contract Exchange is Ownable {

    address public oracle;
    uint256 public vesting;
    uint256 public expiration;

    struct User {
        Escrow[] escrow;
    }

    mapping(bytes => LCToken) currencyMap;
    mapping(address => address) userByEscrow;
    mapping(address => User) escrowByUser;

    event CurrencyAdded(string name, address indexed addr);
    event CurrencyRemoved(string name, address indexed addr);
    event NewEscrow(address indexed buyer, address indexed escrow, uint256 value, string symbol);

    modifier isCurrency(string _currency) {
        require(currency(_currency) != address(0), "The currency is not added to the exchange");
        _;
    }

    constructor(address _owner, address _oracle, uint256 _vesting, uint256 _expiration) public {
        require(_owner != address(0), "Owner address is required");
        require(_oracle != address(0), "Oracle address is required");
        owner = _owner;
        oracle = _oracle;
        vesting = _vesting;
        expiration = _expiration;
    }

    /**
     * @dev This function is executed by the Buyer and a new Escrow is created as a result.
     * @param _value Amount of LCT required by the Buyer.
     * @param _symbol LCT Token symbol.
     */
    function exchange(uint256 _value, string _symbol)
        external
        isCurrency(_symbol)
    {
        require(_value != 0, "Value is required");
        Escrow escrow = new Escrow(
            _value,
            vesting,
            expiration,
            msg.sender,
            address(this),
            currency(_symbol)
        );
        userByEscrow[address(escrow)] = msg.sender;
        escrowByUser[msg.sender].escrow.push(escrow);
        emit NewEscrow(msg.sender, address(escrow), _value, _symbol);
    }

    /**
     * @dev This function its executed by the Escrow when the Buyer made the deposit of SENI.
     * @param _recipient The address of the Buyer.
     * @param _value Amount of LCT to be minted.
     * @param _token LCT Token address.
     * @return true if there are no reverts.
     */
    function escrowActived(address _recipient, uint256 _value, address _token)
        external
        returns(bool)
    {
        require(
            userByEscrow[msg.sender] != address(0),
            "Escrow must be created by exchange, and it has to have an associated user."
        );
        IBurnableMintableERC677Token(_token).mint(_recipient, _value);
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
     * @dev This function retrieve the number of escrows by user address,
     * used for array iteration in dapps.
     * @param _user Buyer address.
     * @return Number of escrow creted by user.
     */
    function escrowCountByUser(address _user) public view returns(uint256) {
        return escrowByUser[_user].escrow.length;
    }

    /**
     * @dev This function retrieves the address of an registered currency.
     * @param _symbol The symbol of the currency.
     * @return The address of the currency.
     */
    function currency(string _symbol) public view returns(LCToken) {
        return currencyMap[bytes(_symbol)];
    }

    /**
     * @dev This function set the the currency to the mapping.
     * @param _symbol The symbol of the currency.
     * @param _currency The currency contract.
     */
    function setCurrency(string _symbol, LCToken _currency) internal {
        currencyMap[bytes(_symbol)] = _currency;
    }

    /**
     * @dev The oracle variable setter.
     * @param _oracle The address of the oracle.
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Oracle address is required");
        oracle = _oracle;
    }

    /**
     * @dev The vesting variable setter.
     * @param _vesting The timestamp value for vesting.
     */
    function setVesting(uint256 _vesting) external onlyOwner {
        vesting = _vesting;
    }

    /**
     * @dev The expiration variable setter.
     * @param _expiration The timestamp value for expiration.
     */
    function setExpiration(uint256 _expiration) external onlyOwner {
        expiration = _expiration;
    }
}