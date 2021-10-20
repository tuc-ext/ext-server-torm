'use strict'

const enviconfig = require('base.enviconfig')

const DAD = (module.exports = class System {})

const wo = global.wo

DAD.api = {}

DAD.api.getConfiguration = async function () {
  const result = {
    _state: 'SUCCESS',
    configDynamic: enviconfig.getDynamicConfig(),
  }
  console.log(result)
  return result
}

DAD.api.receiveFile = async function ({ _passtokenSource }) {
  if (_passtokenSource?.isOnline) {
    const file = wo._req?.file
    if (file?.path) {
      file.path = file.path.replace('\\', '/')
      return Object.assign(file, { _state: 'SUCCESS' })
    } else {
      return { _state: 'BACKEND_FAIL_FILE_NOT_RECEIVED' }
    }
  } else {
    return { _state: 'BACKEND_USER_NOT_ONLINE' }
  }
}
