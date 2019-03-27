class AlreadyProcessedError extends Error {}
class AlreadySignedError extends Error {}
class IncompatibleContractError extends Error {}
class InvalidValidatorError extends Error {}
class RecipientNotWhitelisted extends Error {}

module.exports = {
  AlreadyProcessedError,
  AlreadySignedError,
  IncompatibleContractError,
  InvalidValidatorError,
  RecipientNotWhitelisted
}
