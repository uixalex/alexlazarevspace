document.addEventListener('click', (e) => {
  const box = e.target.closest('[data-acc-toggle]');
  if (!box) return;
  const id = box.getAttribute('data-acc-toggle');
  const panel = document.getElementById(id);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  const icon = box.querySelector('span:last-child');
  if (icon) icon.textContent = isOpen ? '+' : '✕';
});

document.querySelectorAll('[data-tilt="hero-polaroid"]').forEach((el) => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    const tiltX = relY * -14;
    const tiltY = relX * 14;
    const lift = -8;
    el.style.transform = `rotate(4deg) translateY(${lift}px) perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'rotate(4deg) translateY(0px) perspective(600px) rotateX(0deg) rotateY(0deg)';
  });
});
