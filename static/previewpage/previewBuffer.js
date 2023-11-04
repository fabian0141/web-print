function initTextureBuffer(gl, oldTextureCoordBuffer, size, pageScaling) {

    var textureCoordinates = [];
    if (pageScaling == 2) {
        textureCoordinates = [
            0.0, 1.0, 
            1.0, 1.0, 
            1.0, 0.0, 
            0.0, 0.0];
    } else {
        var vertical = 842.0 / size.y;
        var horizontal = 595.0 / size.x;
    
        textureCoordinates = [
            0.0, 0.0 + vertical, 
            0.0 + horizontal, 0.0 + vertical, 
            0.0 + horizontal, 0.0, 
            0.0, 0.0];
    }

    var textureCoordBuffer = null;
    if (oldTextureCoordBuffer == null) {
        textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    } else {
        gl.deleteBuffer(oldTextureCoordBuffer);

        textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
    }

    return textureCoordBuffer;
}

function initIndexBuffer(gl) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    var indices = [0,1,2,0,2,3];

    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint8Array(indices),
        gl.STATIC_DRAW,
    );
    return indexBuffer;
}

function initPositionBuffer(gl, positionBuffer, isVertical, pagesPerSide, pageScaling) {
    // Create a buffer for the square's positions.
    var isVertical = true;
    var rotate = false;
    /*if (size.x > size.y) {
        isVertical = !isVertical;
    }*/

    var divVert = 1;
    var divHori = 1;
    if (pagesPerSide > 1) {
        switch (pagesPerSide) {
            case 2:
                divVert = 2;
                rotate = true;
                break;
            case 4:
                divVert = 2;
                divHori = 2;
                break;
            case 6:
                divVert = 3;
                divHori = 2;
                rotate = true;
                break;
            case 9:
                divVert = 3;
                divHori = 3;
                break;
            case 16:
                divVert = 4;
                divHori = 4;
                break;
        }
    }

    var positions = new Array(pagesPerSide);

    var topStart = 1.0;
    var bottomStart = 1.0;
    var leftStart = -1.0;
    var rightStart = -1.0;
    var area = 2.0;

    if (pageScaling == 1) {
        topStart = 0.9;
        bottomStart = 0.9;
        leftStart = -0.9;
        rightStart = -0.9;
        var area = 1.8;
    }

    for (let y = 0; y < divVert; y++) {
        for (let x = 0; x < divHori; x++) {
            var top = topStart - y * area / divVert;
            var bottom = bottomStart - (y + 1) * area / divVert;
            var left = leftStart + x * area / divHori;
            var right = rightStart + (x + 1) * area / divHori;

            if (rotate) {
                positions[y * divHori + x] = [
                    left, top, 0, 
                    left, bottom, 0,
                    right, bottom, 0,
                    right, top, 0];
            } else {
                positions[y * divHori + x] = [
                    left, bottom, 0, 
                    right, bottom, 0,
                    right, top, 0,
                    left, top, 0];
            }
        }
    }

    for (let i = 0; i < pagesPerSide; i++) {
        if (positionBuffer[i] == null) {
            positionBuffer[i] = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer[i]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions[i]), gl.STATIC_DRAW);
    }
    return positionBuffer;
}

function initBuffers(gl) {
    const indexBuffer = initIndexBuffer(gl);

    return {
        position: (new Array(16)).fill(null),
        textureCoord: null,
        indices: indexBuffer,
    };
}

export { initBuffers, initPositionBuffer, initTextureBuffer };
