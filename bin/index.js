(function(){
  var fs = require('fs');
  var yaml = require('js-yaml');
  var _ = require('lodash');
  var process = require('process');
  var path = require('path');
  var DubloonsBot = require('../src/dubloons');
  var domain = require('domain').create();

  var debug = _.indexOf(process.argv, '--debug') !== -1;

  domain.on('error', function(e){
    console.error('dubloons: ' + e.message);
    if(debug){
      throw e;
    }
  });

  domain.run(function(){
    var filename = process.argv[2] || path.resolve(__dirname, '..', 'conf', 'config.yml');
    var options = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
    var bot = new DubloonsBot(options);
    bot.run();
  });

})();
