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

function setPositionAttribute(gl, buffers, programInfo, idx) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position[idx]);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return tex
}

export { createImageTexture, drawScene }