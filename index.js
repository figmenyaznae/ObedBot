const TelegramBot = require('node-telegram-bot-api');
const TelegramBotSettings = require('./settings.json');
 
const token = TelegramBotSettings.token;
const bot_name = TelegramBotSettings.bot_name;
 
const bot = new TelegramBot(token, {polling: true});
let options = {};
const btn_format = '+ за '


function proposalMinutes(proposal, msg) {
  console.log('proposalMinutes', proposal);
  const time = new Date()
  time.setHours(13, proposal[1], 0);

  console.log('proposalMinutes', time);

  options[msg.chat.id].push({
    name: time.toLocaleString('ru-RU', {
        hour: 'numeric',
        minute: '2-digit',
      }
    ),
    time: time,
    voted: [msg.from],
  });

  console.log('proposalMinutes', options[msg.chat.id]);
}

function proposalHours(proposal, msg) {
  console.log('proposalHours', proposal);
  const time = new Date()
  if (proposal[2])
    time.setHours(parseInt(proposal[1]), proposal[2], 0);
  else
    time.setHours(12 + parseInt(proposal[1]), 0, 0);

  console.log('proposalHours', time);

  options[msg.chat.id].push({
    name: time.toLocaleString('ru-RU', {
        hour: 'numeric',
        minute: '2-digit',
      }
    ),
    time: time,
    voted: [msg.from],
  });

  console.log('proposalHours', options[msg.chat.id]);
}

function sendOptionsList(chatId) {
  const keyboard = options[chatId].reduce(
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

  bot.sendMessage(chatId, 'Сейчас есть такие варианты', {reply_markup});
}

function sendUsersList(chatId, index, prefix = '') {
  const resp = options[chatId][index].voted.map(user => {
    if (user.username) {
      return `@${user.username}`;
    }
    return `[${user.first_name}](tg://user?id=${user.id})`;
  }).join(' ');
  bot.sendMessage(chatId, prefix + resp, { parse_mode: 'Markdown' });
}

bot.onText(new RegExp(`@${bot_name} кто идёт в (.+)`), (msg, match) => {
  const chatId = msg.chat.id;
  const index = options[chatId].findIndex(el => el.name === match[1])
  sendUsersList(chatId, index, `В ${match[1]} идут:\n`);
});

bot.onText(new RegExp(`@${bot_name}(.+)`), (msg, match) => {
  const chatId = msg.chat.id;

  if (!options[chatId]) {
    const standard = new Date()
    standard.setHours(13, 45, 00)

    options[chatId] = [{
      name: 'стандарт',
      time: standard,
      voted: [],
    }];
  }

  const proposalShort = /го в (\d)$/.exec(match);
  if (proposalShort) proposalHours(proposalShort, msg)

  const proposalMin = /го в (\d\d)$/.exec(match);
  if (proposalMin) proposalMinutes(proposalMin, msg)

  const proposalLong = /го в (\d\d):(\d\d)$/.exec(match);
  if (proposalLong) proposalHours(proposalLong, msg)

  sendOptionsList(chatId);
});

bot.onText(new RegExp('\\' + btn_format + '(.+)'), (msg, match) => {
  const chatId = msg.chat.id;

  const index = options[chatId].findIndex(el => el.name === match[1])
  if (index > -1) {
    if (!options[chatId][index].voted) {
      options[chatId][index].voted = [];
    }

    if (!options[chatId][index].voted.find(user => user.id === msg.from.id)) {
      options[chatId][index].voted.push(msg.from);
    }

  }
});

setInterval(() => {
  Object.keys(options).forEach(chatId => options[chatId].forEach(
    (option, index) => {
      console.log(index, options[chatId]);
      const now = new Date();
      if (option.time - now < 250000) {
        if (options[chatId][index].voted.length) {
          bot.sendSticker(chatId, TelegramBotSettings.lunch_time_sticker_id);
          sendUsersList(chatId, index);
        }
        options[chatId].splice(index, 1);
        console.log(index, options[chatId]);
      }
    }
  ))
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
