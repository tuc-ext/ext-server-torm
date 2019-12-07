'use strict'
const Ling = require('so.ling')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')
const Internation = require('../../../so/so.base/Internation.js')

/****************** 类和原型 *****************/
const DAD = module.exports = function User (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  uuid: { default: undefined, sqlite: 'TEXT PRIMARY KEY', mysql: 'VARCHAR(64) PRIMARY KEY' },
  phone: { default: undefined, sqlite: 'TEXT' },
  passwordServer: { default: undefined, sqlite: 'TEXT' },
  portrait: { default: undefined, sqlite: 'TEXT' },
  nickname: { default: undefined, sqlite: 'TEXT' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.identify = DAD.api1.identify = async function(option){
  if (option && Internation.validatePhone({phone:option.phone})) {
    let user = await DAD.getOne({User: {phone:option.phone}})
    let _state, uuid
    if (user) {
      uuid = user.uuid
      _state = 'OLD_USER'
    } else {
      uuid = Uuid.v4(),
      _state = 'NEW_USER'
    }
    console.log(`>>>>>>>>>> identify::::::: uuid = ${uuid}`)
    return {
      _state,
      uuid,
      _passtoken: Webtoken.createToken({
        phone: option.phone,
        uuid,
        identifyState: _state
      })
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.sendPasscode = async function(option){
  let _state
  let passcode = ticCrypto.randomNumber({length:6})
  console.log('passcode = '+passcode)
  let passcodeHash = ticCrypto.hash(passcode+option._passtokenSource.uuid)
  console.log('uuid = '+option._passtokenSource.uuid)
  console.log('passcodeHash = '+passcodeHash)
  console.log('phone = '+option._passtokenSource.phone)
  let passcodeSentAt = undefined
  let passcodeExpireAt = undefined
  // send SMS
  let sendResult
  if (wo.Config.env==='development') {
    sendResult = {state:'DONE'}
  }else {
    sendResult = await Messenger.sendSms(
      option._passtokenSource.phone, 
      { vendor: 'aliyun',
        msgParam: {code: passcode},
        templateCode: 'SMS_142465215',
        signName: 'LOG'
      }
    )
  }
  if (sendResult.state==='DONE') {
    _state = 'PASSCODE_SENT'
    passcodeSentAt = new Date()
    passcodeExpireAt = new Date(Date.now()+5*60*1000)
    return {
      _state,
      passcodeHash,
      passcodeSentAt,
      passcodeExpireAt,
      _passtoken: Webtoken.createToken(Object.assign(
        option._passtokenSource, { 
          passcodeHash,
          passcodeState: _state,
          passcodeSentAt,
          passcodeExpireAt,
        }
      ))
    }
  }else{
    return {
      _state: 'PASSCODE_UNSENT'
    }
  }
}

DAD.api.verifyPasscode = async function(option){
  let _state
  if (option && option.passcode && option._passtokenSource && new Date() < new Date(option._passtokenSource.passcodeExpireAt)) {
    if (ticCrypto.hash(option.passcode+option._passtokenSource.uuid)===option._passtokenSource.passcodeHash) {
      _state = 'VERIFY_SUCCESS'
    }else{
      _state = 'VERIFY_FAILED'
    }
    return { 
      _state,
      _passtoken: Webtoken.createToken(Object.assign(
        option._passtokenSource, 
        {
          verifyState: _state
        }
      ))
    }
  }
  return {
    _state: 'INPUT_MALFORMED'
  }
}

DAD.api.register = DAD.api1.register = async function(option){
  console.log(`>>>>>>>>>> register::::::: option._passtokenSource.uuid = ${option._passtokenSource.uuid}`)
  console.log(`>>>>>>>>>> register::::::: option.passwordClient = ${option.passwordClient}`)
  if (option._passtokenSource 
    && option._passtokenSource.identifyState === 'NEW_USER'
    && option._passtokenSource.verifyState === 'VERIFY_SUCCESS'
    && option.phone && option.passwordClient
    && option.phone === option._passtokenSource.phone) {
      let passwordServer = ticCrypto.hash(option.passwordClient + option._passtokenSource.uuid)
      let user = await DAD.addOne( { User: { 
        uuid: option._passtokenSource.uuid,
        phone: option.phone, 
        passwordServer, 
        nickname: option.phone 
      } } )
      if (user) {
        return { 
          _state: 'REGISTER_SUCCESS',
          onlineUser: user,
          _passtoken: Webtoken.createToken({
            uuid: option._passtokenSource.uuid,
            phone: option.phone,
            passwordClient: option.passwordClient,
            onlineState: 'ONLINE',
            onlineSince: new Date,
            onlineExpireAt: new Date(Date.now()+30*24*60*60*1000)
          })
        }
      }else {
        return { _state: 'REGISTER_FAILED' }
      }
  }
  return { _state: 'INPUT_MALFORMED' }
}

DAD.api.login = DAD.api1.login = async function(option){
  console.log(`>>>>>>>>>> register::::::: _passtokenSource.uuid = ${option._passtokenSource.uuid}`)

  if (option && option.passwordClient
    && option._passtokenSource && option._passtokenSource.phone && option._passtokenSource.uuid) {
    let passwordServer = ticCrypto.hash(option.passwordClient+option._passtokenSource.uuid)
    let onlineUser = await DAD.getOne({User:{ uuid: option._passtokenSource.uuid }})
    if (onlineUser) {
      if (onlineUser.passwordServer === passwordServer) {
        return {
          _state: 'LOGIN_SUCCESS',
          onlineUser,
          _passtoken: Webtoken.createToken({
            uuid: option._passtokenSource.uuid
          })
        }
      }else {
        return { 
          _state: 'LOGIN_FAILED_WRONG_PASSWORD'
        }
      }
    }else {
      return { 
        _state: 'LOGIN_FAILED_USER_NOTEXIST'
      }
    }
  }
  return { _state: 'INPUT_MALFORMED'}
}
