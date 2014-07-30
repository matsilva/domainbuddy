/*======= Todos =======*/
//Create config for domainprovider and defaults to internetbs
//Create Config for host provider or aws... defaults to aws
//Create config and defaults for internetbs


/*======= Loaded Modules =======*/
var http = require('http');
var util = require('util')
var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: '', secretAccessKey: ''});
var route53 = new AWS.Route53();
var fs = require('fs');
var shortid = require('short-id');
var request = require('request');

/*======= Defined Properties & Configurations =======*/
var elbTarget = '';
var elbZoneId = '';

var domainlog = '';
var dc = 0; //domain count
var domains = [];
var bsApiKey = '';
var bsPass = encodeURIComponent('');

/*======= InternetBS API Properties =======*/
var ibs = {};
ibs.check = function(url){
  return 'https://api.internet.bs/domain/Check?Domain=' + url + '&ApiKey=' + bsApiKey + '&Password=' + bsPass;
};
ibs.create = function(url, dnsArray){
  return 'https://api.internet.bs/domain/Create?Domain=' + url + '&ApiKey=' + bsApiKey + '&Password=' + bsPass + '&CloneContactsFromDomain=downloadcheetah.com&Period=1Y&privateWhois=FULL&NS_list=' + dnsArray.toString();
};
ibs.getBalance = function(){
  request.get('https://api.internet.bs/Account/Balance/Get?&ApiKey=' + bsApiKey + '&Password=' + bsPass + '&Currency=USD', function(err, res, body){

  });
};

/*======= This Starts the entire process!=======*/
initDomains();
/*==============================================*/

/*======= Process Initializers =======*/
function initDomains(){
  if(domains.length > 0) return startDomainer(dc);
  if(!process.argv[2]) return log('Need csv file in arg[2]')
  var csvStream = fs.readFile(process.argv[2], function(err, data){
    domains = data.toString().split('\r\n');
    for(var i = 0 ; i < domains.length ; i ++){
      domains[i] = trim(domains[i]);
    }
    startDomainer(dc); // start domain getting process
  });

}

function startDomainer(index){
  if(domains.length <= index) {
    var logName = writeDomainLog();
    return log('job done, ' + logName + ' has been logged.');
  }
  if(domains[index] == '') {
    log('Empty domain slot');
    dc++;
    return startDomainer(dc);
  }
  checkDomainAvailability(ibs.check(domains[index]), domains[index]);
}

/*======= Check the domain Availability =======*/
function checkDomainAvailability(ibsDomain, domain){
    request.get(ibsDomain, function(err, res, body){
        var avail = false, domainStat = /status=[^\n]*/gi.exec((body || ""))[0].split('=')[1];
        if(domainStat == 'UNAVAILABLE') avail = false;
        if(domainStat == 'AVAILABLE') avail = true;
        log(domain, domainStat, avail);
        if(avail){
          createHost(domain); //go create hosted zone
        } else {
          domainlog += domain + ', domain unavailable \r\n';
            dc ++;
            return startDomainer(dc);
        }
    });
}


/*======= Register The Domain with InternetBS =======*/
function createDomain(url){
  request.get(url, function(err, res, body){
    if(err) console.log(err, err.stack);
    log(body);
    var purchased = false, regStat = /status=[^\n]*/gi.exec((body || ""))[0].split('=')[1];
    if(regStat == 'FAILURE') purchased = false;
    if(regStat == 'SUCCESS') purchased = true;

    if(purchased) domainlog += 'Registered in IBS \r\n';
    if(!purchased) domainlog += 'Register FAILED in IBS \r\n';
    dc++;
    return startDomainer(dc);
  });
}

/*======= Create Route53 Zone =======*/
function createHost(domain){
  var params = {
    CallerReference: domain + '_dns_'+ shortid.generate(), // required
    Name: domain // required
  };
  route53.createHostedZone(params, function(err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
    } else {
      log('Route53 zone added for ' + domain);
      domainlog += domain + ', Route53 Entry Added, ';
      createDomain(ibs.create(domain, data.DelegationSet.NameServers));
      updateRecordSets(domain, data.HostedZone.Id, elbZoneId);
    }
  });
}

/*======= Create Record Sets in Route53 =======*/
function updateRecordSets(domain, id, elbZoneId){
  var params = {
    ChangeBatch: { // required
      Changes: [ // required
        {
          Action: 'CREATE', // required
          ResourceRecordSet: { // required
            Name: domain, // required
            Type: 'A', // required
            AliasTarget: {
              DNSName: elbTarget, // required
              EvaluateTargetHealth: false, // required
              HostedZoneId: elbZoneId // required
            }
          }
        },
        {
          Action: 'CREATE', // required
          ResourceRecordSet: { // required
            Name: '*.'+ domain, // required
            Type: 'A', // required
            AliasTarget: {
              DNSName: elbTarget, // required
              EvaluateTargetHealth: false, // required
              HostedZoneId: elbZoneId // required
            }
          }
        }
      ],
      Comment: ''
    },
    HostedZoneId: id // required
  };
  route53.changeResourceRecordSets(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
    log('Record sets added for ' + domain);
  });
}

/*======= Utilities =======*/
function writeDomainLog(){
  var logName = 'log_' + shortid.generate() + '.txt';
  var fs = require('fs');
  fs.writeFile("domainlog/log_" + shortid.generate() + '.txt', domainlog, function(err) {
      if(err) {
          console.log(err);
          return logName;
      } else {
          console.log("The file was saved!");
          return logName;
      }
  });
}

var log = function(){
    if(arguments.length == 0) return console.log('no args to log');
    for(var i = 0; i < arguments.length ; i++){
        console.log(arguments[i]);
    }
};
var insp = function(){
    if(arguments.length == 0) return console.log('no args to inspects');
    for(var i = 0; i < arguments.length ; i++){
        console.log(util.inspect(arguments[i]));
    }
};

var trim = function(str){
  return str.replace(/^\s*|\s*$/g, '');
}
