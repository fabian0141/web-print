//window.performance.memory
var isBW = true;
var isVertical = false;
var resolution ;
var addBorder = false;
var fitA3 = false;
var pagesPerSide = 1;
var pdfImage;
var isVertical = true;
var oldIsVertical = true;
var oldOrientation = false;
var bufferedImages;
var oldestLoadedImage = 0; 
var curSide = 0;
var maxSides = 0;
var maxPages = 0;
var pageScaling = 0;

function setBW(self, bw) {
    if (!self.enabled || bw & isBW) {
        return;
    }
	isBW = bw;
    makeAdjustedImage();
}

function setPageScaling(ps) {
	pageScaling = ps;
    makeAdjustedImage();
}

function setTiles() {
    pagesPerSide = parseInt($('#pagespersheet').val());

    curSide = 0;
    maxSides = Math.ceil(maxPages / pagesPerSide);
    document.getElementById('pageCount').textContent = maxSides;
    document.getElementById('pageNum').textContent = 1;
    makeAdjustedImage();
}

function resize(factor, imgData) {
    var newWidth = Math.floor(imgData.width / factor);
    var newHeight = Math.floor(imgData.height / factor);

    var tilesImage = new ImageData(newWidth, newHeight);
    for (x = 0; x < newWidth; x++) {
        for (y = 0; y < newHeight; y++) {
            var pos = (x + y * newWidth) * 4;

            var xFactor = x * factor;
            var xFactorF = Math.floor(xFactor);

            var yFactor = y * factor;
            var yFactorF = Math.floor(yFactor);
            
            //bilinear interpolation algorithm
            var point1 = xFactorF * 4 + yFactorF * imgData.width * 4;
            var point2 = point1 + 4;
            var point3 = xFactorF * 4 + (yFactorF + 1) * imgData.width * 4;
            var point4 = point3 + 4;

            var weight1 = 1 - (xFactor - xFactorF);
            var weight2 = 1 - (yFactor - yFactorF);


            var p1 = new Vec3(imgData.data[point1] * weight1 + imgData.data[point2] * (1 - weight1),
                imgData.data[point1 + 1] * weight1 + imgData.data[point2 + 1] * (1 - weight1),
                imgData.data[point1 + 2] * weight1 + imgData.data[point2 + 2] * (1 - weight1));

            var p2 = new Vec3(imgData.data[point3] * weight1 + imgData.data[point4] * (1 - weight1),
                imgData.data[point3 + 1] * weight1 + imgData.data[point4 + 1] * (1 - weight1),
                imgData.data[point3 + 2] * weight1 + imgData.data[point4 + 2] * (1 - weight1));

            var color = new Vec3(p1.x * weight2 + p2.x * (1 - weight2),
                p1.y * weight2 + p2.y * (1 - weight2),
                p1.z * weight2 + p2.z * (1 - weight2));


            tilesImage.data[pos] = color.x;
            tilesImage.data[pos + 1] = color.y;
            tilesImage.data[pos + 2] = color.z;
            tilesImage.data[pos + 3] = 255;
        }
    }
    return tilesImage;
}

function scalePage(imgData) {
    console.log(pageScaling);
    if (pageScaling == 0) {
        return imgData;
    }
    var newHeight = imgData.width <= imgData.height ? 1683 : 1190;
    var newWidth = imgData.width <= imgData.height ? 1190 : 1683;
    var tilesImage = new ImageData(newWidth, newHeight);
    var offsetX = 0;
    var offsetY = 0;
    
    if (pageScaling == 1) {
        var tilesWidth = tilesImage.width * 4; 
        for (x = 0; x < tilesWidth; x += 4) {
            for (y = 0; y < tilesImage.height; y++) {
                var pos = x + (y * tilesImage.width * 4)
                tilesImage.data[pos] = 255;
                tilesImage.data[pos + 1] = 255;
                tilesImage.data[pos + 2] = 255;
                tilesImage.data[pos + 3] = 1;
            }
        }

        newWidth = Math.floor(newWidth * 0.95);
        newHeight = Math.floor(newHeight * 0.95);
        offsetX = Math.ceil(newWidth * 0.025);
        offsetY = Math.ceil(newHeight * 0.025);
    }


    var factor = imgData.width / newWidth;
    if (Math.abs(1 - factor) < 0.001) {
        return imgData;
    }

    for (x = 0; x < newWidth; x++) {
        for (y = 0; y < newHeight; y++) {
            var pos = (x + offsetX + (y + offsetY) * tilesImage.width) * 4;

            var xFactor = x * factor;
            var xFactorF = Math.floor(xFactor);

            var yFactor = y * factor;
            var yFactorF = Math.floor(yFactor);
            
            //bilinear interpolation algorithm
            var point1 = xFactorF * 4 + yFactorF * imgData.width * 4;
            var point2 = point1 + 4;
            var point3 = xFactorF * 4 + (yFactorF + 1) * imgData.width * 4;
            var point4 = point3 + 4;

            var weight1 = 1 - (xFactor - xFactorF);
            var weight2 = 1 - (yFactor - yFactorF);


            var p1 = new Vec3(imgData.data[point1] * weight1 + imgData.data[point2] * (1 - weight1),
                imgData.data[point1 + 1] * weight1 + imgData.data[point2 + 1] * (1 - weight1),
                imgData.data[point1 + 2] * weight1 + imgData.data[point2 + 2] * (1 - weight1));

            var p2 = new Vec3(imgData.data[point3] * weight1 + imgData.data[point4] * (1 - weight1),
                imgData.data[point3 + 1] * weight1 + imgData.data[point4 + 1] * (1 - weight1),
                imgData.data[point3 + 2] * weight1 + imgData.data[point4 + 2] * (1 - weight1));

            var color = new Vec3(p1.x * weight2 + p2.x * (1 - weight2),
                p1.y * weight2 + p2.y * (1 - weight2),
                p1.z * weight2 + p2.z * (1 - weight2));


            tilesImage.data[pos] = color.x;
            tilesImage.data[pos + 1] = color.y;
            tilesImage.data[pos + 2] = color.z;
            tilesImage.data[pos + 3] = 255;
        }
    }
    return tilesImage;
}

async function combinePages(widthTiles, heightTiles, resizeFactor, changeOrientation) {
    idx = curSide * pagesPerSide;
    pageIdx = pagesToPrint[idx];
    var imgData;
    if (changeOrientation) {
        isVertical = !isVertical;
        imgData = new ImageData(canvasView.height, canvasView.width);
    } else {
        imgData = new ImageData(canvasView.width, canvasView.height);
    }
    for (x = 0; x < imgData.width * 4; x += 4) {
        for (y = 0; y < imgData.height; y++) {
            imgData.data[x + (y * imgData.width * 4)] = 255;
            imgData.data[x + (y * imgData.width * 4) + 1] = 255;
            imgData.data[x + (y * imgData.width * 4) + 2] = 255;
            imgData.data[x + (y * imgData.width * 4) + 3] = 1;
        }
    }

    oldOrientation = changeOrientation;
    var offsetX = 0;
    var offsetY = 0;
    if (widthTiles == 3 && heightTiles == 2) {
        if (imgData.width >= imgData.height) {
            offsetX = 572;
        } else {
            offsetY = 210;
        }
    }


    for (i = 0; i < heightTiles; i++) {
        for (j = 0; j < widthTiles; j++) {
            if (idx >= maxPages) {
                continue;
            }

            if (bufferedImages[pageIdx] == null) {
                await renderPage(pageIdx);
            }

            var scaledImage = scalePage(bufferedImages[pageIdx]);

            var tilesImage;
            if (resizeFactor == 1) {
                var tilesImage = new ImageData(
                    new Uint8ClampedArray(scaledImage.data),
                    scaledImage.width,
                    scaledImage.height)
            } else {
                tilesImage = resize(resizeFactor, scaledImage)
            }

            var maxWidth = Math.floor((tilesImage.width <= tilesImage.height ? 1190 : 1683) / resizeFactor);
            var maxHeight = Math.floor((tilesImage.width <= tilesImage.height ? 1683 : 1190) / resizeFactor);
            
            for (x = 0; x < tilesImage.width * 4 && x  <= maxWidth * 4; x += 4) {
                for (y = 0; y < tilesImage.height && y  <= maxHeight; y++) {
                    var pos = offsetX + x + (y + offsetY) * imgData.width * 4 + j * maxWidth * 4 + i * maxHeight * imgData.width * 4;
                    var oldPos = x + y * tilesImage.width * 4;

                    imgData.data[pos] = tilesImage.data[oldPos];
                    imgData.data[pos + 1] = tilesImage.data[oldPos + 1];
                    imgData.data[pos + 2] = tilesImage.data[oldPos + 2];
                    imgData.data[pos + 3] = tilesImage.data[oldPos + 3];
                }
            }
            pageIdx = pagesToPrint[++idx];
        }
    }
    return imgData;
}

async function makeAdjustedImage() {
    var start = Date.now();

    pageIdx = pagesToPrint[curSide * pagesPerSide];

    if (bufferedImages[pageIdx] == null) {
        await renderPage(pageIdx);
    }

    var start1 = Date.now();


    isVertical = bufferedImages[pageIdx].height > bufferedImages[pageIdx].width;

    var imgData = new ImageData(
        new Uint8ClampedArray(bufferedImages[pageIdx].data),
        bufferedImages[pageIdx].width,
        bufferedImages[pageIdx].height);

    if (pagesPerSide != 1) {
        switch (pagesPerSide) {
            case 2:
                imgData = await combinePages(2,1, 1.42, true);
                break;
            case 4:
                imgData = await combinePages(2,2, 2, false);
                break;
            case 6:
                imgData = await combinePages(3,2, 2.83, true);
                break;
            case 9:
                imgData = await combinePages(3,3, 3, false);
                break;
            case 16:
                imgData = await combinePages(4,4, 4, false);
                break;
        }
    } else {
        imgData = scalePage(imgData);
    }
    var start2 = Date.now();


    if (isBW) {
        var imageWidth = imgData.data.length;
        for (i = 0; i < imageWidth; i += 4) {
            let grayscale = 0.3 * imgData.data[i] + 0.6 * imgData.data[i + 1] + 0.1 * imgData.data[i + 2];
          
            imgData.data[i] = grayscale;
            imgData.data[i + 1] = grayscale;
            imgData.data[i + 2] = grayscale;
            imgData.data[i + 3] = 255;
        }
    }

    var start3 = Date.now();


    if (isVertical && canvasView.width > canvasView.height) {
        var tmp = canvasView.width;
        canvasView.width = canvasView.height;
        canvasView.height = tmp;
    } else if (!isVertical && canvasView.width < canvasView.height) {
        var tmp = canvasView.width;
        canvasView.width = canvasView.height;
        canvasView.height = tmp;
    }
    ctxView.putImageData(imgData, 0, 0);
    
    alert((start1 - start) + "\n"
         + (start2 - start1) + "\n"
         + (start3 - start2) + "\n"
         + (Date.now() - start3) + "\n"
         + (window.performance.memory.usedJSHeapSize / 1000000.0));
}

class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}