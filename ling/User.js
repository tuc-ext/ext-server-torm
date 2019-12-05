'use strict'
const Ling = require('so.ling')
const Uuid = require('uuid')
const ticCrypto = require('tic.crypto')
const Messenger = require('so.base/Messenger.js')
const Webtoken = require('so.base/Webtoken.js')

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
  let identifyState, uuid
  if (option.User && /^(\+\d{1,3}-)(\d{7,11})$/.test(option.User.phone)) {
    let user = await DAD.getOne({User: {phone:option.User.phone}})
    if (user) {
      uuid = user.uuid
      identifyState = 'OLD_USER'
    } else {
      uuid = Uuid.v4(),
      identifyState = 'NEW_USER'
    }
  }else {
    identifyState = 'INPUT_BAD_FORMAT'
  }
  return { 
    identifyState,
    uuid,
    _passtoken: Webtoken.createToken({
      phone: option.User.phone,
      uuid,
      identifyState
    })
  }
}

DAD.api.sendPasscode = async function(option){
  let passcode = ticCrypto.randomNumber({length:6})
  let passcodeHash = ticCrypto.hash(passcode+option._passtokenSource.uuid)
  let passcodeState = undefined
  let passcodeExpireAt = undefined
  // send SMS
  let sendResult = await Messenger.sendSms(
    option._passtokenSource.phone, 
    { vendor: 'aliyun',
      msgParam: passcode,
      templateCode: 'SMS_142465215',
      signName: 'LOG'
    }
  )
  if (sendResult.state==='DONE') {
    passcodeState = 'PASSCODE_SENT'
  }else{
    passcodeState = 'PASSCODE_UNSENT'
    passcodeExpireAt = new Date(Date.now()+5*60*1000)
  }
  return {
    passcodeState,
    passcodeHash,
    passcodeExpireAt,
    _passtoken: Webtoken.createToken(Object.assign(
      option._passtokenSource, 
      {
        passcode,
        passcodeState,
        passcodeExpireAt
      })
    )
  }
}

DAD.api.verifyPasscode = async function(option){

}

DAD.api.register = DAD.api1.register = async function(option){
  if (option.User && option.User.phone && option.User.passwordClient
    && option._passtokenSource && option._passtokenSource.identifyState === 'NEWUSER'
    && option.User.phone === option._passtokenSource.phone) {
      option.User.passwordServer = ticCrypto.hash(option.User.passwordClient + option._passtokenSource.uuid)
      option.User.uuid = option._passtokenSource.uuid
      user = await DAD.addOne( { User: option.User } )
      if (user) {
        option._passtokenSource.state = 'ONLINE'
        return { 
          registerState = 'REGISTER_SUCCESS',
          User: user,
          _passtoken: Webtoken.createToken(option._passtokenSource) }
      }else {
        return { registerState: 'REGISTER_FAILED' }
      }
  }
  return { registerState: 'INPUT_BAD_FORMAT' }
}

DAD.api.login = DAD.api1.login = async function(){

}
