const message = document.getElementById("message");
const helloButton = document.getElementById("hello-button");

if (message && helloButton) {
  helloButton.addEventListener("click", () => {
    message.textContent = "Button clicked";
  });
}
