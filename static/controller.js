
document.getElementById('pageNum').textContent = 0;
document.getElementById('pageCount').textContent = 0;

console.log("Cookies: " + document.cookie);

var pagesToPrint = new Array();
var jobID = -1;

function pagesSelectionChanged() {
	var pageSelection = document.getElementById("pages").value;

	pagesToPrint = new Array();

	if (pageSelection == "") {
		for (var i = 0; i < pdfDoc.numPages; i++) {
			pagesToPrint[i] = i;
		}
	} else {
		var pagesIdx = 0;
		pageRanges = pageSelection.split(',');
	
		for (var i = 0; i < pageRanges.length; i++) {
			minMax = pageRanges[i].split('-');
			if (minMax.length == 1) {
				pagesToPrint[pagesIdx++] = parseInt(minMax[0]) - 1;
			} else {
				for (var j = parseInt(minMax[0]); j <= parseInt(minMax[1]); j++) {
					pagesToPrint[pagesIdx++] = j - 1;
				}
			}
		}
	}

    curSide = 0;
	maxPages = pagesToPrint.length;
    maxSides = Math.ceil(maxPages / pagesPerSide);
    document.getElementById('pageCount').textContent = maxSides;
    document.getElementById('pageNum').textContent = 1;
	console.log(pagesToPrint[0] + " " + maxSides);

	makeAdjustedImage();
}

$("#printForm").on("submit", function (e) {
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";

});

$('#inputFile').change( function(event) {

	var url = URL.createObjectURL(event.target.files[0]);
    /**
     * Asynchronously downloads PDF.
     */
    pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
     	pdfDoc = pdfDoc_;
		bufferedImages = new Array(pdfDoc.numPages);

		document.getElementById('pageCount').textContent = pdfDoc.numPages;
		document.getElementById('pageNum').textContent = 1;
		curSide = 0;
		maxPages = pdfDoc.numPages;
		maxSides = maxPages;

     	pagesToPrint = new Array();
     	for (var i = 0; i < pdfDoc.numPages; i++) {
     		pagesToPrint[i] = i;
     	}

        // Initial/first page rendering
        document.getElementById("pages").value = "";
        pageNum = 0;
		makeAdjustedImage();
    });
 });

// If absolute URL from the remote server is provided, configure the CORS
// header on that server.

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'static/pdf.worker.js';

var pdfDoc = null,
pageNum = 0,
pageRendering = false,
pageNumPending = null,
scale = 2,
canvasView = document.getElementById('the-canvas'),
ctxView = canvasView.getContext('2d');
loadingCanvas = document.getElementById('pdf-loading-canvas');
loadingCtx = loadingCanvas.getContext('2d');

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
async function renderPage(num) {
 	pageRendering = true;
	while(window.performance.memory.jsHeapSizeLimit - 200000000 < window.performance.memory.usedJSHeapSize) {
		bufferedImages[oldestLoadedImage] = null
		oldestLoadedImage = (oldestLoadedImage + 1) % bufferedImages.length;
	}

	var page = await pdfDoc.getPage(num+1)
	var viewport = page.getViewport({scale: scale});
	console.log(viewport.height)
	console.log(viewport.width)

	if (viewport.height >= viewport.width) {
		canvasView.width = 1190;
		canvasView.height = 1683;
	} else {
		canvasView.width = 1683;
		canvasView.height = 1190;
	}

	loadingCanvas.height = viewport.height;
	loadingCanvas.width = viewport.width;



	var renderContext = {
		canvasContext: loadingCtx,
		viewport: viewport
	};

	await page.render(renderContext).promise;
	bufferedImages[num] = loadingCtx.getImageData(0, 0, loadingCanvas.width, loadingCanvas.height);

	pageRendering = false;
	if (pageNumPending !== null) {
		renderPage(pageNumPending);
		pageNumPending = null;
	}
	//document.getElementById('pageNum').textContent = num;
}

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
 	if (pageRendering) {
 		pageNumPending = num;
 	} else {
 		renderPage(num);
 	}
}

/**
 * Displays previous page.
 */
function onPrevPage() {
 	if (pageNum <= 0) {
 		return;
 	}
 	pageNum--;
 	queueRenderPage(pagesToPrint[pageNum]);
}

/**
 * Displays next page.
 */
function onNextPage() {
 	if (pageNum >= pagesToPrint.length - 1) {
 		return;
 	}
 	pageNum++;
 	queueRenderPage(pagesToPrint[pageNum]);
}

var dropArea = document.getElementById('background');

 ;['dragenter'].forEach(eventName => {
 	dropArea.addEventListener(eventName, showDragNDrop, false)
 })

 ;['dragover'].forEach(eventName => {
 	dropArea.addEventListener(eventName, defaultDragOver, false)
 })

 ;['dragleave'].forEach(eventName => {
 	dropArea.addEventListener(eventName, hideDragNDrop, false)
 })

 ;['drop'].forEach(eventName => {
 	dropArea.addEventListener(eventName, dropDocument, false)
 })

 var counter = 0;

 function showDragNDrop(e) {
 	e.preventDefault()
 	e.stopPropagation()
 	counter++;
 	document.getElementById("dragNdropFile").style.display = "flex";
 }

function defaultDragOver(e) {
 	e.preventDefault()
 	e.stopPropagation()
 }

function hideDragNDrop(e) {
 	e.preventDefault()
 	e.stopPropagation()
 	counter--;
 	if (counter == 0) {
 		document.getElementById("dragNdropFile").style.display = "none";
 	}
 }

function dropDocument(e) {
 	e.preventDefault()
 	e.stopPropagation()
 	counter = 0;
 	document.getElementById("dragNdropFile").style.display = "none";

 	var files = e.dataTransfer.files;

 	for (var i = 0; i < files.length; i++) {
 		if (files[i].type == "application/pdf") {
 			var dataTransfer = new DataTransfer()
 			dataTransfer.items.add(files[i]);
 			document.getElementById("inputFile").files = dataTransfer.files;

 			var url = URL.createObjectURL(document.getElementById("inputFile").files[0]);

 			pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
 				pdfDoc = pdfDoc_;
				bufferedImages = new Array(pdfDoc.numPages);

 				document.getElementById('pageCount').textContent = pdfDoc.numPages;
			 	document.getElementById('pageNum').textContent = 1;
				curSide = 0;
				maxPages = pdfDoc.numPages;
				maxSides = maxPages;

 				pagesToPrint = new Array();
 				for (var i = 0; i < pdfDoc.numPages; i++) {
 					pagesToPrint[i] = i;
 				}

 				document.getElementById("pages").value = "";
 				pageNum = 0;
 				makeAdjustedImage();
 			});

 			break;
 		}
 	}
 }

 function showMoreOptions() {
	 $('#moreOptions').hide();
	 $('#additionalOptions').show();
 }

 function showLessOptions() {
	$('#moreOptions').show();
	$('#additionalOptions').hide();
}

function nextSide() {
	curSide = mod(++curSide, maxSides);
	document.getElementById('pageNum').textContent = curSide + 1;
	makeAdjustedImage();
}
document.getElementById('next').addEventListener('click', nextSide);

function prevSide() {
	curSide = mod (--curSide, maxSides);
	document.getElementById('pageNum').textContent = curSide + 1;
	makeAdjustedImage();
}
document.getElementById('prev').addEventListener('click', prevSide);

function mod(n, m) {
	return ((n % m) + m) % m;
}

function cancelCurPrint() {
    var formData = new FormData();

    $.ajax({url: "/cancel-current-print", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
		document.getElementById('printingMessage').textContent = data;
		document.getElementById('cancelCurPrintBut').style.display = "none";
        console.log(data);
    }});
}