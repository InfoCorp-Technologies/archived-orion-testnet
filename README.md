![Sentinel Chain](https://cryptoindex.co/coinlogo/sentinel-chain.png "Sentinel Chain")

# Sentinel Chain Network

## The Orion testnet

### Components
* **Consortium nodes**
  * This nodes maintain blockchain integrity and help strengthen the network keeping an exact same copy of the entire transaction history
* **Validator nodes**
  * This is a special type of node which is able to create or issue blocks. In PoA type of blockchain a miner is rather called “validator”
* **Bridge Authorities**
  * This nodes are the ones who will provided the required signatures to be able to perform cross-chain transaction between Orion and other EVM based blockchain. More details will be provided below.
* **RPC nodes**
  * The purpose of RPC nodes is to provide a way to interact programmatically with the blockchain without having to install the client and download the entire transaction history

### Cross-Chain Architecture

![Cross-Chain Architecture](https://github.com/InfoCorp-Technologies/sentinel-chain-network/blob/develop/cross-chain-arch.png "Cross-Chain Architecture")

### Contracts

* **Validator**
  * This contract starts with an initial set of validators supporting each other. Validator can add or remove support given to as many addresses as they want.
* **Operation**
  * It is used to upload information about forks, all nodes receive information and decide to accept whether to vote fork     approval or not.
* **Whitelist**
  * In this contract is stored the address of the users that can be trade or receive SENI, LCT and Livestock Tokens.
* **Exchange Service**
  * With this contract the users can exchange SENI to LCT or vice versa. As a requirement the exchange can only be executed by whitelisted addresses previously registered in the Whitelist contract.

#### Address

| Name | Address |
|------|---------|
|Validator|[0x0000000000000000000000000000000000000005](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000005)|
|Operation|[0x0000000000000000000000000000000000000006](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000006)|
|Whitelist|[0x0000000000000000000000000000000000000007](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000007)|
|Exchange service|[0x0000000000000000000000000000000000000008](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000008)|
|Registry|[0x0000000000000000000000000000000000000009](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000009)|
|Data query oracle|[0x0000000000000000000000000000000000000010](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000010)|

### Bridge Contracts

* **Orion Bridge**
  * This contract is in charge to lock and unlock SENI tokens in Sentinel Chain when a relay event will be performed.
* **Orion Validator**
  * In this contract are stored the address of who will provided the signature.
* **Kovan Bridge**
  * It carry out the same function as Orion Bridge contract, but this contract is in charge to lock and unlock a replic of the SENC Tokens, deployed on Kovan testnet.
* **Kovan Validator**

#### Address

| Name | Address |
|------|---------|
|Orion Bridge|[0x2ae1C6F57A81caeD383658535d6312B836dE9295](https://orion-explorer.sentinel-chain.org/account/0x2ae1C6F57A81caeD383658535d6312B836dE9295)|
|Orion Validator|[0x897a111Aa54dfCb4836699e7fb97c16cB48111fc](https://orion-explorer.sentinel-chain.org/account/0x897a111Aa54dfCb4836699e7fb97c16cB48111fc)|
|Kovan Bridge|[0xF0e9eA91c31b8127823F0ba452Cae70c87bFf116](https://kovan.etherscan.io/address/0xF0e9eA91c31b8127823F0ba452Cae70c87bFf116)|
|Kovan Validator|[0x6170CE930A78883B2516Ba9a46A66bCF485580fe](https://kovan.etherscan.io/address/0x6170CE930A78883B2516Ba9a46A66bCF485580fe)|

### Services

* **Explorer**
  * https://orion-explorer.sentinel-chain.org
* **Statistics**
  * https://orion-stats.sentinel-chain.org
* **Cross-Chain Bridge**
  * https://orion-bridge.sentinel-chain.org/
* **Oracle services**
* **RPC Service**
  * RPC https://orion-rpc.sentinel-chain.org
  * Websocker https://orion-rpc.sentinel-chain.org/ws
