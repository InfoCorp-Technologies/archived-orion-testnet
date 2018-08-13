require('dotenv').config({
  path: __dirname + '/../.env'
});

const Tx = require('ethereumjs-tx');
const assert = require('assert')
const fetch = require('node-fetch');
const Web3 = require('web3');
const Web3Utils = require('web3-utils');

const {
  RPC_URL,
  DEPLOYMENT_GAS_PRICE,
  DEPLOYMENT_GAS_LIMIT,
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  GET_RECEIPT_INTERVAL_IN_MILLISECONDS
} = process.env;


const provider = new Web3.providers.HttpProvider(RPC_URL);
const web3 = new Web3(provider);

const GAS_PRICE = Web3Utils.toWei(DEPLOYMENT_GAS_PRICE, 'gwei');
const GAS_LIMIT = DEPLOYMENT_GAS_LIMIT;
const deploymentPrivateKey = Buffer.from(DEPLOYMENT_ACCOUNT_PRIVATE_KEY, 'hex');

async function deployContract(contractJson, args, {from, nonce}) {
  const options = {
    from,
    gasPrice: GAS_PRICE,
  };

  let instance = new web3.eth.Contract(contractJson.abi, options);
  const result = await instance.deploy({
    data: contractJson.bytecode,
    arguments: args
  }).encodeABI();

  const tx = await sendRawTx({
    data: result,
    nonce: Web3Utils.toHex(nonce),
    to: null,
    privateKey: deploymentPrivateKey,
    url: RPC_URL,
  })

  if(tx.status !== '0x1'){
    throw new Error('Tx failed');
  }

  instance.options.address = tx.contractAddress;
  instance.deployedBlockNumber = tx.blockNumber;

  return instance;
}

async function sendRawTx({data, nonce, to, privateKey, url, value = '0x0'}) {
  try {
    let rawTx = {
      nonce,
      gasPrice: Web3Utils.toHex(GAS_PRICE),
      gasLimit: Web3Utils.toHex(GAS_LIMIT),
      to,
      data,
      value
    }
    let tx = new Tx(rawTx);
    tx.sign(privateKey);
    let serializedTx = tx.serialize();
    const txHash = await sendNodeRequest(
      url,
      "eth_sendRawTransaction",
      '0x' + serializedTx.toString('hex')
    );
    console.log('pending txHash', txHash );
    const receipt = await getReceipt(txHash, url);
    return receipt
  } catch (e) {
    console.error(e)
  }
}

async function sendNodeRequest(url, method, signedData){
  const request = await fetch(url, {
    headers: {
      'Content-type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params: [signedData],
      id: 1
    })
  });
  const json = await request.json()
  if(method === 'eth_sendRawTransaction') {
    assert.equal(json.result.length, 66, `Tx wasn't sent ${json}`)
  }

  return json.result;
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getReceipt(txHash, url) {
  await timeout(GET_RECEIPT_INTERVAL_IN_MILLISECONDS);
  let receipt = await sendNodeRequest(url, "eth_getTransactionReceipt", txHash);
  if(receipt === null) {
    receipt = await getReceipt(txHash, url);
  }

  return receipt;
}

module.exports = {
  web3,
  deploymentPrivateKey,
  RPC_URL,
  GAS_LIMIT,
  GAS_PRICE,
  deployContract,
  sendNodeRequest,
  getReceipt,
  sendRawTx
}