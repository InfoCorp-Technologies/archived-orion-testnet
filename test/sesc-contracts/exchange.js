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

contract('Exchange', async (accounts) => {
    let owner = accounts[0];
    let whiteUser = accounts[1];
    let blackUser = accounts[2];
    let oracle = accounts[3];

    beforeEach(async () => {
        exchange = await Exchange.new(owner, oracle);
        token = await LCToken.new("Local Currency Token Myanmar", "LCT.MMK", 18, exchange.address, { from: owner });
        await exchange.setCurrency(token.address);
    })

    describe('Create and interact with Escrow', function() {

        const oneSeni = 1000000000000000000;

        it('Add/Remove currecy', async () => {
            let otherToken = await LCToken.new("Local Currency Token ASD", "LCT.ASD", 18, exchange.address, { from: owner });
            const addTx = await exchange.setCurrency(otherToken.address, { from: owner }).should.be.fulfilled;
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
            await exchange.exchange(oneSeni, "LCT.ARG", { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('User exchange 0 LCT.MMK', async () => {
            await exchange.exchange(0, "LCT.MMK", { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('User exchange 1 LCT.MMK with SENI<->LCT.MMK rate 1:2', async () => {
            '0'.should.be.bignumber.equal(await token.balanceOf(whiteUser));
            // create escrow contract
            const exchangeTx = await exchange.exchange(oneSeni, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            exchangeTx['logs'][0].args.buyer.should.be.equal(whiteUser);
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            (escrowState.Created).should.be.bignumber.equal(await escrow.state());
            // oracle initializ escrow with rate 1:2
            const oracleTx = await escrow.initialize(oneSeni / 2, { from: oracle }).should.be.fulfilled;
            (escrowState.Initialized).should.be.bignumber.equal(await escrow.state());
            const seniNedeed = oracleTx['logs'][0].args.value.toNumber();
            // oralce try to re-initialize escrow
            await escrow.initialize(oneSeni / 3, { from: oracle }).should.be.rejectedWith(ERROR_MSG);
            // user deposit seni to active escrow and receive LCT
            await escrow.sendTransaction({ from: whiteUser, value: oneSeni * 2}).should.be.fulfilled;
            seniNedeed.should.be.bignumber.equal(await web3.eth.getBalance(escrow.address));
            (escrowState.Active).should.be.bignumber.equal(await escrow.state());
            oneSeni.should.be.bignumber.equal(await token.balanceOf(whiteUser));
        });

        it('User try to send SENI to Escrow before the rate is set', async () => {
            const exchangeTx = await exchange.exchange(oneSeni, "LCT.MMK", { from: whiteUser }).should.be.fulfilled;
            const escrow = await Escrow.at(exchangeTx['logs'][0].args.escrow);
            await escrow.sendTransaction({ from: whiteUser, value: oneSeni * 2}).should.be.rejectedWith(ERROR_MSG);
        });

        it('Create an Escrow from outside of Exchange', async () => {
            const escrow = await Escrow.new(oneSeni, whiteUser, exchange.address, token.address, oracle, { from: blackUser }).should.be.fulfilled;
            // user whitout permisssion try to initializ escrow with rate 1:2
            await escrow.initialize(oneSeni / 2, { from: blackUser }).should.be.rejectedWith(ERROR_MSG);
            // user whitout permisssion try to deposit seni to active escrow and receive LCT
            await escrow.sendTransaction({ from: whiteUser, value: oneSeni * 2}).should.be.rejectedWith(ERROR_MSG);
        });
    });

    describe('Withdraw SENI from Escrow', function() {

    });
});

function awaitEvent(event, handler) {
    return new Promise((resolve, reject) => {
        function wrappedHandler(...args) {
            Promise.resolve(handler(...args)).then(resolve).catch(reject);
        }
        event.watch(wrappedHandler);
    });
}