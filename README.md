# Gsheet 🔗 NetSuite dataset setup


### Overview

This documentation outlines the step-by-step setup for the GSheet-NetSuite integration to enable seamless analytics data retrieval.

---

### 1\. Generate & Set Up OAuth2 Certificates in NetSuite

#### Create an Integration Record:

*   Navigate to **Setup > Integration > Manage Integrations > New**.
*   Fill in the required details:
    *   Name: GSheet-NetSuite Integration.
    *   Authentication: Enable **OAuth 2.0**.
*   Save the integration record and note down the **Client ID** and **Client Secret**.

#### Upload RSA Key for OAuth2:

*   Generate an RSA Key Pair. Ensure the private key is securely stored.
*   Upload the public key to the Integration record under **Keys**.

#### Note the Certificate ID:

*   After uploading the public key, note the **Certificate ID (kid)** assigned by NetSuite.

---

### 2\. Create the Dataset and Share with Integration Role

#### Create the Dataset:

*   Go to **Analytics > Dataset Builder > New Dataset**.
*   Create datasets for analytics (e.g., Sales Data, Employee Records).
*   Save the dataset and note the **Dataset ID** for each dataset.
*   Assign the dataset access to the **NetSuite Integration Role** created for API access.
*   Ensure that the role has permissions for:
    *   SuiteAnalytic Workbook.
    *   REST web services.
    *   Login using access token [OAuth2.0] permission.
*   Share Dataset with Integration Role.

---

### 3\. Create & Deploy Analytics Scripts in NetSuite

#### Metadata RESTlet Script:

*   Write or upload the **[metadata retrieval script](https://github.com/abhijeetdhara/gsheet_ns/blob/main/RS_getDatasetMetadata.js)** for datasets.
    *   Deploy the script via **Customization > Scripting > Scripts > New**.

#### Data Pull RESTlet Script:

*   Write or upload the **[data retrieval script](https://github.com/abhijeetdhara/gsheet_ns/blob/main/RS_getDataset.js)** for dataset analytics.
    *   Deploy this script similarly.

#### Note Down Script IDs & Deployment IDs:

*   After deploying the scripts, note the **Script ID** and **Deployment ID** for both scripts.

---

### 4\. Set Up Google Secret Manager for Tokens and Certificates

#### Access Google Cloud Secret Manager:

*   Open the [Google Cloud Console](https://console.cloud.google.com/).
*   Enable **Secret Manager API** for your project.

#### Create a Secret:

Go to **Secret Manager > Create Secret**.

Add a secret named (e.g., netsuite\_tokens) with the following JSON format: 

```javascript
{
  "kid": "OAUTH2_CERTIFICATE_ID",
  "clientid": "CLIENT_ID",
  "privatekey": "PRIVATE_CERTIFICATE"
}
```

#### Grant Access to AppScript:

*   Assign users access to the secret.

---

### 5\. Create a Blank Workbook & Deploy the AppScript

#### Create a Google Sheet:

*   Open Google Sheets and create a new workbook.
*   Name the sheet (e.g., NetSuite Analytics).
#### Add Appscript:
*   Go to **Extensions > AppsScript**.
*   Add the provided **[AppScript code](https://github.com/abhijeetdhara/gsheet_ns/blob/main/appScriptGSheetDataPull.gs)** for the integration.
#### Set Script Properties:

```xml
metadataScriptId
datasetScriptId
metadataDeployid
dsDeployid
accountId
secretprojectid
secretprojectname
dsrefsheet  		//sheet name containing dataset ids and names
pagestoLoad
```

#### Update the application.json with scopes:
```javascript
"oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/spreadsheets.currentonly"
  ]
```

#### Prepare the Dataset Reference Sheet:
*   In the Google Sheet, create a new sheet named **DS Reference**.
*   Add two columns: 
    *   Dataset ID: Enter the dataset IDs created in NetSuite.
    *   Dataset Name: Enter the corresponding dataset names.
*   This design ensures that new datasets can be added dynamically without code changes.

---

### Limitations

*   Datasets exceeding **10,000 rows** may face performance issues due to API response time and GSheet limitations. Optimize dataset size for efficiency.
