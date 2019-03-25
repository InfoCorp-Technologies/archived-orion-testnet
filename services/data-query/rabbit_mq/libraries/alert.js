require('colors')

module.exports = {
     /**
     * @function success
     * @param {string} _fcn: Function that have been ended succesfully
     * @param {object} _return: (optional). The result of the query.
     */
    success: function(_fcn, _return = null) {
      console.log(
          `${new Date().toLocaleTimeString().blue} - ` +
          `${"Success:".green} ${_fcn} - ` +
          `${_return? ("Return: ".green+_return) : ""}`
      )
  },

  /**
   *
   * @param {*} _info
   */
  info: function(_info) {
      console.log(
          `${new Date().toLocaleTimeString().blue} - ${"Info:".yellow}` +
          ` ${_info}`
      )
  },

  /**
   * @ function error
   * @param {string} _fcn: Function that have been ended succesfully
   * @param {object} _return: (optional). The result of the query.
   */
  error: function(_fcn, _error) {
      console.log(
          `${new Date().toLocaleTimeString().blue} - ${"Error on:".red}` +
          ` ${_fcn} ${"more info: ".yellow +_error}`
      )
  }
}