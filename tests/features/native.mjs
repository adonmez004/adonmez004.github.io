// Preparation only. Move, edit, cancel and resize through real input afterwards.
const host = () => document.querySelector('fm-inspector');
const prepare = armed => {
  const i = host();
  i.lens.arm('css'); i.lens.choose('css', document.querySelector('.card'));
  if (!armed) i.lens.arm('css', false);
  i.moveTo(560, 420);
};
document.querySelector('#armed').onclick = () => prepare(true);
document.querySelector('#plain').onclick = () => prepare(false);
document.querySelector('#hold').onclick = () => {
  const style = document.createElement('style');
  style.textContent = '.btn { max-width: 60px !important; }'; document.head.append(style);
  const i = host(); i.setSizing(true); i.chooseSize(document.querySelector('.btn')); i.moveTo(8, 8);
};
