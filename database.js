const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017';
const dbName = 'ObedDB';

const client = new MongoClient(url);
module.exports = function(callback) {
  client.connect(function(err, client) {
    if (err === null)
      console.log("Connected correctly to server");

    const db = client.db(dbName);

    callback(db.collection('options'));

    //manage how to handle close
    //client.close();
  });
}
