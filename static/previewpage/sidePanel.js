
class SidePanel {
    getPagesToPrint(pageSelection, numPages) {
        var pagesToPrint = new Array();

        if (pageSelection == "") {
            for (var i = 0; i < numPages; i++) {
                pagesToPrint[i] = i;
            }
        } else {
            var pagesIdx = 0;
            var pageRanges = pageSelection.split(',');
        
            for (var i = 0; i < pageRanges.length; i++) {
                var minMax = pageRanges[i].split('-');
                if (minMax.length == 1) {
                    pagesToPrint[pagesIdx++] = parseInt(minMax[0]) - 1;
                } else {
                    for (var j = parseInt(minMax[0]); j <= parseInt(minMax[1]); j++) {
                        pagesToPrint[pagesIdx++] = j - 1;
                    }
                }
            }
        }

        return pagesToPrint
    }

    updatePageSelector(maxSides) {
        document.getElementById('pageCount').textContent = maxSides;
        document.getElementById('pageNum').textContent = 1;
    }
}

export { SidePanel };