# Web-Print

Easy printing by uploading PDF's

# Links & Stuff
LPR - Command line printing  
https://www.cups.org/doc/options.html

# Build the CupsCLI
gcc -o ../cupscli `cups-config --cflags` cupscli.c `cups-config --libs`

