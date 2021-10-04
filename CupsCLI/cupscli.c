#include <stdio.h>
#include <stdlib.h>
#include <cups/cups.h>

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

int getPrinterInfos(PrinterInfo *printerInfo, unsigned flags, cups_dest_t *dest)
{
	for (int i = 0; i < printerInfo->printersToIgnoreAmount; ++i)
	{
		if (strcmp(dest->name, printerInfo->printersToIgnore[i]) == 0) {
			return 1;
		}
	}
	printerInfo->printerCount++;
	printf("Printer: %s\n", dest->name);

	const char *model = cupsGetOption("printer-type", dest->num_options, dest->options);
	printf("Printer-Flags: %s\n", model);

	return 1;
}

int getPrinterDest(PrinterDest *printerDest, unsigned flags, cups_dest_t *dest)
{
	printerDest->numDests = cupsCopyDest(dest, printerDest->numDests, &(printerDest->dests));
	return 1;
}

const char *getResourceFromURI(const char* uri) 
{
	int length = strlen(uri);
	int slashes = 0;
	int i = 0;

	for (; i < length; ++i)
	{
		if (uri[i] == '/') {
			slashes++;
		}

		if (slashes == 3) {
			break;
		}
	}
	char* resource = (char*)malloc(length - i);
	memcpy(resource, uri, length - i);

	return resource;
}

void addRanges(ipp_t *request, char* ranges)
{

	if (strcmp(ranges, "All") == 0) {
		return;
	}

	char *range, *min, *max;
	uint8_t i;
	for (i = 1, range = strtok(ranges,","); range != NULL; range = strtok(NULL,","), i++) {
		min = strtok(range, "-");
		max = strtok(NULL, "-");
		if (max == NULL) {
			ippAddRange(request, IPP_TAG_OPERATION, "page-ranges", atoi(min), atoi(min));
		} else {
			ippAddRange(request, IPP_TAG_OPERATION, "page-ranges", atoi(min), atoi(max));
		}
	    //printf("Output%u=%s;\n", i, p);
	}
}


void printDocument(cups_dest_t *dest, char** options)
{
	const char *filetype = "application/pdf";
	http_t *http;
	ipp_t *request, *response;

	const char *printerUri = cupsGetOption("device-uri", dest->num_options, dest->options);
	const char *resource = getResourceFromURI(printerUri); 

	http = httpConnect2("fry", 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);

	request = ippNewRequest(IPP_OP_CREATE_JOB);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, options[1]);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "job-name", NULL, options[0]);
	addRanges(request, options[2]);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "copies", atoi(options[3]));
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "print-color-mode", NULL, options[4]);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "sides", NULL, options[5]);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_ENUM, "print-quality", atoi(options[6]));
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_ENUM, "orientation-requested", atoi(options[7]));

	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_MIMETYPE, "document-format", NULL, filetype);
	ippAddBoolean(request, IPP_TAG_OPERATION, "last-document", 1);

	response = cupsDoFileRequest(http, request, resource, options[0]);


	int jobID = ippGetInteger(ippFindAttribute(response, "job-id", IPP_TAG_INTEGER), 0);
	printf("Print-Job: %d\n", jobID);
	ippDelete(response);


	printf("Send Document\n");
	request = ippNewRequest(IPP_OP_SEND_DOCUMENT);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "job-id", jobID);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, options[1]);

	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "job-name", NULL, options[0]);
	addRanges(request, options[2]);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "copies", atoi(options[3]));
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "print-color-mode", NULL, options[4]);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "sides", NULL, options[5]);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_ENUM, "print-quality", atoi(options[6]));
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_ENUM, "orientation-requested", atoi(options[7]));

	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_MIMETYPE, "document-format", NULL, filetype);
	ippAddBoolean(request, IPP_TAG_OPERATION, "last-document", 1);


    response = cupsDoFileRequest(http, request, resource, options[0]);
	ippDelete(response);
}

void infoPrint(cups_dest_t *dest, char* user, int jobID)
{
	http_t *http;
	ipp_t *request, *response;

	const char *printerUri = cupsGetOption("device-uri", dest->num_options, dest->options);
	const char *resource = getResourceFromURI(printerUri); 

	http = httpConnect2("fry", 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);

	request = ippNewRequest(IPP_OP_GET_JOB_ATTRIBUTES);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddInteger(request, IPP_TAG_OPERATION, IPP_TAG_INTEGER, "job-id", jobID);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, user);


    response = cupsDoRequest(http, request, resource);
    ipp_attribute_t *attr;

	if ((attr = ippFindAttribute(response, "job-state", IPP_TAG_ENUM)) != NULL)
	{
	  	printf("job-state: %d\n", ippGetInteger(attr, 0));
	}
	else
	  puts("job-state: unknown");

	if ((attr = ippFindAttribute(response, "job-state-reasons", IPP_TAG_KEYWORD)) != NULL)
	{
		int i, count = ippGetCount(attr);

		for (i = 0; i < count; i ++)
	    	printf("job-state-reason: %s\n", ippGetString(attr, i, NULL));
	}

	ippDelete(response);
}

void cancelPrint(cups_dest_t *dest, char* user, int jobID)
{
	const char *filetype = "application/pdf";
	http_t *http;
	ipp_t *request;

	const char *printerUri = cupsGetOption("device-uri", dest->num_options, dest->options);
	const char *resource = getResourceFromURI(printerUri); 

	http = httpConnect2("fry", 631, NULL, AF_UNSPEC, HTTP_ENCRYPTION_IF_REQUESTED, 1, 30000, NULL);

	request = ippNewRequest(IPP_OP_GET_JOB_ATTRIBUTES);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_URI, "printer-uri", NULL, printerUri);
	ippAddString(request, IPP_TAG_OPERATION, IPP_TAG_NAME, "requesting-user-name", NULL, user);

    if (cupsCancelDestJob(http, dest, jobID) == IPP_STATUS_OK) {
    	printf("Cancel succeeded\n");
    } else {
    	printf("Cancel failed\n");
    }
}

int running = 1;

typedef struct
{
	const char* user;
  	const char* password;
} User;


const char *getPassword(const char *prompt, http_t *http, const char *method, const char *resource, User *userData) 
{

	printf("Checking Authentication %s\n", userData->user);
	cupsSetUser(userData->user);

	return userData->password;
}

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

int main(int argc, char **argv)
{
	if (argc > 1) {
		if (strcmp(argv[1], "-infos") == 0) { //Get printer infos
			PrinterInfo printerInfo = {0, 0, NULL};
			getPrinterIgnoreList(&printerInfo);

			cupsEnumDests(CUPS_DEST_FLAGS_NONE, 1000, NULL, 0, 0, (cups_dest_cb_t)getPrinterInfos, &printerInfo);
			printf("Printer Amount: %d\n", printerInfo.printerCount);

			free(printerInfo.printersToIgnore);

		//Send print job with args 	'printer name', 'title', 'file location', 'user name', 'password', 'page selection', 'amount of copies',
		//							'color', 'one/two-sided', 'quality', 'orientation' 	
		} else if (strcmp(argv[1], "-print") == 0) {

			User userData = {argv[5], argv[6]};
			cupsSetPasswordCB2((cups_password_cb2_t)getPassword, &userData);		

			PrinterDest dests = {0, NULL};
			cupsEnumDests(CUPS_DEST_FLAGS_NONE, 1000, NULL, 0, 0, (cups_dest_cb_t)getPrinterDest, &dests);
			cups_dest_t* printerDest = cupsGetDest(argv[2], NULL, dests.numDests, dests.dests);

			char* options[8] = {argv[4], argv[5], argv[7], argv[8], argv[9], argv[10], argv[11], argv[12]};
			printDocument(printerDest, options);

		} else if (strcmp(argv[1], "-info") == 0) { //get print job info with args 'printer name', 'user name', 'password', 'job id'
			User userData = {argv[3], argv[4]};
			cupsSetPasswordCB2((cups_password_cb2_t)getPassword, &userData);

			PrinterDest dests = {0, NULL};
			cupsEnumDests(CUPS_DEST_FLAGS_NONE, 1000, NULL, 0, 0, (cups_dest_cb_t)getPrinterDest, &dests);
			cups_dest_t* printerDest = cupsGetDest(argv[2], NULL, dests.numDests, dests.dests);

			infoPrint(printerDest, argv[3], atoi(argv[5]));

		} else if (strcmp(argv[1], "-cancel") == 0) { //cancel print job with args 'printer name', 'user name', 'password', 'job id'
			User userData = {argv[3], argv[4]};
			cupsSetPasswordCB2((cups_password_cb2_t)getPassword, &userData);		

			PrinterDest dests = {0, NULL};
			cupsEnumDests(CUPS_DEST_FLAGS_NONE, 1000, NULL, 0, 0, (cups_dest_cb_t)getPrinterDest, &dests);
			cups_dest_t* printerDest = cupsGetDest(argv[2], NULL, dests.numDests, dests.dests);

			cancelPrint(printerDest, argv[3], atoi(argv[5]));
		}
	}
	return 0;
}