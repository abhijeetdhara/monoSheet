# Gsheet 🔗 NetSuite Integration [Public Beta]

---

### Overview

This repository provides a comprehensive solution to integrate NetSuite with Google Sheets using Google Apps Script and NetSuite RESTlet scripts. It enables users to fetch datasets and saved searches from NetSuite and populate them directly into Google Sheets for analysis and reporting. The solution leverages OAuth 2.0 authentication with JWT tokens for secure data transfer and includes caching mechanisms for optimized performance. A user-friendly HTML interface is provided for easy configuration of NetSuite credentials and report mappings.

---

### Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Structure](#repository-structure)
3. [Setup and Configuration](#setup-and-configuration)
   - [NetSuite Setup](#netsuite-setup)
   - [Google Cloud Setup](#google-cloud-setup)
   - [Google Sheets Setup](#google-sheets-setup)
4. [Key Components](#key-components)
   - [Google Apps Script](#google-apps-script)
   - [NetSuite RESTlet Scripts](#netsuite-restlet-scripts)
   - [HTML Interface](#html-interface)
5. [OAuth Scopes](#oauth-scopes)
6. [Error Handling](#error-handling)
7. [Google Secret Manager Configuration](#google-secret-manager-configuration)
8. [Third-Party Libraries](#third-party-libraries)
9. [Key Changes](#key-changes)

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
   - Configure Google Secret Manager with NetSuite credentials.

3. **Google Sheets Setup**:
   - Open a Google Sheet and add the provided script & HTML to the Apps Script editor.

---

### Repository Structure

```
.
├── Appscript Files
│   ├── README.md
│   ├── appScriptGSheetDataPull.gs
│   ├── jrassign-all-min 11.1.0.js
│   └── nsUiConfig.html
├── SuiteScript Files
│   ├── README.md
│   ├── RS_getDataset.js
│   └── RS_getDatasetMetadata.js
├── README.md
└── LICENSE
```

- **Appscript Files/**: Contains the Google Apps Script code for integration and the HTML configuration interface.
- **SuiteScript Files/**: Contains the NetSuite RESTlet scripts for metadata retrieval and data fetching.
- **README.md**: Documentation for setting up and using the integration.
- **LICENSE**: License information for the repository.

---

### Setup and Configuration

#### NetSuite Setup

1. Deploy the provided RESTlet scripts in NetSuite:
   - `RS_getDatasetMetadata.js`: Fetches metadata about datasets and saved searches.
   - `RS_getDataset.js`: Retrieves data from datasets and saved searches.

2. Obtain the required OAuth credentials from your NetSuite account settings.

#### Google Cloud Setup

1. Configure Google Secret Manager to store NetSuite credentials in the specified format.

#### Google Sheets Setup

1. Open the Script Editor (`Extensions > Apps Script`) in your Google Sheet.
2. Copy and paste the contents of `appScriptGSheetDataPull.gs` into the script editor.
3. Add `nsUiConfig.html` as a new HTML file in the script editor.
4. Add two parameters - 'menuData' & 'nsConfig' to the script properties.
5. Save and close the script editor.

---

### Key Components

#### Google Apps Script

- **appScriptGSheetDataPull.gs**: Handles authentication, data fetching, caching, and UI generation within Google Sheets.
- **Functions**:
  - `onOpen()`: Initializes the custom menu in Google Sheets.
  - `showConfigurationDialog()`: Opens the configuration UI.
  - `getAccessTokenCached()`: Manages OAuth token retrieval and caching.
  - `getData()`: Fetches data from NetSuite and publishes it to Google Sheets.

#### NetSuite RESTlet Scripts

- **RS_getDatasetMetadata.js**: Retrieves metadata about datasets and saved searches.
- **RS_getDataset.js**: Fetches actual data from NetSuite based on user-defined parameters.

#### HTML Interface

- **nsUiConfig.html**: Provides a graphical interface for configuring NetSuite credentials and report mappings.
  - **Functions**:
    - `populateSecrets(data)`: Populates the secret configuration form.
    - `populateReportMapping(data)`: Displays report mapping configurations.
    - `saveSecrets()` / `saveMapping()`: Saves configurations to script properties.
      
      ![image](https://github.com/user-attachments/assets/726a2dde-19fd-4fcc-b1c1-c68b500378ca)


---

### OAuth Scopes

Ensure the following OAuth scopes are enabled for the script to function correctly:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/spreadsheets.currentonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/script.container.ui"
]
```

---

### Error Handling

- Comprehensive `try-catch` blocks are implemented to handle potential errors.
- Errors from NetSuite API and Google Secret Manager are logged using `Logger.log` and displayed via `ui.alert`.

---

### Google Secret Manager Configuration

Ensure your Google Secret Manager stores the NetSuite configuration in the following JSON format:

```json
{
  "pagestoload": "5",    // Minimum-0, Maximum-anything that restlet can handle within governance, but do note higher number = higher API response time
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


### Third-Party Libraries
#### This repository is licensed under the MIT License and uses the following third-party libraries:
*   [jsrsasign](https://kjur.github.io/jsrsasign/): Maintained by **Kenji Urushima**
 ---
 
### Key Changes:
*   [21/01/2025]
    *   **Added folders to maintain files hierarchy**.
    *   **Added a "Third-Party Libraries" section** to acknowledge the use of the MIT-licensed library.
    *   Maintained the structure and clarity of `README.md`.
*   [01/02/2025]
    *   **Added support for Saved Searches**.
    *   **Added support for Report grouping - allows users to group multiple reports so that they can be loaded in a single click**.
    *   **Added UI config page to setup your integration and report mappings**.
    *   **Added technical docs to each folders**.
*   [02/02/2025]
    *   **Added the missing script properties for the appscript**.
