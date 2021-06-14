const express = require('express');
const Dinero = require('dinero.js');

let config = JSON.parse(require('fs').readFileSync('config.json'));

Dinero.defaultCurrency = config.CurrencyCode
Dinero.defaultPrecision = config.CurrencyPrecision

const utils = require('./server_utils');
const mongoose = require('./dbconnect');

const app = express();
app.use(express.static(__dirname));
  
// Parses the text as url encoded data
app.use(express.urlencoded({extended: true})); 
  
// Parses the text as json
app.use(express.json()); 
  
app.listen(config.ServicePort, function() {
    console.log('listening on ' + config.ServicePort)
  })

utils.SetItemsList(config['Items'], config.CurrencyCode);

process.on('unhandledRejection', (reason, promise) => {
    console.log("Reason: ",reason,"promise: ",promise);
 })
 
app.get('/', (req, res) => {
res.sendFile(__dirname + '/index.html')
// Note: __dirname is the current directory you're in. 
})

app.post('/add', async (req, res) => {
    await utils.AddVisitor(req, res);
})
    
app.post('/checkin', async (req, res) => {
    await utils.Checkin(req, res);
})
    
app.post('/checkout', async (req, res) => {
    const [status, err] = await utils.Checkout(req, res);
    res.status(status).send(err);
})

app.post('/searchvisitor', async (req, res) => {
    const [status, data] = await utils.SearchVisitors(req, res);
    res.status(status).send(data);
})

app.get('/visitors', async (req, res) => {
    const [status, data] = await utils.GetVisitors(req, res);
    res.status(status).send(data);
})

app.get('/visitorlogs', async (req, res) => {
    const [status, data] = await utils.GetVisitorLogs(req, res);
    res.status(status).send(data);
})

app.get('/items', async (req, res) => {
    const [status, err] = await utils.GetItemsList(req, res);
    res.status(status).send(err);
})
    