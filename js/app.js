/**
 * app.js - XP Image Tools 메인 애플리케이션
 * Windows XP UI 동작: 시작 메뉴, 창 드래그, 시계, 작업 표시줄 등
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════
     시계 업데이트
  ══════════════════════════════════════════ */
  function updateClock() {
    const el = document.getElementById('taskbar-clock');
    if (!el) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const yy = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    el.innerHTML = `${hh}:${mm}<br>${yy}-${mo}-${dd}`;
  }

  /* ══════════════════════════════════════════
     시작 메뉴 토글
  ══════════════════════════════════════════ */
  function initStartMenu() {
    const startBtn  = document.getElementById('start-btn');
    const startMenu = document.getElementById('start-menu');
    if (!startBtn || !startMenu) return;

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = startMenu.classList.contains('visible');
      if (isOpen) closeStartMenu();
      else        openStartMenu();
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      if (!startMenu.contains(e.target) && e.target !== startBtn) {
        closeStartMenu();
      }
    });

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeStartMenu();
    });

    // 시작 메뉴 아이템 클릭
    startMenu.querySelectorAll('[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = item.dataset.action;
        handleMenuAction(action);
        closeStartMenu();
      });
    });
  }

  function openStartMenu() {
    const menu    = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    menu?.classList.add('visible');
    startBtn?.classList.add('active');
    startBtn?.setAttribute('aria-expanded', 'true');
  }

  function closeStartMenu() {
    const menu    = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    menu?.classList.remove('visible');
    startBtn?.classList.remove('active');
    startBtn?.setAttribute('aria-expanded', 'false');
  }

  /* ══════════════════════════════════════════
     메뉴 액션 처리
  ══════════════════════════════════════════ */
  function handleMenuAction(action) {
    switch (action) {
      case 'resize':
        showTool('resize');
        break;
      case 'compress':
        showTool('compress');
        break;
      case 'to-png':
        showTool('convert');
        setTimeout(() => window.ConvertTool?.initWithFormat('png'), 0);
        break;
      case 'to-jpg':
        showTool('convert');
        setTimeout(() => window.ConvertTool?.initWithFormat('jpg'), 0);
        break;
      case 'to-webp':
        showTool('convert');
        setTimeout(() => window.ConvertTool?.initWithFormat('webp'), 0);
        break;
      case 'thumbnail':
        showComingSoon(action);
        break;
      case 'about':
        window.open('pages/about.html', '_blank');
        break;
      case 'features':
        window.open('pages/features.html', '_blank');
        break;
      case 'guide':
        window.open('pages/guide.html', '_blank');
        break;
      case 'faq':
        window.open('pages/faq.html', '_blank');
        break;
      case 'contact':
        window.open('pages/contact.html', '_blank');
        break;
      case 'privacy':
        window.open('pages/privacy.html', '_blank');
        break;
      case 'terms':
        window.open('pages/terms.html', '_blank');
        break;
      default:
        break;
    }
  }

  /* ══════════════════════════════════════════
     도구 화면 전환
  ══════════════════════════════════════════ */
  function showTool(toolName) {
    const allTools = document.querySelectorAll('.tool-panel');
    allTools.forEach(t => t.style.display = 'none');

    const target = document.getElementById('tool-' + toolName);
    if (target) target.style.display = '';

    // 창 제목 업데이트
    const titleEl = document.getElementById('window-title-text');
    const titles  = {
      resize:   '이미지 크기 변경 - XP Image Tools',
      compress: '이미지 압축 - XP Image Tools',
      convert:  '이미지 형식 변환 - XP Image Tools',
    };
    if (titleEl) titleEl.textContent = titles[toolName] || 'XP Image Tools';
  }

  /* ══════════════════════════════════════════
     준비 중 메시지 박스
  ══════════════════════════════════════════ */
  const actionLabels = {
    compress:   '이미지 압축',
    'to-png':   'PNG 변환',
    'to-jpg':   'JPG 변환',
    'to-webp':  'WEBP 변환',
    thumbnail:  '썸네일 제작',
  };

  function showComingSoon(action) {
    const label = actionLabels[action] || action;
    showMsgBox(
      '준비 중입니다',
      `<strong>${label}</strong> 기능은 현재 개발 중입니다.<br>곧 업데이트될 예정입니다! 😊`,
      'ℹ️'
    );
  }

  /* ══════════════════════════════════════════
     메시지 박스
  ══════════════════════════════════════════ */
  function showMsgBox(title, html, icon) {
    const overlay = document.getElementById('msgbox-overlay');
    if (!overlay) return;

    document.getElementById('msgbox-icon').textContent  = icon || 'ℹ️';
    document.getElementById('msgbox-text').innerHTML    = html;
    document.getElementById('msgbox-title').textContent = title;
    overlay.classList.add('visible');

    const okBtn = document.getElementById('msgbox-ok');
    okBtn?.focus();
  }

  function closeMsgBox() {
    document.getElementById('msgbox-overlay')?.classList.remove('visible');
  }

  /* ══════════════════════════════════════════
     창 드래그 (마우스 + 터치)
  ══════════════════════════════════════════ */
  function makeDraggable(windowEl, handleEl) {
    if (!windowEl || !handleEl) return;

    let isDragging = false;
    let startX, startY, origLeft, origTop;

    function getPos() {
      const style = getComputedStyle(windowEl);
      return {
        left: parseInt(style.left, 10) || 0,
        top:  parseInt(style.top,  10) || 0,
      };
    }

    function onStart(clientX, clientY) {
      isDragging = true;
      const pos  = getPos();
      startX     = clientX;
      startY     = clientY;
      origLeft   = pos.left;
      origTop    = pos.top;
      windowEl.classList.add('dragging');
      // 창을 최상위로
      windowEl.style.zIndex = getMaxZ() + 1;
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      windowEl.style.left = (origLeft + dx) + 'px';
      windowEl.style.top  = Math.max(0, origTop + dy) + 'px';
    }

    function onEnd() {
      isDragging = false;
      windowEl.classList.remove('dragging');
    }

    // 마우스
    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.xp-btn-titlebar')) return;
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', onEnd);

    // 터치
    handleEl.addEventListener('touchstart', (e) => {
      if (e.target.closest('.xp-btn-titlebar')) return;
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  function getMaxZ() {
    let max = 100;
    document.querySelectorAll('.draggable-window').forEach(w => {
      const z = parseInt(getComputedStyle(w).zIndex, 10) || 0;
      if (z > max) max = z;
    });
    return max;
  }

  /* ══════════════════════════════════════════
     창 포커스 (클릭 시 최상위)
  ══════════════════════════════════════════ */
  function initWindowFocus() {
    document.querySelectorAll('.draggable-window').forEach(win => {
      win.addEventListener('mousedown', () => {
        win.style.zIndex = getMaxZ() + 1;
      });
    });
  }

  /* ══════════════════════════════════════════
     최소화 / 최대화 / 닫기 버튼
  ══════════════════════════════════════════ */
  function initWindowButtons() {
    // 닫기 버튼
    document.querySelectorAll('[data-action="close-window"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const win = btn.closest('.draggable-window');
        if (win) win.style.display = 'none';

        // 작업 표시줄 버튼 갱신
        updateTaskbarWindows();
      });
    });

    // 최소화 버튼
    document.querySelectorAll('[data-action="minimize-window"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const win = btn.closest('.draggable-window');
        if (!win) return;
        win.dataset.minimized = win.dataset.minimized === '1' ? '0' : '1';
        const content = win.querySelector('.xp-window-body');
        if (content) content.style.display = win.dataset.minimized === '1' ? 'none' : '';
        updateTaskbarWindows();
      });
    });

    // 최대화 버튼
    document.querySelectorAll('[data-action="maximize-window"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const win = btn.closest('.draggable-window');
        if (!win) return;
        if (win.dataset.maximized === '1') {
          // 복원
          win.style.left   = win.dataset.restoreLeft || '50%';
          win.style.top    = win.dataset.restoreTop  || '40px';
          win.style.width  = win.dataset.restoreW    || '';
          win.style.height = win.dataset.restoreH    || '';
          win.style.transform = 'translateX(-50%)';
          win.dataset.maximized = '0';
        } else {
          // 최대화
          win.dataset.restoreLeft = win.style.left;
          win.dataset.restoreTop  = win.style.top;
          win.dataset.restoreW    = win.style.width;
          win.dataset.restoreH    = win.style.height;
          win.style.left      = '0';
          win.style.top       = '0';
          win.style.width     = '100vw';
          win.style.height    = 'calc(100vh - 40px)';
          win.style.transform = 'none';
          win.dataset.maximized = '1';
        }
      });
    });
  }

  /* ══════════════════════════════════════════
     작업 표시줄 창 버튼 업데이트
  ══════════════════════════════════════════ */
  function updateTaskbarWindows() {
    const container = document.getElementById('taskbar-windows');
    if (!container) return;
    container.innerHTML = '';

    document.querySelectorAll('.draggable-window').forEach(win => {
      if (win.style.display === 'none') return;
      const title = win.querySelector('.xp-titlebar-title')?.textContent || '창';
      const btn   = document.createElement('button');
      btn.className = 'taskbar-window-btn';
      btn.textContent = title;
      btn.setAttribute('aria-label', title + ' 창');
      btn.addEventListener('click', () => {
        if (win.dataset.minimized === '1') {
          win.dataset.minimized = '0';
          const content = win.querySelector('.xp-window-body');
          if (content) content.style.display = '';
        }
        win.style.zIndex = getMaxZ() + 1;
      });
      container.appendChild(btn);
    });
  }

  /* ══════════════════════════════════════════
     데스크탑 아이콘
  ══════════════════════════════════════════ */
  function initDesktopIcons() {
    document.querySelectorAll('.desktop-icon').forEach(icon => {
      let clickCount = 0;
      let clickTimer;

      icon.addEventListener('click', () => {
        clickCount++;
        if (clickCount === 1) {
          // 선택
          document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
          icon.classList.add('selected');
          clickTimer = setTimeout(() => { clickCount = 0; }, 500);
        } else if (clickCount === 2) {
          // 더블 클릭 — 액션 실행
          clearTimeout(clickTimer);
          clickCount = 0;
          const action = icon.dataset.action;
          if (action) handleMenuAction(action);
        }
      });

      // 키보드 접근성
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const action = icon.dataset.action;
          if (action) handleMenuAction(action);
        }
      });
    });

    // 데스크탑 클릭 시 선택 해제
    document.getElementById('desktop')?.addEventListener('click', (e) => {
      if (!e.target.closest('.desktop-icon') && !e.target.closest('.draggable-window')) {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
      }
    });
  }

  /* ══════════════════════════════════════════
     창 프로그레스바 애니메이션 처리
  ══════════════════════════════════════════ */
  // (resize.js에서 사용)

  /* ══════════════════════════════════════════
     초기화
  ══════════════════════════════════════════ */
  function init() {
    // 시계
    updateClock();
    setInterval(updateClock, 30000);

    // 시작 메뉴
    initStartMenu();

    // 창 버튼
    initWindowButtons();

    // 창 드래그
    const mainWin    = document.getElementById('main-window');
    const mainHandle = mainWin?.querySelector('.xp-titlebar');
    if (mainWin && mainHandle) makeDraggable(mainWin, mainHandle);

    // 창 포커스
    initWindowFocus();

    // 작업 표시줄
    updateTaskbarWindows();

    // 데스크탑 아이콘
    initDesktopIcons();

    // 메시지 박스 닫기
    document.getElementById('msgbox-ok')?.addEventListener('click', closeMsgBox);
    document.getElementById('msgbox-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeMsgBox();
    });

    // 초기 도구 표시
    showTool('resize');
  }

  document.addEventListener('DOMContentLoaded', init);

  // 전역 노출 (resize.js 등에서 사용)
  window.XPApp = { showMsgBox, closeMsgBox, handleMenuAction };
})();
