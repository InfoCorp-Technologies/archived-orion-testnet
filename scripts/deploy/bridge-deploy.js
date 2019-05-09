const fs = require('fs')
const path = require('path')
const env = require('./src/loadEnv')

const { SENC_TOKEN_ADDRESS } = env

const CHAIN = process.argv[2];

const foreignDeployResultsPath = path.join(__dirname, './foreignBridgeDeploymentResults.json')
const homeDeployResultsPath = path.join(__dirname, './homeBridgeDeploymentResults.json')

async function doDeployForeign() {
  const deployForeign = require('./src/erc_to_erc/foreign')
  const { foreignBridge } = await deployForeign()
  console.log('\nDeployment has been completed.\n\n')
  console.log(
    `[ Foreign ] ForeignBridge: ${foreignBridge.address} at block ${
    foreignBridge.deployedBlockNumber
    }`
  )
  console.log(`[ Foreign ] ERC20 Token: ${SENC_TOKEN_ADDRESS}`)
  fs.writeFileSync(
    foreignDeployResultsPath,
    JSON.stringify(
      {
        foreignBridge: {
          ...foreignBridge
        }
      },
      null,
      4
    )
  )
  console.log('Contracts Deployment have been saved to `foreignBridgeDeploymentResults.json`')
}

async function doDeployHome() {
  const deployHome = require('./src/erc_to_erc/home')

  const { homeBridge, erc677, tollBox } = await deployHome()
  console.log('\nDeployment has been completed.\n\n')
  console.log(
    `[   Home  ] HomeBridge: ${homeBridge.address} at block ${homeBridge.deployedBlockNumber}`
  )
  console.log(`[   Home  ] ERC677 Bridgeable Token: ${erc677.address}`)
  console.log(`[   Home  ] TollBox Contract: ${tollBox.address}`)
  fs.writeFileSync(
    homeDeployResultsPath,
    JSON.stringify(
      {
        homeBridge: {
          ...homeBridge,
          tollBox,
          erc677
        }
      },
      null,
      4
    )
  )
  console.log('Contracts Deployment have been saved to `homeBridgeDeploymentResults.json`')
}

async function main() {
  if (!CHAIN){
    console.log('Error: you must provide the chain name argument, foreign or home.')
  }else if(CHAIN === 'foreign') {
    await doDeployForeign()
  }else if(CHAIN === 'home') {
    await doDeployHome()
  }
}

main().catch(e => console.log('Error:', e))
