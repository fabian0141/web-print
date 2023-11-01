import { PdfHandle } from "./pdfHandle.js"
import { scalePage, combinePages } from "./modifyImage.js";

function mod(n, m) {
	return ((n % m) + m) % m;
}

class Preview  {

    constructor() {
        this.pdfHandle = new PdfHandle();
        this.pagesPerSide = 1;
        this.pageScaling = 0;
        this.isBW = true;
        this.curSide = 0;
        this.oldOrientation = false;


        this.canvasView = document.getElementById('the-canvas');
        this.ctxView = this.canvasView.getContext('2d');
    }

    loadPdf(url) {
        this.pdfHandle.loadPdf(url).then((numPages) => {
            console.log(numPages);

            document.getElementById('pageCount').textContent = numPages;
            document.getElementById('pageNum').textContent = 1;
            this.curSide = 0;
            this.maxPages = numPages;
            this.maxSides = this.maxPages;
            this.numPages = numPages;

            this.pagesToPrint = new Array();
            for (var i = 0; i < numPages; i++) {
                this.pagesToPrint[i] = i;
            }

            // Initial/first page rendering
            document.getElementById("pages").value = "";
            this.pageNum = 0;
            this.makeAdjustedImage();
        });
    }

    async makeAdjustedImage() {
        console.log(this.isBW)
        var start = Date.now();
    
        var pageIdx = this.pagesToPrint[this.curSide * this.pagesPerSide];
        var imgData = await this.pdfHandle.getPage(pageIdx);
        imgData = new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height);
    
        if (imgData.height >= imgData.width) {
            this.canvasView.width = 1190;
            this.canvasView.height = 1683;
        } else {
            this.canvasView.width = 1683;
            this.canvasView.height = 1190;
        }
    
        var start1 = Date.now();
    
        if (this.pagesPerSide != 1) {
            switch (this.pagesPerSide) {
                case 2:
                    imgData = await this.combPages(2, 1, 1.42, true, pageIdx);

                    break;
                case 4:
                    imgData = await this.combPages(2, 2, 2, false, pageIdx);
                    break;
                case 6:
                    imgData = await this.combPages(3, 2, 2.83, true, pageIdx);
                    break;
                case 9:
                    imgData = await this.combPages(3, 3, 3, false, pageIdx);
                    break;
                case 16:
                    imgData = await this.combPages(4, 4, 4, false, pageIdx);
                    break;
            }
        } else {
            imgData = scalePage(imgData, this.pageScaling);
        }
        var start2 = Date.now();
    
    
        if (this.isBW) {
            var imageWidth = imgData.data.length;
            for (var i = 0; i < imageWidth; i += 4) {
                let grayscale = 0.3 * imgData.data[i] + 0.6 * imgData.data[i + 1] + 0.1 * imgData.data[i + 2];
              
                imgData.data[i] = grayscale;
                imgData.data[i + 1] = grayscale;
                imgData.data[i + 2] = grayscale;
                imgData.data[i + 3] = 255;
            }
        }
    
        var start3 = Date.now();
        var isVertical = imgData.height > imgData.width;

    
        if (isVertical && this.canvasView.width > this.canvasView.height) {
            var tmp = this.canvasView.width;
            this.canvasView.width = this.canvasView.height;
            this.canvasView.height = tmp;
        } else if (!isVertical && this.canvasView.width < this.canvasView.height) {
            var tmp = this.canvasView.width;
            this.canvasView.width = this.canvasView.height;
            this.canvasView.height = tmp;
        }
        this.ctxView.putImageData(imgData, 0, 0);
        
        /*alert((start1 - start) + "\n"
             + (start2 - start1) + "\n"
             + (start3 - start2) + "\n"
             + (Date.now() - start3) + "\n"
             + (window.performance.memory.usedJSHeapSize / 1000000.0));*/
        //console.log(window.performance.memory.usedJSHeapSize / 1000000.0);
        console.log((start1 - start) + "\n"
            + (start2 - start1) + "\n"
            + (start3 - start2) + "\n"
            + (Date.now() - start3) + "\n"
            + (window.performance.memory.usedJSHeapSize / 1000000.0));
    }

    nextSide() {
        console.log(this.curSide, this.maxSides);

        this.curSide = mod(this.curSide + 1, this.maxSides);
        document.getElementById('pageNum').textContent = this.curSide + 1;
        console.log(this.curSide);
        this.makeAdjustedImage();
    }

    prevSide() {
        this.curSide = mod(this.curSide - 1, this.maxSides);
        document.getElementById('pageNum').textContent = this.curSide + 1;
        this.makeAdjustedImage();
    }

    combPages(widthTiles, heightTiles, resizeFactor, changeOrientation, idx) {
        var imgData;
        if (changeOrientation) {
            this.isVertical = !this.isVertical;
            imgData = new ImageData(this.canvasView.height, this.canvasView.width);
        } else {
            imgData = new ImageData(this.canvasView.width, this.canvasView.height);
        }
        for (var x = 0; x < imgData.width * 4; x += 4) {
            for (var y = 0; y < imgData.height; y++) {
                imgData.data[x + (y * imgData.width * 4)] = 255;
                imgData.data[x + (y * imgData.width * 4) + 1] = 255;
                imgData.data[x + (y * imgData.width * 4) + 2] = 255;
                imgData.data[x + (y * imgData.width * 4) + 3] = 1;
            }
        }
    
        this.oldOrientation = changeOrientation;

        return combinePages(imgData, widthTiles, heightTiles, resizeFactor, this.pagesToPrint, idx, this.maxPages, this.pageScaling, (pageIdx) => { return this.pdfHandle.getPage(pageIdx) });
    }
}

export { Preview };