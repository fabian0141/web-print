import { initBuffers } from "./previewBuffer.js";
import { createImageTexture2, prepCanvasDraw, canvasDraw } from "./previewScene.js";


class PreviewCanvas {
    constructor(canvas, gl, shader) {
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
        /*canvas.addEventListener('touchstart', this.handleTouchStart);
        canvas.addEventListener('touchmove', this.handleTouchMove);
        canvas.addEventListener('touchend', this.handleTouchEnd);*/
    }

    updateImg(pixels, width, height) {
        console.log(pixels, width, height)
        this.gl.viewport(0, 0, width, height);
        this.image = createImageTexture2(this.gl, pixels, width, height);
        this.width = width;
        this.height = height;
        prepCanvasDraw(this.gl, this.programInfo, this.image, this.buffers);
        this.update();
        //this.gl.deleteTexture(this.image);
    }

    update() {
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        canvasDraw(this.gl, this.programInfo, this.zoom, this.offsetX, this.offsetY);
        console.log(this.zoom, this.offsetX, this.offsetY);
    }

    handleWheel(event) {
        event.preventDefault();
        const zoomSpeed = 0.001;
        const mouseX = ((event.offsetX / this.width) * 2 - 1);
        const mouseY = -((event.offsetY / this.height) * 2 - 1);

        const newScale = Math.exp(-event.deltaY * 0.01);

        const newZoom = this.zoom * newScale;
        if (newZoom < 0.2 || newZoom > 5) {
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
        console.log(newOffsetX + this.zoom, newOffsetY - this.zoom);

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
            const touchX = event.touches[0].clientX;
            const touchY = event.touches[0].clientY;

            const dx = touchX - this.lastX;
            const dy = touchY - this.lastY;

            this.offsetX += dx;
            this.offsetY += dy;

            this.lastX = touchX;
            this.lastY = touchY;

            this.update();
        } else if (event.touches.length === 2) {
            const currentDistance = this.getTouchDistance(event.touches);

            if (this.lastTouchDistance) {
                const delta = currentDistance - this.lastTouchDistance;
                const zoomSpeed = 0.005;
                const newScale = Math.min(Math.max(this.zoom + delta * zoomSpeed, 0.1), 5);

                const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

                this.offsetX -= (centerX / this.zoom - centerX / newScale);
                this.offsetY -= (centerY / this.zoom - centerY / newScale);

                this.zoom = newScale;
                this.update();
            }

            this.lastTouchDistance = currentDistance;
        }
    }

    handleTouchEnd() {
        this.lastTouchDistance = null;
    }

    getTouchDistance(touches) {
        const dx = touches[1].clientX - touches[0].clientX;
        const dy = touches[1].clientY - touches[0].clientY;
        return Math.hypot(dx, dy);
    }
}

export { PreviewCanvas };