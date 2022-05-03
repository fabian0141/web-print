package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const (
	CUPS_PRINTER_BW     = 0x0004 /* Can do B&W printing */
	CUPS_PRINTER_COLOR  = 0x0008 /* Can do color printing */
	CUPS_PRINTER_DUPLEX = 0x0010 /* Can do two-sided printing */
)

type Context struct {
	Printers []string
}

type PrintingJobs struct {
	Printer string `json:"printer"`
	Jobs    []int  `json:"jobs"`
}

type Session struct {
	Session   string
	Username  string
	Password  string
	PrintJobs map[string][]int
	Expire    time.Time
}

var printerAmount int
var printerNames []string
var printerFlags []uint //saves options as flags see CUPS source code for more informations, relevant ones are above

var sessions = make([]Session, 0)
var lock sync.Mutex

func setupRoutes() {
	fileServer := http.FileServer(http.Dir("./static"))

	http.HandleFunc("/", showPrintPage)
	http.HandleFunc("/jobs", showJobsPage)
	http.Handle("/static/", http.StripPrefix("/static/", fileServer))

	http.HandleFunc("/print", print)
	http.HandleFunc("/cancel-print", cancelPrint)
	http.HandleFunc("/info-prints", infoPrints)
	http.HandleFunc("/info-all-prints", infoAllPrints)
}

func showPrintPage(w http.ResponseWriter, r *http.Request) {

	pageContent, err := os.ReadFile("./static/index.html")
	checkFatal(err)

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
					document.getElementById("twosidedlabel").style.color = "grey"
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

func showJobsPage(w http.ResponseWriter, r *http.Request) {

	pageContent, err := os.ReadFile("./static/jobs/index.html")
	checkFatal(err)

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

	var available = false

	for available {
		_, err := os.Stat(name)

		if os.IsNotExist(err) {
			available = true
		} else {
			nameLength := len(name)
			name = name[:nameLength-4] + "AnotherOne" + name[nameLength-4:]
		}
	}

	f, err := os.Create(name)

	if checkError(err) {
		return
	}
	defer f.Close()

	_, err = f.WriteString(contents)

	if checkError(err) {
		return
	}
	buf.Reset()
	fmt.Printf("Done!")

	fmt.Printf("%s %s %s %s %s %s\n", r.FormValue("page numbers"), r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"),
		r.FormValue("res"), r.FormValue("orientation"))

	var pageSelection = "All"
	if r.FormValue("page numbers") != "" {
		pageSelection = r.FormValue("page numbers")
	}

	cmd := exec.Command("./cupscli", "-print", r.FormValue("printers"), name, name, r.FormValue("username"), r.FormValue("password"),
		pageSelection, r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"), r.FormValue("res"),
		r.FormValue("orientation"), r.FormValue("pages per sheet"), r.FormValue("scale"))

	info, err := cmd.Output()
	if checkError(err) {
		return
	}
	fmt.Fprint(w, string(info))
	fmt.Print(string(info))

	err = os.Remove(name)
	checkError(err)

	sessionToken := uuid.NewString()
	infos := strings.Split(string(info), "\n")
	var jobID = -1
	for i := 0; i < len(infos); i++ {
		if strings.HasPrefix(infos[i], "Print-Job: ") {
			jobID, _ = strconv.Atoi(infos[i])
		}
	}
	if jobID == -1 {
		return
	}
	cookie, err := r.Cookie("session_token")
	if err != nil {
		session, e := getSession(cookie.Value)
		if e != -1 {
			if printer, ok := session.PrintJobs[r.FormValue("printers")]; ok {
				printer = append(printer, jobID)
				session.PrintJobs[r.FormValue("printers")] = printer
			} else {
				session.PrintJobs[r.FormValue("printers")] = append(session.PrintJobs[r.FormValue("printers")], jobID)

			}
			session.PrintJobs[r.FormValue("printers")] = append(session.PrintJobs[r.FormValue("printers")], jobID)
			http.Redirect(w, r, "../jobs", http.StatusSeeOther)
			return
		}
	}
	printJobs := make(map[string][]int, 1)
	printJobs[r.FormValue("printers")] = append(printJobs[r.FormValue("printers")], jobID)
	expiresAt := time.Now().Add(24 * time.Hour)
	addSession(Session{sessionToken, r.FormValue("username"), r.FormValue("password"), printJobs, expiresAt})

	http.SetCookie(w, &http.Cookie{
		Name:    "session_token",
		Value:   sessionToken,
		Expires: expiresAt,
	})

	http.Redirect(w, r, "../jobs", http.StatusSeeOther)
}

func infoPrints(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Info of Prints...")

	printerArgs := make([]string, 2)
	printerArgs[0] = "-info"
	var printJobs []PrintingJobs

	err := json.Unmarshal([]byte(r.FormValue("printers")), &printJobs)
	if err != nil {
		w.WriteHeader(440)
		return
	}
	length := len(printJobs)

	for i := 3; i < length; i++ {
		printerArgs[i*2] = printJobs[i].Printer
		s, _ := json.Marshal(printJobs[i].Jobs)
		printerArgs[i*2+1] = strings.Trim(string(s), "[]")
	}

	cmd := exec.Command("./cupscli", printerArgs...)
	infos, err := cmd.Output()
	if checkError(err) {
		return
	}

	fmt.Fprint(w, string(infos))
	fmt.Print(string(infos))
}

func infoAllPrints(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Info of all Prints...")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		session, e := getSession(cookie.Value)
		if e != 1 {
			length := len(session.PrintJobs)
			printerArgs := make([]string, length*2+2)
			printerArgs[0] = "-info"
			printerArgs[1] = fmt.Sprint(length)
			i := 2
			for printer, jobs := range session.PrintJobs {
				printerArgs[i] = printer
				s, _ := json.Marshal(jobs)
				printerArgs[i+1] = strings.Trim(string(s), "[]")
				i += 2
			}

			cmd := exec.Command("./cupscli", printerArgs...)
			infos, err := cmd.Output()
			if checkError(err) {
				return
			}

			fmt.Fprint(w, string(infos))
			fmt.Print(string(infos))
			return
		}
	}
	w.WriteHeader(440)
}

func cancelPrint(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("Canceling Print...")

	cookie, err := r.Cookie("session_token")
	if err != nil {
		session, e := getSession(cookie.Value)
		if e != 1 {
			cmd := exec.Command("./cupscli", "-cancel", r.FormValue("printers"), session.Username, session.Password,
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
	}

	w.WriteHeader(440)

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

func addSession(session Session) {
	lock.Lock()
	defer lock.Unlock()
	sessions = append(sessions, session)
}

func getSession(session string) (s Session, e int) {
	lock.Lock()
	defer lock.Unlock()
	for i := 0; i < len(sessions); i++ {
		if sessions[i].isExpired() {
			sessions = sessions[1:]
			i--
		} else if sessions[i].Session == session {
			s = sessions[i]
			return
		}
	}
	e = -1
	return
}

func (s Session) isExpired() bool {
	return s.Expire.Before(time.Now())
}
