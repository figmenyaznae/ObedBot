module.exports = function(options) {
  return {
    insert: function(payload) {
      options.insertOne(payload);
    },

    count: async function(chat_id, name) {
      const now = new Date();
      return await options.find({
        chat_id,
        name,
        time: {$gt : now}
      }).count();
    },

    findActual: function(chat_id, callback) {
      const now = new Date();
      options.find({chat_id, time: {$gt : now}}).toArray(callback);
    },

    getVoters: function(chat_id, name, callback) {
      const now = new Date();
      options.find({ chat_id, name, time: {$gt : now} }).forEach(callback);
    },

    actual: function(callback) {
      const now = new Date();
      options.find({time: {$gt : now}}).forEach(callback);
    },

    updateActual: async function(chat_id, name, update) {
      const now = new Date();
      return await options.updateOne(
        { chat_id, name, time: {$gt : now} },
        {
          $addToSet: update,
        }
      );
    },

    updateOption: async function(option, update) {
      return await options.updateOne(
        option,
        {
          $set: update,
        }
      );
    },
  }
}