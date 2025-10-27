export function initPlinko({ betInput, rowsInput, playBtn, canvas, onWin, onSpend }) {
  const ctx = canvas.getContext("2d");
  let pegs = [], rows = rowsInput.value|0, ball = null, anim = null, cols = rows + 1;
  function layout() {
    rows = rowsInput.value|0;
    cols = rows + 1;
    pegs = [];
    const w = canvas.width, h = canvas.height;
    const margin = 24, top = 60, spacingX = (w - margin*2) / cols, spacingY = (h - top - 80) / rows;
    for (let r=0; r<rows; r++) {
      for (let c=0; c<=r; c++) {
        const x = margin + ((cols - r) * spacingX)/2 + c*spacingX;
        const y = top + r*spacingY;
        pegs.push({ x, y });
      }
    }
    drawBoard();
  }
  function drawBoard() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    // slots
    const slotW = w / cols;
    for (let i=0;i<cols;i++) {
      ctx.fillStyle = i%2===0 ? "#0f1420" : "#0c1018";
      ctx.fillRect(i*slotW, h-50, slotW, 50);
    }
    // pegs
    pegs.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = "#243047";
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fill();
    });
    // multipliers at bottom (rough, higher edges)
    ctx.fillStyle = "#a9b4c7";
    ctx.textAlign = "center"; ctx.font = "12px Space Mono";
    for (let i=0;i<cols;i++) {
      const mult = edgeMultiplier(i, cols);
      ctx.fillText(`×${mult.toFixed(2)}`, (i+0.5)*slotW, canvas.height-32);
    }
    if (ball) {
      ctx.beginPath();
      ctx.fillStyle = "#6c5ce7";
      ctx.arc(ball.x, ball.y, 7, 0, Math.PI*2);
      ctx.fill();
    }
  }
  function edgeMultiplier(i, c) {
    const mid = (c-1)/2;
    const d = Math.abs(i - mid);
    return 0.5 + (d / mid) * 3.0; // edges bigger
  }
  function startBall() {
    const bet = Math.max(1, betInput.value|0);
    if (!onSpend(bet)) return;
    ball = { x: canvas.width/2, y: 30, vx: 0, vy: 1.5 };
    cancelAnimationFrame(anim);
    step();
  }
  function step() {
    const g = 0.08, drag = 0.995;
    ball.vy += g;
    ball.vx *= drag; ball.vy *= drag;
    ball.x += ball.vx; ball.y += ball.vy;

    // collisions as discrete rows: nudge left/right around peg rows
    for (let r=0;r<rows;r++) {
      const ry = pegs[r*(r+1)/2]?.y || 0;
      if (Math.abs(ball.y - ry) < 0.5) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        ball.vx += dir * (0.8 + Math.random()*0.6);
      }
    }

    // walls
    if (ball.x < 8) { ball.x = 8; ball.vx = Math.abs(ball.vx)*0.6; }
    if (ball.x > canvas.width-8) { ball.x = canvas.width-8; ball.vx = -Math.abs(ball.vx)*0.6; }

    // floor / slot settle
    if (ball.y >= canvas.height-55) {
      const slotW = canvas.width / cols;
      const idx = Math.max(0, Math.min(cols-1, Math.floor(ball.x / slotW)));
      const mult = edgeMultiplier(idx, cols);
      const win = Math.round((betInput.value|0) * mult);
      onWin(win, mult);
      ball = null;
      drawBoard();
      return;
    }
    drawBoard();
    anim = requestAnimationFrame(step);
  }

  playBtn.addEventListener("click", startBall);
  rowsInput.addEventListener("change", () => layout());
  layout();
}