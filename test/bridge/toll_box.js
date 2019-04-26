const Web3Utils = require('web3-utils');
const HomeBridge = artifacts.require("HomeBridgeErcToErc.sol");
const BridgeValidators = artifacts.require("BridgeValidators.sol");
const SeniToken = artifacts.require("SeniToken.sol");
const Whitelist = artifacts.require("Whitelist.sol");
const TollBox = artifacts.require("TollBox.sol");
const { ERROR_MSG, ZERO_ADDRESS } = require('../setup.js');
const tollFee = web3.toBigNumber(web3.toWei(10, "ether"));
const minPerTx = web3.toBigNumber(web3.toWei(11, "ether"));
const minValueToTransfer = web3.toBigNumber(web3.toWei(11, "ether"));
const requireBlockConfirmations = 8;
const gasPrice = Web3Utils.toWei('1', 'gwei');
const homeDailyLimit = web3.toBigNumber(web3.toWei(10000, "ether"));
const homeMaxPerTx = web3.toBigNumber(web3.toWei(100, "ether"));
const foreignDailyLimit = homeDailyLimit
const foreignMaxPerTx = homeMaxPerTx

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
    const oneEther = web3.toBigNumber(web3.toWei(1, "ether"));
    const halfEther = web3.toBigNumber(web3.toWei(0.5, "ether"));

    beforeEach(async () => {
      await tollContract.addCreditor(creditor, { from: operator });
      await whitelistContract.addAddresses([creditor], { from: owner });
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
    // TODO:

    // beforeEach(async () => {
      // validatorContract = await BridgeValidators.new()
      // await validatorContract.initialize(1, [accounts[4]], accounts[5])
      // whitelistContract = await Whitelist.new(owner);
      // homeContract = await HomeBridge.new()
      // token = await SeniToken.new("Some ERC20", "RSZT", 18, whitelistContract.address, { from: owner });
      // tollContract = await TollBox.new(rate, token.address, homeContract.address, { from: owner })
      // await tollContract.addOperator(operator, { from: owner })
      // await homeContract.initialize(
      //   validatorContract.address,
      //   whitelistContract.address,
      //   tollContract.address,
      //   tollFee,
      //   homeDailyLimit,
      //   homeMaxPerTx,
      //   minPerTx,
      //   gasPrice,
      //   requireBlockConfirmations,
      //   token.address,
      //   foreignDailyLimit,
      //   foreignMaxPerTx,
      //   owner
      // ).should.be.fulfilled;
    // })
    // it('when tollAddress made deposit, not discount the toll and not verify the minPerTx', async () => {
    //   '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
    //   '0'.should.be.bignumber.equal(await token.balanceOf(tollAddress));
    //   '15000000000000000000'.should.be.bignumber.equal(await token.balanceOf(user));

    //   await token.transferAndCall(homeContract.address, amount, '0x', { from: user }).should.be.fulfilled;

    //   '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
    //   '10000000000000000000'.should.be.bignumber.equal(await token.balanceOf(tollAddress));
    //   '0'.should.be.bignumber.equal(await token.balanceOf(user));

    //   const tollAmount = web3.toBigNumber(web3.toWei(10, "ether"));
    //   const result = await token.transferAndCall(homeContract.address, tollAmount, '0x', { from: tollAddress }).should.be.fulfilled;
    //   result.logs[0].event.should.be.equal("Transfer")
    //   result.logs[0].args.should.be.deep.equal({
    //     from: tollAddress,
    //     to: homeContract.address,
    //     value: tollAmount
    //   })
    //   result.logs[2].event.should.be.equal("Burn")
    //   result.logs[2].args.should.be.deep.equal({
    //     burner: homeContract.address,
    //     value: tollAmount
    //   })

    //   const homeLastEvent = await getLastEvents(homeContract, 'UserRequestForSignature');
    //   homeLastEvent[0].args.should.be.deep.equal({
    //     recipient: '0x0000000000000000000000000000000000000000',
    //     value: tollAmount
    //   })

    //   '0'.should.be.bignumber.equal(await token.balanceOf(homeContract.address));
    //   '0'.should.be.bignumber.equal(await token.balanceOf(tollAddress));
    //   '0'.should.be.bignumber.equal(await token.balanceOf(user));
    // })


    // function getLastEvents(contract, eventName) {
    //   return new Promise((resolve, reject) => {
    //     const evFilter = contract.allEvents(eventName, {
    //       fromBlock: 'latest',
    //       toBlock: 'latest',
    //     });
    //     evFilter.get((err, res) => {
    //       if (err) return reject(err);
    //       resolve(res);
    //     });
    //   });
    // }
  })
})







