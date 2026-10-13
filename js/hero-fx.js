/* =========================================================
   CRYA CREW — фон главного экрана
   1) красное травяное поле — WebGL-шейдер (полноэкранный)
   2) телевизор с «кожаной уткой» — canvas в режиме CRT:
      помехи, полоса прокрутки, дрожание кадра
   ========================================================= */
(function () {
  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================================================
     1. ТРАВА
     ======================================================= */
  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    '',
    'float hash21(vec2 p){',
    '  p = fract(p * vec2(233.34, 851.73));',
    '  p += dot(p, p + 23.45);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    /* Гладкий шум — используется для порывов ветра */
    'float noise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    /* Сила ветра в точке: два слоя шума + порыв от курсора */
    'float windAt(vec2 p, vec2 m, float t){',
    '  float big = noise(p * 0.55 + vec2(t * 0.075, 0.0)) * 2.0 - 1.0;',
    '  float small = noise(p * 2.30 - vec2(t * 0.170, 0.0)) * 2.0 - 1.0;',
    '  float gust = noise(vec2(p.x * 0.34 - t * 0.40, p.y * 0.10 + t * 0.10));',
    '  gust = pow(max(gust, 0.0), 3.4);',
    '  float d = distance(p, m);',
    '  float push = exp(-d * d * 0.075) * 0.95;',
    '  return big * 0.40 + small * 0.22 + gust * 0.70 + push;',
    '}',
    /* Один ярус травы: 44 травинки, нарисованные одним проходом */
    'float layer(vec2 uv, float sc, float t, vec2 m, out float hOut){',
    '  vec2 p = uv * sc;',
    '  p.x += (hash21(vec2(floor(p.y), 7.3)) * 2.0 - 1.0) * 0.45;',
    '  float col = floor(p.x);',
    '  p.x = fract(p.x) - 0.5;',
    '  float seed = hash21(vec2(col, sc));',
    '  float bottom = sc * (0.40 + 0.60 * fract(seed * 7.31));',
    '  float h = sc * (0.10 + 0.14 * seed);',
    '  float y = (p.y - bottom) / h;',
    '  if (y < 0.0 || y > 1.0) { hOut = 0.0; return 0.0; }',
    '  float w = 0.030 * sc;',
    '  float bend = 0.34 * (0.35 + 0.65 * seed);',
    '  float bx = windAt(vec2(col * 0.13, sc * 0.25), m, t) * bend * y * y * sc;',
    '  float wAt = w * (1.0 - y) * (1.0 - y * 0.35);',
    '  float d = abs(p.x - bx + w * 0.5 * (1.0 - y)) - wAt;',
    '  float a = smoothstep(0.0018, -0.0018, d);',
    '  hOut = y;',
    '  return a;',
    '}',
    '',
    /* Купол неба и горизонтальная дымка — тоже только в красных тонах */
    'vec3 sky(vec2 uv){',
    '  float y = clamp(uv.y, 0.0, 1.0);',
    '  vec3 horizon = vec3(0.20, 0.030, 0.025);',
    '  vec3 zenith  = vec3(0.030, 0.006, 0.008);',
    '  vec3 c = mix(horizon, zenith, pow(y, 1.30));',
    '  c += vec3(0.36, 0.035, 0.015) * pow(1.0 - y, 5.5);',
    '  return c;',
    '}',
    '',
    'void main(){',
    '  vec2 res = uRes;',
    '  vec2 uv = gl_FragCoord.xy / res;',
    '  uv.x *= res.x / res.y;',
    '  float t = uTime;',
    '  vec2 m = uMouse;',
    '',
    '  vec3 col = sky(uv);',
    '\n    /* ярусы травы: дальние — тёмные и мелкие, ближние — крупные */',
    '  float y; float a;',
    '  for (int i = 0; i < 5; i++) {',
    '    float fi = float(i);',
    '    float sc = 15.0 + fi * 8.5;',
    '    float depth = 1.0 - fi / 4.0;',
    '    a = layer(uv, sc, t, m, y);',
    '    vec3 tip = vec3(0.92, 0.20, 0.11);',
    '    vec3 root = vec3(0.24, 0.022, 0.020);',
    '    vec3 blade = mix(root, tip, y * y * 0.75 + 0.25 * y);',
    '    blade *= mix(0.42, 1.05, depth);',
    '    col = mix(col, blade, a * mix(0.55, 1.0, depth));',
    '  }',
    '',
    /* лёгкое мерцание, чтобы кадр не выглядел застывшим */
    '  col += vec3(0.5, 0.06, 0.03) * 0.035 * pow(max(0.0, noise(uv * 3.0 + t * 0.35)), 3.0);',
    /* зерно */
    '  col += (hash21(uv * res + fract(t) * 91.7) - 0.5) * 0.022;',
    /* виньетка */
    '  vec2 q = gl_FragCoord.xy / res - 0.5;',
    '  col *= 1.0 - dot(q, q) * 0.92;',
    '  col = max(col, vec3(0.0));',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function initGrass() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    var gl = canvas.getContext('webgl', {
      antialias: false, alpha: false, powerPreference: 'low-power',
      depth: false, stencil: false
    }) || canvas.getContext('experimental-webgl');

    if (!gl) { canvas.style.display = 'none'; return; }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.display = 'none'; return; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('link:', gl.getProgramInfoLog(prog));
      canvas.style.display = 'none';
      return;
    }
    gl.useProgram(prog);

    /* один треугольник на весь экран — дешевле, чем два */
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');

    /* На телефонах рисуем в меньшем разрешении — трава всё равно мягкая */
    var isSmall = window.innerWidth < 820;
    var scale = isSmall ? 0.62 : 0.85;

    var mouse = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };

    function resize() {
      var w = Math.max(1, Math.round(canvas.clientWidth * scale));
      var h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    function onMove(e) {
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = 1.0 - (e.clientY - r.top) / r.height;
      mouse.tx = x * (canvas.width / canvas.height) * 1.2;
      mouse.ty = y * 1.2;
    }
    window.addEventListener('pointermove', onMove, { passive: true });

    var start = performance.now();
    var raf = 0;
    var visible = true;

    /* не жжём батарею, когда главный экран ушёл из вида */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) loop();
      }, { threshold: 0 }).observe(canvas);
    }

    function loop() {
      if (!visible) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);

      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      var t = REDUCED ? 4 : (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    if (REDUCED) {
      gl.uniform1f(uTime, 4);
      gl.uniform2f(uMouse, 0.6, 0.4);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      loop();
    }
  }

  /* =======================================================
     2. ТЕЛЕВИЗОР С УТКОЙ
     ======================================================= */
  function initTV() {
    var cv = document.getElementById('tvCanvas');
    if (!cv) return;

    var ctx = cv.getContext('2d');
    var W = 420, H = 280;          /* внутреннее разрешение — низкое, как у ЭЛТ */
    cv.width = W; cv.height = H;

    var img = new Image();
    var ready = false;
    var shown = 'assets/img/duck.png';

    img.onload = function () { ready = true; };
    img.onerror = function () {
      /* нет кадра — берём векторную утку-заглушку */
      if (shown.indexOf('duck-leather.svg') === -1) {
        shown = 'assets/img/duck-leather.svg';
        img.src = shown;
      }
    };
    img.src = shown;

    /* Состояние «помех»: обычно выключено, вспыхивает ненадолго */
    var glitch = 0;          /* 0..1 — сила помех */
    var nextGlitch = 1.2;    /* когда включить следующие */
    var roll = 0;            /* полоса прокрутки кадра */

    function drawFrame(t) {
      ctx.save();

      /* лёгкое дрожание картинки — признак живого сигнала */
      var jx = (Math.random() - 0.5) * (0.6 + glitch * 7);
      var jy = (Math.random() - 0.5) * (0.4 + glitch * 5);
      ctx.translate(jx, jy);

      ctx.fillStyle = '#0a0705';
      ctx.fillRect(-10, -10, W + 20, H + 20);

      if (ready && img.width) {
        /* кадр масштабируем с обрезкой по центру — как в кадре телевизора */
        var s = Math.max(W / img.width, H / img.height);
        var dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, -dw * 0.06, (H - dh) / 2, dw, dh);
      }

      /* --- цветной канал уезжает при помехах: хроматическая аберрация --- */
      if (glitch > 0.05) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glitch * 0.28;
        ctx.drawImage(cv, 2.2 * glitch, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      /* --- снег и горизонтальные срывы строк --- */
      if (glitch > 0.02) {
        var lines = Math.round(60 * glitch);
        for (var i = 0; i < lines; i++) {
          var y = Math.random() * H;
          var h = 1 + Math.random() * (2 + glitch * 7);
          var off = (Math.random() - 0.5) * 46 * glitch;
          var alpha = 0.06 + Math.random() * 0.45 * glitch;
          /* сдвинутая копия строки — «срыв синхронизации» */
          ctx.globalAlpha = alpha;
          ctx.drawImage(cv, 0, y, W, h, off, y, W, h);
          ctx.globalAlpha = 1;
        }
        /* редкие яркие белые полосы */
        if (Math.random() < glitch * 0.35) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.05 + Math.random() * 0.2) + ')';
          ctx.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3);
        }
      }

      /* --- полоса прокрутки кадра, идёт снизу вверх --- */
      roll -= 0.55 + glitch * 3.5;
      if (roll < -H * 0.6) roll = H * 1.1;
      var grad = ctx.createLinearGradient(0, roll, 0, roll + H * 0.32);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,' + (0.045 + glitch * 0.14) + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, roll, W, H * 0.32);

      ctx.restore();

      /* --- постоянные строчные развёртки --- */
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      for (var sy = 0; sy < H; sy += 2) ctx.fillRect(0, sy, W, 1);

      /* --- зерно --- */
      var grain = ctx.createImageData(W, H);
      var d = grain.data;
      for (var k = 0; k < d.length; k += 4) {
        var v = (Math.random() * 255) | 0;
        d[k] = v; d[k + 1] = v; d[k + 2] = v;
        d[k + 3] = 14 + Math.random() * 26 * (1 + glitch * 2);
      }
      ctx.putImageData(grain, 0, 0);

      /* --- виньетка по краям --- */
      var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      /* --- красный отблеск от травы --- */
      var glowGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
      glowGrad.addColorStop(0, 'rgba(255,61,46,0)');
      glowGrad.addColorStop(1, 'rgba(255,61,46,0.20)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, W, H);
    }

    var visible = true;
    var raf = 0;
    var last = performance.now();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { last = performance.now(); loop(); }
      }, { threshold: 0 }).observe(cv);
    }

    function loop() {
      if (!visible) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);

      var now = performance.now();
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (REDUCED) {
        drawFrame(0);
        return;
      }

      /* логика помех: длинный чистый сигнал, короткая вспышка */
      nextGlitch -= dt;
      if (nextGlitch <= 0) {
        glitch = 0.45 + Math.random() * 0.55;
        nextGlitch = 1.6 + Math.random() * 3.4;
      }
      if (glitch > 0) glitch = Math.max(0, glitch - dt * 1.5);

      drawFrame(now / 1000);
    }

    /* первый кадр — сразу, как только утка загрузилась */
    img.addEventListener('load', function () {
      ready = true;
      drawFrame(0);
    });

    drawFrame(0);
    loop();
  }

  function boot() {
    initGrass();
    initTV();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
