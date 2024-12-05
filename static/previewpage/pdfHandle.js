class PdfHandle {

    constructor() {

        this.pdfDoc = null
        this.pageNum = 0
        this.scale = 2


        var { pdfjsLib } = globalThis;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/library/pdf.worker.js';

        this.loadingCanvas = document.getElementById('pdf-loading-canvas'),
        this.loadingCtx = this.loadingCanvas.getContext('2d', {willReadFrequently: true});
    }

    loadPdf(url) {
        return new Promise((numPages) =>
            pdfjsLib.getDocument(url).promise.then((pdfDoc_) => {
            this.bufferedImages = new Array(numPages);
            this.bufferedImages.fill(null);
            this.pdfDoc = pdfDoc_;
            numPages(this.pdfDoc.numPages);
        }));
    }

    getPage(num) {
        var promise = new Promise(async resolve => {
            if (this.bufferedImages[num] == null) {
                await this.renderPage(num);
            }

            var img = new Image();
            img.onload = () => {
                this.loadingCanvas.width = img.width;
                this.loadingCanvas.height = img.height;
                this.loadingCtx.drawImage(img, 0, 0, img.width, img.height);
                console.log(img.width + " " + img.height);

                resolve(img)
            }
            img.src = this.bufferedImages[num];
        })

        return promise;
    }

    /**
     * Get page info from document, resize canvas accordingly, and render page.
     * @param num Page number.
     */
    async renderPage(num) {

        var page = await this.pdfDoc.getPage(num+1)
        var viewport = page.getViewport({scale: this.scale});

        this.loadingCanvas.height = viewport.height;
        this.loadingCanvas.width = viewport.width;



        var renderContext = {
            canvasContext: this.loadingCtx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        
        this.bufferedImages[num] = this.loadingCanvas.toDataURL("image/jpeg", 1);
    }
}

export { PdfHandle }