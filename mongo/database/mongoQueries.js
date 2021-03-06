require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const imageSetMaker = require('./seedData/imageSetMaker.js');
const nameGenerator = require('./seedData/productNameGenerator.js');


const url = 'mongodb://localhost/:27017';
const dbName = 'gallery';
const redisUrl = process.env.CACHE || 'localhost';
const redisPort = process.env.CACHE_PORT || 6379;

const redisClient = require('redis').createClient;
const redis = redisClient(redisPort, redisUrl);

const getProduct = (id, collection, callback) => {
  redis.get(id, (err, results) => {
    if (err) {
      console.log(err);
    } else if (results) {
      callback(null, JSON.parse(results));
    } else {
      collection.aggregate([{
        $match: { product_id: parseInt(id) }
      },
      {
        $lookup: {
          from: "images",
          localField: "images",
          foreignField: "_id",
          as: "images"
        }
      }
      ]).each((err, results) => {
        if (err) {
          callback(err);
        } else {
          redis.set(id, JSON.stringify(results));
          callback(null, results);
          return false;
        }
      });
    }
  });

};

const addRandomProduct = (productName, collection, callback) => {
  product = {};
  product.product_name = nameGenerator();
  product.views = 0;
  product.date_added = new Date();
  product.images = imageSetMaker(10);
  product.product_id = Math.floor(Math.random() * 10000000 + 10000001);
  collection.insertOne(product, (err, result) => {
    if (err) {
      callback(err);
    } else {
      callback(null, result);
    }
  })
};

const updateProduct = (id, newName, callback) => {
  const query = (products, client) => {
    products.updateOne({ product_id: id }, { product_name: newName }, (err, result) => {
      if (err) {
        callback(err);
      } else {
        callback(null, result);
      }
    })
  };
  openAndQuery(query);
}


module.exports.getProduct = getProduct;
module.exports.addProduct = addRandomProduct;