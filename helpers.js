module.exports.proposalHours = function(options, proposal, msg) {
  const time = new Date()
  if (proposal[2])
    time.setHours(parseInt(proposal[1]), proposal[2], 0);
  else
    time.setHours(12 + parseInt(proposal[1]), 0, 0);

  console.log('proposalHours', time);

  options.insertOne({
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

  options.insertOne({
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
  options.find({chat_id}).toArray((err, array) => {
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

    const reply_markup = {
      keyboard,
      one_time_keyboard: true,
      resize_keyboard: true,
    };

    bot.sendMessage(chat_id, 'Сейчас есть такие варианты', {reply_markup});
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
