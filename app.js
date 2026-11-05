const scenes = {
  'low-tide': { title: 'Low Tide', status: 'Done', location: 'Harbour Office', count: 194, paragraphs: [
    'The tide clock in the harbour office had not missed a minute in forty years, so when Mara Quill unlocked the door on Monday and found its hands resting at twenty past four, she stood in the doorway for a long moment with the key still in her fingers.',
    'Outside, the boats leaned in the mud like tired animals. The water was a long way out. Nothing in the room was broken. The kettle was where she had left it, the charts were rolled, the window latched.',
    'Only the clock had stopped, and the brass pendulum hung as still as a plumb line.'
  ] },
  ledger: { title: 'The Ledger Is Gone', status: 'Revised', location: 'Harbour Office', count: 167, paragraphs: [
    'It took her until nine o’clock to notice the gap on the shelf. The tide ledger, green cloth and cracked at the spine, had stood between the almanacs every day of her working life. Every high water since 1911 was written in it, in six different hands.',
    'Mara searched the drawers, the coal box, the space behind the stove. She found a sixpence, a moth, and a photograph of the old harbourmaster holding a fish. She did not find the ledger.',
    'Nobody steals a book of tides, she told herself. There is nothing in it but numbers.'
  ] },
  edith: { title: 'Tea with Edith', status: 'Revised', location: 'Edith’s cottage', count: 174, paragraphs: [
    'Edith Sayle poured the tea before Mara had finished her first sentence, as if she had been expecting the visit. Her cottage smelled of tar soap and geraniums, and a barometer ticked on the wall beside the door.',
    '“Ledgers go missing,” Edith said. “Paper walks. When I was harbourmaster, the 1932 volume turned up in the vicar’s greenhouse.” She smiled at the barometer rather than at Mara, and her cup did not quite reach her mouth.',
    'Mara asked about the keeper. Edith set the cup down.'
  ] }
};
let activeScene = 'low-tide';
const tabs = [...document.querySelectorAll('[role="tab"]')];
function setMode(mode, focus = false) {
  tabs.forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    if (active && focus) tab.focus();
  });
  document.getElementById('demo-instruction').textContent = {
    write: 'Choose a scene in the sidebar. Make yourself at home.',
    plan: 'Step back and see your chapters and scenes together.',
    revise: 'A note for later. A version to come back to.'
  }[mode];
  document.getElementById('footer-caption').textContent = mode === 'write'
    ? `Scene ${scenes[activeScene].count} · Today 412 / 1,250`
    : mode === 'plan' ? 'Your story, in order. Room to rearrange.' : 'A draft can change. A saved version stays.';
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); setMode(tabs[next].dataset.mode, true); }
  });
});
function showScene(key) {
  activeScene = key;
  const scene = scenes[key];
  document.getElementById('scene-title').textContent = scene.title;
  document.getElementById('scene-status').textContent = scene.status;
  document.getElementById('scene-status').style.background = scene.status === 'Done' ? '#e4e9da' : '#e0e5e9';
  document.getElementById('scene-status').style.color = scene.status === 'Done' ? '#526849' : '#5a6c7d';
  document.getElementById('scene-location').textContent = scene.location;
  const manuscript = document.getElementById('scene-text');
  manuscript.replaceChildren(...scene.paragraphs.map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  document.querySelectorAll('[data-scene]').forEach(button => {
    const selected = button.dataset.scene === key;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  setMode('write');
}
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => showScene(button.dataset.scene)));
showScene(activeScene);
