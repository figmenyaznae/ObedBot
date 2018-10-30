const TelegramBot = require('node-telegram-bot-api');
const TelegramBotSettings = require('./settings.json');

const { proposalHours, proposalMinutes, sendOptionsList, sendUsersList, other } = require('./helpers');

const token = TelegramBotSettings.token;
const bot_name = TelegramBotSettings.bot_name;
 
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
  bot.onText(new RegExp(`@${bot_name}(.+)`), (msg, match) => {
    const chatId = msg.chat.id;

    if (TelegramBotSettings.standard) {
      const now = new Date();
      if (!options.find({
        chat_id: chatId,
        name: TelegramBotSettings.standard.name,
        time: {$gt : now}
      }).count()) {

        const standard = new Date();
        standard.setHours(
          TelegramBotSettings.standard.hours,
          TelegramBotSettings.standard.minutes,
          TelegramBotSettings.standard.seconds
        );

        const time_diff = standard  - now;
        if (time_diff < 45899194 && time_diff > 250000) {
          options.insertOne({
            chat_id: chatId,
            name: TelegramBotSettings.standard.name,
            time: standard,
            voted: [],
          });
        }
      }
    }

    const proposalShort = (new RegExp(TelegramBotSettings.application_verb + ' (\\d)$')).exec(match[1]);
    if (proposalShort) proposalHours(options, proposalShort, msg)

    const proposalMin = (new RegExp(TelegramBotSettings.application_verb + ' (\\d\\d)$')).exec(match[1]);
    if (proposalMin) proposalMinutes(options, proposalMin, msg)

    const proposalLong = (new RegExp(TelegramBotSettings.application_verb + ' (\\d\\d)[:.](\\d\\d)$')).exec(match[1]);
    if (proposalLong) proposalHours(options, proposalLong, msg)

    sendOptionsList(bot, options, chatId, btn_format);
  });

  // apply for an option
  bot.onText(new RegExp('\\' + btn_format + '(.+)'), (msg, match) => {
    const chatId = msg.chat.id;

    const update = options.updateOne(
      { chat_id: chatId, name: match[1] },
      {
        $push: { voted: msg.from }
      }
    )
    console.log(update);
  });

  // TODO cancel option application
  setInterval(() => {
    const now = new Date();
    options.find({time: {$gt : now}}).forEach( option => {
      console.log(option);
      if ( !option.notified && option.time - now < 250000) {
        if (option.voted.length) {
          bot.sendSticker(chatId, TelegramBotSettings.lunch_time_sticker_id);
          sendUsersList(bot, option);
        }
        options.updateOne(
          { chat_id: option.chat_id, name: option.name },
          {
            $set: { notified: true },
          }
        )
        console.log(option);
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