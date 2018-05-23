pragma solidity ^0.4.23;

import "../validator-contracts/ImmediateSet.sol";

contract Operations {

	struct Release {
		uint32 forkBlock;
		uint8 track;
		uint24 semver;
		bool critical;
		mapping (bytes32 => bytes32) checksum;      // platform -> checksum
	}

	struct Build {
		bytes32 release;
		bytes32 platform;
	}

	struct Client {
		address owner;
		bool required;
		uint index;
		mapping (bytes32 => Release) release;
		mapping (uint8 => bytes32) current;
		mapping (bytes32 => Build) build;       // checksum -> Build
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
		mapping (bytes32 => Status) status;
	}

	struct Transaction {
		uint requiredCount;
		mapping (bytes32 => Status) status;
		address to;
		bytes data;
		uint value;
		uint gas;
	}
	
	Validator public validator;
	uint32 public clientsRequired;
	uint32 public latestFork;
	uint32 public proposedFork;
	address public grandOwner = msg.sender;
	address[] clientOwnerList;
	
	mapping (uint32 => Fork) public fork;
	mapping (bytes32 => Client) public client;
	mapping (address => bytes32) public clientOwner;
	mapping (bytes32 => Transaction) public proxy;

	event Received(address indexed from, uint value, bytes data);
	event TransactionProposed(bytes32 indexed client, bytes32 indexed txid, address indexed to, bytes data, uint value, uint gas);
	event TransactionConfirmed(bytes32 indexed client, bytes32 indexed txid);
	event TransactionRejected(bytes32 indexed client, bytes32 indexed txid);
	event TransactionRelayed(bytes32 indexed txid, bool success);
	event ForkProposed(bytes32 indexed client, uint32 indexed number, string indexed name, bytes32 spec, bool hard);
	event ForkAcceptedBy(bytes32 indexed client, uint32 indexed number);
	event ForkRejectedBy(bytes32 indexed client, uint32 indexed number);
	event ForkRejected(uint32 indexed forkNumber);
	event ForkRatified(uint32 indexed forkNumber);
	event ReleaseAdded(bytes32 indexed client, uint32 indexed forkBlock, bytes32 release, uint8 track, uint24 semver, bool indexed critical);
	event ChecksumAdded(bytes32 indexed client, bytes32 indexed release, bytes32 indexed platform, bytes32 checksum);
	event ClientAdded(bytes32 client, address owner);
	event ClientRemoved(bytes32 indexed client);
	event ClientOwnerChanged(bytes32 indexed client, address indexed old, address indexed now);
	event ClientRequiredChanged(bytes32 indexed client, bool now);
	event OwnerChanged(address old, address now);

	constructor(Validator _validator) public {
	    require(_validator != address(0));
	    validator = _validator;
	    address[] memory validators = validator.getValidators();
	    for (uint i = 0; i < validators.length; i++) {
	        bytes32 cliendId = bytes32(i+1);
	        clientOwnerList.push(validators[i]);
	        clientOwner[validators[i]] = cliendId;
	        client[cliendId] = Client(validators[i], true, i);
	        clientsRequired++;
	    }
	}
	
	function clientList() external view returns(address[]) {
	    return clientOwnerList;
	}

	function () payable public { 
	    emit Received(msg.sender, msg.value, msg.data); 
	}

	// Functions for client owners

	function proposeTransaction(bytes32 _txid, address _to, bytes _data, uint _value, uint _gas) only_required_client_owner only_when_no_proxy(_txid) public returns (uint txSuccess) {
		bytes32 newClient = clientOwner[msg.sender];
		proxy[_txid] = Transaction(1, _to, _data, _value, _gas);
		proxy[_txid].status[newClient] = Status.Accepted;
		txSuccess = checkProxy(_txid);
		emit TransactionProposed(newClient, _txid, _to, _data, _value, _gas);
	}

	function confirmTransaction(bytes32 _txid) only_required_client_owner only_when_proxy(_txid) only_when_proxy_undecided(_txid) public returns (uint txSuccess) {
		bytes32 newClient = clientOwner[msg.sender];
		proxy[_txid].status[newClient] = Status.Accepted;
		proxy[_txid].requiredCount += 1;
		txSuccess = checkProxy(_txid);
		emit TransactionConfirmed(newClient, _txid);
	}

	function rejectTransaction(bytes32 _txid) only_required_client_owner only_when_proxy(_txid) only_when_proxy_undecided(_txid) public {
		delete proxy[_txid];
		emit TransactionRejected(clientOwner[msg.sender], _txid);
	}

	function proposeFork(uint32 _number, string _name, bool _hard, bytes32 _spec) only_client_owner only_when_none_proposed public {
		fork[_number] = Fork(_name, _spec, _hard, false, 0);
		proposedFork = _number;
		emit ForkProposed(clientOwner[msg.sender], _number, _name, _spec, _hard);
	}

	function acceptFork() only_when_proposed only_undecided_client_owner public {
		bytes32 newClient = clientOwner[msg.sender];
		fork[proposedFork].status[newClient] = Status.Accepted;
		emit ForkAcceptedBy(newClient, proposedFork);
		noteAccepted(newClient);
	}

	function rejectFork() only_when_proposed only_undecided_client_owner only_unratified public {
		bytes32 newClient = clientOwner[msg.sender];
		fork[proposedFork].status[newClient] = Status.Rejected;
		emit ForkRejectedBy(newClient, proposedFork);
		noteRejected(newClient);
	}

	function setClientOwner(address _newOwner) only_client_owner public {
		bytes32 newClient = clientOwner[msg.sender];
		clientOwner[msg.sender] = "";
		clientOwner[_newOwner] = newClient;
		client[newClient].owner = _newOwner;
		emit ClientOwnerChanged(newClient, msg.sender, _newOwner);
	}

	function addRelease(bytes32 _release, uint32 _forkBlock, uint8 _track, uint24 _semver, bool _critical) only_client_owner public {
		bytes32 newClient = clientOwner[msg.sender];
		client[newClient].release[_release] = Release(_forkBlock, _track, _semver, _critical);
		client[newClient].current[_track] = _release;
		emit ReleaseAdded(newClient, _forkBlock, _release, _track, _semver, _critical);
	}

	function addChecksum(bytes32 _release, bytes32 _platform, bytes32 _checksum) only_client_owner public {
		bytes32 newClient = clientOwner[msg.sender];
		client[newClient].build[_checksum] = Build(_release, _platform);
		client[newClient].release[_release].checksum[_platform] = _checksum;
		emit ChecksumAdded(newClient, _release, _platform, _checksum);
	}

	// Admin functions

	function addClient(bytes32 _client, address _owner, bool _require) only_client_owner public {
	    require(client[_client].owner == address(0));
	    require(clientOwner[_owner] == 0);
		client[_client] = Client(_owner, false, clientOwnerList.length);
		setClientRequired(_client, _require);
		clientOwner[_owner] = _client;
		clientOwnerList.push(_owner);
		validator.addValidator(_owner, msg.sender);
		emit ClientAdded(_client, _owner);
	}

	function removeClient(bytes32 _client) only_client_owner public {
		setClientRequired(_client, false);
		uint index = client[_client].index;
		address removedClient = client[_client].owner;
		address lastClient = clientOwnerList[clientOwnerList.length - 1];
		clientOwner[removedClient] = "";
		clientOwnerList[index] = lastClient;
		clientOwnerList.length--;
		client[clientOwner[lastClient]].index = index;
		delete client[_client];
		validator.removeValidator(removedClient, msg.sender);
		emit ClientRemoved(_client);
	}

	function resetClientOwner(bytes32 _client, address _newOwner) only_owner public {
		address old = client[_client].owner;
		emit ClientOwnerChanged(_client, old, _newOwner);
		clientOwner[old] = "";
		clientOwner[_newOwner] = _client;
		client[_client].owner = _newOwner;
	}

	function setClientRequired(bytes32 _client, bool _require) only_client_owner when_changing_required(_client, _require) public {
		emit ClientRequiredChanged(_client, _require);
		client[_client].required = _require;
		clientsRequired = _require ? clientsRequired + 1 : (clientsRequired - 1);
		checkFork();
	}

	function setOwner(address _newOwner) only_owner public {
		emit OwnerChanged(grandOwner, _newOwner);
		grandOwner = _newOwner;
	}

	// Getters

	function isLatest(bytes32 _client, bytes32 _release) constant public returns (bool) {
		return latestInTrack(_client, track(_client, _release)) == _release;
	}

	function track(bytes32 _client, bytes32 _release) constant public returns (uint8) {
		return client[_client].release[_release].track;
	}

	function latestInTrack(bytes32 _client, uint8 _track) constant public returns (bytes32) {
		return client[_client].current[_track];
	}

	function build(bytes32 _client, bytes32 _checksum) constant public returns (bytes32 o_release, bytes32 o_platform) {
		Build memory b = client[_client].build[_checksum];
		o_release = b.release;
		o_platform = b.platform;
	}

	function release(bytes32 _client, bytes32 _release) constant public returns (uint32 o_forkBlock, uint8 o_track, uint24 o_semver, bool o_critical) {
		Release memory b = client[_client].release[_release];
		o_forkBlock = b.forkBlock;
		o_track = b.track;
		o_semver = b.semver;
		o_critical = b.critical;
	}

	function checksum(bytes32 _client, bytes32 _release, bytes32 _platform) constant public returns (bytes32) {
		return client[_client].release[_release].checksum[_platform];
	}

	// Internals

	function noteAccepted(bytes32 _client) internal when_required(_client) {
		fork[proposedFork].requiredCount += 1;
		checkFork();
	}

	function noteRejected(bytes32 _client) internal when_required(_client) {
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

	modifier only_owner { 
	    require(grandOwner == msg.sender); 
	    _; 
	}
	
	modifier only_client_owner { 
	    require(clientOwner[msg.sender] != 0); 
	    _; 
	}
	
	modifier only_required_client_owner { 
	    require(client[clientOwner[msg.sender]].required); 
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
		bytes32 newClient = clientOwner[msg.sender];
		require(newClient != 0);
		require(fork[proposedFork].status[newClient] == Status.Undecided);
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
	    require(proxy[_txid].status[clientOwner[msg.sender]] == Status.Undecided); 
	    _; }

	modifier when_required(bytes32 _client) { 
	    if (client[_client].required) 
	    _; 
	}
	
	modifier when_have_all_required { 
	    if (fork[proposedFork].requiredCount >= clientsRequired) 
	    _; 
	}
	
	modifier when_changing_required(bytes32 _client, bool _r) { 
	    if (client[_client].required != _r) 
	    _; 
	}
	
	modifier when_proxy_confirmed(bytes32 _txid) { 
	    if (proxy[_txid].requiredCount >= clientsRequired) 
	    _; 
	}
}