# Gsheet 🔗 NetSuite Dataset integration


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
    *   Analytics.
    *   RESTlet Execution.
    *   Token-Based Authentication (OAuth2).

#### Share Dataset with Integration Role:

---

### 3\. Create & Deploy Analytics Scripts in NetSuite

#### Metadata RESTlet Script:

*   Write or upload the **metadata retrieval script** for datasets.
    *   Deploy the script via **Customization > Scripting > Scripts > New**.

#### Data Pull RESTlet Script:

*   Write or upload the **data retrieval script** for dataset analytics.
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

*   Assign roles to the AppScript service account for accessing the secret:
    *   Navigate to **IAM & Admin > Permissions**.
    *   Add a new role: **Secret Manager Secret Accessor**.

---

### 5\. Create a Blank Workbook & Deploy the AppScript

#### Create a Google Sheet:

*   Open Google Sheets and create a new workbook.
*   Name the sheet (e.g., NetSuite Analytics).
*   Go to **Extensions > Apps Script**.
*   Paste the provided AppScript code for the integration.
*   Navigate to **AppScript > Project Settings > Script Properties**.
*   Add the following properties:
*   Select **Deploy > Deploy as Web App**.
*   Assign permissions for the script to access Google Sheets and Secret Manager.
*   In the Google Sheet, create a new sheet named DatasetReference.
*   Add two columns:
    *   **Dataset ID**: Enter the dataset IDs created in NetSuite.
    *   **Dataset Name**: Enter the corresponding dataset names.
*   This design ensures that new datasets can be added dynamically without code changes.

#### Add the AppScript:

#### Set Script Properties:

```xml
metadataScriptId
datasetScriptId
metadataDeployid
dsDeployid
accountId
secretprojectid
secretprojectname
dsrefsheet  		//sheet name containing dataset ids & names
pagestoLoad
```

#### Deploy the Script:

#### Prepare the Dataset Reference Sheet:

---

### Limitations

*   Datasets exceeding **10,000 rows** may face performance issues due to API response time and GSheet limitations. Optimize dataset size for efficiency.
