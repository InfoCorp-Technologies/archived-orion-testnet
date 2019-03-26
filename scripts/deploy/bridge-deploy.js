const fs = require('fs')
const path = require('path')
const env = require('./src/loadEnv')

const { ERC20_TOKEN_ADDRESS } = env

const deployResultsPath = path.join(__dirname, './bridgeDeploymentResults.json')


async function deployErcToErc() {
  const deployHome = require('./src/erc_to_erc/home')
  //const deployForeign = require('./src/erc_to_erc/foreign')

  const { homeBridge, erc677 } = await deployHome()
  //const { foreignBridge } = await deployForeign()
  console.log('\nDeployment has been completed.\n\n')
  console.log(
    `[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`
  )
  console.log(`[   Home  ] ERC677 Bridgeable Token: ${erc677.address}`)
  //console.log(
  //  `[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${
  //  foreignBridge.deployedBlockNumber
  //  }`
  //)
  //console.log(`[ Foreign ] ERC20 Token: ${ERC20_TOKEN_ADDRESS}`)
  fs.writeFileSync(
    deployResultsPath,
    JSON.stringify(
      {
        homeBridge: {
          ...homeBridge,
          erc677
        },
        // foreignBridge: {
        //   ...foreignBridge
        // }
      },
      null,
      4
    )
  )
  console.log('Contracts Deployment have been saved to `bridgeDeploymentResults.json`')
}

async function main() {
  await deployErcToErc()
}

main().catch(e => console.log('Error:', e))
