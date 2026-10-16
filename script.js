// Vanilla JS - Minimal and unobtrusive
const API_BASE_URL = "https://api.developerruhban.online";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Fetch public GitHub repository count dynamically
  const repoCountSpan = document.getElementById("github-repo-count");
  if (repoCountSpan) {
    fetch("https://api.github.com/users/shahruhban01")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GitHub API returned status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (typeof data.public_repos === "number") {
          repoCountSpan.textContent = ` (${data.public_repos} public repositories)`;
          repoCountSpan.style.color = "#666666";
          repoCountSpan.style.fontSize = "0.9rem";
        }
      })
      .catch((_err) => {
        // Graceful fallback: fail silently if network is offline or rate-limited
      });
  }

  // 2. Handle Contact Form Submission
  const contactForm = document.getElementById("contact-form");
  const contactStatus = document.getElementById("contact-status");
  const submitBtn = document.getElementById("contact-submit-btn");

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("contact-name");
      const emailInput = document.getElementById("contact-email");
      const subjectInput = document.getElementById("contact-subject");
      const messageInput = document.getElementById("contact-message");

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subject = subjectInput.value.trim() || "Portfolio Inquiry";
      const message = messageInput.value.trim();

      if (!name || !email || !message) {
        showStatus(contactStatus, "Please complete all required fields.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending message...";
      hideStatus(contactStatus);

      try {
        const response = await fetch(`${API_BASE_URL}/api/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, subject, message }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Failed to send (Status ${response.status})`);
        }

        showStatus(contactStatus, "Thank you! Your message has been sent successfully.", "success");
        contactForm.reset();
      } catch (err) {
        showStatus(contactStatus, err.message || "Failed to reach server. Please try emailing directly.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
      }
    });
  }

  function showStatus(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = `status-box ${type}`;
    element.style.display = "block";
  }

  function hideStatus(element) {
    if (!element) return;
    element.textContent = "";
    element.style.display = "none";
  }
});
