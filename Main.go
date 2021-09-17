package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
)

func setupRoutes() {
	fileServer := http.FileServer(http.Dir("./static"))
	http.Handle("/", fileServer)
	http.HandleFunc("/print", print)
}

func print(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Printing Document...")
	var buf bytes.Buffer
	// in your case file would be fileupload
	file, header, err := r.FormFile("filename")
	if err != nil {
		panic(err)
	}
	defer file.Close()
	name := header.Filename
	fmt.Fprintf(w, "File name %s\n", name)

	io.Copy(&buf, file)

	contents := buf.String()
	// I reset the buffer in case I want to use it again
	// reduces memory allocations in more intense projects

	f, err := os.Create(name)

	if err != nil {
		log.Fatal(err)
	}

	defer f.Close()

	_, err2 := f.WriteString(contents)

	if err2 != nil {
		log.Fatal(err2)
	}
	buf.Reset()
	fmt.Fprintf(w, "Done!")

	cmd := exec.Command("lp", "-d", "ColorPrinterHFK", name)

	err = cmd.Run()

	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	fmt.Println("Hello World")
	setupRoutes()

	log.Fatal(http.ListenAndServe(":8080", nil))
}
