const Web3Utils = require('web3-utils');

const SENC = artifacts.require("SencToken.sol");
const ForeignBridge = artifacts.require("ForeignBridge.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");

const {ERROR_MSG, ZERO_ADDRESS} = require('./setup');
const {createMessage, sign} = require('./helpers/helpers');

const requireBlockConfirmations = 8;
const oneEther = web3.toBigNumber(web3.toWei(1, "ether"));
const halfEther = web3.toBigNumber(web3.toWei(0.5, "ether"));
const minPerTx = web3.toBigNumber(web3.toWei(0.01, "ether"));
const gasPrice = Web3Utils.toWei('1', 'gwei');

const getEvents = function(contract, filter) {
  return new Promise((resolve, reject) => {
      var event = contract[filter.event]();
      event.watch();
      event.get((error, logs) => {
        if(logs.length > 0){
          resolve(logs);
        } else {
          throw Error("Failed to find filtered event for " + filter.event);
        }
      });
      event.stopWatching();
  });
}

contract('ForeignBridge', async (accounts) => {
  let validatorContract, authorities, owner, token;
  
  before(async () => {
    validatorContract = await BridgeValidators.new()
    owner = accounts[0]
    authorities = [accounts[1], accounts[2]];
    await validatorContract.initialize(1, authorities, owner)
  })

  describe('#initialize', async () => {
    it('should initialize', async () => {
      token = await SENC.new();
      let foreignBridge =  await ForeignBridge.new();

      ZERO_ADDRESS.should.be.equal(await foreignBridge.validatorContract())
      '0'.should.be.bignumber.equal(await foreignBridge.deployedAtBlock())
      '0'.should.be.bignumber.equal(await foreignBridge.foreignDailyLimit())
      '0'.should.be.bignumber.equal(await foreignBridge.maxPerTx())
      false.should.be.equal(await foreignBridge.isInitialized())
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);

      true.should.be.equal(await foreignBridge.isInitialized())
      validatorContract.address.should.be.equal(await foreignBridge.validatorContract());
      (await foreignBridge.deployedAtBlock()).should.be.bignumber.above(0);
      oneEther.should.be.bignumber.equal(await foreignBridge.foreignDailyLimit())
      halfEther.should.be.bignumber.equal(await foreignBridge.maxPerTx())
      minPerTx.should.be.bignumber.equal(await foreignBridge.minPerTx())
    })
  })

  describe('#deposit', async () => {
    let foreignBridge;
    const recipient = accounts[5];

    beforeEach(async () => {
      token = await SENC.new();
      await token.unpause();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
    })

    it('should allow validator to deposit', async () => {
      const value = halfEther;
      await token.mint(foreignBridge.address, value); 
      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      const {logs} = await foreignBridge.deposit(recipient, value, transactionHash, {from: authorities[0]})
      logs[0].event.should.be.equal("SignedForDeposit");
      logs[0].args.should.be.deep.equal({
        signer: authorities[0],
        transactionHash
      });
      logs[1].event.should.be.equal("Deposit");
      logs[1].args.should.be.deep.equal({
        recipient,
        value,
        transactionHash
      })
      halfEther.should.be.bignumber.equal(await token.balanceOf(recipient));

      const msgHash = Web3Utils.soliditySha3(recipient, value, transactionHash);
      const senderHash = Web3Utils.soliditySha3(authorities[0], msgHash)
      true.should.be.equal(await foreignBridge.depositsSigned(senderHash))
    })

    it('test with 2 signatures required', async () => {
      let validatorContractWith2Signatures = await BridgeValidators.new()
      let authoritiesTwoAccs = [accounts[1], accounts[2], accounts[3]];
      let ownerOfValidators = accounts[0]
      await validatorContractWith2Signatures.initialize(2, authoritiesTwoAccs, ownerOfValidators)

      let tokenSENC = await SENC.new();
      await tokenSENC.unpause();

      let foreignBridgeWithTwoSigs = await ForeignBridge.new();
      await foreignBridgeWithTwoSigs.initialize(validatorContractWith2Signatures.address, tokenSENC.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);

      const value = oneEther;
      await tokenSENC.mint(foreignBridgeWithTwoSigs.address, value);

      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      const {logs} = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[0]}).should.be.fulfilled;
      logs[0].event.should.be.equal("SignedForDeposit");
      logs[0].args.should.be.deep.equal({
        signer: authoritiesTwoAccs[0],
        transactionHash
      });
      '0'.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));
 
      const secondDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[1]}).should.be.fulfilled;
      secondDeposit.logs[1].event.should.be.equal("Deposit");
      secondDeposit.logs[1].args.should.be.deep.equal({
        recipient,
        value,
        transactionHash
      })
      
      const thirdDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[2]}).should.be.rejectedWith(ERROR_MSG);
      oneEther.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));
    })

    it('should not allow to double submit', async () => {
      const value = oneEther;
      await token.mint(foreignBridge.address, value); 
      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      await foreignBridge.deposit(recipient, value, transactionHash, {from: authorities[0]}).should.be.fulfilled;
      await foreignBridge.deposit(recipient, value, transactionHash, {from: authorities[0]}).should.be.rejectedWith(ERROR_MSG);
    })

    it('should not allow non-authorities to execute deposit', async () => {
      const value = oneEther;
      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      await foreignBridge.deposit(recipient, value, transactionHash, {from: accounts[7]}).should.be.rejectedWith(ERROR_MSG);
    })

    it('doesnt allow to mint if requiredSignatures has changed', async () => {
      let validatorContractWith2Signatures = await BridgeValidators.new()
      let authoritiesTwoAccs = [accounts[1], accounts[2], accounts[3]];
      let ownerOfValidators = accounts[0]
      await validatorContractWith2Signatures.initialize(2, authoritiesTwoAccs, ownerOfValidators)

      let tokenSENC = await SENC.new();
      await tokenSENC.unpause();

      let foreignBridgeWithTwoSigs = await ForeignBridge.new();
      await foreignBridgeWithTwoSigs.initialize(validatorContractWith2Signatures.address, tokenSENC.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);

      const value = oneEther;
      await tokenSENC.mint(foreignBridgeWithTwoSigs.address, value);

      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      const {logs} = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[0]}).should.be.fulfilled;
      logs[0].event.should.be.equal("SignedForDeposit");
      logs[0].args.should.be.deep.equal({
        signer: authorities[0],
        transactionHash
      });
      '0'.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));

      const secondDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[1]}).should.be.fulfilled;
      secondDeposit.logs[1].event.should.be.equal("Deposit");
      secondDeposit.logs[1].args.should.be.deep.equal({
        recipient,
        value,
        transactionHash
      })
      oneEther.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));
      
      await validatorContractWith2Signatures.setRequiredSignatures(3).should.be.fulfilled;
      const thirdDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[2]}).should.be.rejectedWith(ERROR_MSG);
      oneEther.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));
    })

    it('attack when decreasing requiredSignatures', async () => {
      let validatorContractWith2Signatures = await BridgeValidators.new()
      let authoritiesTwoAccs = [accounts[1], accounts[2], accounts[3]];
      let ownerOfValidators = accounts[0]
      await validatorContractWith2Signatures.initialize(2, authoritiesTwoAccs, ownerOfValidators)

      let tokenSENC = await SENC.new();
      await tokenSENC.unpause();

      let foreignBridgeWithTwoSigs = await ForeignBridge.new();
      await foreignBridgeWithTwoSigs.initialize(validatorContractWith2Signatures.address, tokenSENC.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);

      const value = oneEther;
      await tokenSENC.mint(foreignBridgeWithTwoSigs.address, value);

      const transactionHash = "0x806335163828a8eda675cff9c84fa6e6c7cf06bb44cc6ec832e42fe789d01415";
      const {logs} = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[0]}).should.be.fulfilled;
      logs[0].event.should.be.equal("SignedForDeposit");
      logs[0].args.should.be.deep.equal({
        signer: authorities[0],
        transactionHash
      });
      '0'.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));

      await validatorContractWith2Signatures.setRequiredSignatures(1).should.be.fulfilled;
      const secondDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[1]}).should.be.fulfilled;
      const thirdDeposit = await foreignBridgeWithTwoSigs.deposit(recipient, value, transactionHash, {from: authoritiesTwoAccs[2]}).should.be.rejectedWith(ERROR_MSG);
      secondDeposit.logs[1].event.should.be.equal("Deposit");
      secondDeposit.logs[1].args.should.be.deep.equal({
        recipient,
        value,
        transactionHash
      })
      oneEther.should.be.bignumber.equal(await tokenSENC.balanceOf(recipient));
    })
  })

  describe('#onTokenTransfer', async () => {
    it('should only let to send within maxPerTx limit', async () => {
      const owner = accounts[3]
      const user = accounts[4]
      const valueMoreThanLimit = halfEther.add(1);
      
      token = await SENC.new({from: owner});
      await token.unpause({from: owner});
      await token.mint(user, oneEther.add(1), {from: owner}).should.be.fulfilled;
      
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      
      await foreignBridge.onTokenTransfer(valueMoreThanLimit, {from: user}).should.be.rejectedWith(ERROR_MSG);
      oneEther.add(1).should.be.bignumber.equal(await token.balanceOf(user));
      
      await token.approve(foreignBridge.address, halfEther, {from: user});
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.fulfilled;
      valueMoreThanLimit.should.be.bignumber.equal(await token.balanceOf(user));
      
      await token.approve(foreignBridge.address, halfEther, {from: user});
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.fulfilled;
      '1'.should.be.bignumber.equal(await token.balanceOf(user));
      
      await token.approve(foreignBridge.address, '1', {from: user});  
      await foreignBridge.onTokenTransfer('1', {from: user}).should.be.rejectedWith(ERROR_MSG);
    })

    it('should not let to withdraw less than minPerTx', async () => {
      const owner = accounts[3]
      const user = accounts[4]
      const valueLessThanMinPerTx = minPerTx.sub(1);
      
      token = await SENC.new({from: owner});
      await token.unpause({from: owner});
      await token.mint(user, oneEther, {from: owner}).should.be.fulfilled;
      
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      
      await foreignBridge.onTokenTransfer(valueLessThanMinPerTx, {from: user}).should.be.rejectedWith(ERROR_MSG);
      oneEther.should.be.bignumber.equal(await token.balanceOf(user));
      
      await token.approve(foreignBridge.address, minPerTx, {from: user});
      await foreignBridge.onTokenTransfer(minPerTx, {from: user}).should.be.fulfilled;
      oneEther.sub(minPerTx).should.be.bignumber.equal(await token.balanceOf(user));
    })
  })

  describe('#submitSignature', async () => {
    let validatorContractWith2Signatures, authoritiesTwoAccs, ownerOfValidators, token, foreignBridgeWithTwoSigs;

    beforeEach(async () => {
      validatorContractWith2Signatures = await BridgeValidators.new()
      authoritiesTwoAccs = [accounts[1], accounts[2], accounts[3]];
      ownerOfValidators = accounts[0]
      await validatorContractWith2Signatures.initialize(2, authoritiesTwoAccs, ownerOfValidators)
      token = await SENC.new();
      await token.unpause();
      foreignBridgeWithTwoSigs = await ForeignBridge.new();
      await foreignBridgeWithTwoSigs.initialize(validatorContractWith2Signatures.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
    })

    it('allows a validator to submit a signature', async () => {
      var recipientAccount = accounts[8]
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authoritiesTwoAccs[0], message)
      const {logs} = await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authorities[0]}).should.be.fulfilled;
      logs[0].event.should.be.equal('SignedForWithdraw')
      const msgHashFromLog = logs[0].args.messageHash
      const signatureFromContract = await foreignBridgeWithTwoSigs.signature(msgHashFromLog, 0);
      const messageFromContract = await foreignBridgeWithTwoSigs.message(msgHashFromLog);
      signature.should.be.equal(signatureFromContract);
      messageFromContract.should.be.equal(messageFromContract);
      const hashMsg = Web3Utils.soliditySha3(message);
      const hashSenderMsg = Web3Utils.soliditySha3(authorities[0], hashMsg)
      true.should.be.equal(await foreignBridgeWithTwoSigs.messagesSigned(hashSenderMsg));
    })

    it('when enough requiredSignatures are collected, CollectedSignatures event is emitted', async () => {
      var recipientAccount = accounts[8]
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authoritiesTwoAccs[0], message)
      var signature2 = await sign(authoritiesTwoAccs[1], message)
      '2'.should.be.bignumber.equal(await validatorContractWith2Signatures.requiredSignatures());
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authorities[0]}).should.be.fulfilled;
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authorities[0]}).should.be.rejectedWith(ERROR_MSG);
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authorities[1]}).should.be.rejectedWith(ERROR_MSG);
      const {logs} = await foreignBridgeWithTwoSigs.submitSignature(signature2, message, {from: authorities[1]}).should.be.fulfilled;
      logs.length.should.be.equal(2)
      logs[1].event.should.be.equal('CollectedSignatures')
      logs[1].args.authorityResponsibleForRelay.should.be.equal(authorities[1])
    })

    it('attack when increasing requiredSignatures', async () => {
      var recipientAccount = accounts[8]
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authoritiesTwoAccs[0], message)
      var signature2 = await sign(authoritiesTwoAccs[1], message)
      var signature3 = await sign(authoritiesTwoAccs[2], message)
      '2'.should.be.bignumber.equal(await validatorContractWith2Signatures.requiredSignatures());
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authoritiesTwoAccs[0]}).should.be.fulfilled;
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authoritiesTwoAccs[0]}).should.be.rejectedWith(ERROR_MSG);
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authoritiesTwoAccs[1]}).should.be.rejectedWith(ERROR_MSG);
      const {logs} = await foreignBridgeWithTwoSigs.submitSignature(signature2, message, {from: authoritiesTwoAccs[1]}).should.be.fulfilled;
      logs.length.should.be.equal(2)
      logs[1].event.should.be.equal('CollectedSignatures')
      logs[1].args.authorityResponsibleForRelay.should.be.equal(authorities[1])
      await validatorContractWith2Signatures.setRequiredSignatures(3).should.be.fulfilled;
      '3'.should.be.bignumber.equal(await validatorContractWith2Signatures.requiredSignatures());
      const attackerTx = await foreignBridgeWithTwoSigs.submitSignature(signature3, message, {from: authoritiesTwoAccs[2]}).should.be.rejectedWith(ERROR_MSG);
    })

    it('attack when decreasing requiredSignatures', async () => {
      var recipientAccount = accounts[8]
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authoritiesTwoAccs[0], message)
      var signature2 = await sign(authoritiesTwoAccs[1], message)
      var signature3 = await sign(authoritiesTwoAccs[2], message)
      '2'.should.be.bignumber.equal(await validatorContractWith2Signatures.requiredSignatures());
      await foreignBridgeWithTwoSigs.submitSignature(signature, message, {from: authoritiesTwoAccs[0]}).should.be.fulfilled;
      await validatorContractWith2Signatures.setRequiredSignatures(1).should.be.fulfilled;
      '1'.should.be.bignumber.equal(await validatorContractWith2Signatures.requiredSignatures());
      const {logs} = await foreignBridgeWithTwoSigs.submitSignature(signature2, message, {from: authoritiesTwoAccs[1]}).should.be.fulfilled;
      logs.length.should.be.equal(2)
      logs[1].event.should.be.equal('CollectedSignatures')
      logs[1].args.authorityResponsibleForRelay.should.be.equal(authorities[1])
    })
  })

  describe('#setting limits', async () => {
    let foreignBridge;

    beforeEach(async () => {
      token = await SENC.new();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
    })

    it('#setMaxPerTx allows to set only to owner and cannot be more than daily limit', async () => {
      await foreignBridge.setMaxPerTx(halfEther, {from: authorities[0]}).should.be.rejectedWith(ERROR_MSG);
      await foreignBridge.setMaxPerTx(halfEther, {from: owner}).should.be.fulfilled;
      await foreignBridge.setMaxPerTx(oneEther, {from: owner}).should.be.rejectedWith(ERROR_MSG);
    })
    
    it('#setMinPerTx allows to set only to owner and cannot be more than daily limit and should be less than maxPerTx', async () => {
      await foreignBridge.setMinPerTx(minPerTx, {from: authorities[0]}).should.be.rejectedWith(ERROR_MSG);
      await foreignBridge.setMinPerTx(minPerTx, {from: owner}).should.be.fulfilled;
      await foreignBridge.setMinPerTx(oneEther, {from: owner}).should.be.rejectedWith(ERROR_MSG);
    })
  })

  describe('#claimTokens', async () => {
    it('can claim tokens from foreign', async () => {
      const owner = accounts[0];
      
      token = await SENC.new();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      
      let tokenSecond = await SENC.new();
      await tokenSecond.unpause();

      await tokenSecond.mint(accounts[0], halfEther).should.be.fulfilled;
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))

      await tokenSecond.transfer(foreignBridge.address, halfEther);
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(foreignBridge.address))
      
      await foreignBridge.claimTokens(tokenSecond.address, accounts[3], {from: owner});
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(foreignBridge.address))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[3]))
    })
  })

  describe('#isAlreadyProcessed', async () => {
    it('returns ', async () => {
      foreignBridge = await ForeignBridge.new();
      const bn = new web3.BigNumber(2).pow(255);
      const processedNumbers = [bn.add(1).toString(10), bn.add(100).toString(10)];
      true.should.be.equal(await foreignBridge.isAlreadyProcessed(processedNumbers[0]));
      true.should.be.equal(await foreignBridge.isAlreadyProcessed(processedNumbers[1]));
      false.should.be.equal(await foreignBridge.isAlreadyProcessed(10));
    })
  })
})
