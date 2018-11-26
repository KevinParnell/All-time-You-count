// ==UserScript==
// @name        All-time (You) count
// @namespace   com.KevinParnell.alltimeyoucount
// @description All-time (You) count
// @author Kevin Parnell
// @version     1.3
// @match *://boards.4chan.org/*
// @match *://boards.4channel.org/*
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_listValues
// @grant       GM_deleteValue
// @run-at      document-end
// @updateURL   https://github.com/KevinParnell/All-time-You-count/raw/master/All-time_You_count.meta.js
// @downloadURL https://github.com/KevinParnell/All-time-You-count/raw/master/All-time_You_count.user.js
// ==/UserScript==

/** JSLint excludes */
/*jslint browser: true*/
/*global document, console, GM_setValue, GM_getValue, GM_listValues, GM_deleteValue, cloneInto, unsafeWindow */

/* WebStorm JSLint ticked:
 - uncapitalized constructors
 - missing 'use strict' pragma
 - many var statements
 */

/* Right margin: 160 */
var refreshTimer = setTimeout(refreshGui, 60000);

/** parse the posts already on the page before thread updater kicks in */
function parseOriginalPosts() {
    var tempAllPostsOnPage = document.getElementsByClassName('postContainer');
    postContainers = Array.prototype.slice.call(tempAllPostsOnPage); //convert from element list to javascript array
    postContainers.forEach(function (postContainer) {
        processPostContainer(postContainer);
    });
    refreshGui();
}

/** Listen to post updates from the thread updater for 4chan x v2 (loadletter) and v3 (ccd0 + ?) */
document.addEventListener('ThreadUpdate', function (e) {
    var evDetail = e.detail || e.wrappedJSObject.detail;
    var evDetailClone = typeof cloneInto === 'function' ? cloneInto(evDetail, unsafeWindow) : evDetail;

    //ignore if 404 event
    if (evDetail[404] === true) {
        return;
    }

    setTimeout(function () {
        evDetailClone.newPosts.forEach(function (post_board_nr) {
            var post_nr = post_board_nr.split('.')[1];
            var newPostDomElement = document.getElementById("pc" + post_nr);
            processPostContainer(newPostDomElement);
        });
        refreshGui();
    }, 5000);
}, false);

/** Listen to post updates from the thread updater for inline extension */
document.addEventListener('4chanThreadUpdated', function (e) {
    var evDetail = e.detail || e.wrappedJSObject.detail;

    setTimeout(function () {
        var threadID = window.location.pathname.split('/')[3];
        var postsContainer = Array.prototype.slice.call(document.getElementById('t' + threadID).childNodes);
        var lastPosts = postsContainer.slice(Math.max(postsContainer.length - evDetail.count, 1)); //get the last n elements (where n is evDetail.count)

        lastPosts.forEach(function (post_container) {
            processPostContainer(post_container);
        });
        refreshGui();
    }, 5000);
}, false);

function processPostContainer(postContainer) {
    var quoteLinks = postContainer.getElementsByClassName("post")[0].getElementsByClassName("postMessage")[0].getElementsByClassName("quotelink");

    // no Set available here - JavaScript is a bitch
    var realYous = [];

    var i = quoteLinks.length;
    while (i--) {
        if (quoteLinks[i].innerHTML.trim().includes("You") && arrayContains(realYous, quoteLinks[i]) === false) {
            realYous.push(quoteLinks[i]);
        }
    }

    if (realYous.length > 0) {
        var postNr = postContainer.id.replace("pc", "");
        updateCounter(postNr, realYous.length);
    }
}

function refreshGui() {
    var allTimeYouCount = GM_getValue("allTimeYouCount");
    var yousCountSpan = document.getElementById("yous-count");
    yousCountSpan.textContent = allTimeYouCount;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshGui, 60000);
}

function updateCounter(postNr, yous) {
    var boardID = window.location.pathname.split('/')[1];
    var currentVal = GM_getValue(boardID + postNr);
    if (!currentVal || currentVal === "" || currentVal === "undefined") {
        var storeObj = {
            yous: yous,
            timestamp: Math.round(new Date().getTime() / 1000)
        };
        GM_setValue(boardID + postNr, storeObj);
        var allTimeYouCount = GM_getValue("allTimeYouCount");
        allTimeYouCount = allTimeYouCount + yous;
        GM_setValue("allTimeYouCount", allTimeYouCount);
    }
}

/** Check if array already contains element */
function arrayContains(a, obj) {
    var i = a.length;
    while (i--) {
        if (a[i].href === obj.href) {
            return true;
        }
    }
    return false;
}

/** prep db and draw gui*/
function init() {
    var allTimeYouCount = GM_getValue("allTimeYouCount");
    if (!allTimeYouCount || allTimeYouCount === "" || allTimeYouCount === "undefined") {
        GM_setValue("allTimeYouCount", 0);
        allTimeYouCount = 0;
    }

    var span = document.createElement("SPAN");
    span.setAttribute("id", "yous");
    span.setAttribute("class", "yous brackets-wrap");
    var textSpan = document.createElement("SPAN");
    textSpan.setAttribute("id", "yous-text");
    var countSpan = document.createElement("SPAN");
    countSpan.setAttribute("id", "yous-count");

    textSpan.textContent = "Current (You) count: ";
    countSpan.textContent = allTimeYouCount;

    span.appendChild(textSpan);
    span.appendChild(countSpan);

    // try 4chan x
    var headerBar = document.getElementById("header-bar");
    var shortcuts = document.getElementById("shortcuts");
    if (headerBar !== null) {
        span.setAttribute("data-index", "90");
        headerBar.insertBefore(span, shortcuts);
    } else {
        // else it's inline or no script and we just put that shit on top of the page
        var body = document.getElementsByTagName("BODY")[0];
        var div = document.createElement("DIV");
        div.setAttribute("id", "yous-holder");
        div.setAttribute("class", "yous-holder");
        div.style.position = "fixed";
        div.style.width = "100%";
        div.style.top = 0;
        div.style.left = 0;
        div.style["z-index"] = 2000;
        div.appendChild(span);
        span.style.background = "#D6DAF0";
        span.style.float = "right";
        body.appendChild(div);
    }

    checkForCleanup();
}

function checkForCleanup() {
    var cleanup = GM_getValue("cleanup");
    if (!cleanup || cleanup === "" || cleanup === "undefined") {
        GM_setValue("cleanup", Math.round(new Date().getTime() / 1000));
    } else if ((Math.round(new Date().getTime() / 1000) - cleanup) > (60 * 60 * 24)) {
        GM_setValue("cleanup", Math.round(new Date().getTime() / 1000));
        cleanUp();
    }
}

function cleanUp() {
    var allVals = GM_listValues();
    allVals.forEach(function (val) {
        if (val != "cleanup" && val != "allTimeYouCount") {
            var valVal = GM_getValue(val);
            if ((Math.round(new Date().getTime() / 1000) - valVal.timestamp) > (60 * 60 * 24 * 7 * 3)) {
                GM_deleteValue(val);
            }
        }
    });
}

/** start first calls */
setTimeout(init, 2500);
setTimeout(parseOriginalPosts, 5000);

