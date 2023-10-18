// Creates a navigation menu at the top of the page
function generateMenu() {
  const links = [
    {
      href: "./quiz.html",
      text: "Quiz",
    },
    {
      href: "./catalog.html",
      text: "Catalog",
    },
    {
      href: "./account.html",
      text: "Account",
    },
    {
      href: "./user.html",
      text: "User",
    },
    {
      href: "./generate.html",
      text: "Generate",
    },
  ];
  var nav = document.createElement("nav");
  var ul = document.createElement("ul");
  links.forEach((link) => {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = link.href;
    a.innerText = link.text;
    li.appendChild(a);
    nav.appendChild(li);
  });
  document.body.prepend(nav);
}
generateMenu();
