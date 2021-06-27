const express = require('express');
const Dinero = require('dinero.js');
const moment = require('moment');
const momentTz = require('moment-timezone');

require("moment/min/locales.min");

let config = JSON.parse(require('fs').readFileSync('config.json'));

Dinero.defaultCurrency = config.CurrencyCode;
Dinero.defaultPrecision = config.CurrencyPrecision;
moment.locale(config.Locale);
moment.tz.setDefault(config.TimeZone);

const utils = require('./server_utils');

const app = express();
app.use(express.static(__dirname));
  
// Parses the text as url encoded data
app.use(express.urlencoded({extended: true})); 
  
// Parses the text as json
app.use(express.json()); 
  
app.listen(config.ServicePort, function() {
    console.log('listening on ' + config.ServicePort)
  })

process.on('unhandledRejection', (reason, promise) => {
    console.log("Reason: ",reason,"promise: ",promise);
 })
 
app.get('/', (req, res) => {
res.sendFile(__dirname + '/index.html')
// Note: __dirname is the current directory you're in. 
})

app.post('/addvisitor', async (req, res) => {
    await utils.AddVisitor(req, res);
})

app.post('/additem', async (req, res) => {
    await utils.SetItemList(req, res);
})

app.post('/checkin', async (req, res) => {
    await utils.Checkin(req, res);
})

app.post('/checkout', async (req, res) => {
    await utils.Checkout(req, res);
})

app.post('/searchvisitor', async (req, res) => {
    await utils.SearchVisitors(req, res);
})

app.get('/visitors', async (req, res) => {
    await utils.GetVisitors(req, res);
})

app.get('/visitorlogs', async (req, res) => {
    await utils.GetVisitorLogs(req, res);
})

app.get('/items', async (req, res) => {
    await utils.GetItemsList(req, res);
})

app.get('/stats', async (req, res) => {
    await utils.GetStats(req, res);
})
