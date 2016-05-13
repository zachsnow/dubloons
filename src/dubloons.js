(function(){
  'use strict';

  var _ = require('lodash');
  var util = require('util');
  var path = require('path');
  var fs = require('fs');
  var SQLite = require('sqlite3').verbose();
  var Bot = require('slackbots');

  var DubloonsBot = function Constructor(options) {
    this.options = _.extend({
      name: 'dubloons',
      announcements: '#general',
      welcome: "Aloha and welcome to Dubloons!",

      database: path.resolve('./dubloons.db'),
      icon: ':moneybag:',
      bankers: [],
      groups: []
    }, options);

    this.user = null;
    this.db = null;

    var improperlyConfigured = false;
    if(!this.options.channel){
      console.error('dubloons: improperly configured -- no bankers specified');
      improperlyConfigured = true;
    }
    if(!this.options.bankers || !this.options.bankers.length){
      console.error('dubloons: improperly configured -- no bankers specified');
      improperlyConfigured = true;
    }

    if(improperlyConfigured){
      process.exit(1);
    }
  };
  util.inherits(DubloonsBot, Bot);

  DubloonsBot.prototype.run = function(){
    var bot = this;

    DubloonsBot.super_.call(bot, bot.options);

    bot.on('start', bot.onStart);
    bot.on('message', bot.onMessage);
  };

  DubloonsBot.prototype.onStart = function(){
    var bot = this;

    bot.db = bot._connectDatabase();
    bot.user = bot._loadBotUser();

    return bot._displayWelcome();
  };

  DubloonsBot.prototype.onMessage = function(message){
    var bot = this;

    if(message.type !== 'message'){
      return;
    }
    if(!message.text){
      return;
    }

    return bot._processMessage(message.text);
  };

  DubloonsBot.prototype._processMessage = function(message){
    var bot = this;
    var commands = [
      {
        re: /^\s+(give)\s+(\d+)\s+(to)\s+(@[a-z]+)\s+$/,
        method: bot._give,
        args: [ 2, 4 ]
      },
      {
        re: /^\s+(pay)\s+(\d+)\s+(to)\s+(@[a-z]+)\s+$/,
        method: bot._pay,
        args: [ 2, 4 ]
      },
      {
        re: /^\s+(balances)\s+$/,
        method: bot._balances,
        args: []
      },
      {
        re: /^\s+(balance)\s+$/,
        method: bot._balance,
        args: []
      },
      {
        re: /^\s+(balance)\s+(of)\s+(@[a-z]+)\s+$/,
        method: bot._userBalance,
        args: [ 3 ]
      },
      {
        re: /^\s+(usage|help)\s+$/,
        method: bot._usage,
        args: []
      }
    ];

    _.forEach(commands, function(command){
      var match = command.re.exec(message);
      if(match){
        var args = _.map(command.args, function(arg){
          return match.group(arg);
        });
        try {
          return command.method.call(bot, args);
        }
        catch(e){
          return bot._displayUsage('What I say what in tarnation?');
        }
      }
    });

    return bot._post("Ho brah!").then(function(){
      return bot._displayUsage();
    });
  };

  DubloonsBot.prototype._connectDatabase = function(){
    var bot = this;

    if(!fs.existsSync(bot.options.database)){
      console.error('dubloons: invalid database path ' + bot.options.database);
      process.exit(1);
    }
    bot.db = new SQLite.Database(this.options.database);
  };

  DubloonsBot.prototype.post = function(message, user){
    var bot = this;

    var method = user ?
      bot.postMessageToUser :
      bot.postMessageToChannel;

    var destination = user ?
      user :
      bot.options.announcements;

    return method(destination, message, {
      icon_emoji: bot.options.icon
    });
  };

  /////////////////////////////////////////////////////////////////////
  // Private methods to display information.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._displayWelcome = function(){
    var bot = this;

    return bot.post(bot.options.welcome).then(function(){
      return bot._displayBankers();
    }).then(function(){
      return bot._displayGroupBalances();
    }).then(function(){
      return bot._displayUserBalances();
    });
  };

  DubloonsBot.prototype._displayBankers = function(){
    var bot = this;

    var message = "Bankers: " + bot.options.bankers + "\n"
    return bot.post(message);
  };

  DubloonsBot.prototype._displayGroupBalances = function(){
    var bot = this;

    // No groups, no worries.
    if(!bot.options.groups.length){
      return;
    }

    // Collect group balances.
    var groupBalances = _.map(this.options.groups, function(group){
      return {
        group: group,
        balance: bot._getGroupBalance(group)
      };
    });

    // Sort them by largest balance.
    groupBalances = _.sortBy(groupBalances, '-balance');

    // Display them kinda pretty like.
    var message = "Groups:\n" + _.map(groupBalances, function(groupBalance, i){
      var message = '  ' + groupBalance.group + ": *" + groupBalance.balance + "* dubloons";
      if(i === 0){
        message += ', shaka brah!';
      }
      return message;
    }).join('\n');

    return this.post(message);
  };

  DubloonsBot.prototype._displayUserBalances = function(){
    var bot = this;
    return bot.users().then(function(users){
      var userBalances = _.map(users, function(user){
        return {
          user: user,
          balance: bot._getUserBalance(user)
        };
      });
      userBalances = _.sortBy(userBalances, '-balance');
      var message = "Users:\n" + _.map(userBalances, function(userBalance, i){
        var message = '  ' + userBalance.group + ": *" + userBalance.balance + "* dubloons";
        if(i === 0){
          message += ", ripping!";
        }
        return message;
      }).join('\n');
      return bot.post(message);
    });
  };


  DubloonsBot.prototype._displayUsage = function(error){
    var bot = this;

    var message = bot.options.usage;
    if(error){
      message = "*" + error + "*\n\n" + message;
    }

    return bot.post(message)
  };

  /////////////////////////////////////////////////////////////////////
  // Command implementations.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._give = function(dubloons, toUser, user){
    var bot = this;
    return bot.post("give: not implemented");
  };

  DubloonsBot.prototype._pay = function(dubloons, toUser, user){
    var bot = this;
    return bot.post("pay: not implemented", user);
  };

  DubloonsBot.prototype._balances = function(user){
    var bot = this;
    return bot.post("balances: not implemented", user);
  };

  DubloonsBot.prototype._balance = function(user){
    var bot = this;
    return bot.post("balance: not implemented", user);
  };

  DubloonsBot.prototype._userBalance = function(ofUser, user){
    var bot = this;
    return bot.post("balance: not implemented", user);
  };

  DubloonsBot.prototype._usage = function(user){
    return bot._displayUsage(user);
  };

  /////////////////////////////////////////////////////////////////////
  // DB accessors.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._getUserBalance = function(user){
    return 0;
  };

  DubloonsBot.prototype._setUserBalance = function(user){
    return 0;
  };

  DubloonsBot.prototype._getGroupBalance = function(user){

  };

  module.exports = DubloonsBot;
})();
