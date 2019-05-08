class AlreadyProcessedError extends Error {}
class AlreadySignedError extends Error {}
class IncompatibleContractError extends Error {}
class InvalidValidatorError extends Error {}
class TxAboveLimitsError extends Error {}

module.exports = {
  AlreadyProcessedError,
  AlreadySignedError,
  IncompatibleContractError,
  InvalidValidatorError,
  TxAboveLimitsError
}
