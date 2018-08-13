require('dotenv').config({
  path: __dirname + '/../.env'
});

const fs = require('fs');
const Web3Utils = require('web3-utils');
const { web3 } = require('./src/utils');
const { deployContract, sendRawTx } = require('./src/utils');
const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  ORACLE_ADDRESS
} = process.env;

const LCToken = require('../build/contracts/LCToken.json');
const Whitelist = require('../build/contracts/Whitelist.json');
const SentinelExchange = require('../build/contracts/SentinelExchange.json');

async function deploy() {
  let nonce = await web3.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);

  console.log('\ndeploying Whitelist contract');
  const whitelistDeployed = await deployContract(Whitelist, [],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );
  nonce++;
  console.log("\nDeployment has been completed.\n");

  console.log('\ndeploying SentinelExchange contract');
  const sentinelExchangeDeployed = await deployContract(SentinelExchange,
    [whitelistDeployed.options.address, ORACLE_ADDRESS],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );
  nonce++;
  console.log("\nDeployment has been completed.\n");

  console.log('\ndeploying LCToken contract');
  const lCTokenDeployed = await deployContract(LCToken,
    [
      "Local Currency Token Myanmar",
      "LCT.MMK",
      18,
      whitelistDeployed.options.address,
      sentinelExchangeDeployed.options.address,
    ],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );
  nonce++;
  console.log("\nDeployment has been completed.\n");

  fs.writeFileSync('./deploymentResults.json', JSON.stringify({
    whitelist: whitelistDeployed.options.address,
    sentinelExchange: sentinelExchangeDeployed.options.address,
    lCToken: lCTokenDeployed.options.address
  },null,4));
  console.log('\nContracts Deployment have been saved to `deploymentResults.json`\n')
}

deploy()