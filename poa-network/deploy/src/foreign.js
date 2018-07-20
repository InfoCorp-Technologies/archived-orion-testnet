const Web3Utils = require('web3-utils')
require('dotenv').config({
  path: __dirname + '/../.env'
});

const assert = require('assert');

const { deployContract, sendRawTx } = require('./deploymentUtils');
const { 
  web3Foreign, 
  deploymentPrivateKey, 
  FOREIGN_GAS_PRICE 
} = require('./web3');

const EternalStorageProxy = require('../../build/contracts/EternalStorageProxy.json');
const BridgeValidators = require('../../build/contracts/BridgeValidators.json')
const ForeignBridge = require('../../build/contracts/ForeignBridge.json')

const VALIDATORS = process.env.VALIDATORS.split(" ")
const NETWORK = 'foreign';

const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  REQUIRED_NUMBER_OF_VALIDATORS,
  FOREIGN_RPC_URL,
  FOREIGN_OWNER_MULTISIG,
  FOREIGN_UPGRADEABLE_ADMIN_VALIDATORS,
  FOREIGN_UPGRADEABLE_ADMIN_BRIDGE,
  FOREIGN_DAILY_LIMIT,
  FOREIGN_MAX_AMOUNT_PER_TX,
  FOREIGN_MIN_AMOUNT_PER_TX,
  FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS,
  FOREIGN_SENC_ADDRESS,
} = process.env;

async function deployForeign() {
  let foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);
  console.log('========================================')
  console.log('deploying ForeignBridge')
  console.log('========================================')

  console.log('\ndeploying storage for foreign validators')
  const storageValidatorsForeign = await deployContract(EternalStorageProxy, [], { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: NETWORK, nonce: foreignNonce })
  foreignNonce++;
  console.log('\n[Foreign] BridgeValidators Storage: ', storageValidatorsForeign.options.address)

  console.log('\ndeploying implementation for foreign validators')
  let bridgeValidatorsForeign = await deployContract(BridgeValidators, [], { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: NETWORK, nonce: foreignNonce })
  foreignNonce++;
  console.log('\n[Foreign] BridgeValidators Implementation: ', bridgeValidatorsForeign.options.address)

  console.log('\nhooking up eternal storage to BridgeValidators')
  const upgradeToBridgeVForeignData = await storageValidatorsForeign.methods.upgradeTo('1', bridgeValidatorsForeign.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txUpgradeToBridgeVForeign = await sendRawTx({
    data: upgradeToBridgeVForeignData,
    nonce: foreignNonce,
    to: storageValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txUpgradeToBridgeVForeign.status, '0x1', 'Transaction Failed');
  foreignNonce++;

  console.log('\ninitializing Foreign Bridge Validators with following parameters:')
  console.log(`\nREQUIRED_NUMBER_OF_VALIDATORS: ${REQUIRED_NUMBER_OF_VALIDATORS}, VALIDATORS: ${VALIDATORS}`)
  bridgeValidatorsForeign.options.address = storageValidatorsForeign.options.address
  const initializeForeignData = await bridgeValidatorsForeign.methods.initialize(
    REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, FOREIGN_OWNER_MULTISIG
  ).encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txInitializeForeign = await sendRawTx({
    data: initializeForeignData,
    nonce: foreignNonce,
    to: bridgeValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txInitializeForeign.status, '0x1', 'Transaction Failed');
  const validatorOwner = await bridgeValidatorsForeign.methods.owner().call();
  assert.equal(validatorOwner.toLowerCase(), FOREIGN_OWNER_MULTISIG.toLocaleLowerCase());
  foreignNonce++;

  console.log('\nTransferring ownership of ValidatorsProxy')
  const validatorsForeignOwnershipData = await storageValidatorsForeign.methods.transferProxyOwnership(FOREIGN_UPGRADEABLE_ADMIN_VALIDATORS)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txValidatorsForeignOwnershipData = await sendRawTx({
    data: validatorsForeignOwnershipData,
    nonce: foreignNonce,
    to: storageValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txValidatorsForeignOwnershipData.status, '0x1', 'Transaction Failed');
  foreignNonce++;
  const newProxyValidatorsOwner = await storageValidatorsForeign.methods.proxyOwner().call();
  assert.equal(newProxyValidatorsOwner.toLowerCase(), FOREIGN_UPGRADEABLE_ADMIN_VALIDATORS.toLowerCase());

  console.log('\ndeploying foreignBridge storage')
  const foreignBridgeStorage = await deployContract(EternalStorageProxy, [], { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: NETWORK, nonce: foreignNonce })
  foreignNonce++;
  console.log('\n[Foreign] ForeignBridge Storage: ', foreignBridgeStorage.options.address)

  console.log('\ndeploying foreignBridge implementation')
  const foreignBridgeImplementation = await deployContract(ForeignBridge, [], { from: DEPLOYMENT_ACCOUNT_ADDRESS, network: NETWORK, nonce: foreignNonce })
  foreignNonce++;
  console.log('\n[Foreign] ForeignBridge Implementation: ', foreignBridgeImplementation.options.address)

  console.log('\nhooking up ForeignBridge storage to ForeignBridge implementation')
  const upgradeToForeignBridgeData = await foreignBridgeStorage.methods.upgradeTo('1', foreignBridgeImplementation.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txUpgradeToForeignBridge = await sendRawTx({
    data: upgradeToForeignBridgeData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txUpgradeToForeignBridge.status, '0x1', 'Transaction Failed');
  foreignNonce++;

  console.log('\ninitializing Foreign Bridge with following parameters:')
  console.log(`\nForeign Validators: ${storageValidatorsForeign.options.address},
  FOREIGN_DAILY_LIMIT : ${FOREIGN_DAILY_LIMIT} which is ${Web3Utils.fromWei(FOREIGN_DAILY_LIMIT)} in eth,
  FOREIGN_MAX_AMOUNT_PER_TX: ${FOREIGN_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(FOREIGN_MAX_AMOUNT_PER_TX)} in eth,
  FOREIGN_MIN_AMOUNT_PER_TX: ${FOREIGN_MIN_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(FOREIGN_MIN_AMOUNT_PER_TX)} in eth
  `)
  foreignBridgeImplementation.options.address = foreignBridgeStorage.options.address
  const initializeFBridgeData = await foreignBridgeImplementation.methods.initialize(
    storageValidatorsForeign.options.address, FOREIGN_SENC_ADDRESS, FOREIGN_DAILY_LIMIT, FOREIGN_MAX_AMOUNT_PER_TX, FOREIGN_MIN_AMOUNT_PER_TX, FOREIGN_GAS_PRICE, FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS
  ).encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txInitializeBridge = await sendRawTx({
    data: initializeFBridgeData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txInitializeBridge.status, '0x1', 'Transaction Failed');
  foreignNonce++;

  const bridgeOwnershipData = await foreignBridgeStorage.methods.transferProxyOwnership(FOREIGN_UPGRADEABLE_ADMIN_BRIDGE)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS });
  const txBridgeOwnershipData = await sendRawTx({
    data: bridgeOwnershipData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL,
    network: NETWORK
  });
  assert.equal(txBridgeOwnershipData.status, '0x1', 'Transaction Failed');
  foreignNonce++;
  const newProxyBridgeOwner = await foreignBridgeStorage.methods.proxyOwner().call();
  assert.equal(newProxyBridgeOwner.toLowerCase(), FOREIGN_UPGRADEABLE_ADMIN_BRIDGE.toLowerCase());

  return {
    foreignBridge:
    {
      address: foreignBridgeStorage.options.address,
      deployedBlockNumber: Web3Utils.hexToNumber(foreignBridgeStorage.deployedBlockNumber)
    },
    sencToken: { address: FOREIGN_SENC_ADDRESS }
  }
}

module.exports = deployForeign;