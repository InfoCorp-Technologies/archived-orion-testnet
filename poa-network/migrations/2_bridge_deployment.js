const BridgeValidators = artifacts.require("./BridgeValidators.sol");
const HomeBridge = artifacts.require("./HomeBridge.sol");
const ForeignBridge = artifacts.require("./ForeignBridge.sol");

module.exports = async function(deployer, network, accounts) {
  if(process.env.DEPLOY_NORMAL === true){
    let validators = ["0xb8988b690910913c97a090c3a6f80fad8b3a4683"]
    const homeDailyLimit = '1000000000000000000' // 1 ether
    const foreignDailyLimit = '1000000000000000000' // 1 ether
    console.log('deploying validators')
    await deployer.deploy(BridgeValidators, '1', validators);
    const validatorContract = await BridgeValidators.deployed();
    console.log('deploying home')
    await deployer.deploy(HomeBridge, validatorContract.address, homeDailyLimit);
    console.log('deploying ForeignBridge')
    await deployer.deploy(ForeignBridge, validatorContract.address, '0xAa3E272E3bfd016Fa239725a6d059004A344319d', foreignDailyLimit);
    await ForeignBridge.deployed();

    console.log('all is done')
  }

};
