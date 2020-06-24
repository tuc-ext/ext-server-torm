'use strict'

const Ling = require('so.ling/Ling.to.js')
const ticCrypto = require('tic.crypto')
const to = require('typeorm')

const Config = require('so.base/Config.js')
const User = require('./User.js')
const EtherscanApi = require('etherscan-api').init(Config.ETHERSCAN_APIKEY, Config.ETH_NETTYPE, 5000)

const DAY_MILLIS = 24*60*60*1000

/****************** 类和原型 *****************/
const DAD = module.exports = class Trade extends Ling { // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      aiid: { type: 'int', generated: true, primary: true },
      uuid: { type: String, generated: 'uuid', unique: true },
      uuidUser: { type: String, nullable: true, comment: '本次交易记录的主人（即这笔交易记在谁的账户下。' },
      uuidOther: { type: String, nullable: true },
      uuidPlace: { type: String, nullable: true },
      txGroup: { type: String, nullable: true },
      txType: { type: String, nullable: true },
      txHash: { type: String, nullable: true },
      txTimeUnix: { type: 'int', nullable: true },
      txTime: { type: Date, nullable: true },
      amount: { type: 'real', default: 0, comment: '金额' },
      // amountBuyer: { default: 0, sqlite: 'REAL' },
      // amountSeller: { default: 0, sqlite: 'REAL' },
      amountSystem: { type: 'real', default: 0 }, // 从这一笔交易里，系统收到的税费
      amountMining: { type: 'real', default: 0 }, // 在这一笔交易里，挖矿产生的LOG。挖矿行为有：USDT投资，注册奖励，拉新奖励
      amountSource: { type: 'real', nullable: true },
      exchangeRate: { type: 'real', nullable: true },
      json: { type: 'simple-json', default:'{}', nullable: true } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构    
    }
  }

  static getExchangeRate({date=new Date(), coin='USDT'}){
    let epoch = new Date(Config.EPOCH)
    let dayNumber = date>epoch ? parseInt((date - epoch)/DAY_MILLIS) : 0
    switch(coin){
      case 'USDT': case 'USDT_ON_ETH': case 'USDT_ON_BTC': return 1000 - dayNumber
      case 'LOG': return 1
      default: return null
    }
  }
  
}

DAD.api=DAD.api1={}

let startBlock = 6327420 // USDT contract 创建的区块。就算从0起也速度很快，不受影响。
let endBlock = 'latest'
let pageNumber = 1
let pageSize = 10
let sort = 'desc'

DAD.api.getMyTokenBalance = async function ({coinType, _passtokenSource}={}){
  if (_passtokenSource && coinType){
    let onlineUser = await User.findOne({uuid: _passtokenSource.uuid})
    if (!onlineUser) {
      return { _state: 'USER_NOT_FOUND'}
    }
    let address = onlineUser.coinAddress[coinType].address
    let tokenContract = Config.ETH_TOKEN_INFO[coinType].contract
    // 查询以太币余额 await api.account.balance(address)
    let tokenBalanceResult = await EtherscanApi.account.tokenBalanceResult(address, '', tokenContract) // tokenName must be empty '', otherwise it fails, don't know why.
    console.log(`My ${coinType} balance = ${JSON.stringify(tokenBalanceResult)}`) // {"status":"1","message":"OK","result":"116517481000"}
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

DAD.api.refreshMyDeposit = async function ({_passtokenSource, coinType}={}){
  if (!_passtokenSource.isOnline) {
    return { _state: 'USER_OFFLINE' }
  }
  let onlineUser = await User.findOne({uuid:_passtokenSource.uuid})
  if (!onlineUser) {
    return { _state: 'USER_NOT_FOUND'}
  }
  let address, tokenContract, txlistChain
  if (Config.env==='production'){
    switch (coinType) {
      case 'BTC': case 'USDT_ON_BTC': address = onlineUser.coinAddress.BTC.address
      case 'ETH': case 'USDT_ON_ETH': address = onlineUser.coinAddress.ETH.address.toLowerCase()
    }
    tokenContract = Config.ETH_TOKEN_INFO['USDT_ON_ETH'].contract
    txlistChain = await EtherscanApi.account.tokentx(address, tokenContract, startBlock, endBlock, pageNumber, pageSize, sort)
      .catch(function(err) { console.log(err); return { _state: 'CHAIN_QUERY_EMPTY' } } ) // 要做意外处理，因为etherscan-api的实现里，没钱的空账号竟然导致错误 “UnhandledPromiseRejectionWarning: No transactions found”
  }else {
    let acc1 = '0x8900679eefef58d15fc849134e68577a17561155' // 100200 usdt from constractOwner, 99 usdt to acc2
    let acc2 = '0x6c3409625a31d5c5122e4130ebcafecd1487a43a' // 99 usdt from acc1
    let accNone = '0xaDe455212458D41EF81fF157f39320128D161735' // 没有钱，没用过，为了测试。

    address = acc1
    tokenContract = Config.ETH_TOKEN_INFO.USDT_ON_ETH.contract
    txlistChain = {"status":"1","message":"OK","result":[
      {"blockNumber":"6327710","timeStamp":"1568814091","hash":"0x331e220380ffa22afb32fb1f7ece8eb4ed17b9026551eb11a54369f4d747dd15","nonce":"9","blockHash":"0xecb630be18d6124da01bbdebfac7d230e07290a1482a885c214b29e644a523b7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"180800000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"17","gas":"55608","gasPrice":"10000000000","gasUsed":"52394","cumulativeGasUsed":"6227960","input":"deprecated","confirmations":"649552"},
//      {"blockNumber":"6327710","timeStamp":"1568814091","hash":"0x321e220380ffa22afb32fb1f7ece8eb4ed17b9026551eb11a54369f4d747dd15","nonce":"9","blockHash":"0xecb630be18d6124da01bbdebfac7d230e07290a1482a885c214b29e644a523b7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"180800000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"17","gas":"55608","gasPrice":"10000000000","gasUsed":"52394","cumulativeGasUsed":"6227960","input":"deprecated","confirmations":"649552"},
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
        let txHash = ticCrypto.hash(txChain.hash+_passtokenSource.uuid)
        if (!await DAD.findOne({uuidUser: _passtokenSource.uuid, txType: 'DEPOSIT_USDT', txHash: txHash})) {
          console.log('存入数据库...')
          let txDB = DAD.create({uuidUser: _passtokenSource.uuid, txGroup:'DEPOSIT_TX', txType:'DEPOSIT_USDT'})
          txDB.txTimeUnix = Date.now() // 以到账log的时间为准，不以ETH链上usdt到账时间 txChain.timeStamp*1000 为准
          txDB.txTime = new Date(txDB.txTimeUnix)
          txDB.amountSource = txChain.value/Math.pow(10, txChain.tokenDecimal)
          txDB.exchangeRate = DAD.getExchangeRate({coin:'USDT_ON_ETH'}) // Config.coinSet.USDT_ON_ETH.exchange
          txDB.amount = txDB.amountSource*txDB.exchangeRate
          txDB.amountMining = txDB.amount
          txDB.json = txChain
          txDB.txHash = txHash
          onlineUser.balance += txDB.amount
          onlineUser.depositUsdtSum += txDB.amountSource
          onlineUser.depositLogSum += txDB.amount
          depositUsdtNew += txDB.amountSource
          depositLogNew += txDB.amount
          await to.getManager().transaction(async txman=>{
            await txman.save(txDB)
            await txman.save(onlineUser)
          })
        }
      }
    }
    let txlistDB = await DAD.find({where:{uuidUser: _passtokenSource.uuid, txType: 'DEPOSIT_USDT'}, order: {txTimeUnix:'DESC'}, take:3})
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

DAD.api.getMyTradeList = async function ({ _passtokenSource, maxtime, where={}, order={txTimeUnix:'DESC'}, take=10 } = {}){
  where.uuidUser = _passtokenSource.uuid
  where.txTimeUnix = to.LessThan(maxtime)
  let txlist = await DAD.find({where, order, take})
  if (txlist) {
    return { 
      _state: "SUCCESS", 
      txlist: txlist
    }
  }
  return { _state: 'INPUT_MALFORMED' }
}