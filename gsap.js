// register TextPlugin if you haven't already
gsap.registerPlugin(TextPlugin);

const words = ["Brush", "Cream", "Bag", "Watch", "Stapler", "keys"];

const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });

words.forEach(word => {
    // replicate your original tween for each word
    tl.to("#text-animate", {
        duration: 3,
        text: " " + word,
        ease: "none",
    });
});

gsap.to("#text-slide",{
  duration:1,
  delay:0,
  y:-30
});