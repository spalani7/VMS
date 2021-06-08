const mongoose = require('./dbconnect');

var VisitorSchema = new mongoose.Schema({
    Date:{ type: Date, default: Date.now() },
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Phone:{ type: Number, required: true },
    _editIndex: Number,
});

var VisitorLogSchema = new mongoose.Schema({
    Date:{ type: Date, default: Date.now() },
    Name: { type: String, required: true },
    VehicleNo:{ type: String, required: true },
    Phone:{ type: Number, required: true },
    TimeIn:{ type: Date, default: Date.now() },
    TimeOut:{ type: Date, default: Date.now() },
    Trade:{ type: Map, required: true },
    CheckedIn: { type: Boolean, required: true}
});

var ItemSchema = new mongoose.Schema({
    Date:{ type: Date, default: Date.now() },
    Name:{ type: String, required: true },
    Price:{ type: Number, required: true },
    Currency:{ type: String, default: "INR" },
    PerUnits:{ type: String, required: true },
    active:{ type: Boolean, required: true}
});

const dbVistor = mongoose.model('visitors', VisitorSchema);
const dbVistorLog = mongoose.model('visitors_log', VisitorLogSchema);
const dbItem = mongoose.model('items', ItemSchema);

module.exports.GetVisitorLogs = async function(req, res){
    // Retrieve only todays data for display on gui
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const docs = await dbVistorLog.find({Date: {$gte: today}}, null, {sort: {Date: -1}});
    return [200, JSON.stringify(docs)];
}

module.exports.GetVisitors = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Getting all Visitors data..");
    const docs = await dbVistor.find({});
    console.log(docs);
    return [200, JSON.stringify(docs)];
}

module.exports.SearchVisitors = async function(req, res){
    // Retrieve only todays data for display on gui
    console.log("Searching Visitor..");

    for (var e in req.body) {
        if (req.body[e] === null || req.body[e] === undefined || req.body[e]=='') {
          delete req.body[e];
        }
    }

    const docs = await dbVistor.find(req.body);
    console.log(docs);
    return [200, JSON.stringify(docs)];
}

module.exports.AddVisitor = async function(req, res){

    // req body is parsed as json by default (set in index.js)

    // Populate new visitor data
    var newVisitor = new dbVistor({
        Date:Date.now(),
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        Phone:req.body.Phone, 
    });

    let error = newVisitor.validateSync();
    if(error) return [400, error['message']];
    console.log("Adding: " + newVisitor);

    // Save new visitor to database
    newVisitor.save(function(err) {
        if(err) return [400, err];
        else return [200, "New visitor info added"];
    });

    return [200, "New visitor info added"];
}

module.exports.Checkin = async function(req, res){

    // req body is parsed as json by default (set in index.js)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    req.body['Date'] = {$gte: today};
    req.body['CheckedIn'] = true;
    const docs = await dbVistorLog.find(req.body, null, {sort: {Date: -1}});
    if (docs.length > 0)
    {
        // console.log("Visitor already checked in today\n" + docs);
        return [400, 'User already checked in today'];
    }

    // Populate new visitor data
    var newVisitorLog = new dbVistorLog({
        Date:Date.now(),
        Name:req.body.Name, 
        VehicleNo:req.body.VehicleNo, 
        Phone:req.body.Phone, 
        TimeIn:Date.now(),
        TimeOut:null,
        Trade:{},
        CheckedIn:true, 
    });

    let error = newVisitorLog.validateSync();
    if(error) return [400, error['message']];
    console.log("Checking in: " + newVisitorLog);

    // Save new visitor to database
    newVisitorLog.save(function(err) {
        if(err) return [400, err];
        else return [200, "Visitor checked in"];
    });

    return [200, "Visitor checked in"];
}

module.exports.Checkout = async function(req, res){
    // req body is parsed as json by default (set in index.js)
    // find and update only most recent visitor
    console.log("Checking out: " + JSON.stringify(req.body));
    
    doc = await dbVistorLog.findOneAndUpdate(
        {
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
                Date:-1
            }, 
            new: true
        },
        // function(error, doc) {
        //     if(doc == null) return [400, "Visitor checkin not found1\n" + JSON.stringify(req.body)];
        //     if (error) return [200, JSON.stringify(error)];
        //     return [200, JSON.stringify(error)];
        // }
    );

    if(doc == null) return [400, "Visitor checkin not found2\n" + JSON.stringify(req.body)];
    else return [200, "Visitor checked out"];
}
