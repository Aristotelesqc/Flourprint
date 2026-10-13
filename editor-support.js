let isEditDirty = false;
function markEditDirty() {
  isEditDirty = true;
}
function requestLeaveEdit() {
  if (!isEditDirty) {
    setScreen('recipe');
    return;
  }
  document.getElementById('dlgConfirmDiscard').classList.add('open');
}
function closeDiscardDialog() {
  document.getElementById('dlgConfirmDiscard').classList.remove('open');
}
function confirmDiscardAndLeave() {
  closeDiscardDialog();
  resetEditorBaseline();
  isEditDirty = false;
  setScreen('recipe');
  showToast('recipe', 'Modifications réinitialisées et abandonnées');
}
function resetEditorBaseline() {
  document.getElementById('edit-recipe-name-input').value = 'Poolish + tangzhong';
  setAnchorType('flour');
  document.getElementById('input-target-hydration').value = '75';
  document.getElementById('water-baker').value = '75';
  document.getElementById('water-grams').value = '750';
  document.getElementById('salt-baker').value = '2';
  document.getElementById('salt-grams').value = '20';
  document.getElementById('yeast-baker').value = '0.4';
  document.getElementById('yeast-grams').value = '4';
  document.getElementById('input-tangzhong-ratio').value = '1 : 5';
  if (document.getElementById('btn-toggle-lock').classList.contains('active')) {
    toggleLockEditor();
  }
}
function saveEdit() {
  isEditDirty = false;
  setScreen('recipe');
  showToast('recipe', 'Enregistrement de démonstration effectué (aucune écriture persistée)');
}
function setAnchorType(type) {
  ['flour', 'dough', 'pieces'].forEach(t => {
    const btn = document.getElementById('btn-anchor-' + t);
    if (btn) btn.classList.toggle('active', t === type);
  });
  const unitLbl = document.getElementById('label-anchor-unit');
  const inputVal = document.getElementById('input-anchor-grams');
  const gramsRow = document.getElementById('anchor-grams-row');
  const piecesRow = document.getElementById('anchor-pieces-row');
  if (type === 'pieces') {
    if (gramsRow) gramsRow.style.display = 'none';
    if (piecesRow) piecesRow.style.display = 'flex';
  } else {
    if (gramsRow) gramsRow.style.display = 'flex';
    if (piecesRow) piecesRow.style.display = 'none';
    if (type === 'flour') {
      if (unitLbl) unitLbl.textContent = 'g farine';
      if (inputVal) inputVal.value = '1000';
    } else {
      if (unitLbl) unitLbl.textContent = 'g pâte totale';
      if (inputVal) inputVal.value = '1774';
    }
  }
  markEditDirty();
}
function toggleLockEditor() {
  const btn = document.getElementById('btn-toggle-lock');
  const isCurrentlyLocked = btn.classList.contains('active');
  const nextLocked = !isCurrentlyLocked;
  btn.classList.toggle('active', nextLocked);
  btn.textContent = nextLocked ? 'Verrouillée' : 'Verrouiller';
  btn.style.color = nextLocked ? 'var(--color-primary)' : 'inherit';
  const note = document.getElementById('edit-absorb-note');
  const waterBaker = document.getElementById('water-baker');
  const waterGrams = document.getElementById('water-grams');
  const waterLabel = document.getElementById('label-water-row');
  const waterHint = document.getElementById('label-water-locked-hint');
  if (nextLocked) {
    if (note) note.textContent = 'L\’ingrédient Eau liquide absorbe les variations pour fixer l\’hydratation à 75 % (74,98 % / 749,8 g).';
    if (waterBaker) { waterBaker.value = '74.98'; waterBaker.readOnly = true; }
    if (waterGrams) { waterGrams.value = '749.8'; waterGrams.readOnly = true; }
    if (waterLabel) waterLabel.textContent = 'Eau (absorbante)';
    if (waterHint) waterHint.style.display = 'inline';
    showToast('edit', 'Hydratation verrouillée : eau fixée à 74,98 % (749,8 g)');
  } else {
    if (note) note.textContent = 'Hydratation déverrouillée : les ingrédients varient librement.';
    if (waterBaker) { waterBaker.value = '75'; waterBaker.readOnly = false; }
    if (waterGrams) { waterGrams.value = '750'; waterGrams.readOnly = false; }
    if (waterLabel) waterLabel.textContent = 'Eau';
    if (waterHint) waterHint.style.display = 'none';
    showToast('edit', 'Hydratation déverrouillée');
  }
  markEditDirty();
}
const editBackBtn = document.querySelector('#frame-edit .app-bar-start button');
if (editBackBtn) editBackBtn.setAttribute('onclick', 'requestLeaveEdit()');
const editMenuAbandon = document.querySelector('#menu-edit .menu-item');
if (editMenuAbandon) editMenuAbandon.setAttribute('onclick', "closeMenu('menu-edit'); requestLeaveEdit();");
const editSaveBtn = document.querySelector('#frame-edit .bottom-bar button');
if (editSaveBtn) editSaveBtn.setAttribute('onclick', 'saveEdit()');
if (typeof HELP_TOPICS !== 'undefined') {
  HELP_TOPICS.readiness = {
    title: 'Arrêt de fermentation (Profil)',
    content: 'Le profil d\’arrêt de fermentation définit le critère auquel la fermentation est jugée achevée. Le modèle théorique repose sur le développement volumétrique calculé. Le repère expérimental s\’appuie sur les observations enregistrées par le boulanger.'
  };
  HELP_TOPICS.fermentation = {
    title: 'Modèle de fermentation',
    content: 'La cinétique de fermentation intègre la dose de levure, la température de la pâte et la température ambiante pour projeter les durées de pointage et d\’apprêt sans imposer d\’arrêt automatique.'
  };
  HELP_TOPICS.waterTemp = {
    title: 'Température de l\’eau (Température de base)',
    content: 'La température de l\’eau de coulage est calculée à partir de la température ambiante, de la température de la farine et de l\’échauffement mécanique (friction) pour atteindre la température de pâte visée.'
  };
  HELP_TOPICS.schedule = {
    title: 'Ordonnancement du procédé',
    content: 'Les étapes sont ordonnancées soit au plus tôt (dès que les dépendances sont achevées), soit au plus tard (synchronisées sur le démarrage de l\’étape suivante, comme le préchauffage du four ou l\’échaudage).'
  };
  HELP_TOPICS.alap = {
    title: 'Au plus tard (ALAP)',
    content: 'Une étape ordonnancée au plus tard démarre au moment précis nécessaire pour être prête sans attente inutile avant son étape dépendante (par exemple le préchauffage de four pendant l\’apprêt).'
  };
  HELP_TOPICS.startMode = {
    title: 'Issue et démarrage de session',
    content: 'Une session de préparation peut être menée jusqu\’à la cuisson du pain, ou arrêtée après façonnage pour réfrigération ou congélation des pâtons crus, sans exiger de cuisson.'
  };
}