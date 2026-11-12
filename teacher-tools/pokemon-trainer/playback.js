import {frameAt} from './model.js?v=3';

// Preview has its own clock: it never selects or edits a stored drawing frame.
export class AnimationPlayer {
  // Keep native Window timer calls on their global receiver. Calling a stored
  // native function as this.setTimer(...) throws Illegal invocation in browsers.
  constructor(onFrame, {setTimer=(callback,delay)=>globalThis.setTimeout(callback,delay), clearTimer=id=>globalThis.clearTimeout(id), now=()=>performance.now()}={}) {
    Object.assign(this,{onFrame,setTimer,clearTimer,now});this.running=false;this.timer=null;this.index=0;
  }
  start(project) {
    this.stop();if(project.frames.length<2)return false;
    this.project=project;this.startedAt=this.now();this.running=true;this.tick();return true;
  }
  tick() {
    if(!this.running)return;
    this.index=frameAt(this.project,this.now()-this.startedAt);this.onFrame(this.index);
    this.timer=this.setTimer(()=>this.tick(),1000/this.project.fps);
  }
  stop() { this.running=false;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null; }
}
