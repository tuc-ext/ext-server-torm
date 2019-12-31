'use strict'
const Ling = require('so.ling')

/****************** 类和原型 *****************/
const DAD = module.exports = function Fund (prop) { // 构建类
  this._class = this.constructor.name
  this.setProp(prop)
}
DAD.__proto__ = Ling
DAD._table = DAD.name

const MOM = DAD.prototype // 原型对象
MOM.__proto__ = Ling.prototype
MOM._tablekey = 'uuidUser'
MOM._model = { // 数据模型，用来初始化每个对象的数据
  aiid: { default: undefined, sqlite: 'INTEGER PRIMARY KEY' },
  uuidUser: { default: undefined, sqlite: 'TEXT UNIQUE', mysql: 'VARCHAR(64) PRIMARY KEY' },
  usdtTransactionDict: { default: {}, sqlite: 'TEXT' },
  usdtDepositSum: { default: 0, sqlite: 'REAL' },
  logDepositSum: { default: 0, sqlite: 'REAL' },
  json: { default: {}, sqlite: 'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/****************** 私有属性 (private members) ******************/
const my={}

/****************** 实例方法 (instance methods) ******************/


/****************** 类方法 (class methods) ******************/

/****************** API方法 ******************/
DAD.api=DAD.api1={}

let acc1 = '0x8900679eefef58d15fc849134e68577a17561155' // 100200 usdt from constractOwner, 99 usdt to acc2
let acc2 = '0x6c3409625a31d5c5122e4130ebcafecd1487a43a' // 99 usdt from acc1
let accNone = '0xaDe455212458D41EF81fF157f39320128D161735' // 没有钱，没用过，为了测试。
let apikey = '9M4QGPUVYPG5G9BIM5EJ96IA6TARPGZRBX'
let startBlock = 6327420 // USDT contract 创建的区块。就算从0起也速度很快，不受影响。
let endBlock = 'latest'
let pageNumber = 1
let pageSize = 10
let sort = 'asc'

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

DAD.api.getMyTokenBill = async function (option){
  let onlineUser = await wo.User.getOne({User: {uuid:option._passtokenSource.uuid}})
  let address, tokenContract, txlist
  if (wo.Config.env==='production'){
    switch (option.coinType) {
      case 'BTC': case 'USDT_ON_BTC': address = onlineUser.coinAddress.BTC.address
      case 'ETH': case 'USDT_ON_ETH': address = onlineUser.coinAddress.ETH.address
    }
    tokenContract = wo.Config.ETH_TOKEN_INFO[option.coinType].contract
    txlist = await wo.EtherscanApi.account.tokentx(address, tokenContract, startBlock, endBlock, pageNumber, pageSize, sort)
      .catch(function(err) { console.log(err); return null } ) // 要做意外处理，因为etherscan-api的实现里，没钱的空账号竟然导致错误 “UnhandledPromiseRejectionWarning: No transactions found”
  }else {
    address = acc1
    tokenContract = wo.Config.ETH_TOKEN_INFO.USDT_ON_ETH.contract
    txlist = {"status":"1","message":"OK","result":[
      {"blockNumber":"6327710","timeStamp":"1567614091","hash":"0x311e220380ffa22afb32fb1f7ece8eb4ed17b9026551eb11a54369f4d747dd15","nonce":"9","blockHash":"0xecb630be18d6124da01bbdebfac7d230e07290a1482a885c214b29e644a523b7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"100200000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"17","gas":"55608","gasPrice":"10000000000","gasUsed":"52394","cumulativeGasUsed":"6227960","input":"deprecated","confirmations":"649552"},
      {"blockNumber":"6327856","timeStamp":"1567616130","hash":"0x7c8fee0bc7355fb53196a7d5f916a0ae259b1c7ce1f5f538f7bd7f697cd3e38a","nonce":"3","blockHash":"0x96c5dd3f8bdc8e9dd8b6e85a4efd7c1ba765232a34ccd744abc7b1fe41bc4338","from":"0x8900679eefef58d15fc849134e68577a17561155","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x6c3409625a31d5c5122e4130ebcafecd1487a43a","value":"99000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"7","gas":"55704","gasPrice":"10000000000","gasUsed":"52458","cumulativeGasUsed":"420066","input":"deprecated","confirmations":"649406"},
      {"blockNumber":"6349783","timeStamp":"1567923848","hash":"0xde00b2f6273bab2d868d8f1162be0e6c18cdbc1ee38ad5c96161c8eeb1367f8d","nonce":"11","blockHash":"0xec0a7fd1fb30c824b5c6a78858439c1ea5ec33930bcca30b34700d82f466556e","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"55730000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"1","gas":"55608","gasPrice":"11100000000","gasUsed":"37394","cumulativeGasUsed":"199891","input":"deprecated","confirmations":"627479"},
      {"blockNumber":"6349802","timeStamp":"1567924084","hash":"0x8ab2119eb61d5c77d041edc49e89d7bb5584579aa9724cc394ba2a180d0f5fa3","nonce":"12","blockHash":"0xe33834580718ebc7f6bae4883999d1e897733af03c4222f8f39a6beb9bd53bf7","from":"0xe72ba549597aec145b2ec62b99928bd8d1d16230","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"10801335000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"1","gas":"55995","gasPrice":"7000000000","gasUsed":"37458","cumulativeGasUsed":"199955","input":"deprecated","confirmations":"627460"},
      {"blockNumber":"6349811","timeStamp":"1567924156","hash":"0x9af154b2824d49af2abbf793d89290747973e6dc7e4fc9d7885237723d2d0e9a","nonce":"4","blockHash":"0xe9fc524b02119c5efdf9368f05b7aeafaea6f9d53b482776bd995915df1fdf20","from":"0x8900679eefef58d15fc849134e68577a17561155","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x6c3409625a31d5c5122e4130ebcafecd1487a43a","value":"21334000000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"6","gas":"55704","gasPrice":"7000000000","gasUsed":"37522","cumulativeGasUsed":"5057940","input":"deprecated","confirmations":"627451"},
      {"blockNumber":"6349831","timeStamp":"1567924375","hash":"0x5e410fac1eb7fcc8ed98287b66b6f039cb24c0ab4a96804cb877d14093e4320c","nonce":"0","blockHash":"0x94e08f92db1a87dbd179c30f32f969391ed245182d92bd9728f4cc54c370161f","from":"0x6c3409625a31d5c5122e4130ebcafecd1487a43a","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"33434435000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"14","gas":"55608","gasPrice":"7100000000","gasUsed":"37458","cumulativeGasUsed":"1479898","input":"deprecated","confirmations":"627431"},
      {"blockNumber":"6349831","timeStamp":"1567924375","hash":"0x2be65cd66de0c644ba12075df91b21ed79b17871ead072741b1f3a2f4c95707f","nonce":"5","blockHash":"0x94e08f92db1a87dbd179c30f32f969391ed245182d92bd9728f4cc54c370161f","from":"0x8900679eefef58d15fc849134e68577a17561155","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x94ee12284824c91db533d4745cd02098d7284460","value":"6998006000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"15","gas":"55704","gasPrice":"7100000000","gasUsed":"52522","cumulativeGasUsed":"1532420","input":"deprecated","confirmations":"627431"},
      {"blockNumber":"6349831","timeStamp":"1567924375","hash":"0x41ec7f38078bbec86460c070df71eaa51ead7f3b78a02ac6eb9360abbcab9e92","nonce":"1","blockHash":"0x94e08f92db1a87dbd179c30f32f969391ed245182d92bd9728f4cc54c370161f","from":"0x6c3409625a31d5c5122e4130ebcafecd1487a43a","contractAddress":"0xb16815dbeceb459d9e33b8bba45ed717c479ea1c","to":"0x8900679eefef58d15fc849134e68577a17561155","value":"456987000","tokenName":"USDT","tokenSymbol":"USDT","tokenDecimal":"6","transactionIndex":"16","gas":"55608","gasPrice":"7100000000","gasUsed":"37394","cumulativeGasUsed":"1569814","input":"deprecated","confirmations":"627431"},
    ]}
  }
  // 查询以太币交易    var txlist = await wo.EtherscanApi.account.txlist(address, startBlock, endBlock, pageNumber, pageSize, sort)
  console.log(`tx list = ${JSON.stringify(txlist)}`)
  if (txlist && txlist.status==='1') {
    let hasNewTransaction = false
    let newLogDepositSum = 0
    let { logDepositSum, usdtDepositSum, usdtTransactionDict } = await DAD.getOne({Fund: { uuidUser: option._passtokenSource.uuid}}) // 读取已有的该用户的交易列表
      || await DAD.addOne({Fund:{uuidUser: option._passtokenSource.uuid}})
    for (let tx of txlist.result){
      if (tx.from===address) {
        console.log(`汇出 ${tx.value/Math.pow(10, tx.tokenDecimal)} 到 ${tx.to}`)
      }else if (tx.to===address) {
        console.log(`收到 ${tx.value/Math.pow(10, tx.tokenDecimal)} 从 ${tx.from}`)
        console.log('存入数据库...')
        if (!usdtTransactionDict[tx.hash]){ // 是新的交易
          tx.whenImported = new Date() // 保留所有原始 tx 数据，再补充fiv需要的信息
          tx.amount = tx.value/Math.pow(10, tx.tokenDecimal)
          tx.exchangeRate = wo.Config.coinSet.USDT_ON_ETH.exchange
          usdtDepositSum += tx.amount
          logDepositSum += (tx.amount*wo.Config.coinSet.USDT_ON_ETH.exchange)
          newLogDepositSum += (tx.amount*wo.Config.coinSet.USDT_ON_ETH.exchange)
          usdtTransactionDict[tx.hash] = tx
          hasNewTransaction = true
        }
      }
    }
    if (hasNewTransaction) {
      DAD.setOne({ Fund: { uuidUser: option._passtokenSource.uuid, logDepositSum, usdtDepositSum, usdtTransactionDict }})
      let onlineUser=await wo.User.getOne({User:{uuid:option._passtokenSource.uuid}})
      onlineUser.setMe( {User:{ balance: onlineUser.balance+newLogDepositSum }, cond: {uuid: option._passtokenSource.uuid }, excludeSelf:true})
    }
    return { 
      _state: 'SMOOTH', 
      usdtTransactionDict,
      usdtDepositSum,
      logDepositSum,
      newLogDepositSum
    }
  }
  return { 
    _state: 'EXCEPTION',
  }
}
