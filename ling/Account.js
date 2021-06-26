'use strict'

const ticCrypto = require('tic.crypto')
const torm = require('typeorm')

/****************** 类和原型 *****************/
const DAD = (module.exports = class Account extends torm.BaseEntity {
  // 构建类
  static schema = {
    name: this.name,
    target: this,
    columns: {
      hash: { type: String, unique: true, default: '', nullable: false, primary: true},
      json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
    },
  }
})

/****************** API方法 ******************/
DAD.api = DAD.api1 = {}
