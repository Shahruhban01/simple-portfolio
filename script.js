// Vanilla JS - Minimal and unobtrusive
// Fetches public GitHub repository count dynamically, preserving the API integration from the original portfolio.

document.addEventListener("DOMContentLoaded", () => {
  const repoCountSpan = document.getElementById("github-repo-count");
  if (!repoCountSpan) return;

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
});
