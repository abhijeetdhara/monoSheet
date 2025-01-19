//variables required for Jrassign
let navigator = {};
let window = {};

//predefined variables
let columnCount;
let menuStructure;
const ui = SpreadsheetApp.getUi();
const scriptProperties = PropertiesService.getScriptProperties();

const metadataScriptId = scriptProperties.getProperty('metadataScriptId');    //add the metadata script id
const datasetScriptId = scriptProperties.getProperty('datasetScriptId');      //add the dataset script id
const metadataDeployid = scriptProperties.getProperty('metadataDeployid');    //add the metadata deployment id
const dsDeployid = scriptProperties.getProperty('dsDeployid');                //add the dataset deployment id
const accountId = scriptProperties.getProperty('accountId');                  //add the NS account ID
const datasetReferenceSheet = scriptProperties.getProperty('dsrefsheet');     // Replace with your sheet name

//total dataset pages to process in a single request; update this based on optimal response time
const pagestoLoad = scriptProperties.getProperty('pagestoLoad');
let totalRows;

//NS endpoints
const nstokenurl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;
const restletUrl = `https://${accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl?`;

const menuItems = () => {
    try {
        
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(datasetReferenceSheet);
        if (!sheet) throw new Error(`Sheet "${datasetReferenceSheet}" not found.`);

        const range = sheet.getDataRange(); // Get all data from the sheet
        const values = range.getValues(); // Get the data as a 2D array

        if (values.length < 2) throw new Error("Sheet has no data or headers.");

        // Sanitize headers: Convert to lowercase and remove spaces
        const headers = values[0].map((header) =>
            header.toString().toLowerCase().replace(/\s+/g, "")
        );
        // All rows after the headers
        const dataRows = values.slice(1);

        // Convert rows to JSON
        menuStructure = dataRows.map((row) => {
            const jsonObject = {};
            row.forEach((cell, index) => {
                jsonObject[headers[index]] = cell; // Map header to cell value
            });
            return jsonObject;
        });

        Logger.log(JSON.stringify(menuStructure)); // Log the JSON array
        return menuStructure;
    } catch (e) {
        Logger.log("Error: " + e.message);
        return [];
    }
};

const onOpen =() => {
    try {
        let menu = ui.createMenu("NetSuite Dataset");
        menuStructure = menuItems();
        for(let entry of menuStructure){
            let dsId = entry.datasetid;
            let dsName = entry.datasetname;
            menu.addItem(`${dsName}`, dsId);
        }
        menu.addToUi();
    } catch (e) {
        ui.alert(`error on Open() :${JSON.stringify(e)}`);
    }
}

//Dynamic func for dataset menu
for (entry of menuItems()) {
  let dsId = entry.datasetid;
  this[dsId] = function() { main(dsId); };
}

const main = (id) => {
    try {
        //ui.alert(`Dataset ID: ${id}`);
        const index = menuStructure.findIndex(item => item.datasetid === id);
        //ui.alert(`Index: ${JSON.stringify(index)}`);
        let dataArray = getData(menuStructure[index].datasetid);                //get analytics data
        publishData(dataArray, menuStructure[index].datasetname);               //publish data
    } catch (e) {
        ui.alert(`error on main() :${JSON.stringify(e)}`);
    }
}

const getSecret = (version = 'latest') => {
    try {
        const projectId = scriptProperties.getProperty('secretprojectid');
        const secretName = scriptProperties.getProperty('secretprojectname');

        const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/${version}:access`;

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
                'Content-Type': 'application/json'
            },
        };

        const response = UrlFetchApp.fetch(url, options);
        const { error, payload } = JSON.parse(response.getContentText());

        // Throw an exception incase of err
        // The secret may not exist or the user may not have access to it
        if (error) {
            throw new Error(error.message);
        }

        // Decode the secret value
        const bytes = Utilities.base64Decode(payload.data);
        const base64 = bytes.map((byte) => `%${byte.toString(16).padStart(2, '0')}`).join('');
        const secretValue = decodeURIComponent(base64);
        return JSON.parse(secretValue);
    } catch (e) {
        SpreadsheetApp.getUi().alert(`Cannot access NetSuite Tokens, please find the additional error details \n :${JSON.stringify(e)}`);
    }
}

const getClientAssertion = () => {
    try {
        //Secret accessed from Google secret Manager
        //Secret JSON template
        //{"kid":"OAUTH2_CERTIFICATE_ID","clientid":"CLIENT_ID","privatekey":"PRIVATE_CERTIFICATE"}
        const securedToken = getSecret();
        //Logger.log(`securedToken: ${JSON.stringify(securedToken)}`);

        //Using the RSA-PSS certificate
        const jwtHeader = {
            alg: 'PS256', // Using PS256, which is one of the algorithms NetSuite supports for client credentials
            typ: 'JWT',
            kid: securedToken.kid // Certificate Id on the client credentials mapping
        };

        const stringifiedJwtHeader = JSON.stringify(jwtHeader);
        const jwtPayload = {
            iss: securedToken.clientid, // consumer key of integration record
            scope: ['restlets'], // scopes specified on integration record
            iat: (new Date() / 1000), // timestamp in seconds
            exp: (new Date() / 1000) + 3600, // timestamp in seconds, 1 hour later, which is max for expiration
            aud: nstokenurl
        };

        const stringifiedJwtPayload = JSON.stringify(jwtPayload);

        // The secret is the private key of the certificate loaded into the client credentials mapping in NetSuite
        const secret = securedToken.privatekey;

        // Sign the JWT with the PS256 algorithm (algorithm must match what is specified in JWT header).
        // The JWT is signed using the jsrsasign lib (KJUR)
        const signedJWT = KJUR.jws.JWS.sign('PS256', stringifiedJwtHeader, stringifiedJwtPayload, secret);
        return signedJWT;
    } catch (e) {
        Logger.log(`Error in getClientAssertion(): ${JSON.stringify(e)}`);
        return;
    }
};

const getAccessToken = (clientAssertion) => {
    try {
        const formData = {
            grant_type: 'client_credentials',
            client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            client_assertion: clientAssertion
        };

        const options = {
            method: 'post',
            payload: formData
        };
        let response = UrlFetchApp.fetch(nstokenurl, options);
        let responseText = response.getContentText();
        let responseCode = response.getResponseCode();
        return (responseCode >=200 && responseCode <300)? JSON.parse(responseText).access_token : null;
    } catch (e) {
        Logger.log(`Error in generateAccessToken(): ${JSON.stringify(e)}`);
        return;
    }
};

const getData = (datasetid) => {
    try {
        //predefined variables
        let i = 0;
        let totalPages;
        let nsRequests = [];
        let dataArray = [];

        //Generate the access token for the API auth
        const clientAssertion = getClientAssertion();
        //Log token o/p for debugging
        //Logger.log(`clientAssertion: ${clientAssertion}`);
        const accessToken = getAccessToken(clientAssertion);
        //Logger.log(`accessToken:  ${accessToken}`);
        if(!accessToken){
            SpreadsheetApp.getUi().alert(`Error generating the access token. Please contact the Script Admin`);
        }

        //get metadata for the dataset to compute the cusom page count based on ${pagestoLoad}
        const datasetUrl = `${restletUrl}script=${metadataScriptId}&deploy=${metadataDeployid}&datasetid=${datasetid}&pagestoLoad=${pagestoLoad}`;
        const options = {
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        let response = UrlFetchApp.fetch(datasetUrl, options);
        let responseText = JSON.parse(response.getContentText());
        totalPages = responseText.total_pages;
        totalRows = responseText.total_rows;
        totalRows += 1;
        Logger.log(`totalPages:  ${totalPages}`);
        Logger.log(`totalRows:  ${totalRows}`);

        //based on totalPages fetch the complete analytics data asynchronously
        for (i = 0; i < totalPages; i++) {
            let apiCall = {
                url: `${restletUrl}script=${datasetScriptId}&deploy=${dsDeployid}&datasetid=${datasetid}&pageindex=${i}&pagestoload=${pagestoLoad}`,
                contentType: 'application/json',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            };
            nsRequests.push(apiCall);
        }

        //Data retrieved from API calls
        let responses = UrlFetchApp.fetchAll(nsRequests);

        responses.forEach(function(response) {
            let responseData = JSON.parse(response.getContentText());
            let responseCode = JSON.parse(response.getResponseCode());
            if (responseCode >= 200 & responseCode < 300) {
                dataArray = dataArray.concat(responseData.data);
            }
        });
        return dataArray;

    } catch (e) {
        Logger.log(`Error in getData  ${JSON.stringify(e)}`);
    }
};

const publishData = (data, datasetName) => {
    const currentSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = currentSpreadSheet.getSheetByName(datasetName);
    let newSheet;

    if (sheet) {
        newSheet = sheet;
        newSheet.clear();
    } else {
        newSheet = currentSpreadSheet.insertSheet(datasetName);
    }
    const activeSheet = currentSpreadSheet.setActiveSheet(newSheet);
    SpreadsheetApp.flush();

    //add|update the table data

    //Add rows to the table
    let range = activeSheet.getRange(activeSheet.getLastRow() + 1, 1, data.length, data[0].length);
    range.setValues(data);
    activeSheet.getRange(1, 1, 1, data[0].length).setBackground("#CCCCCC").setFontWeight('bold');
};