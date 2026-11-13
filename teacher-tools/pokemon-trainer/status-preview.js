// Preview uses the same 3 x 7 digit shapes and 466 px layout as the device.
const glyphs={"0": "111101101101101101111", "1": "010110010010010010111", "2": "111001001111100100111", "3": "111001001111001001111", "4": "101101101111001001001", "5": "111100100111001001111", "6": "111100100111101101111", "7": "111001001010010010010", "8": "111101101111101101111", "9": "111101101111001001111", ":": "000010010000010010000", "%": "101001001010100100101", "-": "000000000111000000000", "U": "101101101101101101111", "S": "111100100111001001111", "B": "110101101110101101110"};
export function drawStatusPreview(canvas,hour=12,minute=30,pct=85){
 const g=canvas.getContext('2d'),ink='#273b2e',paper='#f7f1d6',green='#4c8556';
 const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
 const box=(x,y,w,h,c)=>{rect(x+3,y,w-6,h,c);rect(x,y+3,w,h-6,c);};
 const text=(s,x,y)=>{for(const c of s){const p=glyphs[c]||'0'.repeat(21);for(let j=0;j<7;j++)for(let i=0;i<3;i++)if(p[j*3+i]==='1')rect(x+i*2,y+j*2,2,2,ink);x+=8;}};
 box(144,23,182,30,'#293732');box(142,20,182,30,ink);box(144,22,178,26,paper);
 rect(152,28,12,14,ink);rect(154,30,8,10,paper);rect(157,31,2,6,ink);rect(159,35,3,2,ink);
 text(String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'),172,28);
 rect(224,27,2,16,'#b8c4a3');rect(238,28,22,14,green);rect(239,29,20,12,paper);rect(260,32,2,6,green);rect(240,30,Math.floor(18*pct/100),10,green);text(pct+'%',268,28);
}
