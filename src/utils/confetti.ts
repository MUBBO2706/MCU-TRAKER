/**
 * Confetti particles launcher that manipulates the DOM to generate celebratory visual elements.
 */
export const triggerConfettiParticles = (): void => {
  const colors = ['#e62429', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 70; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.top = `-25px`;
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.transform = `scale(${0.4 + Math.random()})`;
    particle.style.animationDelay = `${Math.random() * 1.8}s`;
    particle.style.animationDuration = `${2.5 + Math.random() * 3}s`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 4800);
  }
};
