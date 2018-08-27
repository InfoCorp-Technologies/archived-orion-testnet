const { ERROR_MSG, ZERO_ADDRESS } = require('../setup')
const ERC820Registry = artifacts.require('ERC820Registry')
const Livestock = artifacts.require('Livestock')
const assert = require('chai').assert
const truffleAssert = require('truffle-assertions')

const NULL_ACCOUNT = '0x0000000000000000000000000000000000000000'
const EMPTY_STRING = '';

let USER
let ATTESTATOR
let COW = "COW"
let CO = "CO"
let COW_1
let CO_1

const MULTICHAIN_ADR_0 = '00000000000000000000000000000000000000'
const MULTICHAIN_ADR_1 = '10000000000000000000000000000000000000'
const MULTICHAIN_ADR_2 = '20000000000000000000000000000000000000'
const MULTICHAIN_ADR_11 = '11000000000000000000000000000000000000'
const MULTICHAIN_ADR_12 = '12000000000000000000000000000000000000'

contract('Registry', async (accounts) => {
    let erc820Registry
    let livestock

    const AUTHORITY = accounts[0]
    const ADDRESS_1 = accounts[1]
    const ADDRESS_2 = accounts[2]
    const ADDRESS_1_2 = accounts[3]

    beforeEach(async function () {
        erc820Registry = await ERC820Registry.new();
        livestock = await Livestock.new("Cow Token", COW, erc820Registry.address);
        await erc820Registry.setLivestock(livestock.address)
        USER = await erc820Registry.interfaceHash("user", 0)
        ATTESTATOR = await erc820Registry.interfaceHash("attestator", 0)
        COW_1 = await erc820Registry.interfaceHash(COW, 1)
        CO_1 = await erc820Registry.interfaceHash(CO, 0)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_0, { from: ADDRESS_1 })
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_1, { from: ADDRESS_2 })
    })

    it('Multichain address must equal to 38 digit', async function () {
        let multichain = '1'
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, multichain, { FROM: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_0, { from: ADDRESS_1 }).should.be.fulfilled
    })

    it('Only admin can verify attestator', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
    })

    it('Cannot verify already verified register', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Can only set register before verify', async function () {
        (await erc820Registry.getInterfaceImplementer(ADDRESS_1, ATTESTATOR))[1].should.be.equal(MULTICHAIN_ADR_0)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_1 }).should.be.fulfilled;
        (await erc820Registry.getInterfaceImplementer(ADDRESS_1, ATTESTATOR))[1].should.be.equal(MULTICHAIN_ADR_11)
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_12, { FROM: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set other role for attestor', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, CO, MULTICHAIN_ADR_11, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify other role for attestor', async function () {
        await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_1_2 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, CO, MULTICHAIN_ADR_12, { from: ADDRESS_1 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, CO, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set interface with already claimed Multichain address', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_0, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify interface with already claimed Multichain address', async function () {
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_0, { from: ADDRESS_2 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, CO, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set attestator role for user', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_11, { from: ADDRESS_2 }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, ATTESTATOR, MULTICHAIN_ADR_12, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify attestator role for user', async function () {
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_2 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })
})
