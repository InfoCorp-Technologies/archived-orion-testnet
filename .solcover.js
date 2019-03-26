module.exports = {
    norpc: true,
    testCommand: 'node --max-old-space-size=4096 ./node_modules/.bin/truffle test --network coverage',
    compileCommand: 'node --max-old-space-size=4096 ./node_modules/.bin/truffle compile --network coverage',
    skipFiles: [
        'Migrations.sol',
        'ERC677ReceiverTest.sol',
        'ForeignBridgeV2.sol',
        'RevertFallback.sol',
        'SENCTest.sol'
    ],
    copyNodeModules: true
}
