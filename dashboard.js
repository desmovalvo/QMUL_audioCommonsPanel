// global vars

var subToActions = "PREFIX td:<http://wot.arces.unibo.it/ontology/web_of_things#> " + 
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + 
    "SELECT ?thing ?thingName ?action ?actionName " + 
    "WHERE {" + 
    "  ?thing rdf:type td:Thing . " +
    "  ?thing td:hasName ?thingName . " +
    "  ?thing td:hasAction ?action . " + 
    "  ?action rdf:type td:Action . " + 
    "  ?action td:hasName ?actionName . " +
    "}"

var subscriptions = {};
var namespaces = {};
var subscribed = false;

/////////////////////////////////////////////////////////////////////////
//
// Load JSAP
//
/////////////////////////////////////////////////////////////////////////

function loadJSAP(){

    // clear previously read namespaces
    namespaces = {};
    
    // check if file APIs are supported
    if ( ! window.FileReader ) {
	console.log("[ERROR] FileReader API is not supported by your browser.");
	return false;
    }

    // read the content of the field
    var $i = $('#formFile1');		
    input = $i[0];
    if ( input.files && input.files[0] ) {	
	file = input.files[0];
	
	// create a mew instance of the file reader
	fr = new FileReader();		    
	var text;
	fr.onload = function () {
	    
	    // read the content of the file
	    var decodedData = fr.result;
	    
	    // parse the JSON file
	    myJson = JSON.parse(decodedData);
	    
	    // retrieve the URLs
	    sURI = "ws://" + myJson["parameters"]["host"] + ":" + myJson["parameters"]["ports"]["ws"] + myJson["parameters"]["paths"]["subscribe"];
	    document.getElementById("subscribeURI").value = sURI;    
	    uURI = "http://" + myJson["parameters"]["host"] + ":" + myJson["parameters"]["ports"]["http"] + myJson["parameters"]["paths"]["update"];
	    document.getElementById("updateURI").value = uURI;

	    // set namespaces
	    nsTable = document.getElementById("nsTable");
	    while(nsTable.rows.length > 0) {
		nsTable.deleteRow(-1);
	    };
	    for (ns in myJson["namespaces"]){
		
		newRow = nsTable.insertRow(-1);
		newCell = newRow.insertCell(0);
		newCell.innerHTML = myJson["namespaces"][ns];
		newCell.id = ns;
		newCell = newRow.insertCell(0);
		newCell.innerHTML = ns;
		namespaces[myJson["namespaces"][ns]] = ns;
		
	    }	   
	};
	fr.readAsText(file);	
    }
    
}

/////////////////////////////////////////////////////////////////////////
//
// Subscribe
//
/////////////////////////////////////////////////////////////////////////

function subscribe(){

    if (!(subscribed)){
	
	// set the new status
	subscribed = true;

	// re-enable fields
	document.getElementById("subscribeURI").setAttribute("disabled", true);
	document.getElementById("updateURI").setAttribute("disabled", true);

	// change button label
	document.getElementById("subscribeBtn").innerHTML = "Unsubscribe";
		
	// get the URI
	subscribeURI = document.getElementById("subscribeURI").value;
	
	// open a websocket
	var ws = new WebSocket(subscribeURI);
	
	// define handlers
	
	// on error
	ws.onerror = function(){	   
	    console.log("ERROR");	    

	    // set status
	    subscribed = false;
	    
	    // re-enable fields
	    document.getElementById("subscribeURI").removeAttribute("disabled", true);
	    document.getElementById("updateURI").removeAttribute("disabled", false);
	    
	    // change button label
	    document.getElementById("subscribeBtn").innerHTML = "Subscribe";
	    
	};
	
	// on open
	ws.onopen = function(){
	    
	    // send a subscribe request
	    ws.send(JSON.stringify({"subscribe":subToActions, "alias":"actions"}));
	    
	};

	// on message
	ws.onmessage = messageHandler;
	
	// on close
	ws.onclose = function(event){

	    // set status
	    subscribed = false;
	    
	    // re-enable fields
	    document.getElementById("subscribeURI").removeAttribute("disabled", true);
	    document.getElementById("updateURI").removeAttribute("disabled", false);
	    
	    // change button label
	    document.getElementById("subscribeBtn").innerHTML = "Subscribe";

	};
    }

    else {

	// set the new status
	subscribed = false;

	// re-enable fields
	document.getElementById("subscribeURI").removeAttribute("disabled", true);
	document.getElementById("updateURI").removeAttribute("disabled", false);

	// change button label
	document.getElementById("subscribeBtn").innerHTML = "Subscribe";

    }
    
};
    

/////////////////////////////////////////////////////////////////////////
//
// Subscribe
//
/////////////////////////////////////////////////////////////////////////

function messageHandler(event){

    // parse the message
    msg = JSON.parse(event.data);
    console.log(msg);
    
    if (msg["subscribed"] !== undefined){

	// store the subid on first message
	subscriptions[msg["alias"]] = msg["subscribed"];

	// check the subscription
	if (msg["alias"] === "actions"){
	
	    // parse initial results
	    for (result in msg["firstResults"]["results"]["bindings"]){

		console.log(result);
		
		// parse binding
		actionUri = msg["firstResults"]["results"]["bindings"][result]["action"]["value"];
		actionName = msg["firstResults"]["results"]["bindings"][result]["actionName"]["value"];
		thingUri = msg["firstResults"]["results"]["bindings"][result]["thing"]["value"];
		thingName = msg["firstResults"]["results"]["bindings"][result]["thingName"]["value"];
	    
		// add a row to the table
		newRow = actTable.insertRow(-1);
		    
		// build the ID of the row with the concatenation of
		// thingURI + actionURI
		newRow.id = thingUri + actionUri;
		
		// add fields to the row
		newCell = newRow.insertCell(-1);		    
		newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + actionName;
		newCell.setAttribute("title", actionUri);
		
		newCell = newRow.insertCell(-1);
		newCell.innerHTML = '<i class="fas fa-cogs"></i>&nbsp;' + thingName;
		newCell.setAttribute("title", thingUri);
		
		newCell = newRow.insertCell(-1);		    
		newCell.innerHTML = "<button action='button' class='btn btn-info btn-sm' onclick='javascript:invokeAction();'><i class='far fa-play-circle'></i>&nbsp;Invoke</button>";
	    }
	}	
    }
    else { 

	// parse results
	if (msg["results"] !== undefined){

	    // check what subscription sent us a notification
	    if (msg["spuid"] === subscriptions["actions"]){

		// get the related table
		actTables = document.getElementById("actTables");
		
		// parse added results
		for (result in msg["results"]["addedresults"]["bindings"]){

		    // parse binding
		    actionUri = msg["results"]["addedresults"]["bindings"][result]["action"]["value"];
		    actionName = msg["results"]["addedresults"]["bindings"][result]["actionName"]["value"];
		    thingUri = msg["results"]["addedresults"]["bindings"][result]["thing"]["value"];
		    thingName = msg["results"]["addedresults"]["bindings"][result]["thingName"]["value"];

		    // add a row to the table
		    newRow = actTable.insertRow(-1);
		    
		    // build the ID of the row with the concatenation of
		    // thingURI + actionURI
		    newRow.id = thingUri + actionUri;
		    
		    // add fields to the row
		    newCell = newRow.insertCell(-1);		    
		    newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + actionName;
		    newCell.setAttribute("title", actionUri);
		    
		    newCell = newRow.insertCell(-1);
		    newCell.innerHTML = '<i class="fas fa-cogs"></i>&nbsp;' + thingName;
		    newCell.setAttribute("title", thingUri);

		    newCell = newRow.insertCell(-1);		    
		    newCell.innerHTML = "<button action='button' class='btn btn-info btn-sm' onclick='javascript:invokeAction();'><i class='far fa-play-circle'></i>&nbsp;Invoke</button>";
		}

		// parse deleted results
		for (result in msg["results"]["removedresults"]["bindings"]){

		    // parse binding
		    actionUri = msg["results"]["removedresults"]["bindings"][result]["action"]["value"];
		    thingUri = msg["results"]["removedresults"]["bindings"][result]["thing"]["value"];

		    // check if row exists, then delete it
		    document.getElementById(thingUri + actionUri).remove();
		}
	    }	   
	}	
    }    
}

/////////////////////////////////////////////////////////////////////////
//
// shorten
//
/////////////////////////////////////////////////////////////////////////
function shorten(uri){

    p = uri.split("#")[0] + "#";
    if (namespaces[p] !== undefined){
	return namespaces[p] + ":" + uri.split("#")[1];
    } else return uri;
    
}

/////////////////////////////////////////////////////////////////////////
//
// invokeAction
//
/////////////////////////////////////////////////////////////////////////
function invokeAction(){

}
