const TelegramBot = require('node-telegram-bot-api');
const TelegramBotSettings = require('./settings.json');

const RealDB = require('./database')();
const DatabaseController = require('./databaseController')(RealDB);
 
const token = process.env.token;

const Controller = require('./controller')(
  new TelegramBot(token, {polling: true}),
  DatabaseController,
  TelegramBotSettings
);
