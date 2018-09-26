const { ERROR_MSG } = require('../setup');
const Whitelist = artifacts.require('Whitelist.sol');
const LCToken = artifacts.require('LCToken.sol');

contract('Whitelist', async (accounts) => {
    let whitelist;

    const owner = accounts[0];
    const oneAddress = accounts[1];

    beforeEach(async () => {
        whitelist = await Whitelist.new(owner);
    });

    it('add address and check is whitelisted', async () => {
        const { logs } = await whitelist.addWhitelist([oneAddress], { from: owner });
        logs[0].event.should.be.equal('Whitelisted');
        logs[0].args.should.be.deep.equal({
            addr: oneAddress
        });
        true.should.be.equal(await whitelist.isWhitelist(oneAddress));
    });

    it('remove address and check is not whitelisted', async () => {
        const addTx = await whitelist.addWhitelist([oneAddress], { from: owner });
        addTx['logs'][0].event.should.be.equal('Whitelisted');
        addTx['logs'][0].args.should.be.deep.equal({
            addr: oneAddress
        });
        '1'.should.be.bignumber.equal(await whitelist.count());
        const rmTx = await whitelist.removeWhitelist([oneAddress], { from: owner });
        rmTx['logs'][0].event.should.be.equal('Removed');
        rmTx['logs'][0].args.should.be.deep.equal({
            addr: oneAddress
        });
        '0'.should.be.bignumber.equal(await whitelist.count());
        false.should.be.equal(await whitelist.isWhitelist(oneAddress));
    })
});

contract('LCToken', async (accounts) => {
    let whitelist;
    let token;

    const owner = accounts[0];
    const whiteUserOne = accounts[1];
    const whiteUserTwo = accounts[2];
    const blackOne = accounts[3];

    beforeEach(async () => {
        whitelist = await Whitelist.new(owner);
        await whitelist.addWhitelist([whiteUserOne, whiteUserTwo]);
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
});
