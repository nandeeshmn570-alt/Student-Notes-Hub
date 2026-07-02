const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

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
      document.getElementById("msg").innerText = "Login Successful ✅";

      setTimeout(() => {
        window.location.href = "subject1.html";
      }, 1000);

    } else {
      document.getElementById("msg").innerText = "Invalid credentials ❌";
    }

  } catch (err) {
    console.error(err);
    document.getElementById("msg").innerText = "Server error ❌";
  }
});