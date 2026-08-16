(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.add("js");

  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");

  function closeMenu() {
    navMenu.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", function () {
    var isOpen = navMenu.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  var navbar = document.getElementById("navbar");
  var progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  function getScrollProgress() {
    var h = document.documentElement;
    var total = h.scrollHeight - h.clientHeight;
    return total > 0 ? window.scrollY / total : 0;
  }

  function onScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
    progress.style.transform = "scaleX(" + getScrollProgress() + ")";
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var revealRise = [
    ".section-title",
    ".doc-block",
    ".three-col",
    ".doc-quote",
    ".status-item",
    ".value-item",
    ".gallery-grid",
    ".armory-card",
    ".page-hero-content"
  ];

  var revealOnly = [".quick-card", ".rank-card", ".spec-card"];

  var targets = document.querySelectorAll(
    revealRise.concat(revealOnly).join(",")
  );

  targets.forEach(function (el) {
    el.classList.add("reveal");
  });

  document.querySelectorAll(revealRise.join(",")).forEach(function (el) {
    el.classList.add("reveal-rise");
  });

  var heroVideo = document.getElementById("heroVideo");
  if (heroVideo) {
    heroVideo.addEventListener("click", function () {
      if (heroVideo.querySelector("video")) {
        return;
      }
      var video = document.createElement("video");
      video.className = "hero-video";
      video.src = "video/usmcf.mp4";
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      heroVideo.innerHTML = "";
      heroVideo.appendChild(video);
      video.play();
    });
  }

  if ("IntersectionObserver" in window && targets.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) {
      io.observe(el);
    });
  } else {
    targets.forEach(function (el) {
      el.classList.add("revealed");
    });
  }
})();
