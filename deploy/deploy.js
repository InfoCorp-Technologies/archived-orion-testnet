require('dotenv').config({
  path: __dirname + '/../.env'
});

const fs = require('fs');
const { web3 } = require('./src/utils');
const { deployContract } = require('./src/utils');
const {
  DEPLOYMENT_ACCOUNT_ADDRESS,
  WHITELIST_ADDRESS,
  EXCHANGE_ADDRESS,
  REGISTRY_ADDRESS,
  LCT_NAME,
  LCT_SYMBOL,
  LIVESTOCK_NAME,
  LIVESTOCK_SYMBOL
} = process.env;

const LCToken = require('../build/contracts/LCToken.json');
const Livestock = require('../build/contracts/Livestock.json');

async function deploy() {
  let nonce = await web3.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);

/*   console.log('\ndeploying LCToken contract');
  const lCTokenDeployed = await deployContract(LCToken,
    [LCT_NAME, LCT_SYMBOL, 18, WHITELIST_ADDRESS, EXCHANGE_ADDRESS],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );
  nonce++; */


  console.log('\ndeploying LCToken contract');
  const livestockDeployed = await deployContract(Livestock,
    [LIVESTOCK_NAME, LIVESTOCK_SYMBOL, REGISTRY_ADDRESS, WHITELIST_ADDRESS],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );

  console.log("\nDeployment has been completed.\n");

  fs.writeFileSync('./deploymentResults.json', JSON.stringify({
    lCToken: lCTokenDeployed.options.address,
    livestock: livestockDeployed.options.address
  },null,4));
  console.log('\nContracts Deployment have been saved to `deploymentResults.json`\n')
}

deploy()