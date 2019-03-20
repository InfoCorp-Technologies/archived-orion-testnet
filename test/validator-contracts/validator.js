const { ERROR_MSG } = require('../setup');
const TestValidatorSet = artifacts.require("TestValidatorSet.sol");

contract('Exchange', async (accounts) => {
    const OWNER = accounts[0];
    const OTHER_USER = accounts[4];
    const SYSTEM = accounts[5];
    const NEW_VALIDATOR = accounts[6];
    const NON_VALIDATOR = accounts[7];
    const OLD_VALIDATOR = accounts[2];
    const INITIAL_VALIDATORS = [accounts[1], accounts[2], accounts[3]];
    let validator;

    beforeEach(async () => {
        if (!validator) {
            validator = await TestValidatorSet.new(SYSTEM, INITIAL_VALIDATORS, OWNER);
        }
    })

    it("should initialize the pending and validators arrays on creation", async () => {
        const validators = await validator.getValidators();
        const pending = await validator.getPendings();
        // both the pending and current validator set should point to the
        // initial set
        assert.deepEqual(validators, INITIAL_VALIDATORS);
        assert.deepEqual(pending, INITIAL_VALIDATORS);
        // the change should not be finalized
        const finalized = await validator.finalized();
        assert(!finalized);
    });

    it("should allow the system to finalize changes", async () => {
        const watcher = validator.ChangeFinalized();
        // only the system address can finalize changes
        await validator.finalizeChange({ from: OTHER_USER }).should.be.rejectedWith(ERROR_MSG);

        // we successfully finalize the change
        await validator.finalizeChange({ from: SYSTEM }).should.be.fulfilled;
        // the initial validator set should be finalized
        const finalized = await validator.finalized();
        assert(finalized);

        // a `ChangeFinalized` event should be emitted
        const events = await watcher.get();

        assert.equal(events.length, 1);
        assert.deepEqual(events[0].args.currentSet, INITIAL_VALIDATORS);
        assert.deepEqual(await validator.getValidators(), INITIAL_VALIDATORS);

        // abort if there's no change to finalize
        await validator.finalizeChange({ from: SYSTEM }).should.be.rejectedWith(ERROR_MSG);
    });

    it("should allow the owner to add new validators", async () => {
        const watcher = validator.InitiateChange();

        // only the owner can add new validators
        await validator.addValidator(NEW_VALIDATOR, { from: OTHER_USER }).should.be.rejectedWith(ERROR_MSG);

        // we successfully add a new validator
        await validator.addValidator(NEW_VALIDATOR, { from: OWNER }).should.be.fulfilled;

        // a `InitiateChange` event should be emitted
        const events = await watcher.get();
        const newSet = INITIAL_VALIDATORS.concat(NEW_VALIDATOR);

        const parent = await web3.eth.getBlock(web3.eth.blockNumber - 1);
        assert.equal(events.length, 1);
        assert.equal(events[0].args.parentHash, parent.hash);
        assert.deepEqual(events[0].args.newSet, newSet);

        // this change is not finalized yet
        const finalized = await validator.finalized();
        assert(!finalized);

        // the pending set should be updated
        assert.deepEqual(await validator.getPendings(), newSet);

        // the validator set should stay the same
        assert.deepEqual(await validator.getValidators(), INITIAL_VALIDATORS);

        // `pendingStatus` should be updated
        const [isValidator, index] = await validator.getStatus(NEW_VALIDATOR);
        assert(isValidator);
        assert.equal(index, 3);

        // we successfully finalize the change
        await validator.finalizeChange({ from: SYSTEM });

        // the validator set should be updated
        assert.deepEqual(await validator.getValidators(), newSet);
        for (let i = 0; i < newSet.length; i++) {
            assert.deepEqual(await validator.isValidator(newSet[i]), true);
        }
    });

    it("should abort when adding a duplicate validator", async () => {
        // we successfully add a new validator
        await validator.addValidator(NEW_VALIDATOR, { from: OWNER }).should.be.rejectedWith(ERROR_MSG);
    });

    it("should allow the owner to remove a validator", async () => {
        const watcher = validator.InitiateChange();

        // only the owner can remove validators
        await validator.removeValidator(NEW_VALIDATOR, { from: OTHER_USER }).should.be.rejectedWith(ERROR_MSG);

        // we successfully remove a validator
        await validator.removeValidator(NEW_VALIDATOR, { from: OWNER }).should.be.fulfilled;

        // a `InitiateChange` event should be emitted
        const events = await watcher.get();

        const parent = await web3.eth.getBlock(web3.eth.blockNumber - 1);
        assert.equal(events.length, 1);
        assert.equal(events[0].args.parentHash, parent.hash);
        assert.deepEqual(events[0].args.newSet, INITIAL_VALIDATORS);

        // this change is not finalized yet
        const finalized = await validator.finalized();
        assert(!finalized);

        // the pending set should be updated
        assert.deepEqual(await validator.getPendings(), INITIAL_VALIDATORS);

        // the validator validator should stay the same
        assert.deepEqual(await validator.getValidators(), INITIAL_VALIDATORS.concat(NEW_VALIDATOR));

        // `pendingStatus` should be updated
        const [isValidator] = await validator.getStatus(NEW_VALIDATOR);
        assert(!isValidator);
        assert.deepEqual(await validator.isValidator(NEW_VALIDATOR), false);

        // we successfully finalize the change
        await validator.finalizeChange({ from: SYSTEM });

        // the validator validator should be updated
        assert.deepEqual(await validator.getValidators(), INITIAL_VALIDATORS);
    });

    it("should abort when trying to remove non-existent validator", async () => {
        // exists in `pendingStatus` with `isIn` set to false
        await validator.removeValidator(NEW_VALIDATOR, { from: OWNER }).should.be.rejectedWith(ERROR_MSG);
        // non-existent in `pendingStatus`
        await validator.removeValidator(NON_VALIDATOR, { from: OWNER }).should.be.rejectedWith(ERROR_MSG);
    });

    it("should only allow one change per epoch", async () => {
        await validator.addValidator(NEW_VALIDATOR, { from: OWNER }).should.be.fulfilled;
        // disallowed because previous change hasn't been finalized yet
        await validator.removeValidator(OLD_VALIDATOR, { from: OWNER }).should.be.rejectedWith(ERROR_MSG);
        await validator.finalizeChange({ from: SYSTEM });
        // after finalizing it should work successfully
        await validator.removeValidator(NEW_VALIDATOR, { from: OWNER }).should.be.fulfilled;
        assert.deepEqual(await validator.getPendings(), INITIAL_VALIDATORS);
    });

});
