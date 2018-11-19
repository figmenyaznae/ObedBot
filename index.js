const TelegramBot = require('node-telegram-bot-api');
const TelegramBotSettings = require('./settings.json');

const { proposalHours, proposalMinutes, sendOptionsList, sendUsersList, createStandard } = require('./helpers');

const token = process.env.token;
const bot_name = process.env.bot_name;
 
const bot = new TelegramBot(token, {polling: true});
const btn_format = TelegramBotSettings.btn_format

require('./database')(function(options) {
  // display user list
  bot.onText(new RegExp(`@${bot_name} ` + TelegramBotSettings.user_list_regex), (msg, match) => {
    const chatId = msg.chat.id;
    const index = options.find({ chat_id: chatId, name: match[1] }).forEach( option => {
      sendUsersList(bot, option, `В ${option.name} идут:\n`);
    })
  });

  // display options list, or propose new option
  bot.onText(new RegExp(`@${bot_name}(.+)`), async function (msg, match) {
    const chatId = msg.chat.id;

    if (TelegramBotSettings.standard) {
      const now = new Date();
      const count = await options.find({
        chat_id: chatId,
        name: TelegramBotSettings.standard.name,
        time: {$gt : now}
      }).count();
      if (!count) {
        await createStandard(chatId, options);
      }
    }

    try {
      const proposalShort = (new RegExp(TelegramBotSettings.application_verb + ' (\\d)$')).exec(match[1]);
      if (proposalShort) {
        await proposalHours(options, proposalShort, msg)
      }

      const proposalMin = (new RegExp(TelegramBotSettings.application_verb + ' (\\d\\d)$')).exec(match[1]);
      if (proposalMin) {
        await proposalMinutes(options, proposalMin, msg)
      }

      const proposalLong = (new RegExp(TelegramBotSettings.application_verb + ' (\\d\\d)[:.](\\d\\d)$')).exec(match[1]);
      if (proposalLong) {
        await proposalHours(options, proposalLong, msg)
      }
    }
    catch (exception) {
      bot.sendMessage(chatId, exception, {
        reply_to_message_id: msg.message_id
      });
    }

    sendOptionsList(bot, options, chatId, btn_format);
  });

  // apply for an option
  bot.onText(new RegExp('\\' + btn_format + '(.+)'), async function(msg, match) {
    const chat_id = msg.chat.id;
    const name = match[1];
    const now = new Date();

    const option = await options.find({ chat_id, name, time: {$gt : now} });

    if (!option && TelegramBotSettings.standard && match[1] === TelegramBotSettings.standard.name) {
      createStandard(chatId, options, [msg.from]);
    }

    if (option.notified) {
      bot.sendMessage(chatId, 'Поторопись, ребята уже выходят', {
        reply_to_message_id: msg.message_id
      });
    }

    const update = await options.updateOne(
      { chat_id, name, time: {$gt : now} },
      {
        $addToSet: { voted: msg.from }
      }
    );
  });

  // TODO cancel option application
  setInterval(() => {
    const now = new Date();
    options.find({time: {$gt : now}}).forEach( option => {
      console.log(option);
      if (!option.notified && option.time - now < 250000) {
        if (option.voted.length) {
          bot.sendSticker(option.chat_id, TelegramBotSettings.lunch_time_sticker_id);
          sendUsersList(bot, option);
        }
        options.updateOne(
          { chat_id: option.chat_id, name: option.name },
          {
            $set: { notified: true },
          }
        )
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
});