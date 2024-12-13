import { initBuffers } from "./previewBuffer.js";
import { createImageTexture2, prepCanvasDraw, canvasDraw } from "./previewScene.js";


class PreviewCanvas {
    constructor(canvas, gl, shader) {
        this.area = $("#pdfArea");
        this.canvas = canvas;
        this.gl = gl;
        this.image = null;
        this.programInfo = shader.getProgramInfo(this.gl, shader.CANVAS);
        this.buffers = initBuffers(this.gl, shader.CANVAS);

        // Initialize variables
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.width = 0;
        this.height = 0;

        this.lastTouchDistance = null;
        this.isScaling = false;

        // Bind methods
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Attach event listeners
        canvas.addEventListener('wheel', this.handleWheel);
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('mouseup', this.handleMouseUp);
        canvas.addEventListener('mouseleave', this.handleMouseUp);
        canvas.addEventListener('touchstart', this.handleTouchStart);
        canvas.addEventListener('touchmove', this.handleTouchMove);
        canvas.addEventListener('touchend', this.handleTouchEnd);
    }

    updateImg(pixels, width, height) {
        const areaWidth = parseInt(this.area.width());
        const areaHeight = parseInt(this.area.height());

        this.gl.clearColor(0.9, 0.9, 0.9, 1.0);
        this.gl.viewport(0, 0, areaWidth, areaHeight);
        this.image = createImageTexture2(this.gl, pixels, width, height);
        this.canvas.width = areaWidth;
        this.canvas.height = areaHeight;
        this.width = areaWidth;
        this.height = areaHeight;
        const ratio = (this.area.height() / this.area.width()) / (height / width);
        prepCanvasDraw(this.gl, this.programInfo, this.image, this.buffers, ratio);
        this.update();
        //this.gl.deleteTexture(this.image);
    }

    update() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        canvasDraw(this.gl, this.programInfo, this.zoom, this.offsetX, this.offsetY);
        //console.log(this.zoom, this.offsetX, this.offsetY);
    }

    handleWheel(event) {
        event.preventDefault();
        const mouseX = ((event.offsetX / this.width) * 2 - 1);
        const mouseY = -((event.offsetY / this.height) * 2 - 1);

        const newScale = Math.exp(-event.deltaY * 0.001);

        const newZoom = this.zoom * newScale;
        if (newZoom < 0.8 || newZoom > 10) {
            return;
        }
        this.zoom = newZoom;
        this.offsetX = mouseX - newScale * (mouseX - this.offsetX);
        this.offsetY = mouseY - newScale * (mouseY - this.offsetY);

        console.log(mouseX, mouseY, this.zoom, this.offsetX, this.offsetY);

        this.update();
    }

    handleMouseDown(event) {
        this.isDragging = true;
        this.lastX = event.clientX;
        this.lastY = event.clientY;
    }

    handleMouseMove(event) {
        if (!this.isDragging) return;

        const dx = (event.clientX - this.lastX) / this.width * 2;
        const dy = (event.clientY - this.lastY) / this.height * 2;

        const newOffsetX = this.offsetX + dx;
        const newOffsetY = this.offsetY - dy;
        //console.log(newOffsetX, newOffsetY);

        if (newOffsetX - this.zoom > 1 || newOffsetX + this.zoom < -1 || newOffsetY - this.zoom > 1 || newOffsetY + this.zoom < -1) {
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            return;
        }

        this.offsetX = newOffsetX;
        this.offsetY = newOffsetY;

        this.lastX = event.clientX;
        this.lastY = event.clientY;

        this.update();
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleTouchStart(event) {
        if (event.touches.length === 1) {
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;
        } else if (event.touches.length === 2) {
            this.lastTouchDistance = this.getTouchDistance(event.touches);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            if (this.isScaling) return;

            const dx = (event.touches[0].clientX - this.lastX) / this.width * 2;
            const dy = (event.touches[0].clientY - this.lastY) / this.height * 2;
    
            const newOffsetX = this.offsetX + dx;
            const newOffsetY = this.offsetY - dy;
            //console.log(newOffsetX, newOffsetY, dx, dy, event.touches, this.width, this.height);
    
            if (newOffsetX - this.zoom > 1 || newOffsetX + this.zoom < -1 || newOffsetY - this.zoom > 1 || newOffsetY + this.zoom < -1) {
                this.lastX = event.touches[0].clientX;
                this.lastY = event.touches[0].clientY;
                return;
            }
    
            this.offsetX = newOffsetX;
            this.offsetY = newOffsetY;
    
            this.lastX = event.touches[0].clientX;
            this.lastY = event.touches[0].clientY;

            this.update();
        } else if (event.touches.length === 2) {
            const currentDistance = this.getTouchDistance(event.touches);

            if (this.lastTouchDistance) {
                this.isScaling = true;

                const elemOffset = this.area.offset();
                const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2 - elemOffset.left;
                const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2 - elemOffset.top;

                const mouseX = ((centerX / this.width) * 2 - 1);
                const mouseY = -((centerY / this.height) * 2 - 1);

        
                const dist = currentDistance - this.lastTouchDistance;
                const newScale = Math.exp(dist * 0.005);
        
                const newZoom = this.zoom * newScale;
                if (newZoom < 0.8 || newZoom > 10) {
                    return;
                }
                this.zoom = newZoom;
                this.offsetX = mouseX - newScale * (mouseX - this.offsetX);
                this.offsetY = mouseY - newScale * (mouseY - this.offsetY);
                //console.log(centerX, centerY, this.offsetX, this.offsetY);

        
                console.log(centerX, centerY, mouseX, mouseY, this.zoom, this.offsetX, this.offsetY);


                this.update();
            }

            this.lastTouchDistance = currentDistance;
        }
    }

    handleTouchEnd(event) {
        if (event.touches.length == 0) {
            this.isScaling = false;
        }
        this.lastTouchDistance = null;
    }

    getTouchDistance(touches) {
        const dx = touches[1].clientX - touches[0].clientX;
        const dy = touches[1].clientY - touches[0].clientY;
        return Math.hypot(dx, dy);
    }
}

export { PreviewCanvas };