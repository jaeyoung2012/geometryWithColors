const main = document.getElementById("main");
/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");
const start_el = document.getElementById("start");

const levelEl = document.getElementById("level");
const coinEl = document.getElementById("coin");

let level = 0;
let coin = 0;
let maxBullet = 60;
let bulletCount = maxBullet;
let magazineCount = 1;
let type = 0;

const enemySpeed = 10;
const lerpSpeed = 0.01;
let enemySpawnTime = 200 / (level + 1);
let clearScore = 0;
let shootCool = 300;
const minShootCool = 50
const playerDashSpeed = 20;
const playerOriginSpeed = 300;
const itemWH = 50;
const bulletSpeed = 10;

Math.SQRT_3 = Math.sqrt(3);

let mainButton;
let playerMoveSpeed = playerOriginSpeed;

let enemies = [];
let bullets = [];
let items = [];
let particles = [];

const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

let dashTime = 0;
let shootTime = 0;
let magazineChangeTime = 0;
let skillTime = 0;
let skillCool = 300;
let skill_elapsed = 0;
let skill_duration = 0;
let timer = 0;
let keys = [];
let startStamp;
let interval;
let interval2;
let font;
let score = 0;
let clicking = false;
let speedTime = 0;
let moveTime = 100;
let isPlaying = false;
let ending = false;
let fireworked = false;
let usedSkill = false;


let mouseX = 0;
let mouseY = 0;

let animation;
const storage = localStorage;

let hp = 3;

const width = 1024;
const height = 600;

const player = {
    x: width / 2 - 5,
    y: height / 2 - 5,
    d: 10,
    depth: 2,
    color: "Aqua",
    render() {
        ctx.save();
        const playerBgGrd = ctx.createLinearGradient(this.x - this.depth, this.y - this.depth, this.x + this.d + this.depth, this.y + this.d + this.depth);
        playerBgGrd.addColorStop(0, "lightblue");
        playerBgGrd.addColorStop(1, "darkblue");
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = playerBgGrd;
        ctx.fillRect(this.x - this.depth, this.y - this.depth, this.d + this.depth, this.d + this.depth);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3 * hp + 0.1;
        ctx.fillRect(this.x, this.y, this.d, this.d);
        ctx.restore();

    },
    reset() {
        this.x = width / 2 - 5;
        this.y = height / 2 - 5;
        this.d = 10;
    }
}

getData();
levelEl.innerText = `레벨 : ${level}`;
coinEl.innerText =  `코인 : $${coin}`;

class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.r = 5;

        this.dx = bulletSpeed * Math.cos(angle);
        this.dy = bulletSpeed * Math.sin(angle);
    }

    move() {
        this.x += this.dx;
        this.y += this.dy;
    }

    render() {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Roundy {
    constructor(x, y, r, c) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.c = c;
        this.speed = 0.1 / r
    }
    render() {
        ctx.fillStyle = this.c;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
    }
    move() {
        this.x = lerp(this.x, player.x, this.speed);
        this.y = lerp(this.y, player.y, this.speed);
    }

    checkCollision() {
        const dx = this.x - Math.max(player.x, Math.min(this.x, player.x + player.d));
        const dy = this.y - Math.max(player.y, Math.min(this.y, player.y + player.d));
        return (dx * dx + dy * dy) <= (this.r * this.r);
    }

    checkDeath() {
        for (let bullet of bullets) {
            const dx = this.x - bullet.x;
            const dy = this.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.r + bullet.r) {
                // 충돌 시 처리: 총알과 적의 충돌
                return true;
            }
        }
        return false;
    }
}

class Spiky {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = 0.1 / size;
    }

    render() {
        ctx.fillStyle = "LightCoral";
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.size / 2, this.y + this.size * Math.SQRT_3 / 2);
        ctx.lineTo(this.x + this.size / 2, this.y + this.size * Math.SQRT_3 / 2);
        ctx.fill();
    }

    checkCollision() {
        const triangleVertices = this.getTriangleVertices();
        const squareVertices = this.getSquareVertices();

        // 삼각형의 모든 변과 사각형의 모든 변에 대해 교차점을 검사합니다.
        function doPolygonsIntersect(polygon1, polygon2) {
            for (let i = 0; i < polygon1.length; i++) {
                const p1 = polygon1[i];
                const p2 = polygon1[(i + 1) % polygon1.length];
                for (let j = 0; j < polygon2.length; j++) {
                    const q1 = polygon2[j];
                    const q2 = polygon2[(j + 1) % polygon2.length];
                    if (doLinesIntersect(p1, p2, q1, q2)) {
                        return true;
                    }
                }
            }
            return false;
        }

        function doLinesIntersect(p1, p2, q1, q2) {
            const denom = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
            if (denom === 0) return false;

            const ua = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / denom;
            const ub = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / denom;

            return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
        }

        return doPolygonsIntersect(triangleVertices, squareVertices);
    }

    getTriangleVertices() {
        const halfSize = this.size / 2;
        return [
            { x: this.x, y: this.y },
            { x: this.x - halfSize, y: this.y + this.size * Math.SQRT_3 / 2 },
            { x: this.x + halfSize, y: this.y + this.size * Math.SQRT_3 / 2 }
        ];
    }

    getSquareVertices() {
        return [
            { x: player.x, y: player.y },
            { x: player.x + itemWH, y: player.y },
            { x: player.x + itemWH, y: player.y + itemWH },
            { x: player.x, y: player.y + itemWH }
        ];
    }

    distanceFromPointToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        const param = dot / len_sq;
        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // 삼각형 내부에 점이 있는지 확인합니다.
    pointInTriangle(px, py, v1, v2, v3) {
        const area = (v1.x * (v2.y - v3.y) + v2.x * (v3.y - v1.y) + v3.x * (v1.y - v2.y)) / 2;
        const s = 1 / (2 * area) * (px * (v2.y - v3.y) + v1.x * (v3.y - py) + v2.x * (py - v1.y));
        const t = 1 / (2 * area) * (v1.x * (v3.y - v2.y) + px * (v2.y - v1.y) + v2.x * (v1.y - v3.y));
        return s >= 0 && t >= 0 && (s + t) <= 1;
    }

    // 원과 삼각형의 충돌을 검사합니다.
    isCircleIntersectTriangle(circle) {
        const triangleVertices = this.getTriangleVertices();

        // 원의 중심이 삼각형 내부에 있는 경우 충돌
        if (this.pointInTriangle(circle.x, circle.y, triangleVertices[0], triangleVertices[1], triangleVertices[2])) {
            return true;
        }

        // 삼각형의 각 변과 원 사이의 거리 계산
        const minDistance = Math.min(
            this.distanceFromPointToLine(circle.x, circle.y, triangleVertices[0].x, triangleVertices[0].y, triangleVertices[1].x, triangleVertices[1].y),
            this.distanceFromPointToLine(circle.x, circle.y, triangleVertices[1].x, triangleVertices[1].y, triangleVertices[2].x, triangleVertices[2].y),
            this.distanceFromPointToLine(circle.x, circle.y, triangleVertices[2].x, triangleVertices[2].y, triangleVertices[0].x, triangleVertices[0].y)
        );

        return minDistance <= circle.r;
    }

    checkDeath() {
        for (let bullet of bullets) {
            if (this.isCircleIntersectTriangle(bullet)) {
                return true;
            }
        }
        return false;
    }

    move() {
        this.x = lerp(this.x, player.x, this.speed);
        this.y = lerp(this.y, player.y, this.speed);
    }
}

class Button {
    constructor(x, y, w, h, text) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.t = text;
    }
    render() {
        ctx.strokeStyle = "white"
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.font = "20px WAGURITTF";
        ctx.fillText(this.t, this.x + 25, this.y + 25);
    }
    isClicking(mx, my) {
        return mx >= this.x && mx <= this.x + this.w &&
            my >= this.y && my <= this.y + this.h;
    }
}

class HealItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    render() {

        ctx.fillStyle = "Lime";
        ctx.fillRect(this.x + 15, this.y, 20, itemWH);
        ctx.fillRect(this.x, this.y + 15, itemWH, 20);
    }
}

class BoostItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    render() {
        ctx.fillStyle = "Maroon";
        ctx.fillRect(this.x, this.y, 20, itemWH);
        ctx.beginPath()
        ctx.moveTo(this.x + 20, this.y + 25);
        ctx.lineTo(this.x + itemWH, this.y + itemWH - 10);
        ctx.lineTo(this.x + itemWH, this.y + itemWH);
        ctx.lineTo(this.x, this.y + itemWH);
        ctx.fill();
    }
}

class BulletItem {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    render() {
        ctx.fillStyle = "gold";
        ctx.fillRect(this.x, this.y, itemWH, itemWH * 2 / 3);
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2; // 크기
        this.speedX = Math.random() * 6 - 3; // X 방향 속도
        this.speedY = Math.random() * -6 - 1; // Y 방향 속도
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.friction = 0.98; // 마찰
        this.gravity = 0.1; // 중력
    }

    update() {
        this.speedY += this.gravity; // 중력 적용
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= this.friction; // 크기 감소
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 불꽃놀이 생성
function createFirework(x, y) {
    const particleCount = 1000;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(x, y));
    }
}

const preload = () => {
    font = new FontFace('WAGURITTF', "url('https://fastly.jsdelivr.net/gh/projectnoonnu/2403@1.0/WAGURITTF.woff2')");
    font.load().then(() => {
        document.fonts.add(font);
    }).catch((e) => {
        console.error(e)
    });
}

main.style.display = "none";
preload();

function main_funct() {
    start_el.hidden = true;
    main.style.display = "flex";
    canvas.hidden = true;
    getData();
    document.getElementById("level").innerText = `레벨 : ${level}`
}

const start = () => {
    start_el.hidden = true;
    canvas.hidden = false;
    isPlaying = true;
    main.style.display = "none";
    interval = setInterval(() => {
        spawnEnemies();
    }, enemySpawnTime);
    interval2 = setInterval(() => {
        if (speedTime > 0) {
            speedTime -= 1;
        } else {
            playerMoveSpeed = playerOriginSpeed;
        }
    }, 1000);

    if (type == 0) {
        skillCool = 10000;
        skill_duration = 10;
        hp = 3;
    } else if (type == 1) {
        skillCool = 10000000000;
        skill_duration = 0;
        hp = 5;
    } else if (type == 2) {
        skillCool = 1000;
        skill_duration = 10000;
        hp = 3;
    }

    skillTime = 0;
    bulletCount = maxBullet;
    animation = requestAnimationFrame(frame);
};

function choose(s) {
    type = s;
}


function frame(timestamp) {
    clearScore = Math.round((50 + (level / 100) * 9950) / 50) * 50;
    canvas.width = width;
    canvas.height = height;

    player.render();

    let hearts = ""
    for (let i = 0; i < hp; i++) {
        hearts += "❤️";
    }
    ctx.fillStyle = "white";
    ctx.font = "15px WAGURITTF";
    ctx.fillText(`${hearts}`, 30, 30);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "13px WAGURITTF";
    ctx.fillText(`Score  ${score}/${clearScore} : `, 30, 60);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "13px WAGURITTF";
    ctx.fillText(`Level : ${level}`, 30, 90);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "13px WAGURITTF";
    ctx.fillText(`${bulletCount} / ${maxBullet}`, 30, 120);
    ctx.fill();

    movement();
    mouse();

    items.map((a, i, o) => {
        a.render()
        if (checkCollision(a)) {
            if (a instanceof HealItem) {
                hp++;
                o.splice(i, 1);
                score += 10;
            }
            else if (a instanceof BulletItem) {
                magazineCount++;
                o.splice(i, 1);
                score += 10;
            }
            else {
                playerMoveSpeed += 1;
                speedTime += 10;
                o.splice(i, 1);
                score += 20;
            }
            
        }
    });

    if (usedSkill && type == 1) {
        enemies = [];
        usedSkill = false;
    }


    if (usedSkill) {
        if (timer - skillTime > skill_duration) {
            usedSkill = false;
        }
    }

    if (startStamp) {
        timer = timestamp - startStamp;
    } else {
        startStamp = timestamp
    }


    enemies.map((a, i, o) => {
        if (a.checkCollision()) {
            hp -= 1;
            o.splice(i, 1)
        }
        if (a.checkDeath()) {
            o.splice(i, 1);
            if (a instanceof Roundy) {
                score += 1;
            }
            else if (a instanceof Spiky) {
                score += 5
            }

        }

        if (usedSkill && type == 2) {
            //  just stop because of 계엄령
        } 
        else if (usedSkill && type == 0) {
            if (Math.abs(a.x - player.x - player.d / 2) < 300 && Math.abs(a.y - player.y - player.d / 2) < 300) {
                o.splice(i, 1);
                score += 1;
            }
            a.move();
        } 
        else {
            a.move();
        }
        a.render();
    });

    bullets.map((a, i, o) => {
        a.move();
        a.render();
        if (width < a.x || a.x < 0) {
            o.splice(i, 1);
        }
        if (height < a.y || a.y < 0) {
            o.splice(i, 1);
        }
    });
    if (hp > 0) {
        animation = requestAnimationFrame(frame);
    } else {
        ctx.clearRect(0, 0, width, height);
        end();
    }

    if (ending) {
        keys = [];
        ctx.clearRect(0, 0, width, height);
        if (particles.length === 0 && !fireworked) {
            createFirework(width / 2, height / 2); // 중앙에서 생성
            fireworked = true;
            level += 1
        }

        // 파티클 업데이트 및 그리기
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].size <= 0.3) {
                particles.splice(i, 1); // 크기가 작아지면 제거
                i--;
            }
        }

        ctx.font = "30px WAGURITTF";
        ctx.fillStyle = "white";
        ctx.fillText(`Stage  Clear!`, width / 2 - 100, height / 2 - 100);
        ctx.fillText(`코인 : + ${level * 100 + hp * 10}`, width / 2 - 100, height / 2 - 150)

        ctx.fillStyle = "white";
        mainButton = new Button(width / 2 - 90, height / 2 - 20, 130, 40, "메인화면");
        mainButton.render();
        hp = 3;
        bullets = [];
        enemies = [];
        items = [];
        player.reset();
        playerMoveSpeed = playerOriginSpeed;
        score = 0;
        isPlaying = false;
    }

    if (score >= clearScore) {
        stageClear();
    }

}

function movement() {
    let dx = 0;
    let dy = 0;

    if (keys.includes("KeyW")) dy -= playerMoveSpeed;
    if (keys.includes("KeyS")) dy += playerMoveSpeed;
    if (keys.includes("KeyA")) dx -= playerMoveSpeed;
    if (keys.includes("KeyD")) dx += playerMoveSpeed;

    if (keys.includes("ShiftLeft") || keys.includes("ShiftRight")) {
        if (timer - dashTime > 500 || dashTime == 0) {
            dx *= playerDashSpeed;
            dy *= playerDashSpeed;
            dashTime = timer;
        }
    }

    if (keys.includes("KeyQ")) {
        if (timer - magazineChangeTime > 100 && magazineCount > 0) {
            magazineCount--;
            bulletCount = maxBullet;
            magazineChangeTime = timer;
        }
    }

    if (keys.includes("KeyE")) {
        if (timer - skillTime > skillCool || skillTime == 0) {
            usedSkill = true;
            skillTime = timer;
            console.log("스킬 발동!");

            if (type == 0) {
                hp -= 1;
            } else if (type == 2) {
                hp -= 1
            }
        }
    }
    // 플레이어의 위치를 업데이트
    player.x += dx * (timer - moveTime) / 1000;
    player.y += dy * (timer - moveTime) / 1000;

    moveTime = timer;

    // 플레이어가 화면 경계를 넘었을 때 경계에 붙게 처리
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x + player.d > width) {
        player.x = width - player.d;
    }

    if (player.y < 0) {
        player.y = 0;
    } else if (player.y + player.d > height) {
        player.y = height - player.d;
    }
}

function mouse() {
    if (timer - shootTime > shootCool || shootTime == 0) {
        if (clicking && bulletCount > 0) {
            const coordPosX = mouseX - player.x;
            const coordPosY = mouseY - player.y;
            const angle = Math.atan2(coordPosY, coordPosX);

            const bullet = new Bullet(player.x + player.d / 2, player.y + player.d / 2, angle);

            bullets.push(bullet);

            shootTime = timer;

            bulletCount --;
        }
    }
}

function spawnEnemies() {
    const n = Math.floor(Math.random() * 80);
    if (n == 0) {
        const x = Math.floor(Math.random() * (width - 40) + 10);
        const y = Math.floor(Math.random() * (height - 40) + 10);
        const newItem = new HealItem(x, y);
        items.push(newItem);
    }
    else if (n == 1) {
        const x = Math.floor(Math.random() * (width - 40) + 10);
        const y = Math.floor(Math.random() * (height - 40) + 10);
        const newItem = new BoostItem(x, y);
        items.push(newItem);
    }
    else if (n == 2) {
        const x = Math.floor(Math.random() * (width - 40) + 10);
        const y = Math.floor(Math.random() * (height - 40) + 10);
        const newItem = new BulletItem(x, y);
        items.push(newItem);
    }
    else if (3 <= n && n <= 22) {
        let x;
        let y;
        let size;
        let newE;

        do {
            x = Math.floor(Math.random() * (width - 40) + 10);
            y = Math.floor(Math.random() * (height - 40) + 10);
            size = Math.floor(Math.random() * 40 + 20);
            newE = new Spiky(x, y, size);
        } while (newE?.checkCollision());

        enemies.push(newE);
    } else {
        let x;
        let y;
        let r;
        let newE;

        do {
            x = Math.floor(Math.random() * (width - 40) + 10);
            y = Math.floor(Math.random() * (height - 40) + 10);
            r = Math.floor(Math.random() * 30 + 10);
            newE = new Roundy(x, y, r, "red");
        } while (newE?.checkCollision());

        enemies.push(newE);
    }

}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function checkCollision(item) {
    // 아이템과 플레이어의 충돌을 검사합니다.
    const dx1 = player.x + player.d - item.x;
    const dx2 = item.x + itemWH - player.x;
    const dy1 = player.y + player.d - item.y;
    const dy2 = item.y + itemWH - player.y;

    return dx1 > 0 && dx2 > 0 && dy1 > 0 && dy2 > 0;
}
function end() {
    cancelAnimationFrame(animation);
    clearInterval(interval);
    clearInterval(interval2);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    ctx.font = "30px WAGURITTF";
    ctx.fillStyle = "white";
    ctx.fillText("Game Over!", width / 2 - 100, height / 2 - 100);

    ctx.font = "15px WAGURITTF";
    ctx.fillText(`Score : ${score}`, width / 2 - 60, height / 2 - 50);

    ctx.fillStyle = "white";
    mainButton = new Button(width / 2 - 90, height / 2 - 20, 130, 40, "메인화면");
    mainButton.render();


    hp = 3;
    bullets = [];
    enemies = [];
    items = [];
    player.reset();
    playerMoveSpeed = playerOriginSpeed;
    score = 0;
    isPlaying = false;

    levelEl.innerText = `레벨 : ${level}`;
    coinEl.innerText =  `코인 : $${coin}`;

    bulletCount = maxBullet;
    magazineCount = 1;
}

function stageClear() {
    coin += level * 100 + hp * 10;
    clearInterval(interval);
    clearInterval(interval2);
    ending = true;

    bulletCount = maxBullet;
    magazineCount = 1;

    levelEl.innerText = `레벨 : ${level}`;
    coinEl.innerText =  `코인 : $${coin}`;
}

function getData() {

    if (!storage.getItem("ns_data")) {
        storage.setItem("ns_data", btoa(JSON.stringify({ levelData: level, coinData: coin })));
        return;
    }
    let { levelData, coinData } = JSON.parse(atob(storage.getItem("ns_data")));
    if (level > levelData) {
        console.log(btoa(JSON.stringify({ levelData: levelData, coinData: Math.max(coin, coinData) })))
        storage.setItem("ns_data", btoa(JSON.stringify({ levelData: level, coinData: Math.max(coin, coinData) })));
    } else {
        level = levelData;
        coin = Math.max(coin, coinData);
    }
}

function reset() {
    storage.setItem("ns_data", btoa(JSON.stringify({ levelData: 0, coinData: 0 })));
    level = 0;
    coin = 0;
    getData();
    levelEl.innerText = `레벨 : ${level}`;
    coinEl.innerText =  `코인 : $${coin}`;
}

document.getElementById("title").addEventListener("animationend", () => {
    main_funct();
})

document.addEventListener("keydown", ({ code }) => {
    if (keys.includes(code)) {
        return;
    }
    keys.push(code);
});

document.addEventListener("keyup", ({ code }) => {
    keys.splice(keys.indexOf(code), 1);
});

document.addEventListener("mousedown", ({ clientX, clientY, button }) => {
    if (button === 0) { // Left click // 이벤트 핸들러에서 캔버스의 좌표를 얻습니다.
        const rect = canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        if (mainButton && mainButton.isClicking(canvasX, canvasY) && !isPlaying) {
            ctx.clearRect(0, 0, width, height);
            fireworked = false;

            ending = false;
            getData();
            cancelAnimationFrame(animation);
            particles = [];
            main_funct();

        }

        clicking = true;
        mouseX = canvasX;
        mouseY = canvasY;
    }
});

document.addEventListener("mousemove", ({ clientX, clientY, button }) => {
    if (button == 0) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        mouseX = canvasX;
        mouseY = canvasY;
    }
});

document.addEventListener("mouseup", () => {
    clicking = false;
});

window.addEventListener("blur", () => {
    keys = [];
});
