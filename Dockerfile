# Minimal base image to compile cupscli and the main app
FROM golang:buster AS compile
WORKDIR /go/src/

# Install build dependencies
RUN apt update -y && apt install -y libcups2-dev

# Copy source files
COPY . /go/src/

# Build cupscli to artefact /go/bin/cupscli
RUN gcc -O3 -o /go/bin/cupscli CupsAPI/cupscli.c -lcups
# Build web-print to artefact /go/src/
RUN CGO_ENABLED=0 go build -v -o /go/bin/web-print

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

# Run the app
EXPOSE 8080
EXPOSE 631
CMD echo "Container started at $(date)" && cupsd && ./web-print 

