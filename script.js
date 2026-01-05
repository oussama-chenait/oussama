// Canvas Particle System matching Antigravity aesthetic
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.zIndex = '-1';
canvas.style.pointerEvents = 'none';

let width, height;
let particles = [];
let mouse = { x: null, y: null };

// Resize handling
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Mouse handling
window.addEventListener('mousemove', (e) => {
    mouse.x = e.x;
    mouse.y = e.y;
});
window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// Particle Class
class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.baseColor = 'rgba(0, 212, 255, '; // Primary blue
        this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            const maxDistance = 150;

            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                const strength = 2;
                this.vx += forceDirectionX * force * strength * 0.05;
                this.vy += forceDirectionY * force * strength * 0.05;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.baseColor + this.opacity + ')';
        ctx.fill();
    }
}

// Initialize particles
function initParticles() {
    particles = [];
    const particleCount = (width * height) / 9000; // Density
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}
initParticles();

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Connect particles near mouse
    connectParticles();
}

function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
            let distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));

            if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                opacityValue = 1 - (distance / 20000);
                if (opacityValue > 0) {
                    ctx.strokeStyle = 'rgba(0, 212, 255,' + opacityValue * 0.1 + ')';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }
}

animate();

// Re-init on resize to maintain density
window.addEventListener('resize', initParticles);


// Stats Counter Animation
const stats = document.querySelectorAll('.stat-number');
let hasAnimated = false;

function animateStats() {
    stats.forEach(stat => {
        const target = +stat.getAttribute('data-target');
        const increment = Math.ceil(target / 100);

        function updateCount() {
            const count = +stat.innerText;
            if (count < target) {
                stat.innerText = count + increment;
                setTimeout(updateCount, 20);
            } else {
                stat.innerText = target;
            }
        }
        updateCount();
    });
}

// Trigger animation when stats section is in view
window.addEventListener('scroll', () => {
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        const sectionTop = statsSection.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;

        if (sectionTop < screenPosition && !hasAnimated) {
            animateStats();
            hasAnimated = true;
        }
    }
});
