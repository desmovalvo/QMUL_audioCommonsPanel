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

var subToSongs = "PREFIX ac:<http://audiocommons.org/ns/audiocommons#> " +
    "PREFIX dc: <http://purl.org/dc/elements/1.1/> " +
    "PREFIX ns: <http://ns#> " +
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + 
    "SELECT ?title ?uri " +
    "WHERE { " +
    "  ?audioClip rdf:type ac:AudioClip . " +
    "  ?audioClip dc:title ?title . " +
    "  ?audioClip ac:available_as ?audioFile . " +
    "  ?audioFile ns:hasLocation ?uri " + 
    "}";

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
	    
	    // send 2 subscribe requests
	    ws.send(JSON.stringify({"subscribe":subToActions, "alias":"actions"}));
	    ws.send(JSON.stringify({"subscribe":subToSongs, "alias":"songs"}));	    
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

	    actTable = document.getElementById("actTable");
	    
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
		newCell.innerHTML = '<input type="radio" id="' + actionUri + '_button" name="selectedAction" value="' + actionUri + '">';
	    }	   
	}
	else if (msg["alias"] === "songs"){

	    // get the table
	    audTable = document.getElementById("audTable");
	    
	    // parse initial results
	    for (result in msg["firstResults"]["results"]["bindings"]){
		
		console.log(result);
		
		// parse binding
		title = msg["firstResults"]["results"]["bindings"][result]["title"]["value"];
		uri = msg["firstResults"]["results"]["bindings"][result]["uri"]["value"];
		
		// add a row to the table
		newRow = audTable.insertRow(-1);
		newRow.id = title;
		
		// add fields to the row
		newCell = newRow.insertCell(-1);		    
		newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + title;
		newCell = newRow.insertCell(-1);		    
		newCell.innerHTML = '<input type="radio" id="' + uri + '" name="selectedSong" value="' + uri + '">'		
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
		    newCell.innerHTML = '<input type="radio" id="' + actionUri + '_button" name="selectedAction" value="' + actionUri + '">';
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
	    else if (msg["spuid"] === subscriptions["songs"]){
		
		// get the table
		audTable = document.getElementById("audTable");
		
		// parse added results
		for (result in msg["results"]["addedresults"]["bindings"]){
		    
		    console.log(result);
		    
		    // parse binding
		    title = msg["results"]["addedresults"]["bindings"][result]["title"]["value"];
		    uri = msg["results"]["addedresults"]["bindings"][result]["uri"]["value"];
		    
		    // add a row to the table
		    newRow = audTable.insertRow(-1);
		    newRow.id = title;
		    
		    // add fields to the row
		    newCell = newRow.insertCell(-1);		    
		    newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + title;
		    newCell = newRow.insertCell(-1);		    
		    newCell.innerHTML = '<input type="radio" id="' + uri + '" name="selectedSong" value="' + uri + '">'		
		}

		// parse removed results
		for (result in msg["results"]["removedresults"]["bindings"]){
		    
		    console.log(result);
		    
		    // parse binding
		    title = msg["results"]["removedresults"]["bindings"][result]["title"]["value"];
		    uri = msg["results"]["removedresults"]["bindings"][result]["uri"]["value"];

		    // check if row exists, then delete it
		    document.getElementById(title).remove();
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
