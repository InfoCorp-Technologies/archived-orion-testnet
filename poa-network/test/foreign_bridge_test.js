const Web3Utils = require('web3-utils');

const SENC = artifacts.require("SencToken.sol");
const ForeignBridge = artifacts.require("ForeignBridge.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");

const {ERROR_MSG, ZERO_ADDRESS} = require('./setup');
const {createMessage, sign, signatureToVRS} = require('./helpers/helpers');

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
      '0'.should.be.bignumber.equal(await foreignBridge.dailyLimit())
      '0'.should.be.bignumber.equal(await foreignBridge.maxPerTx())
      false.should.be.equal(await foreignBridge.isInitialized())
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);

      true.should.be.equal(await foreignBridge.isInitialized())
      validatorContract.address.should.be.equal(await foreignBridge.validatorContract());
      (await foreignBridge.deployedAtBlock()).should.be.bignumber.above(0);
      oneEther.should.be.bignumber.equal(await foreignBridge.dailyLimit())
      halfEther.should.be.bignumber.equal(await foreignBridge.maxPerTx())
      minPerTx.should.be.bignumber.equal(await foreignBridge.minPerTx())
    })
  })

  describe('#deposit', async () => {

    beforeEach(async () => {
      foreignBridge = await ForeignBridge.new()
      token = await SENC.new();
      await token.unpause();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      oneEther.should.be.bignumber.equal(await foreignBridge.dailyLimit());
    })

    it('should allow to deposit', async () => {
      var recipientAccount = accounts[3];
      const balanceBefore = await token.balanceOf(recipientAccount)
      var homeGasPrice = web3.toBigNumber(0);
      var value = web3.toBigNumber(web3.toWei(0.25, "ether"));
      await token.mint(foreignBridge.address, value);
      var transactionHash = "0x1045bfe274b88120a6b1e5d01b5ec00ab5d01098346e90e7c7a3c9b8f0181c80";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authorities[0], message)
      var vrs = signatureToVRS(signature);
      false.should.be.equal(await foreignBridge.deposits(transactionHash))
      const {logs} = await foreignBridge.deposit([vrs.v], [vrs.r], [vrs.s], message).should.be.fulfilled
      logs[0].event.should.be.equal("Deposit")
      logs[0].args.recipient.should.be.equal(recipientAccount)
      logs[0].args.value.should.be.bignumber.equal(value)
      logs[0].args.transactionHash.should.be.equal(transactionHash);

      const balanceAfter = await token.balanceOf(recipientAccount);
      balanceAfter.should.be.bignumber.equal(balanceBefore.add(value))
      true.should.be.equal(await foreignBridge.deposits(transactionHash))
    })
    
    it('should allow second deposit with different transactionHash but same recipient and value', async ()=> {
      var recipientAccount = accounts[3];
      const balanceBefore = await token.balanceOf(recipientAccount)
      // tx 1
      var value = web3.toBigNumber(web3.toWei(0.25, "ether"));
      await token.mint(foreignBridge.address, value);
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x35d3818e50234655f6aebb2a1cfbf30f59568d8a4ec72066fac5a25dbe7b8121";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authorities[0], message)
      var vrs = signatureToVRS(signature);
      false.should.be.equal(await foreignBridge.deposits(transactionHash))
      await foreignBridge.deposit([vrs.v], [vrs.r], [vrs.s], message).should.be.fulfilled
      // tx 2
      var transactionHash2 = "0x77a496628a776a03d58d7e6059a5937f04bebd8ba4ff89f76dd4bb8ba7e291ee";
      var message2 = createMessage(recipientAccount, value, transactionHash2, homeGasPrice);
      var signature2 = await sign(authorities[0], message2)
      var vrs2 = signatureToVRS(signature2);
      await token.mint(foreignBridge.address, value);
      false.should.be.equal(await foreignBridge.deposits(transactionHash2))
      const {logs} = await foreignBridge.deposit([vrs2.v], [vrs2.r], [vrs2.s], message2).should.be.fulfilled

      logs[0].event.should.be.equal("Deposit")
      logs[0].args.recipient.should.be.equal(recipientAccount)
      logs[0].args.value.should.be.bignumber.equal(value)
      logs[0].args.transactionHash.should.be.equal(transactionHash2);
      const balanceAfter = await token.balanceOf(recipientAccount)
      balanceAfter.should.be.bignumber.equal(balanceBefore.add(value.mul(2)))
      true.should.be.equal(await foreignBridge.deposits(transactionHash))
      true.should.be.equal(await foreignBridge.deposits(transactionHash2))
    })

    it('should not allow second deposit (replay attack) with same transactionHash but different recipient', async () => {
      var recipientAccount = accounts[3];
      const balanceBefore = await token.balanceOf(recipientAccount)
      // tx 1
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x35d3818e50234655f6aebb2a1cfbf30f59568d8a4ec72066fac5a25dbe7b8121";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(authorities[0], message)
      var vrs = signatureToVRS(signature);
      false.should.be.equal(await foreignBridge.deposits(transactionHash))
      await token.mint(foreignBridge.address, value);
      await foreignBridge.deposit([vrs.v], [vrs.r], [vrs.s], message).should.be.fulfilled
      const balanceAfter = await token.balanceOf(recipientAccount)
      balanceAfter.should.be.bignumber.equal(balanceBefore.add(value))
      // tx 2
      var message2 = createMessage(accounts[4], value, transactionHash, homeGasPrice);
      var signature2 = await sign(authorities[0], message2)
      var vrs = signatureToVRS(signature2);
      true.should.be.equal(await foreignBridge.deposits(transactionHash))
      await foreignBridge.deposit([vrs.v], [vrs.r], [vrs.s], message2).should.be.rejectedWith(ERROR_MSG)
    })
 
  })

  describe('#deposit with 2 minimum signatures', async () => {

    let multisigValidatorContract, twoAuthorities, ownerOfValidatorContract, foreignBridgeWithMultiSignatures
    
    beforeEach(async () => {
      multisigValidatorContract = await BridgeValidators.new()
      token = await SENC.new();
      await token.unpause();
      twoAuthorities = [accounts[0], accounts[1]];
      ownerOfValidatorContract = accounts[3]
      const halfEther = web3.toBigNumber(web3.toWei(0.5, "ether"));
      await multisigValidatorContract.initialize(2, twoAuthorities, ownerOfValidatorContract, {from: ownerOfValidatorContract})
      foreignBridgeWithMultiSignatures = await ForeignBridge.new()
      const oneEther = web3.toBigNumber(web3.toWei(1, "ether"));
      await foreignBridgeWithMultiSignatures.initialize(multisigValidatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations, {from: ownerOfValidatorContract});
    })
    
    it('deposit should fail if not enough signatures are provided', async () => {
      var recipientAccount = accounts[4];
      const balanceBefore = await token.balanceOf(recipientAccount)
      // msg 1
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x35d3818e50234655f6aebb2a1cfbf30f59568d8a4ec72066fac5a25dbe7b8121";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(twoAuthorities[0], message)
      var vrs = signatureToVRS(signature);
      false.should.be.equal(await foreignBridgeWithMultiSignatures.deposits(transactionHash))
      await token.mint(foreignBridgeWithMultiSignatures.address, value);
      await foreignBridgeWithMultiSignatures.deposit([vrs.v], [vrs.r], [vrs.s], message).should.be.rejectedWith(ERROR_MSG)
      // msg 2
      var signature2 = await sign(twoAuthorities[1], message)
      var vrs2 = signatureToVRS(signature2);
      const {logs} = await foreignBridgeWithMultiSignatures.deposit([vrs.v, vrs2.v], [vrs.r, vrs2.r], [vrs.s, vrs2.s], message).should.be.fulfilled;

      logs[0].event.should.be.equal("Deposit")
      logs[0].args.recipient.should.be.equal(recipientAccount)
      logs[0].args.value.should.be.bignumber.equal(value)
      logs[0].args.transactionHash.should.be.equal(transactionHash);
      const balanceAfter = await token.balanceOf(recipientAccount)
      balanceAfter.should.be.bignumber.equal(balanceBefore.add(value))
      true.should.be.equal(await foreignBridgeWithMultiSignatures.deposits(transactionHash))
    })
    
    it('deposit should fail if duplicate signature is provided', async () => {
      var recipientAccount = accounts[4];
      const balanceBefore = await token.balanceOf(recipientAccount)
      // msg 1
      var value = web3.toBigNumber(web3.toWei(0.5, "ether"));
      var homeGasPrice = web3.toBigNumber(0);
      var transactionHash = "0x35d3818e50234655f6aebb2a1cfbf30f59568d8a4ec72066fac5a25dbe7b8121";
      var message = createMessage(recipientAccount, value, transactionHash, homeGasPrice);
      var signature = await sign(twoAuthorities[0], message)
      var vrs = signatureToVRS(signature);
      false.should.be.equal(await foreignBridgeWithMultiSignatures.deposits(transactionHash))
      await token.mint(foreignBridgeWithMultiSignatures.address, value);
      await foreignBridgeWithMultiSignatures.deposit([vrs.v, vrs.v], [vrs.r, vrs.r], [vrs.s, vrs.s], message).should.be.rejectedWith(ERROR_MSG)
      balanceBefore.should.be.bignumber.equal(await token.balanceOf(recipientAccount));
    })

  })

  describe('#onTokenTransfer', async () => {

    it('can only be called if user before call approve', async ()=> {
      const user = accounts[4]
      token = await SENC.new();
      await token.unpause();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      await token.mint(user, halfEther).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.rejectedWith(ERROR_MSG);
      await token.approve(foreignBridge.address, halfEther, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.fulfilled;
      '0'.should.be.bignumber.equal(await token.balanceOf(user));
      halfEther.should.be.bignumber.equal(await token.balanceOf(foreignBridge.address));
    })

    it('should only let to send within maxPerTx limit', async () => {
      const user = accounts[4]
      const valueMoreThanLimit = halfEther.add(1);
      token = await SENC.new();
      await token.unpause();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      await token.mint(user, oneEther.add(1)).should.be.fulfilled;
      await token.approve(foreignBridge.address, valueMoreThanLimit, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(valueMoreThanLimit, {from: user}).should.be.rejectedWith(ERROR_MSG);
      oneEther.add(1).should.be.bignumber.equal(await token.balanceOf(user));
      await token.approve(foreignBridge.address, halfEther, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.fulfilled;
      valueMoreThanLimit.should.be.bignumber.equal(await token.balanceOf(user));
      await token.approve(foreignBridge.address, halfEther, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(halfEther, {from: user}).should.be.fulfilled;
      '1'.should.be.bignumber.equal(await token.balanceOf(user));
      await foreignBridge.onTokenTransfer('1', {from: user}).should.be.rejectedWith(ERROR_MSG);
    })

    it('should not let to withdraw less than minPerTx', async () => {
      const user = accounts[4]
      const valueLessThanMinPerTx = minPerTx.sub(1);
      token = await SENC.new();
      await token.unpause();
      foreignBridge = await ForeignBridge.new();
      await foreignBridge.initialize(validatorContract.address, token.address, oneEther, halfEther, minPerTx, gasPrice, requireBlockConfirmations);
      await token.mint(user, oneEther).should.be.fulfilled;
      await token.approve(foreignBridge.address, valueLessThanMinPerTx, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(valueLessThanMinPerTx, {from: user}).should.be.rejectedWith(ERROR_MSG);
      oneEther.should.be.bignumber.equal(await token.balanceOf(user));
      await token.approve(foreignBridge.address, minPerTx, {from: user}).should.be.fulfilled;
      await foreignBridge.onTokenTransfer(minPerTx, {from: user}).should.be.fulfilled;
      oneEther.sub(minPerTx).should.be.bignumber.equal(await token.balanceOf(user));
    })

  })

  describe('#setting limits', async () => {

    let foreignBridge;

    beforeEach(async () => {
      token = await SENC.new();
      await token.unpause();
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
    it('can send erc20', async () => {
      const owner = accounts[0];
      token = await SENC.new();
      await token.unpause();
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

})
