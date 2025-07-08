// popup.js

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("phish-form");
  const input = document.getElementById("email-input");
  const result = document.getElementById("result");
  const historyList = document.getElementById("history-list");
  const extractButton = document.getElementById("extractButton");
  const clearButton = document.getElementById("clearHistory");

  function analyzeIndicators(text) {
    const indicators = [];
    if (/click here|verify|update/i.test(text)) indicators.push("Urgency");
    if (/http:\/\/|https:\/\//i.test(text)) indicators.push("Suspicious Link");
    if (/account|password|security/i.test(text)) indicators.push("Security Keyword");
    if (/free|gift|prize/i.test(text)) indicators.push("Too Good To Be True");
    return indicators;
  }

  function displayHistory() {
    const history = JSON.parse(localStorage.getItem("phishHistory") || "[]");
    historyList.innerHTML = "";
    history.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.text.substring(0, 50)}... -> ${item.result}`;
      historyList.appendChild(li);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const emailText = input.value.trim();

    if (!emailText) {
      result.textContent = "Please paste or extract an email first.";
      result.classList.remove("safe", "phishing");
      result.classList.add("error");
      return;
    }

    result.textContent = "Checking...";
    result.classList.remove("safe", "phishing", "error");
    historyList.innerHTML = "";

    fetch("http://127.0.0.1:5000/detect_phishing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: emailText }),
    })
      .then((res) => res.json())
      .then((data) => {
        result.textContent = data.result;

        if (data.result.toLowerCase().includes("phishing")) {
          result.classList.add("phishing");
        } else if (data.result.toLowerCase().includes("legitimate")) {
          result.classList.add("safe");
        } else {
          result.classList.add("error");
        }

        const indicators = analyzeIndicators(emailText);
        if (indicators.length > 0) {
          const tagLine = `Indicators: ${indicators.join(", ")}`;
          const tagElem = document.createElement("div");
          tagElem.textContent = tagLine;
          tagElem.style.fontSize = "0.8em";
          tagElem.style.marginTop = "5px";
          tagElem.style.color = "#555";
          result.appendChild(tagElem);
        }

        const history = JSON.parse(localStorage.getItem("phishHistory") || "[]");
        history.unshift({ text: emailText, result: data.result });
        localStorage.setItem("phishHistory", JSON.stringify(history.slice(0, 3)));

        displayHistory();
      })
      .catch(() => {
        result.textContent = "Error connecting to server.";
        result.classList.add("error");
      });
  });

  if (extractButton) {
    extractButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.executeScript(
          tabs[0].id,
          { file: "extractor.js" },
          () => {
            if (chrome.runtime.lastError) {
              console.error("Injection failed:", chrome.runtime.lastError.message);
              result.textContent = "Failed to extract: script error.";
              result.classList.add("error");
            } else {
              console.log("✅ extractor.js injected");
            }
          }
        );
      });
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      localStorage.removeItem("phishHistory");
      displayHistory();
      result.textContent = "History cleared.";
      result.classList.remove("safe", "phishing");
      result.classList.add("error");
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fillEmailInput") {
      input.value = message.content;
      result.textContent = "Email extracted from Gmail.";
      result.classList.remove("phishing", "error");
      result.classList.add("safe");
    }
  });

  displayHistory();
});
