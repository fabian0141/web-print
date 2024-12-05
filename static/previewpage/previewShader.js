
class Shader {


    vsPrep = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        varying highp vec2 vTextureCoord;

        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;

    fsPrep = `
        varying highp vec2 vTextureCoord;
        uniform sampler2D preview;
        uniform int isBW;
        uniform int pagesPerSide;

        void main(void) {
            if (0.0 > vTextureCoord.x || vTextureCoord.x > 1.0 || 0.0 > vTextureCoord.y || vTextureCoord.y > 1.0) {
                gl_FragColor = vec4(1.0);
                return;
            }

            highp vec4 col = texture2D(preview, vTextureCoord);
            if (isBW == 1) {
                highp float grey = dot(vec3(0.3, 0.6, 0.1), col.xyz);
                gl_FragColor = vec4(vec3(grey), 1.0);
            } else {
                gl_FragColor = col;
            }

        }
    `;

    vsCanv = `
        attribute vec2 aVertexPosition;
        attribute vec2 aTextureCoord;
        uniform float zoom;
        uniform vec2 pan;

        varying vec2 vTexCoord;

        void main() {
            vec2 position = zoom * aVertexPosition + pan;
            gl_Position = vec4(position, 0, 1);
            vTexCoord = aTextureCoord;
        }
    `;

    fsCanv = `
        precision mediump float;
        varying vec2 vTexCoord;
        uniform sampler2D uTexture;

        void main() {
            gl_FragColor = texture2D(uTexture, vTexCoord);
            //gl_FragColor = vec4(0,0,0,1);
        }
    `;

    constructor(gl) {
        this.shaderPageProgram = this.initShaderProgram(gl, this.vsPrep, this.fsPrep);
        this.shaderCanvasProgram = this.initShaderProgram(gl, this.vsCanv, this.fsCanv);
        this.PAGE = 0;
        this.CANVAS = 1;
    }

    getProgramInfo(gl, type) {
        switch (type) {
            case this.PAGE:
                return {
                    program: this.shaderPageProgram,
                    attribLocations: {
                        vertexPosition: gl.getAttribLocation(this.shaderPageProgram, "aVertexPosition"),
                        textureCoord: gl.getAttribLocation(this.shaderPageProgram, "aTextureCoord"),
                    },
                    uniformLocations: {
                        preview: gl.getUniformLocation(this.shaderPageProgram, "preview"),
                        isBW: gl.getUniformLocation(this.shaderPageProgram, "isBW"),
                        pagesPerSide: gl.getUniformLocation(this.shaderPageProgram, "pagesPerSide")
                    }
                };
            case this.CANVAS:
                return {
                    program: this.shaderCanvasProgram,
                    attribLocations: {
                        vertexPosition: gl.getAttribLocation(this.shaderCanvasProgram, "aVertexPosition"),
                        textureCoord: gl.getAttribLocation(this.shaderCanvasProgram, "aTextureCoord"),
                    },
                    uniformLocations: {
                        preview: gl.getUniformLocation(this.shaderCanvasProgram, "uTexture"), 
                        zoom: gl.getUniformLocation(this.shaderCanvasProgram, "zoom"),
                        pan: gl.getUniformLocation(this.shaderCanvasProgram, "pan"),       
                    }
                };
        }

    }

    initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
    
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert(
                `Unable to initialize the shader program: ${gl.getProgramInfoLog(
                    shaderProgram,
                )}`,
            );
            return null;
        }
        return shaderProgram;
    }
    
    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
    
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(
                `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
            );
            gl.deleteShader(shader);
            return null;
        }
    
        return shader;
    }
}

export { Shader };