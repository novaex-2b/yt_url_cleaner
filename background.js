(function()
{

    // -----------------------
    // Async functions
    // -----------------------


    // Source with slight modifications: https://github.com/mdn/webextensions-examples/tree/master/context-menu-copy-link-with-types
    async function clean_and_copy(par_url, par_tab)
    {
        const safeUrl = await clean_url(par_url);

        // The example will show how data can be copied, but since background
        // pages cannot directly write to the clipboard, we will run a content
        // script that copies the actual content.

        // clipboard-helper.js defines function copyToClipboard.
        const code = "copyToClipboard(" +
            JSON.stringify(safeUrl) + ");";

        // PERMISSION REQUEST: clipboardWrite
        browser.tabs.executeScript({
            code: "typeof copyToClipboard === 'function';",
        }).then((results) => {
            // The content script's last expression will be true if the function
            // has been defined. If this is not the case, then we need to run
            // clipboard-helper.js to define function copyToClipboard.
            if (!results || results[0] !== true) {
                return browser.tabs.executeScript(par_tab.id, {
                    file: "clipboard-helper.js",
                });
            }
        }).then(() => {
            return browser.tabs.executeScript(par_tab.id, {
                code,
            });
        }).catch((error) => {
            // This could happen if the extension is not allowed to run code in
            // the page, for example if the tab is a privileged page.
            console.error("Failed to copy text: " + error);
        });
    }


    async function clean_url(par_url)
    {

        // Remove parameters from URL
        const stripped = strip_parameters(par_url);

        // Always HTML-escape external input to avoid XSS.
        return escapeHTML(stripped)
    }


    async function get_tab()
    {
        // PERMISSION REQUEST: activeTab
        return browser.tabs.query({currentWindow: true, active: true})
                        .then((tabs)=>{
                            return tabs[0]
                        })
    }


    async function hotkey_grab_url()
    {
        let tab = await get_tab();
        clean_and_copy(tab.url, tab);
    }

    // ----------------------------
    // Standard functions
    // ----------------------------

    // https://gist.github.com/Rob--W/ec23b9d6db9e56b7e4563f1544e0d546
    function escapeHTML(str) 
    {
        // Note: string cast using String; may throw if `str` is non-serializable, e.g. a Symbol.
        // Most often this is not the case though.
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }


    function strip_parameters(par_url)
    {
        // First replace(): Removes the first occurrence of a question mark or pound and everything after 
        // Second replace(): Removes parameters that appear before the question mark and after the final slash (primarily for Amazon URLs)
        const test = par_url.replace("&feature=share", "");
        return test
    }


    // --------------------------------
    // Context Menu entries
    // --------------------------------

    // PERMISSION REQUEST: contextMenus
    browser.contextMenus.create({
        id: "strip_url_parameters_link",
        title: "Copy Clean URL",
        contexts: ["link"]
    });

    // PERMISSION REQUEST: contextMenus
    browser.contextMenus.create({
        id: "strip_url_parameters_link_new_tab",
        title: "Open Clean URL in New Tab",
        contexts: ["link"]
    });

    // I hate that it's a long title and takes up so much room in the context menu, but 
    //  I felt I had to use a longer title because of these situations:
    //      1) User right-clicks highlighted text 
    //          A) Appears by itself in the root of the context menu and 
    //              isn't a child of "Remove URL Parameters" like the rest,
    //          B) Needs to convey it both "copies text" and "removes url parameters"
    //      2) User right-clicks a hyperlink while other text is highlighted
    //          A) Appears as a child of "Remove URL Parameters"
    //          B) Needs to convey clicking it doesn't perform an action on the hyperlink
    // PERMISSION REQUEST: contextMenus
    browser.contextMenus.create({
        id: "strip_url_parameters_selected",
        title: "Clean Up YouTube's BS",
        contexts: ["selection"]
    });


    // --------------------------
    // Event Listeners
    // --------------------------

    browser.commands.onCommand.addListener((command) => {
        console.debug("> Hotkey")
        // User presses hotkey combo to pull url from current tab
        hotkey_grab_url();
    });


    browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "strip_url_parameters_selected")
        {
            clean_and_copy(info.selectionText, tab);
        }
        else if (info.menuItemId === "strip_url_parameters_link") 
        {
            clean_and_copy(info.linkUrl, tab);
        }
        else if (info.menuItemId === "strip_url_parameters_link_new_tab") 
        {
            const prepped_url = clean_url(info.linkUrl);
            browser.tabs.create({url: prepped_url });
        }

    });

})();
