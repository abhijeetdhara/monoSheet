# NetSuite Restlet API Integration Documentation

## Overview
This documentation provides a detailed guide on the two NetSuite Restlet scripts used for retrieving metadata and data from NetSuite Saved Searches and/or Datasets. The scripts are designed to integrate with external systems like Google Sheets, enabling dynamic data fetching and processing.

## Table of Contents
1. [Script 1: Metadata Retrieval](#script-1-metadata-retrieval)
   - [Purpose](#purpose)
   - [Endpoints](#endpoints)
   - [Parameters](#parameters)
   - [Response](#response)
   - [Error Handling](#error-handling)
2. [Script 2: Data Retrieval](#script-2-data-retrieval)
   - [Purpose](#purpose-1)
   - [Endpoints](#endpoints-1)
   - [Parameters](#parameters-1)
   - [Response](#response-1)
   - [Error Handling](#error-handling-1)
3. [Common Logic and Data Flow](#common-logic-and-data-flow)

---

## Script 1: Metadata Retrieval

### Purpose
This script retrieves metadata information about NetSuite Saved Searches and Datasets, including the total number of rows, pages, and dataset/search names. This is useful for determining the volume of data before initiating detailed data retrieval.

### Endpoints
- **HTTP Method:** `GET`
- **Script Type:** `@NScriptType Restlet`

### Parameters
| Parameter       | Type    | Description                                              |
|-----------------|---------|----------------------------------------------------------|
| `datasetid`     | String  | The internal ID of the NetSuite Saved Search or Dataset.  |
| `pagestoload`   | Integer | The number of pages to load & process in a single request.         |
| `employeeemail` | String  | The email of the user requesting the data.               |

### Response
Returns metadata in JSON format:

For **Datasets**:
```json
{
  "dataset_name": "Dataset Name",
  "type": "dataset_type",
  "total_rows": 5000,
  "total_pages": 5,
  "pageindex_range": "0-4"
}
```

For **Saved Searches**:
```json
{
  "dataset_name": "Search Name",
  "type": "search_type",
  "total_rows": 3000,
  "total_pages": 3,
  "pageindex_range": "0-2"
}
```

### Error Handling
- **Invalid Report ID:** If the `datasetid` is not recognized, the script throws:
  ```json
  {
    "error": "INVALID_REPORTID",
    "message": "The dataset/saved search id is invalid"
  }
  ```
- **General Errors:** Logged using `log.error` and returned in JSON format.

---

## Script 2: Data Retrieval

### Purpose
This script retrieves actual data from NetSuite Saved Searches and Datasets in a paginated format. The data is structured as a multi-dimensional array, making it suitable for direct integration with tools like Google Sheets.

### Endpoints
- **HTTP Method:** `GET`
- **Script Type:** `@NScriptType Restlet`

### Parameters
| Parameter       | Type    | Description                                              |
|-----------------|---------|----------------------------------------------------------|
| `datasetid`     | String  | The internal ID of the NetSuite Saved Search or Dataset.  |
| `pageindex`     | Integer | The index of the page to retrieve.                        |
| `pagestoload`   | Integer | The number of pages to load & process in a single request.         |

### Response
Returns the actual data in JSON format:

For **Datasets**:
```json
{
  "dataset_name": "Dataset Name",
  "type": "dataset_type",
  "total_rows": 5000,
  "total_pages": 5,
  "pageindex_range": "0-4",
  "current_pageindex": 0,
  "data": [
    ["Column1", "Column2", "Column3"],
    ["Value1", "Value2", "Value3"],
    ["Value4", "Value5", "Value6"]
  ]
}
```

For **Saved Searches**:
```json
{
  "search_name": "Search Name",
  "type": "search_type",
  "total_rows": 3000,
  "total_pages": 3,
  "pageindex_range": "0-2",
  "current_pageindex": 1,
  "data": [
    ["Column1", "Column2", "Column3"],
    ["Value1", "Value2", "Value3"],
    ["Value4", "Value5", "Value6"]
  ]
}
```

### Error Handling
- **Invalid Report ID:** If the `datasetid` is not recognized, the script throws:
  ```json
  {
    "error": "INVALID_REPORTID",
    "message": "The dataset/saved search id is invalid"
  }
  ```
- **General Errors:** Logged using `log.error` and returned in JSON format.

---

## Common Logic and Data Flow

1. **Input Validation:**
   - Both scripts validate `datasetid` to determine whether to run a Saved Search or Dataset.
   - Pagination parameters (`pageindex`, `pagestoload`) are converted to integers and validated.

2. **Data Retrieval:**
   - **Paged Data:** Both scripts utilize SuiteScript's `runPaged` API with a maximum page size of 1000 records.
   - **Custom Pagination:** The requested number of pages (`pagestoload`) can be customized by the user.

3. **Data Transformation:**
   - Column headers are added only on the first page of the first request.
   - Dataset values are converted to strings, while Saved Search results handle more complex data structures (e.g., arrays of objects).

4. **Response Structure:**
   - Both scripts return consistent metadata and data structures to facilitate easy integration with external tools.
