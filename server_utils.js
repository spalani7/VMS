const mongoose = require('./dbconnect');
// const AutoIncrement = require('mongoose-sequence')(mongoose);
const delay = ms => new Promise(res => setTimeout(res, ms));

var VisitorSchema = new mongoose.Schema({
    Date:{ type: Date, default: Date.now() },
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Phone:{ type: Number, required: true },
    Active:{ type: Boolean, required: true}
});

var VisitorLogSchema = new mongoose.Schema({
    PassId:{ type: Number, required: true },
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Phone:{ type: Number, required: true },
    TimeIn:{ type: Date, default: Date.now() },
    TimeOut:{ type: Date, default: Date.now() },
    Trade:{ 
        ItemName: {type: String, required: true}, 
        Units: {type: String, required: true}, 
        EntryWeight: {type: Number, required: true},
        ExitWeight: Number,
        Scale: {
            Price: Number, 
            Currency: String,
            Units: String,
            type: Map,
            required: true
        }, 
        Payments: [{ 
            Amount : Number, 
            PaymentType: { type: String, enum: ['Cash', 'Credit'] } 
        }],
    },
    CheckedIn: { type: Boolean, required: true}
});

var ItemSchema = new mongoose.Schema({
    Date:{ type: Date, default: Date.now() },
    Name:{ type: String, required: true },
    Price:{ type: Number, required: true },
    Currency:{ type: String, required: true },
    Units:{ type: String, required: true },
    Active:{ type: Boolean, required: true}
});

// VisitorLogSchema.plugin(AutoIncrement, {id:'order_seq',inc_field: 'PassId'});
const dbVistor = mongoose.model('visitors', VisitorSchema);
const dbVistorLog = mongoose.model('visitors_log', VisitorLogSchema);
const dbItem = mongoose.model('items', ItemSchema);

module.exports.GetVisitorLogs = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Visitors log..");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const docs = await dbVistorLog.find({TimeIn: {$gte: today}}, null, {sort: {TimeIn: -1}});
    return [200, JSON.stringify(docs)];
}

module.exports.GetItemsList = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Items list..");
    const docs = await dbItem.find({Active: true}, null, {sort: {Date: -1}});
    return [200, JSON.stringify(docs)];
}

module.exports.SetItemsList = async function(items, currency){
    // Retrieve only todays data for display on gui
    console.log("Setting all Items list..");
    items.forEach(async function(val,idx){
        var item = {
            Name:val.Name,
            Price:val.Price,
            Currency:currency,
            Units:val.Units,
            Active:true
        };
        var docs = await dbItem.find(item, null);
        if (docs.length == 0)
        {
            // validate schema
            var newItem = new dbItem(item);
            let error = newItem.validateSync();
            if(error) console.log("Error validating item.\nError: " + error);

            // Save new visitor to database
            newItem.save(async function(error) {
                if(error) console.log("Error adding item.\nError: " + error);
            });
        }

    });
}

module.exports.GetVisitors = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Visitors data..");
    const docs = await dbVistor.find({Active: true}, null, {sort: {TimeIn: -1}});
    // console.log(docs);
    return [200, JSON.stringify(docs)];
}

module.exports.SearchVisitors = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Searching Visitor..", JSON.stringify(req.body));

    for (var e in req.body) {
        if (req.body[e] === null || req.body[e] === undefined || req.body[e]=='') {
          delete req.body[e];
        }
    }
    req.body['Active'] = true;
    const docs = await dbVistor.find(req.body, null, {sort: {TimeIn: -1}});
    // console.log(docs);
    return [200, JSON.stringify(docs)];
}

module.exports.AddVisitor = async function(req, res){

    // req body is parsed as json by default (set in index.js)

    // Populate new visitor data
    var visitor = {
        Date:Date.now(),
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        Phone:req.body.Phone, 
        Active: true
    };
    console.log("Adding: " + visitor);

    // check if visitor already available
    const docs = await dbVistorLog.find(visitor, null);
    if (docs.length > 0)
    {
        await res.status(400).send('User already in database');
        return;
    }

    // validate schema
    var newVisitor = new dbVistor(visitor);
    let error = newVisitor.validateSync();
    if(error) {
        await res.status(400).send(error['message']);
        return;
    }

    // Save new visitor to database
    try {
        await newVisitor.save();
        // const docs = await dbVistor.find({}, null, {sort: {TimeIn: -1}});
        await res.status(200).send("OK");
    }
    catch(e)
    {
        await res.status(400).send(JSON.stringify(e));
    }
}

module.exports.Checkin = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dbFilter = {Name:req.body.Name, VehicleNo:req.body.VehicleNo, Phone:req.body.Phone, TimeIn:{$gte: today}, CheckedIn:true}
    var docs = await dbVistorLog.find(dbFilter, null, {sort: {TimeIn: -1}});
    if (docs.length > 0)
    {
        // console.log("Visitor already checked in today\n" + docs);
        await res.status(400).send('User already checked in today');
        return;
    }

    // var tradeList = [];
    // req.body.Trade.forEach(function(val, idx){
    //     tradeList.append({
    //         ItemName: val['ItemName'],
    //         EntryWeight: val['EntryWeight'],
    //         Units: val['Units'],
    //         Scale: val['Scale']
    //     });
    // });
    // Populate new visitor data
    var newVisitorLog = new dbVistorLog({
        PassId: req.body.PassId, // incremented automatically on save
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        Phone:req.body.Phone, 
        TimeIn:Date.now(),
        TimeOut:null,
        Trade: req.body.Trade,
        CheckedIn:true, 
    });

    let error = newVisitorLog.validateSync();
    if(error) {
        await res.status(400).send(error['message']);
        return;
    }
    console.log("Checking in: " + JSON.stringify(req.body));

    // Save new visitor to database
    try
    {
        await newVisitorLog.save()
        // const docs = await dbVistorLog.find(dbFilter, null, {sort: {TimeIn: -1}});
        await res.status(200).send("OK");
    }
    catch(e)
    {
        console.log(e);
        await res.status(400).send(JSON.stringify(e));
    }
}

module.exports.Checkout = async function(req, res){
    // req body is parsed as json by default (set in index.js)
    // find and update only most recent visitor
    console.log("Checking out: " + JSON.stringify(req.body));
    
    // var tradeUpdateList = [];
    // req.body.Trade.forEach(function(val, idx){
    //     tradeUpdateList.append({
    //         ExitWeight: val['ExitWeight'],
    //         Payments: val['Payments']
    //     });
    // });
    doc = await dbVistorLog.findOneAndUpdate(
        {
            PassId:req.body.PassId, 
            Name:req.body.Name, 
            VehicleNo:req.body.VehicleNo, 
            Phone:req.body.Phone, 
            CheckedIn: true
        }, 
        {
            TimeOut: Date.now(), 
            Trade: req.body.Trade,
            CheckedIn: false
        }, 
        {
            sort:{
                TimeIn:-1
            }, 
            new: true
        },
        // function(error, doc) {
        //     if(doc == null) return [400, "Visitor checkin not found1\n" + JSON.stringify(req.body)];
        //     if (error) return [200, JSON.stringify(error)];
        //     return [200, JSON.stringify(error)];
        // }
    );

    if(doc == null) {
        console.log("Visitor checkin not found\n");
        return [400, "Visitor checkin not found\n" + JSON.stringify(req.body)];
    }
    else 
    {
        // send checkout log from database  as response
        // const now = new Date();
        // const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // const docs = await dbVistorLog.find({Name:req.body.Name, VehicleNo:req.body.VehicleNo, Phone:req.body.Phone, TimeIn:{$gte: today}}, null, {sort: {TimeIn: -1}});
        return [200, "OK"];
    }
}
