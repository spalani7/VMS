window.onload = function() { 
    reqVisitorLogs();
}

let gVisitors = {};
let gVisitorLogs = {};

// Populates checkout forma based on Name or vehicle No
function checkStatusVisitor(obj){
    let dashboard = document.getElementById("idVistorTable");
    let name = (obj.id == "idVisitors") ? document.getElementById("idVisitors").value : undefined;
    let vehicleNo = (obj.id == "idVehicles") ? document.getElementById("idVehicles").value : undefined;
    if(name != undefined)
    {
        for(var i=0; i<gVisitors.length; i++)
        {
            if(gVisitors[i].Name == name){
                document.getElementById("idVehicles").value = gVisitors[i].VehicleNo;
                document.getElementById("idPhone").value = gVisitors[i].Phone;
                break;
            }
        }
    }
    else if (vehicleNo!= undefined)
    {
        for(var i=0; i<gVisitors.length; i++)
        {
            if(gVisitors[i].VehicleNo == vehicleNo){
                document.getElementById("idVisitors").value = gVisitors[i].Name;
                document.getElementById("idPhone").value = gVisitors[i].Phone;
                break;
            }
        }
    }
}

// Updates vistor table and checkout dropdown lists based on GET request data (/refresh) from server
function updateVisitorsList(visitors){

    // update global object
    gVisitors = JSON.parse(JSON.stringify(visitors));

    // clear old lists
    let visitorsList = document.getElementById("idVisitors");
    for(var i = 1; i < visitorsList.length; i++)
        visitorsList.remove(i);
    let vehiclesList = document.getElementById("idVehicles");
    for(var i = 1; i < vehiclesList.length; i++)
        vehiclesList.remove(i);
    
    // populate new lists
    visitors.forEach(function(val,index){
        var option1 = document.createElement("option");
        option1.text = val.Name;
        visitorsList.add(option1);

        var option2 = document.createElement("option");
        option2.text = val.VehicleNo;
        vehiclesList.add(option2);
    });

}

// Updates vistor table and checkout dropdown lists based on GET request data (/refresh) from server
function updateVisitorTable(visitorlogs){

    // update global object
    gVisitorLogs = JSON.parse(JSON.stringify(visitorlogs));

    let dashboard = document.getElementById("idVistorTable");

    // delete old entries
    const tableRowCount = dashboard.rows.length;
    for(var i=1; i<tableRowCount; i++)
        dashboard.deleteRow(1);

    // populate new entries
    for(var i=0; i<visitorlogs.length; i++){
        let row = dashboard.insertRow(i+1);
        row.insertCell(0).innerHTML = i+1;
        row.insertCell(1).innerHTML = visitorlogs[i].Name;
        row.insertCell(2).innerHTML = visitorlogs[i].VehicleNo;
        row.insertCell(3).innerHTML = visitorlogs[i].Phone;
        row.insertCell(4).innerHTML = moment(visitorlogs[i].TimeIn).format("DD/MM/YYYY HH:mm:ss");
        row.insertCell(5).innerHTML = moment(visitorlogs[i].TimeOut).format("DD/MM/YYYY HH:mm:ss");

        let checkedin = row.insertCell(6);
        if(visitorlogs[i].CheckedIn)
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
}

// Sends GET request to server to get visitors list
function reqVisitors(){
    $.ajax({
        type: 'GET',
        cache: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/visitors',
        success: function(returns){
            alert(returns);
            if(returns)
                updateVisitorsList(JSON.parse(returns))
            else
                alert("Fetching visitors failed due to unknown error");
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
        contentType: 'application/json',
        datatype: "json",
        url: '/visitorlogs',
        success: function(returns){
            if(returns)
                updateVisitorTable(JSON.parse(returns))
            else
                alert("Fetching visitor logs failed due to unknown error");
        },
        error: function(errorMsg){
            alert("Fetching visitor logs failed\nError: " + errorMsg.responseText);
        }
    });
}

function cancelSearchVisitor(){
    document.getElementById("idSearchForm").reset();
    document.getElementById("idAddVisitor").disabled = true;
}

function searchVisitor(){
    let data = {};
    data.Name = document.getElementById("idNameIn").value;
    data.VehicleNo = document.getElementById("idVehicleNoIn").value;
    data.Phone = document.getElementById("idPhoneIn").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/searchvisitor',
        success: function(returns){
            console.log(returns);
            if(returns){
                updateVisitorsList(JSON.parse(returns));
                document.getElementById("idAddVisitor").disabled = JSON.parse(returns).length > 0;
            }
            else{
                document.getElementById("idAddVisitor").disabled = false;
                console.log(returns);
                alert("Visitor search failed due to unknown error");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            document.getElementById("idAddVisitor").disabled = false;
            alert("Visitor search failed\nError: " + errorMsg.responseText);
        }
    });
}

function reqAddVisitor(){
    let data = {};
    data.Name = document.getElementById("idNameIn").value;
    data.VehicleNo = document.getElementById("idVehicleNoIn").value;
    data.Phone = document.getElementById("idPhoneIn").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/add',
        success: function(returns){
            if(returns){
                document.getElementById("idSearchForm").reset();
                document.getElementById("idAddVisitor").disabled = true;
                reqVisitors();
            }
            else{
                console.log(returns);
                alert("Adding visitor failed due to unknown error");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Adding visitor failed\nError: " + errorMsg.responseText);
        }
    });
}

// Sends POST request to server to checkin new visitor
function reqCheckin(){
    let data = {};
    data.Name = document.getElementById("idVisitors").value;
    data.VehicleNo = document.getElementById("idVehicles").value;
    data.Phone = document.getElementById("idPhone").value;
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/checkin',
        success: function(returns){
            if(returns){
                document.getElementById("idSearchForm").reset();
                document.getElementById("idExecForm").reset();
                reqVisitorLogs();
            }
            else{
                console.log(returns);
                alert("Error: Checkin failed due to unknown error");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Checkin failed\nError: " + errorMsg.responseText);
        }
    });
};

// Sends POST request to server to checkout visitor
function reqCheckout(){
    let data = {};
    data.Name = document.getElementById("idVisitors").value;
    data.VehicleNo = document.getElementById("idVehicles").value;
    data.Phone = document.getElementById("idPhone").value;
    data.Trade = {
        'name': 'C Sand', 
        'quantity': 10, 
        'units': 'kg', 
        'scale': {'price': 45, 'Currency': 'INR', 'per': 'kg'}, 
        'totalPrice': 678
    };
    $.ajax({
        type: 'POST',
        data: JSON.stringify(data),
        cache: false,
        contentType: 'application/json',
        datatype: "json",
        url: '/checkout',
        success: function(returns){
            if(returns){
                document.getElementById("idSearchForm").reset();
                document.getElementById("idExecForm").reset();
                reqVisitorLogs();
            }
            else{
                console.log(returns);
                alert("Error: Checkin failed due to unknown error");
            }
        },
        error: function(errorMsg){
            console.log(errorMsg);
            alert("Checkout failed\nError: " + errorMsg.responseText);
        }
    });
};