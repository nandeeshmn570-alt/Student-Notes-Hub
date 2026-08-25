const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

if (!form || !msg) {
  throw new Error("Admin login form not found");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    msg.textContent = "Please enter both username and password.";
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      msg.textContent = "Login Successful ✅";
      msg.style.color = "#7ef29a";

      setTimeout(() => {
        window.location.href = "notes.html";
      }, 600);
    } else {
      msg.style.color = "#ffd4d4";
      msg.textContent = "Invalid credentials ❌";
    }
  } catch (err) {
    console.error(err);
    msg.style.color = "#ffd4d4";
    msg.textContent = "Server error ❌";
  }
});