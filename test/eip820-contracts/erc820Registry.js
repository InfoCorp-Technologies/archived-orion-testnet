const ERC820Registry = artifacts.require('ERC820Registry');
const assert = require('chai').assert;
const truffleAssert = require('truffle-assertions');

contract('ERC820Registry', async (accounts) => {
    let erc820Registry;

    const NULL_ACCOUNT = '0x0000000000000000000000000000000000000000';
    const FIRST_ACCOUNT = accounts[0];
    const SECOND_ACCOUND = accounts[1];

    const USER = 'user';
    const INTERFACE_MAP = {
        'user': '0xcb61ad33d3763aed2bc16c0f57ff251ac638d3d03ab7550adfd3e166c2e7adb6'
    };

    const MULTICHAIN_ADR = '1BJqxEK6cEeuNvsxQS2Fs1CjSi7wLXJiJ8i6oq';

    const EMPTY_STRING = '';

    beforeEach(async function () {
        erc820Registry = await ERC820Registry.new({from: FIRST_ACCOUNT});
    });

    afterEach(async function () {
    });

    it('testInterfaceHash', async function () {
        let actual = await erc820Registry.interfaceHash.call(USER);
        let expected = INTERFACE_MAP[USER];
        assert.strictEqual(actual, expected)
    });

    it('testSetInterfaceImplementer_invalidMultichainLength', async function () {
        let multichain = '####'; // length === 4
        try {
            await erc820Registry.setInterfaceImplementer(FIRST_ACCOUNT, USER, FIRST_ACCOUNT, multichain);
        } catch (err) {
            assert.ok(err instanceof Error);
        }
    });

    it('testSetInterfaceImplementer_notRequireERC820', async function () {
        let tx = await erc820Registry.setInterfaceImplementer(FIRST_ACCOUNT, USER, FIRST_ACCOUNT, MULTICHAIN_ADR);
        truffleAssert.eventEmitted(tx, 'InterfaceImplementerSet', (ev) => {
            return ev.addr === FIRST_ACCOUNT &&
                ev.interfaceHash === INTERFACE_MAP[USER] &&
                ev.implementer === FIRST_ACCOUNT;
        });

        let interfaceImplementer = await erc820Registry.getInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        assert.strictEqual(interfaceImplementer[0], FIRST_ACCOUNT);
        assert.strictEqual(interfaceImplementer[1], MULTICHAIN_ADR);
    });

    it('testChangeInterfaceImplementer', async function () {
        let setTx = await erc820Registry.setInterfaceImplementer(FIRST_ACCOUNT, USER, FIRST_ACCOUNT, MULTICHAIN_ADR);
        truffleAssert.eventEmitted(setTx, 'InterfaceImplementerSet', (ev) => {
            return ev.addr === FIRST_ACCOUNT &&
                ev.interfaceHash === INTERFACE_MAP[USER] &&
                ev.implementer === FIRST_ACCOUNT;
        });

        let interfaceImplementer = await erc820Registry.getInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        assert.strictEqual(interfaceImplementer[0], FIRST_ACCOUNT);
        assert.strictEqual(interfaceImplementer[1], MULTICHAIN_ADR);

        let changeTx = await erc820Registry.changeInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER], SECOND_ACCOUND);
        truffleAssert.eventEmitted(changeTx, 'InterfaceImplementerChanged', (ev) => {
            return ev.odAddr === FIRST_ACCOUNT &&
                ev.interfaceHash === INTERFACE_MAP[USER] &&
                ev.newAddr === SECOND_ACCOUND;
        });

        let oldInterfaceImplementer = await erc820Registry.getInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        assert.strictEqual(oldInterfaceImplementer[0], NULL_ACCOUNT);
        assert.strictEqual(oldInterfaceImplementer[1], EMPTY_STRING);

        let newInterfaceImplementer = await erc820Registry.getInterfaceImplementer(SECOND_ACCOUND, INTERFACE_MAP[USER]);
        assert.strictEqual(newInterfaceImplementer[0], FIRST_ACCOUNT);
        assert.strictEqual(newInterfaceImplementer[1], MULTICHAIN_ADR);
    });

    it('testRemoveInterfaceImplementer', async function () {
        let setTx = await erc820Registry.setInterfaceImplementer(FIRST_ACCOUNT, USER, FIRST_ACCOUNT, MULTICHAIN_ADR);
        truffleAssert.eventEmitted(setTx, 'InterfaceImplementerSet', (ev) => {
            return ev.addr === FIRST_ACCOUNT &&
                ev.interfaceHash === INTERFACE_MAP[USER] &&
                ev.implementer === FIRST_ACCOUNT;
        });

        let interfaceImplementer = await erc820Registry.getInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        assert.strictEqual(interfaceImplementer[0], FIRST_ACCOUNT);
        assert.strictEqual(interfaceImplementer[1], MULTICHAIN_ADR);

        let tx = await erc820Registry.removeInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        truffleAssert.eventEmitted(tx, 'InterfaceImplementerRemoved', (ev) => {
            return ev.addr === FIRST_ACCOUNT && ev.interfaceHash === INTERFACE_MAP[USER];
        });

        interfaceImplementer = await erc820Registry.getInterfaceImplementer(FIRST_ACCOUNT, INTERFACE_MAP[USER]);
        assert.strictEqual(interfaceImplementer[0], NULL_ACCOUNT);
        assert.strictEqual(interfaceImplementer[1], EMPTY_STRING);
    });
});
