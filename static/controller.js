
document.getElementById('pageNum').textContent = 0;
document.getElementById('pageCount').textContent = 0;


var pagesToPrint = new Array();
var jobID = -1;

function pagesSelectionChanged() {
	var pageSelection = document.getElementById("pages").value;
	var maxPages = pagesToPrint.length;

	pagesToPrint = new Array();
	var pagesIdx = 0;
	pageRanges = pageSelection.split(',');

	for (var i = 0; i < pageRanges.length; i++) {
		minMax = pageRanges[i].split('-');
		if (minMax.length == 1) {
			pagesToPrint[pagesIdx++] = parseInt(minMax[0]);
		} else {
			for (var i = parseInt(minMax[0]); i <= parseInt(minMax[1]); i++) {
				pagesToPrint[pagesIdx++] = i;
			}
		}
	}
	console.log(pagesToPrint[0] + " " + pagesToPrint.length);

	pageNum = 0;
	renderPage(pagesToPrint[pageNum]);
}

$('#inputFile').change( function(event) {

	var url = URL.createObjectURL(event.target.files[0]);

    /**
     * Asynchronously downloads PDF.
     */
     pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
     	pdfDoc = pdfDoc_;
     	document.getElementById('pageCount').textContent = pdfDoc.numPages;

     	pagesToPrint = new Array();
     	for (var i = 0; i < pdfDoc.numPages; i++) {
     		pagesToPrint[i] = i + 1;
     	}

        // Initial/first page rendering
        document.getElementById("pages").value = "";
        pageNum = 0;
        renderPage(pagesToPrint[pageNum]);
    });
 });

// If absolute URL from the remote server is provided, configure the CORS
// header on that server.

// Loaded via <script> tag, create shortcut to access PDF.js exports.
var pdfjsLib = window['pdfjs-dist/build/pdf'];

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

var pdfDoc = null,
pageNum = 0,
pageRendering = false,
pageNumPending = null,
scale = 2,
canvas = document.getElementById('the-canvas'),
ctx = canvas.getContext('2d');

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
 function renderPage(num) {
 	pageRendering = true;
  // Using promise to fetch the page
  console.log(num);

  pdfDoc.getPage(num).then(function(page) {
  	var viewport = page.getViewport({scale: scale});
  	canvas.height = viewport.height;
  	canvas.width = viewport.width;

    // Render PDF page into canvas context
    var renderContext = {
    	canvasContext: ctx,
    	viewport: viewport
    };
    var renderTask = page.render(renderContext);

    // Wait for rendering to finish
    renderTask.promise.then(function() {
		pdfImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
		makeAdjustedImage();
    	pageRendering = false;
    	if (pageNumPending !== null) {
        // New page rendering is pending
        renderPage(pageNumPending);
        pageNumPending = null;
    }
});
});

  // Update page counters
  document.getElementById('pageNum').textContent = num;
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
 document.getElementById('prev').addEventListener('click', onPrevPage);

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
 document.getElementById('next').addEventListener('click', onNextPage);

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
 				document.getElementById('pageCount').textContent = pdfDoc.numPages;

 				pagesToPrint = new Array();
 				for (var i = 0; i < pdfDoc.numPages; i++) {
 					pagesToPrint[i] = i + 1;
 				}

 				document.getElementById("pages").value = "";
 				pageNum = 0;
 				renderPage(pagesToPrint[pageNum]);
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