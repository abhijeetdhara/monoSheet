/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/dataset'], (dataset) => {
    const get = (context) => {
        try {
            const datsetid = context.datasetid; //dataset in NetSuite to be returned
            const pagestoLoad = context.pagestoLoad; //number of pages to prcoess the request
            return getDSMetadata(datsetid, pagestoLoad); //return the metadata
        } catch (e) {
            log.error({
                title: 'error in get()',
                details: JSON.stringify(e)
            });
            return e;
        }
    };

    const getDSMetadata = (datsetid, pagestoLoad) => {

        //Load & extract dataset values
        const report = dataset.load({
            id: datsetid
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
        log.debug({
            title: 'pagestoLoad',
            details: pagestoLoad
        });
        log.debug({
            title: 'totalPages',
            details: totalPages
        });
        log.debug({
            title: 'computedPages',
            details: computedPages
        });
        log.debug({
            title: 'totalrows',
            details: totalrows
        });

        return {
            "dataset_name": report.name,
            "type": report.type,
            "total_rows": totalrows,
            "total_pages": computedPages,
            "pageindex_range": `0-${(computedPages - 1)}`
        };
    };

    return {
        get: get
    };
});
