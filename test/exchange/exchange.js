const { ERROR_MSG, ZERO_ADDRESS } = require('../setup');
const LCToken = artifacts.require("LCToken.sol");
const Exchange = artifacts.require("Exchange.sol");
const Escrow = artifacts.require("Escrow.sol");

const escrowState = {
    'Created': 0,
    'Initialized': 1,
    'Active': 2,
    'Finalized': 3
};

const VESTING = 4;
const EXPIRATION = 4;
const ONE_SENI = 1000000000000000000;

contract('Exchange', async (accounts) => {
    let owner = accounts[0];
    let whiteUser = accounts[1];
    let blackUser = accounts[2];
    let oracle = accounts[3];

    beforeEach(async () => {
        exchange = await Exchange.new(owner, oracle, VESTING, EXPIRATION);
        token = await LCToken.new("Local Currency Token Myanmar", "LCT.MMK", 18, exchange.address, { from: owner });
        await exchange.addCurrency(token.address);
    })

    it('Set oracle', async () => {
        const anotherOracle = accounts[4];
        await exchange.setOracle(anotherOracle, { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        await exchange.setOracle(anotherOracle, { from: owner }).should.be.fulfilled;
        anotherOracle.should.be.equal(await exchange.oracle());
    });

    it('Set vesting', async () => {
        const anotherVesting = 40;
        await exchange.setVesting(anotherVesting, { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        await exchange.setVesting(anotherVesting, { from: owner }).should.be.fulfilled;
        anotherVesting.should.be.bignumber.equal(await exchange.vesting());
    });

    it('Set expiration', async () => {
        const anotherExpiration = 50;
        await exchange.setExpiration(anotherExpiration, { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        await exchange.setExpiration(anotherExpiration, { from: owner }).should.be.fulfilled;
        anotherExpiration.should.be.bignumber.equal(await exchange.expiration());
    });

    describe('Create and interact with Escrow', function () {
        it('Add/Remove currecy', async () => {
            let otherToken = await LCToken.new("Local Currency Token ASD", "LCT.ASD", 18, exchange.address, { from: owner });
            const addTx = await exchange.addCurrency(otherToken.address, { from: owner }).should.be.fulfilled;
            addTx['logs'][0].event.should.be.equal("CurrencyAdded");
            (otherToken.address).should.be.equal(await exchange.currency("LCT.ASD"));
            (exchange.address).should.be.equal(await otherToken.owner());
            const rmTx = await exchange.removeCurrency("LCT.ASD", { from: owner }).should.be.fulfilled;
            rmTx['logs'][0].event.should.be.equal("OwnershipTransferred");
            rmTx['logs'][1].event.should.be.equal("CurrencyRemoved");
            (ZERO_ADDRESS).should.be.equal(await exchange.currency("LCT.ASD"));
            (owner).should.be.equal(await otherToken.owner());
        });

        it('User exchange 1 LCT.ARG nonexistent currency', async () => {
            await exchange.exchange(ONE_SENI, "LCT.ARG", { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('User exchange 0 LCT.MMK', async () => {
            await exchange.exchange(0, "LCT.MMK", { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('Count of escrow created by user', async () =>{
            '0'.should.be.bignumber.equal(await exchange.escrowCountByUser(whiteUser, { from: whiteUser }));
            await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            '1'.should.be.bignumber.equal(await exchange.escrowCountByUser(whiteUser, { from: whiteUser }));
            await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            '3'.should.be.bignumber.equal(await exchange.escrowCountByUser(whiteUser, { from: whiteUser }));
        });

        it('User exchange 1 LCT.MMK with SENI<->LCT.MMK rate 1:2', async () => {
            '0'.should.be.bignumber.equal(await token.balanceOf(whiteUser));
            // create escrow contract
            const exchangeTx = await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            exchangeTx['logs'][0].args.buyer.should.be.equal(whiteUser);
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            (escrowState.Created).should.be.bignumber.equal(await escrow.state());
            // oracle initializ escrow with rate 1:2
            const oracleTx = await escrow.initialize(ONE_SENI / 2, { from: oracle }).should.be.fulfilled;
            (escrowState.Initialized).should.be.bignumber.equal(await escrow.state());
            const seniNedeed = oracleTx['logs'][0].args.value.toNumber();
            // oralce try to re-initialize escrow
            await escrow.initialize(ONE_SENI / 3, { from: oracle }).should.be.rejectedWith(ERROR_MSG);
            // user deposit seni to active escrow and receive LCT
            await escrow.sendTransaction({ from: whiteUser, value: ONE_SENI }).should.be.rejectedWith(ERROR_MSG);
            await escrow.sendTransaction({ from: whiteUser, value: ONE_SENI * 2 }).should.be.fulfilled;
            seniNedeed.should.be.bignumber.equal(await web3.eth.getBalance(escrow.address));
            (escrowState.Active).should.be.bignumber.equal(await escrow.state());
            ONE_SENI.should.be.bignumber.equal(await token.balanceOf(whiteUser));
        });

        it("Escrow doesn't allow deposits after expiration period", async () => {
            const exchangeTx = await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            exchangeTx['logs'][0].args.buyer.should.be.equal(whiteUser);
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            const oracleTx = await escrow.initialize(ONE_SENI / 2, { from: oracle }).should.be.fulfilled;
            const seniNedeed = oracleTx['logs'][0].args.value.toNumber();
            await sleep(EXPIRATION + 1);
            // user deposit seni to active escrow and receive LCT after expiration period
            const balanceBefore = await web3.eth.getBalance(escrow.address);
            await escrow.sendTransaction({ from: whiteUser, value: seniNedeed }).should.be.rejectedWith(ERROR_MSG);
            const balanceAfter = web3.eth.getBalance(escrow.address);
            balanceBefore.should.be.bignumber.equal(balanceAfter);
        });

        it('User try to send SENI to Escrow before the rate is set', async () => {
            const exchangeTx = await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            await escrow.sendTransaction({ from: whiteUser, value: ONE_SENI * 2 }).should.be.rejectedWith(ERROR_MSG);
        });

        it('Create an Escrow from outside of Exchange', async () => {
            const escrow = await Escrow.new(ONE_SENI, VESTING, EXPIRATION, whiteUser, exchange.address, token.address, { from: blackUser }).should.be.fulfilled;
            // user whitout permisssion try to initializ escrow with rate 1:2
            await escrow.initialize(ONE_SENI / 2, { from: blackUser }).should.be.rejectedWith(ERROR_MSG);
            // user whitout permisssion try to deposit seni to active escrow and receive LCT
            await escrow.sendTransaction({ from: whiteUser, value: ONE_SENI * 2 }).should.be.rejectedWith(ERROR_MSG);
            // user whitout permisssion try to activate the escrow manually
            await exchange.escrowActived(whiteUser, ONE_SENI, token.address, { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });
    });

    describe('Withdraw SENI from Escrow', function () {
        it('User withdraw SENI until the deposit is empty', async () => {
            const exchangeTx = await exchange.exchange(ONE_SENI, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            // Oracle set SENI<->LCT.MMK rate 1:2
            await escrow.initialize(ONE_SENI / 2, { from: oracle }).should.be.fulfilled;
            // User deposit 2 SENI and get 1 LCT
            await escrow.sendTransaction({ from: whiteUser, value: ONE_SENI * 2 }).should.be.fulfilled;
            // Withdraw
            const withdrawValue = 500000000000000000; // 0.5 LCT
            // User try to withdraw before vesting period.
            const balanceBefore = await token.balanceOf(whiteUser);
            await token.transferAndCall(escrow.address, withdrawValue, '0x0', { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
            balanceBefore.should.be.bignumber.equal(await token.balanceOf(whiteUser));
            await sleep(VESTING + 1);
            await token.transferAndCall(escrow.address, withdrawValue, '0x0', { from: whiteUser }).should.be.fulfilled;
            (balanceBefore - withdrawValue).should.be.bignumber.equal(await token.balanceOf(whiteUser));
            (escrowState.Active).should.be.bignumber.equal(await escrow.state());
            await token.transferAndCall(escrow.address, withdrawValue, '0x0', { from: whiteUser }).should.be.fulfilled;
            (escrowState.Finalized).should.be.bignumber.equal(await escrow.state());
            '0'.should.be.bignumber.equal(await web3.eth.getBalance(escrow.address));
            await token.transferAndCall(escrow.address, withdrawValue, '0x0', { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });
    });
});

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}