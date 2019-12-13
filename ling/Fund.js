'use strict'
const Ling = require('so.ling')
const ticCrypto = require('tic.crypto')
const Webtoken = require('so.base/Webtoken.js')

/****************** 类和原型 *****************/
const DAD = module.exports = function Fund (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

let contractUSDT = '0xb16815dbeceb459d9e33b8bba45ed717c479ea1c' // Query URL: 'https://ropsten.etherscan.io/address/0xb16815dbeceb459d9e33b8bba45ed717c479ea1c'
let contractUSDTOwner = '0xe72ba549597aec145b2ec62b99928bd8d1d16230'
let acc1 = '0x8900679eefef58d15fc849134e68577a17561155' // 100200 usdt from constractOwner, 99 usdt to acc2
let acc2 = '0x6c3409625a31d5c5122e4130ebcafecd1487a43a' // 99 usdt from acc1
let accNone = '0xaDe455212458D41EF81fF157f39320128D161735' // 没有钱，没用过，为了测试。
let apikey = '9M4QGPUVYPG5G9BIM5EJ96IA6TARPGZRBX'
let netType = 'ropsten'
let timeout = 5000 // 可省略，默认为 10000
let startBlock = 6327420 // USDT contract 创建的区块。就算从0起也速度很快，不受影响。
let endBlock = 'latest'
let pageNumber = 1
let pageSize = 10
let sort = 'asc'

DAD.api.getMyBill = async function (address, contract){
  address = acc1
  contract = contractUSDT
  // 查询当前区块高度   console.log(await wo.EtherscanApi.proxy.eth_blockNumber())
  // 查询以太币余额    var balance = await wo.EtherscanApi.account.balance(acc2)
  // 查询以太币余额    console.log(`ether balance = ${JSON.stringify(balance)}`)
      var tokenBalance = await wo.EtherscanApi.account.tokenbalance(address, '', contract)
      console.log(`usdt balance = ${JSON.stringify(tokenBalance)}`)
  // 查询以太币交易    var txlist = await wo.EtherscanApi.account.txlist(address, startBlock, endBlock, pageNumber, pageSize, sort)
      var txlist = await wo.EtherscanApi.account.tokentx(address, contract, startBlock, endBlock, pageNumber, pageSize, sort)
        .catch(function(err) { console.log(err); return null } ) // 要做意外处理，因为etherscan-api的实现里，没钱的空账号竟然导致错误 “UnhandledPromiseRejectionWarning: No transactions found”
      console.log(`tx list = ${JSON.stringify(txlist)}`)
      if (txlist && txlist.status==='1') {
          let tx
          for (tx of txlist.result){
              if (tx.from===address) {
                  console.log(`汇出 ${tx.value/Math.pow(10, tx.tokenDecimal)} 到 ${tx.to}`)
              }else if (tx.to===address) {
                  console.log(`收到 ${tx.value/Math.pow(10, tx.tokenDecimal)} 从 ${tx.from}`)
                  console.log('存入数据库...')
                  tx2db(tx)
              }
          }
      }
  }
  