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
  version: { default: 0, sqlite: 'INTEGER', mysql: 'INT' }, // 用来升级
  type: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(100)' }, // 用来分类：普通块，虚拟块（如果某获胜节点没有及时出块，就用虚块填充）
  timestamp: { default: undefined, sqlite: 'TEXT', mysql: 'CHAR(24)' },
  height: { default: undefined, sqlite: 'INTEGER UNIQUE', mysql: 'BIGINT' },
  lastBlockHash: { default: null, sqlite: 'TEXT', mysql: 'VARCHAR(64)' },
  numberAction: { default: 0, sqlite: 'INTEGER', mysql: 'INT' },
  totalAmount: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  totalFee: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardWinner: { default: 0, sqlite: 'NUMERIC', mysql: 'BIGINT' },
  rewardPacker: { default: 0, sqlite: 'NUMERIC' },
  packerPubkey: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' },
  packerSignature: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(64)' },
  winnerPubkey: { default: '', sqlite: 'TEXT' }, // 抽签获胜者
  winnerMessage: { default: '', sqlite: 'TEXT' },
  winnerSignature: { default: '', sqlite: 'TEXT' },
  actionHashRoot: { default: undefined, sqlite: 'TEXT', mysql: 'BINARY(32)' }, // 虽然已经存了actionHashList，但存一个梅克根有助于轻钱包。
  actionHashList: { default: [], sqlite: 'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  message: { default: '', sqlite: 'TEXT', mysql: 'VARCHAR(256)' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api={}

/******************
 *  request: 
 *    url: '/api/User/identify',
 *    data: { 
 *      User: { 
 *        phone: '+86-13312345678910' 
 *      }
 *    }
 *  business logic:
 *    查找该手机号是否已经注册过，返回passtoken。
 *  response:
 *    data: { 
 *      passtoken: { 正常结果
 *        phone: 用户手机号,
 *        status: REGGED/已注册 | NEWUSER/未注册
 *        uuid: 如果已注册，返回该用户的uuid。如果未注册，不返回。  
 *      },
 *      error: { 异常结果
 *      }
 *    }
 * ***************/
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
 *      passtoken 前端把事先收到的 passtoken 返回给后台，里面记录了该新用户的 phone, uuid, status。后台要核对 phone，防止前端作假。
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

/*****************
 * api函数的调用约定：
 * url 规则： /api版本/模块类/方法，版本为空代表最新版本，例如 /api/User/signup,  /api5/User/getBalance。这个面向对象的api调用规则，用意是结合 RESTful 和 RPC 调用的优点，适合静态资源也适合动态过程的调用。
 * data 规则： { 模块类名:{属性}, 其他数据 }, 例如 { User: { phone: '+86-13312345678910', uuid:'91e9a50d-2b42-43d8-b70b-294774cc68de' }, newPhone: '+86-17713579864' }
 * header 规则： { _passtoken: ‘afsdfasdfasdfassdfasdfdasd' } 每次 request，前端会把持有的所有 webtokens 放在 header 里。
 *
 *  api函数的返回约定：
 * 1. 先检查输入数据的格式。如果输入格式错误，返回 { Error: {_class:'Error', type:'INVALID_FORMAT', errorMsg:'...'  } }
 * 2. 执行业务逻辑，增删改查数据库，
 *  2.1 执行成功，返回正常结果，例如 { User:{_class:'_User', phone:'...', uuid:'...', ...... }, passtoken:'...' }。注意，空值、假值也是正常的结果。
 *  2.2 执行失败，返回异常结果 { Error: {_class:'Error', errorType:'FAILED_', errorMsg: '...' } }
 *****************/
