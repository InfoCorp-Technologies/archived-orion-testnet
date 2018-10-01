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

![Cross-Chain Architecture](https://raw.githubusercontent.com/InfoCorp-Technologies/sentinel-chain-network/develop/cross-chain-arch.png "Cross-Chain Architecture")

### Contracts

* **Validator**
  * This contract starts with an initial set of validators supporting each other. Validator can add or remove support given to as many addresses as they want.
* **Operation**
  * Is used to upload information about fork, all nodes receive that information and decide to accept the fork or not.
* **Whitelist**
  * In this contract are stored the address of the users that can be trade or receive SENI, LCT and Livestock Tokens.
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
|Orion Bridge|[0xC1949F417Cb8f847d040F47C9206789445E421eF](https://orion-explorer.sentinel-chain.org/account/0xC1949F417Cb8f847d040F47C9206789445E421eF)|
|Orion Validator|[0xBDabF208E23c0417c78B9F254DBbd155fCB4667C](https://orion-explorer.sentinel-chain.org/account/0xBDabF208E23c0417c78B9F254DBbd155fCB4667C)|
|Kovan Bridge|[0xC705BFaF78d952273EF98bd2C6B9b373AdC53f8e](https://kovan.etherscan.io/address/0xC705BFaF78d952273EF98bd2C6B9b373AdC53f8e)|
|Kovan Validator|[0x07c7F15B4f6f1AD0C0E8bD346AF0d05396C97c57](https://kovan.etherscan.io/address/0x07c7F15B4f6f1AD0C0E8bD346AF0d05396C97c57)|

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