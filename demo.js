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

const app = express();
app.use(express.static(__dirname));
  
// Parses the text as url encoded data
app.use(express.urlencoded({extended: true})); 
  
// Parses the text as json
app.use(express.json()); 

const mongoose = require('./dbconnect');
// const AutoIncrement = require('mongoose-sequence')(mongoose);
const delay = ms => new Promise(res => setTimeout(res, ms));

var VisitorSchema = new mongoose.Schema({
    Date:{ type: Date, default: moment().toDate() },
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Company:{ type: String, required: true },
    Phone:{ type: String, required: true },
    Active:{ type: Boolean, required: true}
});

var ItemSchema = new mongoose.Schema({
    Date:{ type: Date, default: moment().toDate() },
    Name:{ type: String, required: true },
    Price:{ type: Number, required: true }, 
    Currency:{ type: String, required: true },
    Units:{ type: String, required: true },
    Mode:{ type: String, enum : ['Checkin','Checkout','Both'], default: 'Both', required: true},
    Active:{ type: Boolean, required: true}
});

var VisitorLogSchema = new mongoose.Schema({
    LogType: {type: String, enum: ['Checkin', 'Checkout', 'CashAdvance']},
    PassId:{ type: Number, required: true },
    Visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitors', required: true },
    Item: { type: mongoose.Schema.Types.ObjectId, ref: 'Items' },
    TimeIn:{ type: Date, default: moment().toDate() },
    TimeOut:{ type: Date, default: moment().toDate() },
    EntryWeight: {type: Number, required: true},
    ExitWeight: {type: Number, required: true},
    Price : {type: Number, required: true},
    Debit: {type: Number, required: true},
    Credit:{type: Number, required: true},
});

// VisitorLogSchema.plugin(AutoIncrement, {id:'order_seq',inc_field: 'PassId'});
const dbVisitor = mongoose.model('Visitors', VisitorSchema);
const dbItem = mongoose.model('Items', ItemSchema);
const dbVisitorLog = mongoose.model('VisitorLogs', VisitorLogSchema);

async function getVisitorLogs(dateFrom, dateTo,logType=null)
{
    var docs = [];
    var err = null;

    try
    {
        console.log(`Getting all Visitors log from ${dateFrom.toDateString()} to ${dateTo.toDateString()}..`);
        var dbFilter = {
            TimeIn: {
                $ge: dateFrom, 
                $lte: dateTo}   
            }
        if (logType) dbFilter['LogType'] = logType;
        docs = await dbVisitorLog.find(dbFilter, '-_id -__v', {sort: {TimeIn: -1}})
                                .populate('Visitor').populate('Item')
                                .exec();
        console.log("docs:", docs)
        console.log("err:", err)
    }
    catch(error)
    {
        err = error;
        console.log(err);
    }

    return [docs, err]
}

getVisitorLogs(undefined, moment().toDate())