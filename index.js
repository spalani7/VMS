const express = require('express');
const Dinero = require('dinero.js');

// read .env config file
require('dotenv').config();

Dinero.defaultCurrency = process.env.CURRENCY_CODE
Dinero.defaultPrecision = process.env.CURRENCY_PRECISION

const utils = require('./server_utils');
const mongoose = require('./dbconnect');

const app = express();
app.use(express.static(__dirname));
  
// Parses the text as url encoded data
app.use(express.urlencoded({extended: true})); 
  
// Parses the text as json
app.use(express.json()); 
  
app.listen(process.env.PORT, function() {
    console.log('listening on ' + process.env.PORT)
  })

app.get('/', (req, res) => {
res.sendFile(__dirname + '/index.html')
// Note: __dirname is the current directory you're in. 
})

app.post('/add', async (req, res) => {
    const [status, err] = await utils.AddVisitor(req, res);
    res.status(status).send(err);
})
    
app.post('/checkin', async (req, res) => {
    const [status, err] = await utils.Checkin(req, res);
    res.status(status).send(err);
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
