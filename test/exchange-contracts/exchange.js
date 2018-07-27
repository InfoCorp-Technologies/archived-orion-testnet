let Exchange = artifacts.require('./contracts/exchange-contracts/Exchange');
let assert = require('chai').assert;
let truffleAssert = require('truffle-assertions');

contract('Exchange', async (accounts) => {
    let exchangeOracle;
    let ownerAccount = accounts[0];
    let executeAccount = accounts[1];

    beforeEach(async () => {
        exchangeOracle = await Exchange.new({from: ownerAccount});
    });

    afterEach(async () => {
    });

    it('pending requests\' statuses should be accurate 1', async function () {
        await exchangeOracle.exchange(100, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.exchange(200, 'ETC', 'SENI', {from: executeAccount});
        await exchangeOracle.exchange(300, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.__callback(0, 500);

        assert.equal(await exchangeOracle.getNumberOfExchanges.call({from: executeAccount}), 3);
        assert.equal(await exchangeOracle.checkPending.call(0, {from: executeAccount}), false);
        assert.equal(await exchangeOracle.checkPending.call(1, {from: executeAccount}), true);
        assert.equal(await exchangeOracle.checkPending.call(2, {from: executeAccount}), true);
    });

    it('pending requests\' statuses should be accurate 2', async function () {
        await exchangeOracle.exchange(100, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.exchange(200, 'ETC', 'SENI', {from: executeAccount});
        await exchangeOracle.exchange(300, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.__callback(1, 500);

        assert.equal(await exchangeOracle.getNumberOfExchanges.call({from: executeAccount}), 3);
        assert.equal(await exchangeOracle.checkPending.call(0, {from: executeAccount}), true);
        assert.equal(await exchangeOracle.checkPending.call(1, {from: executeAccount}), false);
        assert.equal(await exchangeOracle.checkPending.call(2, {from: executeAccount}), true);
    });

    it('test getNumberOfExchanges()', async () => {
        await exchangeOracle.exchange(100, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.exchange(200, 'ETC', 'SENI', {from: executeAccount});
        await exchangeOracle.exchange(300, 'SENI', 'ETC', {from: executeAccount});
        await exchangeOracle.exchange(400, 'ETC', 'SENI', {from: executeAccount});
        await exchangeOracle.exchange(500, 'SENI', 'ETC', {from: executeAccount});
        assert.equal(await exchangeOracle.getNumberOfExchanges.call({from: executeAccount}), 5);
    });

    it('should catch Exchange event when calling exchange()', async () => {
        let tx = await exchangeOracle.exchange(500, 'SENI', 'ETC', {from: executeAccount});
        truffleAssert.eventEmitted(tx, 'Exchange', (ev) => {
            return ev.exchangeId.toNumber() === 0 && ev.total.toNumber() === 500 &&
                ev.fromCurrency === 'SENI' && ev.toCurrency === 'ETC';
        });
    });

    it('should be catch Result event when calling __callback()', async () => {
        let tx = await exchangeOracle.__callback(0, 500, {from: executeAccount});
        truffleAssert.eventEmitted(tx, 'Result', (ev) => {
            return ev.exchangeId.toNumber() === 0 && ev.value.toNumber() === 500;
        });
    });
});
