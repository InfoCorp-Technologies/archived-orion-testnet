<div style="text-align:center">
  <img alt="Sentinel Chain" src="https://github.com/InfoCorp-Technologies/orion-testnet/blob/master/doc/img/sentinel-chain-arch.png" />
</div>

# The Orion testnet

## Nodes

* **Authority Nodes**
  * This are the nodes able to create and seal new blocks, they acts as a "miners" in Sentinel Chain. Will also keep a copy of the entire Sentinel chain.

* **Non-Authority nodes**
  * This are regular nodes that have a copy of the entire Sentinel Chain since genesis block, but won't be able to mine or create new blocks, only used for read information of the Blockchain and push transaction into authorities mempool. These are divided into the following categories:
    * **Internal**: are used by the internal services like the Bridge oracle to read information from the Blockchain.
    * **Main**: this kind of node are configured to create an indexed Blockchain database to be used by services like Block Explorer.
    * **RPC**: this nodes are configured to communicate to the Sentinel Chain Blockchain to read information and push transactions, commonly used by Dapps.

## Services

* **Sentinel Chain Bridge**
Sentinel Chain was designed to bring to the users a certain number of services related to cattle and incentive the social inclusion of the farmers. However, in order to do this, SENC will be required as fuel for accessing the Sentinel Chain ecosystem. The Sentinel Chain Bridge simply serves as a method of convert SENC ERC20 tokens from Ethereum Mainnet to SENI ERC20 tokens in Sentinel Chain and vice versa, in a quick and cost-efficient manner. Sentinel Chain makes use of a SENC-pegged cryptocurrency called SENI (Sentinel Chain Internal Token) as transaction payments within Sentinel Chain itself.

* **Sentinel Chain Block Explorer**
Allows users to retrieves all information of the Sentinel Chain Blockchain like blocks, transactions, accounts, contracts and bridge information (required signatures, balances of contracts, deposits and withdraws).

* **Sentinel Chain Netstats**
Statistics page site for tracking Sentinel chain network status, which will provide users with real-time and easy to read core information like latest transactions, current gas price, block creation speed,  latest ‘block number’ and nodes list.

* **Sentinel Chain RPC Provider**
This service provide the connection that Dapps needs to talks with Sentinel Chain. This provider take requests and return response using JSON-RPC encoding protocol.

## Contracts

### Sentinel Chain

* **ValidatorSet**
Sentinel Chain is EVM based blockchain with PoA algorithm consensus (a.k.a Aura), blocks are mined and sealed through a set of validators called "Authorities". In this contract are the addresses of the Authorities that can seal new blocks.

* **Whitelist**
In this contract are stored the addresses of the users that can be trade or receive SENI tokens through the Bridge.

* **SENI Token (Sentinel Chain Internal Token)**
It's an ERC677 token that is used as a fuel to pay for services of the Sentinel Chain ecosystem.

* **Home Bridge**
This contract is in charge to mint or burn SENI tokens when the users starts cross-chain transactions from Sentinel Chain.

* **Bridge Validators**
In this contract are stored the addresses of the Bridge Binaries that are able to sign the cross-chain transactions.

* **Toll Box**
This contract will be used to collect the tolls for the use of the Sentinel Chain Bridge. The toll value is settled down to 10 SENI per cross-chain transaction. The fund accumulated in the Box can be withdrawal by the Creditors once per day and the amount must be below the limit established.

### Ethereum Mainnet

* **Foreign Bridge**
This contract is in charge to lock and unlock SENC tokens when the users starts cross-chain transactions from Ethereum Mainnet.

* **Bridge Validators**
In this contract are stored the addresses of the Bridge Binaries that are able to sign the cross-chain transactions.
