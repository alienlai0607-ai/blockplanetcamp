import {featuredGames} from './projects.js';

export function heroSource(game, id){
  if(game.heroSource)return game.heroSource;
  if(game.costume)return game.customArt?'saved':'builtin';
  return featuredGames.includes(id)?'studio':'builtin';
}

export function heroAppearance(game, id, partner){
  const source=heroSource(game,id);
  if(source==='studio'&&partner?.frames.some(frame=>frame.some(Boolean)))return partner;
  if(source==='drawing')return game.roles?.find(r=>r.id==='player')?.drawing;
  if(source==='saved')return game.costume;
  return null;
}

// Exports and independent copies carry the exact partner used when saved.
export function portableGame(game,id,partner){
  const copy=structuredClone(game);
  if(heroSource(game,id)!=='studio')return copy;
  const hero=heroAppearance(game,id,partner);
  copy.heroSource=hero?'saved':'builtin';
  copy.customArt=Boolean(hero);
  if(hero){
    copy.costume={name:hero.name,size:hero.size,fps:hero.fps,frames:structuredClone(hero.frames),
      background:structuredClone(game.costume?.background??hero.background)};
  }
  return copy;
}
