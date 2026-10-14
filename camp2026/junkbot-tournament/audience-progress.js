/* Spectators see the live match first; bracket controls keep their position on refresh. */
'use strict';
const progressOriginalAudienceRender = renderAudience;
renderAudience = function() {
  const position = judgeCaptureViewPosition();
  const expanded = [...document.querySelectorAll('#audienceView details[open]')].map(node => node.className);
  progressOriginalAudienceRender();
  const root = $('audienceView');
  const bracket = root.querySelector('.audience-bracket');
  if (bracket) bracket.id = 'audienceProgress';
  root.querySelectorAll('details').forEach(node => { if (expanded.includes(node.className)) node.open = true; });
  if (bracket) scheduleBracketConnections();
  judgeRestoreViewPosition(position);
};


window.addEventListener('storage', event => {
  if (DEMO && role === 'audience' && event.key === JUDGE_DESK_STORAGE) loadCampusState(true);
});
