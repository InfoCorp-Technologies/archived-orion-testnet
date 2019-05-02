const Web3Utils = require('web3-utils');
const HomeBridge = artifacts.require("HomeBridgeErcToErc.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");
const SeniToken = artifacts.require("SeniToken.sol");
const Whitelist = artifacts.require("Whitelist.sol");
const TollBox = artifacts.require("TollBox.sol");
const { ERROR_MSG, ZERO_ADDRESS } = require('../setup.js');
const tollFee = web3.toBigNumber(web3.toWei(10, "ether"));
const minPerTx = web3.toBigNumber(web3.toWei(11, "ether"));
const requireBlockConfirmations = 8;
const gasPrice = Web3Utils.toWei('1', 'gwei');
const homeDailyLimit = web3.toBigNumber(web3.toWei(10000, "ether"));
const homeMaxPerTx = web3.toBigNumber(web3.toWei(100, "ether"));
const foreignDailyLimit = homeDailyLimit
const foreignMaxPerTx = homeMaxPerTx
const oneEther = web3.toBigNumber(web3.toWei(1, "ether"));
const halfEther = web3.toBigNumber(web3.toWei(0.5, "ether"));

contract('TollBox', async (accounts) => {
  let homeContract, token, whitelistContract, tollContract;
  const owner = accounts[0]
  const operator = accounts[1]
  const creditor = accounts[2]
  const nonCreditor = accounts[3]
  const rate = 20;

  beforeEach(async () => {
    whitelistContract = await Whitelist.new(owner);
    homeContract = await HomeBridge.new()
    token = await SeniToken.new("Some ERC20", "RSZT", 18, whitelistContract.address, { from: owner });
    tollContract = await TollBox.new(rate, token.address, homeContract.address, { from: owner })
    await tollContract.addOperator(operator, { from: owner })
  })

  it('default values', async () => {
    const tokenAddress = await tollContract.token()
    assert.equal(tokenAddress, token.address)

    const homeContractAddress = await tollContract.homeContract()
    assert.equal(homeContractAddress, homeContract.address)

    const dailyLimitRate = await tollContract.dailyLimitRate()
    assert.equal(dailyLimitRate, 20)
  })

  it('set dailyLimitRate', async () => {
    '20'.should.be.bignumber.equal(await tollContract.dailyLimitRate())
    await tollContract.setDailyLimitRate(0, { from: operator }).should.be.rejectedWith(ERROR_MSG);
    await tollContract.setDailyLimitRate(101, { from: operator }).should.be.rejectedWith(ERROR_MSG);
    await tollContract.setDailyLimitRate(50, { from: operator }).should.be.fulfilled;
    '50'.should.be.bignumber.equal(await tollContract.dailyLimitRate())
  })

  it('valid constructor variables', async () => {
    tollContract = await TollBox.new(0, token.address, homeContract.address).should.be.rejectedWith(ERROR_MSG);
    tollContract = await TollBox.new(20, ZERO_ADDRESS, homeContract.address).should.be.rejectedWith(ERROR_MSG);
    tollContract = await TollBox.new(20, token.address, ZERO_ADDRESS).should.be.rejectedWith(ERROR_MSG);
    tollContract = await TollBox.new(20, token.address, homeContract.address).should.be.fulfilled;
  })

  describe('#creditor', async () => {
    it('only operators can add creditors', async () => {
      await tollContract.addCreditor(creditor, { from: creditor }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.addCreditor(ZERO_ADDRESS, { from: operator }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.addCreditor(creditor, { from: operator }).should.be.fulfilled;
      true.should.be.equal(await tollContract.isCreditor(creditor))
    })

    it('only operators can remove creditors', async () => {
      await tollContract.removeCreditor(creditor, { from: operator }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.addCreditor(creditor, { from: operator }).should.be.fulfilled;
      await tollContract.removeCreditor(creditor, { from: nonCreditor }).should.be.rejectedWith(ERROR_MSG);
      true.should.be.equal(await tollContract.isCreditor(creditor))
      await tollContract.removeCreditor(ZERO_ADDRESS, { from: operator }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.removeCreditor(creditor, { from: operator }).should.be.fulfilled;
      false.should.be.equal(await tollContract.isCreditor(creditor))
    })
  })

  describe('#withdraw', async () => {
    let dayLimitAmount;

    beforeEach(async () => {
      await tollContract.addCreditor(creditor, { from: operator });
      await whitelistContract.addAddresses([creditor, tollContract.address, ], { from: owner });
    })

    it('can transfer tokens to tollBox', async () => {
      await token.mint(tollContract.address, oneEther, { from: owner }).should.be.fulfilled;
      oneEther.should.be.bignumber.equal(await token.balanceOf(tollContract.address))
    })

    it('whitelisted creditor can withdraw dayLimitAmount', async () => {
      await token.mint(tollContract.address, oneEther, { from: owner }).should.be.fulfilled;
      dayLimitAmount = await tollContract.getDailyLimitAmount();
      await tollContract.withdraw(dayLimitAmount, { from: nonCreditor }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.withdraw(dayLimitAmount, { from: creditor }).should.be.fulfilled;
    })

    it('non-whitelisted creditor can not withdraw', async () => {
      await token.mint(tollContract.address, oneEther, { from: owner }).should.be.fulfilled;
      dayLimitAmount = await tollContract.getDailyLimitAmount();
      const creditor2 = accounts[4];
      await tollContract.addCreditor(creditor2, { from: operator }).should.be.fulfilled;
      await tollContract.withdraw(dayLimitAmount, { from: creditor2 }).should.be.rejectedWith(ERROR_MSG);
    })

    it('can only withdraw amounts between 1 and dayLimitAmount', async () => {
      await token.mint(tollContract.address, oneEther, { from: owner }).should.be.fulfilled;
      await tollContract.withdraw('0', { from: creditor }).should.be.rejectedWith(ERROR_MSG);
      await tollContract.withdraw(halfEther, { from: creditor }).should.be.rejectedWith(ERROR_MSG);
      const halfDayLimitAmount = (await tollContract.getDailyLimitAmount()).div(2);
      await tollContract.withdraw(halfDayLimitAmount, { from: creditor }).should.be.fulfilled;
    })

    it('can only withdraw once per day', async () => {
      token.mint(tollContract.address, oneEther, { from: owner }).should.be.fulfilled;
      const halfDayLimitAmount = (await tollContract.getDailyLimitAmount()).div(2);
      await tollContract.withdraw(halfDayLimitAmount, { from: creditor }).should.be.fulfilled;
      await tollContract.withdraw(halfDayLimitAmount, { from: creditor }).should.be.rejectedWith(ERROR_MSG);
    })
  })

  describe('#fallBack', async () => {
    beforeEach(async () => {
      validatorContract = await BridgeValidators.new()
      await validatorContract.initialize(1, [accounts[8]], owner)
      await tollContract.addOperator(operator, { from: owner })
      await homeContract.initialize(
        validatorContract.address,
        whitelistContract.address,
        tollContract.address,
        tollFee,
        homeDailyLimit,
        homeMaxPerTx,
        minPerTx,
        gasPrice,
        requireBlockConfirmations,
        token.address,
        foreignDailyLimit,
        foreignMaxPerTx,
        owner
      ).should.be.fulfilled;
      await tollContract.addCreditor(creditor, { from: operator })
      await whitelistContract.addAddresses([creditor, tollContract.address, homeContract.address], { from: owner }).should.be.fulfilled;
    })

    it('send tokens to home contract when creditos execute fallBack function', async () => {
      await token.mint(creditor, oneEther, { from: owner }).should.be.fulfilled;
      '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await token.balanceOf(tollContract.address));
      oneEther.should.be.bignumber.equal(await token.balanceOf(creditor));

      const result = await token.transferAndCall(tollContract.address, halfEther, '0x', { from: creditor }).should.be.fulfilled;

      result.logs[1].event.should.be.equal("Transfer")
      result.logs[1].args.should.be.deep.equal({
        from: creditor,
        to: tollContract.address,
        value: halfEther,
        data: '0x'
      })
      result.logs[3].event.should.be.equal("Transfer")
      result.logs[3].args.should.be.deep.equal({
        from: tollContract.address,
        to: homeContract.address,
        value: halfEther,
        data: creditor
      })
      result.logs[4].event.should.be.equal("Burn")
      result.logs[4].args.should.be.deep.equal({
        burner: homeContract.address,
        value: halfEther
      })
      const homeLastEvent = await getLastEvents(homeContract, 'UserRequestForSignature');
      homeLastEvent[0].args.should.be.deep.equal({
        recipient: creditor,
        value: halfEther
      })

      '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await token.balanceOf(tollContract.address));
      halfEther.should.be.bignumber.equal(await token.balanceOf(creditor));
    })

    it('only creditors can call transferAndCall', async () => {
      await whitelistContract.addAddresses([nonCreditor], { from: owner }).should.be.fulfilled;
      await token.mint(nonCreditor, oneEther, { from: owner }).should.be.fulfilled;
      '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await token.balanceOf(tollContract.address));
      oneEther.should.be.bignumber.equal(await token.balanceOf(nonCreditor));

      await token.transferAndCall(tollContract.address, halfEther, '0x', { from: nonCreditor }).should.be.rejectedWith(ERROR_MSG);

      '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await token.balanceOf(tollContract.address));
      oneEther.should.be.bignumber.equal(await token.balanceOf(nonCreditor));
    })

    it('only SENI token can call onTokenTransfer', async () => {
      otherWhitelistContract = await Whitelist.new(owner);
      const otherToken = await SeniToken.new("Other ERC20", "ASD", 18, otherWhitelistContract.address, { from: owner });
      await otherWhitelistContract.addAddresses([creditor], { from: owner }).should.be.fulfilled;

      await otherToken.mint(creditor, oneEther, { from: owner }).should.be.fulfilled;
      '0'.should.be.bignumber.equal(await otherToken.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await otherToken.balanceOf(tollContract.address));
      oneEther.should.be.bignumber.equal(await otherToken.balanceOf(creditor));
      true.should.be.equal(await tollContract.isCreditor(creditor));

      await otherToken.transferAndCall(tollContract.address, halfEther, '0x', { from: creditor }).should.be.rejectedWith(ERROR_MSG);

      '0'.should.be.bignumber.equal(await otherToken.balanceOf(homeContract.address));
      '0'.should.be.bignumber.equal(await otherToken.balanceOf(tollContract.address));
      oneEther.should.be.bignumber.equal(await otherToken.balanceOf(creditor));
    })
  })
})

function getLastEvents(contract, eventName) {
  return new Promise((resolve, reject) => {
    const evFilter = contract.allEvents(eventName, {
      fromBlock: 'latest',
      toBlock: 'latest',
    });
    evFilter.get((err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}






