const Whitelist = artifacts.require("./Whitelist.sol");
const LCToken = artifacts.require("./LCToken.sol");



module.exports = async function(deployer, network, accounts) {
    let exchangeAddress = accounts[0];
    console.log('deploying whitelist');
    deployer.deploy(Whitelist);
    const whitelist = await Whitelist.deployed();
    console.log('deploying lctoken');
    deployer.deploy(LCToken, 
        "Local Currency Token Myanmar", 
        "LCT.MMK", 
        18, 
        whitelist.address, 
        exchangeAddress
    );
}