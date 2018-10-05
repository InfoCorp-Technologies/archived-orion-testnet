![Sentinel Chain](https://cryptoindex.co/coinlogo/sentinel-chain.png "Sentinel Chain")

# The Orion testnet

## Components

* **Consortium nodes**
  * This nodes maintain blockchain integrity and help strengthen the network keeping an exact same copy of the entire transaction history.

* **Validator nodes**
  * This is a special type of node which is able to create or issue blocks. In any PoA type of blockchain a miner is rather called “validator”

* **Bridge Authorities**
  * This nodes are the ones who will provided the required signatures to be able to perform cross-chain transaction between Orion and other EVM based blockchains.

* **RPC nodes**
  * The purpose of RPC nodes is to provide a way to interact programmatically with the blockchain without having to install the client and download the entire transaction history

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
    * Real time event listeners. Signature collection
    * Transaction execution
* **Oracle services**
  * Sentinel Oracle Services
    * Oracles are used to gain access to​ vital market information
such as prices and exchange rates. They also interact with Sentinel Chain’s
data-query service to perform cross-chain information retrieval.
  * Cross-Chain Oracle Services
    * Are used to gain access to data stored on the
CrossPay private blockchain.
* **RPC Service**
  * The public RPC service that connects with MetaMask, MeW or other application
and interact programmatically with Orion testnet
    * RPC: https://orion-rpc.sentinel-chain.org
    * Websocket: https://orion-rpc.sentinel-chain.org/ws


## Cross-Chain Architecture

![Cross-Chain Architecture](https://github.com/InfoCorp-Technologies/orion-testnet-private/blob/master/cross-chain-arch.png "Cross-Chain Architecture")

## Contracts

* **Validator**
  * This contract starts with an initial set of fixed validators. Existing Validators can add or remove block issuing permission.

* **Operation**
  * It is used to plan and execute chain forks. Validator nodes receives the information and they can vote whether to accept and approve the fork plan or not. 

* **Whitelist**
  * This contract provides a whitelisting mechanism to include or not addressess that can peform certain type of transactions.

* **Exchange Service**
  * With this contract the users can exchange SENI to LCT or vice versa. As a requirement the exchange can only be executed by whitelisted addresses previously registered in the Whitelist contract.

* **Registry**
  * In Multichain-based CrossPay Blockchain, wallet addresses can represent different entities: farmer, attestor, livestock, etc, and each entities contain different data structure to be stored. These information can be query by users in the Sentinel Chain Blockchain using the Data Query Contract, through the CrossPay addresses of those entities and then stored the results in the Registry Contract.

* **Data Query**
  * With this contract users can start querying to the CrossPay server to get the information of an Multichain address in CrossPay's Multichain streams.

* **LCT Token**
  * It's an ERC20-compaitble token that can only be transfered between addresses stored in the Whitelist contract. There will be multiple LCT Token contracts for each of the countries in the CrossPay network. The symbol of each token will be composed for the "LCT" prefix and the country currency symbol, for example, the Myanmar token symbol would be "LCT.MMK".

* **Livestock Token**
  * This token reprecents the real world assets livestock as a token. As LCT token there will be multiple Livestock Token contracts for each type of livestock, for example, there will be an Livestock Token for cows with the symbol "COW". Each token from a type it will related to one Multichain address and this data is registered in the Registry Contract.

* **Orion Bridge**
  * This contract is in charge to lock and unlock SENI tokens in Sentinel Chain when a relay event is triggered.

* **Orion Validator**
  * This contract store the address(es) that needs to sign transactions for the bridge service in order to accept cross-chain swaps.

* **Kovan Bridge**
  * Same function as Orion Bridge contract, but this contract is in charge to lock and unlock a copy of the SENC Tokens, deployed on Kovan testnet.

* **Kovan Validator**
  * This contract store the address(es) that needs to sign transactions for the bridge service in order to accept cross-chain swaps.

### Address

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
|Kovan SENC ERC20 Token|[0xFd06ABc52da2f7877d210F7FFb341cE7fAF31927](https://kovan.etherscan.io/address/0xfd06abc52da2f7877d210f7ffb341ce7faf31927)|
### Description Table

#### Legend

|  Symbol  |  Meaning  |
|:--------:|-----------|
|    🛑    | Function can modify state |
|    💵    | Function is payable |

|  Contract  |         Type        |       Bases      |                  |                 |
|:----------:|:-------------------:|:----------------:|:----------------:|:---------------:|
|     **Name**      |  **Function Name**  |  **Visibility**  |  **Mutability**  |  **Modifiers**  |
||||||
| **Validator** | Implementation |  |||
| | \<Constructor\> | Public ❗️ | 🛑  | |
|  | isValidator | External ❗️ |   | |
|  | getValidators | Public ❗️ |   | |
|  | getPendings | Public ❗️ |   | |
|  | addValidator | Public ❗️ | 🛑  | is_finalized is_validator |
|  | removeValidator | Public ❗️ | 🛑  | is_finalized is_validator |
|  | initiateChange | Private 🔐 | 🛑  | |
|  | finalizeChange | Public ❗️ | 🛑  | |
|  | setRequiredSignatures | External ❗️ | 🛑  | is_validator |
||||||
| **Operations** | Implementation |  |||
|  | \<Constructor\> | Public ❗️ | 🛑  | |
|  | clientList | Public ❗️ |   | |
|  | clientsRequired | Public ❗️ |   | |
|  | proposeTransaction | Public ❗️ | 🛑  | only_client_owner only_when_no_proxy |
|  | confirmTransaction | Public ❗️ | 🛑  | only_client_owner only_when_proxy only_when_proxy_undecided |
|  | rejectTransaction | Public ❗️ | 🛑  | only_client_owner only_when_proxy only_when_proxy_undecided |
|  | proposeFork | Public ❗️ | 🛑  | only_client_owner only_when_none_proposed |
|  | acceptFork | Public ❗️ | 🛑  | only_when_proposed only_undecided_client_owner |
|  | rejectFork | Public ❗️ | 🛑  | only_when_proposed only_undecided_client_owner only_unratified |
|  | addRelease | Public ❗️ | 🛑  | only_client_owner |
|  | addChecksum | Public ❗️ | 🛑  | only_client_owner |
|  | isLatest | Public ❗️ |   | |
|  | track | Public ❗️ |   | |
|  | latestInTrack | Public ❗️ |   | |
|  | build | Public ❗️ |   | |
|  | release | Public ❗️ |   | |
|  | checksum | Public ❗️ |   | |
|  | noteAccepted | Internal 🔒 | 🛑  | when_is_client |
|  | noteRejected | Internal 🔒 | 🛑  | when_is_client |
|  | checkFork | Internal 🔒 | 🛑  | when_have_all_required |
|  | checkProxy | Internal 🔒 | 🛑  | when_proxy_confirmed |
||||||
| **Whitelist** | Implementation | Ownable |||
|  | \<Constructor\> | Public ❗️ | 🛑  | |
|  | addWhitelist | External ❗️ | 🛑  | onlyOwner |
|  | removeWhitelist | External ❗️ | 🛑  | onlyOwner |
||||||
| **SentinelExchange** | Implementation | Ownable |||
|  | \<Constructor\> | Public ❗️ | 🛑  | |
|  | startExchange | Internal 🔒 | 🛑  | |
|  | exchangeSeni | External ❗️ |  💵 | isCurrency |
|  | exchangeLct | External ❗️ | 🛑  | isCurrency |
|  | callback | External ❗️ | 🛑  | |
|  | claimTokens | External ❗️ | 🛑  | onlyOwner |
|  | currency | External ❗️ |   | |
|  | setCurrency | External ❗️ | 🛑  | onlyOwner |
|  | removeCurrency | External ❗️ | 🛑  | onlyOwner |
|  | setOracle | External ❗️ | 🛑  | onlyOwner |
|  | setWhitelist | External ❗️ | 🛑  | onlyOwner |
||||||
| **Registry** | Implementation | Administration |||
|  | \<Constructor\> | Public ❗️ | 🛑  | |
|  | getManager | Public ❗️ |   | |
|  | setManager | External ❗️ | 🛑  | canManage |
|  | getLivestock | External ❗️ |   | |
|  | setLivestock | External ❗️ | 🛑  | onlyOwner |
|  | removeLivestock | External ❗️ | 🛑  | onlyOwner |
|  | interfaceHash | Public ❗️ |   | |
|  | getInterfaceImplementer | Public ❗️ |   | |
|  | setInterfaceImplementer | External ❗️ | 🛑  | canManage |
|  | verifyInterfaceImplementer | External ❗️ | 🛑  | |
|  | removeInterfaceImplementer | External ❗️ | 🛑  | canManage |
|  | verifyInterfaceRemoval | External ❗️ | 🛑  | |
|  | _getInterfaces | Internal 🔒 |   | |
|  | _isFitWithRule | Internal 🔒 |   | |
|  | decodeHash | Public ❗️ |   | |
||||||
| **Oracle** | Implementation | Ownable |||
|  | \<Constructor\> | Public ❗️ | 🛑  | |
|  | api | External ❗️ |   | |
|  | query | External ❗️ | 🛑  | |
|  | callback | Public ❗️ | 🛑  | |
|  | result | External ❗️ |   | |
|  | setAPI | Public ❗️ | 🛑  | onlyOwner |
|  | setOracle | External ❗️ | 🛑  | onlyOwner |
|  | strConcat | Internal 🔒 |   | |
||||||
| **LCToken** | Implementation | DetailedERC20, MintableToken, BurnableToken |||
|  | \<Constructor\> | Public ❗️ | 🛑  | DetailedERC20 |
|  | transfer | Public ❗️ | 🛑  | canTransfer |
|  | transferFrom | Public ❗️ | 🛑  | canTransfer |
|  | transferFromOwner | External ❗️ | 🛑  | onlyOwner |
|  | exchange | Public ❗️ | 🛑  | |
|  | setWhitelist | External ❗️ | 🛑  | onlyOwner |
||||||
| **Livestock** | Implementation | ERC721Token, Ownable |||
|  | \<Constructor\> | Public ❗️ | 🛑  | ERC721Token |
|  | tokensOfOwner | External ❗️ |   | |
|  | transfer | Public ❗️ | 🛑  | isWhitelisted |
|  | safeTransfer | Public ❗️ | 🛑  | |
|  | safeTransfer | Public ❗️ | 🛑  | |
|  | transferFrom | Public ❗️ | 🛑  | isWhitelisted |
|  | mint | External ❗️ | 🛑  | onlyOwner |
|  | burn | External ❗️ | 🛑  | onlyOwner |
|  | setWhitelist | External ❗️ | 🛑  | onlyOwner |
