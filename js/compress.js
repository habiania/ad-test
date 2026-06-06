/**
 * compress.js - 이미지 압축 기능
 * Canvas API로 브라우저에서 직접 처리 · 서버 전송 없음
 */

const CompressTool = (() => {
  'use strict';

  const state = {
    originalFile:  null,
    originalImage: null,
    originalSize:  0,
    resultBlob:    null,
    resultURL:     null,
  };

  let el = {};

  function cacheElements() {
    el = {
      dropzone:      document.getElementById('compress-dropzone'),
      fileInput:     document.getElementById('compress-file-input'),
      uploadBtn:     document.getElementById('compress-upload-btn'),
      editor:        document.getElementById('compress-editor'),
      previewBefore: document.getElementById('compress-preview-before'),
      previewAfter:  document.getElementById('compress-preview-after'),
      beforeLabel:   document.getElementById('compress-before-label'),
      afterLabel:    document.getElementById('compress-after-label'),
      modeAuto:      document.getElementById('compress-mode-auto'),
      modeManual:    document.getElementById('compress-mode-manual'),
      autoWrap:      document.getElementById('compress-auto-wrap'),
      manualWrap:    document.getElementById('compress-manual-wrap'),
      targetSelect:  document.getElementById('compress-target'),
      qualitySlider: document.getElementById('compress-quality'),
      qualityLabel:  document.getElementById('compress-quality-label'),
      formatSelect:  document.getElementById('compress-format'),
      compressBtn:   document.getElementById('compress-btn'),
      downloadBtn:   document.getElementById('compress-download-btn'),
      resetBtn:      document.getElementById('compress-reset-btn'),
      status:        document.getElementById('compress-status'),
      progress:      document.getElementById('compress-progress'),
      savingBadge:   document.getElementById('compress-saving-badge'),
    };
  }

  // ── 파일 크기 포맷 ──────────────────────────────
  function fmtSize(bytes) {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(2) + ' MB';
  }

  function setStatus(msg, type='info') {
    if (!el.status) return;
    el.status.textContent = msg;
    el.status.className = 'xp-status-text status-' + type;
  }

  function showProgress(on) {
    if (el.progress) el.progress.style.display = on ? 'block' : 'none';
  }

  // ── 이미지 로드 ──────────────────────────────────
  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('❌ 지원하지 않는 파일 형식입니다. JPG, PNG, WEBP만 가능합니다.', 'error');
      return;
    }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setStatus('❌ JPG, PNG, WEBP 파일만 지원합니다.', 'error');
      return;
    }

    state.originalFile = file;
    state.originalSize = file.size;
    state.resultBlob   = null;
    state.resultURL    = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;

        // 원본 미리보기
        if (el.previewBefore) {
          el.previewBefore.src = e.target.result;
          el.previewBefore.style.display = 'block';
          el.previewBefore.previousElementSibling?.remove();
        }
        if (el.beforeLabel) {
          el.beforeLabel.textContent = `${img.width}×${img.height} · ${fmtSize(file.size)}`;
        }

        // 결과 초기화
        if (el.previewAfter)  { el.previewAfter.src = ''; el.previewAfter.style.display='none'; }
        if (el.afterLabel)    el.afterLabel.textContent = '변환 후 표시';
        if (el.savingBadge)   { el.savingBadge.style.display='none'; }
        if (el.downloadBtn)   el.downloadBtn.disabled = true;

        // 에디터 표시
        if (el.dropzone) el.dropzone.style.display = 'none';
        if (el.editor)   el.editor.style.display   = 'block';

        // 포맷 기본값: 원본 유지
        if (el.formatSelect) {
          const ext = file.name.split('.').pop().toLowerCase();
          el.formatSelect.value = ext === 'jpeg' ? 'jpg' : (ext === 'webp' ? 'webp' : ext === 'png' ? 'png' : 'jpg');
        }

        setStatus(`✅ ${file.name} (${fmtSize(file.size)}) 로드 완료. 설정 후 압축을 실행하세요.`, 'ok');
        if (el.compressBtn) el.compressBtn.disabled = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── 자동 모드: 목표 크기로 이진 탐색 ────────────
  async function compressAuto(targetKB, format, mimeType) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width  = state.originalImage.width;
      canvas.height = state.originalImage.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(state.originalImage, 0, 0);

      if (format === 'png') {
        // PNG는 무손실 → 그냥 내보냄
        canvas.toBlob(blob => resolve(blob), 'image/png');
        return;
      }

      // 이진 탐색으로 품질 조정
      let lo = 0.05, hi = 0.99, best = null;
      let iter = 0;
      const maxIter = 15;

      function step() {
        if (iter++ >= maxIter) { resolve(best); return; }
        const mid = (lo + hi) / 2;
        canvas.toBlob(blob => {
          if (!blob) { resolve(best); return; }
          if (blob.size <= targetKB * 1024) {
            best = blob;
            lo = mid;
          } else {
            hi = mid;
          }
          if (hi - lo < 0.01) { resolve(best || blob); return; }
          setTimeout(step, 0);
        }, mimeType, mid);
      }
      step();
    });
  }

  // ── 수동 모드: 품질값으로 압축 ──────────────────
  async function compressManual(quality, format, mimeType) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width  = state.originalImage.width;
      canvas.height = state.originalImage.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(state.originalImage, 0, 0);

      if (format === 'png') {
        canvas.toBlob(blob => resolve(blob), 'image/png');
      } else {
        canvas.toBlob(blob => resolve(blob), mimeType, quality);
      }
    });
  }

  // ── 압축 실행 ────────────────────────────────────
  async function runCompress() {
    if (!state.originalImage) return;

    const isAuto   = el.modeAuto?.checked;
    const format   = el.formatSelect?.value || 'jpg';
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

    if (el.compressBtn)  el.compressBtn.disabled  = true;
    if (el.downloadBtn)  el.downloadBtn.disabled  = true;
    showProgress(true);
    setStatus('⚙️ 압축 중...', 'info');

    try {
      let blob;
      if (isAuto) {
        const targetKB = parseInt(el.targetSelect?.value || '200');
        setStatus(`⚙️ 목표 ${targetKB}KB로 자동 최적화 중...`, 'info');
        blob = await compressAuto(targetKB, format, mimeType);
      } else {
        const quality = parseFloat(el.qualitySlider?.value || '80') / 100;
        blob = await compressManual(quality, format, mimeType);
      }

      if (!blob) throw new Error('압축 실패');

      // 결과 저장
      if (state.resultURL) URL.revokeObjectURL(state.resultURL);
      state.resultBlob = blob;
      state.resultURL  = URL.createObjectURL(blob);

      // 결과 미리보기
      if (el.previewAfter) {
        el.previewAfter.src = state.resultURL;
        el.previewAfter.style.display = 'block';
      }

      const saving = Math.round((1 - blob.size / state.originalSize) * 100);
      if (el.afterLabel) {
        el.afterLabel.textContent = `${fmtSize(blob.size)} (${saving > 0 ? '-'+saving+'%' : '+'+Math.abs(saving)+'%'})`;
      }

      // 절감 배지
      if (el.savingBadge) {
        el.savingBadge.textContent = saving > 0 ? `${saving}% 절감!` : '원본보다 커짐';
        el.savingBadge.className   = 'saving-badge ' + (saving > 0 ? 'badge-good' : 'badge-warn');
        el.savingBadge.style.display = 'inline-block';
      }

      if (el.downloadBtn) el.downloadBtn.disabled = false;
      setStatus(`✅ 압축 완료! ${fmtSize(state.originalSize)} → ${fmtSize(blob.size)} (${saving > 0 ? saving+'% 절감' : '크기 증가'})`, 'ok');

    } catch(err) {
      setStatus('❌ 오류: ' + err.message, 'error');
    } finally {
      showProgress(false);
      if (el.compressBtn) el.compressBtn.disabled = false;
    }
  }

  // ── 다운로드 ─────────────────────────────────────
  function download() {
    if (!state.resultBlob || !state.originalFile) return;
    const format = el.formatSelect?.value || 'jpg';
    const ext    = format === 'same' ? state.originalFile.name.split('.').pop() : format;
    const base   = state.originalFile.name.replace(/\.[^.]+$/, '');
    const name   = `${base}-compressed.${ext}`;
    const a      = document.createElement('a');
    a.href       = state.resultURL;
    a.download   = name;
    a.click();
  }

  // ── 초기화 ───────────────────────────────────────
  function reset() {
    state.originalFile  = null;
    state.originalImage = null;
    state.originalSize  = 0;
    state.resultBlob    = null;
    if (state.resultURL) { URL.revokeObjectURL(state.resultURL); state.resultURL = null; }

    if (el.editor)       el.editor.style.display   = 'none';
    if (el.dropzone)     el.dropzone.style.display  = 'block';
    if (el.fileInput)    el.fileInput.value         = '';
    if (el.compressBtn)  el.compressBtn.disabled    = true;
    if (el.downloadBtn)  el.downloadBtn.disabled    = true;
    if (el.savingBadge)  el.savingBadge.style.display = 'none';
    setStatus('이미지를 업로드하면 시작됩니다.', 'info');
  }

  // ── 모드 전환 ────────────────────────────────────
  function toggleMode() {
    const isAuto = el.modeAuto?.checked;
    if (el.autoWrap)   el.autoWrap.style.display   = isAuto ? 'flex' : 'none';
    if (el.manualWrap) el.manualWrap.style.display  = isAuto ? 'none' : 'flex';
  }

  // ── 이벤트 바인딩 ────────────────────────────────
  function bindEvents() {
    // 업로드 버튼
    el.uploadBtn?.addEventListener('click', () => el.fileInput?.click());
    el.dropzone?.addEventListener('click', (e) => {
      if (e.target === el.uploadBtn || el.uploadBtn?.contains(e.target)) return;
      el.fileInput?.click();
    });

    // 파일 선택
    el.fileInput?.addEventListener('change', (e) => {
      if (e.target.files[0]) loadFile(e.target.files[0]);
    });

    // 드래그앤드롭
    el.dropzone?.addEventListener('dragover',  (e) => { e.preventDefault(); el.dropzone.classList.add('drag-over'); });
    el.dropzone?.addEventListener('dragleave', ()  => el.dropzone.classList.remove('drag-over'));
    el.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    // 클립보드 붙여넣기
    document.addEventListener('paste', (e) => {
      const panel = document.getElementById('tool-compress');
      if (!panel || panel.style.display === 'none') return;
      const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
      if (item) loadFile(item.getAsFile());
    });

    // 모드 라디오
    el.modeAuto?.addEventListener('change',   toggleMode);
    el.modeManual?.addEventListener('change', toggleMode);

    // 품질 슬라이더
    el.qualitySlider?.addEventListener('input', () => {
      if (el.qualityLabel) el.qualityLabel.textContent = el.qualitySlider.value + '%';
    });

    // 버튼
    el.compressBtn?.addEventListener('click',  runCompress);
    el.downloadBtn?.addEventListener('click',  download);
    el.resetBtn?.addEventListener('click',     reset);

    // 키보드 드롭존
    el.dropzone?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.fileInput?.click(); }
    });
  }

  // ── 초기화 ───────────────────────────────────────
  function init() {
    cacheElements();
    bindEvents();
    toggleMode();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => CompressTool.init());
