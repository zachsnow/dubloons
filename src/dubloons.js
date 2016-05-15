(function(){
  'use strict';

  var _ = require('lodash');
  var path = require('path');
  var fs = require('fs');
  var Botkit = require('botkit');
  var vow = require('vow');

  var DubloonsBot = function Constructor(options) {
    this.options = _.extend({
      name: 'dubloons',
      announcements: '#general',
      welcome: "Aloha and welcome to Dubloons!",

      database: path.resolve('./dubloons.db'),
      icon: ':moneybag:',
      bankers: [],
      groups: [],
      usage: "Usage:\n\n" +
        "  `@dubloons: balances` - display balances\n" +
        "  `@dubloons: help` - display this message\n",
      errorMessage: "What's it all about boy, elucidate!",
      unknownMessage: "What I say what in tarnation?"
    }, options);

    this.user = null;
    this.db = null;

    if(!this.options.announcements){
      throw new Error('improperly configured -- no announcements channel specified');
    }
    if(!this.options.bankers){
      throw new Error('improperly configured -- no bankers group specified');
    }
    if(!this.options.token){
      throw new Error('improperly configured -- no Slack token specified');
    }
  };

  DubloonsBot.prototype.run = function(){
    var bot = this;

    var controller = Botkit.slackbot({
      debug: bot.options.debug,
      log: bot.options.debug || false,
      json_file_store: bot.options.database
    });

    bot.slackbot = controller.spawn({
      token: bot.options.token
    });

    bot.db = controller.storage;

    controller.on('direct_mention', function(slackbot, message){
      bot._processMessage(slackbot, message);
    });

    controller.on('channel_joined', function(slackbot, channel){

    });

    bot.slackbot.api.channels.list({exclude_archived: 1}, function(err, res) {
      var channelName = bot.options.announcements.substr(1);
      var channel = _.find(res.channels, function(channel){
        return channel.name === channelName;
      });
      if(!channel){
        throw new Error('improperly configured -- invalid announcements channel');
      }
      bot.options.announcements = channel.id;

      bot.slackbot.startRTM(function(){
        console.info('dubloons: started RTM');
        bot._displayWelcome();
      });
    });
  };

  DubloonsBot.prototype._getUserId = function(username){
    var bot = this;
    var deferred = vow.defer();
    
    username = username.replace(/^@/, '');

    bot.slackbot.api.users.list({}, function(err, res) {
      if(err){
        return deferred.reject(err);
      }

      var user = _.find(res.members, function(user){
        return user.name === username;
      });
      deferred.resolve(user.id);
    });

    return deferred.promise();
  };

  DubloonsBot.prototype._processMessage = function(slackbot, message){
    var bot = this;

    var text = message.text;
    var user = message.user;

    var commands = [
      {
        re: /^\s*(give)\s+(\d+)\s+(to)\s+(@[a-z]+)\s*$/,
        method: bot._give,
        args: [ 2, 4 ]
      },
      {
        re: /^\s*(pay)\s+(\d+)\s+(to)\s+(@[a-z]+)\s*$/,
        method: bot._pay,
        args: [ 2, 4 ]
      },
      {
        re: /^\s*(balances)\s*$/,
        method: bot._balances,
        args: []
      },
      {
        re: /^\s*(balance)\s*$/,
        method: bot._balance,
        args: []
      },
      {
        re: /^\s*(balance)\s+(of)\s+(@[a-z]+)\s*$/,
        method: bot._userBalance,
        args: [ 3 ]
      },
      {
        re: /^\s*(usage|help)\s*$/,
        method: bot._usage,
        args: []
      }
    ];

    var command = _.find(commands, function(command){
      var match = command.re.exec(text);
      if(match){
        var args = _.map(command.args, function(arg){
          return match.group(arg);
        });
        args.push(user);
        try {
          command.method.apply(bot, args);
          return true;
        }
        catch(e){
          console.error('dubloons: error executing command', text, e);
          bot._displayUsage(user, bot.options.errorMessage);
        }
      }
    });

    if(!command){
      bot._displayUsage(user, bot.options.unknownMessage);
    }
  };

  DubloonsBot.prototype.post = function(message, user){
    var bot = this;
    var deferred = vow.defer();

    console.info('dubloons: sending', message, 'to', user || 'announcements');

    bot.slackbot.say({
      text: message,
      channel: user ? user : bot.options.announcements,
      icon_emoji: this.options.icon
    }, function(){
      deferred.resolve();
    });

    return deferred.promise();
  };

  /////////////////////////////////////////////////////////////////////
  // Private methods to display information.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._displayWelcome = function(){
    var bot = this;
    bot.post(bot.options.welcome);
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


  DubloonsBot.prototype._displayUsage = function(user, error){
    var bot = this;

    var message = bot.options.usage;
    if(error){
      message = "*" + error + "*\n\n" + message;
    }

    bot.post(message, user);
  };

  /////////////////////////////////////////////////////////////////////
  // Command implementations.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._give = function(dubloons, toUser, user){
    var bot = this;

    var toBalance = bot._getUserBalance(toUser);
    toBalance += dubloons;
    bot._setUserBalance(toBalance, toUser);

    bot.post(fromUser + " gave " + toUser + " " + dubloons.toString() + " dubloons! :tada:");
  };

  DubloonsBot.prototype._pay = function(dubloons, toUser, user){
    var bot = this;
    var fromBalance = bot._getUserBalance(user);
    var toBalance = bot._getUserBalance(toUser);

    if(fromBalance < dubloons){
      bot.post("You don't have enough dubloons!", user);
      return;
    }

    fromBalance -= dubloons;
    toBalance += dubloons;
    bot._setUserBalance(fromBalance, fromUser);
    bot._setUserBalance(toBalance, toUser);

    bot.post(fromUser + " paid " + toUser + " " + dubloons.toString() + " dubloons! :tada:");
  };

  DubloonsBot.prototype._balances = function(user){
    var bot = this;
    return bot.post("balances: not implemented", user);
  };

  DubloonsBot.prototype._balance = function(user){
    var bot = this;
    var balance = bot._getUserBalance(user);
    bot.post("You have " + balance + " dubloons.");
  };

  DubloonsBot.prototype._userBalance = function(ofUser, user){
    var bot = this;
    var balance = bot._getUserBalance(ofUser);
    bot.post(user + " has " + balance + " dubloons.");
  };

  DubloonsBot.prototype._usage = function(user){
    var bot = this;
    return bot._displayUsage(user);
  };

  /////////////////////////////////////////////////////////////////////
  // DB accessors.
  /////////////////////////////////////////////////////////////////////
  DubloonsBot.prototype._getUserBalance = function(user){
    var bot = this;
    return bot._getUserData(user, 'balance', 0);
  };

  DubloonsBot.prototype._setUserBalance = function(dubloons, user){
    var bot = this;
    return bot._setUserData(user, 'balance', dubloons);
  };

  DubloonsBot.prototype._getGroupBalance = function(user){
    return 0;
  };

  DubloonsBot.prototype._getUserData = function(userId, key, defaultValue){
    var bot = this;
    var deferred = vow.defer();

    bot.db.users.get(userId, function(err, data){
      if(!data || !_.has(data, key)){
        return deferred.resolve(defaultValue);
      }
      deferred.resolve(data[key]);
    });

    return deferred.promise();
  };

  DubloonsBot.prototype._setUserData = function(userId, key, value){
    var bot = this;
    var deferred = vow.defer();

    bot.db.users.get(userId, function(err, data){
      data = data || {id: userId};
      data[key] = value;

      bot.db.users.save(data, function(err){
        if(err){
          return deferred.reject(error);
        }

        deferred.resolve();
      });
    });

    return deferred.promise();
  };

  module.exports = DubloonsBot;
})();
