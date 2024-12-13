import { SidePanel } from "./previewpage/sidePanel.js";
import { Preview } from "./previewpage/preview.js"
import { Language } from "./lang.js";
import { getSessionInt, getStoredInt, getStoredString } from "./storage.js";

document.getElementById('pageNum').textContent = 0;
document.getElementById('pageCount').textContent = 0;

console.log("Cookies: " + document.cookie);

var jobID = -1;

var sidePanel = new SidePanel();
var preview = new Preview();
var lang = new Language();
lang.setLangMain(lang.curLang);

// set options
var printerIdx = localStorage.getItem("printer");
console.log(printerIdx);
if (printerIdx === null || printerIdx >= $("#printers option").length) {
	printerIdx = 0;
}
$('#printers option').eq(printerIdx).prop('selected', true);
printerChanged();

//session options

/*var color = getSessionInt("color", 0);
$("input[name='color']").eq(color).prop("checked", true);
setBW(color);

$("input[name='sides']").eq(getSessionInt("duplex", 0)).prop("checked", true);
$("input[name='res']").eq(getSessionInt("res", 0)).prop("checked", true);
$("input[name='pagespersheet']").eq(getSessionInt("pps", 0)).prop("checked", true);
$("input[name='scale']").eq(getSessionInt("scale", 2)).prop("checked", true);*/



$("#printForm").on("submit", function (e) {
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";
});

$('#inputFile').change( function(event) {

	var url = URL.createObjectURL(event.target.files[0]);
	console.log(url, event.target.files[0]);
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
		console.log(url, document.getElementById("inputFile").files[0]);

		preview.loadPdf(url);
	}
}




document.getElementById('next').addEventListener('click', () => { preview.nextSide() });
document.getElementById('prev').addEventListener('click', () => { preview.prevSide() });

document.getElementById('pages').addEventListener('change', pagesSelectionChanged);
var bwB = document.getElementById('blackwhite');
bwB.addEventListener('click', () => { setBW(bwB, true); sessionStorage.setItem("color", "" + 0); })
var colB = document.getElementById('colored');
colB.addEventListener('click', () => { setBW(colB, false); sessionStorage.setItem("color", "" + 1); });


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

document.getElementById("germanLang").addEventListener("click", () => { lang.setLangMain(lang.DE); });
document.getElementById("englishLang").addEventListener("click", () => { lang.setLangMain(lang.EN); });

document.getElementById("pdfButton").addEventListener("click", () => {
	let formData = new FormData();
	console.log($("#inputFile").prop("files")[0], $("#inputFile").val())
	formData.append("filename", $("#inputFile").prop("files")[0], $("#inputFile").prop("files")[0].name);
	console.log($("#user").val(), $("#password").val(), $("select[name='printers']").val(), 
		$("#pages").val(), $("#copies").val(), $("input[name='color']:checked").val(), $("input[name='sides']:checked").val(), $("input[name='res']:checked").val(),
		$("select[name='pages per sheet']").val(), $("input[name='scale']:checked").val());
	formData.append("username", $("#user").val());
	formData.append("password", $("#password").val());
	formData.append("printers", $("select[name='printers']").val());
	formData.append("page numbers", $("#pages").val());
	formData.append("copy number", $("#copies").val());
	formData.append("color", $("input[name='color']:checked").val());
	formData.append("sides", $("input[name='sides']:checked").val());
	formData.append("res", $("input[name='res']:checked").val());
	formData.append("pages per sheet", $("select[name='pages per sheet']").val());
	formData.append("scale", $("input[name='scale']:checked").val());

	$.ajax({url: "/print-pdf", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
		window.location.href = "/jobs";
		//$("html").html(data);
		console.log(data);
	}});
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";
});

/*document.getElementById("imgButton").addEventListener("click", () => {
	let formData = new FormData();
	formData.append("username", $("#user").val());
	formData.append("password", $("#password").val());
	formData.append("printers", $("input[name='printers']:selected").val());
	formData.append("page numbers", "");
	formData.append("copy number", $("#copies").val());
	formData.append("color", $("input[name='color']:selected").val());
	formData.append("sides", $("input[name='sides']:selected").val());
	formData.append("res", $("input[name='res']:selected").val());
	formData.append("pages per sheet", 1);
	formData.append("scale", $("input[name='scale']:selected").val());
	formData.append("maxSides", preview.maxSides);

	$.ajax({url: "/print-img", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) { preview.sendImages(); }});
	document.getElementById('cancelCurPrintBut').style.display = "block";
	document.getElementById("fullgraybackground").style.display = "flex";
	preview.sendImages();
});*/

//test();

function test() {
	// const url = "https://download.epson-europe.com/pub/download/6324/epson632476eu.pdf";
	// const url = "https://download.epson-europe.com/pub/download/6324/epson632464eu.pdf";
	//const url = "./static/TestPDF/TestA5.pdf"
	//const url = "https://s28.q4cdn.com/392171258/files/doc_downloads/test.pdf";
	const url = "./static/TestPDF/DS_ECO_P6230cdn_VIEW.pdf"

	fetch(url).then(response => response.blob()).then(blob => {
		const file = new File([blob], "sample.pdf", { type: "application/pdf" });
		
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);

		var urlObject = URL.createObjectURL(dataTransfer.files[0]);
		console.log(urlObject, dataTransfer.files[0]);
		preview.loadPdf(urlObject);
	});
}