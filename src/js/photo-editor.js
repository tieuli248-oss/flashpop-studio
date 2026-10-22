const FILTERS = {
  original: { brightness: 1, contrast: 1, saturation: 1, warmth: 0, grayscale: 0, sepia: 0 },
  soft:     { brightness: 1.08, contrast: .92, saturation: .78, warmth: 5, grayscale: 0, sepia: .05 },
  film:     { brightness: .98, contrast: 1.12, saturation: .78, warmth: 12, grayscale: 0, sepia: .16 },
  mono:     { brightness: 1, contrast: 1.12, saturation: 0, warmth: 0, grayscale: 1, sepia: 0 },
  pink:     { brightness: 1.04, contrast: 1.02, saturation: 1.16, warmth: -5, grayscale: 0, sepia: .06 },
  dream:    { brightness: 1.1, contrast: .88, saturation: 1.05, warmth: -8, grayscale: 0, sepia: .02 }
};

export class PhotoEditor {
  constructor({ canvas, status, dimensions, controls, exportButton }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false });
    this.status = status;
    this.dimensions = dimensions;
    this.controls = controls;
    this.exportButton = exportButton;
    this.image = null;
    this.rotation = 0;
    this.flipX = false;
    this.adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
    this.filter = 'original';
  }

  async load(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('Hãy chọn một tệp ảnh hợp lệ.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      this.image = image;
      this.rotation = 0;
      this.flipX = false;
      this.resetAdjustments(false);
      this.controls.classList.remove('disabled');
      this.controls.setAttribute('aria-disabled', 'false');
      this.exportButton.disabled = false;
      this.canvas.hidden = false;
      this.status.textContent = file.name;
      this.dimensions.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
      this.render();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  setAdjustment(name, value) {
    if (!(name in this.adjustments)) return;
    this.adjustments[name] = Number(value);
    this.render();
  }

  setFilter(name) {
    if (!(name in FILTERS)) return;
    this.filter = name;
    this.render();
  }

  resetAdjustments(render = true) {
    this.adjustments = { brightness: 100, contrast: 100, saturation: 100, warmth: 0 };
    this.filter = 'original';
    if (render) this.render();
  }

  rotate() { this.rotation = (this.rotation + 90) % 360; this.render(); }
  flip() { this.flipX = !this.flipX; this.render(); }

  render() {
    if (!this.image) return;
    const sideways = this.rotation % 180 !== 0;
    const width = this.image.naturalWidth;
    const height = this.image.naturalHeight;
    this.canvas.width = sideways ? height : width;
    this.canvas.height = sideways ? width : height;
    const ctx = this.ctx;
    const preset = FILTERS[this.filter];
    const warmth = Math.max(-40, Math.min(40, this.adjustments.warmth + preset.warmth));
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.scale(this.flipX ? -1 : 1, 1);
    ctx.filter = `brightness(${this.adjustments.brightness / 100 * preset.brightness}) contrast(${this.adjustments.contrast / 100 * preset.contrast}) saturate(${this.adjustments.saturation / 100 * preset.saturation}) grayscale(${preset.grayscale}) sepia(${preset.sepia})`;
    ctx.drawImage(this.image, -width / 2, -height / 2, width, height);
    ctx.restore();
    if (warmth !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = warmth > 0 ? `rgba(255, 151, 65, ${Math.abs(warmth) / 240})` : `rgba(95, 155, 255, ${Math.abs(warmth) / 240})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }
  }

  exportPNG() {
    if (!this.image) return;
    this.canvas.toBlob(blob => {
      if (!blob) { this.status.textContent = 'Không thể xuất ảnh này.'; return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flashpop-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
