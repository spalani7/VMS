const mongoose = require('./dbconnect');
const moment = require('moment');
// const AutoIncrement = require('mongoose-sequence')(mongoose);
const delay = ms => new Promise(res => setTimeout(res, ms));

var VisitorSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Company:{ type: String, required: true },
    Phone:{ type: String, required: true },
    Active:{ type: Boolean, required: true}
});

var ItemSchema = new mongoose.Schema({
    Name:{ type: String, required: true },
    Price:{ type: Number, required: true },
    Currency:{ type: String, required: true },
    Units:{ type: String, required: true },
    Active:{ type: Boolean, required: true}
});

var VisitorLogSchema = new mongoose.Schema({
    PassId:{ type: Number, required: true },
    Visitor: { type: VisitorSchema, required: true },
    Item: {type: ItemSchema, required: true}, 
    TimeIn:{ type: Date, default: moment().toDate() },
    TimeOut:{ type: Date, default: moment().toDate() },
    EntryWeight: {type: Number, required: true},
    ExitWeight: {type: Number, required: true},
    Price : {type: Number, required: true},
    Paid: {type: Number, required: true},
    Credit:{type: Number, required: true},
    CheckedIn: { type: Boolean, required: true}
});

// VisitorLogSchema.plugin(AutoIncrement, {id:'order_seq',inc_field: 'PassId'});
const dbVistor = mongoose.model('Visitors', VisitorSchema);
const dbItem = mongoose.model('Items', ItemSchema);
const dbVistorLog = mongoose.model('VisitorLogs', VisitorLogSchema);

module.exports.GetVisitorLogs = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Visitors log..");
    const yesterday = moment().subtract(1, 'days').toDate();
    dbVistorLog.find({TimeIn: {$gte: yesterday}}, '-_id -__v', {sort: {TimeIn: -1}}, async function(error, docs){
        if(error)
            await res.status(400).send(JSON.stringify(error));
        if(docs)
            await res.status(200).send(JSON.stringify(docs));
    });
}

module.exports.GetItemsList = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Items list..");
    dbItem.find({Active: true}, '-_id -__v', {sort: {Date: -1}}, async function(error, docs){
        if(error)
            await res.status(400).send(JSON.stringify(error));
        if(docs)
            await res.status(200).send(JSON.stringify(docs));
    });
}

// module.exports.SetItemsList = async function(items, currency){
//     // Retrieve only todays data for display on gui
//     console.log("Setting all Items list..");
//     items.forEach(async function(val,idx){
//         var item = {
//             Name:val.Name,
//             Price:val.Price,
//             Currency:currency,
//             Units:val.Units,
//             Active:true
//         };
//         var docs = await dbItem.find({Name:val.Name}, null);
//         if (docs.length == 0)
//         {
//             // validate schema
//             var newItem = new dbItem(item);
//             let error = newItem.validateSync();
//             if(error) {
//                 var errText = "Error validating item.\nError: " + error;
//                 console.log(errText);
//             }

//             // Save new visitor to database
//             newItem.save(async function(error) {
//                 if(error) {
//                     var errText = "Error adding item.\nError: " + error;
//                     console.log(errText);
//                 }
//             });
//         }
//         else
//         {
//             var errText = "Item " + val.Name + " already present in database, skipped adding.";
//             console.log(errText);
//         }
//     });
// }

module.exports.SetItemList = async function(req, res){
    var item = {
        Name:req.body.Name,
        Price:req.body.Price,
        Currency:req.body.Currency,
        Units:req.body.Units,
        Active:true
    };
    var docs = await dbItem.find({Name:req.body.Name}).exec();
    if (docs.length == 0)
    {
        // validate schema
        var newItem = new dbItem(item);
        let error = newItem.validateSync();
        if(error) {
            console.log(error);
            await res.status(400).send(JSON.stringify(error));
            return;
        }

        // Save new visitor to database
        newItem.save()
            .then(async (visitor) => {
                await res.status(200).send("OK");
            })
            .catch(async (error) => {
                //When there are errors We handle them here
                await res.status(400).send(JSON.stringify(error));
            });
    }
    else
    {
        var errText = "Item " + req.body.Name + " already present in database, skipped adding.";
        console.log(errText);
        await res.status(400).send(JSON.stringify(errText));
    }
}

module.exports.GetVisitors = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Visitors data..");
    dbVistor.find({Active: true}, '-_id -__v', null, async function(error, docs){
        if(error)
            await res.status(400).send(JSON.stringify(error));
        if(docs)
            await res.status(200).send(JSON.stringify(docs));
    });
}

module.exports.SearchVisitors = async function(req, res){
    console.log("Searching Visitor..", JSON.stringify(req.body));

    for (var e in req.body) {
        if (req.body[e] === null || req.body[e] === undefined || req.body[e]=='') {
          delete req.body[e];
        }
    }
    req.body['Active'] = true;
    dbVistor.find(req.body, '-_id -__v', null, async function(error, docs){
        if(error)
            await res.status(400).send(JSON.stringify(error));
        if(docs)
            await res.status(200).send(JSON.stringify(docs));
    });
}

module.exports.GetStats = async function(req, res){

    // Table1: month, visits, price, credit
    // Table2: item, visits, price, credit
    // Table3: visitor, visits, price, credit

    const minDate = moment().subtract(2, 'years').toDate();
    let table1 = await dbVistorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate } }
        },
        {
          $group: {
            // Each `_id` must be unique, so if there are multiple
            // documents with the same age, MongoDB will increment `count`.
            _id: { $dateToString: { format: "%m-%Y", date: "$TimeIn" } },
            NumVisits: { $sum: 1 },
            TotalPrice: { $sum: "$Price" },
            TotalCredit: { $sum: "$Credit" }
          }
        }
      ]);
    // console.log(table1)

    let table2 = await dbVistorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate } }
        },
        {
          $group: {
            // Each `_id` must be unique, so if there are multiple
            // documents with the same age, MongoDB will increment `count`.
            _id: "$Item.Name",
            NumVisits: { $sum: 1 },
            TotalPrice: { $sum: "$Price" },
            TotalCredit: { $sum: "$Credit" }
          }
        }
      ]);
    // console.log(table2)

    let table3 = await dbVistorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate } }
        },
        {
          $group: {
            // Each `_id` must be unique, so if there are multiple
            // documents with the same age, MongoDB will increment `count`.
            _id: "$Visitor.Name",
            NumVisits: { $sum: 1 },
            TotalPrice: { $sum: "$Price" },
            TotalCredit: { $sum: "$Credit" }
          }
        }
      ]);
    // console.log(table3)

    res.status(200).send(JSON.stringify(
        {
            "table1": table1,
            "table2": table2,
            "table3": table3,
        }
    ));
}

module.exports.checkVisitorInDb = async function(visitor){
    // check if visitor already available
    var ret = [-1, 'Error in querying visitor from database'];
    const visitorFilter = {
        $or:[
            {Name: visitor.Name},
            {VehicleNo: visitor.VehicleNo}
        ]
    }
    const docs = await dbVistor.find(visitorFilter, '-_id -__v').exec();
    if (docs != null)
    {
        let numActiveVisitors = 0;
        docs.forEach((val,idx)=>{
            if (val.Active == true) numActiveVisitors++;
        });

        if (numActiveVisitors > 1)
        {
            console.log(docs);
            ret = [docs.length, `Found ${docs.length-1} duplicate visitors in database`];
        }

        if (numActiveVisitors == 0){
            ret = [0, `Visitors not found in database`];
        }
        else
            ret = [1, '1 Visitor found in the database'];
    }
    return ret;
}

module.exports.AddVisitor = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    console.log(req.body)
    // Populate new visitor data
    var visitor = {
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        Company:req.body.Company, 
        Phone:req.body.Phone, 
    };
    console.log("Adding: " + visitor);

    const [err, errmsg] = await this.checkVisitorInDb(visitor);
    if(err != 0)
    {
        await res.status(400).send(errmsg);
        return;
    }

    // Create visitor
    visitor['Active'] = true;
    var newVisitor = new dbVistor(visitor);

    // validate visitor
    let error = newVisitor.validateSync();
    if(error) {
        await res.status(400).send(error['message']);
        return;
    }

    // Saving visitor
    await newVisitor.save()
        .then(async (visitor) => {
            await res.status(200).send("OK");
        })
        .catch(async (error) => {
            //When there are errors We handle them here
            await res.status(400).send(JSON.stringify(error));
        });
    // const docs = await dbVistor.find({}, null, {sort: {TimeIn: -1}});
}

module.exports.Checkin = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    const yesterday = moment().subtract(1, 'days').toDate();

    var visitorInfo = {
        Name: req.body.Visitor.Name,
        VehicleNo: req.body.Visitor.VehicleNo,
        Company: req.body.Visitor.Company,
        Phone: req.body.Visitor.Phone
    }

    // check if valid visitor 
    const [err, errmsg] = await this.checkVisitorInDb(visitorInfo);
    if(err <= 0)
    {
        await res.status(400).send(errmsg);
        return;
    }

    const dbFilter = {
        Visitor: visitorInfo,
        TimeIn: {$gte: yesterday}, 
        CheckedIn: true
    }
    
    var docs = await dbVistorLog.find(dbFilter, null, {sort: {TimeIn: -1}}).exec();
    if (docs.length > 0)
    {
        // console.log("Visitor already checked in today\n" + docs);
        await res.status(400).send('Visitor already checked in today');
        return;
    }

    // Populate new visitor data
    visitorInfo['Active'] = true;

    var newVisitorLog = new dbVistorLog({
        PassId: req.body.PassId, // incremented automatically on save
        Visitor: visitorInfo,
        TimeIn: moment().toDate(),
        TimeOut: null,
        Item: req.body.Item,
        EntryWeight: req.body.EntryWeight,
        ExitWeight: req.body.ExitWeight,
        Price: req.body.Price,
        Paid: req.body.Paid,
        Credit: req.body.Credit,
        CheckedIn: true, 
    });

    let error = newVisitorLog.validateSync();
    if(error) {
        await res.status(400).send(error['message']);
        return;
    }
    console.log("Checking in: " + JSON.stringify(req.body));

    // Save new visitor to database
    await newVisitorLog.save()
        .then(async (visitorLog) => {
            await res.status(200).send("OK");
        })
        .catch(async (error) => {
            //When there are errors We handle them here
            await res.status(400).send(JSON.stringify(error));
        });
    // const docs = await dbVistorLog.find(dbFilter, null, {sort: {TimeIn: -1}});
}

module.exports.Checkout = async function(req, res){
    // req body is parsed as json by default (set in index.js)
    // find and update only most recent visitor
    console.log("Checking out: " + JSON.stringify(req.body));
    
    dbVistorLog.findOneAndUpdate(
        {
            PassId:req.body.PassId, 
            CheckedIn: true
        }, 
        {
            TimeOut: moment().toDate(), 
            ExitWeight: req.body.ExitWeight,
            Price: req.body.Price,
            Paid: req.body.Paid,
            Credit: req.body.Credit,
            CheckedIn: false
        }, 
        {
            sort:{
                TimeIn:-1
            }, 
            new: true
        },
        async function(error, doc) {
            if(error) {
                await res.status(400).send(JSON.stringify(error));
            }
            if(doc){
                await res.status(200).send("OK");
            }
        }
    );
}
