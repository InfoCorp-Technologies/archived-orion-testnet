const { ERROR_MSG, ZERO_ADDRESS } = require('../setup')
const ERC820Registry = artifacts.require('ERC820Registry')
const Administration = artifacts.require('Administration')
const Livestock = artifacts.require('Livestock')
const Whitelist = artifacts.require('Whitelist')

let AUTHORITY
let ADDRESS_1
let ADDRESS_2
let ADDRESS_1_2

let administration
let erc820Registry
let livestock
let whitelist

let ADMIN = "admin"
let ATTESTATOR = "attestator"
let USER = "user"
let COW = "COW"
let CO = "CO"

let COW_1
let COW_2
let CO_1

const MULTICHAIN_ADR_0 = '00000000000000000000000000000000000000'
const MULTICHAIN_ADR_1 = '10000000000000000000000000000000000000'
const MULTICHAIN_ADR_2 = '20000000000000000000000000000000000000'
const MULTICHAIN_ADR_11 = '11000000000000000000000000000000000000'
const MULTICHAIN_ADR_12 = '12000000000000000000000000000000000000'

contract('Registry user and attestator', async (accounts) => {
    AUTHORITY = accounts[0]
    ADDRESS_1 = accounts[1]
    ADDRESS_2 = accounts[2]
    ADDRESS_1_2 = accounts[3]

    beforeEach(async function () {
        administration = await Administration.new(AUTHORITY)
        erc820Registry = await ERC820Registry.new(AUTHORITY, administration.address)
        await administration.addRule(ATTESTATOR, ADMIN, 1)
        await administration.addRule(USER, ATTESTATOR, 1)
        await administration.addRule(USER, ATTESTATOR, 2)
        await administration.addRule(ATTESTATOR, USER, 2)
        await administration.addRule(USER, ATTESTATOR, 5)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_0, { from: ADDRESS_1 })
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_1, { from: ADDRESS_2 })
    })

    it('Can only register Multichain address with 38 characters long', async function () {
        let multichain = '1'
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, multichain, { FROM: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_0, { from: ADDRESS_1 }).should.be.fulfilled
    })

    it('Can only admin verify attestator', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
    })

    it('Can only attestator verify user', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_1, { from: ADDRESS_2 }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: AUTHORITY }).should.be.rejectedWith(ERROR_MSG)
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 }).should.be.fulfilled
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

    it('Cannot set other role for attestator', async function () {
        await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, CO, MULTICHAIN_ADR_11, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    })

    it('Cannot verify other role for attestator', async function () {
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


contract('Registry livestock and removal', async (accounts) => {
    AUTHORITY = accounts[0]
    ADDRESS_1 = accounts[1]
    ADDRESS_2 = accounts[2]
    ADDRESS_1_2 = accounts[3]

    beforeEach(async function () {
        administration = await Administration.new(AUTHORITY)
        erc820Registry = await ERC820Registry.new(AUTHORITY, administration.address)
        whitelist = await Whitelist.new(AUTHORITY)
        livestock = await Livestock.new("Cow Token", COW, erc820Registry.address, whitelist.address)
        await administration.addRule(ATTESTATOR, ADMIN, 1)
        await administration.addRule(USER, ATTESTATOR, 1)
        await administration.addRule(COW, ATTESTATOR, 1)
        await administration.addRule(COW, USER, 0)
        await administration.addRule(USER, ATTESTATOR, 2)
        await administration.addRule(ATTESTATOR, USER, 2)
        await administration.addRule(ATTESTATOR, COW, 2)
        await administration.addRule(USER, ATTESTATOR, 5)
        await administration.addRule(COW, ATTESTATOR, 5)
        await erc820Registry.setLivestock(livestock.address)
        await erc820Registry.setInterfaceImplementer(ADDRESS_1, ATTESTATOR, MULTICHAIN_ADR_0, { from: ADDRESS_1 })
        await erc820Registry.setInterfaceImplementer(ADDRESS_2, USER, MULTICHAIN_ADR_1, { from: ADDRESS_2 })
        // await erc820Registry.verifyInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: AUTHORITY })
        // await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, USER, { from: ADDRESS_1 })
        CO_1 = await erc820Registry.interfaceHash(CO, 1)
        COW_1 = await erc820Registry.interfaceHash(COW, 1)
        COW_2 = await erc820Registry.interfaceHash(COW, 2)
    })

    it('a', async function () {

    })
    // it('Can only register valid livestock to user', async function () {
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_2, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_2, CO_1, MULTICHAIN_ADR_2, { from: ADDRESS_2 }).should.be.rejectedWith(ERROR_MSG)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_2, COW_1, MULTICHAIN_ADR_2, { from: ADDRESS_2 }).should.be.fulfilled
    // })

    // it('Can only attestator verify livestock', async function () {
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_2, COW_1, MULTICHAIN_ADR_2, { from: ADDRESS_2 }).should.be.fulfilled
    //     await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, COW_1, { from: AUTHORITY }).should.be.rejectedWith(ERROR_MSG);
    //     (await livestock.exists(1)).should.be.equal(false)
    //     await erc820Registry.verifyInterfaceImplementer(ADDRESS_2, COW_1, { from: ADDRESS_1 }).should.be.fulfilled;
    //     (await livestock.ownerOf(1)).should.be.equal(ADDRESS_2)
    // })

    // it('Cannot set existed livestock to other user', async function () {
    //     await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_2)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_11, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    // })

    // it('Cannot set existing livestock to other user', async function () {
    //     await setUser(ADDRESS_1_2)
    //     await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_2)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.rejectedWith(ERROR_MSG)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, COW_2, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.fulfilled
    // })

    // it('Cannot verify existing livestock to other user', async function () {
    //     await setUser(ADDRESS_1_2)
    //     await erc820Registry.setInterfaceImplementer(ADDRESS_1_2, COW_1, MULTICHAIN_ADR_12, { from: ADDRESS_1_2 }).should.be.fulfilled
    //     await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_2)
    //     await erc820Registry.verifyInterfaceImplementer(ADDRESS_1_2, COW_1, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    // })

    // it('Can only admin verifiy register removal for attestator)', async function () {
    //     await erc820Registry.removeInterfaceImplementer(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.fulfilled
    //     await erc820Registry.verifyInterfaceRemoval(ADDRESS_1, ATTESTATOR, { from: ADDRESS_1 }).should.be.rejectedWith(ERROR_MSG)
    //     await erc820Registry.verifyInterfaceRemoval(ADDRESS_1, ATTESTATOR, { from: AUTHORITY }).should.be.fulfilled
    // })

    // it('Can only attestor verifiy register removal for user or livestock', async function () {
    //     await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_2);
    //     (await livestock.ownerOf(1)).should.be.equal(ADDRESS_2)
    //     await erc820Registry.removeInterfaceImplementer(ADDRESS_2, COW_1, { from: ADDRESS_2 }).should.be.fulfilled
    //     await erc820Registry.verifyInterfaceRemoval(ADDRESS_2, COW_1, { from: AUTHORITY }).should.be.rejectedWith(ERROR_MSG)
    //     await erc820Registry.verifyInterfaceRemoval(ADDRESS_2, COW_1, { from: ADDRESS_1 }).should.be.fulfilled;
    //     (await livestock.exists(1)).should.be.equal(false)
    // })

    // it('Transfer livestock to other user will transfer register to that user', async function () {
    //     await setLivestock(ADDRESS_2, COW_1, MULTICHAIN_ADR_2).should.be.fulfilled
    //     var interfaces = await erc820Registry.getInterfaceImplementer(ADDRESS_2, COW_1)
    //     isSet(interfaces).should.be.equal(true)
    //     livestock.transfer(ADDRESS_1, 1, { from: ADDRESS_2 }).should.be.fulfilled
    //     isSet(await erc820Registry.getInterfaceImplementer(ADDRESS_2, COW_1))
    //     isEqual(await erc820Registry.getInterfaceImplementer(ADDRESS_1, COW_1), interfaces)
    // })

    async function setLivestock(addr, livestock, multichain) {
        await erc820Registry.setInterfaceImplementer(addr, livestock, multichain, { from: addr }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(addr, livestock, { from: ADDRESS_1 }).should.be.fulfilled
    }

    async function setUser(addr) {
        await erc820Registry.setInterfaceImplementer(addr, USER, MULTICHAIN_ADR_11, { from: addr }).should.be.fulfilled
        await erc820Registry.verifyInterfaceImplementer(addr, USER, { from: ADDRESS_1 }).should.be.fulfilled
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
