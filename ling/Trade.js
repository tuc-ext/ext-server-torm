'use strict'
const Ling = require('so.ling')
const ticCrypto = require('tic.crypto')
const DAY_MILLIS = 24*60*60*1000

/****************** 类和原型 *****************/
const DAD = module.exports = class Trade extends Ling { // 构建类
  constructor(prop){
    super(prop)
    this._class = this.constructor.name
    this.setProp(prop)  
  }
}

const MOM = DAD.prototype // 原型对象
MOM._table = DAD.name
MOM._tablekey = 'uuid'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuid: { default: undefined, sqlite: 'TEXT UNIQUE' },
  uuidUser: { default: undefined, sqlite: 'TEXT', info: '本次交易记录的主人（即这笔交易记在谁的账户下。' },
  uuidPlace: { default: undefined, sqlite: 'TEXT' },
  uuidOther: { default: undefined, sqlite: 'TEXT' },
  txGroup: { default: undefined, sqlite: 'TEXT' },
  txType: { default: undefined, sqlite: 'TEXT' },
  txHash: { default: undefined, sqlite: 'TEXT UNIQUE' },
  txTimeUnix: { default: undefined, sqlite: 'INTEGER' },
  txTime: { default: undefined, sqlite: 'TEXT' },
  amount: { default: undefined, sqlite: 'REAL' },
  amountSource: { default: undefined, sqlite: 'REAL' },
  exchangeRate: { default: undefined, sqlite: 'REAL' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/
DAD.exchangeRate=function({date=new Date(), coin='USDT'}){
  let epoch = new Date(wo.Config.EPOCH)
  let dayNumber = date>epoch ? parseInt((date - epoch)/DAY_MILLIS) : 0
  let exchangeRate = 1000
  switch(coin){
    case 'USDT': exchangeRate = 1000 - dayNumber*10; break;
    default: exchangeRate = 1000 - dayNumber*10
  }
  console.log('exchangeRate=', exchangeRate)
  return exchangeRate
}

/****************** API方法 ******************/
DAD.api=DAD.api1={}

let startBlock = 6327420 // USDT contract 创建的区块。就算从0起也速度很快，不受影响。
let endBlock = 'latest'
let pageNumber = 1
let pageSize = 10
let sort = 'desc'

DAD.api.getMyTokenBalance = async function (option){
  if (option && option._passtokenSource && option.coinType){
    let onlineUser = wo.User.getOne({User: {uuid:option._passtokenSource.uuid}})
    let address = onlineUser.coinAddress[option.coinType].address
    let tokenContract = wo.Config.ETH_TOKEN_INFO[option.coinType].contract
    // 查询以太币余额 await api.account.balance(address)
    let tokenBalanceResult = await wo.EtherscanApi.account.tokenBalanceResult(address, '', tokenContract) // tokenName must be empty '', otherwise it fails, don't know why.
    console.log(`My ${option.coinType} balance = ${JSON.stringify(tokenBalanceResult)}`) // {"status":"1","message":"OK","result":"116517481000"}
    if (tokenBalanceResult && tokenBalanceResult.status===1) {
      return {
        _state: 'SMOOTH', 
        balance: tokenBalanceResult.result
      }
    }
    return { 
      _state: 'EXCEPTION'
    }
  }
  return { 
    _state: 'INPUT_MALFORMED'
  }
}

DAD.api.refreshMyDeposit = async function (option){
  if (!option._passtokenSource.isOnline) {
    return { _state: 'USER_OFFLINE' }
  }
  let onlineUser = await wo.User.getOne({User: {uuid:option._passtokenSource.uuid}})
  if (!onlineUser) {
    return { _state: 'USER_NOT_FOUND'}
  }
  let address, tokenContract, txlistChain
  if (wo.Config.env==='production'){
    switch (option.coinType) {
      case 'BTC': case 'USDT_ON_BTC': address = onlineUser.coinAddress.BTC.address
      case 'ETH': case 'USDT_ON_ETH': address = onlineUser.coinAddress.ETH.address
    }
    tokenContract = wo.Config.ETH_TOKEN_INFO[option.coinType].contract
    txlistChain = await wo.EtherscanApi.account.tokentx(address, tokenContract, startBlock, endBlock, pageNumber, pageSize, sort)
      .catch(function(err) { console.log(err); return null } ) // 要做意外处理，因为etherscan-api的实现里，没钱的空账号竟然导致错误 “UnhandledPromiseRejectionWarning: No transactions found”
  }else {
    let acc1 = '0x8900679eefef58d15fc849134e68577a17561155' // 100200 usdt from constractOwner, 99 usdt to acc2
    let acc2 = '0x6c3409625a31d5c5122e4130ebcafecd1487a43a' // 99 usdt from acc1
    let accNone = '0xaDe455212458D41EF81fF157f39320128D161735' // 没有钱，没用过，为了测试。

    address = acc1
    tokenContract = wo.Config.ETH_TOKEN_INFO.USDT_ON_ETH.contract
    txlistChain = {"status":"1","message":"OK","result":[
      {"blockNumber":"6327710","timeStamp":"1568814091","hash":"0x331e220380ffa22afb32fb1f7ece8eb4ed17b9026551eb11a54369f4d747dd15","nonce":"9","blockHash":"0xecb630be18d6124da01bbdebfac7d230e07290a1482a885c214b29e644a523b7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"180800000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"17","gas":"55608","gasPrice":"10000000000","gasUsed":"52394","cumulativeGasUsed":"6227960","input":"deprecated","confirmations":"649552"},
      {"blockNumber":"6327710","timeStamp":"1568814091","hash":"0x321e220380ffa22afb32fb1f7ece8eb4ed17b9026551eb11a54369f4d747dd15","nonce":"9","blockHash":"0xecb630be18d6124da01bbdebfac7d230e07290a1482a885c214b29e644a523b7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"180800000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"17","gas":"55608","gasPrice":"10000000000","gasUsed":"52394","cumulativeGasUsed":"6227960","input":"deprecated","confirmations":"649552"},
    ]}
  }

  console.log(`txlistChain = ${JSON.stringify(txlistChain)}`)
  let depositUsdtNew = 0
  let depositLogNew = 0
  if (txlistChain && txlistChain.status==='1') {
    for (let txChain of txlistChain.result){
      if (txChain.from===address) {
        console.log(`汇出 ${txChain.value/Math.pow(10, txChain.tokenDecimal)} 到 ${txChain.to}`)
      }else if (txChain.to===address) {
        console.log(`收到 ${txChain.value/Math.pow(10, txChain.tokenDecimal)} 从 ${txChain.from}`)
        let txHash = ticCrypto.hash(txChain.hash+option._passtokenSource.uuid)
        if (!await DAD.getOne({Trade: {uuidUser: option._passtokenSource.uuid, txType: 'DEPOSIT_USDT', txHash: txHash}})) {
          console.log('存入数据库...')
          let txDB = new DAD({uuidUser: option._passtokenSource.uuid, txGroup:'DEPOSIT_TX', txType:'DEPOSIT_USDT'})
          txDB.txTimeUnix = Date.now() // 以到账log的时间为准，不以ETH链上usdt到账时间 txChain.timeStamp*1000 为准
          txDB.txTime = new Date(txDB.txTimeUnix)
          txDB.amountSource = txChain.value/Math.pow(10, txChain.tokenDecimal)
          txDB.exchangeRate = DAD.exchangeRate({}) // wo.Config.coinSet.USDT_ON_ETH.exchange
          txDB.amount = txDB.amountSource*txDB.exchangeRate
          txDB.json = txChain
          txDB.txHash = txHash
          if (await txDB.addMe()) {
            await onlineUser.setMe({User:{
              balance: onlineUser.balance+txDB.amount, 
              depositUsdtSum: onlineUser.depositUsdtSum+txDB.amountSource,
              depositLogSum: onlineUser.depositLogSum+txDB.amount
            }, cond:{uuid: option._passtokenSource.uuid}, excludeSelf:true})
            depositUsdtNew += txDB.amountSource
            depositLogNew += txDB.amount
          }
        }
      }
    }
    let txlistDB = await DAD.getAll({Trade:{uuidUser: option._passtokenSource.uuid, txType: 'DEPOSIT_USDT'}, config: {order: 'txTimeUnix desc', limit:3}})
    return { 
      _state: 'SUCCESS', 
      txlist: txlistDB,
      depositUsdtSum: onlineUser.depositUsdtSum,
      depositLogSum: onlineUser.depositLogSum,
      balance: onlineUser.balance,
      depositUsdtNew,
      depositLogNew
    }
  }else {
    return { _state: 'CHAIN_QUERY_FAILED' }
  }
}

DAD.api.getMyTradeList = async function (option){
  option.Trade = option.Trade || {}
  option.Trade.uuidUser = option._passtokenSource.uuid
  let txlist = await DAD.getAll({Trade:option.Trade, config:option.config})
  if (txlist) {
    return { 
      _state: "SUCCESS", 
      txlist: txlist
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}