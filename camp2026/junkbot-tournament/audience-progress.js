/* Spectator advancement follows the current round; completed rounds remain available. */
'use strict';
const progressOriginalAudienceRender = renderAudience;
renderAudience = function() {
  const position = judgeCaptureViewPosition();
  const expanded = [...document.querySelectorAll('#audienceView details[open]')].map(node => node.className);
  progressOriginalAudienceRender();
  const root = $('audienceView');
  const bracket = root.querySelector('.audience-bracket');
  const sync = root.querySelector('.audience-sync');
  const score = root.querySelector('.audience-multi-live,.live-stage,.champion-stage');
  if (bracket) {
    bracket.id = 'audienceProgress';
    // Put advancement first on normal spectator pages. Projection mode keeps its scoreboards.
    if (sync) sync.after(bracket); else root.prepend(bracket);
    if (score) {
      score.id = score.id || 'audienceScores';
      score.insertAdjacentHTML('beforebegin', '<div class="audience-return-progress"><a href="#audienceProgress">↑ 返回晉級進度</a></div>');
    }
  }
  if (bracket && score && sync) sync.insertAdjacentHTML('beforeend', `<a class="audience-score-link" href="#${score.id}">${tournamentIsComplete() ? '查看最終名次' : '查看即時賽場'} ↓</a>`);
  root.querySelectorAll('details').forEach(node => { if (expanded.includes(node.className)) node.open = true; });
  if (bracket) scheduleBracketConnections();
  judgeRestoreViewPosition(position);
};


window.addEventListener('storage', event => {
  if (DEMO && role === 'audience' && event.key === JUDGE_DESK_STORAGE) loadCampusState(true);
});
