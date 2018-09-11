//! Copyright 2017 Peter Czaban, Parity Technologies Ltd.
//!
//! Licensed under the Apache License, Version 2.0 (the "License");
//! you may not use this file except in compliance with the License.
//! You may obtain a copy of the License at
//!
//!     http://www.apache.org/licenses/LICENSE-2.0
//!
//! Unless required by applicable law or agreed to in writing, software
//! distributed under the License is distributed on an "AS IS" BASIS,
//! WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//! See the License for the specific language governing permissions and
//! limitations under the License.

pragma solidity ^0.4.15;

import "./interfaces/ValidatorSet.sol";

// Existing validators can give support to addresses.
// Support can not be added once MAX_VALIDATORS are present.
// Once given, support can be removed.
// Addresses supported by more than half of the existing validators are the validators.
// Malicious behaviour causes support removal.
// Benign misbehaviour causes supprt removal if its called again after MAX_INACTIVITY.
// Benign misbehaviour can be absolved before being called the second time.

contract Validator is ValidatorSet {

    // EVENTS
    event Report(address indexed reporter, address indexed reported, bytes indexed proof);
    event Support(address indexed supporter, address indexed supported, bool indexed added);
    event ChangeFinalized(address[] current_set);

    struct Data {
        address[] stored;
        mapping(address => uint) inserted;
    }

    // Did the voter already vote.
    function contains(Data storage self, address voter) internal view returns (bool) {
        return self.inserted[voter] > 0;
    }

    // Voter casts a vote.
    function insert(Data storage self, address voter) internal returns (bool) {
        if (self.inserted[voter] > 0) { return false; }
        self.stored.push(voter);
        self.inserted[voter] = self.stored.length;
        return true;
    }

    // Retract a vote by a voter.
    function remove(Data storage self, address voter) internal returns (bool) {
        if (self.inserted[voter] == 0) { return false; }
        self.stored[self.inserted[voter]-1] = self.stored[self.stored.length-1];
        self.inserted[self.stored[self.stored.length-1]] = self.inserted[voter];
        self.stored.length--;
        self.inserted[voter] = 0;
        return true;
    }

    struct ValidatorStatus {
        bool isValidator;
        uint index;
        Data support;
        Data supported;
        mapping(address => uint) firstBenign;
        Data benignMisbehaviour;
    }

    address constant SYSTEM_ADDRESS = 0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE;
    uint public constant MAX_VALIDATORS = 30;
    uint public constant MAX_INACTIVITY = 6 hours;
    uint public constant RECENT_BLOCKS = 20;

// STATE

    address[] validatorsList;
    address[] pendingList;
    bool public finalized;
    mapping(address => ValidatorStatus) validatorsStatus;

    // Used to lower the constructor cost.
    Data initialSupport;

    constructor() public {
        pendingList.push(0x574366e84f74f2e913aD9A6782CE6Ac8022e16EB);
        pendingList.push(0x876BaDa62006F4d3b4063fd97618D666575efb07);
        for (uint i = 0; i < pendingList.length; i++) {
            address supporter = pendingList[i];
            insert(initialSupport, supporter);
            validatorsStatus[supporter].isValidator = true;
            validatorsStatus[supporter].index = i;
            for (uint j = 0; j < pendingList.length; j++) {
                address validator = pendingList[j];
                insert(validatorsStatus[validator].support, supporter);
                insert(validatorsStatus[supporter].supported, validator);
            }
        }
        validatorsList = pendingList;
        finalized = true;
    }

    function getInitialSupport() external view returns (address[]){
        return initialSupport.stored;
    }

    // Called on every block to update node validator list.
    function getValidators() public constant returns (address[]) {
        return validatorsList;
    }

    function getPendings() public constant returns (address[]) {
        return pendingList;
    }

    // Log desire to change the current list.
    function initiateChange() private when_finalized {
        finalized = false;
        emit InitiateChange(blockhash(block.number - 1), pendingList);
    }

    function finalizeChange() public only_system_and_not_finalized {
        validatorsList = pendingList;
        finalized = true;
        emit ChangeFinalized(validatorsList);
    }

    // SUPPORT LOOKUP AND MANIPULATION

    // Find the total support for a given address.
    function getSupport(address validator) public constant returns (address[]) {
        return validatorsStatus[validator].support.stored;
    }

    function getSupported(address validator) public constant returns (address[]) {
        return validatorsStatus[validator].supported.stored;
    }

    function supportContained(address validator, address support) public constant returns (bool) {
        return contains(validatorsStatus[validator].support, support);
    }

    function supportedContained(address validator, address supported) public constant returns (bool) {
        return contains(validatorsStatus[validator].supported, supported);
    }

    // Vote to include a validator.
    function addSupport(address validator) public only_validator not_voted(validator) free_validator_slots {
        insert(validatorsStatus[validator].support, msg.sender);
        insert(validatorsStatus[msg.sender].supported, validator);
        addValidator(validator);
        emit Support(msg.sender, validator, true);
    }

    // Remove support for a validator.
    function removeSupport(address sender, address validator) private {
        remove(validatorsStatus[validator].support, sender);
        remove(validatorsStatus[sender].supported, validator);
        emit Support(sender, validator, false);
        removeValidator(validator);
    }

    // MALICIOUS BEHAVIOUR HANDLING

    // Called when a validator should be removed.
    function reportMalicious(address validator, uint blockNumber, bytes proof) public only_validator is_recent(blockNumber) {
        removeSupport(msg.sender, validator);
        emit Report(msg.sender, validator, proof);
    }

    function reportMaliciousNow(address validator, bytes proof) public {
        reportMalicious(validator, block.number, proof);
    }

    // BENIGN MISBEHAVIOUR HANDLING

    // Report that a validator has misbehaved in a benign way.
    function reportBenign(address validator, uint blockNumber) public only_validator is_validator(validator) is_recent(blockNumber) {
        firstBenign(validator);
        repeatedBenign(validator);
        emit Report(msg.sender, validator, "Benign");
    }

    function reportBenignNow(address validator) public {
        reportBenign(validator, block.number);
    }

    // Find the total number of repeated misbehaviour votes.
    function getRepeatedBenign(address validator) public constant returns (uint) {
        return validatorsStatus[validator].benignMisbehaviour.stored.length;
    }

    // Track the first benign misbehaviour.
    function firstBenign(address validator) private has_not_benign_misbehaved(validator) {
        validatorsStatus[validator].firstBenign[msg.sender] = now;
    }

    // Report that a validator has been repeatedly misbehaving.
    function repeatedBenign(address validator) private has_repeatedly_benign_misbehaved(validator) {
        insert(validatorsStatus[validator].benignMisbehaviour, msg.sender);
        confirmedRepeatedBenign(validator);
    }

    // When enough long term benign misbehaviour votes have been seen, remove support.
    function confirmedRepeatedBenign(address validator) private agreed_on_repeated_benign(validator) {
        validatorsStatus[validator].firstBenign[msg.sender] = 0;
        remove(validatorsStatus[validator].benignMisbehaviour, msg.sender);
        removeSupport(msg.sender, validator);
    }

    // Absolve a validator from a benign misbehaviour.
    function absolveFirstBenign(address validator) public has_benign_misbehaved(validator) {
        validatorsStatus[validator].firstBenign[msg.sender] = 0;
        remove(validatorsStatus[validator].benignMisbehaviour, msg.sender);
    }

    // Add a status tracker for unknown validator.
    function newStatus(address validator) private {
        address[] memory none;
        Data memory empty = Data({ stored: none });
        validatorsStatus[validator] = ValidatorStatus({
            isValidator: false,
            index: 0,
            support: empty,
            supported: empty,
            benignMisbehaviour: empty
        });
    }

    // ENACTMENT FUNCTIONS (called when support gets out of line with the validator list)

    // Add the validator if supported by majority.
    // Since the number of validators increases it is possible to some fall below the threshold.
    function addValidator(address validator) public is_not_validator(validator) has_high_support(validator) {
        validatorsStatus[validator].index = pendingList.length;
        pendingList.push(validator);
        validatorsStatus[validator].isValidator = true;
        insert(validatorsStatus[validator].support, validator);
        insert(validatorsStatus[validator].supported, validator);
        initiateChange();
    }

    // Remove a validator without enough support.
    // Can be called to clean low support validators after making the list longer.
    function removeValidator(address validator) public is_validator(validator) has_low_support(validator) {
        uint removedIndex = validatorsStatus[validator].index;
        uint lastIndex = pendingList.length-1;
        address lastValidator = pendingList[lastIndex];
        pendingList[removedIndex] = lastValidator;
        validatorsStatus[lastValidator].index = removedIndex;
        delete pendingList[lastIndex];
        pendingList.length--;
        address[] memory supportRemove = validatorsStatus[validator].support.stored;
        address[] memory supportedRemove = validatorsStatus[validator].supported.stored;
        for (uint i = 0; i < supportRemove.length; i++) {
            remove(validatorsStatus[supportRemove[i]].supported, validator);
            remove(validatorsStatus[validator].support, supportRemove[i]);
        }
        for (uint j = 0; j < supportedRemove.length; j++) {
            remove(validatorsStatus[supportedRemove[j]].support, validator);
            remove(validatorsStatus[validator].supported, supportedRemove[j]);
        }
        newStatus(validator);
        initiateChange();
    }

    // MODIFIERS

    function highSupport(address validator) public constant returns (bool) {
        return getSupport(validator).length > pendingList.length/2;
    }

    function firstBenignReported(address reporter, address validator) public constant returns (uint) {
        return validatorsStatus[validator].firstBenign[reporter];
    }

    modifier has_high_support(address validator) {
        if (highSupport(validator)) { _; }
    }

    modifier has_low_support(address validator) {
        if (!highSupport(validator)) { _; }
    }

    modifier has_not_benign_misbehaved(address validator) {
        if (firstBenignReported(msg.sender, validator) == 0) { _; }
    }

    modifier has_benign_misbehaved(address validator) {
        if (firstBenignReported(msg.sender, validator) > 0) { _; }
    }

    modifier has_repeatedly_benign_misbehaved(address validator) {
        if (firstBenignReported(msg.sender, validator) - now > MAX_INACTIVITY) { _; }
    }

    modifier agreed_on_repeated_benign(address validator) {
        if (getRepeatedBenign(validator) > pendingList.length/2) { _; }
    }

    modifier free_validator_slots() {
        require(pendingList.length < MAX_VALIDATORS);
        _;
    }

    modifier only_validator() {
        require(validatorsStatus[msg.sender].isValidator);
        _;
    }

    modifier is_validator(address someone) {
        if (validatorsStatus[someone].isValidator) { _; }
    }

    modifier is_not_validator(address someone) {
        if (!validatorsStatus[someone].isValidator) { _; }
    }

    modifier not_voted(address validator) {
        require(!contains(validatorsStatus[validator].support, msg.sender));
        _;
    }

    modifier has_no_votes(address validator) {
        if (validatorsStatus[validator].support.stored.length == 0) { _; }
    }

    modifier is_recent(uint blockNumber) {
        require(block.number <= blockNumber + RECENT_BLOCKS);
        _;
    }

    modifier only_system_and_not_finalized() {
        require(msg.sender == SYSTEM_ADDRESS && !finalized);
        _;
    }

    modifier when_finalized() {
        require(finalized);
        _;
    }
}
