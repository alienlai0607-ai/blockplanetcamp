// Older projects stored two touch gestures in the game settings. Materialize them
// as ordinary editable rules once, including projects with a saved Blockly layout.
export function prepareTouch(p){
  if(p.touchProgram===1)return p;
  const rules=[];
  const add=(on,step)=>rules.push({on,when:'always',ms:1000,steps:[step]});
  if(p.control==='drag'){
    add('drag',{op:'dragActor',role:'player',axes:'xy'});
  }else if(p.control==='run'){
    for(const [on,value] of [['leftSide',-p.speed],['rightSide',p.speed],['up',0]]){
      add(on,{op:'walkActor',role:'player',value});
    }
  }
  p.touchProgram=1;
  p.rules.unshift(...rules);
  if(p.blockLayout&&rules.length){
    const old=p.blockLayout.blocks;
    for(const b of old)b.y=(b.y||0)+rules.length*145;
    old.unshift(...rules.map((r,i)=>{
      const {op,...fields}=r.steps[0];
      return {type:'bp_on_'+r.on,x:26,y:28+i*145,inputs:{DO:{block:{type:'bp_'+op,fields}}}};
    }));
  }
  return p;
}
