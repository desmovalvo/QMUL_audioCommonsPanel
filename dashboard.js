// global vars

var ws = null;

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

var subToPlugins = "PREFIX td:<http://wot.arces.unibo.it/ontology/web_of_things#> " + 
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "PREFIX dul: <http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#> " + 
    "SELECT ?thing ?thingName ?plugin " + 
    "WHERE {" + 
    "  ?thing rdf:type td:Thing . " +
    "  ?thing td:hasName ?thingName . " +
    "  ?thing td:hasProperty ?property . " + 
    "  ?property rdf:type td:Property . " + 
    "  ?property td:hasName 'hasPlugin' . " +
    "  ?property dul:hasDataValue ?bag . " +
    "  ?bag rdf:li ?plugin " +
    "}"

var subToSongs = "PREFIX ac:<http://audiocommons.org/ns/audiocommons#> " +
    "PREFIX dc: <http://purl.org/dc/elements/1.1/> " +
    "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " + 
    "SELECT ?title ?uri " +
    "WHERE { " +
    "  ?audioClip rdf:type ac:AudioClip . " +
    "  ?audioClip dc:title ?title . " +
    "  ?audioClip ac:available_as ?uri . " +
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
	    qURI = "http://" + myJson["parameters"]["host"] + ":" + myJson["parameters"]["ports"]["http"] + myJson["parameters"]["paths"]["query"];
	    document.getElementById("queryURI").value = qURI;    
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
	ws = new WebSocket(subscribeURI);
	
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
	    ws.send(JSON.stringify({"subscribe":subToPlugins, "alias":"plugins"}));	    
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
    
    if (msg["subscribed"] !== undefined){

	// store the subid on first message
	subscriptions[msg["alias"]] = msg["subscribed"];

	// check the subscription
	if (msg["alias"] === "actions"){

	    actTable = document.getElementById("actTable");
	    
	    // parse initial results
	    for (result in msg["firstResults"]["results"]["bindings"]){

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
		newCell.innerHTML = '<input type="radio" id="' + actionUri + '_' + thingUri + '" name="selectedAction" value="' + actionUri + '">';
	    }	   
	}
	else if (msg["alias"] === "songs"){

	    // get the table
	    audTable = document.getElementById("audTable");
	    
	    // parse initial results
	    for (result in msg["firstResults"]["results"]["bindings"]){
		
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
	else if (msg["alias"] === "plugins"){

	    plgTable = document.getElementById("plgTable");
	    
	    // parse initial results
	    for (result in msg["firstResults"]["results"]["bindings"]){
		
		// parse binding
		plugin = msg["firstResults"]["results"]["bindings"][result]["plugin"]["value"];
		thingUri = msg["firstResults"]["results"]["bindings"][result]["thing"]["value"];
		thingName = msg["firstResults"]["results"]["bindings"][result]["thingName"]["value"];
		
		// add a row to the table
		newRow = plgTable.insertRow(-1);
		
		// build the ID of the row with the concatenation of
		// thingURI + actionURI
		newRow.id = thingUri + plugin;
		
		// add fields to the row
		newCell = newRow.insertCell(-1);		    
		newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + plugin;
		// newCell.setAttribute("title", actionUri);
		
		newCell = newRow.insertCell(-1);
		newCell.innerHTML = '<i class="fas fa-cogs"></i>&nbsp;' + thingName;
		newCell.setAttribute("title", thingUri);
	    }	   
	}
	else if (msg["alias"] === "actionOutput"){
	    // pass
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
		    newCell.innerHTML = '<input type="radio" id="' + actionUri + '_' + thingUri + '" name="selectedAction" value="' + actionUri + '">';
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
		    
		    // parse binding
		    title = msg["results"]["removedresults"]["bindings"][result]["title"]["value"];
		    uri = msg["results"]["removedresults"]["bindings"][result]["uri"]["value"];

		    // check if row exists, then delete it
		    document.getElementById(title).remove();
		}			
	    }
	    else if (msg["spuid"] === subscriptions["plugins"]){
		
		plgTable = document.getElementById("plgTable");
		
		// parse added results
		for (result in msg["results"]["addedresults"]["bindings"]){
		    
		    // parse binding
		    plugin = msg["results"]["addedresults"]["bindings"][result]["plugin"]["value"];
		    thingUri = msg["results"]["addedresults"]["bindings"][result]["thing"]["value"];
		    thingName = msg["results"]["addedresults"]["bindings"][result]["thingName"]["value"];
		    
		    // add a row to the table
		    newRow = plgTable.insertRow(-1);
		    
		    // build the ID of the row with the concatenation of
		    // thingURI + actionURI
		    newRow.id = thingUri + plugin;
		    
		    // add fields to the row
		    newCell = newRow.insertCell(-1);		    
		    newCell.innerHTML = '<i class="fas fa-music"></i>&nbsp;' + plugin;
		    // newCell.setAttribute("title", actionUri);
		    
		    newCell = newRow.insertCell(-1);
		    newCell.innerHTML = '<i class="fas fa-cogs"></i>&nbsp;' + thingName;
		    newCell.setAttribute("title", thingUri);
		    
		}
		
		// parse deleted results
		for (result in msg["results"]["removedresults"]["bindings"]){
		    
		    // parse binding
		    plugin = msg["results"]["removedresults"]["bindings"][result]["plugin"]["value"];
		    thingUri = msg["results"]["removedresults"]["bindings"][result]["thing"]["value"];
		    thingName = msg["results"]["removedresults"]["bindings"][result]["thingName"]["value"];
		    
		    // build the ID of the row with the concatenation of
		    // thingURI + plugin
		    title = thingUri + plugin;
		    
		    // check if row exists, then delete it
		    document.getElementById(title).remove();
		}	   
		
	    }	    
	    else if (msg["spuid"] === subscriptions["actionOutput"]){

		// ok, now the output is ready.
		// 1 - we get the uri of the named graph containing the results	    	    
		graphUri = ""
		outputBox = document.getElementById("output");
		for (result in msg["results"]["addedresults"]["bindings"]){
		    graphUri = msg["results"]["addedresults"]["bindings"][result]["value"]["value"];

		    // 2 - we retrieve all the triples in that named graph
		    queryURI = document.getElementById("queryURI").value;
		    qText = "SELECT ?s ?p ?o WHERE { " +
			" GRAPH <" + graphUri + "> { " +
			" ?s ?p ?o }}";
		    var req = $.ajax({
			url: queryURI,
			crossOrigin: true,
			method: 'POST',
			contentType: "application/sparql-query",
			data: qText,	
			error: function(event){
			    console.log("[DEBUG] Connection failed!");
			    console.log("Query request failed");
			    return false;
			},
			success: function(data){
			    console.log(data);
			    console.log("Query request successful");

			    var writer = N3.Writer();
			    for (result in data["results"]["bindings"]){

				// subject
				s = null
				if (data["results"]["bindings"][result]["s"]["type"] === "uri"){
				    s = data["results"]["bindings"][result]["s"]["value"]
				} else {
				    s = data["results"]["bindings"][result]["s"]["value"];
				}
				
				// predicate
				p = null
				if (data["results"]["bindings"][result]["p"]["type"] === "uri"){
				    p = data["results"]["bindings"][result]["p"]["value"]
				} else {
				    p = data["results"]["bindings"][result]["p"]["value"];
				}
				
				// object
				o = null
				if (data["results"]["bindings"][result]["o"]["type"] === "uri"){
				    o = data["results"]["bindings"][result]["o"]["value"]
				} else if (data["results"]["bindings"][result]["o"]["type"] === "bnode"){
				    o = data["results"]["bindings"][result]["o"]["value"];
				} else {
				    o = '"' + data["results"]["bindings"][result]["o"]["value"] + '"';
				}

				// add the triple to the writer		  
				writer.addTriple(s,p,o);
			    }
			    writer.end(function (error, result) {
			    	outputBox.innerHTML = result;
			    });
			}
		    });		    
		    
		    // 3 - we delete the action instance and its output
		    updText = "PREFIX td:<http://wot.arces.unibo.it/ontology/web_of_things#> " + 
			"PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
			"PREFIX dul: <http://www.ontologydesignpatterns.org/ont/dul/DUL.owl#> " +
			"PREFIX wot: <http://wot.arces.unibo.it/sepa#> " + 
			"DELETE { " +
			"  ?action wot:hasActionInstance ?instance . " + 
			"  ?instance wot:hasRequestTimeStamp ?request . " +
			"  ?instance wot:hasConfirmationTimeStamp ?confirmation. " + 
			"  ?instance wot:hasCompletionTimeStamp ?completion . " + 
			"  ?instance rdf:type wot:ActionInstance . " + 
			"  ?instance wot:hasInputData ?inputData . " + 
			"  ?inputData dul:hasDataValue ?value . " +
			"  ?s ?p ?o } " + 
			"WHERE { " + 
			"  ?action rdf:type td:Action . " + 
			"  ?action wot:hasActionInstance ?instance . " + 
			"  ?instance wot:hasInputData ?inputData . " +
			"  OPTIONAL { ?inputData dul:hasDataValue ?value } . " +
			"  ?instance wot:hasRequestTimeStamp ?request . " +
			"  OPTIONAL { ?instance wot:hasConfirmationTimeStamp ?confirmation } . " + 
			"  OPTIONAL { ?instance wot:hasCompletionTimeStamp ?completion } . " +
			"  GRAPH <" + graphUri + "> { ?s ?p ?o } " +
		    "}";		
		    var req = $.ajax({
			url: updURI,
			crossOrigin: true,
			method: 'POST',
			contentType: "application/sparql-update",
			data: updText,	
			error: function(event){
			    console.log("[DEBUG] Connection failed!");
			    console.log("Update request failed");
			    return false;
			},
			success: function(data){
			    console.log("Update request successful");
			}
		    });		
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

    // debug print
    console.log("=== INFO === invokeAction called();");

    // get the content of the file
    transform = document.getElementById("transform").value;

    // parse
    var parser = N3.Parser({ format: 'N3' });
    parsed = parser.parse(transform);
    
    // initialize an empty SPARQL UPDATE
    updText = "PREFIX xsd:<http://www.w3.org/2001/XMLSchema#> INSERT DATA { ";

    // get the URI of the transform
    transformUri = null;
    
    // iterate over triples
    for (triple in parsed) {

	// add subject
	if (N3.Util.isIRI(parsed[triple]["subject"])){
	    updText+= " <" + parsed[triple]["subject"] + "> "
	} else {
	    updText+= parsed[triple]["subject"] + " " ;
	}
	
	// add predicate
	if (N3.Util.isIRI(parsed[triple]["predicate"])){
	    updText+= " <" + parsed[triple]["predicate"] + "> "	
	};
	
	// add object
	if (N3.Util.isIRI(parsed[triple]["object"])){
	    updText+= " <" + parsed[triple]["object"] + "> . "	
	} else if (N3.Util.isLiteral(parsed[triple]["object"])) {
	    updText+= ' "' + N3.Util.getLiteralValue(parsed[triple]["object"]) + '" . ';
	} else {
	    updText+= parsed[triple]["object"] + ' . '
	}

	// check if rdf:type transform
	if ((parsed[triple]["predicate"] === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") &&
	    (parsed[triple]["object"] === "http://purl.org/ontology/vamp/Transform")){
	    transformUri = parsed[triple]["subject"];
	}
	
    }

    // finalize the SPARQL UPDATE
    updText += " }"
    
    // get the update uri
    updURI = document.getElementById("updateURI").value;

    // send the update
    var req = $.ajax({
	url: updURI,
	crossOrigin: true,
	method: 'POST',
	contentType: "application/sparql-update",
	data: updText,	
	error: function(event){
	    console.log("[DEBUG] Connection failed!");
	    console.log("Update request failed");
	    return false;
	},
	success: function(data){
	    console.log("Update request successful");
	}
    });
    
    // get the requested action
    actionUri = null;
    thingUri = null;
    actRadios = document.getElementsByName("selectedAction");
    for (el in actRadios){
	if (actRadios[el].checked){
	    actionUri = actRadios[el]["value"].split("_")[0];
	    thingUri = actRadios[el]["value"].split("_")[1];
	}
    }

    // get the requested song
    songPath = null;
    songRadios = document.getElementsByName("selectedSong");
    for (el in songRadios){
	if (songRadios[el].checked){
	    songPath = songRadios[el]["value"];
	}
    }
    
    // build the sparql update with the action request
    instanceUri = "http://ns#" + uuid.v4();

    // subscribe to the result

    // open a new websocket
    var ws2 = new WebSocket(subscribeURI);
    
    // handler onopen
    ws2.onopen = function(){
	subText =  "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
	    "PREFIX wot: <http://wot.arces.unibo.it/sepa#> " +
	    "PREFIX td: <http://wot.arces.unibo.it/ontology/web_of_things#> " +
	    "SELECT ?timestamp ?value " +
	    " WHERE { " +
	    " ?thing td:hasAction ?action . " +
	    " ?action rdf:type td:Action . " +
	    " ?action wot:hasActionInstance <" + instanceUri + "> . " +
	    " <" + instanceUri + "> wot:hasCompletionTimeStamp ?timestamp . " + 
	    " OPTIONAL{ " + 
	    "   <" + instanceUri + "> wot:hasOutputData ?output . " +
	    "   ?output wot:hasOutputField ?outputField ." +
	    "   ?outputField wot:hasValue ?value }}"
	ws2.send(JSON.stringify({"subscribe":subText, "alias":"actionOutput"}));	    
    };
    ws2.onmessage = messageHandler;

    // insert the update request into sepa
    inputDataUri = "http://ns#" + uuid.v4();
    inputFieldUri1 = "http://ns#" + uuid.v4();
    inputFieldUri2 = "http://ns#" + uuid.v4();
    updText = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
	"PREFIX wot: <http://wot.arces.unibo.it/sepa#> " +
	"PREFIX td: <http://wot.arces.unibo.it/ontology/web_of_things#> " + 
	"INSERT { " +
	" <" + actionUri + "> wot:hasActionInstance <" + instanceUri + "> . " +
	" <" + instanceUri + "> wot:hasRequestTimeStamp ?request . " +
	" <" + instanceUri + "> wot:hasInputData <" + inputDataUri + "> . " +
	" <" + inputDataUri + "> wot:hasInputField <" + inputFieldUri1 + "> . " +
	" <" + inputFieldUri1 + "> wot:hasValue <" + transformUri + "> . " +
	" <" + inputFieldUri1 + "> wot:hasName 'transformUri' . " +
	" <" + inputDataUri + "> wot:hasInputField <" + inputFieldUri2 + "> . " +
	" <" + inputFieldUri2 + "> wot:hasValue '" + songPath + "' . " +
	" <" + inputFieldUri2 + "> wot:hasName 'audio' . " +
	" <" + instanceUri + "> rdf:type wot:ActionInstance } " +
	" WHERE { " +
	" <" + actionUri + "> rdf:type td:Action . " +	
	" BIND(now() AS ?request)}";
    
    // send the update
    var req = $.ajax({
	url: updURI,
	crossOrigin: true,
	method: 'POST',
	contentType: "application/sparql-update",
	data: updText,	
	error: function(event){
	    console.log("[DEBUG] Connection failed!");
	    console.log("Update request failed");
	    return false;
	},
	success: function(data){
	    console.log("Update request successful");
	}
    });
    
}


/////////////////////////////////////////////////////////////////////////
//
// load Transform
//
/////////////////////////////////////////////////////////////////////////
function loadTransform(){

    // check if file APIs are supported
    if ( ! window.FileReader ) {
	console.log("[ERROR] FileReader API is not supported by your browser.");
	return false;
    }

    // read the content of the field
    var $i = $('#formFile2');		
    input = $i[0];
    if ( input.files && input.files[0] ) {	
	file = input.files[0];
	
	// create a mew instance of the file reader
	fr = new FileReader();		    
	var text;
	fr.onload = function () {
	    // read the content of the file
	    var decodedData = fr.result;

	    // put the content into the transform field
	    document.getElementById("transform").value = decodedData;	    
	    
	}
	fr.readAsText(file);	
    }
}
