class PdfHandle {



    constructor() {

        this.pdfDoc = null
        this.pageNum = 0
        this.pageRendering = false
        this.pageNumPending = null
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
        if (this.bufferedImages[num] == null) {
            return this.renderPage(num);
        }

        var promise = new Promise(resolve => {
            var img = new Image();
            img.onload = () => {
                this.loadingCanvas.width = img.width;
                this.loadingCanvas.height = img.height;
                this.loadingCtx.drawImage(img, 0, 0, img.width, img.height);

                resolve(this.loadingCtx.getImageData(0, 0, this.loadingCanvas.width, this.loadingCanvas.height))
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
        this.pageRendering = true;
        while(window.performance.memory.jsHeapSizeLimit - 200000000 < window.performance.memory.usedJSHeapSize) {
            bufferedImages[oldestLoadedImage] = null
            oldestLoadedImage = (oldestLoadedImage + 1) % bufferedImages.length;
        }

        var page = await this.pdfDoc.getPage(num+1)
        var viewport = page.getViewport({scale: this.scale});
        console.log(viewport.height)
        console.log(viewport.width)

        this.loadingCanvas.height = viewport.height;
        this.loadingCanvas.width = viewport.width;



        var renderContext = {
            canvasContext: this.loadingCtx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        
        this.bufferedImages[num] = this.loadingCanvas.toDataURL("image/jpeg", 0.5);

        this.pageRendering = false;
        if (this.pageNumPending !== null) {
            renderPage(this.pageNumPending);
            this.pageNumPending = null;
        }
        return this.loadingCtx.getImageData(0, 0, this.loadingCanvas.width, this.loadingCanvas.height);

    }

    /**
     * If another page rendering in progress, waits until the rendering is
     * finised. Otherwise, executes rendering immediately.
     */
    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            renderPage(num);
        }
    }
}

export { PdfHandle }