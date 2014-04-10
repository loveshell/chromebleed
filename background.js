/*
 array of commonly used sites that have fixed this bug to reduce server load
 */
var siteArray = ['amazonaws.com', 'google.com', 'facebook.com', 'etsy.com', 'thinkgeek.com', 'github.com', 'yahoo.com', 'twitter.com', 'reddit.com', 'ml.com', 'bankofamerica.com', 'bankofamerica.co.uk'];
var isFilteredURL = 0;

var notificationPermission = 0;
if (window.webkitNotifications && window.webkitNotifications.checkPermission() === 1) {
    window.webkitNotifications.requestPermission();
}

// Conditionally initialize the options.
if (!localStorage.isInitialized) {
    localStorage.isActivated = true;   // The notification activation.
    localStorage.isShowingAll = false;   // The showing of Ok domains.
    localStorage.isInitialized = true; // The option initialization.
}

// background script for access to Chrome APIs
chrome.tabs.onUpdated.addListener(function(tabId, info) {
    // Test for notification support.
    if (window.webkitNotifications && window.webkitNotifications.checkPermission() === 0) {
        console.log("-------------- onUpdated ---------------");

        // Only show notifications when the option is activated
        if (JSON.parse(localStorage.isActivated)) {
            console.log("Notifications: " + JSON.parse(localStorage.isActivated));
            //check page has loaded
            if (info.status === 'complete') {
                //get the tab's URL
                chrome.tabs.getSelected(null, function(tab) {
                    var currentURL = tab.url;
                    var parsedURL = parseURL(currentURL);
                    // Bail if it is an internal chrome url, this should be extended
                    if (parsedURL.protocol == 'chrome') {
                        return;
                    }
                    if (parsedURL.domain == 'devtools:') {
                        return;
                    }

                    console.log("Domain: " + parsedURL.domain);
                    //Google, bit.ly, t.co (and other URL shortners) do some funny URL things, we want to stop it, ergo reducing requests to the server
                    isFilteredURL = 0;
                    // Check for the domain to be in our whitelist
                    siteArray.some(function(site) {
                        if (parsedURL.domain == site) {
                            isFilteredURL = 1;
                            return true;
                        }
                    });
                    // Check for the domain to be in our cached entries
                    var isokay = JSON.parse(localStorage.isokay || "[]");
                    isokay.some(function(site) {
                        if (parsedURL.domain == site) {
                            isFilteredURL = 1;
                            return true;
                        }
                    });
                    if (isFilteredURL === 0) {
                        //doesn't contain any of the above, carry on
                        requestURL(parsedURL.domain, function(text) {
                          //parse as JSON, check result
                          var result = JSON.parse(text);
                          console.log('Result for site ' + parsedURL.domain + ': ' + result.code);
                          console.log('Further details: ' + result.data);
                          if (result.error) {
                              console.log('[ERR]:' + result.error);
                          }
                          if (result.code === 0) {
                              var notification = webkitNotifications.createNotification(
                                      'icon48.png', // icon url - can be relative
                                      'This site is vulnerable!', // notification title
                                      'The domain ' + url + ' could be vulnerable to the Heartbleed SSL bug.'  // notification body text
                                      );
                              notification.show();
                              notification.onclick = function() {
                                  // Handle action from notification being clicked.
                                  notification.cancel();
                              }
                          } else {
                              if (!result.error) {
                                  isokay.push(parsedURL.domain);
                                  while (isokay.length > 250) {
                                      isokay.shift();
                                  }
                                  localStorage.isokay = JSON.stringify(isokay);
                              }
                              //do nothing unless we want to show all notifications
                              if (JSON.parse(localStorage.isShowingAll)) {
                                  var icon_name = (result.error ? 'logo-err48.png' : 'logo-ok48.png');
                                  var message = (result.error ? 'Use Caution, ' + url + ' had error [' + result.error + ']' : 'All Good, ' + url + ' seems fixed or unaffected!');
                                  var notification = webkitNotifications.createNotification(
                                          icon_name, // icon url - can be relative
                                          'Site seems Ok!', // notification title
                                          message  // notification body text
                                          );
                                  notification.show();
                                  notification.onclick = function() {
                                      // Handle action from notification being clicked.
                                      notification.cancel();
                                  }
                              }
                              return;
                          }
                        });
                    } else if (JSON.parse(localStorage.isShowingAll)) {
                        //we know these are kosher, so simply reset the filtered URL
                        console.log('Ignoring ' + parsedURL.domain);
                        var notification = webkitNotifications.createNotification(
                                icon_name, // icon url - can be relative
                                'Site seems Ok!', // notification title
                                'All Good, ' + parsedURL.domain + ' seems fixed or unaffected!'  // notification body text
                                );
                    }
                });
            }
        } else {
            console.log("Notifications: Off");
        }
    } else {
        console.log("webkitNotifications: disabled " + window.webkitNotifications.checkPermission());
    }
});
