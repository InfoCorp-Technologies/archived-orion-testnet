![Sentinel Chain](https://cryptoindex.co/coinlogo/sentinel-chain.png "Sentinel Chain")

# The Orion testnet

## Components

* **Consortium nodes**
  * This nodes maintain blockchain integrity and help strengthen the network keeping an exact same copy of the entire transaction history

* **Validator nodes**
  * This is a special type of node which is able to create or issue blocks. In PoA type of blockchain a miner is rather called “validator”

* **Bridge Authorities**
  * This nodes are the ones who will provided the required signatures to be able to perform cross-chain transaction between Orion and other EVM based blockchain.

* **RPC nodes**
  * The purpose of RPC nodes is to provide a way to interact programmatically with the blockchain without having to install the client and download the entire transaction history

### Contracts

* **Validator**
  * This contract starts with an initial set of validators supporting each other. Validator can add or remove support given to as many addresses as they want.

* **Operation**
  * It is used to upload information about forks, all nodes receive information and decide to accept whether to vote fork approval or not.

* **Whitelist**
  * In this contract is stored the address of the users that can be trade or receive SENI, LCT and Livestock Tokens.

* **Exchange Service**
  * With this contract the users can exchange SENI to LCT or vice versa. As a requirement the exchange can only be executed by whitelisted addresses previously registered in the Whitelist contract.

* **Registry**
  * In Multichain-based CrossPay Blockchain, wallet addresses can represent different entities: farmer, attestor, livestock, etc, and each entities contain different data structure to be stored. These information can be query by users in the Sentinel Chain Blockchain using the Data Query Contract, through the CrossPay addresses of those entities and then stored the results in the Registry Contract.

* **Data Query**
  * With this contract the users can start an query to the CrossPay server to get the information of an Multichain address in CrossPay's Multichain streams. The query transaction can be called by anyone and is free from fee.

* **LCT Token**
  * It is a ERC2-compaitble token that is only transferable between addresses stored in the Whitelist contract. There will be multiple LCT Token contracts for each of the countries in the CrossPay network. The symbol of each token will be composed for the "LCT" prefix and the country currency symbol, for example, the Myanmar token symbol would be "LCT.MMK".

* **Livestock Token**
  * This token reprecents the real world assets livestock as a token. As LCT token there will be multiple Livestock Token contracts for each type of livestock, for example, there will be an Livestock Token for cows with the symbol "COW". Each token from a type it will related to one Multichain address and this data is registered in the Registry Contract.

## Cross-Chain Architecture

![Cross-Chain Architecture](https://github.com/InfoCorp-Technologies/orion-testnet-private/blob/master/cross-chain-arch.png "Cross-Chain Architecture")

### Contracts

* **Orion Bridge**
  * This contract is in charge to lock and unlock SENI tokens in Sentinel Chain when a relay event will be performed.
* **Orion Validator**
  * In this contract are stored the address of who will provided the signature.
* **Kovan Bridge**
  * It carry out the same function as Orion Bridge contract, but this contract is in charge to lock and unlock a replic of the SENC Tokens, deployed on Kovan testnet.
* **Kovan Validator**
  * In this contract are stored the address of who will provided the signature

## Contract address

| Name | Address |
|------|---------|
|Validator|[0x0000000000000000000000000000000000000005](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000005)|
|Operation|[0x0000000000000000000000000000000000000006](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000006)|
|Whitelist|[0x0000000000000000000000000000000000000007](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000007)|
|Exchange service|[0x0000000000000000000000000000000000000008](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000008)|
|Registry|[0x0000000000000000000000000000000000000009](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000009)|
|Data query oracle|[0x0000000000000000000000000000000000000010](https://orion-explorer.sentinel-chain.org/account/0x0000000000000000000000000000000000000010)|
|LCT Token (LCT.MMK)|[0xB67c73Ac6CB183d208209007c70376f3dc66008a](https://orion-explorer.sentinel-chain.org/account/0xB67c73Ac6CB183d208209007c70376f3dc66008a)|
|Livestock Token (COW)|[0x793A77Adc002712228E8cE5a745e5e6FD8Fb9d7f](https://orion-explorer.sentinel-chain.org/account/0x793A77Adc002712228E8cE5a745e5e6FD8Fb9d7f)|
|Orion Bridge|[0x2ae1C6F57A81caeD383658535d6312B836dE9295](https://orion-explorer.sentinel-chain.org/account/0x2ae1C6F57A81caeD383658535d6312B836dE9295)|
|Orion Validator|[0x897a111Aa54dfCb4836699e7fb97c16cB48111fc](https://orion-explorer.sentinel-chain.org/account/0x897a111Aa54dfCb4836699e7fb97c16cB48111fc)|
|Kovan Bridge|[0xF0e9eA91c31b8127823F0ba452Cae70c87bFf116](https://kovan.etherscan.io/address/0xF0e9eA91c31b8127823F0ba452Cae70c87bFf116)|
|Kovan Validator|[0x6170CE930A78883B2516Ba9a46A66bCF485580fe](https://kovan.etherscan.io/address/0x6170CE930A78883B2516Ba9a46A66bCF485580fe)|

## Services

* **Explorer** https://orion-explorer.sentinel-chain.org
  * As with all types of blockchains, a block explorer is required for users to track
transaction status, check block issuance, inspect or deploy Smart Contracts, and get the
general state of the blockchain.
* **Statistics** https://orion-stats.sentinel-chain.org
  * Orion statistics page site, which will provide users with real-time and easy to read core information like:
    * Latest transactions
    * Current GASPrice
    * Block creation speed
    * Latest ‘block number’ and
    * Validators list
* **Cross-Chain Bridge** https://orion-bridge.sentinel-chain.org/
  * This service is comprised of different applications to manage:
    * Transaction queue
    * Real time event listenersiii. Signature collection
    * Transaction execution
* **Oracle services**
  * Sentinel Oracle Services
    * Are used to gain access to ​ vital market information
such as prices and exchange rates. They also interact with Sentinel Chain’s
data-query service to perform cross-chain information retrieval.
  * Cross-Chain Oracle Services
    * Are used to gain access to data stored on the
CrossPay private blockchain utilising the block number and transaction id on the
private blockchain.
* **RPC Service**
  * The public RPC service that connects with MetaMask, MeW or other application
and interact programmatically with Orion testnet
    * RPC: https://orion-rpc.sentinel-chain.org
    * Websocker: https://orion-rpc.sentinel-chain.org/ws
