

class Language {
    constructor() {
        this.DE = 0;
        this.EN = 1;
        this.setLang(this.DE);
    }

    setLang(lang) {

        console.log(lang);
        switch (lang) {
            case this.DE:
                $("#displayinfo").text("Die Vorschau ist nur als Hilfe gedacht! Das gedruckte Ergebnis kann von der Vorschau abweichen.");
                break;
            case this.EN:
                $("#displayinfo").text("The print may deviate from the preview.");
                break;
        }
    }
}

export { Language };