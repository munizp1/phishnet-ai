chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scanEmails") {
        fetch("http://127.0.0.1:5000/detect_phishing")
            .then(response => response.json())
            .then(data => {
                sendResponse({ result: data.message });
            })
            .catch(error => {
                console.error("Error:", error);
                sendResponse({ result: "Error scanning emails." });
            });
        return true; // Keeps the response channel open
    }
});
