import { SidePanel } from "./previewpage/sidePanel.js";
import { Preview } from "./previewpage/preview.js"
import { Language } from "./lang.js";

document.getElementById('pageNum').textContent = 0;
document.getElementById('pageCount').textContent = 0;

console.log("Cookies: " + document.cookie);

var jobID = -1;

var sidePanel = new SidePanel();
var preview = new Preview();
var lang = new Language();

$("#printForm").on("submit", function (e) {
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";

});

$('#inputFile').change( function(event) {

	var url = URL.createObjectURL(event.target.files[0]);
	preview.loadPdf(url);
 });

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

 	var file = e.dataTransfer.files[0];

	if (file.type == "application/pdf") {
		var dataTransfer = new DataTransfer()
		dataTransfer.items.add(file);
		document.getElementById("inputFile").files = dataTransfer.files;

		var url = URL.createObjectURL(document.getElementById("inputFile").files[0]);

		preview.loadPdf(url);
	}
}




document.getElementById('next').addEventListener('click', () => { preview.nextSide() });
document.getElementById('prev').addEventListener('click', () => { preview.prevSide() });

document.getElementById('pages').addEventListener('change', pagesSelectionChanged);
var bwB = document.getElementById('blackwhite');
bwB.addEventListener('click', () => { setBW(bwB, true) })
var colB = document.getElementById('colored');
colB.addEventListener('click', () => { setBW(colB, false) });


document.getElementById('cancelCurPrintBut').addEventListener('click', cancelCurPrint);
document.getElementById('moreOptions').addEventListener('click', showMoreOptions);
document.getElementById('lessOptions').addEventListener('click', showLessOptions);

document.getElementById('pagespersheet').addEventListener('change', setTiles);
document.getElementById('no-scale').addEventListener('click', () => { setPageScaling(0) });
document.getElementById('fit-scale').addEventListener('click', () => { setPageScaling(1) });
document.getElementById('fill-scale').addEventListener('click', () => { setPageScaling(2) });


function pagesSelectionChanged() {
	var pageSelection = document.getElementById("pages").value;

	preview.pagesToPrint = sidePanel.getPagesToPrint(pageSelection, preview.numPages);

    preview.curSide = 0;
	preview.maxPages = preview.pagesToPrint.length;
    preview.maxSides = Math.ceil(preview.maxPages / preview.pagesPerSide);
	sidePanel.updatePageSelector(preview.maxSides)

	preview.makeAdjustedImage(true);
}

function setBW(self, bw) {
    if (self.disabled || bw & preview.isBW) {
        return;
    }
	preview.isBW = bw;
    preview.makeAdjustedImage(true);
}

function cancelCurPrint() {
    var formData = new FormData();

    $.ajax({url: "/cancel-current-print", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
		document.getElementById('printingMessage').textContent = data;
		document.getElementById('cancelCurPrintBut').style.display = "none";
        console.log(data);
    }});
}

function showMoreOptions() {
	$('#moreOptions').hide();
	$('#additionalOptions').show();
}

function showLessOptions() {
   $('#moreOptions').show();
   $('#additionalOptions').hide();
}

function setTiles() {
    preview.setPagesPerSide(parseInt($('#pagespersheet').val()));

    preview.curSide = 0;
    preview.maxSides = Math.ceil(preview.maxPages / preview.pagesPerSide);
    document.getElementById('pageCount').textContent = preview.maxSides;
    document.getElementById('pageNum').textContent = 1;
    preview.makeAdjustedImage(true);
}

function setPageScaling(ps) {
	preview.setPageScaling(ps);
    preview.makeAdjustedImage(true);
}

function printPDF() {
	let formData = new FormData();
	formData.append("filename", $("#inputFile").val(), filename);
	formData.append("username", $("#user").val());
	formData.append("password", $("#password").val());
	formData.append("printers", $("input[name='printers']:selected").val());
	formData.append("page numbers", $("#pages").val());
	formData.append("copy number", $("#copies").val());
	formData.append("color", $("input[name='color']:selected").val());
	formData.append("sides", $("input[name='sides']:selected").val());
	formData.append("res", $("input[name='res']:selected").val());
	formData.append("pages per sheet", $("input[name='pages per sheet']:selected").val());
	formData.append("scale", $("input[name='scale']:selected").val());

	$.ajax({url: "/print-img", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {}});
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";
}

function printImg() {
	let formData = new FormData();
	formData.append("username", $("#user").val());
	formData.append("password", $("#password").val());
	formData.append("printers", $("input[name='printers']:selected").val());
	formData.append("page numbers", $("#pages").val());
	formData.append("copy number", $("#copies").val());
	formData.append("color", $("input[name='color']:selected").val());
	formData.append("sides", $("input[name='sides']:selected").val());
	formData.append("res", $("input[name='res']:selected").val());
	formData.append("pages per sheet", $("input[name='pages per sheet']:selected").val());
	formData.append("scale", $("input[name='scale']:selected").val());
	formData.append("maxSides", preview.maxSides);

	$.ajax({url: "/print-img", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) { preview.sendImages(); }});
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";
	preview.sendImages();
}