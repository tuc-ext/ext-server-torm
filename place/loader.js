const DAY_MILLIS = 24*60*60*1000

async function load(){
  global.wo = {}
  wo.Config = { MARK_DELETED: 'MARK_DELETED' }
  wo.DataStore = await require('so.data/sqlite.js')._init('data.sqlite/log.sqlite')

  wo.Ling = require('so.ling')
  wo.Place = await require('../ling/Place.js')._init(wo.DataStore)

  let placedb = require('./placedb.js')

  for (let place of placedb) {
    place = new wo.Place(place)
    place.createTime = new Date()
    place.sellTimeUnix = place.startTime.valueOf()
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS
    place.sellPrice = place.startPrice
    place.buyPrice = (place.startPrice/(1+place.feeRate+place.taxRate))/(1+place.profitRate)
    await place.addMe()
  }
}

load()