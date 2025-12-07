document.addEventListener('DOMContentLoaded', function() {
    animateCounters();
    initScrollAnimations();
    loadBotStatus();
    initMobileMenu();
    initSmoothScrolling();
    initParallax();
});

function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-count'));
                animateValue(counter, 0, target, 2000);
                observer.unobserve(counter);
            }
        });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (range * easeOutQuart));
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.feature-card, .command-card, .server-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, index * 50);
            }
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        observer.observe(el);
    });

    document.head.insertAdjacentHTML('beforeend', `
        <style>
            .animate-in {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }
        </style>
    `);
}

async function loadBotStatus() {
    const statusCards = document.getElementById('status-cards');
    if (!statusCards) return;

    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        updateStatusCard(statusCards, 0, data.mainBot);
        updateStatusCard(statusCards, 1, data.modmailBot);
    } catch (error) {
        console.error('Failed to load status:', error);
    }
}

function updateStatusCard(container, index, botData) {
    const cards = container.querySelectorAll('.status-card');
    if (!cards[index]) return;

    const card = cards[index];
    const indicator = card.querySelector('.status-indicator');
    const statusText = card.querySelector('.status-text');
    const pingText = card.querySelector('.status-ping');

    if (botData && botData.status === 'online') {
        indicator.className = 'status-indicator online';
        statusText.textContent = 'Operational';
        pingText.textContent = (botData.latency || '--') + ' ms';
        pingText.style.color = '#57F287';
    } else {
        indicator.className = 'status-indicator offline';
        statusText.textContent = 'Offline';
        pingText.textContent = '-- ms';
        pingText.style.color = '#ED4245';
    }
}

function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
        menuBtn.querySelector('i').classList.toggle('fa-bars');
        menuBtn.querySelector('i').classList.toggle('fa-times');
    });

    document.head.insertAdjacentHTML('beforeend', `
        <style>
            @media (max-width: 768px) {
                .nav-links.mobile-open {
                    display: flex !important;
                    flex-direction: column;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(10, 10, 15, 0.95);
                    backdrop-filter: blur(20px);
                    padding: 1rem;
                    gap: 0.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .nav-links.mobile-open .nav-link {
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                }
                .nav-links.mobile-open .nav-link:hover {
                    background: rgba(88, 101, 242, 0.1);
                }
            }
        </style>
    `);
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initParallax() {
    const shapes = document.querySelectorAll('.shape');
    
    if (shapes.length === 0) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.pageYOffset;
                
                shapes.forEach((shape, index) => {
                    const speed = 0.05 + (index * 0.02);
                    const yPos = scrollY * speed;
                    shape.style.transform = `translateY(${yPos}px)`;
                });
                
                ticking = false;
            });
            ticking = true;
        }
    });
}

function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => ripple.remove());
}

document.head.insertAdjacentHTML('beforeend', `
    <style>
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    </style>
`);

document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', createRipple);
});

document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.background = 'rgba(10, 10, 15, 0.95)';
    } else {
        navbar.style.background = 'rgba(10, 10, 15, 0.8)';
    }
    
    lastScroll = currentScroll;
});

console.log('%c Discord Bot Dashboard', 'color: #5865F2; font-size: 24px; font-weight: bold;');
console.log('%c Powered by passion and lots of coffee', 'color: #b9bbbe;');
