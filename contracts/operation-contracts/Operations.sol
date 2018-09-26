pragma solidity ^0.4.23;

import "../validator-contracts/ImmediateSet.sol";

contract Operations {

    struct Release {
        uint32 forkBlock;
        uint8 track;
        uint24 semver;
        bool critical;
        mapping (bytes32 => bytes32) checksum;
    }

    struct Build {
        bytes32 release;
        bytes32 platform;
    }

    struct Client {
        mapping (bytes32 => Release) release;
        mapping (uint8 => bytes32) current;
        mapping (bytes32 => Build) build;
    }

    enum Status {
        Undecided,
        Accepted,
        Rejected
    }

    struct Fork {
        string name;
        bytes32 spec;
        bool hard;
        bool ratified;
        uint requiredCount;
        mapping (address => Status) status;
    }

    struct Transaction {
        uint requiredCount;
        mapping (address => Status) status;
        address to;
        bytes data;
        uint value;
        uint gas;
    }

    Validator public validator;
    uint32 public latestFork;
    uint32 public proposedFork;

    mapping (uint32 => Fork) public fork;
    mapping (address => Client) client;
    mapping (bytes32 => Transaction) public proxy;

    event TransactionProposed(address indexed client, bytes32 indexed txid, address indexed to, bytes data, uint value, uint gas);
    event TransactionConfirmed(address indexed client, bytes32 indexed txid);
    event TransactionRejected(address indexed client, bytes32 indexed txid);
    event TransactionRelayed(bytes32 indexed txid, bool success);
    event ForkProposed(address indexed client, uint32 indexed number, string indexed name, bytes32 spec, bool hard);
    event ForkAcceptedBy(address indexed client, uint32 indexed number);
    event ForkRejectedBy(address indexed client, uint32 indexed number);
    event ForkRejected(uint32 indexed forkNumber);
    event ForkRatified(uint32 indexed forkNumber);
    event ReleaseAdded(address indexed client, uint32 indexed forkBlock, bytes32 release, uint8 track, uint24 semver, bool indexed critical);
    event ChecksumAdded(address indexed client, bytes32 indexed release, bytes32 indexed platform, bytes32 checksum);
    event OwnerChanged(address old, address now);

    constructor(Validator _validator) public {
        require(_validator != address(0));
        validator = _validator;
    }

    function clientList() public view returns(address[]) {
        return validator.getValidators();
    }

    function clientsRequired() public view returns(uint) {
        return validator.requiredSignatures();
    }

    // Functions for client owners
    function proposeTransaction(bytes32 _txid, address _to, bytes _data, uint _value, uint _gas) only_client_owner only_when_no_proxy(_txid) public returns (uint txSuccess) {
        proxy[_txid] = Transaction(1, _to, _data, _value, _gas);
        proxy[_txid].status[msg.sender] = Status.Accepted;
        txSuccess = checkProxy(_txid);
        emit TransactionProposed(msg.sender, _txid, _to, _data, _value, _gas);
    }

    function confirmTransaction(bytes32 _txid) only_client_owner only_when_proxy(_txid) only_when_proxy_undecided(_txid) public returns (uint txSuccess) {
        proxy[_txid].status[msg.sender] = Status.Accepted;
        proxy[_txid].requiredCount += 1;
        txSuccess = checkProxy(_txid);
        emit TransactionConfirmed(msg.sender, _txid);
    }

    function rejectTransaction(bytes32 _txid) only_client_owner only_when_proxy(_txid) only_when_proxy_undecided(_txid) public {
        delete proxy[_txid];
        emit TransactionRejected(msg.sender, _txid);
    }

    function proposeFork(uint32 _number, string _name, bool _hard, bytes32 _spec) only_client_owner only_when_none_proposed public {
        fork[_number] = Fork(_name, _spec, _hard, false, 0);
        proposedFork = _number;
        emit ForkProposed(msg.sender, _number, _name, _spec, _hard);
    }

    function acceptFork() only_when_proposed only_undecided_client_owner public {
        fork[proposedFork].status[msg.sender] = Status.Accepted;
        emit ForkAcceptedBy(msg.sender, proposedFork);
        noteAccepted(msg.sender);
    }

    function rejectFork() only_when_proposed only_undecided_client_owner only_unratified public {
        fork[proposedFork].status[msg.sender] = Status.Rejected;
        emit ForkRejectedBy(msg.sender, proposedFork);
        noteRejected(msg.sender);
    }

    function addRelease(bytes32 _release, uint32 _forkBlock, uint8 _track, uint24 _semver, bool _critical) only_client_owner public {
        client[msg.sender].release[_release] = Release(_forkBlock, _track, _semver, _critical);
        client[msg.sender].current[_track] = _release;
        emit ReleaseAdded(msg.sender, _forkBlock, _release, _track, _semver, _critical);
    }

    function addChecksum(bytes32 _release, bytes32 _platform, bytes32 _checksum) only_client_owner public {
        client[msg.sender].build[_checksum] = Build(_release, _platform);
        client[msg.sender].release[_release].checksum[_platform] = _checksum;
        emit ChecksumAdded(msg.sender, _release, _platform, _checksum);
    }

    // Getters
    function isLatest(address _client, bytes32 _release) view public returns (bool) {
        return latestInTrack(_client, track(_client, _release)) == _release;
    }

    function track(address _client, bytes32 _release) view public returns (uint8) {
        return client[_client].release[_release].track;
    }

    function latestInTrack(address _client, uint8 _track) view public returns (bytes32) {
        return client[_client].current[_track];
    }

    function build(address _client, bytes32 _checksum) view public returns (bytes32 o_release, bytes32 o_platform) {
        Build memory b = client[_client].build[_checksum];
        o_release = b.release;
        o_platform = b.platform;
    }

    function release(address _client, bytes32 _release) view public returns (uint32 o_forkBlock, uint8 o_track, uint24 o_semver, bool o_critical) {
        Release memory b = client[_client].release[_release];
        o_forkBlock = b.forkBlock;
        o_track = b.track;
        o_semver = b.semver;
        o_critical = b.critical;
    }

    function checksum(address _client, bytes32 _release, bytes32 _platform) view public returns (bytes32) {
        return client[_client].release[_release].checksum[_platform];
    }

    // Internals
    function noteAccepted(address _client) internal when_is_client(_client) {
        fork[proposedFork].requiredCount += 1;
        checkFork();
    }

    function noteRejected(address _client) internal when_is_client(_client) {
        emit ForkRejected(proposedFork);
        delete fork[proposedFork];
        proposedFork = 0;
    }

    function checkFork() internal when_have_all_required {
        emit ForkRatified(proposedFork);
        fork[proposedFork].ratified = true;
        latestFork = proposedFork;
        proposedFork = 0;
    }

    function checkProxy(bytes32 _txid) internal when_proxy_confirmed(_txid) returns (uint txSuccess) {
        Transaction memory transaction = proxy[_txid];
        uint value = transaction.value;
        uint gas = transaction.gas;
        bytes memory data = transaction.data;
        bool success = transaction.to.call.value(value).gas(gas)(data);
        emit TransactionRelayed(_txid, success);
        txSuccess = success ? 2 : 1;
        delete proxy[_txid];
    }

    // Modifiers
    modifier only_client_owner {
        require(validator.isValidator(msg.sender));
        _;
    }

    modifier only_ratified{
        require(!fork[proposedFork].ratified);
        _;
    }

    modifier only_unratified {
        require(!fork[proposedFork].ratified);
        _;
    }

    modifier only_undecided_client_owner {
        require(msg.sender != 0x0);
        require(fork[proposedFork].status[msg.sender] == Status.Undecided);
        _;
    }

    modifier only_when_none_proposed {
        require(proposedFork == 0);
        _;
    }

    modifier only_when_proposed {
        require(bytes(fork[proposedFork].name).length != 0);
        _;
    }

    modifier only_when_proxy(bytes32 _txid) {
        require(proxy[_txid].requiredCount != 0);
        _;
    }

    modifier only_when_no_proxy(bytes32 _txid) {
        require(proxy[_txid].requiredCount == 0);
        _;
    }

    modifier only_when_proxy_undecided(bytes32 _txid) {
        require(proxy[_txid].status[msg.sender] == Status.Undecided);
        _;
    }

    modifier when_is_client(address _client) {
        if (validator.isValidator(_client))
        _;
    }

    modifier when_have_all_required {
        if (fork[proposedFork].requiredCount >= clientsRequired())
        _;
    }

    modifier when_changing_required(address _client, bool _r) {
        if (validator.isValidator(_client) != _r)
        _;
    }

    modifier when_proxy_confirmed(bytes32 _txid) {
        if (proxy[_txid].requiredCount >= clientsRequired())
        _;
    }
}