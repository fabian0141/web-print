# Minimal base image to compile cupscli and the main app
FROM golang AS compile
WORKDIR /go/src/

# Install build dependencies
RUN apt update -y && apt install -y libcups2-dev

# Copy source files
COPY . /go/src/

# Build cupscli to artefact /go/bin/cupscli
RUN gcc -o /go/bin/cupscli CupsCLI/cupscli.c -lcups
# Build web-print to artefact /go/src/
RUN go build -v -o /go/bin/web-print

# ------------------------------------------------------

# Main app
FROM ydkn/cups
WORKDIR /app/

# Install runtime dependencies
RUN apt update -y && apt install -y libcups2-dev

# Copy artefacts from compile stage
COPY --from=compile /go/bin/ .
# Copy conf
COPY cupscli.conf .
# Copy statics
COPY static/ ./static/

# Set password for root to modify cups via webinterface
# TODO: Change and docker secret
RUN echo 'root:cupsadmin' | chpasswd

# Run the app
EXPOSE 8080
EXPOSE 631
CMD cupsd && ./web-print 

