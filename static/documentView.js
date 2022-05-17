
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
var curSide = 0;
var maxSides = 0;

function setBW(bw) {
	isBW = bw;
    makeAdjustedImage();
}

function setTiles() {
    pagesPerSide = parseInt($('#pagespersheet').val());
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

function addTiledImage(tilesImage, oldData, widthTiles, heightTiles) {
    var imgData;
    if (oldData.width > oldData.height) {
        var tmp = widthTiles;
        widthTiles = heightTiles;
        heightTiles = tmp;
    }
    
    if (widthTiles == heightTiles) {
        imgData = new ImageData(oldData.width, oldData.height);
    } else {
        imgData = new ImageData(oldData.height, oldData.width);
        isVertical = !isVertical;
    }

    for (x = 0; x < tilesImage.width * 4; x += 4) {
        for (y = 0; y < tilesImage.height; y++) {
            for (i = 0; i < widthTiles; i++) {
                for (j = 0; j < heightTiles; j++) {
                    var pos = x + i * tilesImage.width * 4 + (y + j * tilesImage.height) * imgData.width * 4;
                    var oldPos = x + y * tilesImage.width * 4;

                    imgData.data[pos] = tilesImage.data[oldPos]
                    imgData.data[pos + 1] = tilesImage.data[oldPos + 1]
                    imgData.data[pos + 2] = tilesImage.data[oldPos + 2]
                    imgData.data[pos + 3] = tilesImage.data[oldPos + 3]
                }
            }
        }
    }
    return imgData;
}

async function combinePages(widthTiles, heightTiles, resizeFactor, changeOrientation) {
    pageIdx = curSide * pagesPerSide;
    var imgData;
    if (changeOrientation) {
        isVertical = !isVertical;
        console.log("change orientation");
        imgData = new ImageData(bufferedImages[pageIdx].height, bufferedImages[pageIdx].width);
    } else {
        imgData = new ImageData(bufferedImages[pageIdx].width, bufferedImages[pageIdx].height);
    }
    oldOrientation = changeOrientation;

    for (i = 0; i < heightTiles; i++) {
        for (j = 0; j < widthTiles; j++) {
            if (bufferedImages[pageIdx] == null) {
                await renderPage(pageIdx);
            }
            var tilesImage;
            if (resizeFactor == 1) {
                var tilesImage = new ImageData(
                    new Uint8ClampedArray(bufferedImages[pageIdx].data),
                    bufferedImages[pageIdx].width,
                    bufferedImages[pageIdx].height)
            } else {
                tilesImage = resize(resizeFactor, bufferedImages[pageIdx])
            }
            
            for (x = 0; x < tilesImage.width * 4; x += 4) {
                for (y = 0; y < tilesImage.height; y++) {
                    var pos = x + j * tilesImage.width * 4 + (y + i * tilesImage.height) * imgData.width * 4;
                    var oldPos = x + y * tilesImage.width * 4;

                    imgData.data[pos] = tilesImage.data[oldPos];
                    imgData.data[pos + 1] = tilesImage.data[oldPos + 1];
                    imgData.data[pos + 2] = tilesImage.data[oldPos + 2];
                    imgData.data[pos + 3] = tilesImage.data[oldPos + 3];
                }
            }
            pageIdx++;
        }
    }
    return imgData;
}

async function makeAdjustedImage() {
    pageIdx = curSide * pagesPerSide;

    if (bufferedImages[pageIdx] == null) {
        await renderPage(pageIdx);
    }

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
    }

    if (isBW) {
        for (i = 0; i < imgData.data.length; i += 4) {
            let grayscale = 0.3 * imgData.data[i] + 0.6 * imgData.data[i + 1] + 0.1 * imgData.data[i + 2];
          
            imgData.data[i] = grayscale;
            imgData.data[i + 1] = grayscale;
            imgData.data[i + 2] = grayscale;
            imgData.data[i + 3] = 255;
        }
    }

    console.log(isVertical + " " + oldIsVertical + " " + canvas.width + " " + canvas.height);

    if (isVertical && canvas.width > canvas.height) {
        var tmp = canvas.width;
        canvas.width = canvas.height;
        canvas.height = tmp;
    } else if (!isVertical && canvas.width < canvas.height) {
        var tmp = canvas.width;
        canvas.width = canvas.height;
        canvas.height = tmp;
    }
    ctx.putImageData(imgData, 0, 0);
}

class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}