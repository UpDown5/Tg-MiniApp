export function initRoulette({ betInput, typeSelect, numberInput, spinBtn, canvas, onWin, onLose, onSpend }) {
  const ctx = canvas.getContext("2d");
  const nums = Array.from({length:37}, (_,i)=>i);
  const reds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  let spinning = false, angle = 0, targetIndex = 0;

  function drawWheel(a=0) {
    const r = canvas.width/2; ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save(); ctx.translate(r,r); ctx.rotate(a);
    nums.forEach((n,i)=>{
      const start = (i/37)*Math.PI*2, end = ((i+1)/37)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.arc(0,0,r,start,end);
      ctx.closePath();
      const color = n===0 ? "#243047" : (reds.has(n) ? "#6c5ce7" : "#00b4ff");
      ctx.fillStyle = color; ctx.fill();
    });
    // center
    ctx.beginPath(); ctx.fillStyle="#0b0d12"; ctx.arc(0,0,r*0.6,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // marker
    ctx.beginPath(); ctx.fillStyle="#e8ebf2";
    ctx.moveTo(canvas.width/2, 4);
    ctx.lineTo(canvas.width/2-8, 18);
    ctx.lineTo(canvas.width/2+8, 18);
    ctx.closePath(); ctx.fill();
  }

  function spin() {
    if (spinning) return;
    const bet = Math.max(1, betInput.value|0);
    if (!onSpend(bet)) return;
    spinning = true;
    targetIndex = Math.floor(Math.random()*37);
    let speed = 0.35, decay = 0.985;
    const loop = () => {
      angle += speed;
      speed *= decay;
      drawWheel(angle);
      if (speed < 0.005) {
        spinning = false;
        // compute result index from angle
        const a = (angle%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        const seg = (Math.PI*2)/37;
        const hit = Math.floor(((Math.PI*2 - a) + seg/2) / seg) % 37;
        resolve(nums[hit], bet);
        return;
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  function resolve(n, bet) {
    const t = typeSelect.value;
    const label = `№${n}`;
    let win = 0;
    if (t==="single") {
      const pick = numberInput.value|0;
      if (pick===n) win = bet*36;
    } else if (t==="red") {
      if (reds.has(n)) win = bet*2;
    } else if (t==="black") {
      if (n!==0 && !reds.has(n)) win = bet*2;
    } else if (t==="even") {
      if (n!==0 && n%2===0) win = bet*2;
    } else if (t==="odd") {
      if (n%2===1) win = bet*2;
    }
    if (win>0) onWin(win, label); else onLose(label);
  }

  spinBtn.addEventListener("click", spin);
  drawWheel();
}