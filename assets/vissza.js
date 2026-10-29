/* „← Figyelő” gomb a rovatok bal alsó sarkában: visszavisz a nyitóoldalra.
   Beillesztés egy rovatoldal </body> elé:  <script src="../assets/vissza.js"></script> */
(function () {
  "use strict";
  var a = document.createElement("a");
  a.href = "../";
  a.textContent = "← Figyelő";
  a.setAttribute("aria-label", "Vissza a Figyelő nyitóoldalára");
  a.style.cssText = [
    "position:fixed", "left:16px", "bottom:16px", "z-index:2147483000",
    "display:inline-flex", "align-items:center", "min-height:40px", "padding:0 16px",
    "border-radius:999px", "text-decoration:none",
    "font:600 15px/1 Fraunces, Georgia, 'Times New Roman', serif", "font-style:italic",
    "color:#EEE9DF", "background:rgba(10,14,20,0.82)",
    "border:1px solid rgba(160,205,255,0.45)",
    "box-shadow:0 10px 30px rgba(0,0,0,0.35)",
    "backdrop-filter:blur(12px)", "-webkit-backdrop-filter:blur(12px)"
  ].join(";");
  document.body.appendChild(a);
  /* hogy a gomb ne takarja ki az oldal alját */
  var pb = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
  if (pb < 72) document.body.style.paddingBottom = "72px";
})();
