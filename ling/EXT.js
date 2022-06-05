'use strict'

module.exports = {
  name: 'EXT',
  columns: {
    uuid: { type: String, nullable: false, generated: 'uuid', primary: true },
    json: { type: 'simple-json', default: '{}', nullable: true }, // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
  },
}
