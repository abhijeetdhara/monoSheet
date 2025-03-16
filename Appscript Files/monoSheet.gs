/*

Author: Abhijeet Dhara
Copyright (c) 2025 DigitalOcean, LLC (All Rights Reserved)

Licensed under the MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Global variables
let navigator = {};
let window = {};
let columnCount;
let totalRows;
let menuStructure;
let grpReportNames = [];

// Vars to cache accessTokens and secret objects
const CACHE_KEY = 'netsuiteAccessToken';
const CACHE_DURATION_SECONDS = 3600;
const SECRET_CACHE_KEY = 'netsuiteSecretObj';
const SECRET_CACHE_DURATION_SECONDS = 3600;

// Script parameters
const currentSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
const scriptProperties = PropertiesService.getScriptProperties();
const ui = SpreadsheetApp.getUi();
const menuData = scriptProperties.getProperty('menuData') || "[]";
const menuDataObj = JSON.parse(menuData);
const nsConfig = scriptProperties.getProperty('nsConfig') || "{}";
const secretsDataObj = JSON.parse(nsConfig);
const accountId = (typeof secretsDataObj === 'object' && secretsDataObj !== null && secretsDataObj.hasOwnProperty('nsaccountid')) ?
    secretsDataObj.nsaccountid :
    null;

// NetSuite endpoints
const nstokenurl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;
const restletUrl = `https://${accountId}.restlets.api.netsuite.com/app/site/hosting/restlet.nl?`;


/**
 * Dynamically creates global functions based on menuDataObj.
 * Each reportid and groupname will be associated with a call to main().
 */
for (let entry of menuDataObj) {
    let {
        reportid,
        groupname
    } = entry;

    // Dynamic func for search & dataset menu
    this[reportid] = () => main(reportid);

    // Format groupname to camelCase
    if (groupname) {
        let formattedGroupname = groupname
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, ' ') // Replace non-alphanumeric characters with spaces
            .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => index === 0 ? match.toLowerCase() : match.toUpperCase())
            .replace(/\s+/g, ''); // Remove spaces after converting to camel case

        // Dynamic func for report group menu
        if (!grpReportNames.includes(formattedGroupname)) {
            this[formattedGroupname] = () => main(formattedGroupname);
            grpReportNames.push(formattedGroupname); // Track added groupnames
        }
    }
}


/**
 * Displays the configuration UI for NetSuite Integration Setup.
 */
const showConfigurationDialog = () => {
    // Show configuration UI
    // Call the HTML template
    const template = HtmlService.createTemplateFromFile('nsUiConfig');

    // Pass values to the template
    template.secretsData = secretsDataObj;
    template.menuData = menuDataObj;

    const htmlOutput = template.evaluate()
        .setWidth(800)
        .setHeight(500);

    ui.showModalDialog(htmlOutput, 'NetSuite Integration Setup');
};


/**
 * Saves secret configuration to the script properties.
 * @param {Object} secrets - The secret configuration object.
 * @return {Object} An object with a "success" boolean and a "message" string.
 */
const saveSecretsToProperties = (secrets) => {
    try {
        const nsConfig = JSON.stringify(secrets);
        scriptProperties.setProperty('nsConfig', nsConfig);
        return {
            success: true,
            message: "Secrets updated."
        };
    } catch (err) {
        return {
            success: false,
            message: err.toString()
        };
    }
}


/**
 * Saves the mapping configuration to the script properties.
 * @param {Object[]} mapping - An array of mapping objects.
 * @return {Object} An object with a "success" boolean and a "message" string.
 */
const saveMappingToProperties = (mapping) => {
    try {
        const mappingJSON = JSON.stringify(mapping);
        scriptProperties.setProperty('menuData', mappingJSON);
        return {
            success: true,
            message: "Mapping updated."
        };
    } catch (err) {
        return {
            success: false,
            message: err.toString()
        };
    }
}


/**
 * Triggered on spreadsheet open.
 * Generates and adds the interactive NetSuite menu.
 * @return {Promise<void>}
 */
const onOpen = async () => {
    try {
        //On Open generate the interactive menu system
        //variables & their defaults
        let searchCount = 0;
        let dsCount = 0;
        let groupCount = 0;

        //Fetch elements for the menu list
        let nsAnalytics = ui.createMenu("NetSuite");
        nsAnalytics.addItem('Setup', 'showConfigurationDialog').addSeparator(); //default setup menu

        if (menuDataObj.length > 0) {
            //ui.alert(`menuDataObj :${JSON.stringify(menuDataObj)}`);

            let nsSearch = ui.createMenu("Search");
            let nsDataset = ui.createMenu("Dataset");
            let nsGroup = ui.createMenu("Group");

            menuDataObj.forEach((item) => {
                const { reportid, reportname } = item;
                if (reportid.indexOf('customsearch') === 0) {
                    nsSearch.addItem(`${reportname}`, reportid);
                    searchCount++;
                } else if (reportid.indexOf('custdataset') === 0) {
                    nsDataset.addItem(`${reportname}`, reportid);
                    dsCount++;
                }
            });

            // Similarly handle the report group names asynchronously
            grpReportNames.forEach((groupname) => {
                nsGroup.addItem(`${groupname}`, groupname);
                groupCount++;
            });

            // Display the menu items
            if (searchCount > 0) nsAnalytics.addSubMenu(nsSearch);
            if (dsCount > 0) nsAnalytics.addSubMenu(nsDataset);
            if (groupCount > 0) nsAnalytics.addSubMenu(nsGroup);
        }
        nsAnalytics.addToUi();

    } catch (e) {
        ui.alert(`error on Open() :${JSON.stringify(e)}`);
    }
};


/**
 * Main function called from dynamic menu items.
 * Fetches data from NetSuite and publishes it to the spreadsheet.
 * @param {string} id - Report ID or group name.
 * @return {Promise<void>}
 */
const main = async (id) => {
    try {
        //ui.alert(`main id clicked is: ${id}`);
        //Generate the access token for the API auth
        //using cache instead of calling functions on every report run
        const { token: accessToken, secretObj } = getAccessTokenCached();
        /*const secretObj = getSecret();
        const clientAssertion = getClientAssertion(secretObj);
        const accessToken = getAccessToken(clientAssertion);*/

        if (id.indexOf("customsearch") === -1 && id.indexOf("custdataset") === -1) {
            //run all the searches or datasets individually within the group
            let groupObj = getGroup(menuDataObj);
            let groupReportObj = groupObj[id];

            await Promise.all(
                groupReportObj.map(async (report) => {
                    try {
                        const reportId = report.reportid;
                        const data = await getData(reportId, accessToken, secretObj);

                        // Fetch data to the sheets
                        const reportName = menuDataObj.find(item => item.reportid === reportId)?.reportname;
                        await publishData(data, reportName);
                    } catch (error) {
                        console.error(`Error processing report ID ${report.reportid}: ${error}`);
                    }
                })
            );
        } else {
            //run the individual search or dataset
            //fetch netSuite data
            let data = await getData(id, accessToken, secretObj);

            //publish data to the sheets
            const reportName = menuDataObj.find(item => item.reportid === id)?.reportname;
            await publishData(data, reportName);
        }
    } catch (e) {
        ui.alert(`error on main() :${JSON.stringify(e)}`);
        Logger.log(`error on main() :${JSON.stringify(e)}`);
    }
};


/**
 * Retrieves the secret object from the user cache or from Secret Manager if not cached.
 * @return {Object} The full secret configuration object.
 */
const getCachedSecret = () => {
  const cache = CacheService.getUserCache();
  let secretJson = cache.get(SECRET_CACHE_KEY);
  if (secretJson) {
    return JSON.parse(secretJson);
  }
  const secretObj = getSecret();
  if (secretObj) {
    cache.put(SECRET_CACHE_KEY, JSON.stringify(secretObj), SECRET_CACHE_DURATION_SECONDS);
  }
  return secretObj;
};


/**
 * Retrieves the cached access token (and secret object) or fetches a new token.
 * @return {{token: string, secretObj: Object}} An object containing the access token and the secret configuration.
 */
const getAccessTokenCached = () => {
  const cache = CacheService.getUserCache();
  let token = cache.get(CACHE_KEY);
  const secretObj = getCachedSecret();
  if (token) {
    return { token, secretObj };
  }
  const clientAssertion = getClientAssertion(secretObj);
  token = getAccessToken(clientAssertion);
  if (token) {
    cache.put(CACHE_KEY, token, CACHE_DURATION_SECONDS);
  }
  return { token, secretObj };
};


/**
 * Retrieves the secret configuration from Google Secret Manager.
 * @return {Object} The secret configuration object.
 */
const getSecret = () => {
    try {
        /*
        Secret accessed from Google secret Manager
        Secret JSON template
        {
          "pagestoload":"5",    //min 0, max-concurrent request limit
          "metadatascriptid":"NSMETADATASCRIPTID","metadatadeployid":"NSMETADATASCRIPTDEPLOYID","reportscriptid":"NSREPORTSCRIPTID",
          "reportdeployid":"NSREPORTSCRIPTDEPLOYID",
          "kid":"OAUTH2_CERTIFICATE_ID",
          "alg":"OAUTH2_JWT_SIGN_ALGO",
          "clientid":"CLIENT_ID",
          "privatekey":"PRIVATE_CERTIFICATE"
        }
        */
        const projectId = secretsDataObj.secretprojectid;
        const secretName = secretsDataObj.secretprojectname;
        const version = secretsDataObj.secretversion;

        const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/${version}:access`;

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
                'Content-Type': 'application/json'
            },
        };

        const response = UrlFetchApp.fetch(url, options);
        const {
            error,
            payload
        } = JSON.parse(response.getContentText());

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
        ui.alert(`Cannot access NetSuite Tokens, please find the additional error details \n :${JSON.stringify(e)}`);
        Logger.log(`Cannot access NetSuite Tokens, please find the additional error details \n :${JSON.stringify(e)}`);
    }
}


/**
 * Generates a client assertion (JWT) using the secret configuration.
 * @param {Object} securedToken - The secret object containing keys for client assertion.
 * @return {string|undefined} The signed JWT or undefined if an error occurs.
 */
const getClientAssertion = (securedToken) => {
    try {
        //Using the RSA-PSS certificate
        const jwtHeader = {
            alg: securedToken.alg, // lib supports RSA-PSS [PS256, PS384, PS512], EC [ES256, ES384]
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
        const signedJWT = KJUR.jws.JWS.sign(securedToken.alg, stringifiedJwtHeader, stringifiedJwtPayload, secret);
        return signedJWT;
    } catch (e) {
        Logger.log(`Error in getClientAssertion(): ${JSON.stringify(e)}`);
        return;
    }
};


/**
 * Retrieves an access token from NetSuite using a client assertion.
 * @param {string} clientAssertion - The signed JWT.
 * @return {string|null} The access token if successful, or null otherwise.
 */
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
        return (responseCode >= 200 && responseCode < 300) ? JSON.parse(responseText).access_token : null;
    } catch (e) {
        Logger.log(`Error in generateAccessToken(): ${JSON.stringify(e)}`);
        return;
    }
};


/**
 * Fetches data from NetSuite for the given dataset.
 * @param {string} datasetid - The dataset identifier.
 * @param {string} accessToken - The access token.
 * @param {Object} nsParams - The secret object containing NetSuite API parameters.
 * @return {Promise<Array>} A flattened array of data.
 */
const getData = async (datasetid, accessToken, nsParams) => {
    try {
        if (!accessToken) {
            ui.alert(`Error generating the access token. Please contact the Script Admin`);
            return [];
        }
        let employeeEmail = Session.getActiveUser().getEmail();
        //ui.alert(`employeeEmail :${JSON.stringify(employeeEmail)}`);

        // Step 1: Fetch dataset metadata to compute the number of pages
        const datasetUrl = `${restletUrl}script=${nsParams.metadatascriptid}&deploy=${nsParams.metadatadeployid}&datasetid=${datasetid}&pagestoload=${nsParams.pagestoload}&employeeemail=${employeeEmail}`;
        const options = {
            method: 'get',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        const metadataResponse = UrlFetchApp.fetch(datasetUrl, options);
        const metadata = JSON.parse(metadataResponse.getContentText());
        const totalPages = metadata.total_pages;
        Logger.log(`Total Pages: ${totalPages}`);

        // Step 2: Prepare all API calls for pages
        const requests = Array.from({
            length: totalPages
        }, (_, pageIndex) => ({
            url: `${restletUrl}script=${nsParams.reportscriptid}&deploy=${nsParams.reportdeployid}&datasetid=${datasetid}&pageindex=${pageIndex}&pagestoload=${nsParams.pagestoload}&employeeemail=${employeeEmail}`,
            method: 'get',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }));

        // Step 3: fetchAll for parallel requests
        const responses = UrlFetchApp.fetchAll(requests);

        // Step 4: Process each response
        const data = responses.map(response => {
            const responseCode = response.getResponseCode();
            if (responseCode >= 200 && responseCode < 300) {
                const responseData = JSON.parse(response.getContentText());
                return responseData.data || []; // Return data if it exists
            } else {
                Logger.log(`Error fetching page: ${responseCode} - ${response.getContentText()}`);
                return []; // Return empty array for failed requests
            }
        });

        // Step 5: Flatten the result and return
        const flattenedData = data.flat();
        return flattenedData;

    } catch (e) {
        Logger.log(`Error in getData: ${JSON.stringify(e)}`);
        return [];
    }
};


/**
 * Publishes a 2D array of data to a spreadsheet.
 * Creates a new sheet if it doesn't exist.
 * @param {Array[]} data - The 2D array of data.
 * @param {string} datasetName - The name of the dataset (sheet name).
 */
const publishData = (data, datasetName) => {
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


/**
 * Validates a configuration parameter by parsing it as JSON.
 * Alerts the user if the parameter is missing or malformed.
 * @param {string} param - The parameter string.
 * @param {string} paramid - The identifier for the parameter.
 * @return {Object} The parsed parameter object.
 * @throws {Error} If the parameter is missing or malformed.
 */
const validateParams = (param, paramid) => {
    try {
        if (param) {
            return JSON.parse(param);
        } else {
            const missingConfig = {
                error: "MISSING_CONFIG",
                messsage: `The ${paramid} is missing data`
            };
            ui.alert(JSON.stringify(missingConfig));
            throw new Error(`Missing config: ${paramid}`);
        }
    } catch (e) {
        const malformedConfig = {
            error: "MALFORMED_CONFIG",
            messsage: `The ${paramid} is malformed structure/data`
        };
        ui.alert(JSON.stringify(malformedConfig));
        throw new Error(`Malformed config: ${paramid}`);
    }
};


/**
 * Converts an array of mapping objects into a grouped object based on a camelCase version of the group name.
 * @param {Object[]} menuStructure - The array of mapping objects.
 * @return {Object} An object where each key is a camelCase group name and the value is an array of report objects.
 */
const getGroup = (menuStructure) => {
  /**
   * Converts a string to camelCase.
   * @param {string} str - The string to convert.
   * @return {string} The camelCase version of the string.
   */
    const toCamelCase = (str) => {
        return str
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, ' ') // Replace non-alphanumeric characters with spaces
            .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
                index === 0 ? match.toLowerCase() : match.toUpperCase()
            )
            .replace(/\s+/g, ''); // Remove spaces after converting to camel case
    };

    const result = {};

    menuStructure.forEach(item => {
        const {
            groupname,
            reportname,
            reportid
        } = item;
        const camelCaseGroupname = toCamelCase(groupname); // Convert groupname to camelCase

        // If the groupname (in camel case) does not exist in the result, initialize it as an empty array
        if (!result[camelCaseGroupname]) {
            result[camelCaseGroupname] = [];
        }

        // Push the report object into the corresponding groupname array
        result[camelCaseGroupname].push({
            reportname: reportname,
            reportid: reportid
        });
    });

    return result;
};
