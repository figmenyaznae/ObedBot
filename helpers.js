const TelegramBotSettings = require('./settings.json');

module.exports.proposalHours = function(options, proposal, msg) {
  const time = new Date()
  if (proposal[2])
    time.setHours(parseInt(proposal[1]), proposal[2], 0);
  else
    time.setHours(12 + parseInt(proposal[1]), 0, 0);

  console.log('proposalHours', time);

  return options.insertOne({
    chat_id: msg.chat.id,
    name: time.toLocaleString('ru-RU', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    time: time,
    voted: [msg.from],
  });
}

module.exports.proposalMinutes = function(options, proposal, msg) {
  const time = new Date()
  time.setHours(13, proposal[1], 0);

  console.log('proposalMinutes', time);

  return options.insertOne({
    chat_id: msg.chat.id,
    name: time.toLocaleString('ru-RU', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    time: time,
    voted: [msg.from],
  });
}

module.exports.sendOptionsList = function(bot, options, chat_id, btn_format) {
  const now = new Date();
  options.find({chat_id, time: {$gt : now}}).toArray((err, array) => {
      if (array.length) {
      const keyboard = array.reduce(
        (prev, next) => {
          if (prev.length === 0) {
            prev.push([]);
          }
          else if(prev[prev.length-1].length === 2) {
            prev.push([]);
          }

          prev[prev.length-1].push({text: btn_format + next.name});

          return prev;
        },
        []
      );

      console.log(keyboard)
      const reply_markup = {
        keyboard,
        one_time_keyboard: true,
        resize_keyboard: true,
        parse_mode: 'Markdown',
      };

      bot.sendMessage(chat_id, 'Сейчас есть такие варианты', {reply_markup});
    }
    else {
      bot.sendMessage(chat_id, 'Сейчас нет вариантов, но вы можете их предложить');
    }
  });
}

module.exports.sendUsersList = function(bot, option, prefix = '') {
  const resp = option.voted.map(user => {
    if (user.username) {
      return `@${user.username}`.replace('_', '\\_');
    }
    return `[${user.first_name}](tg://user?id=${user.id})`;
  }).join(' ');
  bot.sendMessage(option.chat_id, prefix + resp, { parse_mode: 'Markdown' });
}

module.exports.createStandard = function(chatId, options, voted = []) {
  const standard = new Date();
  standard.setHours(
    TelegramBotSettings.standard.hours,
    TelegramBotSettings.standard.minutes,
    TelegramBotSettings.standard.seconds
  );

  const now = new Date();
  const time_diff = standard  - now;
  if (time_diff < 45899194 && time_diff > 250000) {
    return options.insertOne({
      chat_id: chatId,
      name: TelegramBotSettings.standard.name,
      time: standard,
      voted,
    });
  }
}
