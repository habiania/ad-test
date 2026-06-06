/**
 * resize.js - 이미지 크기 변경 기능
 * Canvas API를 사용하여 브라우저에서 직접 처리
 * 서버 전송 없음, 개인정보 수집 없음
 */

const ResizeTool = (() => {
  'use strict';

  // ── 상태 ──────────────────────────────────────────
  const state = {
    originalFile:  null,
    originalImage: null,
    originalW:     0,
    originalH:     0,
    outputW:       0,
    outputH:       0,
    keepRatio:     true,
    outputFormat:  'same',
    quality:       0.92,
    resultBlob:    null,
    resultURL:     null,
  };

  // ── DOM 캐시 ──────────────────────────────────────
  let el = {};

  function cacheElements() {
    el = {
      dropzone:      document.getElementById('resize-dropzone'),
      fileInput:     document.getElementById('resize-file-input'),
      uploadBtn:     document.getElementById('resize-upload-btn'),
      previewBefore: document.getElementById('preview-before'),
      previewAfter:  document.getElementById('preview-after'),
      beforeLabel:   document.getElementById('before-size-label'),
      afterLabel:    document.getElementById('after-size-label'),
      widthInput:    document.getElementById('resize-width'),
      heightInput:   document.getElementById('resize-height'),
      keepRatioChk:  document.getElementById('keep-ratio'),
      formatSelect:  document.getElementById('output-format'),
      qualitySlider: document.getElementById('quality-slider'),
      qualityLabel:  document.getElementById('quality-label'),
      resizeBtn:     document.getElementById('resize-btn'),
      downloadBtn:   document.getElementById('download-btn'),
      resetBtn:      document.getElementById('reset-btn'),
      statusText:    document.getElementById('resize-status'),
      progressBar:   document.getElementById('resize-progress'),
    };
  }

  // ── 초기화 ────────────────────────────────────────
  function init() {
    cacheElements();
    if (!el.dropzone) return;
    bindEvents();
    updateQualityLabel();
  }

  // ── 이벤트 바인딩 ─────────────────────────────────
  function bindEvents() {
    el.uploadBtn?.addEventListener('click', () => el.fileInput?.click());

    el.fileInput?.addEventListener('change', (e) => {
      if (e.target.files?.[0]) handleFile(e.target.files[0]);
    });

    el.dropzone?.addEventListener('click', (e) => {
      if (!e.target.closest('.xp-btn')) el.fileInput?.click();
    });

    el.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropzone.classList.add('dragover');
    });
    el.dropzone?.addEventListener('dragleave', () => {
      el.dropzone.classList.remove('dragover');
    });
    el.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && isValidImage(file)) handleFile(file);
      else if (file) showStatus('지원하지 않는 형식입니다. JPG, PNG, WEBP를 사용해 주세요.', 'error');
    });

    // 가로 입력
    el.widthInput?.addEventListener('input', () => {
      const w = parseInt(el.widthInput.value, 10);
      if (state.keepRatio && state.originalW > 0 && !isNaN(w) && w > 0) {
        const h = Math.round(w * state.originalH / state.originalW);
        el.heightInput.value = h;
        state.outputH = h;
      }
      state.outputW = w || 0;
      updateAfterLabel();
    });

    // 세로 입력
    el.heightInput?.addEventListener('input', () => {
      const h = parseInt(el.heightInput.value, 10);
      if (state.keepRatio && state.originalH > 0 && !isNaN(h) && h > 0) {
        const w = Math.round(h * state.originalW / state.originalH);
        el.widthInput.value = w;
        state.outputW = w;
      }
      state.outputH = h || 0;
      updateAfterLabel();
    });

    el.keepRatioChk?.addEventListener('change', () => {
      state.keepRatio = el.keepRatioChk.checked;
    });

    el.formatSelect?.addEventListener('change', () => {
      state.outputFormat = el.formatSelect.value;
      toggleQualitySlider();
    });

    el.qualitySlider?.addEventListener('input', () => {
      state.quality = el.qualitySlider.value / 100;
      updateQualityLabel();
    });

    el.resizeBtn?.addEventListener('click', runResize);
    el.downloadBtn?.addEventListener('click', downloadResult);
    el.resetBtn?.addEventListener('click', resetAll);

    [el.widthInput, el.heightInput].forEach(inp => {
      inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runResize(); });
    });

    // 클립보드 붙여넣기
    document.addEventListener('paste', (e) => {
      if (!document.getElementById('tool-resize')) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { handleFile(file); break; }
        }
      }
    });
  }

  // ── 유효성 검사 ───────────────────────────────────
  function isValidImage(file) {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  }

  // ── 파일 처리 ─────────────────────────────────────
  function handleFile(file) {
    if (!isValidImage(file)) {
      showStatus('지원하지 않는 형식입니다. JPG, PNG, WEBP를 사용해 주세요.', 'error');
      return;
    }

    state.originalFile = file;
    showStatus('이미지 불러오는 중...', 'info');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.originalW = img.naturalWidth;
        state.originalH = img.naturalHeight;
        state.outputW   = img.naturalWidth;
        state.outputH   = img.naturalHeight;

        if (el.widthInput)  { el.widthInput.value  = state.outputW; el.widthInput.disabled  = false; }
        if (el.heightInput) { el.heightInput.value = state.outputH; el.heightInput.disabled = false; }

        // 미리보기
        if (el.previewBefore) {
          el.previewBefore.src = e.target.result;
          el.previewBefore.style.display = 'block';
        }

        if (el.beforeLabel) el.beforeLabel.textContent = `${state.originalW} × ${state.originalH} (${formatBytes(file.size)})`;
        updateAfterLabel();

        if (el.resizeBtn) el.resizeBtn.disabled = false;

        // 드롭존 숨기고 에디터 표시
        if (el.dropzone) el.dropzone.style.display = 'none';
        const editor = document.getElementById('resize-editor');
        if (editor) editor.style.display = 'block';

        clearResult();
        showStatus(`이미지 로드 완료 (${state.originalW}×${state.originalH}). 크기를 입력하고 변환을 실행하세요.`, 'ok');
      };
      img.onerror = () => showStatus('이미지를 읽을 수 없습니다.', 'error');
      img.src = e.target.result;
    };
    reader.onerror = () => showStatus('파일을 읽을 수 없습니다.', 'error');
    reader.readAsDataURL(file);
  }

  // ── 변환 실행 (async) ─────────────────────────────
  async function runResize() {
    if (!state.originalImage) {
      showStatus('먼저 이미지를 업로드해 주세요.', 'error');
      return;
    }

    const w = parseInt(el.widthInput.value, 10);
    const h = parseInt(el.heightInput.value, 10);

    if (!w || !h || w <= 0 || h <= 0) {
      showStatus('유효한 가로/세로 크기를 입력해 주세요.', 'error');
      return;
    }
    if (w > 8000 || h > 8000) {
      showStatus('최대 8000px 이하로 입력해 주세요.', 'error');
      return;
    }

    state.outputW = w;
    state.outputH = h;

    showProgress(true);
    showStatus('변환 중...', 'info');

    try {
      // 약간의 딜레이로 UI 업데이트 보장
      await new Promise(r => setTimeout(r, 50));

      const blob = await renderCanvas(w, h);
      state.resultBlob = blob;

      if (state.resultURL) URL.revokeObjectURL(state.resultURL);
      state.resultURL = URL.createObjectURL(blob);

      if (el.previewAfter) {
        el.previewAfter.src = state.resultURL;
        el.previewAfter.style.display = 'block';
      }

      const ext = getOutputExtension();
      if (el.afterLabel) el.afterLabel.textContent = `${w} × ${h} (${formatBytes(blob.size)}) · ${ext.toUpperCase()}`;
      if (el.downloadBtn) el.downloadBtn.disabled = false;

      showProgress(false);
      showStatus(`✅ 변환 완료! ${w}×${h}px ${ext.toUpperCase()} (${formatBytes(blob.size)})`, 'ok');

    } catch (err) {
      showProgress(false);
      showStatus('변환 중 오류가 발생했습니다: ' + err.message, 'error');
      console.error('[ResizeTool] 오류:', err);
    }
  }

  // ── Canvas 렌더링 ─────────────────────────────────
  function renderCanvas(w, h) {
    return new Promise((resolve, reject) => {
      const canvas  = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 큰 이미지는 단계적 축소
      if (state.originalW > w * 2 || state.originalH > h * 2) {
        drawStepwise(ctx, state.originalImage, state.originalW, state.originalH, w, h);
      } else {
        ctx.drawImage(state.originalImage, 0, 0, w, h);
      }

      const mimeType = getOutputMimeType();
      const quality  = needsQuality(mimeType) ? state.quality : undefined;

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob 실패'));
      }, mimeType, quality);
    });
  }

  /**
   * 단계적 리사이징 — 큰 이미지를 여러 단계로 축소하여 품질 향상
   */
  function drawStepwise(ctx, img, srcW, srcH, dstW, dstH) {
    let curW = srcW;
    let curH = srcH;

    let tmpCanvas = document.createElement('canvas');
    let tmpCtx    = tmpCanvas.getContext('2d');
    tmpCanvas.width  = srcW;
    tmpCanvas.height = srcH;
    tmpCtx.drawImage(img, 0, 0);

    while (curW > dstW * 1.5 || curH > dstH * 1.5) {
      const nw = Math.max(Math.round(curW / 1.5), dstW);
      const nh = Math.max(Math.round(curH / 1.5), dstH);

      const next    = document.createElement('canvas');
      next.width    = nw;
      next.height   = nh;
      const nextCtx = next.getContext('2d');
      nextCtx.imageSmoothingEnabled = true;
      nextCtx.imageSmoothingQuality = 'high';
      nextCtx.drawImage(tmpCanvas, 0, 0, nw, nh);

      tmpCanvas = next;
      curW = nw;
      curH = nh;
    }

    ctx.drawImage(tmpCanvas, 0, 0, dstW, dstH);
  }

  // ── 포맷 헬퍼 ─────────────────────────────────────
  function getOutputMimeType() {
    const fmt = state.outputFormat;
    if (fmt === 'same') {
      if (!state.originalFile) return 'image/jpeg';
      if (state.originalFile.type === 'image/png')  return 'image/png';
      if (state.originalFile.type === 'image/webp') return 'image/webp';
      return 'image/jpeg';
    }
    return { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[fmt] || 'image/jpeg';
  }

  function getOutputExtension() {
    return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[getOutputMimeType()] || 'jpg';
  }

  function needsQuality(mime) {
    return mime === 'image/jpeg' || mime === 'image/webp';
  }

  // ── 다운로드 ──────────────────────────────────────
  function downloadResult() {
    if (!state.resultBlob) return;

    const ext      = getOutputExtension();
    const baseName = (state.originalFile?.name || 'image')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9가-힣_-]/g, '-')
      .slice(0, 60);
    const filename = `${baseName}-resized-${state.outputW}x${state.outputH}.${ext}`;

    const url = URL.createObjectURL(state.resultBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showStatus(`📥 "${filename}" 다운로드 시작`, 'ok');
  }

  // ── 초기화 ────────────────────────────────────────
  function resetAll() {
    state.originalFile  = null;
    state.originalImage = null;
    state.originalW = state.originalH = 0;
    state.outputW   = state.outputH   = 0;
    state.resultBlob = null;
    if (state.resultURL) { URL.revokeObjectURL(state.resultURL); state.resultURL = null; }

    if (el.fileInput)  el.fileInput.value = '';
    if (el.widthInput)  { el.widthInput.value  = ''; el.widthInput.disabled  = true; }
    if (el.heightInput) { el.heightInput.value = ''; el.heightInput.disabled = true; }
    if (el.beforeLabel) el.beforeLabel.textContent = '—';
    if (el.afterLabel)  el.afterLabel.textContent  = '—';
    if (el.previewBefore) { el.previewBefore.src = ''; el.previewBefore.style.display = 'none'; }
    if (el.previewAfter)  { el.previewAfter.src  = ''; el.previewAfter.style.display  = 'none'; }
    if (el.resizeBtn)   el.resizeBtn.disabled   = true;
    if (el.downloadBtn) el.downloadBtn.disabled = true;

    if (el.dropzone) el.dropzone.style.display = '';
    const editor = document.getElementById('resize-editor');
    if (editor) editor.style.display = 'none';

    showStatus('초기화되었습니다. 새 이미지를 업로드하세요.', 'info');
  }

  function clearResult() {
    if (state.resultURL) { URL.revokeObjectURL(state.resultURL); state.resultURL = null; }
    state.resultBlob = null;
    if (el.previewAfter) { el.previewAfter.src = ''; el.previewAfter.style.display = 'none'; }
    if (el.downloadBtn)  el.downloadBtn.disabled = true;
    if (el.afterLabel)   el.afterLabel.textContent = '—';
  }

  // ── UI 헬퍼 ───────────────────────────────────────
  function showStatus(msg, type) {
    if (!el.statusText) return;
    el.statusText.textContent = msg;
    el.statusText.className   = 'xp-status-text status-' + (type || 'info');
  }

  function showProgress(visible) {
    if (!el.progressBar) return;
    el.progressBar.style.display = visible ? 'block' : 'none';
    if (el.resizeBtn) el.resizeBtn.disabled = visible;
  }

  function updateAfterLabel() {
    const w = parseInt(el.widthInput?.value,  10) || 0;
    const h = parseInt(el.heightInput?.value, 10) || 0;
    if (el.afterLabel) el.afterLabel.textContent = (w && h) ? `${w} × ${h}` : '—';
  }

  function updateQualityLabel() {
    if (!el.qualityLabel || !el.qualitySlider) return;
    el.qualityLabel.textContent = el.qualitySlider.value + '%';
  }

  function toggleQualitySlider() {
    const show = needsQuality(getOutputMimeType());
    const wrap = document.getElementById('quality-wrap');
    if (wrap) wrap.style.display = show ? '' : 'none';
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => ResizeTool.init());
