let gVisitors = {};
let gVisitorLogs = {};
let gItems = {};
let gStats = {};

window.onload = function() { 
    // need to first update visitor logs because visitors need logs to sort checkedin/checkedout based on logs
    reqVisitorLogs();
    reqItems();
    reqVisitors(); 
    reqStats();
}
$(document).ajaxStop(function(){
    // window.location.reload();
});

function setSelectedValue(selectObj, valueToSet) {
    for (var i = 0; i < selectObj.options.length; i++) {
        if (selectObj.options[i].text== valueToSet) {
            selectObj.options[i].selected = true;
            return;
        }
    }
}

function calcPrice(entryweight, exitweight, item)
{
    var weightDiff = (exitweight < entryweight) ? 0 : (exitweight - entryweight);
    // console.log(weightDiff)
    
    var weightUnit = math.unit(weightDiff, item.Units);
    var amt = -1;
    if (weightUnit.equalBase(math.unit(1, item.Units)))
    {
        amt = weightUnit.to(item.Units).toNumeric() * item.Price;
        amt = parseFloat(amt.toFixed(2));
        // console.log(amt);
    }
    else
    {
        alert("Units mismatch between entered units \'"+ item.Units + "\' and units in database \'" + item.Price + "\'");
    }
    return amt;
}

function getVisitorPassId(visitorObj)
{
    let visitorLogIdx = -1;
    // assuming gVisitorLogs is already sorted in descending order (starting index contains most recent ones) 
    for(var i=0; i<gVisitorLogs.length; i++)
    {
        if(gVisitorLogs[i].Visitor.Name == visitorObj.Name || gVisitorLogs[i].Visitor.VehicleNo == visitorObj.VehicleNo){
            visitorLogIdx = i;
            break;
        }
    }
    if(visitorLogIdx < 0) alert('Something went wrong. Visitor not found in log.')

    return (visitorLogIdx >= 0) ? gVisitorLogs[visitorLogIdx].PassId : null;
}

function getItemByName(itemName)
{
    for(var i=0; i<gItems.length; i++)
    {
        if(gItems[i].Name == itemName){
            return gItems[i]
        }
    }
    alert('Item ' + itemName + ' not found.');
    return null;
}

function getVisitorStatus(visitorObj)
{
    let visitorLogIdx = -1;
    // assuming gVisitorLogs is already sorted in descending order (starting index contains most recent ones)
    for(var i=0; i<gVisitorLogs.length; i++)
    {
        if(gVisitorLogs[i].Visitor.Name == visitorObj.Name || gVisitorLogs[i].Visitor.VehicleNo == visitorObj.VehicleNo){
            visitorLogIdx = i;
            break;
        }
    }
    return (visitorLogIdx >= 0) ? gVisitorLogs[visitorLogIdx].CheckedIn : false;
}

// Populates checkin/checkout forms based on Name or vehicle No
function updateVisitorInfo(obj){
    let checkIn = (obj.id == "idVisitorsIn" || obj.id == "idVehiclesIn") ? true : false;
    let name = (obj.id == "idVisitorsIn" || obj.id == "idVisitors") ? obj.value : undefined;
    let vehicleNo = (obj.id == "idVehiclesIn" || obj.id == "idVehicles") ? obj.value : undefined;
    let visitorIdx = -1;
    let visitorLogIdx = -1;

    for(var i=0; i<gVisitorLogs.length; i++)
    {
        if(gVisitorLogs[i].Visitor.Name == name || gVisitorLogs[i].Visitor.VehicleNo == vehicleNo){
            visitorLogIdx = i;
            break;
        }
    }

    for(var i=0; i<gVisitors.length; i++)
    {
        if(gVisitors[i].Name == name || gVisitors[i].VehicleNo == vehicleNo){
            visitorIdx = i;
            break;
        }
    }

    if (checkIn)
    {
        if (visitorLogIdx >= 0 && gVisitorLogs[visitorLogIdx].CheckedIn)
            alert("User already checked in");
        else
        {
            document.getElementById("idVisitorsIn").value = gVisitors[visitorIdx].Name;
            document.getElementById("idVehiclesIn").value = gVisitors[visitorIdx].VehicleNo;
            document.getElementById("idCompanyIn").value = gVisitors[visitorIdx].Company;
            document.getElementById("idPhoneIn").value = gVisitors[visitorIdx].Phone;
            document.getElementById("idCurrencyCreditIn").innerHTML = 'INR';
            document.getElementById("idCreditValueIn").value = 0;
            gStats['table3'].forEach((val,idx)=>{
                if (val._id == gVisitorLogs[visitorLogIdx].Visitor.Name){
                    document.getElementById("idCreditValueIn").value = val.TotalCredit;
                }
            });
        }
    }
    else
    {
        if (visitorLogIdx < 0 || (visitorLogIdx >= 0 && !gVisitorLogs[visitorLogIdx].CheckedIn))
            alert("User not checked-in or already checked out");
        else
        {
            document.getElementById("idVisitors").value = gVisitorLogs[visitorLogIdx].Visitor.Name;
            document.getElementById("idVehicles").value = gVisitorLogs[visitorLogIdx].Visitor.VehicleNo;
            document.getElementById("idCompany").value = gVisitorLogs[visitorLogIdx].Visitor.Company;
            document.getElementById("idPhone").value = gVisitorLogs[visitorLogIdx].Visitor.Phone;
            document.getElementById("idEntryWeight").value = gVisitorLogs[visitorLogIdx].EntryWeight;
            document.getElementById("idEntryWeightUnits").innerHTML = gVisitorLogs[visitorLogIdx].Item.Units;
            document.getElementById("idExitWeightUnits").innerHTML = gVisitorLogs[visitorLogIdx].Item.Units;
            document.getElementById("idCurrencyPaid").innerHTML = gVisitorLogs[visitorLogIdx].Item.Currency;
            document.getElementById("idCurrencyCredit").innerHTML = gVisitorLogs[visitorLogIdx].Item.Currency;
            document.getElementById("idCreditValue").value = 0;
            document.getElementById("idItemReq").value = gVisitorLogs[visitorLogIdx].Item.Name;
        }
    }
}

function updateItemsList(items){

    // update global object
    gItems = JSON.parse(JSON.stringify(items));
    // console.log(gItems)

    let itemsListIn = document.getElementById("idItemReqIn");
    let itemsListInLen = itemsListIn.length
    for(var i = 1; i < itemsListInLen; i++)
        itemsListIn.remove(i);

    // populate item lists
    gItems.forEach(function(val,index){
        var option = document.createElement("option");
        option.text = val.Name;
        itemsListIn.add(option);
    });

    const dataTable = JSON.parse(JSON.stringify(items));
    var table = new Tabulator("#idTableItems", {
        autoColumns:true,
        layout:"fitDataStretch",
        headerVisible:true,
        pagination: "local",
        paginationSize: 5,
        paginationSizeSelector: true,
        data:dataTable, //set initial table data
        rowClick:function(e, row){
            var rowData = row.getData();
            document.getElementById("idItemNameNew").value = rowData.Name;
            document.getElementById("idItemCurrencyNew").value = rowData.Currency;
            document.getElementById("idItemPriceNew").value = rowData.Price;
            document.getElementById("idItemUnitsNew").value = rowData.Units;
        },
    });
}

// Updates vistor table and checkout dropdown lists based on GET request data (/refresh) from server
function updateVisitorsList(visitors){

    // update global object
    gVisitors = JSON.parse(JSON.stringify(visitors));
    // console.log(gVisitors)

    // clear old lists
    let visitorsListIn = document.getElementById("idVisitorsIn");
    let visitorsListInLen = visitorsListIn.length
    for(var i = 1; i < visitorsListInLen; i++)
        visitorsListIn.remove(i);
    let vehiclesListIn = document.getElementById("idVehiclesIn");
    let vehiclesListInLen = vehiclesListIn.length
    for(var i = 1; i < vehiclesListInLen.length; i++)
        vehiclesListIn.remove(i);

    let visitorsList = document.getElementById("idVisitors");
    let visitorsListLen = visitorsList.length
    for(var i = 1; i < visitorsListLen; i++)
        visitorsList.remove(i);
    let vehiclesList = document.getElementById("idVehicles");
    let vehiclesListLen = vehiclesList.length
    for(var i = 1; i < vehiclesListLen.length; i++)
        vehiclesList.remove(i);

    // populate new lists
    gVisitors.forEach(function(val,index){
        if (getVisitorStatus(val))
        {
            var option1 = document.createElement("option");
            option1.text = val.Name;
            visitorsList.add(option1);

            var option2 = document.createElement("option");
            option2.text = val.VehicleNo;
            vehiclesList.add(option2);
        }
        else
        {
            var option1 = document.createElement("option");
            option1.text = val.Name;
            visitorsListIn.add(option1);

            var option2 = document.createElement("option");
            option2.text = val.VehicleNo;
            vehiclesListIn.add(option2);
        }
    });

    const dataTable = JSON.parse(JSON.stringify(visitors));
    var table = new Tabulator("#idTableVisitors", {
        autoColumns:true,
        layout:"fitDataStretch",
        headerVisible:true,
        pagination: "local",
        paginationSize: 5,
        paginationSizeSelector: true,
        data:dataTable, //set initial table data
        rowClick:function(e, row){
            var rowData = row.getData();
            document.getElementById("idNameNew").value = rowData.Name;
            document.getElementById("idVehicleNew").value = rowData.VehicleNo;
            document.getElementById("idCompanyNew").value = rowData.Company;
            document.getElementById("idPhoneNew").value = rowData.Phone;
        },    
    });
}

function updatePrice(items)
{
    var entryWeight = parseFloat(document.getElementById("idEntryWeight").value);
    var exitWeight = parseFloat(document.getElementById("idExitWeight").value);
    if(exitWeight < entryWeight) 
    {
        document.getElementById("idTotalPrice").innerHTML = "WRONG EXIT WEIGHT";
        return;
    }
    var item = getItemByName(document.getElementById("idItemReq").value);
    var totalPrice = calcPrice(entryWeight, exitWeight, item);
    document.getElementById("idTotalPrice").innerHTML = totalPrice.toString();
    var paidValue = parseFloat(document.getElementById("idPaidValue").value);
    if (paidValue != "NaN")
        document.getElementById("idCreditValue").value = (totalPrice - paidValue).toFixed(2);
}

// Updates vistor table and checkout dropdown lists based on GET request data (/refresh) from server
function updateVisitorTable(visitorlogs){

    // update global object
    gVisitorLogs = JSON.parse(JSON.stringify(visitorlogs));
    // console.log(gVisitorLogs)

    // copy table data, because if Tabulator's mutator is used, it mutates data in table
    const VisitorLogs = JSON.parse(JSON.stringify(gVisitorLogs));

    var table = new Tabulator("#idVistorTable", {
        autoColumns:true,
        layout:"fitDataStretch",
        pagination: "local",
        paginationSize: 20,
        paginationSizeSelector: true,
        headerVisible:true,
        autoColumnsDefinitions:function(definitions){
            //definitions - array of column definition objects
            definitions.forEach((column) => {
                if (column.field == "Visitor") column.field = "Visitor.Name";
                if (column.field == "Item") column.field = "Item.Name";
                if (column.field == "TimeIn" || column.field == "TimeOut") {
                    column.formatter = "datetime";
                    column.formatterParams = {
                        inputFormat:"YYYY-MM-DDTHH:mm:ssZ",
                        outputFormat:"DD/MM/YYYY HH:mm:ss",
                        invalidPlaceholder:" - ",
                    }
                }
                if (column.field == "CheckedIn") {
                    column.mutator = function (value, data, type, params, component){
                        //value - original value of the cell
                        //data - the data for the row
                        //type - the type of mutation occurring  (data|edit)
                        //params - the mutatorParams object from the column definition
                        //component - when the "type" argument is "edit", this contains the cell component for the edited cell, otherwise it is the column component for the column
                        return !value; 
                    };
                    column.title = "Checked Out?";
                    column.formatter = "tickCross";
                }
                if (column.field == "EntryWeight" || column.field == "ExitWeight") {
                    column.mutator = function (value, data, type, params, component){
                        return value.toString() + " " + data.Item.Units;
                    }
                }
                if (column.field == "Price" || column.field == "Paid"  || column.field == "Credit") {
                    column.mutator = function (value, data, type, params, component){
                        return  value.toString() + " " + data.Item.Currency;
                    }
                }
                // if (column.field == "TimeIn") column.field = "Item.Name";
                // column.headerFilter = true; // add header filter to every column
            });
            return definitions;
        },
        data:VisitorLogs, //set initial table data
    });

    var VisitorsToday = {}
    for(var i=0; i<gVisitorLogs.length; i++){
        if (gVisitorLogs[i].Visitor.VehicleNo in VisitorsToday)
            VisitorsToday[gVisitorLogs[i].Visitor.VehicleNo] += 1;
        else
            VisitorsToday[gVisitorLogs[i].Visitor.VehicleNo] = 1;
    }

    document.getElementById("idTotalVistsCnt").innerHTML = gVisitorLogs.length.toString();
    document.getElementById("idTotalVistorsCnt").innerHTML = Object.keys(VisitorsToday).length.toString();
}

function updateWeighUnits(obj){
    var item = getItemByName(obj.value);
    document.getElementById('idEntryWeightInUnits').innerHTML = item.Units;
    // document.getElementById('idExitWeightInUnits').innerHTML = item.Units;
    document.getElementById("idCurrencyCreditIn").innerHTML = item.Currency;
}

function updateStats(stats)
{

    gStats = JSON.parse(JSON.stringify(stats));
    const dataTable = JSON.parse(JSON.stringify(stats));

    var table1 = new Tabulator("#idTable1", {
        autoColumns:true,
        layout:"fitDataStretch",
        headerVisible:true,
        autoColumnsDefinitions:function(definitions){
            //definitions - array of column definition objects
            definitions.forEach((column) => {
                if (column.field == "_id") {
                    column.title = "Month-Year";
                }
            });
            return definitions;
        },
        pagination: "local",
        paginationSize: 10,
        paginationSizeSelector: true,
        data:dataTable['table1'], //set initial table data
    });

    var table2 = new Tabulator("#idTable2", {
        autoColumns:true,
        layout:"fitDataStretch",
        headerVisible:true,
        autoColumnsDefinitions:function(definitions){
            //definitions - array of column definition objects
            definitions.forEach((column) => {
                if (column.field == "_id") {
                    column.title = "Item";
                }
            });
            return definitions;
        },
        pagination: "local",
        paginationSize: 10,
        paginationSizeSelector: true,
        data:dataTable['table2'], //set initial table data
    });

    var table3 = new Tabulator("#idTable3", {
        autoColumns:true,
        layout:"fitDataStretch",
        headerVisible:true,
        autoColumnsDefinitions:function(definitions){
            //definitions - array of column definition objects
            definitions.forEach((column) => {
                if (column.field == "_id") {
                    column.title = "Visitor";
                }
            });
            return definitions;
        },
        pagination: "local",
        paginationSize: 10,
        paginationSizeSelector: true,
        data:dataTable['table3'], //set initial table data
    });

}
// Sends GET request to server to get all items list
function reqItems(){
    $.ajax({
        type: 'GET',
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/items',
        success: function(returns){
            if(returns)
                updateItemsList(JSON.parse(returns));
            else
                alert("Fetching items failed\nError: Unknown");
        },
        error: function(errorMsg){
            alert("Fetching items failed\nError: " + errorMsg.responseText);
        }
    });
}

// Sends GET request to server to get visitors list
function reqVisitors(){
    $.ajax({
        type: 'GET',
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/visitors',
        success: function(returns){
            if(returns)
                updateVisitorsList(JSON.parse(returns))
            else
                alert("Fetching visitors failed\nError: Unknown");
        },
        error: function(errorMsg){
            alert("Fetching visitors failed\nError: " + errorMsg.responseText);
        }
    });
}

// Sends GET request to server to get today's visitors log
function reqVisitorLogs(){
    $.ajax({
        type: 'GET',
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/visitorlogs',
        success: function(returns){
            if(returns)
                updateVisitorTable(JSON.parse(returns));
            else
                alert("Fetching visitor logs failed\nError: Unknown");
        },
        error: function(errorMsg){
            alert("Fetching visitor logs failed\nError: " + errorMsg.responseText);
        }
    });
}

function reqStats(){
    $.ajax({
        type: 'GET',
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/stats',
        success: function(returns){
            if(returns)
                updateStats(JSON.parse(returns));
            else
                alert("Fetching stats failed\nError: Unknown");
        },
        error: function(errorMsg){
            alert("Fetching stats failed\nError: " + errorMsg.responseText);
        }
    });
}

// function cancelSearchVisitor(){
//     document.getElementById("idCheckinForm").reset();
//     document.getElementById("idAddVisitor").disabled = true;
// }

// function searchVisitor(){
//     let data = {};
//     data.Name = document.getElementById("idNameIn").value;
//     data.VehicleNo = document.getElementById("idVehicleNoIn").value;
//     data.Phone = document.getElementById("idPhoneIn").value;
//     $.ajax({
//         type: 'POST',
//         data: JSON.stringify(data),
//         cache: false,
//         contentType: 'application/json',
//         datatype: "json",
//         url: '/searchvisitor',
//         success: function(returns){
//             if(returns){
//                 updateVisitorsList(JSON.parse(returns));
//                 document.getElementById("idAddVisitor").disabled = JSON.parse(returns).length > 0;
//             }
//             else{
//                 document.getElementById("idAddVisitor").disabled = false;
//                 console.log(returns);
//                 alert("Visitor search failed due to unknown error");
//             }
//         },
//         error: function(errorMsg){
//             console.log(errorMsg);
//             document.getElementById("idAddVisitor").disabled = false;
//             alert("Visitor search failed\nError: " + errorMsg.responseText);
//         }
//     });
// }

// Sends POST request to server
$('#idAddForm').validator().on('submit', function (e) {
    if (e.isDefaultPrevented()) {
        // handle the invalid form...
    } 
    else {
        // everything looks good!

        // uncomment if you like to stop reloading page after successfull ajax request
        e.preventDefault();
        if (e.originalEvent.submitter.id == 'idAddvisitorBut')
            reqModifyVisitor("add");
        else if (e.originalEvent.submitter.id == 'idDelvisitorBut')
            reqModifyVisitor("delete");
    }
  }
);

function reqModifyVisitor(reqType){
    let data = {};
    data.ReqType = reqType;
    data.Name = document.getElementById("idNameNew").value;
    data.VehicleNo = document.getElementById("idVehicleNew").value;
    data.Company = document.getElementById("idCompanyNew").value;
    data.Phone = document.getElementById("idPhoneNew").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        async: true,
        contentType: 'application/json',
        datatype: "json",
        url: '/modifyvisitor',
        success: function(returns){
            if(returns){
                document.getElementById("idAddForm").reset();
                document.getElementById("idAddVisitorStatus").innerHTML = "Visitor modified successfully!";
                // updateVisitorsList(JSON.parse(returns));
            }
            else{
                console.log(returns);
                document.getElementById("idAddVisitorStatus").innerHTML = "Error: Unknown";
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            document.getElementById("idAddVisitorStatus").innerHTML = "Error: " + errorMsg.responseText;
        }
    });
}

// Sends POST request to server
$('#idAddItemForm').validator().on('submit', function (e) {
    if (e.isDefaultPrevented()) {
      // handle the invalid form...
    } 
    else {
      // everything looks good!

      // uncomment if you like to stop reloading page after successfull ajax request
        e.preventDefault();
        if (e.originalEvent.submitter.id == 'idAdditemBut')
            reqModifyItem("add");
        else if (e.originalEvent.submitter.id == 'idDelitemBut')
            reqModifyItem("delete");
    }
  }
);

function reqModifyItem(reqType){
    let data = {};
    data.ReqType = reqType;
    data.Name = document.getElementById("idItemNameNew").value;
    data.Currency = document.getElementById("idItemCurrencyNew").value;
    data.Price = document.getElementById("idItemPriceNew").value;
    data.Units = document.getElementById("idItemUnitsNew").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        async: true,
        contentType: 'application/json',
        datatype: "json",
        url: '/modifyitem',
        success: function(returns){
            if(returns){
                document.getElementById("idAddItemForm").reset();
                document.getElementById("idAdditemStatus").innerHTML = "Item modified successfully!";
                // updateItemsList(JSON.parse(returns));
            }
            else{
                console.log(returns);
                document.getElementById("idAdditemStatus").innerHTML = "Error: Unknown";
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            document.getElementById("idAdditemStatus").innerHTML = "Error: " + errorMsg.responseText;
        }
    });
}

// Sends POST request to server to checkin new visitor
$('#idCheckinForm').validator().on('submit', function (e) {
    if (e.isDefaultPrevented()) {
      // handle the invalid form...
    } else {
      // everything looks good!
      // uncomment if you like to stop reloading page after successfull ajax request
    //   e.preventDefault();
      reqCheckin();
    }
  }
);

function reqCheckin(){
    let data = {};
    data.PassId = gVisitorLogs.length + 1;
    data.Visitor = {}
    data.Visitor.Name = document.getElementById("idVisitorsIn").value;
    data.Visitor.VehicleNo = document.getElementById("idVehiclesIn").value;
    data.Visitor.Company = document.getElementById("idCompanyIn").value;
    data.Visitor.Phone = document.getElementById("idPhoneIn").value;
    data.Item = getItemByName(document.getElementById("idItemReqIn").value);
    data.EntryWeight = parseFloat(parseFloat(document.getElementById("idEntryWeightIn").value).toFixed(3)),
    data.ExitWeight = 0,
    data.Price = 0;
    data.Paid = 0;
    data.Credit = 0;

    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/checkin',
        success: function(returns){
            if(returns){
                document.getElementById("idCheckinForm").reset();
                document.getElementById("idCheckoutForm").reset();
                createCheckinInvoice(data);
                // document.getElementById("idCheckInBut").disabled = true;
            }
            else{
                console.log(returns);
                alert("Checkin failed\nError: Unknown");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Checkin failed\nError: " + errorMsg.responseText);
        }
    });
};

// Sends POST request to server to checkout visitor
$('#idCheckoutForm').validator().on('submit', function (e) {
    if (e.isDefaultPrevented()) {
      // handle the invalid form...
    } else {
      // everything looks good!

      // uncomment if you like to stop reloading page after successfull ajax request
      //   e.preventDefault();
      reqCheckout();
    }
  }
);

function reqCheckout(){

    let data = {};
    data.Visitor = {}
    data.Visitor.Name = document.getElementById("idVisitors").value;
    data.Visitor.VehicleNo = document.getElementById("idVehicles").value;
    data.Visitor.Company = document.getElementById("idCompany").value;
    data.Visitor.Phone = document.getElementById("idPhone").value;
    var entryWeight = parseFloat(parseFloat(document.getElementById("idEntryWeight").value).toFixed(3));
    var exitWeight = parseFloat(parseFloat(document.getElementById("idExitWeight").value).toFixed(3));
    if(exitWeight < entryWeight) 
    {
        alert("Checkout failed\nError: Exit weight should be greater than Entry weight");
        return;
    }

    var paidValue = parseFloat(parseFloat(document.getElementById("idPaidValue").value).toFixed(2));
    var item = getItemByName(document.getElementById("idItemReq").value);
    var price = calcPrice(entryWeight, exitWeight, item);
    data.Item = item;
    data.EntryWeight = entryWeight,
    data.ExitWeight = exitWeight,
    data.Price = price;
    data.Paid = paidValue;
    data.Credit = price - paidValue;

    // finds pass ID from the log
    data.PassId = getVisitorPassId(data.Visitor);
    
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/checkout',
        success: function(returns){
            if(returns){
                document.getElementById("idCheckinForm").reset();
                document.getElementById("idCheckoutForm").reset();
                createCheckoutInvoice(data);
                // document.getElementById("idCheckOutBut").disabled = true;
            }
            else{
                console.log(returns);
                alert("Checkout failed\nError: Unknown");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Checkout failed\nError: " + errorMsg.responseText);
        }
    });
};

function createCheckinInvoice(data) {

    // if (data == null)
    // {
    //     data = {}
    //     data.PassId = 70;
    //     data.Name = 'Vinay';
    //     data.VehicleNo = 'KA 6789';
    //     data.Trade = {};
    //     data.Trade.Scale = {}
    //     data.Trade.Units = 'Kg';
    //     data.Trade.EntryWeight = 60;
    //     data.Trade.ExitWeight = 80;
    //     data.Trade.ItemName = 'C Sand';
    //     data.Trade.Scale.Price = 20;
    //     data.Trade.Scale.Currency = 'INR';
    // }
    try {
        var doc = new jspdf.jsPDF();
        doc.deletePage(1);
        doc.setFontSize(20);
        doc.addPage("a6", "l");
        // draw lines
        doc.rect(10, 10, 130, 15);
        doc.rect(10, 25, 130, 20);
        doc.rect(10, 45, 130, 10);
        doc.rect(10, 45, 100, 10);
        doc.rect(10, 45, 70, 10);
        doc.rect(10, 55, 130, 40);
        doc.rect(10, 55, 100, 40);
        doc.rect(10, 55, 70, 40);
        doc.rect(10, 90, 130, 5);
        doc.text('Check-in Pass', 50, 20);
        doc.setFontSize(10);
        doc.text("No: " + data.PassId, 20, 30);
        doc.text("Date: " + moment(Date.now()).format("DD/MM/YYYY HH:mm:ss"), 80, 30);
        doc.text("Name: " + data.Visitor.Name, 20, 35);
        doc.text("Vehicle No: " + data.Visitor.VehicleNo, 80, 35);
        doc.text("Entry Weight: " + data.EntryWeight + " " + data.Item.Units, 20, 40);
        doc.text("Exit Weight: -" + " " + data.Item.Units, 80, 40);
        
        doc.text("Item(s)", 20, 50);
        doc.text("Qty", 90, 50);
        doc.text("Amount", 120, 50);
        doc.text("" + data.Item.Name, 20, 60);
        doc.text("-", 90, 60);
        doc.text("-", 120, 60);

        doc.text("Total", 30, 93);
        doc.text("-", 90, 93);
        doc.text("-", 120, 93);

        // doc.autoPrint();
        // auto print not working.. workaround below
        window.open(doc.output('bloburl'), '_blank')
        // doc.save("sss.pdf");
        // document.getElementById('idInvoiceFrame').src = doc.output('bloburl');
    }
    catch (e) {
        alert("Creating checkin invoice failed.\nException: " + e);
    }
}

function createCheckoutInvoice(data) {

    // if (data == null)
    // {
    //     data = {}
    //     data.PassId = 70;
    //     data.Name = 'Vinay';
    //     data.VehicleNo = 'KA 6789';
    //     data.Trade = {};
    //     data.Trade.Scale = {}
    //     data.Trade.Units = 'Kg';
    //     data.Trade.EntryWeight = 60;
    //     data.Trade.ExitWeight = 80;
    //     data.Trade.ItemName = 'C Sand';
    //     data.Trade.Scale.Price = 20;
    //     data.Trade.Scale.Currency = 'INR';
    // }
    try {
        var doc = new jspdf.jsPDF();
        doc.deletePage(1);
        doc.setFontSize(20);
        doc.addPage("a6", "l");
        // draw lines
        doc.rect(10, 10, 130, 15);
        doc.rect(10, 25, 130, 20);
        doc.rect(10, 45, 130, 10);
        doc.rect(10, 45, 100, 10);
        doc.rect(10, 45, 70, 10);
        doc.rect(10, 55, 130, 40);
        doc.rect(10, 55, 100, 40);
        doc.rect(10, 55, 70, 40);
        doc.rect(10, 90, 130, 5);
        doc.text('Check-out Pass', 50, 20);
        doc.setFontSize(10);
        doc.text("No: " + data.PassId, 20, 30);
        doc.text("Date: " + moment(Date.now()).format("DD/MM/YYYY HH:mm:ss"), 80, 30);
        doc.text("Name: " + data.Visitor.Name, 20, 35);
        doc.text("Vehicle No: " + data.Visitor.VehicleNo, 80, 35);
        doc.text("Entry Weight: " + data.EntryWeight + " " + data.Item.Units, 20, 40);
        doc.text("Exit Weight: " + data.ExitWeight + " " + data.Item.Units, 80, 40);
        
        doc.text("Item(s)", 20, 50);
        doc.text("Qty", 90, 50);
        doc.text("Amount", 120, 50);
        doc.text("" + data.Item.Name, 20, 60);
        doc.text("" + (data.ExitWeight - data.EntryWeight) + " " + data.Item.Units, 90, 60);
        doc.text(data.Item.Currency + " " + data.Price, 120, 60);

        doc.text("CREDIT", 20, 70);
        doc.text(data.Item.Currency + " " + data.Credit * -1, 120, 70);

        doc.text("Total", 30, 93);
        doc.text("" + (data.ExitWeight - data.EntryWeight) + " " + data.Item.Units, 90, 93);
        doc.text(data.Item.Currency + " " + data.Paid, 120, 93);

        // doc.autoPrint();
        // auto print not working.. workaround below
        window.open(doc.output('bloburl'), '_blank')
        // doc.save("sss.pdf");
        // document.getElementById('idInvoiceFrame').src = doc.output('bloburl');
    }
    catch (e) {
        alert("Creating checkout invoice failed.\nException: " + e);
    }
}
