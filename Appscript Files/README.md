#Google Apps Script for NetSuite Integration**

---

### Overview

This Google Apps Script facilitates the integration between Google Sheets and NetSuite, allowing users to fetch datasets and saved searches from NetSuite and populate them into Google Sheets. The script employs OAuth 2.0 authentication using JWT tokens for secure communication and leverages caching to optimize performance. An accompanying HTML interface allows users to configure NetSuite credentials and report mappings within the Google Sheets UI.

---

### Table of Contents

1. [Prerequisites](#prerequisites)
2. [Script Configuration](#script-configuration)
3. [Key Components](#key-components)
   - [Global Variables](#global-variables)
   - [Authentication Functions](#authentication-functions)
   - [UI Functions](#ui-functions)
   - [Data Fetching Functions](#data-fetching-functions)
   - [Utility Functions](#utility-functions)
4. [HTML Interface](#html-interface)
5. [Error Handling](#error-handling)
6. [Google Secret Manager Configuration Format](#google-secret-manager-configuration-format)
7. [OAuth Scopes](#oauth-scopes)

---

### Prerequisites

1. **NetSuite Setup**:

   - Ensure NetSuite RESTlet scripts are deployed and accessible.
   - Obtain the following credentials:
     - NetSuite Account ID
     - OAuth 2.0 Client ID and Private Key
     - Certificate ID (KID)
     - Google Secret Manager project ID and secret details

2. **Google Cloud Setup**:

   - Enable Google Apps Script API.
   - Configure Google Secret Manager with NetSuite credentials.

3. **Google Sheets Setup**:

   - Open a Google Sheet and add the provided script to the Apps Script editor.

---

### Script Configuration

1. **Add the Script to Google Sheets**:

   - Open the Script Editor (`Extensions > Apps Script`).
   - Copy and paste the provided script code.
     ![image](https://github.com/user-attachments/assets/c102885c-bf04-44f9-ba28-86c179c0fe9f)

2. **Configure Script Properties**:

   - Add your NetSuite and report configuration using the HTML interface.
     ![image](https://github.com/user-attachments/assets/738e7d1a-66a7-4f6a-95d0-d64541ffa9e8)

---

### Key Components

#### Global Variables

- `CACHE_KEY`, `SECRET_CACHE_KEY`: Keys for caching the NetSuite access token and secret data.
- `currentSpreadSheet`, `scriptProperties`, `ui`: Google Sheets and UI service objects for script interaction.
- `menuDataObj`, `secretsDataObj`: Objects storing the report configuration and NetSuite credentials.

#### Authentication Functions

1. **getCachedSecret()**: Retrieves and caches NetSuite secret credentials from Google Secret Manager.
2. **getAccessTokenCached()**: Retrieves and caches the NetSuite OAuth 2.0 access token.
3. **getClientAssertion()**: Generates a JWT token for OAuth 2.0 client credentials flow.
4. **getAccessToken()**: Fetches the OAuth 2.0 access token from NetSuite using the JWT.

#### UI Functions

1. **onOpen()**: Automatically runs when the spreadsheet is opened, generating dynamic menus based on configured reports.
2. **showConfigurationDialog()**: Displays a modal dialog for configuring NetSuite credentials and report mappings.
3. **saveSecretsToProperties() / saveMappingToProperties()**: Saves the configuration data into script properties.

#### Data Fetching Functions

1. **main(id)**: Core function that triggers data fetching for individual reports or grouped datasets.
2. **getData(datasetid, accessToken, nsParams)**: Fetches data from NetSuite using RESTlet APIs and processes it for Google Sheets.
3. **publishData(data, datasetName)**: Publishes the fetched NetSuite data to the specified Google Sheets tab.

#### Utility Functions

1. **validateParams(param, paramid)**: Validates and parses configuration parameters.
2. **getGroup(menuStructure)**: Groups reports based on their defined group names.

---

### HTML Interface

#### Overview

The HTML file (`nsUiConfig.html`) provides a user-friendly interface for configuring NetSuite integration settings and mapping reports to Google Sheets.

#### Sections

1. **Secret Manager Configuration**:

   - Inputs for NetSuite Account ID, Secret Project ID, Secret Project Name, and Secret Version.
   - A "Save Secret" button to store these credentials in the script properties.

2. **Report Mapping Configuration**:

   - A table interface to map NetSuite report IDs, names, and groups.
   - Options to add, remove, and test report configurations.
   - A "Save Map" button to store the report mappings.

#### Key Functions

1. **populateSecrets(data)**: Fills the secret configuration form with stored data.
2. **populateReportMapping(data)**: Populates the report mapping table with stored configurations.
3. **saveSecrets() / saveMapping()**: Saves the inputted secret and mapping configurations to script properties.
4. **validateSecretForm() / validateMappingRows()**: Ensures all required fields are filled before enabling save buttons.
5. **testRow(button)**: Tests the configuration of a specific report row.

---

### Error Handling

- All critical functions include `try-catch` blocks with detailed logging using `Logger.log` and `ui.alert` for error visibility.
- API errors from NetSuite and Google Secret Manager are captured and presented with descriptive messages.

---

### Google Secret Manager Configuration Format

Ensure your Google Secret Manager stores the NetSuite configuration in the following JSON format:

```json
{
  "pagestoload": "5",    // Minimum-0, Maximum-your NS concurrent request limit, don't go overboard
  "metadatascriptid": "NSMETADATASCRIPTID",
  "metadatadeployid": "NSMETADATASCRIPTDEPLOYID",
  "reportscriptid": "NSREPORTSCRIPTID",
  "reportdeployid": "NSREPORTSCRIPTDEPLOYID",
  "kid": "OAUTH2_CERTIFICATE_ID",
  "clientid": "CLIENT_ID",
  "privatekey": "PRIVATE_CERTIFICATE"
}
```

---

### OAuth Scopes

Ensure the following OAuth scopes are configured for the script:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/spreadsheets.currentonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/script.container.ui"
]
```

