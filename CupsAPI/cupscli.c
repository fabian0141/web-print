#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <cups/cups.h>
#include <cups/http.h>

// ============================================================
// USEFUL COMMANDS
// ============================================================
// gcc -o cupscli `cups-config --cflags` CupsAPI/cupscli.c `cups-config --libs`
//zuper kommand: ipptool -tv ipp://localhost/jobs/{id} get-job-attributes.test


// ============================================================
// CONFIG
// ============================================================
#define MAX_TRIES 3
#define FD_FRONTEND 3
//const char *domainname = "100.118.21.226";
//const char *domainname = "localhost";
//const char *domainname = "fry";

// ============================================================
// STRUCTS
// ============================================================
typedef struct {
    char *command;     // -infos, -print, -info, -cancel, --help
    char *printer;
    char *title;
    char *file;
    char *username;
    char *password;
    char *ranges;
    char *color;
    char *sides;
    char *scale;
    int copies;
    int quality;
    int numberUp;
    int jobId;
    char *domain;
} PrintArgs;

typedef struct {
    const char* user;
    const char* password;
    int tries;
} User;

typedef struct {
    int *starts; //First Pages
	int *ends;	//Last Pages (included)
    size_t size;
    size_t capacity;
} Ranges;

typedef struct
{
	int numDests;
  	cups_dest_t *dests;
} PrinterDest;

typedef struct
{
	int printerCount;
	int printersToIgnoreAmount;
  	char **printersToIgnore;
} PrinterInfo;

// ============================================================
// LOGGING
// ============================================================

void printError(const char *fmt, ...) {
    va_list args;
    va_start(args, fmt);
    fprintf(stderr, "[ERROR] ");
    vfprintf(stderr, fmt, args);
    va_end(args);
}

void printInfo(const char *fmt, ...) {
	va_list args;
	va_start(args, fmt);
	fprintf(stdout, "[INFO] ");
	vfprintf(stdout, fmt, args);
	fprintf(stdout, "\n");
	va_end(args);
}

void printHelp(const char *fmt, ...) {
	va_list args;
	va_start(args, fmt);
	vfprintf(stdout, fmt, args);
	va_end(args);
}

void printResult(const char *fmt, ...) {
	va_list args;
	va_start(args, fmt);
	vfprintf(stdout, fmt, args);
	dprintf(FD_FRONTEND, fmt, args);
	va_end(args);
}

// ============================================================
// USAGE / HELP
// ============================================================
void printUsage() {
    printHelp("\nUsage: cupscli <command> [options]\n\n");
    printHelp("Commands:\n");
    printHelp("  -infos                Get printer information.\n");
    printHelp("  -print                Send a print job.\n");
    printHelp("  -info                 Get job information.\n");
    printHelp("  -cancel               Cancel a print job.\n");
    printHelp("  --help                Show this help message.\n\n");

    printHelp("Common Options:\n");
    printHelp("  -domain <host>        CUPS server (default: localhost).\n");
    printHelp("  -printer <name>       Printer name.\n");
    printHelp("  -username <user>      Username for authentication.\n");
    printHelp("  -password <pass>      Password for authentication.\n");

    printHelp("\nOptions for -print:\n");
    printHelp("  -file <path>          File to print.\n");
    printHelp("  -title <string>       Print job title.\n");
    printHelp("  -ranges <N-M,...>     Page ranges (e.g. 1-3,5).\n");
    printHelp("  -copies <num>         Number of copies.\n");
    printHelp("  -color <mode>         Color mode (e.g. 'color' or 'monochrome').\n");
    printHelp("  -sides <mode>         Duplex mode (e.g. 'one-sided', 'two-sided-long-edge').\n");
    printHelp("  -quality <dpi>        Print quality (e.g. 300).\n");
    printHelp("  -numberup <num>       Pages per sheet.\n");
    printHelp("  -scale <mode>         Scaling (e.g. 'fit').\n");

    printHelp("\nOptions for -info and -cancel:\n");
    printHelp("  -jobid <id>           Job ID to query or cancel.\n");

    printHelp("\nExamples:\n");
    printHelp("  cupscli -infos -domain localhost\n");
    printHelp("  cupscli -print -printer HP -file doc.pdf -title \"Report\" -username alice -password 123 -copies 2 -color color\n");
    printHelp("  cupscli -info -printer HP -jobid 42 -domain localhost\n");
    printHelp("  cupscli -cancel -printer HP -username alice -password 123 -jobid 42\n\n");
}

// ============================================================
// ARG PARSER
// ============================================================
void parseArgs(int argc, char **argv, PrintArgs *args) {
    memset(args, 0, sizeof(PrintArgs));
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-infos") == 0 || strcmp(argv[i], "-print") == 0 ||
            strcmp(argv[i], "-info") == 0 || strcmp(argv[i], "-cancel") == 0 ||
            strcmp(argv[i], "--help") == 0) {
            args->command = argv[i];
        } else if (strcmp(argv[i], "-printer") == 0 && i + 1 < argc) {
            args->printer = argv[++i];
        } else if (strcmp(argv[i], "-title") == 0 && i + 1 < argc) {
            args->title = argv[++i];
        } else if (strcmp(argv[i], "-file") == 0 && i + 1 < argc) {
            args->file = argv[++i];
        } else if (strcmp(argv[i], "-username") == 0 && i + 1 < argc) {
            args->username = argv[++i];
        } else if (strcmp(argv[i], "-password") == 0 && i + 1 < argc) {
            args->password = argv[++i];
        } else if (strcmp(argv[i], "-ranges") == 0 && i + 1 < argc) {
            args->ranges = argv[++i];
        } else if (strcmp(argv[i], "-copies") == 0 && i + 1 < argc) {
            args->copies = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-color") == 0 && i + 1 < argc) {
            args->color = argv[++i];
        } else if (strcmp(argv[i], "-sides") == 0 && i + 1 < argc) {
            args->sides = argv[++i];
        } else if (strcmp(argv[i], "-quality") == 0 && i + 1 < argc) {
            args->quality = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-numberup") == 0 && i + 1 < argc) {
            args->numberUp = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-scale") == 0 && i + 1 < argc) {
            args->scale = argv[++i];
        } else if (strcmp(argv[i], "-jobid") == 0 && i + 1 < argc) {
            args->jobId = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-domain") == 0 && i + 1 < argc) {
            args->domain = argv[++i];
        } else {
			printError("Unknown argument: %s\n", argv[i]);
			printUsage();
			exit(1);
		}
    }
    if (!args->domain) {
        args->domain = "localhost"; // default
    }
}

// ============================================================
// AUTH
// ============================================================
const char *getPassword(const char *prompt, http_t *http, const char *method, const char *resource, User *userData) {
    if (userData->tries <= 0) {
        printError("No more authentication attempts left.\n");
        return NULL;
    }
    userData->tries--;
    cupsSetUser(userData->user);
    printError("Authenticating as %s (tries left: %d)\n", userData->user, userData->tries);
    return userData->password;
}

// ============================================================
// PAGE RANGES LIST
// ============================================================

// Function to initialize the dynamic array
void initRanges(Ranges *array, size_t initialCapacity) {
    array->starts = malloc(initialCapacity * sizeof(int));
    array->ends = malloc(initialCapacity * sizeof(int));
    array->size = 0;
    array->capacity = initialCapacity;
}

// Function to add a new element to the array
void addRange(Ranges *array, int start, int end) {
    if (array->size == array->capacity) {
        array->capacity *= 2;
        array->starts = realloc(array->starts, array->capacity * sizeof(int));
        array->ends = realloc(array->ends, array->capacity * sizeof(int));
    }
    array->starts[array->size] = start;
	array->ends[array->size++] = end;
}

void printArray(const Ranges *array) {
    for (size_t i = 0; i < array->size; i++) {
        printResult("Range %d, %d\n", array->starts[i], array->ends[i]);
    }
}

// Function to free the allocated memory
void freeRanges(Ranges *array) {
    free(array->starts);
    free(array->ends);

    array->starts = NULL;
    array->ends = NULL;

    array->size = 0;
    array->capacity = 0;
}

// ============================================================
// PRINTER HELPER FUNCTIONS
// ============================================================

void getPrinterIgnoreList(PrinterInfo *printerInfo) 
{
	FILE * fp;
    char * line = NULL;
    size_t len = 0;
    ssize_t read = 0;

    fp = fopen("cupscli.conf", "r");
    if (fp == NULL)
        exit(EXIT_FAILURE);

	int amount = 0;
    while ((read = getline(&line, &len, fp)) != -1) {
        if (len > 0 && strncmp(line, "//", 2) != 0) {

        	amount++;
        }
    }

    printerInfo->printersToIgnoreAmount = amount;
    char** printerList = (char**)malloc(sizeof(char*) * amount);

	int idx = 0;
	fseek(fp, 0, SEEK_SET);

    while ((read = getline(&line, &len, fp)) != -1) {
        if (len > 0 && strncmp(line, "//", 2) != 0) {

        	printerList[idx] = (char*)malloc(sizeof(char) *read);
        	strncpy(printerList[idx++], line, read - 1);
        }
    }
    printerInfo->printersToIgnore = printerList;

    fclose(fp);
    free(line);
}

int isIgnored(cups_dest_t* dest, PrinterInfo* printerInfo) {
	for (int i = 0; i < printerInfo->printersToIgnoreAmount; ++i)
	{
		if (strcmp(dest->name, printerInfo->printersToIgnore[i]) == 0) {
			printResult("%s %s\n", dest->name, printerInfo->printersToIgnore[i]);
			return 1;
		}
	}
	return 0;
}

void addRanges(ipp_t *request, char* rangesStr)
{

	if (strcmp(rangesStr, "All") == 0) {
		return;
	}

	char *range, *start, *end;
	Ranges ranges;
	initRanges(&ranges, 10);

	for (range = strtok_r(rangesStr, ",", &rangesStr); range != NULL; range = strtok_r(rangesStr, ",", &rangesStr)) {
		start = strtok(range, "-");
		end = strtok(NULL, "-");
		if (end == NULL) {
			addRange(&ranges, atoi(start), atoi(start));
			//ippAddRange(request, IPP_TAG_DOCUMENT, "page-ranges", atoi(start), atoi(start));
			printResult("Range: %d\n", atoi(start));
		} else {
			addRange(&ranges, atoi(start), atoi(end));
			//ippAddRange(request, IPP_TAG_DOCUMENT, "page-ranges", atoi(start), atoi(end));
			printResult("Range: %d %d\n", atoi(start), atoi(end));
		}
	}
	printArray(&ranges);
	ippAddRanges(request, IPP_TAG_JOB, "page-ranges", ranges.size, ranges.starts, ranges.ends);


	freeRanges(&ranges);
}

// ============================================================
// PRINTER COMMANDS
// ============================================================
int getPrinterNamesAndFlags(const char *domainname) {
    printInfo("Getting printer info from %s...\n", domainname);
    
	PrinterInfo printerInfo = {0, 0, NULL};
	getPrinterIgnoreList(&printerInfo);

	http_t* http = httpConnect2(domainname, 631, NULL, AF_INET, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);
	if (http == NULL) {
	    printError("httpConnect2 failed: %s\n", cupsLastErrorString());
		return -1;
	}

	cups_dest_t* dests;
	int count = cupsGetDests2(http, &dests);
	for (int i = 0; i < count; i++) {
		cups_dest_t dest = dests[i];
		if (isIgnored(&dest, &printerInfo)) {
			continue;
		}

		const char *flags = cupsGetOption("printer-type", dest.num_options, dest.options);
		printResult("Printer: %s\n", dest.name);
		printResult("Printer-Flags: %s\n", flags);
		printerInfo.printerCount++;
	}

	printResult("Printer Amount: %d\n", printerInfo.printerCount);
	for (int i = 0; i < printerInfo.printersToIgnoreAmount; i++) {
    	free(printerInfo.printersToIgnore[i]);
	}
	free(printerInfo.printersToIgnore);
	return 0;
}

void printDocument(PrintArgs *args) {
    printInfo("Sending print job:\n");
    /*printHelp("   Printer: %s\n", args->printer);
    printHelp("   File: %s\n", args->file);
    printHelp("   Title: %s\n", args->title);
    printHelp("   User: %s\n", args->username);
    printHelp("   Copies: %d\n", args->copies);
    printHelp("   Color: %s\n", args->color);
    printHelp("   Sides: %s\n", args->sides);
    printHelp("   Quality: %d\n", args->quality);
    printHelp("   NumberUp: %d\n", args->numberUp);
    printHelp("   Scale: %s\n", args->scale);*/

	int tries = 5;  //Necessary?
	int jobID = 0;
	const char *filetype = "application/pdf";

	ipp_t *request, *response;
	//const char *printerUri = cupsGetOption("device-uri", dest->num_options, dest->options);
	char printerUri[100];
	sprintf(printerUri, "ipp://%s:631/printers/%s", args->domain, args->printer);

	char resourcePath[100] = "/printers/";
	strcat(resourcePath, args->printer);
	
	http_t *http;

	while (jobID == 0 && tries-- > 0)
	{
		http = httpConnect2(args->domain, 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);
		request = ippNewRequest(IPP_OP_PRINT_JOB);

		ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
		ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, args->username);
		ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "job-name", NULL, args->title);
			//printResult("Ran: %s %s %s %s %s\n", args->username, args., args[3], args[4], args[6]);
		addRanges(request, args->ranges);
		ippAddInteger(request, IPP_TAG_DOCUMENT, IPP_TAG_INTEGER, "copies", args->copies);
		ippAddString(request, IPP_TAG_DOCUMENT, IPP_TAG_KEYWORD, "print-color-mode", NULL, args->color);
		ippAddString(request, IPP_TAG_DOCUMENT, IPP_TAG_KEYWORD, "sides", NULL, args->sides);
		//ippAddInteger(request, IPP_TAG_JOB, IPP_TAG_ENUM, "print-quality", args.quality);
		ippAddResolution(request, IPP_TAG_DOCUMENT, "printer-resolution", IPP_RES_PER_INCH, args->quality, args->quality); //Test this
		ippAddInteger(request, IPP_TAG_DOCUMENT, IPP_TAG_INTEGER, "number-up", args->numberUp);
		ippAddString(request, IPP_TAG_DOCUMENT, IPP_TAG_KEYWORD, "media", NULL, "iso_a4_210x297mm");
		ippAddString(request, IPP_TAG_DOCUMENT, IPP_TAG_KEYWORD, "print-scaling", NULL, args->scale);

		ippAddString(request, IPP_TAG_DOCUMENT, IPP_TAG_MIMETYPE, "document-format", NULL, filetype);
		ippAddInteger(request, IPP_TAG_DOCUMENT, IPP_TAG_INTEGER, "document-number", 1);
		ippAddBoolean(request, IPP_TAG_DOCUMENT, "last-document", 1);

		response = cupsDoFileRequest(http, request, resourcePath, args->title);
		jobID = ippGetInteger(ippFindAttribute(response, "job-id", IPP_TAG_INTEGER), 0);
		if (jobID == 0) {
			printInfo("%s\n", ippErrorString(cupsLastError()));
			printInfo("CUPS does not return a job ID. Try: %d\n", tries);
		}
	}

	if (jobID == 0) {
		printError("%s\n", ippErrorString(cupsLastError()));
		printError("CUPS does not return a job ID. Try: %d\n", tries);
		return;
	}
	printResult("Print-Job: %d\n", jobID);
	ippDelete(response);
}

void requestJobInfo(PrintArgs *args) {

	printInfo("Getting job info from %s (jobId=%d, printer=%s)\n",
		   args->domain, args->jobId, args->printer);

	http_t *http;
	ipp_t *request, *response;
	char printerUri[100];
	sprintf(printerUri, "ipp://%s:631/printers/%s", args->domain, args->printer);

	char resourcePath[100] = "/printers/";
	strcat(resourcePath, args->printer);

	http = httpConnect2(args->domain, 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);

	request = ippNewRequest(IPP_OP_GET_JOB_ATTRIBUTES);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "job-id", args->jobId);

	response = cupsDoRequest(http, request, resourcePath);
	ipp_attribute_t *attr;
	if ((attr = ippFindAttribute(response, "job-state", IPP_TAG_ENUM)) != NULL)
	{
		int state = ippGetInteger(attr, 0);

        const char* name;
        if ((attr = ippFindAttribute(response, "job-name", IPP_TAG_NAME)) != NULL)
        {
            name = ippGetString(attr, 0, NULL);
        } else {
            name = "";
        }
        char dateStr[17];
        if ((attr = ippFindAttribute(response, "date-time-at-creation", IPP_TAG_DATE)) != NULL)
        {
            ipp_uchar_t* date = (ipp_uchar_t*)ippGetDate(attr, 0);
            sprintf(dateStr, "%02d.%02d.%d %02d:%02d", date[3], date[2], date[0] * 256 + date[1],(date[4] + 2) % 24, date[5]);
        }
		printResult("job-state: %d %d %s %s +%s\n", args->jobId, state, dateStr, args->printer, name);
	}
	else
	printResult("job-state: unknown");

	if ((attr = ippFindAttribute(response, "job-state-reasons", IPP_TAG_KEYWORD)) != NULL)
	{
		int i, count = ippGetCount(attr);

		for (i = 0; i < count; i ++)
			printResult("job-state-reason: %s\n", ippGetString(attr, i, NULL));
	}
	ippDelete(response);
}

void cancelPrint(PrintArgs *args) {
    printInfo("[INFO] Cancelling job %d on printer %s at %s (user=%s)\n",
           args->jobId, args->printer, args->domain, args->username);

	const char *filetype = "application/pdf";
	http_t *http;
	ipp_t *request;

	char printerUri[100];
	sprintf(printerUri, "ipp://%s:631/printers/%s", args->domain, args->printer);

	char resourcePath[100] = "/printers/";
	strcat(resourcePath, args->printer);

	http = httpConnect2(args->domain, 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);

	request = ippNewRequest(IPP_OP_CANCEL_JOB);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "job-id", args->jobId);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, args->username);

	ippDelete(cupsDoRequest(http, request, resourcePath));

	if (cupsLastError() > IPP_STATUS_OK_CONFLICTING)
    {
    	printError("Cancel failed: %s\n", ippErrorString(cupsLastError()));
    } else {
        printResult("Cancel succeeded: %d\n", args->jobId);
	}
}

// ============================================================
// MAIN
// ============================================================
int main(int argc, char **argv) {
    if (argc < 2) {
        printError("No command provided.\n");
        printUsage();
        return 1;
    }

    PrintArgs args;
    parseArgs(argc, argv, &args);

    if (strcmp(args.command, "--help") == 0) {
        printUsage();
        return 0;
    } else if (strcmp(args.command, "-infos") == 0) {
        return getPrinterNamesAndFlags(args.domain);
    } else if (strcmp(args.command, "-print") == 0) {
        if (!args.printer || !args.file || !args.username || !args.password) {
            printError("Missing required arguments for -print.\n");
            printUsage();
            return 1;
        }
        User userData = { args.username, args.password, MAX_TRIES };
        cupsSetPasswordCB2((cups_password_cb2_t)getPassword, &userData);
        printDocument(&args);
    } else if (strcmp(args.command, "-info") == 0) {
        if (!args.printer || !args.jobId) {
            printError("Missing required arguments for -info.\n");
            printUsage();
            return 1;
        }
        requestJobInfo(&args);
    } else if (strcmp(args.command, "-cancel") == 0) {
        if (!args.printer || !args.username || !args.password || !args.jobId) {
            printError("Missing required arguments for -cancel.\n");
            printUsage();
            return 1;
        }
        User userData = { args.username, args.password, MAX_TRIES };
        cupsSetPasswordCB2((cups_password_cb2_t)getPassword, &userData);
        cancelPrint(&args);
    } else {
        printError(stderr, "Unknown command: %s\n", args.command);
        printUsage();
        return 1;
    }

    return 0;
}
