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
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pkg/errors"
)

/**
	scale preview
	test drivers
	add image option instead of pdf
	test image printing
	language EN/DE
	pricing
	keep options between visits
**/

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
	PrintJobs map[string][]string
	Expire    time.Time
	SendJob   bool
	Cancel    bool
}

type PrintJob struct {
	Title   string
	Printer string
	Copies  int
	User    string
	Price   int
	Pages   int
}

var printerAmount int
var printerNames []string
var printerFlags []uint //saves options as flags see CUPS source code for more informations, relevant ones are above. Look in cups.h

var sessions = make([]*Session, 0)
var lock sync.Mutex

func setupRoutes() {
	fileServer := http.FileServer(http.Dir("./static"))

	http.HandleFunc("/", showPrintPage)
	http.HandleFunc("/jobs", showJobsPage)
	http.Handle("/static/", http.StripPrefix("/static/", fileServer))

	http.HandleFunc("/print", print)
	http.HandleFunc("/cancel-print", cancelPrint)
	http.HandleFunc("/cancel-current-print", cancelCurrentPrint)
	http.HandleFunc("/info-prints", infoPrints)
	http.HandleFunc("/info-all-prints", infoAllPrints)
}

func showPrintPage(w http.ResponseWriter, r *http.Request) {
	log.Printf("Show Print Page...\n")

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

	cookie, err := r.Cookie("session_token")
	var session *Session
	if err == nil {
		log.Println(err, cookie)
		session, _ = getSession(cookie.Value)
	}

	if session == nil {
		sessionToken := uuid.NewString()
		expiresAt := time.Now().Add(24 * time.Hour)
		session = &Session{sessionToken, "", "", make(map[string][]string, 0), expiresAt, false, false}
		addSession(session)

		http.SetCookie(w, &http.Cookie{
			Name:    "session_token",
			Value:   sessionToken,
			Expires: expiresAt,
		})
	}

	templates.Lookup("doc").Execute(w, context) //Add Printer List to choose from
}

func showJobsPage(w http.ResponseWriter, r *http.Request) {
	log.Printf("Show Job Page...\n")

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

// Get document and save locally then execute printcli with all print settings
func print(w http.ResponseWriter, r *http.Request) {
	log.Printf("Printing Document...\n")

	cookie, err := r.Cookie("session_token")
	var session *Session
	if err == nil {
		session, _ = getSession(cookie.Value)
	}
	if session == nil {
		log.Println(sessions)
		w.WriteHeader(403)
		return
	}

	if (*session).Username == "" {
		(*session).Username = r.FormValue("username")
		(*session).Password = r.FormValue("password")
	}

	setSendingStatus(session)

	var buf bytes.Buffer
	file, header, err := r.FormFile("filename")
	if checkError(err) {
		return
	}

	defer file.Close()
	name := header.Filename

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
	log.Printf("Done!")
	stat, _ := f.Stat()
	path, _ := filepath.Abs(name)
	log.Printf("Size: %d; Mode: %x; Sys: %x; Path: %s", stat.Size(), stat.Mode(), stat.Sys(), path)

	log.Printf("%s %s %s %s %s %s %s\n", r.FormValue("page numbers"), r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"),
		r.FormValue("res"), r.FormValue("pages per sheet"), r.FormValue("scale"))

	var pageSelection = "All"
	if r.FormValue("page numbers") != "" {
		pageSelection = r.FormValue("page numbers")
	}

	cmd := exec.Command("./cupscli", "-print", r.FormValue("printers"), name, name, r.FormValue("username"), r.FormValue("password"),
		pageSelection, r.FormValue("copy number"), r.FormValue("color"), r.FormValue("sides"), r.FormValue("res"),
		r.FormValue("pages per sheet"), r.FormValue("scale"))

	info, err := cmd.Output()
	if checkError(err) {
		return
	}

	log.Print(string(info))

	err = os.Remove(name)
	checkError(err)

	infos := strings.Split(string(info), "\n")
	var jobID = ""
	for i := 0; i < len(infos); i++ {
		if strings.HasPrefix(infos[i], "Print-Job: ") {
			jobID = infos[i][11:]
		}
	}
	if jobID == "" {
		http.Redirect(w, r, "/jobs", http.StatusSeeOther)
		return
	}
	/*
		price := 0;
		if (r.FormValue("color") == )

		data := PrintJob{Title: name, Printer: r.FormValue("printers"), Copies: r.FormValue("copy number"), User: r.FormValue("username"), Price: , Pages: }
		data.Title = name

		data.Set("surname", "bar")

		client := &http.Client{}
		intraRequest, _ := http.NewRequest(http.MethodPost, "localhost", ) // URL-encoded payload
		intraRequest.Header.Add("Content-Type", "application/json")

		resp, _ := client.Do(r)
		fmt.Println(resp.Status)*/

	if jobs, ok := session.PrintJobs[r.FormValue("printers")]; ok {
		jobs = append(jobs, jobID)
		session.PrintJobs[r.FormValue("printers")] = jobs
	} else {
		session.PrintJobs[r.FormValue("printers")] = append(session.PrintJobs[r.FormValue("printers")], jobID)
	}
	checkCancelation(session, r.FormValue("printers"), jobID)
	http.Redirect(w, r, "/jobs", http.StatusSeeOther)
}

func infoPrints(w http.ResponseWriter, r *http.Request) {
	log.Printf("Info of Prints...\n")

	var printJobs []PrintingJobs

	err := json.Unmarshal([]byte(r.FormValue("printers")), &printJobs)
	if err != nil {
		log.Println(err)
		w.WriteHeader(400)
		return
	}
	length := len(printJobs)

	printerArgs := make([]string, 2+2*length)
	printerArgs[0] = "-info"
	printerArgs[1] = fmt.Sprint(length)

	for i := 0; i < length; i++ {
		printerArgs[i*2+2] = printJobs[i].Printer
		s, _ := json.Marshal(printJobs[i].Jobs)
		printerArgs[i*2+3] = strings.Trim(string(s), "[]")
	}

	cmd := exec.Command("./cupscli", printerArgs...)
	infos, err := cmd.Output()
	if checkError(err) {
		return
	}

	fmt.Fprint(w, string(infos))
	log.Print(string(infos))
}

func infoAllPrints(w http.ResponseWriter, r *http.Request) {
	log.Printf("Info of all Prints...\n")

	cookie, err := r.Cookie("session_token")
	log.Printf("%s %s\n", cookie, err)
	log.Println(sessions)
	if err == nil {
		session, e := getSession(cookie.Value)
		if e != -1 {
			log.Printf("%s %d\n", session.Session, e)

			length := len(session.PrintJobs)
			printerArgs := make([]string, length*2+2)
			printerArgs[0] = "-info"
			printerArgs[1] = fmt.Sprint(length)
			i := 2
			for printer, jobs := range session.PrintJobs {
				printerArgs[i] = printer
				s, _ := json.Marshal(jobs)
				re, _ := regexp.Compile(`[\"\[\]]`)
				printerArgs[i+1] = re.ReplaceAllString(string(s), "")
				i += 2
			}
			log.Println(printerArgs)
			cmd := exec.Command("./cupscli", printerArgs...)
			infos, err := cmd.Output()
			log.Println("Output: " + string(infos))

			if checkError(err) {
				w.WriteHeader(400)
				return
			}

			fmt.Fprint(w, string(infos))
			return
		}
	}
	w.WriteHeader(440)
}

func cancelPrint(w http.ResponseWriter, r *http.Request) {
	log.Printf("Canceling Print...\n")

	cookie, err := r.Cookie("session_token")
	if err == nil {
		session, e := getSession(cookie.Value)
		if e != -1 {
			infos, err := cancelJob(r.FormValue("printers"), session.Username, session.Password, r.FormValue("jobID"))
			if checkError(err) {
				w.WriteHeader(400)
				return
			}

			if strings.Contains(string(infos), "Cancel succeeded") {
				fmt.Fprintf(w, "Druckauftrag abgebrochen\n")
			} else {
				fmt.Fprintf(w, "Druckauftrag konnte nicht abgebrochen werden\n")
			}
			log.Print(string(infos))
			return
		}
	}
	w.WriteHeader(440)
}

func cancelCurrentPrint(w http.ResponseWriter, r *http.Request) {
	log.Printf("Canceling Print...\n")

	cookie, err := r.Cookie("session_token")
	if err == nil {
		session, e := getSession(cookie.Value)
		if e != -1 {
			if checkSending(session) {
				fmt.Fprintf(w, "Druckauftrag wird abgebrochen\n")
				return
			}

			infos, err := cancelJob(r.FormValue("printers"), session.Username, session.Password, r.FormValue("jobID"))
			if checkError(err) {
				w.WriteHeader(400)
				return
			}

			if strings.Contains(string(infos), "Cancel succeeded") {
				fmt.Fprintf(w, "Druckauftrag abgebrochen\n")
			} else {
				fmt.Fprintf(w, "Druckauftrag konnte nicht abgebrochen werden\n")
			}
			log.Print(string(infos))
			return
		}
	}
	w.WriteHeader(440)
}

// Get printer amount of last line and save names and available printer options in
// printerNames and printerFlags
func getPrinterInformations(printerInfos string) {
	splittedInfos := strings.Split(printerInfos, "\n")
	log.Printf("All Printer Info: %s\n", printerInfos)
	lastIdx := len(splittedInfos) - 2
	if lastIdx <= 0 {
		log.Fatal("Couldnt find any Printers")
	}

	if strings.HasPrefix(splittedInfos[lastIdx], "Printer Amount:") {
		var err error
		printerAmount, err = strconv.Atoi(splittedInfos[lastIdx][16:])
		checkError(err)

		printerNames = make([]string, printerAmount)
		printerFlags = make([]uint, printerAmount)

		var printerIdx = -1

		for i := 0; i < lastIdx; i++ {
			if strings.HasPrefix(splittedInfos[i], "Printer:") {
				printerIdx++
				printerNames[printerIdx] = splittedInfos[i][9:]
				log.Println(printerNames[printerIdx])
			} else if strings.HasPrefix(splittedInfos[i], "Printer-Flags:") {
				flags, err := strconv.ParseUint(splittedInfos[i][15:], 10, 32)
				printerFlags[printerIdx] = uint(flags)
				log.Println(flags)
				checkError(err)
			}
		}
	}
}

func gatherAllPrinterInformations() {
	log.Printf("Get Printer Informations...\n")

	cmd := exec.Command("./cupscli", "-infos")
	infos, err := cmd.Output()
	checkError(err)
	getPrinterInformations(string(infos[:]))
}

func main() {
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	defer func() {
		if r := recover(); r != nil {
			err := errors.Errorf("Panic occurred: %v", r)
			log.Printf("%+v\n", err)
		}
	}()

	gatherAllPrinterInformations()

	setupRoutes()
	//checkFatal(http.ListenAndServe(":36657", nil))
	checkFatal(http.ListenAndServeTLS(":36657", "./certs/web-print.hfk.whka.de.crt", "./certs/web-print.hfk.whka.de.key", nil))
	log.Printf("Stopping Server Gracefully...\n")
}

func checkFatal(e error) {
	if e != nil {
		wrappedErr := errors.Wrap(e, "An error occurred in an imported library")
		log.Printf("Crash: %+v\n", wrappedErr)
		os.Exit(-1)
	}
}

func checkError(e error) bool {
	if e != nil {
		wrappedErr := errors.Wrap(e, "An error occurred in an imported library")
		log.Printf("%+v\n", wrappedErr)
		return true
	}
	return false
}

func addSession(session *Session) {
	lock.Lock()
	defer lock.Unlock()
	sessions = append(sessions, session)
}

func getSession(session string) (s *Session, e int) {
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

func setSendingStatus(session *Session) {
	lock.Lock()
	defer lock.Unlock()
	(*session).SendJob = true
}

func checkSending(session *Session) bool {
	lock.Lock()
	defer lock.Unlock()
	if (*session).SendJob {
		(*session).Cancel = true
	}
	return (*session).SendJob
}

func checkCancelation(session *Session, printers string, jobID string) {
	lock.Lock()
	defer lock.Unlock()
	if (*session).Cancel {
		infos, _ := cancelJob(printers, (*session).Username, (*session).Password, jobID)
		log.Println(string(infos))
	}
	(*session).SendJob = false
	(*session).Cancel = false
}

func cancelJob(printers string, username string, password string, jobID string) ([]byte, error) {
	cmd := exec.Command("./cupscli", "-cancel", printers, username, password, jobID)
	return cmd.Output()
}

func (s Session) isExpired() bool {
	return s.Expire.Before(time.Now())
}
