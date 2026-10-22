/**
 * Video Editor foundation.
 * Current scope: browser-native preview, clip list, playback rate and aspect-ratio project setting.
 * Not yet implemented: non-destructive trim ranges, multi-track timeline, transitions, audio mixing,
 * and final MP4 export. Keep these responsibilities in this module rather than the UI controller.
 */
export class VideoEditor {
  constructor({ preview, timeline, clipList, clipCount, clearButton, aspectRatio, playbackRate }) {
    this.preview = preview;
    this.timeline = timeline;
    this.clipList = clipList;
    this.clipCount = clipCount;
    this.clearButton = clearButton;
    this.aspectRatio = aspectRatio;
    this.playbackRate = playbackRate;
    this.clips = [];
    this.activeClipId = null;
    this.objectUrls = new Map();
  }

  addFiles(fileList) {
    const files = Array.from(fileList || []).filter(file => file.type.startsWith('video/'));
    for (const file of files) {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const url = URL.createObjectURL(file);
      this.objectUrls.set(id, url);
      this.clips.push({ id, file, name: file.name, duration: null, status: 'loading' });
    }
    this.render();
    for (const clip of this.clips.filter(item => item.status === 'loading')) this.readDuration(clip);
    if (!this.activeClipId && this.clips.length) this.selectClip(this.clips[0].id);
  }

  readDuration(clip) {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = this.objectUrls.get(clip.id);
    probe.onloadedmetadata = () => {
      clip.duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      clip.status = 'ready';
      this.render();
      if (this.activeClipId === clip.id) this.updatePreview();
      probe.removeAttribute('src');
      probe.load();
    };
    probe.onerror = () => { clip.status = 'unsupported'; this.render(); };
  }

  selectClip(id) {
    if (!this.clips.some(clip => clip.id === id)) return;
    this.activeClipId = id;
    this.updatePreview();
    this.render();
  }

  updatePreview() {
    const clip = this.clips.find(item => item.id === this.activeClipId);
    this.preview.replaceChildren();
    if (!clip) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<div class="empty-art">▷</div><h3>Không gian dựng video</h3><p>Thêm một clip để bắt đầu.</p>';
      this.preview.append(empty);
      return;
    }
    const video = document.createElement('video');
    video.src = this.objectUrls.get(clip.id);
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.playbackRate = Number(this.playbackRate.value) || 1;
    video.style.aspectRatio = this.aspectRatio.value.replace(':', ' / ');
    video.setAttribute('aria-label', `Xem trước ${clip.name}`);
    this.preview.append(video);
  }

  removeClip(id) {
    const url = this.objectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.objectUrls.delete(id);
    this.clips = this.clips.filter(clip => clip.id !== id);
    if (this.activeClipId === id) this.activeClipId = this.clips[0]?.id ?? null;
    this.updatePreview();
    this.render();
  }

  clear() {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
    this.clips = [];
    this.activeClipId = null;
    this.updatePreview();
    this.render();
  }

  setAspectRatio() {
    const video = this.preview.querySelector('video');
    if (video) video.style.aspectRatio = this.aspectRatio.value.replace(':', ' / ');
  }

  setPlaybackRate() {
    const video = this.preview.querySelector('video');
    if (video) video.playbackRate = Number(this.playbackRate.value) || 1;
  }

  render() {
    this.clipCount.textContent = `${this.clips.length} clip`;
    this.clearButton.disabled = this.clips.length === 0;
    this.timeline.replaceChildren();
    this.clipList.replaceChildren();
    if (!this.clips.length) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = 'Clip của mày sẽ xuất hiện ở đây.';
      this.timeline.append(empty);
      return;
    }
    for (const clip of this.clips) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'timeline-clip';
      if (clip.id === this.activeClipId) tile.style.borderColor = 'var(--pink)';
      const title = document.createElement('strong');
      title.textContent = clip.name;
      const duration = document.createElement('span');
      duration.textContent = clip.status === 'loading' ? 'Đang đọc…' : clip.status === 'unsupported' ? 'Không đọc được' : formatDuration(clip.duration);
      tile.append(title, duration);
      tile.addEventListener('click', () => this.selectClip(clip.id));
      this.timeline.append(tile);

      const row = document.createElement('div');
      row.className = 'clip-row';
      const meta = document.createElement('span');
      meta.className = 'clip-meta';
      meta.textContent = `${clip.name} · ${duration.textContent}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Xóa';
      remove.setAttribute('aria-label', `Xóa clip ${clip.name}`);
      remove.addEventListener('click', () => this.removeClip(clip.id));
      row.append(meta, remove);
      this.clipList.append(row);
    }
  }
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
