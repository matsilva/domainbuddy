domainbuddy
===========

Programmatically wires up a batch of domains for you!!!!!
Currently for domains registered with internetbs.net and hosted with AWS route53 ELB.

In index.js, define the following variables.

**Your aws api access key and secret key**<br>
`AWS.config.update({accessKeyId: '', secretAccessKey: ''});`

**Your ELB target**<br>
`var elbTarget = '';`

**Your ELB zone id**<br>
`var elbZoneId = '';`

**Array of domains you want to register & configure**<br>
`var domains = [];`<br>
Want to use a .csv instead? View the sample.csv file and run `node index.js path/to/your/file.csv`

**Your internetbs.bs api access key**<br>
`var bsApiKey = '';`

**Your internetbs.bs password**<br>
`var bsPass = encodeURIComponent('');`

Make sure you have funds in your internet.bs account and run:<br>
`node index.js`

Cheers~!



