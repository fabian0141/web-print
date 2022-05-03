var jobRows = new Map();

getAllJobs();

function getAllJobs() {
    var formData = new FormData();

    $.ajax({url: "/info-all-prints", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
        var splitData = data.split("\n");
        for (var i = 0; i < splitData.length; i++) {
            if (splitData[i].startsWith("job-state:")) {

                var jobState = splitData[i].split(" ");
                var job = jobState[1];
                var state = jobState[2];
                var date = jobState[3];
                var printer = jobState[4];

                var nameStart = splitData[i].indexOf("-");
                var name = splitData[i].substring(nameStart+1);

                var row = $('#jobsTable').insertRow(-1);
                var cell = row.insertCell(0);
                cell.innerHTML = name;
                cell = row.insertCell(1);
                cell.innerHTML = date;
                cell = row.insertCell(3);
                cell.innerHTML = '<button class="w3-button w3-brown w3-round" onclick="cancelPrintJob(' + job + ', ' + printer + ')">Abbrechen</button>';
                cell = row.insertCell(2);

                switch (state) {
                    case 3:
                        cell.innerHTML = "Der Druck ist in der Warteschlange";
                        break;
                    case 4:
                        cell.innerHTML = "Der Druck wurde angehalten";
                        break;
                    case 5:
                        cell.innerHTML = "Das Dokument wird gedruckt";
                        break;
                    case 6:
                        cell.innerHTML = "Der Druck wurde gestoppt";
                        break;
                    case 7:
                        cell.innerHTML = "Der Druck wurde von dir abgebrochen";
                        break;
                    case 8:
                        cell.innerHTML = "Der Druck wurde vom Drucker abgebrochen";
                        break;
                    case 9:
                        cell.innerHTML = "Das Dokument wurde gedruckt";
                        break;
                    default:
                        cell.innerHTML = "Unbekannt";
                        console.log(state);
                }
                if (state == 3 || state == 5) {
                    jobRow.set(job, {idx: row.rowIndex, printerName: printer});
                }
            } else {
                console.log(splitData[i]);
            }
        }
        if (jobRows.length != 0) {
            getPrintInfo();
        }
    }});
}

function jsonJobsRequest() {
    var printerJobs = new Map();

    jobRows.forEach((values,job)=>{
        printer = values.printerName;

        if (printerJobs.has(printer)) {
            printerJobs[printer].jobs.push(job);

        } else {
            var printerObj = new Object();
            printerObj.printer = printer;
            printerObj.jobs = [job];
            printerJobs[printer] = printerObj;
        }
    });
    return JSON.parse(JSON.stringify(Array.from(printerJobs.values())))
}

function getPrintInfo() { 
    setTimeout(function() {
        var formData = new FormData();
        formData.append('printers', jsonJobsRequest);

        $.ajax({url: "/info-prints", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
            var splitData = data.split("\n");
            for (var i = 0; i < splitData.length; i++) {
                if (splitData[i].startsWith("job-state:")) {

                    var jobStateDate = splitData[i].split(" ");
                    var job = jobStateDate[1];
                    var state = jobState = jobStateDate[2];
                    var rowIdx = jobRows[job].idx;

                    if (state != 3 && state != 5) {
                        jobRow.delete(job)
                    }

                    switch (state) {
                        case 3:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck ist in der Warteschlange";
                            break;
                        case 4:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde angehalten";
                            break;
                        case 5:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Das Dokument wird gedruckt";
                            break;
                        case 6:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde gestoppt";
                            break;
                        case 7:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde von dir abgebrochen";
                            break;
                        case 8:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde vom Drucker abgebrochen";
                            break;
                        case 9:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Das Dokument wurde gedruckt";
                            break;
                        default:
                            $('#jobsTable').rows[rowIdx].cells[2].innerHTML = "Unbekannt";
                    }
                } else {
                    console.log(splitData[i]);
                }
            }

            if (jobRows.length != 0) {
                getPrintInfo();
            }
        }});
    
    }, 3000);
}

function cancelPrintJob(id , printer) {

    var formData = new FormData();
    formData.append('printers', printer);
    formData.append('jobID', id);

    $.ajax({url: "/cancel-print", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
        infoPause = true;
        document.getElementById("printState").textContent = data;
    }});
}