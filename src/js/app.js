import { PhotoEditor } from './photo-editor.js';
import { VideoEditor } from './video-editor.js';

const $ = (selector) => document.querySelector(selector);
const photoCanvas = $('#photoCanvas');
const photoControls = $('#photoControls');
const photoEditor = new PhotoEditor({
  canvas: photoCanvas,
  status: $('#photoStatus'),
  dimensions: $('#photoDimensions'),
  controls: photoControls,
  exportButton: $('#exportPhotoBtn')
});
const videoEditor = new VideoEditor({
  preview: $('#videoPreview'), timeline: $('#timeline'), clipList: $('#clipList'),
  clipCount: $('#clipCount'), clearButton: $('#clearClipsBtn'),
  aspectRatio: $('#aspectRatio'), playbackRate: $('#playbackRate')
});

function showMode(mode) {
  const photoMode = mode === 'photo';
  $('#photoWorkspace').hidden = !photoMode;
  $('#videoWorkspace').hidden = photoMode;
  document.querySelectorAll('.mode-tab').forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
}

document.querySelectorAll('.mode-tab').forEach(tab => tab.addEventListener('click', () => showMode(tab.dataset.mode)));
$('#emptyUploadBtn').addEventListener('click', () => $('#photoInput').click());
$('#photoInput').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await photoEditor.load(file);
    $('#photoEmpty').hidden = true;
    updateAdjustmentLabels();
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('is-selected', chip.dataset.filter === 'original'));
  } catch (error) {
    $('#photoStatus').textContent = error.message || 'Không thể mở ảnh.';
  } finally { event.target.value = ''; }
});

for (const name of ['brightness', 'contrast', 'saturation', 'warmth']) {
  $(`#${name}`).addEventListener('input', event => {
    photoEditor.setAdjustment(name, event.target.value);
    updateAdjustmentLabels();
  });
}
function updateAdjustmentLabels() {
  $('#brightnessValue').value = `${$('#brightness').value}%`;
  $('#contrastValue').value = `${$('#contrast').value}%`;
  $('#saturationValue').value = `${$('#saturation').value}%`;
  $('#warmthValue').value = `${$('#warmth').value}°`;
}
function resetSliders() {
  $('#brightness').value = 100; $('#contrast').value = 100;
  $('#saturation').value = 100; $('#warmth').value = 0;
  updateAdjustmentLabels();
}
$('#resetAdjustmentsBtn').addEventListener('click', () => {
  resetSliders(); photoEditor.resetAdjustments();
  document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('is-selected', chip.dataset.filter === 'original'));
});
document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
  photoEditor.setFilter(chip.dataset.filter);
  document.querySelectorAll('.filter-chip').forEach(item => item.classList.toggle('is-selected', item === chip));
}));
$('#rotateBtn').addEventListener('click', () => photoEditor.rotate());
$('#flipBtn').addEventListener('click', () => photoEditor.flip());
$('#exportPhotoBtn').addEventListener('click', () => photoEditor.exportPNG());

$('#videoInput').addEventListener('change', event => {
  videoEditor.addFiles(event.target.files);
  event.target.value = '';
  showMode('video');
});
$('#aspectRatio').addEventListener('change', () => videoEditor.setAspectRatio());
$('#playbackRate').addEventListener('change', () => videoEditor.setPlaybackRate());
$('#clearClipsBtn').addEventListener('click', () => videoEditor.clear());
$('#resetProjectBtn').addEventListener('click', () => {
  const shouldReset = window.confirm('Tạo phiên làm việc mới? Ảnh hiện tại và danh sách clip sẽ được xóa khỏi giao diện.');
  if (!shouldReset) return;
  photoEditor.image = null;
  photoCanvas.hidden = true;
  $('#photoEmpty').hidden = false;
  $('#photoStatus').textContent = 'Chưa có ảnh';
  $('#photoDimensions').textContent = 'Canvas sẵn sàng';
  photoControls.classList.add('disabled');
  photoControls.setAttribute('aria-disabled', 'true');
  $('#exportPhotoBtn').disabled = true;
  resetSliders(); photoEditor.resetAdjustments(false);
  videoEditor.clear();
  showMode('photo');
});

// Optional drag-and-drop image loading on the preview surface.
const dropZone = $('#photoDropZone');
dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', async event => {
  event.preventDefault(); dropZone.classList.remove('drag-over');
  const file = Array.from(event.dataTransfer.files).find(item => item.type.startsWith('image/'));
  if (!file) return;
  try { await photoEditor.load(file); $('#photoEmpty').hidden = true; updateAdjustmentLabels(); }
  catch (error) { $('#photoStatus').textContent = error.message || 'Không thể mở ảnh.'; }
});
