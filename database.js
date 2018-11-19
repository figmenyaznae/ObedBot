const mongodb = require('mongodb');

module.exports = function(callback) {
  mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, client) {
    if (err === null)
      console.log("Connected correctly to server");
    else
      console.log('Error: ', err)

    const db = client.db(process.env.MONGODB_NAME);

    callback(db.collection('options'));

    //manage how to handle close
    //client.close();
  });
}
