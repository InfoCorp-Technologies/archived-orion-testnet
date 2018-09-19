const fs = require('fs');
const solc = require('solc')
const path = require("path");
const find = require('find');
const { web3 } = require('./src/utils');

const CONTRACTS_DIR = ['../contracts/', '../node_modules/zeppelin-solidity/contracts/'];

function findContract(pathName) {
    let file = path.basename(pathName);
    let files;
    for (let i = 0; i < CONTRACTS_DIR.length; i++) {
        files = find.fileSync(file, CONTRACTS_DIR[i]);
        if (files.length) break;
    }
    const contractPath = path.resolve(files[0]);
    if (fs.existsSync(contractPath)) {
        return fs.readFileSync(contractPath, 'utf8');
    } else {
        throw new Error(`File ${contractPath} not found`);
    }
}

function findImports (pathName) {
    try {
        return { contents: findContract(pathName) };
    } catch(e) {
        return { error: e.message };
    }
}

// Compile contracts
var input = {
    'ImmediateSet.sol': fs.readFileSync('../contracts/validator-contracts/ImmediateSet.sol', 'utf8'),
    'Operations.sol': fs.readFileSync('../contracts/operation-contracts/Operations.sol', 'utf8'),
    'Whitelist.sol': fs.readFileSync('../contracts/sesc-contracts/Whitelist.sol', 'utf8'),
    'SentinelExchange.sol': fs.readFileSync('../contracts/sesc-contracts/SentinelExchange.sol', 'utf8'),
    'Registry.sol': fs.readFileSync('../contracts/registry-contracts/Registry.sol', 'utf8'),
    'Oracle.sol': fs.readFileSync('../contracts/oracle-contracts/Oracle.sol', 'utf8')
};

console.log('Compiling contracts..')
let compiledContract = solc.compile({sources: input}, 1, findImports);

// Add encoded parameters
// Validator
const validatorBytecode = '0x' + compiledContract.contracts['ImmediateSet.sol:Validator'].bytecode;
const validatoParameters = web3.eth.abi.encodeParameter("address[]", [
  "0x574366e84f74f2e913ad9a6782ce6ac8022e16eb",
  "0xae9af1e1075c9fb91eec3f619181621142bfd44a",
  "0x38c0a7d8D032dBBB322FE6ef498939Cc813bA034"
]);
// Operations
const operationsBytecode = '0x' + compiledContract.contracts['Operations.sol:Operations'].bytecode;
const operationsParameters = web3.eth.abi.encodeParameter("address", '0x0000000000000000000000000000000000000005');
// Whitelist
const whitelistBytecode = '0x' + compiledContract.contracts['Whitelist.sol:Whitelist'].bytecode;
const whitelistParameters = web3.eth.abi.encodeParameter("address", '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb');
// Sentinel Exchange
const exchangeBytecode = '0x' + compiledContract.contracts['SentinelExchange.sol:SentinelExchange'].bytecode;
const exchangeParameters = web3.eth.abi.encodeParameters(["address", "address", "address"], [
    '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb',
    '0x6415cb729a27e9b69891dadafcbbcae21e5b6f9c',
    '0x0000000000000000000000000000000000000007'
]);
// Registry
const registryBytecode = '0x' + compiledContract.contracts['Registry.sol:Registry'].bytecode;
const registryParameters = web3.eth.abi.encodeParameter("address", '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb');
// Oracle
const oracleBytecode = '0x' + compiledContract.contracts['Oracle.sol:Oracle'].bytecode;
const oracleParameters = web3.eth.abi.encodeParameters(["address", "address"], [
    '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb',
    '0x00dc7b3229f23c975e0510fdb9cbcc4e695729fd'
]);

// Export to json file
fs.writeFileSync('./bytecodes.json', JSON.stringify({
    "0x0000000000000000000000000000000000000005": {
        "constructor": validatorBytecode + validatoParameters
    },
    "0x0000000000000000000000000000000000000006": {
        "constructor": operationsBytecode + operationsParameters
    },
    "0x0000000000000000000000000000000000000007": {
        "constructor": whitelistBytecode + whitelistParameters
    },
    "0x0000000000000000000000000000000000000008": {
        "constructor": exchangeBytecode + exchangeParameters
    },
    "0x0000000000000000000000000000000000000009": {
        "constructor": registryBytecode + registryParameters
    },
    "0x0000000000000000000000000000000000000010": {
        "constructor": oracleBytecode + oracleParameters
    },
},null,2));

console.log('\n|> Contracts bytecodes have been saved to `bytecodes.json`\n')