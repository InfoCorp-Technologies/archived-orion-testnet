const { ERROR_MSG } = require('../setup');
const Whitelist = artifacts.require('Whitelist.sol');
const LCToken = artifacts.require('LCToken.sol');

contract('Whitelist', async (accounts) => {
    let whitelist;

    const owner = accounts[0];
    const oneAddress = accounts[1];
    const manyAddress = [accounts[2], accounts[3], accounts[4], accounts[5]];
    const operator1 = accounts[6];
    const operator2 = accounts[7];

    beforeEach(async () => {
        whitelist = await Whitelist.new(owner);
        await whitelist.addOperator(operator1, { from: owner });
        await whitelist.addOperator(operator2, { from: owner });
    });

    it('only operator or owner can add or remove addresses', async () => {
        await whitelist.addAddresses([oneAddress], { from: oneAddress }).should.be.rejectedWith(ERROR_MSG);
        await whitelist.addAddresses([oneAddress], { from: owner }).should.be.fulfilled;
        await whitelist.addAddresses([manyAddress[0]], { from: operator1 }).should.be.fulfilled;
        await whitelist.addAddresses([manyAddress[1]], { from: operator2 }).should.be.fulfilled;
        await whitelist.removeAddresses([oneAddress], { from: oneAddress }).should.be.rejectedWith(ERROR_MSG);
    });

    it('add address and check if is whitelisted', async () => {
        await whitelist.addAddresses([], { from: operator1 }).should.be.rejectedWith(ERROR_MSG);
        const { logs } = await whitelist.addAddresses([oneAddress], { from: operator2 });
        logs[0].event.should.be.equal('LogWhitelisted');
        logs[0].args.should.be.deep.equal({ addr: oneAddress });
        true.should.be.equal(await whitelist.isWhitelisted(oneAddress));
        '1'.should.be.bignumber.equal(await whitelist.count());
    });

    it('remove address and check if is not whitelisted', async () => {
        await whitelist.addAddresses([oneAddress], { from: owner });
        '1'.should.be.bignumber.equal(await whitelist.count());
        const rmTx = await whitelist.removeAddresses(
            [oneAddress], { from: operator1 }
        );
        rmTx['logs'][0].event.should.be.equal('LogRemoved');
        rmTx['logs'][0].args.should.be.deep.equal({ addr: oneAddress });
        '0'.should.be.bignumber.equal(await whitelist.count());
        false.should.be.equal(await whitelist.isWhitelisted(oneAddress));
    })

    it('add addresses and check if is whitelisted', async () => {
        const { logs } = await whitelist.addAddresses(
            manyAddress, { from: operator2 }
        );
        for (let i = 0; i < manyAddress.length; i++) {
            logs[i].event.should.be.equal('LogWhitelisted');
            logs[i].args.should.be.deep.equal({ addr: manyAddress[i] });
            true.should.be.equal(await whitelist.isWhitelisted(manyAddress[i]));
        }
        manyAddress.length.should.be.bignumber.equal(await whitelist.count());
    });

    it('remove addresses and check if is whitelisted', async () => {
        await whitelist.addAddresses(manyAddress, { from: operator1 });
        const { logs } = await whitelist.removeAddresses(
            manyAddress, { from: owner }
        );
        for (let i = 0; i < manyAddress.length; i++) {
            logs[i].event.should.be.equal('LogRemoved');
            logs[i].args.should.be.deep.equal({ addr: manyAddress[i] });
            false.should.be.equal(
                await whitelist.isWhitelisted(manyAddress[i])
            );
        }
        '0'.should.be.bignumber.equal(await whitelist.count());

    });
});

/* contract('LCToken', async (accounts) => {
    let whitelist;
    let token;

    const owner = accounts[0];
    const whiteUserOne = accounts[1];
    const whiteUserTwo = accounts[2];
    const blackOne = accounts[3];

    beforeEach(async () => {
        whitelist = await Whitelist.new(owner);
        await whitelist.addAddresses([whiteUserOne, whiteUserTwo]);
        token = await LCToken.new(
            'Local Currency Token Myanmar',
            'LCT.MMK',
            18,
            whitelist.address,
            owner,
            { from: owner }
        );
        (await token.totalSupply()).should.be.bignumber.equal(0);
        await token.mint(whiteUserOne, 1, { from: owner }).should.be.fulfilled;
    });

    it('transfer between two whitelisted users', async () => {
        await token.transfer(whiteUserTwo, 1, { from: whiteUserOne }).should.be.fulfilled;
    });

    it('transfer to an non-whitelisted user should be rejected', async () => {
        await token.transfer(blackOne, 1, { from: whiteUserOne }).should.be.rejectedWith(ERROR_MSG);
    });

    it('approve and transferFrom between whitelisted users', async () => {
        await token.approve(whiteUserTwo, 1, { from: whiteUserOne }).should.be.fulfilled;
        await token.transferFrom(whiteUserOne, whiteUserTwo, 1, { from: whiteUserTwo }).should.be.fulfilled;
    });

    it('approve and transferFrom to an non-whitelisted user should be rejected', async () => {
        await token.approve(blackOne, 1, { from: whiteUserOne }).should.be.fulfilled;
        await token.transferFrom(whiteUserOne, blackOne, 1, { from: blackOne }).should.be.rejectedWith(ERROR_MSG);
    });
}); */
