const DAY_MILLIS = 24 * 60 * 60 * 1000
const torm = require('typeorm')

async function load() {
  global.wo = {}

  const Place = await require('../ling/Place.js')

  await torm.createConnection({
    type: 'sqlite',
    database: 'database/log.sqlite',
    //    entitySchemas: [wo.Story.schema, wo.Trade.schema, wo.User.schema, wo.Place.schema],
    entities: [new torm.EntitySchema(Place.schema)],
    synchronize: Config.env !== 'production' ? true : false,
  })

  let placedb = require('./placedb.js')

  for (let place of placedb) {
    place.createTime = new Date()
    place.startTimeUnix = place.startTime.valueOf()
    place.sellTimeUnix = place.startTime.valueOf()
    place.sellTimeUnixDaily = place.sellTimeUnix % DAY_MILLIS
    place.sellPrice = place.startPrice
    place.buyPrice = place.startPrice / (1 + place.feeRate + place.taxRate) / (1 + place.profitRate)
    await Place.create(place).save()
  }
}

load()
