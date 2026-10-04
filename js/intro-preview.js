const intro = document.querySelector("#cinematicIntro");
const skip = document.querySelector("#skipIntro");
const outerOrbit = document.querySelector(".emblem-orbit--outer");
const innerOrbit = document.querySelector(".emblem-orbit--inner");

let fallbackTimer;
let orbitAnimations = [];

function animateOrbits() {
  orbitAnimations.forEach((animation) => animation.cancel());
  orbitAnimations = [
    outerOrbit.animate(
      [
        { transform: "rotate(0deg)", opacity: 0 },
        { transform: "rotate(18deg)", opacity: 1, offset: 0.1 },
        { transform: "rotate(360deg)", opacity: 1 },
      ],
      { duration: 3400, delay: 80, easing: "linear", fill: "forwards" },
    ),
    innerOrbit.animate(
      [
        { transform: "rotate(0deg)", opacity: 0 },
        { transform: "rotate(-18deg)", opacity: 1, offset: 0.1 },
        { transform: "rotate(-360deg)", opacity: 1 },
      ],
      { duration: 4000, delay: 140, easing: "linear", fill: "forwards" },
    ),
  ];
}

function finishIntro() {
  window.clearTimeout(fallbackTimer);
  intro.classList.add("is-leaving");
}

function playIntro() {
  window.clearTimeout(fallbackTimer);
  intro.classList.remove("is-leaving", "is-running");
  void intro.offsetWidth;
  intro.classList.add("is-running");
  animateOrbits();
  fallbackTimer = window.setTimeout(finishIntro, 3000);
}

skip.addEventListener("click", finishIntro);

playIntro();
