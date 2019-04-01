# Oracle service - Retrieve livestock information
Implementation of an oracle service which provides information stored in crosspay Database uploading encrypted in Sentinel chain.

## Usage
- First make an copy of the config files:
```bash
$ cp config/config.example.json config/config.json
$ cp config/rsaKeys.example.json config/rsaKeys.json
```
- In the new config.json created, provide the data about Sentinel chain, contract address, crosspay database, executer, and Xpay Multichain.
- Run `$ node endpoint.js` to start listening to incoming queries and check the past ones.

## Decrypter
- Run this command to make an copy of the config file:
```bash
$ cp decrypter/data.example.json decrypter/data.json
```
- In the new data.json created, provide the data obtained from oracle response and private key paired with the public key provided in the query.
- Run decrypter.js and the decrypted result will be logged in terminal.

## About key pairs
- Check [config/rsaKeys.example.json](config/rsaKeys.example.json) to check the correct format to insert rsa keys.


> Please refer to [Proposal solution to re-implement the Oracle service that retrieve livestock details from CrossPay Service](https://infocorptech.atlassian.net/wiki/spaces/SENC/pages/459046946/Proposal+solution+to+re-implement+the+Oracle+service+that+retrieve+livestock+details+from+CrossPay+Service) to obtain detailed information.