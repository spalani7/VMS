const mongoose = require('./dbconnect');
const moment = require('moment');
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
    Visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitors', required: true },
    PassId:{ type: Number, default: 0 },
    Item: { type: mongoose.Schema.Types.ObjectId, ref: 'Items', default: null },
    TimeIn:{ type: Date, default: moment().toDate() },
    TimeOut:{ type: Date, default: null },
    EntryWeight: {type: Number, default: 0},
    ExitWeight: {type: Number, default: 0},
    Price : {type: Number, default: 0},
    Debit: {type: Number, default: 0},
    Currency:{type: String, required: true, default: 'INR'},
    Credit:{type: Number, required: true},
    CheckedIn:{type: Boolean, default: false}
});

// VisitorLogSchema.plugin(AutoIncrement, {id:'order_seq',inc_field: 'PassId'});
const dbVisitor = mongoose.model('Visitors', VisitorSchema);
const dbItem = mongoose.model('Items', ItemSchema);
const dbVisitorLog = mongoose.model('VisitorLogs', VisitorLogSchema);

async function getVisitorLogs(dbFilter={}, projection='-_id -__v', options={sort: {TimeIn: -1}})
{
    var docs = [];
    var err = null;
    try
    {
        console.log(`Getting all Visitors log..`);
        docs = await dbVisitorLog.find(dbFilter, projection, options)
                                .populate('Visitor').populate('Item')
                                .exec();
    }
    catch(error)
    {
        err = error;
        console.log(err);
    }
    return [docs, err];
}

async function getItems(dbFilter={}, projection='-_id -__v', options={sort: {Date: -1}})
{
    var docs = [];
    var err = null;
    try
    {
        console.log(`Getting all Items..`);
        docs = await dbItem.find(dbFilter, projection, options).exec();
    }
    catch(error)
    {
        err = error;
        console.log(err);
    }
    return [docs, err];
}

async function getVisitors(dbFilter={}, projection='-_id -__v', options={sort: {Date: -1}})
{
    var docs = [];
    var err = null;
    try
    {
        console.log(`Getting all Visitors..`);
        docs = await dbVisitor.find(dbFilter, projection, options).exec();
    }
    catch(error)
    {
        err = error;
        console.log(err);
    }
    return [docs, err];
}

module.exports.GetVisitorLogs = async function(req, res)
{
    // Retrieve only todays data for display on gui
    const yesterday = moment().subtract(1, 'months').toDate();
    const [docs,error] = await getVisitorLogs({Item: {$ne: null}, TimeIn: { $gte: yesterday }});
    if(error)
        await res.status(400).send(JSON.stringify(error));
    if(docs)
        await res.status(200).send(JSON.stringify(docs));
}

module.exports.GetItemsList = async function(req, res){
    const [docs,error] = await getItems({Active:true});
    if(error)
        await res.status(400).send(JSON.stringify(error));
    if(docs)
        await res.status(200).send(JSON.stringify(docs));
}

module.exports.GetVisitors = async function(req, res){
    const [docs,error] = await getVisitors({Active:true}, '-_id -__v -Active -Date');
    if(error)
        await res.status(400).send(JSON.stringify(error));
    if(docs)
        await res.status(200).send(JSON.stringify(docs));
}

module.exports.checkVisitorInDb = async function(visitor){
    // check if visitor already available
    var ret = [-1, 'Error in querying visitor from database', null];
    const visitorFilter = {
        $or:[
            {Name: visitor.Name},
            {VehicleNo: visitor.VehicleNo}
        ],
        Active: true
    }
    const [docs,error] = await getVisitors(visitorFilter, '-__v');
    if (docs != null)
    {
        let numActiveVisitors = docs.length;

        if (numActiveVisitors > 1)
        {
            console.log(docs);
            ret = [docs.length, `Found ${docs.length-1} duplicate visitors in database`, docs];
        }

        if (numActiveVisitors == 0){
            ret = [0, `Visitors not found in database`, docs];
        }
        else
            ret = [1, '1 Visitor found in the database', docs];
    }
    return ret;
}

module.exports.SearchVisitors = async function(req, res){
    for (var e in req.body) {
        if (req.body[e] === null || req.body[e] === undefined || req.body[e]=='') {
          delete req.body[e];
        }
    }
    req.body['Active'] = true;
    const [docs,error] = getVisitors(req.body, '-_id -__v -Active -Date');
    if(error)
        await res.status(400).send(JSON.stringify(error));
    if(docs)
        await res.status(200).send(JSON.stringify(docs));
}

async function GetLogMonthlyWise(minDate, maxDate=moment().toDate())
{
    let table = await dbVisitorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate, $lte: maxDate } }
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
    // console.log(table)
    return table;
}

async function GetLogItemWise(minDate, maxDate=moment().toDate())
{
    let table = await dbVisitorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate, $lte: maxDate } }
        },
        {
            $lookup: {
                from: "items",
                localField: "Item",
                foreignField: "_id",
                as: "Item"
            }
        },
        {
            $unwind: '$Item'
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
    // console.log(table)
    return table;
}

async function GetLogVisitorWise(minDate, maxDate=moment().toDate())
{
    let table = await dbVisitorLog.aggregate([
        // First Stage
        // match data from last 2 years
        {
            $match : { "TimeIn": { $gte: minDate, $lte: maxDate } }
        },
        {
            $lookup: {
                from: "visitors",
                localField: "Visitor",
                foreignField: "_id",
                as: "Visitor"
            }
        },
        {
            $unwind: '$Visitor'
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
    // console.log(table)
    return table;
}

module.exports.GetStats = async function(req, res)
{
    // Table1: month, visits, price, credit
    // Table2: item, visits, price, credit
    // Table3: visitor, visits, price, credit

    const minDate = moment().subtract(2, 'years').toDate();
    
    let table1 = await GetLogMonthlyWise(minDate);
    let table2 = await GetLogItemWise(minDate);
    let table3 = await GetLogVisitorWise(minDate);

    res.status(200).send(JSON.stringify(
        {
            "table1": table1,
            "table2": table2,
            "table3": table3,
        }
    ));
}

module.exports.DownloadStats = async function(req, res)
{
    const minDate = moment(req.body.dateFrom).toDate();
    const maxDate = moment(req.body.dateTo).toDate();

    var output = {};
    if(req.body.ReqType.includes('dailylog'))
    {
        const [docs,err] = await getVisitorLogs({"TimeIn": { $gte: minDate, $lte: maxDate }})
        if(err) 
        {
            await res.status(400).send(JSON.stringify(err));
            return
        }
        else output["dailylog"] = docs;
    }
    if(req.body.ReqType.includes('itemlog'))
    {
        output["itemlog"] = await GetLogItemWise(minDate, maxDate);
    }
    if(req.body.ReqType.includes('visitorlog'))
    {
        output["visitorlog"] = await GetLogVisitorWise(minDate, maxDate);
    }

    await res.status(200).send(JSON.stringify(output));
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

module.exports.ModifyItem = async function(req, res){

    var docs = await dbItem.find({Name:req.body.Name, Active: true}).exec();
    if (docs)
    {
        if (req.body.ReqType == "add"){

            if(docs.length > 0){
                await res.status(400).send("Item already present with same name.");
                return;
            }

            // validate schema
            var newItem = new dbItem({
                Name:req.body.Name,
                Price:req.body.Price,
                Currency:req.body.Currency,
                Units:req.body.Units,
                Active:true
            });
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

        else if (req.body.ReqType == "delete"){
            if (docs.length <= 0){
                await res.status(400).send("Item not found in database.");
                return;
            }

            dbItem.findOneAndUpdate(
                {Name:req.body.Name, Active: true}, 
                {
                    Active: false
                }, 
                {
                    new: true,
                    maxTimeMS: 3000
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
        else
            await res.status(400).send(`Unknown request: ${req.body.ReqType} to modify visitor.`);
    }
    else
        await res.status(400).send("Item not found in database.");

}

module.exports.ModifyCashAdvance = async function(req, res){

    // check if visitor is valid
    var visitor = {
        Name: req.body.Visitor.Name,
        VehicleNo: req.body.Visitor.VehicleNo,
        // Company: req.body.Visitor.Company,
        // Phone: req.body.Visitor.Phone
    }

    const [err, errmsg, visitordocs] = await this.checkVisitorInDb(visitor);
    if(err <= 0)
    {
        await res.status(400).send(errmsg);
        return;
    }

    var cashAdvance = {
        Visitor: visitordocs[0]._id,
        TimeIn: moment().toDate(),
        Credit: (req.body.ReqType == "delete") ? req.body.Credit * -1 : req.body.Credit,
        Currency: req.body.Currency,
    }

    var newCashAdvLog = new dbVisitorLog(cashAdvance);

    // validate visitor
    let error = newCashAdvLog.validateSync();
    if(error) {
        await res.status(400).send(error['message']);
        return;
    }
    console.log("Adding cash advance: " + JSON.stringify(req.body));

    // Saving visitor
    await newCashAdvLog.save()
        .then(async (visitor) => {
            await res.status(200).send("OK");
        })
        .catch(async (error) => {
            //When there are errors We handle them here
            await res.status(400).send(JSON.stringify(error));
        });
}

module.exports.ModifyVisitor = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    console.log(req.body)
    // filter to check num of active users with same info
    var visitor = {
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        // Company:req.body.Company, 
        // Phone:req.body.Phone, 
        Active: true
    };
    console.log(req.body.ReqType, visitor);

    const [err, errmsg, visitordocs] = await this.checkVisitorInDb(visitor);
    if( (req.body.ReqType == "add" && err != 0) 
        || (req.body.ReqType == "delete" && err <= 0)
    )
    {
        await res.status(400).send(errmsg);
        return;
    }

    if(req.body.ReqType == "add")
    {
        // Create visitor
        visitor['Company'] = req.body.Company;
        visitor['Phone'] = req.body.Phone;
        var newVisitor = new dbVisitor(visitor);

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
    }
    else if(req.body.ReqType == "delete")
    {
        var docs = await bCashAdvance.find(visitor).exec();
        if (docs.length > 0)
        {
            dbVisitor.findOneAndUpdate(
                visitor, 
                {
                    Active: false
                }, 
                {
                    new: true,
                    maxTimeMS: 3000
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
        else
        {
            await res.status(400).send(`No element found in database with requested data.`);
        }
    }
    else
        await res.status(400).send(`Unknown request: ${req.body.ReqType} to modify visitor.`);
    // const docs = await dbVisitor.find({}, null, {sort: {TimeIn: -1}});
}

module.exports.Checkin = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    const yesterday = moment().subtract(1, 'days').toDate();

    var visitorInfo = {
        Name: req.body.Visitor.Name,
        VehicleNo: req.body.Visitor.VehicleNo,
        // Company: req.body.Visitor.Company,
        // Phone: req.body.Visitor.Phone
    }

    // check if valid visitor 
    const [err, errmsg, visitordocs] = await this.checkVisitorInDb(visitorInfo);
    if(err <= 0)
    {
        await res.status(400).send(errmsg);
        return;
    }

    var visitorObjId = visitordocs[0]._id;

    const dbFilter = {
        Visitor: visitorObjId,
        TimeIn: {$gte: yesterday}, 
        CheckedIn: true
    }
    var docs = await dbVisitorLog.find(dbFilter, null, {sort: {TimeIn: -1}}).populate('Visitor').populate('Item').exec();
    if (docs.length > 0)
    {
        // console.log("Visitor already checked in today\n" + docs);
        await res.status(400).send('Visitor already checked in today');
        return;
    }

    // get Item reference
    req.body.Item['Active'] = true;
    var itemDocs = await dbItem.find(req.body.Item).exec();
    if (itemDocs <= 0)
    {
        // console.log("Visitor already checked in today\n" + docs);
        await res.status(400).send('Item not found in database');
        return;
    }
    var itemObjId = itemDocs[0]._id;

    // Populate new visitor data
    var newVisitorLog = new dbVisitorLog({
        PassId: req.body.PassId, // incremented automatically on save
        Visitor: visitorObjId,
        TimeIn: moment().toDate(),
        Item: itemObjId,
        EntryWeight: req.body.EntryWeight,
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
    // const docs = await dbVisitorLog.find(dbFilter, null, {sort: {TimeIn: -1}});
}

module.exports.Checkout = async function(req, res){
    // req body is parsed as json by default (set in index.js)
    // find and update only most recent visitor
    console.log("Checking out: " + JSON.stringify(req.body));
    
    var docs = await dbVisitorLog.find({
                    PassId:req.body.PassId, 
                    CheckedIn: true
                }).exec();
    if (docs.length > 0)
    {
        dbVisitorLog.findOneAndUpdate(
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
                Currency: req.body.Currency,
                CheckedIn: false
            }, 
            {
                sort:{
                    TimeIn:-1
                }, 
                new: true,
                maxTimeMS: 3000
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
    else
    {
        await res.status(400).send(`No element found in database with requested data.`);
    }
}
