import { getStoredInt } from "./storage.js";


class Language {
    constructor() {
        this.DE = 0;
        this.EN = 1;
        this.curLang = getStoredInt("lang", 1);
        this.cancelJob = "";
        this.stateJob13 = "";
        this.stateJob14 = "";
        this.stateJob15 = "";
        this.stateJob16 = "";
        this.stateJob17 = "";
        this.stateJob18 = "";
        this.stateJob19 = "";
        this.stateJob10 = "";
    }

    setLangMain(lang) {
        this.curLang = lang;
        localStorage.setItem("lang", "" + lang);

        console.log("Lang:", lang);
        switch (lang) {
            case this.DE:
                $("#displayinfo").text("Die Vorschau ist nur als Hilfe gedacht! Das gedruckte Ergebnis kann von der Vorschau abweichen.");
                $("#pageText").text("Seite: ");
                $("#prev").text("Voriges");
                $("#next").text("Nächstes");
                $("#userLabel").text("Nutzername:");
                $("#passwordLabel").text("Passwort:");
                $("#printersLabel").text("Wähle einen Drucker:");
                $("#textLabel").text("Seiten Nummern:");
                $("#copiesLabel").text("Anzahl an Kopien:");
                $("#colorLabel").text("Farbwahl:");
                $("#blackwhitelabel").text(" Schwarz / Weiß");
                $("#coloredlabel").text(" Farblich");
                $("#sidesLabel").text("Duplex Art:");
                $("#onesidedlabel").text(" Einseitig");
                $("#twosidedlabel").text(" Doppelseitig (über lange Seite)");
                $("#twosidedshortlabel").text(" Doppelseitig (über kurze Seite)");
                $("#moreOptions").text("Mehr Optionen");
                $("#resolutionLabel").text("Auflösung:");
                $("#lowResLabel").text(" 150 dpi (Niedrig, Vorschau)");
                $("#midResLabel").text(" 300 dpi (Standard)");
                $("#highResLabel").text(" 600 dpi (Hoch)");
                $("#maxResLabel").text(" 1200 dpi (Sehr hoch)");
                $("#ppsLabel").text("Seiten pro Blatt:");
                $("#scaleLabel").text("Skalieren:");
                $("#noScaleLabel").text(" Nicht Skalieren");
                $("#fitScaleLabel").text(" Druckbarer Bereich");
                $("#fillScaleLabel").text(" Auf A4 Skalieren");
                $("#lessOptions").text("Weniger Optionen");
                $("printingMessage").text("#Auftrag wird an den Drucker gesendet.");
                $("#addDoc").text("Füge Dokument hinzu");
                $("#pdfButton").text("Drucken als PDF");
                $("#imgButton").text("Drucken als Bild");
                break;

            case this.EN:
                $("#displayinfo").text("The print may deviate from the preview.");
                $("#pageText").text("Page: ");
                $("#prev").text("Prev");
                $("#next").text("Next");
                $("#userLabel").text("Username:");
                $("#passwordLabel").text("Password:");
                $("#printersLabel").text("Choose Printer:");
                $("#textLabel").text("Page Numbers:");
                $("#copiesLabel").text("Amount of Copies:");
                $("#colorLabel").text("Color Mode:");
                $("#blackwhitelabel").text(" Black / White");
                $("#coloredlabel").text(" Color");
                $("#sidesLabel").text("Duplex Mode:");
                $("#onesidedlabel").text(" One Sided");
                $("#twosidedlabel").text(" Double Sided (over long Edge)");
                $("#twosidedshortlabel").text(" Double Sided (over short Edge)");
                $("#moreOptions").text("More Options");
                $("#resolutionLabel").text("Resolution:");
                $("#lowResLabel").text(" 150 dpi (Low, Preview)");
                $("#midResLabel").text(" 300 dpi (Standard)");
                $("#highResLabel").text(" 600 dpi (High)");
                $("#maxResLabel").text(" 1200 dpi (Very high)");
                $("#ppsLabel").text("Pages per Sheet:");
                $("#scaleLabel").text("Scale:");
                $("#noScaleLabel").text(" Don't Scale");
                $("#fitScaleLabel").text(" Printable Area");
                $("#fillScaleLabel").text(" Scale on A4");
                $("#lessOptions").text("Less Options");
                $("#printingMessage").text("Job is being delievered to printer.");
                $("#addDoc").text("Add Document");
                $("#pdfButton").text("Print as PDF");
                $("#imgButton").text("Print as Image");
                break;
        }
    }

    setLangJobs(lang) {
        switch (lang) {
            case this.DE:
                $("#title").text("Druck Aufträge");
                $("#titleCell").text("Titel");
                $("#titleDate").text("Datum");
                $("#titleState").text("Status");
                $("#printMore").text("Weiter Drucken");
                $("#printingMessage").text("Druckauftrag wird abgebrochen.");
                this.cancelJob = "Abbrechen";
                this.stateJob3 = "Der Druck ist in der Warteschlange";
                this.stateJob4 = "Der Druck wurde angehalten";
                this.stateJob5 = "Der Druck wird verarbeitet";
                this.stateJob6 = "Der Druck wurde gestoppt";
                this.stateJob7 = "Der Druck wurde von dir abgebrochen";
                this.stateJob8 = "Der Druck wurde vom Drucker abgebrochen";
                this.stateJob9 = "Das Dokument wurde gedruckt";
                this.stateJob0 = "Unbekannter Fehler. Versuch es nochmal!";
                break;

            case this.EN:
                $("#title").text("Print Jobs");
                $("#titleCell").text("Title");
                $("#titleDate").text("Date");
                $("#titleState").text("Status");
                $("#printMore").text("Print More");
                $("#printingMessage").text("Print is being canceled.");
                this.cancelJob = "Cancel";
                this.stateJob3 = "Print is in Queue";
                this.stateJob4 = "Print is halted";
                this.stateJob5 = "Print is being processed";
                this.stateJob6 = "Print is being stopped";
                this.stateJob7 = "Print was canceled by you";
                this.stateJob8 = "Print was canceled by printer";
                this.stateJob9 = "Print is done";
                this.stateJob0 = "Unknown Error. Try printing again!";
                break;
        }
    }
}

export { Language };