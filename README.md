# Web-Print

Easy printing by uploading PDF's

Backend Server: GO 


# Links & Stuff
Using the CUPS Api to communicate with the printer.
https://www.cups.org/doc/cupspm.html

# Build the CupsCLI
gcc -o ../cupscli `cups-config --cflags` cupscli.c `cups-config --libs`
