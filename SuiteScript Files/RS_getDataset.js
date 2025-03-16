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

/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/dataset', 'N/search'], (dataset, search) => {

    /**
     * Handles GET requests from the client.
     *
     * Extracts parameters from the request context, logs details,
     * and delegates the processing to either getSearchResults or getDatasetResults
     * depending on the report ID format.
     *
     * @param {Object} context - The request context.
     * @param {string} context.datasetid - The dataset or saved search ID.
     * @param {string|number} context.pageindex - The index of the custom page to fetch.
     * @param {string|number} context.pagestoload - The number of dataset/search pages to process per custom page.
     * @param {string} context.employeeemail - The email address of the employee making the request.
     * @returns {Object} An object containing the result data or an error object.
     */
    const get = (context) => {
        try {
            let data;
            const reportid = context.datasetid;
            const pageIndex = parseInt(context.pageindex);
            const pagestoLoad = parseInt(context.pagestoload);
            log.debug({ title: 'reportid', details: reportid });
            log.debug({ title: 'pageIndex', details: pageIndex });
            log.debug({ title: 'pagestoLoad', details: pagestoLoad });

            //fetch data in multidimensional array; which can be directly pushed to sheets
            if (reportid.indexOf('customsearch') !== -1) {
                log.debug('Executing Search');
                data = getSearchResults(reportid, pageIndex, pagestoLoad);
            } else if (reportid.indexOf('custdataset') !== -1) {
                log.debug('Executing Dataset');
                data = getDatasetResults(reportid, pageIndex, pagestoLoad);
            } else {
                data = { "error": "INVALID_REPORTID", "message": "The dataset/saved search id is invalid" };
            }

            return data;
        } catch (e) {
            log.error({ title: 'error in get', details: JSON.stringify(e) });
            return e;
        }
    };

    /**
     * Retrieves dataset results from NetSuite.
     *
     * Loads a dataset based on the given ID, paginates the results using a page size of 1000,
     * computes custom pages based on the provided "pagestoLoad" parameter, and returns a metadata object
     * along with the retrieved data (formatted as a multidimensional array).
     *
     * @param {string} datsetid - The ID of the dataset.
     * @param {number} pageIndex - The custom page index to fetch.
     * @param {number} pagestoLoad - The number of dataset pages to process per custom page.
     * @returns {Object} An object containing:
     *   - dataset_name: {string} The dataset name.
     *   - type: {string} The dataset type.
     *   - total_rows: {number} The total number of rows in the dataset.
     *   - total_pages: {number} The computed total number of custom pages.
     *   - pageindex_range: {string} A string representing the range of page indexes (e.g. "0-3").
     *   - data: {Array[]} A multidimensional array of dataset data (first row are headers).
     */
    const getDatasetResults = (datsetid, pageIndex, pagestoLoad) => {
        let arrayData = [];
        let columns = [];

        //Load & extract dataset values
        const customDataset = dataset.load({ id: datsetid });
        const pagedData = customDataset.runPaged({ pageSize: 1000 });
        const totalPages = pagedData.pageRanges.length;

        //Compute custom pages where end users page size & dataset page size may differ
        //dataset page size is max 1000, which is currently being used
        //pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });

        const pagestoRun = pageIndex < (computedPages - 1) ? pagestoLoad : (totalPages % pagestoLoad == 0 ? pagestoLoad : totalPages % pagestoLoad);
        log.debug({ title: 'pagestoRun', details: pagestoRun });

        for (let i = 0; i < pagestoRun; i++) { //Loop to run through each computed pages
            log.debug({ title: 'current dataset page', details: parseInt(i + (pageIndex * pagestoLoad)) });
            let currentPage = pagedData.fetch(i + (pageIndex * pagestoLoad));
            let results = currentPage.data.results;

            //push columnname to the first index in array; will act as headers in sheets
            if (columns.length == 0 && pageIndex == 0) {
                columns = currentPage.data.columns.map((col) => col.label);
                arrayData.push(columns);
            }

            // Process all data rows
            const pageRows = results.map((result) =>
                result.values.map((value) => value.toString())
            );
            arrayData.push(...pageRows);
        }

        return {
            "dataset_name": customDataset.name,
            "type": customDataset.type,
            "total_rows": totalrows,
            "total_pages": computedPages,
            "pageindex_range": `0-${(computedPages - 1)}`,
            "current_pageindex": pageIndex,
            "data": arrayData
        };
    };

    /**
     * Retrieves saved search results from NetSuite.
     *
     * Loads a saved search based on the given ID, paginates the results using a page size of 1000,
     * computes custom pages based on the provided "pagestoLoad" parameter, and returns a metadata object
     * along with the retrieved data (formatted as a multidimensional array). Data rows are processed to
     * extract text values from search result arrays.
     *
     * @param {string} searchid - The ID of the saved search.
     * @param {number} pageIndex - The custom page index to fetch.
     * @param {number} pagestoLoad - The number of search pages to process per custom page.
     * @returns {Object} An object containing:
     *   - search_name: {string} The title of the search.
     *   - type: {string} The search type.
     *   - total_rows: {number} The total number of rows in the search.
     *   - total_pages: {number} The computed total number of custom pages.
     *   - pageindex_range: {string} A string representing the range of page indexes.
     *   - current_pageindex: {number} The current custom page index.
     *   - data: {Array[]} A multidimensional array of search result data (first row are headers).
     */
    const getSearchResults = (searchid, pageIndex, pagestoLoad) => {
        let arrayData = [];
        let columns = [];

        //Load & extract search values
        const customSearch = search.load({ id: searchid });
        const pagedData = customSearch.runPaged({ pageSize: 1000 });
        const totalPages = pagedData.pageRanges.length;

        //Compute custom pages where end users page size & search page size may differ
        //search page size is max 1000, which is currently being used
        //pagestoLoad to load is custom page size which sets the number of search pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });

        const pagestoRun = pageIndex < (computedPages - 1) ? pagestoLoad : (totalPages % pagestoLoad == 0 ? pagestoLoad : totalPages % pagestoLoad);
        log.debug({ title: 'pagestoRun', details: pagestoRun });

        for (let i = 0; i < pagestoRun; i++) { //Loop to run through each computed pages
            log.debug({ title: 'current search page index', details: parseInt(i + (pageIndex * pagestoLoad)) });
            let currentPage = pagedData.fetch(i + (pageIndex * pagestoLoad));

            //push columnname to the first index in array; will act as headers in sheets
            if (columns.length == 0 && pageIndex == 0) {
                columns = customSearch.columns.map((col) => col.label);
                arrayData.push(columns);
            }

            // Process all data rows
            let results = currentPage.data;

            const pageRows = JSON.parse(JSON.stringify(results)).map(record => {
                const { values } = record;
                return Object.entries(values).flatMap(([key, value]) => {
                    if (Array.isArray(value)) {
                        // Extract 'text' values from array of search results
                        return value.map(item => item.text || "");
                    }
                    return value;
                });
            });
            arrayData.push(...pageRows);
        }

        return {
            "search_name": customSearch.title,
            "type": customSearch.searchType,
            "total_rows": totalrows,
            "total_pages": computedPages,
            "pageindex_range": "0-" + (computedPages - 1),
            "current_pageindex": pageIndex,
            "data": arrayData
        };
    };

    return {
        get: get
    };
});
