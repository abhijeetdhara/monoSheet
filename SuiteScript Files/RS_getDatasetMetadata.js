/*
MIT License

Copyright (c) 2025 Abhijeet Dhara

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

/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/dataset', 'N/search'], (dataset, search) => {

    /**
     * Handles GET requests to the Restlet.
     *
     * Extracts the dataset ID, number of pages to load, and employee email from the
     * request context. Depending on the dataset ID type, it calls the appropriate metadata
     * retrieval function.
     *
     * @param {Object} context - The request context.
     * @param {string} context.datasetid - The ID of the dataset or saved search.
     * @param {string|number} context.pagestoload - The number of pages to process.
     * @param {string} context.employeeemail - The email of the employee making the request.
     * @returns {Object} The metadata object if successful, or an error object.
     */
    const get = (context) => {
        try {
            const reportid = context.datasetid; //dataset in NetSuite to be returned
            const pagestoLoad = context.pagestoload; //number of pages to prcoess the request
            const employeeEmail = context.employeeemail; //sheets user email
            log.debug('reportid', reportid);
            log.debug('pagestoLoad', pagestoLoad);
            log.debug('employeeEmail', employeeEmail);

            const employeeid = getActiveEmployeebyEmail(employeeEmail);
            log.debug('employeeid', employeeid);

            if (reportid.indexOf('customsearch') != -1) {
                log.debug('Executing Search');
                return getSearchMetadata(reportid, pagestoLoad, employeeEmail);
            } else if (reportid.indexOf('custdataset') != -1) {
                log.debug('Executing Dataset');
                return getDSMetadata(reportid, pagestoLoad, employeeEmail);
            } else {
                throw { "error": "INVALID_REPORTID", "message": "The dataset/saved search id is invalid" };
            }
        } catch (e) {
            log.error('error in get()', JSON.stringify(e));
            return e;
        }
    };

    /**
     * Retrieves metadata for a NetSuite dataset.
     *
     * Loads the dataset using the given report ID, runs it as a paged dataset with a page size
     * of 1000, and computes metadata such as total rows, computed pages, and page index range.
     *
     * @param {string} reportid - The ID of the dataset.
     * @param {number|string} pagestoLoad - The number of pages to process as a custom page size.
     * @param {string} employeeEmail - The email address of the requesting employee.
     * @returns {Object} An object containing metadata: dataset name, type, total rows,
     *                   total computed pages, and page index range.
     */
    const getDSMetadata = (reportid, pagestoLoad, employeeEmail) => {
        const report = dataset.load({
            id: reportid
        });
        const pagedData = report.runPaged({
            pageSize: 1000
        });
        const totalPages = pagedData.pageRanges.length;

        //Compute custom pages where end users page size & dataset page size may differ
        //datasetpage size is max 1000, which is currently being used
        //pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;

        //logging for debugging purpose
        log.debug('pagestoLoad', pagestoLoad);
        log.debug('totalPages', totalPages);
        log.debug('computedPages', computedPages);
        log.debug('totalrows', totalrows);

        return {
            "dataset_name": report.name,
            "type": report.type,
            "total_rows": totalrows,
            "total_pages": computedPages,
            "pageindex_range": `0-${(computedPages - 1)}`
        };
    };

    /**
     * Retrieves metadata for a NetSuite saved search.
     *
     * Loads the saved search using the given report ID, runs it as a paged search with a page size
     * of 1000, and computes metadata such as total rows, computed pages, and page index range.
     *
     * @param {string} reportid - The ID of the saved search.
     * @param {number|string} pagestoLoad - The number of pages to process as a custom page size.
     * @param {string} employeeEmail - The email address of the requesting employee.
     * @returns {Object} An object containing metadata: dataset name (title), search type, total rows,
     *                   total computed pages, and page index range.
     */
    const getSearchMetadata = (reportid, pagestoLoad, employeeEmail) => {
        const report = search.load({
            id: reportid
        });
        const pagedData = report.runPaged({
            pageSize: 1000
        });
        const totalPages = pagedData.pageRanges.length;

        //Compute custom pages where end users page size & dataset page size may differ
        //datasetpage size is max 1000, which is currently being used
        //pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;

        //logging for debugging purpose
        log.debug('pagestoLoad', pagestoLoad);
        log.debug('totalPages', totalPages);
        log.debug('computedPages', computedPages);
        log.debug('totalrows', totalrows);

        return {
            "dataset_name": report.title,
            "type": report.searchType,
            "total_rows": totalrows,
            "total_pages": computedPages,
            "pageindex_range": `0-${(computedPages - 1)}`
        };
    };

    /**
     * Retrieves the internal ID of an active employee based on their email.
     *
     * Creates and runs an employee search filtering by email and active status,
     * then returns the internal ID of the first matching employee.
     *
     * @param {string} employeeEmail - The email address of the employee.
     * @returns {string|undefined} The internal ID of the employee, or undefined if not found.
     */
    const getActiveEmployeebyEmail = (employeeEmail) => {
        try {
            let employeeSearchObj = search.create({
                type: "employee",
                filters:
                    [
                        ["email", "is", employeeEmail],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [search.createColumn({ name: "internalid", label: "Internal ID" })]
            });

            const results = employeeSearchObj.run().getRange({ start: 0, end: 1 });
            if (results && results.length > 0) {
                return results[0].getValue({ name: 'internalid' });
            }

        } catch (e) {
            log.error('error in getActiveEmployeebyEmail()', JSON.stringify(e));
        }
    }

    return { get: get };
});
