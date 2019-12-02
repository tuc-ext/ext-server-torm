'use strict'
const Ling = require('so.ling')
const uuid = require('uuid')
const ticCrypto = require('tic.crypto')

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
DAD.api={}

DAD.api.identify = DAD.api.v1.identify = function(option){
  if (option.User && /^$/.test(option.User.phone)) {
    let user = await DAD.getOne({User:{phone:option.User.phone}})
    let passtokenSource
    if (user) {
      passtokenSource = {
        phone: option.User.phone,
        status: 'REGGED',
        uuid: user.uuid,
        timestamp: new Date()
      }
    } else {
      passtokenSource = {
        phone:option.User.phone,
        status: 'NEWUSER',
        uuid: uuid.v4()
      }
    }
    return { _passtoken: wo.Webtoken.createToken(passtokenSource) }
  }
  return { errorCode: 'INPUT_FORMAT_ERROR', errorMsg: '输入格式错误' }
}

/*****************
 *  request:
 *    url: '/api/User/signup',
 *    data: { 
 *      user: { 
 *        phone: +区号-手机号 
 *        passwordClient: 前端对原始密码进行 hash(password+uuid) 再交给后台，禁止明文传输密码或直接哈希。后台要再做 hash(passwordClient+uuid)=>passwordServer 存入数据库，防止彩虹表攻击。
 *      }
 *    },
 *    header: {
 *      _passtoken 前端把事先收到的 _passtoken 返回给后台，里面记录了该新用户的 phone, uuid, status。后台要核对 phone，防止前端作假。
 *    }
 *  response:
 *    data: {
 *    }
 */
DAD.api.signup = DAD.api.v1.signup = function(option){
  if (option.User && option.User.phone && option.User.passwordClient
    && option._passtokenSource && option._passtokenSource.status === 'NEWUSER'
    && option.User.phone === option._passtokenSource.phone) {
      option.User.passwordServer = ticCrypto.hash(option.User.passwordClient + option._passtokenSource.uuid)
      option.User.uuid = option._passtokenSource.uuid
      user = await DAD.setOne( { User: option.User } )
      if (user) {
        return { User: user, _passtoken: wo.Webtoken.createToken(option._passtokenSource) }
      }
  }
  return { errorCode: 'INPUT_FORMAT_ERROR', errorMsg: '输入格式错误' }
}

/*****************
 *  手机验证码
 */
DAD.api.sendPasscode = DAD.api.v1.sendPasscode = function(option){
  option._passtokenSource.passcode = ticCrypto.randomNumber({length:6})
  // 发送短信
  return { _passtoken: wo.Webtoken.createToken(option._passtokenSource) }
}

DAD.api.login = DAD.api.v1.login = function(){

}
