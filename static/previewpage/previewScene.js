function drawScene(gl, programInfo, image, buffers, isBW, pageScaling, pagesPerSide, idx) {
    
    setTextureAttribute(gl, buffers, programInfo);
    setPositionAttribute(gl, buffers, programInfo, idx);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(programInfo.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.uniform1i(programInfo.uniformLocations.preview, 0);
    gl.uniform1i(programInfo.uniformLocations.isBW, isBW ? 1 : 0);
    gl.uniform1i(programInfo.uniformLocations.pagesPerSide, pagesPerSide);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
}

function prepCanvasDraw(gl, programInfo, image, buffers) {
    setTextureAttribute(gl, buffers, programInfo);
    setPositionAttribute2(gl, buffers, programInfo);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    gl.useProgram(programInfo.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.uniform1i(programInfo.uniformLocations.preview, 0);
}

function canvasDraw(gl, programInfo, zoom, panX, panY) {
    gl.uniform1i(programInfo.uniformLocations.preview, 0);
    gl.uniform1f(programInfo.uniformLocations.zoom, zoom);
    gl.uniform2f(programInfo.uniformLocations.pan, panX, panY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function setPositionAttribute(gl, buffers, programInfo, idx) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position[idx]);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function setPositionAttribute2(gl, buffers, programInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function setTextureAttribute(gl, buffers, programInfo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
}

function createImageTexture(gl, imageData) {

    const tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, imageData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_FILTER, gl.NEAREST);
    return tex
}

function createImageTexture2(gl, imageData, width, height) {

    const tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_FILTER, gl.LINEAR);
    return tex
}

export { createImageTexture, createImageTexture2, drawScene, prepCanvasDraw, canvasDraw }