const SENI = artifacts.require("SeniToken.sol");
const SENC = artifacts.require("SENCTest.sol");
const ERC677ReceiverTest = artifacts.require("ERC677ReceiverTest.sol")
const { ERROR_MSG, ZERO_ADDRESS } = require('../setup');
const Web3Utils = require('web3-utils');
const HomeErcToErcBridge = artifacts.require("HomeBridgeErcToErc.sol");
const ForeignBridgeErcToErc = artifacts.require("ForeignBridgeErcToErc.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");
const Whitelist = artifacts.require("Whitelist.sol");
const TollBox = artifacts.require("TollBox.sol");
const tollFee = web3.toBigNumber(web3.toWei(10, "ether"));
const minPerTx = web3.toBigNumber(web3.toWei(5, "ether"));
const minValueToTransfer = web3.toBigNumber(web3.toWei(15, "ether"));
const requireBlockConfirmations = 8;
const gasPrice = Web3Utils.toWei('1', 'gwei');
const homeDailyLimit = web3.toBigNumber(web3.toWei(100000, "ether"));
const homeMaxPerTx = web3.toBigNumber(web3.toWei(100, "ether"));
const foreignDailyLimit = homeDailyLimit
const foreignMaxPerTx = homeMaxPerTx

contract('SENI Token', async (accounts) => {
  let seniToken, whitelistContract, tollContract;
  const owner = accounts[0]
  const user = accounts[1];
  const nonAuthUser = accounts[2];

  beforeEach(async () => {
    whitelistContract = await Whitelist.new(owner);
    seniToken = await SENI.new("Sentinel Chain Internal Token", "SENI", 18, whitelistContract.address);
    sencToken = await SENC.new("Sentinel Chain Ethereum Token", "SENC", 18);
  })

  it('default values', async () => {
    const symbol = await seniToken.symbol()
    assert.equal(symbol, 'SENI')

    const decimals = await seniToken.decimals()
    assert.equal(decimals, 18)

    const name = await seniToken.name()
    assert.equal(name, "Sentinel Chain Internal Token")

    const totalSupply = await seniToken.totalSupply();
    assert.equal(totalSupply, 0);

    const mintingFinished = await seniToken.mintingFinished();
    assert.equal(mintingFinished, false);

    const whitelistAddress = await seniToken.whitelist();
    assert.equal(whitelistAddress, whitelistContract.address);
  })

  describe('#bridgeContract', async () => {
    it('can set bridge contract', async () => {
      const homeErcToErcContract = await HomeErcToErcBridge.new();
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);

      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;

      (await seniToken.bridgeContract()).should.be.equal(homeErcToErcContract.address);
    })

    it('can set whitelist contract', async () => {
      (await seniToken.whitelist()).should.be.equal(whitelistContract.address);
      const newWhitelistContract = await Whitelist.new(owner);
      await seniToken.setWhitelistContract(newWhitelistContract.address).should.be.fulfilled;

      (await seniToken.whitelist()).should.be.equal(newWhitelistContract.address);
    })

    it('only owner can set bridge contract', async () => {
      const homeErcToErcContract = await HomeErcToErcBridge.new();
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);

      await seniToken.setBridgeContract(homeErcToErcContract.address, { from: user }).should.be.rejectedWith(ERROR_MSG);
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);

      await seniToken.setBridgeContract(homeErcToErcContract.address, { from: owner }).should.be.fulfilled;
      (await seniToken.bridgeContract()).should.be.equal(homeErcToErcContract.address);
    })

    it('only owner can set whitelist contract', async () => {
      (await seniToken.whitelist()).should.be.equal(whitelistContract.address);
      const newWhitelistContract = await Whitelist.new(owner);
      await seniToken.setWhitelistContract(newWhitelistContract.address, { from: user }).should.be.rejectedWith(ERROR_MSG);
      (await seniToken.whitelist()).should.be.equal(whitelistContract.address);

      await seniToken.setWhitelistContract(newWhitelistContract.address, { from: owner }).should.be.fulfilled;
      (await seniToken.whitelist()).should.be.equal(newWhitelistContract.address);
    })

    it('fail to set invalid bridge contract address', async () => {
      const invalidContractAddress = '0xaaB52d66283F7A1D5978bcFcB55721ACB467384b';
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);

      await seniToken.setBridgeContract(invalidContractAddress).should.be.rejectedWith(ERROR_MSG);
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);

      await seniToken.setBridgeContract(ZERO_ADDRESS).should.be.rejectedWith(ERROR_MSG);
      (await seniToken.bridgeContract()).should.be.equal(ZERO_ADDRESS);
    })
  })

  describe('#mint', async () => {
    it('can mint to whitelisted user by owner', async () => {
      (await seniToken.totalSupply()).should.be.bignumber.equal(0);
      await whitelistContract.addAddresses([user], { from: owner });
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      (await seniToken.totalSupply()).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(1);
    })

    it('can not mint to non-whitelisted user by owner', async () => {
      (await seniToken.totalSupply()).should.be.bignumber.equal(0);
      await seniToken.mint(nonAuthUser, 1, { from: owner }).should.be.rejectedWith(ERROR_MSG);
      await whitelistContract.addAddresses([nonAuthUser], { from: owner });
      await seniToken.mint(nonAuthUser, 1, { from: owner }).should.be.fulfilled;
      (await seniToken.totalSupply()).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(nonAuthUser)).should.be.bignumber.equal(1);
    })

    it('no one can call finishMinting', async () => {
      await seniToken.finishMinting().should.be.rejectedWith(ERROR_MSG)
    })

    it('cannot mint by non-owner', async () => {
      (await seniToken.totalSupply()).should.be.bignumber.equal(0);
      await seniToken.mint(user, 1, { from: user }).should.be.rejectedWith(ERROR_MSG);
      (await seniToken.totalSupply()).should.be.bignumber.equal(0);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
    })
  })

  describe('#transfer', async () => {
    let homeErcToErcContract, foreignErcToErcBridge, validatorContract

    beforeEach(async () => {
      validatorContract = await BridgeValidators.new()
      const authorities = [accounts[2]];
      await validatorContract.initialize(1, authorities, owner)
      homeErcToErcContract = await HomeErcToErcBridge.new()
      tollContract = await TollBox.new(20, seniToken.address, homeErcToErcContract.address)
      await whitelistContract.addAddresses([user, tollContract.address, homeErcToErcContract.address], { from: owner })
      await homeErcToErcContract.initialize(
        validatorContract.address,
        whitelistContract.address,
        tollContract.address,
        tollFee,
        homeDailyLimit,
        homeMaxPerTx,
        minPerTx,
        gasPrice,
        requireBlockConfirmations,
        seniToken.address,
        foreignDailyLimit,
        foreignMaxPerTx,
        owner
      )
      foreignErcToErcBridge = await ForeignBridgeErcToErc.new()
      await foreignErcToErcBridge.initialize(
        validatorContract.address,
        sencToken.address,
        requireBlockConfirmations,
        gasPrice,
        foreignMaxPerTx,
        homeDailyLimit,
        homeMaxPerTx,
        owner
      )
    })

    it('sends tokens to whitelisted recipient', async () => {
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      await seniToken.transfer(user, 1, { from: owner }).should.be.rejectedWith(ERROR_MSG);
      await whitelistContract.addAddresses([owner], { from: owner });
      const { logs } = await seniToken.transfer(owner, 1, { from: user }).should.be.fulfilled;
      (await seniToken.balanceOf(owner)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      logs[0].event.should.be.equal("Transfer")
      logs[0].args.should.be.deep.equal({
        from: user,
        to: owner,
        value: new web3.BigNumber(1)
      })
    })

    it('sends tokens to non-whitelisted recipient', async () => {
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      await seniToken.transfer(nonAuthUser, 1, { from: user }).should.be.rejectedWith(ERROR_MSG);
      await whitelistContract.addAddresses([nonAuthUser], { from: owner });
      const { logs } = await seniToken.transfer(nonAuthUser, 1, { from: user }).should.be.fulfilled;
      (await seniToken.balanceOf(nonAuthUser)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      logs[0].event.should.be.equal("Transfer")
      logs[0].args.should.be.deep.equal({
        from: user,
        to: nonAuthUser,
        value: new web3.BigNumber(1)
      })
    })

    it('use transferFrom to non-whitelisted recipient', async () => {
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      await seniToken.approve(nonAuthUser, 1, { from: user }).should.be.fulfilled;

      await seniToken.transferFrom(user, nonAuthUser, 1, { from: nonAuthUser }).should.be.rejectedWith(ERROR_MSG);
      await whitelistContract.addAddresses([nonAuthUser], { from: owner });
      const { logs } = await seniToken.transferFrom(user, nonAuthUser, 1, { from: nonAuthUser }).should.be.fulfilled;
      (await seniToken.balanceOf(nonAuthUser)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      logs[0].event.should.be.equal("Transfer")
      logs[0].args.should.be.deep.equal({
        from: user,
        to: nonAuthUser,
        value: new web3.BigNumber(1)
      })
    })

    it('sends tokens to bridge contract', async () => {
      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.mint(user, minValueToTransfer, { from: owner }).should.be.fulfilled;

      const result = await seniToken.transfer(homeErcToErcContract.address, minValueToTransfer, { from: user }).should.be.fulfilled;
      result.logs[0].event.should.be.equal("Transfer")
      result.logs[0].args.should.be.deep.equal({
        from: user,
        to: homeErcToErcContract.address,
        value: minValueToTransfer
      })
    })

    it('sends tokens to contract that does not contains onTokenTransfer method', async () => {
      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.mint(user, minValueToTransfer, { from: owner }).should.be.fulfilled;
      await whitelistContract.addAddresses([validatorContract.address], { from: owner })
      const result = await seniToken.transfer(validatorContract.address, minValueToTransfer, { from: user }).should.be.fulfilled;
      result.logs[0].event.should.be.equal("Transfer")
      result.logs[0].args.should.be.deep.equal({
        from: user,
        to: validatorContract.address,
        value: minValueToTransfer
      })
      result.logs[1].event.should.be.equal("ContractFallbackCallFailed")
      result.logs[1].args.should.be.deep.equal({
        from: user,
        to: validatorContract.address,
        value: minValueToTransfer
      })
    })

    it('fail to send tokens to bridge contract out of limits', async () => {
      const lessThanMin = web3.toBigNumber(web3.toWei(0.0001, "ether"))
      await seniToken.mint(user, web3.toWei(1, "ether"), { from: owner }).should.be.fulfilled;

      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.transfer(homeErcToErcContract.address, lessThanMin, { from: user }).should.be.rejectedWith(ERROR_MSG);
    })
  })

  describe("#burn", async () => {
    it('can burn', async () => {
      await seniToken.burn(100, { from: owner }).should.be.rejectedWith(ERROR_MSG);
      await whitelistContract.addAddresses([user], { from: owner });
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      await seniToken.burn(1, { from: user }).should.be.fulfilled;
      (await seniToken.totalSupply()).should.be.bignumber.equal(0);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
    })
  })

  describe('#transferAndCall', () => {
    let homeErcToErcContract, foreignErcToErcBridge, validatorContract

    beforeEach(async () => {
      validatorContract = await BridgeValidators.new()
      const authorities = [accounts[2]];
      await validatorContract.initialize(1, authorities, owner)
      homeErcToErcContract = await HomeErcToErcBridge.new()
      tollContract = await TollBox.new(20, seniToken.address, homeErcToErcContract.address)
      await whitelistContract.addAddresses([user, tollContract.address, homeErcToErcContract.address], { from: owner })
      await homeErcToErcContract.initialize(validatorContract.address, whitelistContract.address, tollContract.address, tollFee, homeDailyLimit, homeMaxPerTx, minPerTx, gasPrice, requireBlockConfirmations, seniToken.address, foreignDailyLimit, foreignMaxPerTx, owner)
      foreignErcToErcBridge = await ForeignBridgeErcToErc.new()
      await foreignErcToErcBridge.initialize(validatorContract.address, sencToken.address, requireBlockConfirmations, gasPrice, foreignMaxPerTx,
        homeDailyLimit, homeMaxPerTx, owner);
    })

    it('calls contractFallback', async () => {
      const receiver = await ERC677ReceiverTest.new();
      await whitelistContract.addAddresses([receiver.address], { from: owner });
      (await receiver.from()).should.be.equal('0x0000000000000000000000000000000000000000');
      (await receiver.value()).should.be.bignumber.equal('0');
      (await receiver.data()).should.be.equal('0x');
      (await receiver.someVar()).should.be.bignumber.equal('0');

      var ERC677ReceiverTestWeb3 = web3.eth.contract(ERC677ReceiverTest.abi);
      var ERC677ReceiverTestWeb3Instance = ERC677ReceiverTestWeb3.at(receiver.address);
      var callDoSomething123 = ERC677ReceiverTestWeb3Instance.doSomething.getData(123);

      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;
      await seniToken.transferAndCall(seniToken.address, 1, callDoSomething123, { from: user }).should.be.rejectedWith(ERROR_MSG);
      await seniToken.transferAndCall('0x0000000000000000000000000000000000000000', 1, callDoSomething123, { from: user }).should.be.rejectedWith(ERROR_MSG);
      await seniToken.transferAndCall(receiver.address, 1, callDoSomething123, { from: user }).should.be.fulfilled;
      (await seniToken.balanceOf(receiver.address)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      (await receiver.from()).should.be.equal(user);
      (await receiver.value()).should.be.bignumber.equal(1);
      (await receiver.data()).should.be.equal(callDoSomething123);
      (await receiver.someVar()).should.be.bignumber.equal('123');
    })

    it('sends tokens to bridge contract', async () => {
      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.mint(user, minValueToTransfer, { from: owner }).should.be.fulfilled;

      const result = await seniToken.transferAndCall(homeErcToErcContract.address, minValueToTransfer, '0x', { from: user }).should.be.fulfilled;
      result.logs[0].event.should.be.equal("Transfer")
      result.logs[0].args.should.be.deep.equal({
        from: user,
        to: homeErcToErcContract.address,
        value: minValueToTransfer
      })
    })

    it('fail to sends tokens to contract that does not contains onTokenTransfer method', async () => {
      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.mint(user, web3.toWei(1, "ether"), { from: owner }).should.be.fulfilled;

      await seniToken.transferAndCall(validatorContract.address, minPerTx, '0x', { from: user }).should.be.rejectedWith(ERROR_MSG);
    })

    it('fail to send tokens to bridge contract out of limits', async () => {
      const lessThanMin = web3.toBigNumber(web3.toWei(0.0001, "ether"))
      await seniToken.mint(user, web3.toWei(1, "ether"), { from: owner }).should.be.fulfilled;

      await seniToken.setBridgeContract(homeErcToErcContract.address).should.be.fulfilled;
      await seniToken.transferAndCall(homeErcToErcContract.address, lessThanMin, '0x', { from: user }).should.be.rejectedWith(ERROR_MSG);
    })
  })

  describe('#claimtokens', async () => {
    it('can take send ERC20 tokens', async () => {
      const owner = accounts[0];
      const halfEther = web3.toBigNumber(web3.toWei(0.5, "ether"));
      let tokenSecond = await SENC.new("Roman Token", "RST", 18);

      await whitelistContract.addAddresses([accounts[0]], { from: owner });
      await tokenSecond.mint(accounts[0], halfEther).should.be.fulfilled;
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))
      await tokenSecond.transfer(seniToken.address, halfEther);
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[0]))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(seniToken.address))

      await seniToken.claimTokens(tokenSecond.address, accounts[3], { from: owner });
      '0'.should.be.bignumber.equal(await tokenSecond.balanceOf(seniToken.address))
      halfEther.should.be.bignumber.equal(await tokenSecond.balanceOf(accounts[3]))
    })
  })

  describe('#transfer', async () => {
    it('if transfer called on contract, onTokenTransfer is also invoked', async () => {
      const receiver = await ERC677ReceiverTest.new();
      await whitelistContract.addAddresses([receiver.address], { from: owner });
      (await receiver.from()).should.be.equal('0x0000000000000000000000000000000000000000');
      (await receiver.value()).should.be.bignumber.equal('0');
      (await receiver.data()).should.be.equal('0x');
      (await receiver.someVar()).should.be.bignumber.equal('0');

      await whitelistContract.addAddresses([user], { from: owner });
      await seniToken.mint(user, 1, { from: owner }).should.be.fulfilled;

      const { logs } = await seniToken.transfer(receiver.address, 1, { from: user }).should.be.fulfilled;

      (await seniToken.balanceOf(receiver.address)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      (await receiver.from()).should.be.equal(user);
      (await receiver.value()).should.be.bignumber.equal(1);
      (await receiver.data()).should.be.equal('0x');
      logs[0].event.should.be.equal("Transfer")
    })

    it('if transfer called on contract, still works even if onTokenTransfer doesnot exist', async () => {
      const someContract = await SENI.new("Some", "Token", 18, whitelistContract.address);
      await whitelistContract.addAddresses([user, accounts[0], someContract.address,], { from: owner });
      await seniToken.mint(user, 2, { from: owner }).should.be.fulfilled;
      const tokenTransfer = await seniToken.transfer(someContract.address, 1, { from: user }).should.be.fulfilled;
      const tokenTransfer2 = await seniToken.transfer(accounts[0], 1, { from: user }).should.be.fulfilled;
      (await seniToken.balanceOf(someContract.address)).should.be.bignumber.equal(1);
      (await seniToken.balanceOf(user)).should.be.bignumber.equal(0);
      tokenTransfer.logs[0].event.should.be.equal("Transfer")
      tokenTransfer2.logs[0].event.should.be.equal("Transfer")
    })
  })
})
