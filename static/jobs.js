var jobRows = new Map();

getAllJobs();
console.log("Cookies: " + document.cookie);


function getAllJobs() {
    var formData = new FormData();

    $.ajax({url: "/info-all-prints", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
        var splitData = data.split("\n");
        for (var i = 0; i < splitData.length; i++) {
            if (splitData[i].startsWith("job-state:")) {

                var jobState = splitData[i].split(" ");
                var job = parseInt(jobState[1]);
                var state = parseInt(jobState[2]);
                var date = jobState[3] + " " + jobState[4];
                var printer = jobState[5];

                var nameStart = splitData[i].indexOf("+");
                var name = splitData[i].substring(nameStart+1);

                var row = document.getElementById("jobsTable").insertRow(-1);
                var cell = row.insertCell(0);
                cell.innerHTML = name;
                var cell2 = row.insertCell(1);
                cell2.innerHTML = date;
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                cell4.innerHTML = '<button class="w3-button w3-brown w3-round" onclick="cancelPrintJob(' + job + ', \'' + printer + '\')">Abbrechen</button>';

                switch (state) {
                    case 3:
                        cell3.innerHTML = "Der Druck ist in der Warteschlange";
                        break;
                    case 4:
                        cell3.innerHTML = "Der Druck wurde angehalten";
                        break;
                    case 5:
                        cell3.innerHTML = "Das Dokument wird gedruckt";
                        break;
                    case 6:
                        cell3.innerHTML = "Der Druck wurde gestoppt";
                        break;
                    case 7:
                        cell3.innerHTML = "Der Druck wurde von dir abgebrochen";
                        break;
                    case 8:
                        cell3.innerHTML = "Der Druck wurde vom Drucker abgebrochen";
                        break;
                    case 9:
                        cell3.innerHTML = "Das Dokument wurde gedruckt";
                        break;
                    default:
                        cell.innerHTML = "-";
                        cell.innerHTML = "-";
                        cell3.innerHTML = "Unbekannter Fehler. Versuch es nochmal!";
                        cell4.innerHTML = "";
                        console.log(state);
                }
                if (state == 3 || state == 5) {
                    jobRows.set(job, {idx: row.rowIndex, printerName: printer});
                }
            } else {
                console.log(splitData[i]);
            }
        }
        if (jobRows.size != 0) {
            getPrintInfo();
        }
    }});
}

function jsonJobsRequest() {
    var printerJobs = new Map();

    jobRows.forEach((values,job)=>{
        printer = values.printerName;

        if (printerJobs.has(printer)) {
            printerJobs.get(printer).jobs.push(job);

        } else {
            var printerObj = new Object();
            printerObj.printer = printer;
            printerObj.jobs = [job];
            printerJobs.set(printer, printerObj);
        }
    });

    return JSON.stringify(Array.from(printerJobs.values()));
}

function getPrintInfo() { 
    setTimeout(function() {
        var formData = new FormData();
        formData.append('printers', jsonJobsRequest());

        $.ajax({url: "/info-prints", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
            var splitData = data.split("\n");
            for (var i = 0; i < splitData.length; i++) {
                if (splitData[i].startsWith("job-state:")) {

                    var jobStateDate = splitData[i].split(" ");
                    var job = parseInt(jobStateDate[1]);
                    var state = parseInt(jobStateDate[2]);
                    var rowIdx = jobRows.get(job).idx;

                    if (state != 3 && state != 5) {
                        jobRows.delete(job);
                    }

                    switch (state) {
                        case 3:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck ist in der Warteschlange";
                            break;
                        case 4:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde angehalten";
                            break;
                        case 5:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Das Dokument wird gedruckt";
                            break;
                        case 6:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde gestoppt";
                            break;
                        case 7:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde von dir abgebrochen";
                            break;
                        case 8:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Der Druck wurde vom Drucker abgebrochen";
                            break;
                        case 9:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Das Dokument wurde gedruckt";
                            break;
                        default:
                            document.getElementById('jobsTable').rows[rowIdx].cells[2].innerHTML = "Unbekannter Fehler. Versuch es nochmal!";
                            console.log(state);
                    }
                } else {
                    console.log(splitData[i]);
                }
            }

            if (jobRows.size != 0) {
                getPrintInfo();
            }
        }});
    
    }, 3000);
}

function cancelPrintJob(id , printer) {

    console.log("Cancel print: " + id)
    document.getElementById("fullgraybackground").style.display = "flex";

    var formData = new FormData();
    formData.append('printers', printer);
    formData.append('jobID', id);

    $.ajax({url: "/cancel-print", data: formData, processData: false, contentType: false, type: 'POST', success: function(data) {
        document.getElementById("fullgraybackground").style.display = "none";

        console.log(data);
    }});
}