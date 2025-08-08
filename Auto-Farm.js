(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY: 1000,
    THEME: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      text: '#ffffff',
      highlight: '#0073ff',
      success: '#00ff00',
      error: '#ff0000'
    }
  };

  const state = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    minimized: false,
    menuOpen: false,
    language: 'en'
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        credentials: 'include',
        ...options
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  };

  const getRandomPosition = () => ({
    x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE),
    y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE)
  });

  const paintPixel = async (x, y) => {
    const randomColor = Math.floor(Math.random() * 31) + 1;
    return await fetchAPI(`https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ coords: [x, y], colors: [randomColor] })
    });
  };

  const getCharge = async () => {
    const data = await fetchAPI('https://backend.wplace.live/me');
    if (data) {
      state.userInfo = data;
      state.charges = {
        count: Math.floor(data.charges.count),
        max: Math.floor(data.charges.max),
        cooldownMs: data.charges.cooldownMs
      };
      if (state.userInfo.level) {
        state.userInfo.level = Math.floor(state.userInfo.level);
      }
    }
    return state.charges;
  };

  const detectUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      if (data.country === 'BR') {
        state.language = 'pt';
      } else if (data.country === 'US') {
        state.language = 'en';
      } else {
        state.language = 'en';
      }
    } catch {
      state.language = 'en';
    }
  };

  const paintLoop = async () => {
    while (state.running) {
      const { count, cooldownMs } = state.charges;

      if (count < 1) {
        updateUI(state.language === 'pt' ? `⌛ Sem cargas. Esperando ${Math.ceil(cooldownMs/1000)}s...` : `⌛ No charges. Waiting ${Math.ceil(cooldownMs/1000)}s...`, 'status');
        await sleep(cooldownMs);
        await getCharge();
        continue;
      }

      const randomPos = getRandomPosition();
      const paintResult = await paintPixel(randomPos.x, randomPos.y);

      if (paintResult?.painted === 1) {
        state.paintedCount++;
        state.lastPixel = {
          x: CONFIG.START_X + randomPos.x,
          y: CONFIG.START_Y + randomPos.y,
          time: new Date()
        };
        state.charges.count--;

        document.getElementById('paintEffect').style.animation = 'pulse 0.5s';
        setTimeout(() => {
          document.getElementById('paintEffect').style.animation = '';
        }, 500);

        updateUI(state.language === 'pt' ? '✅ Pixel pintado!' : '✅ Pixel painted!', 'success');
      } else {
        updateUI(state.language === 'pt' ? '❌ Falha ao pintar' : '❌ Failed to paint', 'error');
      }

      await sleep(CONFIG.DELAY);
      updateStats();
    }
  };

  window.updateStats = async () => {
    await getCharge();
    const statsArea = document.querySelector('#statsArea');
    if (statsArea) {
      const t = {
        pt: {
          user: "Usuário",
          pixels: "Pixels",
          charges: "Cargas",
          level: "Level"
        },
        en: {
          user: "User",
          pixels: "Pixels",
          charges: "Charges",
          level: "Level"
        }
      }[state.language] || {
        user: "User",
        pixels: "Pixels",
        charges: "Charges",
        level: "Level"
      };

      const nextLevelIn = state.userInfo?.nextLevelIn || 0;

      statsArea.innerHTML = `
        <div class="wplace-stat-item">
          <div class="wplace-stat-label"><i class="fas fa-user"></i> ${t.user}</div>
          <div>${state.userInfo.name}</div>
        </div>
        <div class="wplace-stat-item">
          <div class="wplace-stat-label"><i class="fas fa-paint-brush"></i> ${t.pixels}</div>
          <div>${state.paintedCount}</div>
        </div>
        <div class="wplace-stat-item">
          <div class="wplace-stat-label"><i class="fas fa-bolt"></i> ${t.charges}</div>
          <div>${Math.floor(state.charges.count)}/${Math.floor(state.charges.max)}</div>
        </div>
        <div class="wplace-stat-item">
          <div class="wplace-stat-label"><i class="fas fa-star"></i> ${t.level}</div>
          <div>${state.userInfo?.level || '0'}</div>
        </div>
        <div class="wplace-stat-item">
          <div class="wplace-stat-label"><i class="fas fa-arrow-up"></i> Next Level In</div>
          <div>${nextLevelIn} px</div>
        </div>
      `;
    }
  };

  window.updateUI = (message, type = 'default') => {
    const statusText = document.querySelector('#statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
      statusText.style.animation = 'none';
      void statusText.offsetWidth;
      statusText.style.animation = 'slideIn 0.3s ease-out';
    }
  };

  const createUI = () => { /* ... UI Code ... */ };

  await detectUserLocation();
  createUI();
  await getCharge();
  updateStats();
})();
