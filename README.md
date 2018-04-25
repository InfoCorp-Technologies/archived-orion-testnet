![Sentinel Chain](https://cryptoindex.co/coinlogo/sentinel-chain.png "Sentinel Chain")

# Sentinel Chain Network

**To start Sentinel Chain node just run:**

```
$ parity --config config.toml
```

#### Parameters
##### Chain

* **Chain Name**: "Sentinel Chain"
##### Block confiration

* **stepDuration:** 60 s/block if no TX found
* **BlockReward:** 0x16345785D8A0000 -> 0.1 ETH per Block
* **reseal_on_tx:** yes because of Aura.

##### Mining Configuration

* **From block 0 to 1000:**  Validator List Array
  * **address** 0x574366e84f74f2e913ad9a6782ce6ac8022e16eb

* **From block 1000 to N:** ImmediateSet Validator
  * **Contract at address:** 0x0000000000000000000000000000000000000005
##### Troubleshooting

* **Log:** can be found at parity.log file.

