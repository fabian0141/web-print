function getStoredInt(key, defaultVal) {
    if(localStorage.getItem(key) === null){
        return defaultVal;
    }else {
        return parseInt(localStorage.getItem(key));
    }
}

function getStoredString(key, defaultVal) {
    if(localStorage.getItem(key) === null){
        return defaultVal;
    }else {
        return localStorage.getItem(key);
    }
}

function getSessionInt(key, defaultVal) {
    if(sessionStorage.getItem(key) === null){
        return defaultVal;
    }else {
        return parseInt(sessionStorage.getItem(key));
    }
}

function getSessionString(key, defaultVal) {
    if(sessionStorage.getItem(key) === null){
        return defaultVal;
    }else {
        return sessionStorage.getItem(key);
    }
}

export { getStoredInt, getStoredString, getSessionInt, getSessionString };