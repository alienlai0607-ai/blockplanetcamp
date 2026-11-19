// Sprite variables belong to a project. Blocks store their stable IDs so that renaming is safe.
import {skins} from './projects.js';

export const categories={Player:'玩家',Enemy:'敵人',Food:'道具',Projectile:'發射物'};
export function roleCategory(r){
  return r.category||({player:'Player',enemy:'Enemy',danger:'Enemy',fire:'Enemy',bullet:'Projectile'}[r.id]||'Food');
}
export const legacyPairs = {
  bottle:['player','bottle'], coin:['player','coin'], flower:['player','flower'],
  enemy:['player','enemy'], fire:['player','fire'], danger:['player','danger'],
  goal:['player','goal'], hit:['bullet','enemy'], stomp:['player','enemy']
};
const defaults = {bottle:'bottle',coin:'coin',flower:'flower',enemy:'walker',fire:'fire',danger:'fire',goal:'coin',bullet:'shot'};
const names = {enemy:'障礙物',danger:'陷阱',goal:'終點',bullet:'發射物'};
export function prepareRoles(p){
  if(p.roles)return;
  const roles=new Map();
  function add(id,art=defaults[id],name=names[id]||skins[art]){
    if(!roles.has(id))roles.set(id,{id,name,art});
  }
  add('player',p.art,'主角');
  function visit(steps){
    for(const a of steps){
      if(a.op==='spawn')add(a.kind,a.art,skins[a.art]);
      if(a.op==='gate')add('enemy','pipe','冰柱');
      if(a.steps)visit(a.steps);
    }
  }
  for(const r of [...p.rules,...p.functions])visit(r.steps);
  for(const r of p.rules)for(const id of legacyPairs[r.on]||[])add(id);
  for(const rows of p.levels)for(const ch of new Set(rows.join(''))){
    const kind={B:'bottle',o:'coin',f:'flower',w:'enemy',b:'enemy','*':'fire',G:'goal','!':'danger'}[ch];
    if(kind)add(kind);
  }
  if(roles.size===1)add('item','flower','道具');
  p.roles=[...roles.values()];
}
