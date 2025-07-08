(function () {
  // Try finding the actual email body container (most consistent selector Gmail uses)
  const emailContainers = document.querySelectorAll("div[role='main'] div.ii.gt");

  let extractedText = "";

  emailContainers.forEach((container) => {
    const innerDiv = container.querySelector("div.a3s");
    if (innerDiv && innerDiv.innerText) {
      extractedText += innerDiv.innerText.trim() + "\n\n";
    }
  });

  if (extractedText) {
    chrome.runtime.sendMessage({
      action: "fillEmailInput",
      content: extractedText.trim(),
    });
  } else {
    alert("Email container not found. Make sure an email is open and fully loaded.");
  }
})();
