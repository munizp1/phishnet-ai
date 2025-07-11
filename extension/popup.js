document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("phish-form");
  const input = document.getElementById("email-input");
  const result = document.getElementById("result");
  const historyList = document.getElementById("history-list");
  const extractButton = document.getElementById("extractButton");
  const clearButton = document.getElementById("clearHistory");
  const thumbsUp = document.getElementById("thumbsUp");
  const thumbsDown = document.getElementById("thumbsDown");
  const feedbackSection = document.getElementById("feedback-section");

  let lastEmailText = "";
  let lastResult = "";

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
    feedbackSection.style.display = "none";
    enableFeedbackButtons();

    if (!emailText) {
      result.textContent = "Please paste or extract an email first.";
      result.classList.remove("safe", "phishing");
      result.classList.add("error");
      return;
    }

    result.textContent = "Checking...";
    result.classList.remove("safe", "phishing", "error");
    historyList.innerHTML = "";

    fetch("https://phishnet-ai.onrender.com/detect_phishing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: emailText }),
    })
      .then((res) => res.json())
      .then((data) => {
        const prediction = data.result;
        result.textContent = prediction;

        if (prediction.toLowerCase().includes("phishing")) {
          result.classList.add("phishing");
        } else if (prediction.toLowerCase().includes("legitimate")) {
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
        history.unshift({ text: emailText, result: prediction });
        localStorage.setItem("phishHistory", JSON.stringify(history.slice(0, 3)));
        displayHistory();

        lastEmailText = emailText;
        lastResult = prediction;
        feedbackSection.style.display = "block";
      })
      .catch(() => {
        result.textContent = "Error connecting to server.";
        result.classList.add("error");
        feedbackSection.style.display = "none";
      });
  });

  if (extractButton) {
    extractButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["extractor.js"],
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Injection failed:", chrome.runtime.lastError.message);
            result.textContent = "Failed to extract: script error.";
            result.classList.add("error");
          } else {
            console.log("✅ extractor.js injected");
          }
        });
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
      feedbackSection.style.display = "none";
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

  thumbsUp.addEventListener("click", () => {
    sendFeedback("up");
  });

  thumbsDown.addEventListener("click", () => {
    sendFeedback("down");
  });

  function sendFeedback(feedback) {
    if (!lastEmailText || !lastResult) return;

    const encoder = new TextEncoder();
    const data = encoder.encode(lastEmailText);

    crypto.subtle.digest("SHA-256", data).then((hashBuffer) => {
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const emailHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      fetch("https://phishnet-ai.onrender.com/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_hash: emailHash,
          feedback: feedback,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("✅ Feedback submitted:", data.status);
          disableFeedbackButtons();
          showThankYouMessage();
        })
        .catch((err) => {
          console.error("❌ Feedback failed:", err);
        });
    });
  }

  function disableFeedbackButtons() {
    thumbsUp.disabled = true;
    thumbsDown.disabled = true;
    thumbsUp.style.opacity = 0.5;
    thumbsDown.style.opacity = 0.5;
  }

  function enableFeedbackButtons() {
    thumbsUp.disabled = false;
    thumbsDown.disabled = false;
    thumbsUp.style.opacity = 1;
    thumbsDown.style.opacity = 1;
  }

  function showThankYouMessage() {
    const msg = document.createElement("div");
    msg.textContent = "Thanks for your feedback!";
    msg.style.fontSize = "12px";
    msg.style.marginTop = "6px";
    msg.style.color = "#444";
    msg.style.fontStyle = "italic";
    feedbackSection.appendChild(msg);
  }

  displayHistory();
});
