const { ERROR_MSG } = require('../setup')
const Livestock = artifacts.require('Livestock')
const Whitelist = artifacts.require('Whitelist')
const Registry = artifacts.require('Registry')

let registry
let livestock
let whitelist

let COW_1
let COW_2
let CO_1

// Interfaces names
let ADMIN = "admin"
let ATTESTATOR = "attestator"
let USER = "user"
let COW = "COW"
let CO = "CO"

// Actions
const SET_INTERFACE = 0;
const VERIFY_INTERFACE = 1;
const REMOVE_INTERFACE = 2;
const VERIFY_REMOVE_INTERFACE = 3;

// Sentinel address
let ADMIN_ADDRESS
let ADDRESS_1
let ADDRESS_2
let ADDRESS_1_2

// Multichain address
const MULTICHAIN_ADR_1 = '10000000000000000000000000000000000000'
const MULTICHAIN_ADR_2 = '20000000000000000000000000000000000000'
const MULTICHAIN_ADR_3 = '30000000000000000000000000000000000000'
const MULTICHAIN_ADR_11 = '11000000000000000000000000000000000000'
const MULTICHAIN_ADR_12 = '12000000000000000000000000000000000000'

contract('Registry user and attestator', async (accounts) => {
    ADMIN_ADDRESS = accounts[0]
    ADDRESS_1 = accounts[1]
    ADDRESS_2 = accounts[2]
    ADDRESS_1_2 = accounts[3]

    beforeEach(async function () {
        registry = await Registry.new(ADMIN_ADDRESS)
        await registry.addPermission(ATTESTATOR, ADMIN, VERIFY_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(USER, ATTESTATOR, VERIFY_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(USER, ATTESTATOR, VERIFY_REMOVE_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addRule(USER, ATTESTATOR, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addRule(ATTESTATOR, USER, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_1, { from: ADDRESS_1 })
        await registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_2, { from: ADDRESS_2 })
    })

    it('Can only register Multichain address with 38 characters long', async function () {
        let multichain = '1'
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, multichain, { FROM: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_1, { from: ADDRESS_1 }).should.be.fulfilled
    })

     it('Can only admin verify attestator', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
    })

   it('Can only attestator verify user', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_2, { from: ADDRESS_2 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADMIN_ADDRESS }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
    })

    it('Cannot verify already verified register', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Can only set register before verify', async function () {
        (await registry.getInterfaceImplementer(ADDRESS_1, ATTESTATOR))[1].should.be.equal(MULTICHAIN_ADR_1)
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_1 }).should.be.fulfilled;
        (await registry.getInterfaceImplementer(ADDRESS_1, ATTESTATOR))[1].should.be.equal(MULTICHAIN_ADR_11)
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_12, { FROM: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set user role for attestator', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_1, USER, MULTICHAIN_ADR_11, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify user role for attestator', async function () {
        await registry.setInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_1_2 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_1, USER, MULTICHAIN_ADR_12, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_1, USER, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify attestator role for user', async function () {
        await registry.setInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_1_2 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_1_2, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_1, USER, MULTICHAIN_ADR_12, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_1, USER, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
    })

    it('Cannot set interface with already claimed Multichain address', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_1, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify interface with already claimed Multichain address', async function () {
        await registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_1, { from: ADDRESS_2 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_2, CO, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set attestator role for user', async function () {
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_2, CO, MULTICHAIN_ADR_11, { from: ADDRESS_2 }).should.be.fulfilled
        await registry.setInterfaceImplementer(ADDRESS_2, ATTESTATOR, MULTICHAIN_ADR_12, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
    })

    it('Cannot verify attestator role for user', async function () {
        await registry.setInterfaceImplementer(ADDRESS_2, ATTESTATOR, MULTICHAIN_ADR_11, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_2, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })
})


contract('Registry livestock and removal', async (accounts) => {
    ADMIN_ADDRESS = accounts[0]
    ADDRESS_1 = accounts[1]
    ADDRESS_2 = accounts[2]
    ADDRESS_1_2 = accounts[3]

    beforeEach(async function () {
        registry = await Registry.new(ADMIN_ADDRESS)
        whitelist = await Whitelist.new(ADMIN_ADDRESS)
        livestock = await Livestock.new("Cow Token", COW, registry.address, whitelist.address)
        await registry.addPermission(ATTESTATOR, ADMIN, VERIFY_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(USER, ATTESTATOR, VERIFY_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(COW, ATTESTATOR, VERIFY_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(COW, USER, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(ATTESTATOR, ADMIN, VERIFY_REMOVE_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(USER, ATTESTATOR, VERIFY_REMOVE_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addPermission(COW, ATTESTATOR, VERIFY_REMOVE_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addRule(USER, ATTESTATOR, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addRule(ATTESTATOR, USER, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.addRule(ATTESTATOR, COW, SET_INTERFACE, { from: ADMIN_ADDRESS })
        await registry.setLivestock(livestock.address, { from: ADMIN_ADDRESS })
        await registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_1, { from: ADDRESS_1 })
        await registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_2, { from: ADDRESS_2 })
        await registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS })
        await registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 })
        await whitelist.addAddresses([ADDRESS_1, ADDRESS_2])
        CO_1 = await registry.interfaceHash(CO, 1)
        COW_1 = await registry.interfaceHash(COW, 1)
        COW_2 = await registry.interfaceHash(COW, 2)
    })

    it('Can only register valid livestock to user', async function () {
        await registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_3, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.setInterfaceImplementer(ADDRESS_2, CO_1, MULTICHAIN_ADR_3, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.setInterfaceImplementer(ADDRESS_2, COW_1, MULTICHAIN_ADR_3, { from: ADDRESS_2 }).should.be.fulfilled
    })

    it('Can only attestator verify livestock', async function () {
        await registry.setInterfaceImplementer(ADDRESS_2, COW_1, MULTICHAIN_ADR_3, { from: ADDRESS_2 }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(ADDRESS_2, COW_1, { from: ADMIN_ADDRESS }).should.be.rejectedWith(ERROR_MSG);
        (await livestock.exists(1)).should.be.equal(false)
        await registry.verifyInterfaceImplementer(ADDRESS_2, COW_1, { from: ADDRESS_1 }).should.be.fulfilled;
        (await livestock.ownerOf(1)).should.be.equal(ADDRESS_2)
    })

    it('Cannot set existed livestock to other user', async function () {
        await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_3)
        await registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_11, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot set existing livestock to other user', async function () {
        await setUser(ADDRESS_1_2)
        await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_3)
        await registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
        await registry.setInterfaceImplementer(ADDRESS_1_2, COW_2, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.fulfilled
    })

    it('Cannot verify existing livestock to other user', async function () {
        await setUser(ADDRESS_1_2)
        await registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.fulfilled
        await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_3)
        await registry.verifyInterfaceImplementer(ADDRESS_1_2, COW_1, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Can only admin verifiy register removal for attestator)', async function () {
        await registry.removeInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.fulfilled
        await registry.verifyInterfaceRemoval(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceRemoval(ADDRESS_1, ATTESTATOR, { from: ADMIN_ADDRESS }).should.be.fulfilled
    })

    it('Can only attestor verifiy register removal for user or livestock', async function () {
        await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_3);
        (await livestock.ownerOf(1)).should.be.equal(ADDRESS_2)
        await registry.removeInterfaceImplementer(ADDRESS_2, COW_1, { from: ADDRESS_2 }).should.be.fulfilled
        await registry.verifyInterfaceRemoval(ADDRESS_2, COW_1, { from: ADMIN_ADDRESS }).should.be.rejectedWith(ERROR_MSG)
        await registry.verifyInterfaceRemoval(ADDRESS_2, COW_1, { from: ADDRESS_1 }).should.be.fulfilled;
        (await livestock.exists(1)).should.be.equal(false)
    })

    it('Transfer livestock to other user will transfer register to that user', async function () {
        await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_3)
        var interfaces = await registry.getInterfaceImplementer(ADDRESS_2, COW_1)
        isSet(interfaces).should.be.equal(true)
        livestock.transfer(ADDRESS_1, 1, { from: ADDRESS_2 }).should.be.fulfilled
        isSet(await registry.getInterfaceImplementer(ADDRESS_2, COW_1))
        isEqual(await registry.getInterfaceImplementer(ADDRESS_1, COW_1), interfaces)
    })

    async function setLivestock(addr, livestock, multichain) {
        await registry.setInterfaceImplementer(addr, livestock, multichain, { from: addr }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(addr, livestock, { from: ADDRESS_1 }).should.be.fulfilled
    }

    async function setUser(addr) {
        await registry.setInterfaceImplementer(addr, USER, MULTICHAIN_ADR_11, { from: addr }).should.be.fulfilled
        await registry.verifyInterfaceImplementer(addr, USER, { from: ADDRESS_1 }).should.be.fulfilled
    }

    function isSet(interfaces) {
        return interfaces[0] != 0x0
    }

    function isEqual(interfaces1, interfaces2) {
        return (interfaces1[0] == interfaces2[0] &&
            interfaces1[1] == interfaces2[1] &&
            interfaces1[2] == interfaces2[2])
    }
})