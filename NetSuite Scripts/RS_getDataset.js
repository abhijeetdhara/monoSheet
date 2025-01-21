/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/dataset'], (dataset) => {
    const get = (context) => {
        try {
            const datsetid = context.datasetid;
            const pageIndex = parseInt(context.pageindex);
            const pagestoLoad = parseInt(context.pagestoload);

            //fetch data in multidimensional array; which can be directly pushed to sheets
            let data = getDataset(datsetid, pageIndex, pagestoLoad);

            return data;
        } catch (e) {
            log.error({
                title: 'error in get',
                details: JSON.stringify(e)
            });
            return e;
        }
    };

    const getDataset = (datsetid, pageIndex, pagestoLoad) => {
        let arrayData = [];
        let columns = [];

        //Load & extract dataset values
        const customDataset = dataset.load({
            id: datsetid
        });
        const pagedData = customDataset.runPaged({
            pageSize: 1000
        });
        const totalPages = pagedData.pageRanges.length;

        //Compute custom pages where end users page size & dataset page size may differ
        //datasetpage size is max 1000, which is currently being used
        //pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;
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

        const pagestoRun = pageIndex < (computedPages - 1) ? pagestoLoad : (totalPages % pagestoLoad == 0 ? pagestoLoad : totalPages % pagestoLoad);
        log.debug({
            title: 'pagestoRun',
            details: pagestoRun
        });

        for (let i = 0; i < pagestoRun; i++) { //Loop to run through each computed pages
            log.debug({
                title: 'current dataset page',
                title: parseInt(i + (pageIndex * pagestoLoad))
            });
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


    return {
        get: get
    };
});
