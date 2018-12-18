var assert = require('assert');
var sinon = require('sinon');
var EventEmitter = require('events').EventEmitter;

const settings = require('./settings.json');

const database = function(initialState) {
  var state = initialState.slice();
  return {
    insert: (option) => state.push(option),
    count: (chat_id, name) => state.filter(item => item.name==name).length,
    findActual: (chat_id, callback) => callback(null, state),
    getVoters: (chat_id, name, callback) => state.forEach(callback),
    actual: (callback) => state.forEach(callback),
    updateActual: (chat_id, name, option) => state = [Object.assign(state[0],option)],
    updateOption: (item, option) => state = [Object.assign(state[0],option)],
  }
}

const bot_name = 'STLabObedBot';
const timeout = 20;

describe('TelegramBot', function() {
  const now = new Date();
  const afterStandardSettings = Object.assign(
    {},
    settings,
    {
      standard: {
        name: 'стандарт',
        hours: now.getHours() - 1,
        minutes: 30,
        seconds: 0,
      }
    }
  );
  const beforeStandardSettings = Object.assign(
      {},
      settings,
      {
        standard: {
          name: 'стандарт',
          hours: now.getHours() + 1,
          minutes: 30,
          seconds: 0,
        }
      }
    );

  var bot
  beforeEach(() => {
    bot = new EventEmitter();
    bot.sendMessage = sinon.spy()
    bot.onText = function(regexp, callback) {
      bot.on('text', (request) => {
        if (regexp.test(request.text)) {
          callback(request, regexp.exec(request.text));
        }
      })
    }
  });

  afterEach(() => {
    clearInterval(bot.intervalID);
  })

  describe('display options list', function() {
    it('react if no options', function(done) {
      
      require('./controller')(bot, database([]), afterStandardSettings);
      
      bot.emit(
        'text',
        {
          chat: {
            id: 0,
          },
          message_id: 1,
          text: `@${bot_name} test`,
        }
      );
      
      setTimeout(() => {
        assert.equal(
          bot.sendMessage.firstCall.lastArg,
          'Сейчас нет вариантов, но вы можете их предложить'
        )
        done()
      }, timeout);
    });

    it('react if standard available', function(done) {
      require('./controller')(bot, database([]), beforeStandardSettings);

      bot.emit(
        'text',
        {
          chat: {
            id: 0,
          },
          message_id: 1,
          text: `@${bot_name} test`,
        }
      );

      setTimeout(() => {
        assert.deepEqual(
          bot.sendMessage.lastCall.lastArg.reply_markup.keyboard,
          [[{ text: '+ за стандарт' }]]
        )
        done()
      }, timeout);
    });
  });

  describe('create options', function() {
    // doesn't work after 21:00 :(
    it('in past-noon format', function(done) {
      require('./controller')(bot, database([]), afterStandardSettings);

      bot.emit(
        'text',
        {
          chat: {
            id: 0,
          },
          message_id: 1,
          text: `@${bot_name} го в 9`,
        }
      );

      setTimeout(() => {
        assert.deepEqual(
          bot.sendMessage.lastCall.lastArg.reply_markup.keyboard,
          [[{ text: '+ за 21:00' }]]
        )
        done()
      }, timeout);
    });

    it('in 24h format', function(done) {
      require('./controller')(bot, database([]), afterStandardSettings);

      bot.emit(
        'text',
        {
          chat: {
            id: 0,
          },
          message_id: 1,
          text: `@${bot_name} го в ${now.getHours() + 1}:45`,
        }
      );

      setTimeout(() => {
        assert.deepEqual(
          bot.sendMessage.lastCall.lastArg.reply_markup.keyboard,
          [[{ text: `+ за ${now.getHours() + 1}:45` }]]
        )
        done()
      }, timeout);
    });

    it('in minutes', function(done) {
      require('./controller')(bot, database([]), beforeStandardSettings);

      bot.emit(
        'text',
        {
          chat: {
            id: 0,
          },
          message_id: 1,
          text: `@${bot_name} го в 45`,
        }
      );

      setTimeout(() => {
        assert.deepEqual(
          bot.sendMessage.lastCall.lastArg.reply_markup.keyboard,
          [[
            { text: `+ за ${beforeStandardSettings.standard.name}` },
            { text: `+ за ${beforeStandardSettings.standard.hours}:45` }
          ]]
        )
        done()
      }, timeout);
    });
  });

  describe('can\'t create options', function() {
    describe('that already exist', function() {
      it('in past-noon format', function(done) {
        require('./controller')(
          bot,
          database([{
            chat_id: 0,
            name: '21:00',
            time: new Date(),
            voted: [],
          }]),
          afterStandardSettings
        );

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в 9`,
          }
        );

        setTimeout(() => {
          assert.equal(
            bot.sendMessage.firstCall.args[1],
            'Это время уже было заявлено, я вас записал.'
          )
          done()
        }, timeout);
      });

      it('in 24h format', function(done) {
        require('./controller')(
          bot,
          database([{
            chat_id: 0,
            name: `${now.getHours() + 1}:45`,
            time: new Date(),
            voted: [],
          }]),
          afterStandardSettings
        );

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в ${now.getHours() + 1}:45`,
          }
        );

        setTimeout(() => {
          assert.equal(
            bot.sendMessage.firstCall.args[1],
            'Это время уже было заявлено, я вас записал.'
          )
          done()
        }, timeout);
      });

      it('in minutes', function(done) {
        require('./controller')(
          bot,
          database([{
            chat_id: 0,
            name: `${beforeStandardSettings.standard.hours}:45`,
            time: new Date(),
            voted: [],
          }]),
          beforeStandardSettings
        );

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в 45`,
          }
        );

        setTimeout(() => {
          assert.equal(
            bot.sendMessage.firstCall.args[1],
            'Это время уже было заявлено, я вас записал.'
          )
          done()
        }, timeout);
      });
    });

    // doesn't work before 1pm :(
    describe('in a past', function() {
      it('in past-noon format', function(done) {
        require('./controller')(bot, database([]), afterStandardSettings);

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в 1`,
          }
        );

        setTimeout(() => {
          assert.equal(
            bot.sendMessage.firstCall.args[1],
            'Это время уже прошло!'
          )
          done()
        }, timeout);
      });

      it('in 24h format', function(done) {
        require('./controller')(bot, database([]), afterStandardSettings);

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в ${now.getHours() - 1}:45`,
          }
        );

        setTimeout(() => {
          assert.equal(
            bot.sendMessage.firstCall.args[1],
            'Это время уже прошло!'
          ),
          done()
        }, timeout);
      });

      it('in minutes', function(done) {
        require('./controller')(bot, database([]), afterStandardSettings);

        bot.emit(
          'text',
          {
            chat: {
              id: 0,
            },
            message_id: 1,
            text: `@${bot_name} го в 45`,
          }
        );

        setTimeout(() => {
            assert.equal(
              bot.sendMessage.firstCall.args[1],
              'Это время уже прошло!'
            ),
          done()
        }, timeout);
      });
    });
  });
});
