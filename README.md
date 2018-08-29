![Sentinel Chain](https://cryptoindex.co/coinlogo/sentinel-chain.png "Sentinel Chain")

# Sentinel Chain Network

## Getting started

To start Sentinel Chain node just run:

```
$ parity --config config.toml
```

## Parameters
### Chain

* **Chain Name:** "Sentinel Chain"
* **Balances:**
  * Initial miner 0x574366e84f74f2e913ad9a6782ce6ac8022e16eb starts with 1 ETH.

### Block configuration

* **stepDuration:** 60 seconds per block, if no TX found
* **blockReward:** 0x16345785D8A0000 --> 0.1 ETH as reword per block sealed
* **reseal_on_tx:** yes because of Aura consensus.

### Network

* **RPC Port:** 30303

### Mining Configuration

**Multi-set enabled:**

* **From block 0 to 1000:**  Validator List Array
  * **address** 0x574366e84f74f2e913ad9a6782ce6ac8022e16eb

* **From block 1000 to N:** ImmediateSet Validator
  * **Contract at address:** 0x0000000000000000000000000000000000000005

### Troubleshooting

* **Log:** can be found at parity.log file.

## Run Sentinel Chain node whit Docker

First edit docker-compose.yml file, set the ports and choice the NODE_TYPE, according to the corresponding configuration:

  * **default:** config.toml
  * **main:** config-main.toml
  * **rpc:** config-rpc.toml
  * **validator:** config-validator.toml

Then run the node with:

```
$ docker-compose up
```
### Copy files to container
The genesis and config files are in the folder `/sentinel` and the base path on `/sentinel/base-path` inside the container, so if you need to send files to container like keys or password.txt, you can do it by follow this steps.

Create the container:
```
$ docker-compose up --no-start
```

Get the container name:

```
$ docker ps -a
```

Then copy the files usin this command:
```
$ docker cp PATH_TO_YOUR_KEY CONTAINER_NAME:/sentinel/base-path/keys/Sentinel\ Chain/
```

And finally start the container:
```
$ docker-compose up
```