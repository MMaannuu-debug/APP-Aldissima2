// js/preloader.js
function showLoadingBall() {
  const overlay = document.createElement('div');
  overlay.id = 'preloader';
  overlay.innerHTML = `
    <div class="ball-container">
      <div class="ball"></div>
      <div class="ground"></div>
    </div>`;
  document.body.appendChild(overlay);
}

function hideLoadingBall() {
  const overlay = document.getElementById('preloader');
  if (overlay) overlay.remove();
}

// Show immediately
showLoadingBall();

// When the page is fully loaded, keep the preloader for at least 2.5 seconds
window.addEventListener('load', () => {
  setTimeout(hideLoadingBall, 2500);
});
