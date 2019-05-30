# ORION TESTNET AUDIT

Akomba Labs were tasked with an audit of part of Sentinel Chain's Orion Testnet.

## Background

Sentinel Chain is running several chains linked to each other and the main net by POA Network token bridges.

The audit brief at this stage is to validate and evaluate the impact of customisations to these token bridge contracts.

The contracts in question are currently:

``` text
/contracts/bridge/upgradeable_contracts/ERC677Bridge.sol
/contracts/bridge/upgradeable_contracts/HomeBridgeErctoErc.sol
/contracts/bridge/upgradeable_contracts/Whitelistable.sol * NEW
/contracts/bridge/TollBox.sol * NEW
/contracts/token/SeniToken.sol * NEW
/contracts/token/SeniTokenConfig.sol * NEW
/contracts/shared/IWhitelist.sol * NEW
/contracts/share/Whitelist.sol * NEW
/contracts/share/Operatable.sol
/contracts/validator/IValidatorSet.sol
/contracts/validator/ValidatorSet.sol
```

Those marked `* New` are completely new contracts, the rest are modified from POA Network's token bridge contracts.

## Priciples of audit

We worked with the assumption that the audit of the original POA network code was performed satisfactorily and therefore only looked at the changes to the code.

We enquired about the reason for those changes and examined the code for:

1) Whether they achieve the desired results.
2) Security issues.
3) Gas consumption.

Owing to the complexity of the entire system the system was audited by examining the code and checking for known security issues.

## Conclusions

The code was generally both well written and effective.

A few recommendations were made regarding code structure, particularly regarding to gas usage.

Our conclusion is that the code is ready to be deployed.

## Dependancies

The contracts use openzeppelin version 1.10.0 which can be found at

<https://github.com/OpenZeppelin/openzeppelin-solidity/commit/feb665136c0dae9912e08397c1a21c4af3651ef3>

The code will be contrasted to POA Network's version :

https://github.com/poanetwork/poa-bridge-contracts/commit/46151629adb3dd20e6fb47d4ba91b88c6d388c4f


### ERC677Bridge

Differences:

Added Whitelistable

`onTokenTransfer` implements the fee structure on bridging tokens.

    if tollAddress

        burn all

    otherwise

        source must be whiteListed
        value > tollFee
        take tollValue
        burn the rest

Dependencies

``` list
import "./BasicBridge.sol"; - extra functions
  import "../IBridgeValidators.sol"; - Identical
  import "./OwnedUpgradeability.sol"; - Identical
    import "../IOwnedUpgradeabilityProxy.sol"; - Identical
  import "../upgradeability/EternalStorage.sol"; - Identical
  import "../libraries/SafeMath.sol"; - Identical
  import "./Validatable.sol"; - Identical
    import "../IBridgeValidators.sol"; * repeat
    import "../upgradeability/EternalStorage.sol"; * repeat
  import "./Ownable.sol"; - Identical
    import "../upgradeability/EternalStorage.sol"; * repeat
  import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol"; * Audited

import "../IBurnableMintableERC677Token.sol"; - Identical
  import "./ERC677.sol"; - Identical
    import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol"; * Audited
```

#### BasicBridge.sol

Adds functions to set and get toll amount and address.

### HomeBridgeErctoErc.sol


Constructor initalises extra values in EternalStorage.

* WhiteList
* TollAddress
* TollFee

Removes requirement that (homeGasPrice > 0)

`onExecuteAffirmation` - Now extracts a toll from all valid transfers, claims all funds from invalid ones.

Original:

    update `totalExecutedPerDay`
    mint all tokens to recipient address

New:
    if the address is whiteListed
    and the recipient is not the toll address
    and the value is greater than the toll

        mint the toll_fee => tollAddress
        update `totalExecutedPerDay` by adding (value - toll_fee)
        mint the value - toll_fee to the recipient

    otherwise

        mint everything to the toll_fee address

Dependencies

``` list
import "../../libraries/SafeMath.sol"; - covered
import "../../libraries/Message.sol"; - identical
import "../BasicBridge.sol"; - covered
import "../../upgradeability/EternalStorage.sol"; - covered
import "../../../shared/ERC677/IBurnableMintableERC677Token.sol"; - covered
import "../../../shared/ERC677/ERC677Receiver.sol"; - Identical
import "../BasicHomeBridge.sol"; - Identical
import "../ERC677Bridge.sol"; - covered
import "../OverdrawManagement.sol"; - Identical
```

## Completely New Contracts

### Whitelistable

This provides features for a whitelist to be defined in EthernalStorage and it check if an address is whitelisted.

### Iwhitelist

Interface to WhiteList.

### Whitelist

Standard Whitelist contract using Operator.

### Operatable

Standard Operator contract.

### IValidatorSet

limited interface to ValidatorSet.

### ValidatorSet

Allows adding and removing validators, checking if an address IS a validator.

### SeniToken / SeniTokenConfig

Derives from Zeppelin Burnable, Mintable ERC20 token with ERC677 `onTokenTransfer` function requirement in transferAndCall:

`transfer` requires that destination be whitelisted, if contract tries to call tokenFallback, emits failEvent if tokenFallback reverts, cannot send to bridgeContract

`transferAndCall` requires that destination be whitelisted, if contract, reverts if tokenFallBack reverts

`transferFrom`  requires that destination be whitelisted, allowance to spend and source ownership of sufficient tokens

`mint` , `burn` and `burnFrom` functions standard.

`mint` requires minter status

`burn` requires ownership of sufficient tokens

`burnFrom` requires allowance to spend and source ownership of sufficient tokens

NOTE: with this implementation, the return value of `onTokenTransfer` cannot be checked, only if it reverts.

### TollBox.sol

Receives the bridge fees.

Tokens sent to it from a creditor using the `transfer` function cross to the main net.

Creditors can withdraw a limited amount of fees daily.

## OBSERVATIONS

The contracts were efficiently and accurately coded. Being modified from the POA Network Bridge Contracts limited much of the scope for errors since these contracts are already audited.

There were a few small issues that have been addressed.

## Additions

```
contracts/bridge/upgradable_contracts/BasicForeignBridge.sol
```

### BasicForeignBridge.sol

function `executeSignatures` Remove `messageWithinLimits` check,
`onFailedMessage` removed because no longer needed

