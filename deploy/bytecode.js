const fs = require('fs');
const solc = require('solc')
const path = require("path");
const find = require('find');
const { web3 } = require('./src/utils');

const CONTRACTS_DIR = ['../contracts/', '../node_modules/zeppelin-solidity/contracts/'];

function findImports (pathName) {
    try {
        let file = path.basename(pathName);
        let files, result;
        for (let i = 0; i < CONTRACTS_DIR.length; i++) {
            files = find.fileSync(file, CONTRACTS_DIR[i]);
            if (files.length) break;
        }
        const contractPath = path.resolve(files[0]);
        if (fs.existsSync(contractPath)) {
            result = fs.readFileSync(contractPath, 'utf8');
        } else {
            throw new Error(`File ${contractPath} not found`);
        }
        return { contents: result };
    } catch(e) {
        return { error: e.message };
    }
}

async function getbytecode(compiledContracts, contractName, args) {
	const abi = JSON.parse(compiledContracts.contracts[contractName].interface);
	let bytecode = compiledContracts.contracts[contractName].bytecode;

    const contract = new web3.eth.Contract(abi);
    const deploy = await contract.deploy({data: '0x' + bytecode, arguments: args});
    bytecode = await deploy.encodeABI();
    return bytecode;
}

async function main() {
    var input = {
        'ValidatorSet.sol': fs.readFileSync('../contracts/validator-contracts/ValidatorSet.sol', 'utf8'),
        'Operations.sol': fs.readFileSync('../contracts/operation-contracts/Operations.sol', 'utf8'),
        'Whitelist.sol': fs.readFileSync('../contracts/sesc-contracts/Whitelist.sol', 'utf8'),
        'Exchange.sol': fs.readFileSync('../contracts/sesc-contracts/Exchange.sol', 'utf8'),
        'Registry.sol': fs.readFileSync('../contracts/registry-contracts/Registry.sol', 'utf8'),
        'DataQuery.sol': fs.readFileSync('../contracts/oracle-contracts/DataQuery.sol', 'utf8')
    };

	console.log('Contracts compilation...')
    const compiledContracts = solc.compile({sources: input}, 1, findImports);
    const validatorBytecode = await getbytecode(compiledContracts, 'ValidatorSet.sol:ValidatorSet', [
        [
            '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb',
            '0xdd9c3863dc6d56a96dc417074d0d82a33e010f94',
            '0xe132c75a856370c4cf9ea732e77a634ba75566ad'
        ],
        '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb'
    ]);
    const operationsBytecode = await getbytecode(compiledContracts, 'Operations.sol:Operations', [
        '0x0000000000000000000000000000000000000005'
    ]);
    const whitelistBytecode = await getbytecode(compiledContracts, 'Whitelist.sol:Whitelist', [
        '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb'
    ]);
    // const exchangeBytecode = await getbytecode(compiledContracts, 'Exchange.sol:Exchange', [
    //     '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb',
    //     '0x6415cb729a27e9b69891dadafcbbcae21e5b6f9c',
    //     '0x0000000000000000000000000000000000000007'
    // ]);
    // const registryBytecode = await getbytecode(compiledContracts, 'Registry.sol:Registry', [
    //     '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb'
    // ]);
    // const oracleBytecode = await getbytecode(compiledContracts, 'DataQuery.sol:DataQuery', [
    //     '0x574366e84f74f2e913ad9a6782ce6ac8022e16eb',
    //     '0x00dc7b3229f23c975e0510fdb9cbcc4e695729fd',
    // ]);

    // Export to json file
    fs.writeFileSync('./bytecodes.json', JSON.stringify({
        "0x0000000000000000000000000000000000000005": {
            "constructor": validatorBytecode
        },
        "0x0000000000000000000000000000000000000006": {
            "constructor": operationsBytecode
        },
        "0x0000000000000000000000000000000000000007": {
            "constructor": whitelistBytecode
        },
        // "0x0000000000000000000000000000000000000008": {
        //     "constructor": exchangeBytecode
        // },
        // "0x0000000000000000000000000000000000000009": {
        //     "constructor": registryBytecode
        // },
        // "0x0000000000000000000000000000000000000010": {
        //     "constructor": oracleBytecode
        // },
    },null,2));

    console.log('\n|> Contracts bytecodes have been saved to `bytecodes.json`\n')
};

main();