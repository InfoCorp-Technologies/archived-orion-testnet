require('dotenv').config({
  path: __dirname + '/../.env'
});

const fs = require('fs');
const { web3 } = require('./src/utils');
const { deployContract } = require('./src/utils');
const { DEPLOYMENT_ACCOUNT_ADDRESS } = process.env;

const LCToken = require('../build/contracts/LCToken.json');

async function deploy() {
  let nonce = await web3.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS);

  console.log('\ndeploying LCToken contract');
  const lCTokenDeployed = await deployContract(LCToken,
    [
      "Local Currency Token Myanmar",
      "LCT.MMK",
      18,
      "0x0000000000000000000000000000000000000007",
      "0x0000000000000000000000000000000000000008",
    ],
    {from: DEPLOYMENT_ACCOUNT_ADDRESS, nonce: nonce}
  );

  console.log("\nDeployment has been completed.\n");

  fs.writeFileSync('./deploymentResults.json', JSON.stringify({
    lCToken: lCTokenDeployed.options.address
  },null,4));
  console.log('\nContracts Deployment have been saved to `deploymentResults.json`\n')
}

deploy()