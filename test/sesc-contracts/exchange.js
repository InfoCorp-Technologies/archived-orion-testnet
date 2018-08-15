const { ERROR_MSG, ZERO_ADDRESS } = require('../setup');
const Whitelist = artifacts.require("Whitelist.sol");
const LCToken = artifacts.require("LCToken.sol");
const SentinelExchange = artifacts.require("SentinelExchange.sol");

contract('SentinelExchange', async (accounts) => {
    let owner = accounts[0];
    let whiteUser = accounts[1];
    let blackUser = accounts[3];
    let oracle = accounts[4];

    beforeEach(async () => {
        whitelist = await Whitelist.new({ from: owner });
        await whitelist.addWhitelist([whiteUser], { from: owner });
        exchange = await SentinelExchange.new(whitelist.address, oracle, { from: owner });
        token = await LCToken.new(
            "Local Currency Token Myanmar",
            "LCT.MMK",
            18,
            whitelist.address,
            exchange.address,
            { from: owner });
        await exchange.setCurrency(token.address);
    })

    // Sentinel Exchange contract receive _value SENI to mint _value LCT.MMK  to _user
    async function mintLCT(_user, _value) {
        let exchangeTx = await exchange.exchangeSeni(
            "LCT.MMK", { from: _user, value: _value });
        let exchangeId = exchangeTx['logs'][0].args.exchangeId;
        await exchange.callback(exchangeId, _value, { from: oracle });
    }

    it('Add/Remove currecy', async () => {
        let otherToken = await LCToken.new(
            "Local Currency Token ASD",
            "LCT.ASD",
            18,
            whitelist.address,
            exchange.address,
            { from: owner });
        const addTx =await exchange.setCurrency(otherToken.address, { from: owner }).should.be.fulfilled;
        addTx['logs'][0].event.should.be.equal("CurrencyAdded");
        (otherToken.address).should.be.equal(await exchange.currency("LCT.ASD"));
        (exchange.address).should.be.equal(await otherToken.owner());
        const rmTx = await exchange.removeCurrency("LCT.ASD", { from: owner }).should.be.fulfilled;
        rmTx['logs'][0].event.should.be.equal("OwnershipTransferred");
        rmTx['logs'][1].event.should.be.equal("CurrencyRemoved");
        (ZERO_ADDRESS).should.be.equal(await exchange.currency("LCT.ASD"));
        (owner).should.be.equal(await otherToken.owner());
    });

    it('Whitelisted user exchange 1 SENI to get nonexistent currency (USD)', async () => {
        let value = 1000000000000000000;
        await exchange.exchangeSeni("USD", { from: whiteUser, value: value }).should.be.rejectedWith(ERROR_MSG);
    });

    it('Non-whitelisted user exchange 1 SENI to get LCT.MMK', async () => {
        let value = 1000000000000000000;
        await exchange.exchangeSeni("LCT.MMK", { from: blackUser, value: value }).should.be.rejectedWith(ERROR_MSG);
    });

    it('Whitelisted user exchange 0 SENI to get LCT.MMK', async () => {
        await exchange.exchangeSeni("LCT.MMK", { from: whiteUser, value: 0 }).should.be.rejectedWith(ERROR_MSG);
    });

    it('Whitelisted user exchange 1 SENI with SENI-LCT.MMK rate 2:1', async () => {
        (await token.balanceOf(whiteUser)).toNumber().should.be.equal(0);
        let value = 1000000000000000000;
        let exchangeTx = await exchange.exchangeSeni(
            "LCT.MMK", { from: whiteUser, value: value }).should.be.fulfilled;
        let exchangeId = exchangeTx['logs'][0].args.exchangeId;
        let resultTx = await exchange.callback(exchangeId, value / 2, { from: oracle }).should.be.fulfilled;
        resultTx['logs'][0].event.should.be.equal("Success");
        (await token.balanceOf(whiteUser)).toNumber().should.be.equal(value / 2);
        let exchangeInfo = await exchange.exchangeMap(exchangeId);
        false.should.be.equal(exchangeInfo[0]);
    });

    describe('Whitelisted user must exchange 1 SENI to get 1 LCT.MMK first', function () {
        it('Whitelisted user exchange 0.5 LCT.MMK directly to Exchange contract to get SENI', async () => {
            let value = 1000000000000000000;
            await mintLCT(whiteUser, value);
            await exchange.exchangeLct(whiteUser, value / 2, "LCT.MMK", { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('Whitelisted user exchange 0 LCT.MMK to get SENI', async () => {
            let value = 1000000000000000000;
            await mintLCT(whiteUser, value);
            await token.exchange(0, { from: whiteUser }).should.be.rejectedWith(ERROR_MSG);
        });

        it('Whitelisted user exchange 0.5 LCT.MMK with LCT.MMK-SENI rate 1:4 through LCToken contract', async () => {
            let value = 1000000000000000000;
            await mintLCT(whiteUser, value);
            (await token.balanceOf(whiteUser)).toNumber().should.be.equal(value);
            await token.exchange(value / 2, { from: whiteUser }).should.be.fulfilled;
            let event = exchange.Exchange({});
            let watcher = async function (err, result) {
                event.stopWatching();
                let exchangeId = result.args.exchangeId;
                let oldBalance = web3.eth.getBalance(whiteUser).toNumber();
                let resultTx = await exchange.callback(exchangeId, value * 2, { from: oracle }).should.be.fulfilled;
                let newBalance = web3.eth.getBalance(whiteUser).toNumber();
                resultTx['logs'][0].event.should.be.equal("Fail");
                (newBalance - oldBalance).should.be.equal(0);
                (await token.balanceOf(whiteUser)).toNumber().should.be.equal(value);
            }
            await awaitEvent(event, watcher);
        });

        it('Whitelisted user exchange 0.5 LCT.MMK with LCT.MMK-SENI rate 1:2 through LCToken contract', async () => {
            let value = 1000000000000000000;
            await mintLCT(whiteUser, value);
            (await token.balanceOf(whiteUser)).toNumber().should.be.equal(value);
            await token.exchange(value / 2, { from: whiteUser }).should.be.fulfilled;
            let event = exchange.Exchange({});
            let watcher = async function (err, result) {
                event.stopWatching();
                let exchangeId = result.args.exchangeId;
                let oldBalance = web3.eth.getBalance(whiteUser).toNumber();
                let resultTx = await exchange.callback(exchangeId, value, { from: oracle }).should.be.fulfilled;
                let newBalance = web3.eth.getBalance(whiteUser).toNumber();
                resultTx['logs'][0].event.should.be.equal("Success");
                (newBalance - oldBalance).should.be.equal(value);
                (await token.balanceOf(whiteUser)).toNumber().should.be.equal(value / 2);
            }
            await awaitEvent(event, watcher);
        });
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