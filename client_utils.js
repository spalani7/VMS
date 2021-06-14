let gVisitors = {};
let gVisitorLogs = {};
let gVisitorsToday = {};
let gItems = {};

window.onload = function() { 
    // need to first update visitor logs because visitors need logs to sort checkedin/checkedout based on logs
    reqVisitorLogs();
    reqItems();
    reqVisitors();
}
$(document).ajaxStop(function(){
    // window.location.reload();
});

function getVisitorPassId(visitorObj)
{
    let visitorLogIdx = -1;
    // assuming gVisitorLogs is already sorted in descending order (starting index contains most recent ones) 
    for(var i=0; i<gVisitorLogs.length; i++)
    {
        if(gVisitorLogs[i].Name == visitorObj.Name || gVisitorLogs[i].VehicleNo == visitorObj.VehicleNo){
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
        if(gVisitorLogs[i].Name == visitorObj.Name || gVisitorLogs[i].VehicleNo == visitorObj.VehicleNo){
            visitorLogIdx = i;
            break;
        }
    }
    return (visitorLogIdx >= 0) ? gVisitorLogs[visitorLogIdx].CheckedIn : false;
}

// Populates checkin/checkout forms based on Name or vehicle No
function updateVisitorInfo(obj){
    let dashboard = document.getElementById("idVistorTable");
    let checkIn = (obj.id == "idVisitorsIn" || obj.id == "idVehiclesIn") ? true : false;
    let name = (obj.id == "idVisitorsIn" || obj.id == "idVisitors") ? obj.value : undefined;
    let vehicleNo = (obj.id == "idVehiclesIn" || obj.id == "idVehicles") ? obj.value : undefined;
    let visitorIdx = -1;
    let visitorLogIdx = -1;

    for(var i=0; i<gVisitorLogs.length; i++)
    {
        if(gVisitorLogs[i].Name == name || gVisitorLogs[i].VehicleNo == vehicleNo){
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
            document.getElementById("idPhoneIn").value = gVisitors[visitorIdx].Phone;
        }
    }
    else
    {
        if (visitorLogIdx < 0 || (visitorLogIdx >= 0 && !gVisitorLogs[visitorLogIdx].CheckedIn))
            alert("User not checked-in or already checked out");
        else
        {
            document.getElementById("idVisitors").value = gVisitorLogs[visitorLogIdx].Name;
            document.getElementById("idVehicles").value = gVisitorLogs[visitorLogIdx].VehicleNo;
            document.getElementById("idPhone").value = gVisitorLogs[visitorLogIdx].Phone;
            document.getElementById("idEntryWeight").value = gVisitorLogs[visitorLogIdx].Trade['EntryWeight'];
            document.getElementById("idItemReq").value = gVisitorLogs[visitorLogIdx].Trade['ItemName'];
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
}

// Updates vistor table and checkout dropdown lists based on GET request data (/refresh) from server
function updateVisitorTable(visitorlogs){

    // update global object
    gVisitorLogs = JSON.parse(JSON.stringify(visitorlogs));
    // console.log(gVisitorLogs)

    document.getElementById("idTotalVistsCnt").innerHTML = gVisitorLogs.length.toString();
    let dashboard = document.getElementById("idVistorTable");

    // delete old entries
    const tableRowCount = dashboard.rows.length;
    for(var i=1; i<tableRowCount; i++)
        dashboard.deleteRow(1);

    gVisitorsToday = {}
    // populate new entries
    for(var i=0; i<gVisitorLogs.length; i++){
        let row = dashboard.insertRow(i+1);
        row.insertCell(0).innerHTML = gVisitorLogs[i].PassId;
        row.insertCell(1).innerHTML = gVisitorLogs[i].Name;
        row.insertCell(2).innerHTML = gVisitorLogs[i].VehicleNo;
        row.insertCell(3).innerHTML = gVisitorLogs[i].Phone;
        row.insertCell(4).innerHTML = moment(gVisitorLogs[i].TimeIn).format("DD/MM/YYYY HH:mm:ss");
        row.insertCell(5).innerHTML = moment(gVisitorLogs[i].TimeOut).format("DD/MM/YYYY HH:mm:ss");
        row.insertCell(6).innerHTML = gVisitorLogs[i].Trade['ItemName'].toString();
        row.insertCell(7).innerHTML = gVisitorLogs[i].Trade['EntryWeight'].toString() + gVisitorLogs[i].Trade.Scale.Units;
        row.insertCell(8).innerHTML = gVisitorLogs[i].Trade['ExitWeight'].toString() + gVisitorLogs[i].Trade.Scale.Units;
        var amt = (gVisitorLogs[i].Trade['ExitWeight'] < gVisitorLogs[i].Trade['EntryWeight']) ? 0 : (gVisitorLogs[i].Trade['ExitWeight'] - gVisitorLogs[i].Trade['EntryWeight']) * gVisitorLogs[i].Trade.Scale.Price;
        row.insertCell(9).innerHTML = gVisitorLogs[i].Trade.Scale.Currency + " " + (amt).toString();

        if (gVisitorLogs[i].VehicleNo in gVisitorsToday)
            gVisitorsToday[gVisitorLogs[i].VehicleNo] += 1;
        else
            gVisitorsToday[gVisitorLogs[i].VehicleNo] = 1;

        let checkedin = row.insertCell(10);
        if(gVisitorLogs[i].CheckedIn)
        {
            checkedin.innerHTML = "CHECKED IN";
            checkedin.style.backgroundColor = "limegreen";
        }
        else
        {
            checkedin.innerHTML = "CHECKED OUT";
            checkedin.style.backgroundColor = "gray";
        }
    }
    document.getElementById("idTotalVistorsCnt").innerHTML = Object.keys(gVisitorsToday).length.toString();
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

function reqAddVisitor(){
    let data = {};
    data.Name = document.getElementById("idNameNew").value;
    data.VehicleNo = document.getElementById("idVehicleNew").value;
    data.Phone = document.getElementById("idPhoneNew").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        async: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/add',
        success: function(returns){
            if(returns){
                document.getElementById("idAddForm").reset();
                document.getElementById("idAddVisitor").disabled = true;
                updateVisitorsList(JSON.parse(returns))
            }
            else{
                console.log(returns);
                alert("Adding visitor failed\nError: Unknown");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Adding visitor failed\nError: " + errorMsg.responseText);
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
    data.Name = document.getElementById("idVisitorsIn").value;
    data.VehicleNo = document.getElementById("idVehiclesIn").value;
    data.Phone = document.getElementById("idPhoneIn").value;
    var entryWeight = parseFloat(document.getElementById("idEntryWeightIn").value);
    var item = getItemByName(document.getElementById("idItemReqIn").value);
    data.Trade = {
        'ItemName': item.Name, 
        'Units': item.Units, 
        'EntryWeight': entryWeight,
        'ExitWeight': 0,
        'Scale': {'Price': item.Price, 'Currency': item.Currency, 'Units': item.Units}, 
        'Payments': []
    };
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
    data.Name = document.getElementById("idVisitors").value;
    data.VehicleNo = document.getElementById("idVehicles").value;
    data.Phone = document.getElementById("idPhone").value;
    var entryWeight = parseFloat(document.getElementById("idEntryWeight").value);
    var exitWeight = parseFloat(document.getElementById("idExitWeight").value);
    if(exitWeight < entryWeight) 
    {
        alert("Checkout failed\nError: Exit weight should be greater than Entry weight");
        return;
    }
    var item = getItemByName(document.getElementById("idItemReq").value);
    data.Trade = {
        'ItemName': item.Name, 
        'Units': item.Units, 
        'EntryWeight': entryWeight,
        'ExitWeight': exitWeight,
        'Scale': {'Price': item.Price, 'Currency': item.Currency, 'Units': item.Units}, 
        'Payments': [{'Amount': (exitWeight-entryWeight) * item.Price, 'PaymentType': 'Cash'}]
    };
    // finds pass ID from the log
    data.PassId = getVisitorPassId(data);
    
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
        doc.text("Name: " + data.Name, 20, 35);
        doc.text("Vehicle No: " + data.VehicleNo, 80, 35);
        doc.text("Entry Weight: " + data.Trade.EntryWeight + " " + data.Trade.Units, 20, 40);
        doc.text("Exit Weight: -" + " " + data.Trade.Units, 80, 40);
        
        doc.text("Item(s)", 20, 50);
        doc.text("Qty", 90, 50);
        doc.text("Amount", 120, 50);
        doc.text("" + data.Trade.ItemName, 20, 60);
        doc.text("-", 90, 60);
        doc.text("-", 120, 60);

        doc.text("Total", 30, 93);
        doc.text("-", 90, 93);
        doc.text("-", 120, 93);

        // doc.autoPrint();
        // auto print not working.. workaround below
        window.open(doc.output('bloburl'), '_blank')
        // doc.save("sss.pdf");
        document.getElementById('idInvoiceFrame').src = doc.output('bloburl');
    }
    catch (e) {
        alert("Creating checkout invoice failed.\nException: " + e);
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
        doc.text("Name: " + data.Name, 20, 35);
        doc.text("Vehicle No: " + data.VehicleNo, 80, 35);
        doc.text("Entry Weight: " + data.Trade.EntryWeight + " " + data.Trade.Units, 20, 40);
        doc.text("Exit Weight: " + data.Trade.ExitWeight + " " + data.Trade.Units, 80, 40);
        
        doc.text("Item(s)", 20, 50);
        doc.text("Qty", 90, 50);
        doc.text("Amount", 120, 50);
        doc.text("" + data.Trade.ItemName, 20, 60);
        var qty = data.Trade.ExitWeight - data.Trade.EntryWeight;
        var amt = qty * data.Trade.Scale.Price;
        doc.text("" + qty + " " + data.Trade.Units, 90, 60);
        doc.text(data.Trade.Scale.Currency + " " + amt, 120, 60);

        doc.text("Total", 30, 93);
        doc.text("" + qty + " " + data.Trade.Units, 90, 93);
        doc.text(data.Trade.Scale.Currency + " " + amt, 120, 93);

        // doc.autoPrint();
        // auto print not working.. workaround below
        window.open(doc.output('bloburl'), '_blank')
        // doc.save("sss.pdf");
        document.getElementById('idInvoiceFrame').src = doc.output('bloburl');
    }
    catch (e) {
        alert("Creating checkout invoice failed.\nException: " + e);
    }
}
