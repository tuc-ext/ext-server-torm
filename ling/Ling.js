const to = require('typeorm')

const DAD = module.exports = class Ling extends to.BaseEntity{

  constructor(data={}){
    super()
    for (var key in this.constructor.schema.columns){
      if (data.hasOwnProperty(key) && typeof data[key]!=='undefined' && ! Number.isNaN(data[key]) && data[key]!==Infinity){ // prop 优先级最高
        this[key]=data[key]
      }else if (typeof this[key]==='undefined'){ // 当前对象本身已有的值 优先于 prototype._model 中的值
        // 必须完全重置数组或对象，因为 default:[]或{} 将是一个固定的地址，指向的空间存值后会一直保留，再把default赋给下一个，将会错误的携带这些值。
        let defaultValue=this.constructor.schema.columns[key].default
        if (defaultValue && typeof defaultValue==='object'){ // 注意排除 defaultValue=null 的情况
          this[key]=JSON.parse(JSON.stringify(defaultValue)) // 2018-11-18 学到一个新办法，用JSON来深度复制对象！彻底解除对 const Tool=new (require('../Base/Egg.js'))() 的依赖。
        }else{
          this[key]=defaultValue
        }
      }
    }
    return this
  }

  static async getSum({field, where}={}){
    return await this.createQueryBuilder().select(`SUM(${field})`, 'sum').where(where).getRawOne()
  }

  static async sum({field, where}={}){
    return (await this.getSum({field, where})).sum
  }

  static async getOne(...args){
    return await this.findOne(...args)
  }

  getProp(prop={}){
    let newProp={}
    for (var key of Object.keys(this.constructor.schema.columns).sort()) { // 顺便还进行了排序
      if (typeof prop[key]!=='undefined' && !Number.isNaN(prop[key]) && prop[key]!==Infinity){
        newProp[key]=prop[key] // prop|prop比this更有优先级
      }else if (typeof this[key]!=='undefined' && !Number.isNaN(this[key]) && this[key]!==Infinity){
        newProp[key]=this[key]
      }
    }
    return newProp
  }
  
  getJson({exclude=[]}={}){
    let data=this.getProp() // 排序过的对象数据
    for (let exkey of exclude){ // 忽略一些不需要签名的属性
      delete data[exkey]
    }
    let json=JSON.stringify(data)
    return json
  }

}