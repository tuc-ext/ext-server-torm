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
  hash: { default: undefined, sqlite: 'TEXT', mysql: 'VARCHAR(64) PRIMARY KEY' },

  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

DAD.api.identify = DAD.api1.identify = async function(option){
  if (option.User && Internation.validatePhone({phone:option.User.phone})) {
    let user = await DAD.getOne({User: {phone:option.User.phone}})
    let _state, uuid
    if (user) {
      uuid = user.uuid
      _state = 'OLD_USER'
    } else {
      uuid = Uuid.v4(),
      _state = 'NEW_USER'
    }
    return {
      _state,
      uuid,
      _passtoken: Webtoken.createToken({
        phone: option.User.phone,
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
  let sendResult = {state:'DONE'} /*await Messenger.sendSms(
    option._passtokenSource.phone, 
    { vendor: 'aliyun',
      msgParam: {code: passcode},
      templateCode: 'SMS_142465215',
      signName: 'LOG'
    }
  )*/
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
  if (option && option.User.passcode && option._passtokenSource && new Date() < new Date(option._passtokenSource.passcodeExpireAt)) {
    if (ticCrypto.hash(option.User.passcode+option._passtokenSource.uuid)===option._passtokenSource.passcodeHash) {
      _state = 'VERIFY_SUCCESS'
    }else{
      _state = 'VERIFY_FAILED'
    }
    return { 
      _state,
      _passtoken: Webtoken.createToken(Object.assign(
        option._passtokenSource, {
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
  if (option.User && option.User.phone && option.User.passwordClient
    && option._passtokenSource && option._passtokenSource.identifyState === 'NEW_USER'
    && option._passtokenSource.verifyState === 'VERIFY_SUCCESS'
    && option.User.phone === option._passtokenSource.phone) {
      option.User.passwordServer = ticCrypto.hash(option.User.passwordClient + option._passtokenSource.uuid)
      option.User.uuid = option._passtokenSource.uuid
      user = await DAD.addOne( { User: option.User } )
      if (user) {
        option._passtokenSource.state = 'ONLINE'
        return { 
          registerState: 'REGISTER_SUCCESS',
          User: user,
          _passtoken: Webtoken.createToken(option._passtokenSource) }
      }else {
        return { registerState: 'REGISTER_FAILED' }
      }
  }
  return { registerState: 'INPUT_MALFORMED' }
}

DAD.api.login = DAD.api1.login = async function(){

}
