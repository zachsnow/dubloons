(function(){
  var fs = require('fs');
  var yaml = require('js-yaml');
  var process = require('process');
  var path = require('path');
  var DubloonsBot = require('../src/dubloons');

  // Load configuration.
  var filename = process.argv[2] || path.resolve(__dirname, '..', 'conf', 'config.yml');
  try {
    var options = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
  }
  catch(e){
    console.error('dubloons: ' + e.message);
    process.exit(-1);
  }

  var bot = new DubloonsBot(options);
  bot.run();

})();
