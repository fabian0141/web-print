import { Vec3 } from "./vec.js";

function resize(factor, imgData) {
    var newWidth = Math.floor(imgData.width / factor);
    var newHeight = Math.floor(imgData.height / factor);

    var tilesImage = new ImageData(newWidth, newHeight);
    for (var x = 0; x < newWidth; x++) {
        for (var y = 0; y < newHeight; y++) {
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

function scalePage(imgData, pageScaling) {
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

    for (var x = 0; x < newWidth; x++) {
        for (var y = 0; y < newHeight; y++) {
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
    console.log(tilesImage);
    return tilesImage;
}

async function combinePages(imgData, widthTiles, heightTiles, resizeFactor, pagesToPrint, idx, maxPages, pageScaling, getPage) {
    var pageIdx = pagesToPrint[idx];
    
    var offsetX = 0;
    var offsetY = 0;
    if (widthTiles == 3 && heightTiles == 2) {
        if (imgData.width >= imgData.height) {
            offsetX = 572;
        } else {
            offsetY = 210;
        }
    }


    for (var i = 0; i < heightTiles; i++) {
        for (var j = 0; j < widthTiles; j++) {
            if (idx >= maxPages) {
                continue;
            }

            var page = await getPage(pageIdx);
            var scaledImage = scalePage(page, pageScaling);

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
            
            for (var x = 0; x < tilesImage.width * 4 && x  <= maxWidth * 4; x += 4) {
                for (var y = 0; y < tilesImage.height && y  <= maxHeight; y++) {
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

export { scalePage, combinePages }