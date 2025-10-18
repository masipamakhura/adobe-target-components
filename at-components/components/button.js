export function createButton({ label = "Click Me", onClick } = {}) {
  const button = document.createElement("button");
  button.className = "lib-btn";
  button.textContent = label;
  button.addEventListener("click", onClick || (() => alert(`You clicked ${label}`)));
  return button;
}
