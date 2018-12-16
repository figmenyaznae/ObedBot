async function conditionalInsert(options, msg, time) {
  const now = new Date()
  if (time < now) {
    throw 'Это время уже прошло!'
  }

  const name = time.toLocaleString('ru-RU', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const chat_id = msg.chat.id;

  const existing_option = await options.count(chat_id, name);
  if (existing_option){
    await options.updateActual(chat_id, name, { voted: msg.from })
    throw 'Это время уже было заявлено, я вас записал.'
  }

  return options.insert({
    chat_id,
    name,
    time,
    voted: [msg.from],
  });
}

module.exports.proposalHours = async function(options, proposal, msg) {
  if (proposal) {
    const time = new Date()
    if (proposal[2])
      time.setHours(parseInt(proposal[1]), proposal[2], 0);
    else
      time.setHours(12 + parseInt(proposal[1]), 0, 0);

    console.log('proposalHours', time);

    return conditionalInsert(options, msg, time);
  }
}

module.exports.proposalMinutes = async function(settings, options, proposal, msg) {
  if (proposal) {
    const time = new Date()
    if (settings.standard) {
      time.setHours(settings.standard.hours, proposal[1], 0);

      console.log('proposalMinutes', time);

      return conditionalInsert(options, msg, time);
    }
    else {
      throw 'Укажите время в 24-часовом формате.'
    }
  }
}

module.exports.sendOptionsList = function(bot, options, chat_id, btn_format) {
  const now = new Date();
  options.findActual(chat_id, (err, actual) => {
      if (actual.length) {
      const keyboard = actual.reduce(
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

module.exports.createStandard = function(settings, chat_id, options, voted = []) {
  const standard = new Date();
  standard.setHours(
    settings.standard.hours,
    settings.standard.minutes,
    settings.standard.seconds
  );

  const now = new Date();
  const time_diff = standard  - now;
  if (time_diff < 45899194 && time_diff > 250000) {
    return options.insert({
      chat_id,
      name: settings.standard.name,
      time: standard,
      voted,
    });
  }
}
