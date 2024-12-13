import { PdfHandle } from "./pdfHandle.js"
import { initBuffers, initPositionBuffer, initTextureBuffer } from "./previewBuffer.js";
import { Shader } from "./previewShader.js";
import { createImageTexture, drawScene } from "./previewScene.js";
import { PreviewCanvas } from "./previewCanvas.js";

function mod(n, m) {
	return ((n % m) + m) % m;
}

class Preview  {

    constructor() {
        this.pdfHandle = new PdfHandle();
        this.isBW = true;
        this.curSide = 0;
        this.oldOrientation = false;
        this.newPageSize = false;
        this.pageSize = {x: -1, y: -1};
        this.isBW = true;
        this.curSide = 0;
        this.isVertical = true;
        this.pagesPerSide = 1;
        this.pageScaling = 2;
        this.waitForRender = false;

        this.canvasView = document.getElementById('the-canvas');
        this.gl = this.canvasView.getContext('webgl');
        var shader = new Shader(this.gl);
        this.prepProgramInfo = shader.getProgramInfo(this.gl, shader.PAGE);
        this.prepBuffers = initBuffers(this.gl, shader.PAGE);
        this.prevCanvas = new PreviewCanvas(this.canvasView, this.gl, shader);
    }

    loadPdf(url) {
        this.pdfHandle.loadPdf(url).then((numPages) => {

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
            this.newPageSize = true;
            this.makeAdjustedImage(true);
        });
    }

    async makeAdjustedImage(scale) {
        var start = Date.now();
    
        var pageIdx = this.pagesToPrint[this.curSide * this.pagesPerSide];
        var maxPagesPerSide = Math.min(this.maxPages - pageIdx, this.pagesPerSide);

        var images = new Array(maxPagesPerSide);
        this.waitForRender = true;
        for (let i = 0; i < maxPagesPerSide; i++) {
            var imgData = await this.pdfHandle.getPage(pageIdx + i);

            if (this.newPageSize) {
                this.pageSize = { x: imgData.width, y: imgData.height };
                this.newPageSize = false;

                this.prepBuffers.position = initPositionBuffer(this.gl, this.prepBuffers.position, true, this.pagesPerSide, this.pageScaling);
                this.prepBuffers.textureCoord = initTextureBuffer(this.gl, this.prepBuffers.textureCoord, this.pageSize, this.pageScaling);
            }
            images[i] = createImageTexture(this.gl, imgData);
        }
        this.waitForRender = false;

        var width = this.pageSize.x
        var height = this.pageSize.y;
        this.canvasView.width = width;
        this.canvasView.height = height;
        this.gl.viewport(0, 0, width, height);

        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        for (let i = 0; i < maxPagesPerSide; i++) {
            drawScene(this.gl, this.prepProgramInfo, images[i], this.prepBuffers, this.isBW, this.pageScaling, this.pagesPerSide, i);
        }

        for (let i = 0; i < maxPagesPerSide; i++) {
            this.gl.deleteTexture(images[i]);
        }
        if (scale) {
            var pixels = new Uint8Array(width * height * 4);
            this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
            this.prevCanvas.updateImg(pixels, width, height);
        }
        console.log(Date.now() - start);
    }

    async sendImages(filename, username) {
        for (let i = 0; i < this.maxSides; i++) {
            this.curSide = i;
            await this.makeAdjustedImage(false);

            await this.canvasView.toBlob((blob) => {
                let formData = new FormData();
                formData.append("file", blob, filename + "_" + username + "_" + i + ".jpg");
                $.ajax({url: "/print-img", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {}});
            }, "image/jpeg", 1);
        }
    }

    nextSide() {
        if (this.waitForRender) {
            return
        }
        this.curSide = mod(this.curSide + 1, this.maxSides);
        document.getElementById('pageNum').textContent = this.curSide + 1;
        this.makeAdjustedImage(true);
    }

    prevSide() {
        if (this.waitForRender) {
            return
        }
        this.curSide = mod(this.curSide - 1, this.maxSides);
        document.getElementById('pageNum').textContent = this.curSide + 1;
        this.makeAdjustedImage(true);
    }

    setPagesPerSide(num) {
        this.pagesPerSide = num;
        this.prepBuffers.position = initPositionBuffer(this.gl, this.prepBuffers.position, this.isVertical, num, this.pageScaling);
    }
    
    setPageScaling(num) {
        this.pageScaling = num;
        this.prepBuffers.position = initPositionBuffer(this.gl, this.prepBuffers.position, this.isVertical, this.pagesPerSide, num);
        this.prepBuffers.textureCoord = initTextureBuffer(this.gl, this.prepBuffers.textureCoord, this.pageSize, num);
    }

    setIsVertical(bool) {
        this.isVertical = bool;
        this.prepBuffers.position = initPositionBuffer(this.gl, this.prepBuffers.position, bool, this.pagesPerSide, this.pageScaling);
    }    
}

export { Preview };