const { proposalHours, proposalMinutes, sendOptionsList, sendUsersList, createStandard } = require('./helpers');

const bot_name = process.env.bot_name;

module.exports = function(bot, options, settings) {
  // display user list
  bot.onText(new RegExp(`@${bot_name} ` + settings.user_list_regex), (msg, match) => {
    const index = options.getVoters(msg.chat.id, match[1], option => {
      sendUsersList(bot, option, `В ${option.name} идут:\n`);
    })
  });

  // display options list, or propose new option
  bot.onText(new RegExp(`@${bot_name}(.+)`), async function (msg, match) {
    const chat_id = msg.chat.id;
    if (settings.standard) {
      const count = options.count(chat_id, settings.standard.name);
      if (!count) {
        await createStandard(settings, chat_id, options);
      }
    }

    try {
      // 1PM-9PM
      await proposalHours(
        options,
        (new RegExp(settings.application_verb + ' (\\d)$')).exec(match[1]),
        msg
      );

      // 13:00 -13:59
      await proposalMinutes(
        settings,
        options,
        (new RegExp(settings.application_verb + ' (\\d\\d)$')).exec(match[1]),
        msg
      );

      // 24h
      await proposalHours(
        options,
        (new RegExp(settings.application_verb + ' (\\d\\d)[:.](\\d\\d)$')).exec(match[1]),
        msg
      );
    }
    catch (exception) {
      bot.sendMessage(chat_id, exception, {
        reply_to_message_id: msg.message_id
      });
    }

    sendOptionsList(bot, options, chat_id, settings.btn_format);
  });

  // apply for an option
  bot.onText(new RegExp('\\' + settings.btn_format + '(.+)'), async function(msg, match) {
    const chat_id = msg.chat.id;
    const name = match[1];

    const option = await options.count(chat_id, name).count();

    if (!option && settings.standard && match[1] === settings.standard.name) {
      await createStandard(settings, chat_id, options, [msg.from]);
    }

    if (option.notified) {
      bot.sendMessage(chat_id, 'Поторопись, ребята уже выходят', {
        reply_to_message_id: msg.message_id
      });
    }

    const update = options.updateActual(chat_id, name, { voted: msg.from });
  });

  // TODO cancel option application
  bot.intervalID = setInterval(() => {
    options.actual(option => {
      console.log(option);
      if (!option.notified && option.time - (new Date()) < 250000) {
        if (option.voted.length) {
          bot.sendSticker(option.chat_id, settings.lunch_time_sticker_id);
          sendUsersList(bot, option);
        }
        options.updateOption(option, { notified: true });
      }
    })
  }, 10000);

  // // Sticker reply template
  // bot.on('sticker', (msg) => {
  //   const chatId = msg.chat.id;
   
  //   console.log(msg);
  //   // send a message to the chat acknowledging receipt of their message
  //   bot.sendMessage(chatId, 'Вас понял', { reply_to_message_id: msg.message_id });
  // });

  // // Bot check
  // bot.on('message', (msg) => {
  //   console.log(msg);
  //   bot.sendMessage(msg.chat.id, 'Я работаю в этом чате. Получил сообщение.', { reply_to_message_id: msg.message_id });
  // })
}
