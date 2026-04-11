const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');

const scoreEl = document.getElementById('score-val');
const levelEl = document.getElementById('level-val');
const goalEl = document.getElementById('goal-val');

// حجم المربعات
const tileCount = 20; 
let tileSize;

function resizeCanvas() {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.5;
    const size = Math.min(maxWidth, maxHeight, 400); 
    canvas.width = size;
    canvas.height = size;
    tileSize = canvas.width / tileCount;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// متغيرات اللعبة
let snake = [];
let food = {};
let obstacles = [];
let goldFood = null;
let trickFood = null;

let dx = 0;
let dy = 0;
let score = 0;
let foodEatenInLevel = 0;
let currentLevel = 1;
let isPlaying = false;
let reversedControls = false;
let frameCounter = 0;
let lastTick = 0;
let prevSnake = [];

let inputQueue = [];
let currentDx = 0;
let currentDy = -1;

// إعدادات الموسيقى (بسيطة باستخدام Web Audio API)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function playTone(freq, type, duration) {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

// إعدادات المراحل والمستويات (نظام المستويات)
const levels = {
    1: { speed: 140, goal: 5, obstacleCount: 4, trickster: false },     // بطيئة + 4 عوائق
    2: { speed: 100, goal: 10, obstacleCount: 8, trickster: false },    // متوسطة + 8 عوائق
    3: { speed: 70, goal: 15, obstacleCount: 14, trickster: true }       // سريعة + 14 عائق
};

function initGame() {
    snake = [{x: 10, y: 10}];
    prevSnake = [{x: 10, y: 10}];
    dx = 0; 
    dy = -1; 
    currentDx = 0;
    currentDy = -1;
    inputQueue = [];
    foodEatenInLevel = 0;
    reversedControls = false;
    obstacles = [];
    goldFood = null;
    trickFood = null;
    frameCounter = 0;

    let obsCount = levels[currentLevel].obstacleCount || 0;
    for(let i=0; i<obsCount; i++) {
        let maxTries = 100;
        while(maxTries > 0) {
            let pos = {
                x: Math.floor(Math.random() * 10) + 5, // وسط الشاشة (بين 5 و 14)
                y: Math.floor(Math.random() * 10) + 5
            };
            // التأكد أن العائق لا يوضع في نقطة البداية للثعبان
            if(pos.x === 10 && pos.y === 10) { maxTries--; continue; }
            let exists = obstacles.some(o => o.x === pos.x && o.y === pos.y);
            if(!exists) {
                obstacles.push(pos);
                break;
            }
            maxTries--;
        }
    }
    spawnFood();
}

function spawnFood() {
    food = getValidPos();

    // نمط التريكستر للمستوى 3
    if (levels[currentLevel].trickster) {
        goldFood = null;
        trickFood = null;
        let rand = Math.random();
        // 20% طعام ذهبي (زيادة نقاط)
        if (rand < 0.2) { 
            goldFood = getValidPos();
        } 
        // 20% فخ التريكستر (عكس التحكم)
        else if (rand > 0.8) { 
            trickFood = getValidPos();
        }
    }
}

function getValidPos() {
    let pos;
    while (true) {
        pos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        let collision = snake.some(s => s.x === pos.x && s.y === pos.y) ||
                        obstacles.some(o => o.x === pos.x && o.y === pos.y) ||
                        (food.x === pos.x && food.y === pos.y);
        if (!collision) return pos;
    }
}

function updateLogic() {
    prevSnake = snake.map(s => ({x: s.x, y: s.y}));

    if (inputQueue.length > 0) {
        let nextInput = inputQueue.shift();
        currentDx = nextInput.dx;
        currentDy = nextInput.dy;
    }
    dx = currentDx;
    dy = currentDy;

    // حركة الرأس
    let headX = snake[0].x + dx;
    let headY = snake[0].y + dy;

    // التصادم بالجدران = Game Over
    if (headX < 0 || headX >= tileCount || headY < 0 || headY >= tileCount) {
        gameOver();
        return;
    }

    // التصادم بالنفس أو بالعوائق = Game Over
    let hitSelf = snake.some(seg => seg.x === headX && seg.y === headY);
    let hitObstacle = obstacles.some(obs => obs.x === headX && obs.y === headY);
    
    if (hitSelf || hitObstacle) {
        gameOver();
        return;
    }

    const newHead = {x: headX, y: headY};
    snake.unshift(newHead);
    frameCounter++;

    let grew = false;

    // أكل الطعام العادي
    if (headX === food.x && headY === food.y) {
        playTone(600, 'sine', 0.1);
        score += 10;
        foodEatenInLevel++;
        grew = true;
        spawnFood();
        checkLevelUp();
    } 
    // أكل الطعام الذهبي
    else if (goldFood && headX === goldFood.x && headY === goldFood.y) {
        playTone(900, 'square', 0.2);
        score += 30;
        grew = true;
        goldFood = null;
    } 
    // أكل الطعام المخادع (Trickster)
    else if (trickFood && headX === trickFood.x && headY === trickFood.y) {
        playTone(200, 'sawtooth', 0.4);
        reversedControls = true;
        document.body.style.filter = 'hue-rotate(90deg)'; // تأثير بصري للخداع
        
        setTimeout(() => {
            reversedControls = false;
            document.body.style.filter = '';
        }, 5000); // 5 ثواني وتعود للوضع الطبيعي

        trickFood = null;
        snake.pop(); // التريكستر لا يزيد الطول
    } else {
        snake.pop(); 
    }

    updateUI();
}

function gameLoop(timestamp) {
    if (!isPlaying) return;

    if (lastTick === 0) lastTick = timestamp;

    let speed = levels[currentLevel].speed;
    let delta = timestamp - lastTick;

    if (delta >= speed) {
        updateLogic();
        // إبقاء الوقت الدقيق للحركات المتتالية
        lastTick += speed; 
        delta = timestamp - lastTick;
    }

    // Interpolation (lerp) بين الخطوة السابقة والحالية
    let progress = Math.min(1, Math.max(0, delta / speed));
    draw(progress);

    if (isPlaying) requestAnimationFrame(gameLoop);
}

function draw(progress = 1) {
    // مسح Canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // دالة مساعدة لرسم العناصر المستديرة
    function drawCircle(x, y, color, scale = 0.4) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, tileSize * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // العوائق بدلاً من المربعات الحادة
    let obsColor = getComputedStyle(document.documentElement).getPropertyValue('--obstacle-color').trim();
    obstacles.forEach(obs => {
        let cx = obs.x * tileSize + 2;
        let cy = obs.y * tileSize + 2;
        let cSize = tileSize - 4;
        ctx.fillStyle = obsColor;
        // رسم العائق كصندوق بزوايا مستديرة
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(cx, cy, cSize, cSize, 6);
        else ctx.rect(cx, cy, cSize, cSize); // fallback
        ctx.fill();
    });

    // الطعام بشكل دائري ناعم
    drawCircle(food.x, food.y, getComputedStyle(document.documentElement).getPropertyValue('--food-color').trim(), 0.35);

    // الذهب
    if (goldFood) {
        drawCircle(goldFood.x, goldFood.y, getComputedStyle(document.documentElement).getPropertyValue('--gold-color').trim(), 0.45);
    }

    // التريكستر
    if (trickFood) {
        drawCircle(trickFood.x, trickFood.y, getComputedStyle(document.documentElement).getPropertyValue('--trick-color').trim(), 0.4);
    }

    let snakeColor = getComputedStyle(document.documentElement).getPropertyValue('--snake-color').trim() || '#00ff88';
    let snakeHeadColor = getComputedStyle(document.documentElement).getPropertyValue('--snake-head').trim() || '#00cc66';

    // رسم جسم الثعبان كخط متصل، انسيابي ذو أطراف دائرية (نفس لعبة الجوال)
    if (snake.length > 0) {
        ctx.strokeStyle = snakeColor;
        ctx.lineWidth = tileSize * 0.8; 
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        for (let i = 0; i < snake.length; i++) {
            let cur = snake[i];
            let oldPos = prevSnake[i] || cur;
            
            let lerpX = oldPos.x + (cur.x - oldPos.x) * progress;
            let lerpY = oldPos.y + (cur.y - oldPos.y) * progress;
            
            let cx = lerpX * tileSize + tileSize / 2;
            let cy = lerpY * tileSize + tileSize / 2;
            
            // انيميشن للذيل
            if (i === snake.length - 1 && snake.length > 2) {
                let wiggle = (frameCounter % 4 < 2) ? 3 : -3; 
                let pdx = (i > 0) ? snake[i-1].x - cur.x : 0;
                if (pdx !== 0) cy += wiggle; 
                else cx += wiggle;           
            }
            
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }

    // رسم الرأس بدائرة مخصصة فوق الخط وإضافة العيون الواضحة
    if (snake.length > 0) {
        let curH = snake[0];
        let oldH = prevSnake[0] || curH;
        let lerpX = oldH.x + (curH.x - oldH.x) * progress;
        let lerpY = oldH.y + (curH.y - oldH.y) * progress;
        
        let hx = lerpX * tileSize;
        let hy = lerpY * tileSize;
        let size = tileSize;
        
        // الرأس دائري
        ctx.fillStyle = snakeHeadColor;
        ctx.beginPath();
        ctx.arc(hx + size/2, hy + size/2, size*0.45, 0, Math.PI * 2);
        ctx.fill();

        // العيون أكثر وضوحاً
        ctx.fillStyle = '#111'; // أسود بارز
        let eyeR = Math.max(1.5, size * 0.12);
        let centerOffset = size * 0.15;
        let forwardOffset = size * 0.22;

        ctx.beginPath();
        if(dx === 1) { // يمين
            ctx.arc(hx + size/2 + forwardOffset, hy + size/2 - centerOffset, eyeR, 0, Math.PI*2);
            ctx.arc(hx + size/2 + forwardOffset, hy + size/2 + centerOffset, eyeR, 0, Math.PI*2);
        } else if(dx === -1) { // يسار
            ctx.arc(hx + size/2 - forwardOffset, hy + size/2 - centerOffset, eyeR, 0, Math.PI*2);
            ctx.arc(hx + size/2 - forwardOffset, hy + size/2 + centerOffset, eyeR, 0, Math.PI*2);
        } else if(dy === 1) { // تحت
            ctx.arc(hx + size/2 - centerOffset, hy + size/2 + forwardOffset, eyeR, 0, Math.PI*2);
            ctx.arc(hx + size/2 + centerOffset, hy + size/2 + forwardOffset, eyeR, 0, Math.PI*2);
        } else { // فوق (الافتراضي)
            ctx.arc(hx + size/2 - centerOffset, hy + size/2 - forwardOffset, eyeR, 0, Math.PI*2);
            ctx.arc(hx + size/2 + centerOffset, hy + size/2 - forwardOffset, eyeR, 0, Math.PI*2);
        }
        ctx.fill();
    }
}

function updateUI() {
    scoreEl.innerText = score;
    levelEl.innerText = currentLevel;
    let required = levels[currentLevel].goal;
    goalEl.innerText = Math.max(0, required - foodEatenInLevel);
}

function checkLevelUp() {
    if (foodEatenInLevel >= levels[currentLevel].goal) {
        if (currentLevel < 3) {
            isPlaying = false;
            currentLevel++;
            playTone(800, 'sine', 0.1);
            setTimeout(() => playTone(1000, 'sine', 0.2), 150);
            
            overlayTitle.innerText = "Level Up! 🌟";
            overlayDesc.innerText = `عاش! استعد للمرحلة ${currentLevel}، ستزداد السرعة وربما تجد مفاجآت.`;
            startBtn.innerText = "المرحلة التالية";
            overlay.classList.remove('hidden');
        } else {
            // إنهاء وتختيم اللعبة
            isPlaying = false;
            playTone(1000, 'triangle', 0.5);
            overlayTitle.innerText = "لقد فزت! 🎉";
            overlayDesc.innerText = `أتممت كل التحديات! نقاطك: ${score}`;
            startBtn.innerText = "العب مجدداً";
            currentLevel = 1;
            score = 0;
            overlay.classList.remove('hidden');
        }
    }
}

function gameOver() {
    isPlaying = false;
    playTone(300, 'sawtooth', 0.5);
    overlayTitle.innerText = "Game Over 💀";
    overlayDesc.innerText = `للأسف خسرت! نقاطك: ${score} - المرحلة: ${currentLevel}`;
    startBtn.innerText = "إعادة المحاولة";
    currentLevel = 1;
    score = 0;
    overlay.classList.remove('hidden');
}

// التحكم (الاتجاهات)
function changeDirection(newDx, newDy) {
    if(reversedControls) {
        newDx = -newDx;
        newDy = -newDy;
    }
    
    // فحص الاتجاه لتفادي العودة لنفس الخط (الموت في نفس المكان)
    let lastDx = inputQueue.length > 0 ? inputQueue[inputQueue.length-1].dx : currentDx;
    let lastDy = inputQueue.length > 0 ? inputQueue[inputQueue.length-1].dy : currentDy;
    
    if (newDx !== 0 && lastDx === -newDx) return;
    if (newDy !== 0 && lastDy === -newDy) return;
    
    if (inputQueue.length < 3) {
        inputQueue.push({dx: newDx, dy: newDy});
    }
}

// الكيبورد
window.addEventListener('keydown', e => {
    if (!isPlaying) return;
    switch(e.key) {
        case 'ArrowUp': case 'w': changeDirection(0, -1); break;
        case 'ArrowDown': case 's': changeDirection(0, 1); break;
        case 'ArrowLeft': case 'a': changeDirection(-1, 0); break;
        case 'ArrowRight': case 'd': changeDirection(1, 0); break;
    }
});

// أزرار الواجهة للموبايل
const controlMap = {
    'up-btn': [0, -1],
    'down-btn': [0, 1],
    'left-btn': [1, 0], // الأيمن بالانجليزية لكن بالموقع عربي معكوس الاتجاهات
    'right-btn': [-1, 0] // الأيسر
};

['up-btn', 'down-btn', 'left-btn', 'right-btn'].forEach(id => {
    const btn = document.getElementById(id);
    const handler = (e) => {
        e.preventDefault();
        // بما أن الصفحة عربي RTL: الزرار اليسار بيعطي "يمين بصرياً"
        if(id === 'left-btn') changeDirection(1, 0);
        else if (id === 'right-btn') changeDirection(-1, 0);
        else changeDirection(controlMap[id][0], controlMap[id][1]);
    };
    btn.addEventListener('touchstart', handler, {passive: false});
    btn.addEventListener('mousedown', handler);
});

// ميزة الـ Swipe للمس
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', e => {
    if(e.target.closest('.mobile-controls') || e.target.closest('.btn')) return; // تجاهل إذا لمس الأزرار
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, {passive: false});

document.addEventListener('touchend', e => {
    if(!isPlaying) return;
    if(e.target.closest('.mobile-controls') || e.target.closest('.btn')) return;

    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    
    let diffX = touchEndX - touchStartX;
    let diffY = touchEndY - touchStartY;
    
    if(Math.abs(diffX) > 30 || Math.abs(diffY) > 30){
        // إذا سحب بشكل أفقي
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) changeDirection(1, 0);   // يمين
            else changeDirection(-1, 0);            // يسار
        } 
        // إذا سحب بشكل عمودي
        else {
            if (diffY > 0) changeDirection(0, 1);   // تحت
            else changeDirection(0, -1);            // فوق
        }
    }
}, {passive: false});

// زر البداية
startBtn.addEventListener('click', () => {
    if(!audioCtx) audioCtx = new AudioContext(); 
    overlay.classList.add('hidden');
    initGame();
    isPlaying = true;
    lastTick = 0;
    requestAnimationFrame(gameLoop);
});
