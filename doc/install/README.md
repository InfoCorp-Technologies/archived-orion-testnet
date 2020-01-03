# Sentinel Chain Network Installation Guide

## Sentinel Chain Nodes

### Dependencies
- Paritt v1.11.11

### 1) How to install Parity

Follow [this](parity_installation.md) guide to install Parity.

### 2) Nodes installation

#### 2.1 Create the node accounts

You need to create one accounts for each Authority node that you want to create. We recommend to use the following group of nodes:

- Authority
- Main
- RPC

**Note:** The accounts should be in Keystore V2 format and you can use the tool of your choice to create it.

#### 2.2 Create password file

Once you have created the keystore you need to save the password in a plain text file:

```bash
echo PASSWORD >> password.txt
```

### 3) Run the nodes

#### 3.1 Authority node

First of all you need to run the Authority nodes, in this case we are going to create only one.

Set this environment variables:
- `AUTH_PUB_KEY`: Authority public address (from the account).
- `AUTH_PASS_PATH`: Path to the Authority account password file.

And then, run the node:

```bash
$ parity \
    --chain=sentile.json \
    --unlock=$AUTH_PUB_KEY \
    --password=$AUTH_PASS_PATH \
    --author=$AUTH_PUB_KEY \
    --engine-signer=$AUTH_PUB_KEY \
    --min-gas-price=0 \
    --gas-floor-target=7000000 \
    --reseal-max-period=900000
```
Once the Authority is running, copy the Authority `enode` and set it as env variable:

```bash
$ export $AUTH_ENODE='enode://6f8a...2a0@192.168.1.1:30303'
```

#### 3.2 Main node

This node is created in order to use it to visualize the information of the block explorer and to achieve that we must set certain values that allow us trace transactions and enumerate all accounts and storage keys.

```bash
$ parity \
    --chain=sentile.json \
    --bootnodes=[$AUTH_ENODE] \
    --tracing='on' \
    --fat-db='on' \
    --pruning='archive'
```

#### 3.3 RPC node

This node will be used to connect the Dapps or services to the blockchain.

```bash
$ parity \
    --chain=sentile.json \
    --bootnodes=[$AUTH_ENODE] \
    --jsonrpc-interface='all' \
    --jsonrpc-cors=['all'] \
    --jsonrpc-hosts=['all'] \
    --jsonrpc-apis=['all'] \
    --ws-interface='all'
```

## Sentinel Chain Block Explorer

Blockchain explorer built with NodeJS, Express and Parity. It does not require an external database and retrieves all information on the fly from a backend Sentinel node.

[Sentinel Chain Block Explorer installation guide](https://github.com/InfoCorp-Technologies/sentinel-chain-explorer)

## Sentinel Chain Netstats

In order to install netstats component you need to install the **server** and the **client**.

The netstat server is a visual interface for tracking proof-of-authority network status. It uses WebSockets to receive stats from running nodes and output them through an angular interface.

[Sentinel Chain Netstat Server installation guide](https://github.com/InfoCorp-Technologies/sentinel-chain-netstats-server)

The client is the backend service which runs along with ethereum and tracks the network status, fetches information through JSON-RPC and connects through WebSockets to netstats-server to feed information.

[Sentinel Chain Netstat Client installation guide](https://github.com/InfoCorp-Technologies/sentinel-chain-netstats-client)

## Sentinel Chain Bridge

Oracle responsible for listening to bridge related events and authorizing asset transfers.

[Sentinel Chain Bridge installation guide](../../services/bridge-oracle/README.md)
