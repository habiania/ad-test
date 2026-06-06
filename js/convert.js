/**
 * convert.js - 이미지 형식 변환 (PNG ↔ JPG ↔ WEBP)
 * Canvas API로 브라우저에서 직접 처리 · 서버 전송 없음
 */

const ConvertTool = (() => {
  'use strict';

  const state = {
    originalFile:  null,
    originalImage: null,
    resultBlob:    null,
    resultURL:     null,
    targetFormat:  'png', // 현재 탭에서 설정된 목표 포맷
  };

  let el = {};

  function cacheElements() {
    el = {
      dropzone:      document.getElementById('convert-dropzone'),
      fileInput:     document.getElementById('convert-file-input'),
      uploadBtn:     document.getElementById('convert-upload-btn'),
      editor:        document.getElementById('convert-editor'),
      previewBefore: document.getElementById('convert-preview-before'),
      previewAfter:  document.getElementById('convert-preview-after'),
      beforeLabel:   document.getElementById('convert-before-label'),
      afterLabel:    document.getElementById('convert-after-label'),
      formatBtns:    document.querySelectorAll('.convert-fmt-btn'),
      qualitySlider: document.getElementById('convert-quality'),
      qualityLabel:  document.getElementById('convert-quality-label'),
      qualityWrap:   document.getElementById('convert-quality-wrap'),
      targetLabel:   document.getElementById('convert-target-label'),
      convertBtn:    document.getElementById('convert-btn'),
      downloadBtn:   document.getElementById('convert-download-btn'),
      resetBtn:      document.getElementById('convert-reset-btn'),
      status:        document.getElementById('convert-status'),
      progress:      document.getElementById('convert-progress'),
      fmtBadge:      document.getElementById('convert-fmt-badge'),
    };
  }

  function fmtSize(bytes) {
    if (bytes < 1024)      return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(2) + ' MB';
  }

  function setStatus(msg, type = 'info') {
    if (!el.status) return;
    el.status.textContent = msg;
    el.status.className = 'xp-status-text status-' + type;
  }

  function showProgress(on) {
    if (el.progress) el.progress.style.display = on ? 'block' : 'none';
  }

  // ── 파일 로드 ────────────────────────────────────
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('❌ 지원하지 않는 파일입니다. JPG, PNG, WEBP만 가능합니다.', 'error');
      return;
    }

    state.originalFile  = file;
    state.resultBlob    = null;
    state.resultURL     = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;

        if (el.previewBefore) {
          el.previewBefore.src = e.target.result;
          el.previewBefore.style.display = 'block';
          const ph = el.previewBefore.parentElement?.querySelector('.preview-placeholder');
          if (ph) ph.style.display = 'none';
        }

        // 원본 형식 뱃지
        const ext = file.name.split('.').pop().toLowerCase().replace('jpeg','jpg');
        if (el.beforeLabel) {
          el.beforeLabel.textContent = `${img.width}×${img.height} · ${fmtSize(file.size)} · ${ext.toUpperCase()}`;
        }

        // 결과 초기화
        if (el.previewAfter) { el.previewAfter.src = ''; el.previewAfter.style.display = 'none'; }
        if (el.afterLabel)   el.afterLabel.textContent = '변환 후 표시';
        if (el.downloadBtn)  el.downloadBtn.disabled = true;

        // 기본 목표 포맷: 현재 탭
        updateFormatUI();

        if (el.dropzone) el.dropzone.style.display = 'none';
        if (el.editor)   el.editor.style.display   = 'block';
        if (el.convertBtn) el.convertBtn.disabled  = false;

        setStatus(`✅ ${file.name} 로드 완료. 변환할 형식을 선택하고 실행하세요.`, 'ok');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── 포맷 UI 업데이트 ─────────────────────────────
  function updateFormatUI() {
    const fmt = state.targetFormat;
    const needQ = fmt === 'jpg' || fmt === 'webp';

    if (el.qualityWrap) el.qualityWrap.style.display = needQ ? 'flex' : 'none';
    if (el.targetLabel) el.targetLabel.textContent   = fmt.toUpperCase();

    el.formatBtns?.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.fmt === fmt);
    });
  }

  // ── 변환 실행 ────────────────────────────────────
  async function runConvert() {
    if (!state.originalImage) return;

    const fmt      = state.targetFormat;
    const mimeType = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    const quality  = parseFloat(el.qualitySlider?.value || '92') / 100;

    if (el.convertBtn)  el.convertBtn.disabled  = true;
    if (el.downloadBtn) el.downloadBtn.disabled = true;
    showProgress(true);
    setStatus(`⚙️ ${fmt.toUpperCase()}으로 변환 중...`, 'info');

    try {
      const blob = await new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width  = state.originalImage.width;
        canvas.height = state.originalImage.height;
        const ctx = canvas.getContext('2d');

        // PNG 배경이 투명할 경우 JPG 변환 시 흰 배경 채우기
        if (fmt === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(state.originalImage, 0, 0);

        if (fmt === 'png') {
          canvas.toBlob(resolve, 'image/png');
        } else {
          canvas.toBlob(resolve, mimeType, quality);
        }
      });

      if (!blob) throw new Error('변환 실패');

      if (state.resultURL) URL.revokeObjectURL(state.resultURL);
      state.resultBlob = blob;
      state.resultURL  = URL.createObjectURL(blob);

      if (el.previewAfter) {
        el.previewAfter.src = state.resultURL;
        el.previewAfter.style.display = 'block';
        const ph = el.previewAfter.parentElement?.querySelector('.preview-placeholder');
        if (ph) ph.style.display = 'none';
      }

      const diff = blob.size - state.originalFile.size;
      const sign = diff > 0 ? '+' : '';
      if (el.afterLabel) {
        el.afterLabel.textContent =
          `${fmtSize(blob.size)} · ${fmt.toUpperCase()} (${sign}${fmtSize(Math.abs(diff))})`;
      }

      if (el.fmtBadge) {
        el.fmtBadge.textContent = fmt.toUpperCase();
        el.fmtBadge.style.display = 'inline-block';
      }

      if (el.downloadBtn) el.downloadBtn.disabled = false;
      setStatus(`✅ ${fmt.toUpperCase()} 변환 완료! ${fmtSize(state.originalFile.size)} → ${fmtSize(blob.size)}`, 'ok');

    } catch (err) {
      setStatus('❌ 오류: ' + err.message, 'error');
    } finally {
      showProgress(false);
      if (el.convertBtn) el.convertBtn.disabled = false;
    }
  }

  // ── 다운로드 ─────────────────────────────────────
  function download() {
    if (!state.resultBlob || !state.originalFile) return;
    const fmt  = state.targetFormat;
    const base = state.originalFile.name.replace(/\.[^.]+$/, '');
    const a    = document.createElement('a');
    a.href     = state.resultURL;
    a.download = `${base}.${fmt}`;
    a.click();
  }

  // ── 초기화 ───────────────────────────────────────
  function reset() {
    state.originalFile  = null;
    state.originalImage = null;
    state.resultBlob    = null;
    if (state.resultURL) { URL.revokeObjectURL(state.resultURL); state.resultURL = null; }

    if (el.editor)      el.editor.style.display   = 'none';
    if (el.dropzone)    el.dropzone.style.display  = 'block';
    if (el.fileInput)   el.fileInput.value         = '';
    if (el.convertBtn)  el.convertBtn.disabled     = true;
    if (el.downloadBtn) el.downloadBtn.disabled    = true;
    if (el.fmtBadge)    el.fmtBadge.style.display  = 'none';
    setStatus('이미지를 업로드하면 시작됩니다.', 'info');
  }

  // ── 이벤트 바인딩 ────────────────────────────────
  function bindEvents() {
    el.uploadBtn?.addEventListener('click', () => el.fileInput?.click());
    el.dropzone?.addEventListener('click', (e) => {
      if (e.target === el.uploadBtn || el.uploadBtn?.contains(e.target)) return;
      el.fileInput?.click();
    });
    el.fileInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) loadFile(e.target.files[0]);
    });

    el.dropzone?.addEventListener('dragover',  (e) => { e.preventDefault(); el.dropzone.classList.add('drag-over'); });
    el.dropzone?.addEventListener('dragleave', ()  => el.dropzone.classList.remove('drag-over'));
    el.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    document.addEventListener('paste', (e) => {
      const panel = document.getElementById('tool-convert');
      if (!panel || panel.style.display === 'none') return;
      const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
      if (item) loadFile(item.getAsFile());
    });

    el.formatBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        state.targetFormat = btn.dataset.fmt;
        updateFormatUI();
      });
    });

    el.qualitySlider?.addEventListener('input', () => {
      if (el.qualityLabel) el.qualityLabel.textContent = el.qualitySlider.value + '%';
    });

    el.convertBtn?.addEventListener('click',  runConvert);
    el.downloadBtn?.addEventListener('click', download);
    el.resetBtn?.addEventListener('click',    reset);

    el.dropzone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.fileInput?.click(); }
    });
  }

  // ── 특정 포맷으로 초기화 (외부 호출용) ──────────
  function initWithFormat(fmt) {
    state.targetFormat = fmt || 'png';
    reset();
    updateFormatUI();
    if (el.dropzone) el.dropzone.style.display = 'block';
  }

  function init() {
    cacheElements();
    bindEvents();
    updateFormatUI();
  }

  return { init, initWithFormat };
})();

window.ConvertTool = ConvertTool;

document.addEventListener('DOMContentLoaded', () => ConvertTool.init());
