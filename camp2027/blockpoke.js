(() => {
  'use strict';
  const camp = window.CAMP_DATA?.camps.find(c => c.id === 'blockpoke');
  const section = document.getElementById('blockpoke');
  if (!camp?.gallery || !section) return;
  const image = document.getElementById('blockpokeImage');
  const source = document.getElementById('blockpokeAvif');
  const caption = document.getElementById('blockpokeCaption');
  const link = document.getElementById('blockpokePosterLink');
  const buttons = [...section.querySelectorAll('[data-blockpoke-image]')];
  buttons.forEach(button => button.addEventListener('click', () => {
    const photo = camp.gallery[Number(button.dataset.blockpokeImage)];
    if (!photo) return;
    source.srcset = `${photo.mobile.replace('.webp', '.avif')} 720w, ${photo.src.replace('.webp', '.avif')} 1600w`;
    image.srcset = `${photo.mobile} 720w, ${photo.src} 1600w`;
    image.src = photo.src;
    image.alt = photo.caption;
    link.href = photo.src;
    link.setAttribute('aria-label', `放大查看：${photo.label}`);
    caption.textContent = photo.caption;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
})();
