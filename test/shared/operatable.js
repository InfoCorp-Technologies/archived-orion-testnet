const { ERROR_MSG } = require('../setup');
const OperatableContract = artifacts.require('OperatableContract.sol');

contract('Operatable', async (accounts) => {
    let operatable;

    const owner = accounts[0];
    const operator1 = accounts[1];
    const operator2 = accounts[2];
    const nonOperator = accounts[3];

    beforeEach(async () => {
        operatable = await OperatableContract.new(owner);
    });

    it('only owner can add or remove operators', async () => {
        await operatable.addOperator(operator1, { from: owner }).should.be.fulfilled;
        await operatable.addOperator(operator1, { from: operator2 }).should.be.rejectedWith(ERROR_MSG);
        await operatable.addOperator(operator2, { from: owner }).should.be.fulfilled;

        await operatable.removeOperator(operator2, { from: operator1 }).should.be.rejectedWith(ERROR_MSG);
        await operatable.removeOperator(operator2, { from: owner }).should.be.fulfilled;
    });

    it('owner or operators can execute setVariable', async () => {
        '0'.should.be.bignumber.equal(await operatable.some());
        await operatable.setVariable(1, { from: owner}).should.be.fulfilled;
        '1'.should.be.bignumber.equal(await operatable.some());
        await operatable.setVariable(2, { from: nonOperator}).should.be.rejectedWith(ERROR_MSG);
        await operatable.addOperator(operator1, { from: owner }).should.be.fulfilled;
        await operatable.setVariable(2, { from: operator1}).should.be.fulfilled;
        '2'.should.be.bignumber.equal(await operatable.some());
        await operatable.removeOperator(operator1, { from: owner }).should.be.fulfilled;
        await operatable.setVariable(3, { from: operator1}).should.be.rejectedWith(ERROR_MSG);
        '2'.should.be.bignumber.equal(await operatable.some());
    });
});
