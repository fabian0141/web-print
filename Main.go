package main

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

const (
	CUPS_PRINTER_BW     = 0x0004 /* Can do B&W printing */
	CUPS_PRINTER_COLOR  = 0x0008 /* Can do color printing */
	CUPS_PRINTER_DUPLEX = 0x0010 /* Can do two-sided printing */
)

type Context struct {
	Printers []string
}

var printerAmount int
var printerNames []string
var printerFlags []uint //saves options as flags see CUPS source code for more informations, relevant ones are above

func setupRoutes() {
	fileServer := http.FileServer(http.Dir("./static"))

	http.HandleFunc("/", showPrintPage)
	http.Handle("/static/", http.StripPrefix("/static/", fileServer))

	http.HandleFunc("/print", print)
	http.HandleFunc("/cancel-print", cancelPrint)
	http.HandleFunc("/info-print", infoPrint)
}

func showPrintPage(w http.ResponseWriter, r *http.Request) {

	pageContent, err := os.ReadFile("./static/index.html")
	checkCritical(err)

	//disable unavailable options
	printerScripts := make([]byte, 0)
	printerScripts = append(printerScripts,
		`<script>
			function printerChanged() {
				var idx = document.getElementById("printers").selectedIndex;
				switch (idx) {
		`...)

	for i := 0; i < printerAmount; i++ {

		printerCase := fmt.Sprintf(
			`
				case %d:
					document.getElementById("blackwhite").disabled = %t;
					document.getElementById("colored").disabled = %t;
					document.getElementById("twosided").disabled = %t;
					break;
			`,
			i,
			printerFlags[i]&CUPS_PRINTER_BW == 0,
			printerFlags[i]&CUPS_PRINTER_COLOR == 0,
			printerFlags[i]&CUPS_PRINTER_DUPLEX == 0)

		printerScripts = append(printerScripts, []byte(printerCase)...)
	}

	printerScripts = append(printerScripts,
		`		}
				if (document.getElementById("blackwhite").disabled) {
					document.getElementById("blackwhitelabel").style.color = "grey"
					document.getElementById("colored").checked = true;
				} else {
					document.getElementById("blackwhitelabel").style.color = "black"
				}

				if (document.getElementById("colored").disabled) {
					document.getElementById("coloredlabel").style.color = "grey"
					document.getElementById("blackwhite").checked = true;
				} else {
					document.getElementById("coloredlabel").style.color = "black"
				}

				if (document.getElementById("twosided").disabled) {
					document.getElementById("twosidedabel").style.color = "grey"
					document.getElementById("onesided").checked = true;
				} else {
					document.getElementById("twosidedlabel").style.color = "black"
				}

			}
			printerChanged();
		</script>`...)

	pageContent = append(pageContent, printerScripts...)

	w.Header().Add("Content Type", "text/html")
	templates := template.New("template")
	templates.New("doc").Parse(string(pageContent))
	context := Context{
		Printers: printerNames,
	}
	templates.Lookup("doc").Execute(w, context) //Add Printer List to choose from
}

//Get document and save locally then execute printcli with all print settings
func print(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Printing Document...")
	var buf bytes.Buffer
	file, header, err := r.FormFile("filename")
	if checkError(err) {
		return
	}

	defer file.Close()
	name := header.Filename
	fmt.Fprintf(w, "Der Druck wird vorbereitet\n")

	io.Copy(&buf, file)
	contents := buf.String()
	f, err := os.Create(name)
	checkFatal(err)
	defer f.Close()

	_, err = f.WriteString(contents)

	checkFatal(err)
	buf.Reset()
	fmt.Printf("Done!")

	fmt.Printf("%s %s %s %s %s %s\n", r.FormValue("page numbers"), r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"),
		r.FormValue("res"), r.FormValue("orientation"))

	var pageSelection = "All"
	if r.FormValue("page numbers") != "" {
		pageSelection = r.FormValue("page numbers")
	}

	cmd := exec.Command("./cupscli", "-print", r.FormValue("printers"), name, name, r.FormValue("username"), r.FormValue(("password")),
		pageSelection, r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"), r.FormValue("res"),
		r.FormValue("orientation"))

	infos, err := cmd.Output()
	if checkError(err) {
		return
	}
	fmt.Fprint(w, string(infos))
	fmt.Print(string(infos))

	e := os.Remove(name)
	checkFatal(e)
}

func infoPrint(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Info of Print...")
	fmt.Printf("%s\n", r.FormValue("jobID"))

	cmd := exec.Command("./cupscli", "-info", r.FormValue("printers"), r.FormValue("username"), r.FormValue("password"),
		r.FormValue("jobID"))
	infos, err := cmd.Output()
	if checkError(err) {
		return
	}

	fmt.Fprint(w, string(infos))
	fmt.Print(string(infos))
}

func cancelPrint(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Canceling Print...")

	fmt.Printf("%s\n", r.FormValue("jobID"))

	cmd := exec.Command("./cupscli", "-cancel", r.FormValue("printers"), r.FormValue("username"), r.FormValue("password"),
		r.FormValue("jobID"))
	infos, err := cmd.Output()
	if checkError(err) {
		return
	}

	if strings.Contains(string(infos), "Cancel succeeded") {
		fmt.Fprintf(w, "Druckauftrag abgebrochen\n")
	} else {
		fmt.Fprintf(w, "Druckauftrag konnte nicht abgebrochen werden\n")
	}
	fmt.Print(string(infos))
}

//Get printer amount of last line and save names and available printer options in
//printerNames and printerFlags
func getPrinterInformations(printerInfos string) {

	splittedInfos := strings.Split(printerInfos, "\n")
	lastIdx := len(splittedInfos) - 2

	if strings.HasPrefix(splittedInfos[lastIdx], "Printer Amount:") {
		var err error
		printerAmount, err = strconv.Atoi(splittedInfos[lastIdx][16:])
		fmt.Println(printerAmount)
		checkError(err)

		printerNames = make([]string, printerAmount)
		printerFlags = make([]uint, printerAmount)

		var printerIdx = -1

		for i := 0; i < lastIdx; i++ {
			if strings.HasPrefix(splittedInfos[i], "Printer:") {
				printerIdx++
				printerNames[printerIdx] = splittedInfos[i][9:]
				fmt.Println(printerNames[printerIdx])
			} else if strings.HasPrefix(splittedInfos[i], "Printer-Flags:") {
				flags, err := strconv.ParseUint(splittedInfos[i][15:], 10, 32)
				printerFlags[printerIdx] = uint(flags)
				fmt.Println(flags)
				checkError(err)
			}
		}
	}
}

func gatherAllPrinterInformations() {
	cmd := exec.Command("./cupscli", "-infos")
	infos, err := cmd.Output()
	checkError(err)

	fmt.Print(string(infos))
	getPrinterInformations(string(infos[:]))
}

func main() {
	gatherAllPrinterInformations()

	setupRoutes()
	checkFatal(http.ListenAndServe(":36657", nil))
}

func checkCritical(e error) {
	if e != nil {
		panic(e)
	}
}

func checkFatal(e error) {
	if e != nil {
		log.Fatal(e)
	}
}

func checkError(e error) bool {
	if e != nil {
		fmt.Println(e.Error())
		return true
	}
	return false
}
