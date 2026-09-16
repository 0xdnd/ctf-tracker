/*!
 * FerroFluid v1.0 — Interactive cursor-following fluid simulation
 * Aesthetic: Cyber Ferrofluid / Hacker Dark Liquid (void black · bone · white)
 *
 * Tech: raw WebGL1, GLSL ES 1.00, GPU Navier-Stokes (stable fluids) with
 *       ping-pong half-float FBOs, vorticity confinement, magnetic attractor,
 *       fresnel/spec surface shading, simplex turbulence, speed-gated
 *       chromatic aberration + CRT scanlines.
 *
 * Usage: FerroFluid.init({ zIndex: -1 })  ->  controller { destroy() }
 * Sections: [CONFIG] [SHADERS] [GL CORE] [SIMULATION] [INPUT] [BOOTSTRAP]
 */
(function (global) {
    'use strict';

    /* ================================================================
     * [CONFIG]
     * ================================================================ */
    var DEFAULTS = {
        zIndex: -1,
        simRes: 160,
        dyeRes: 512,
        pressureIters: 20,
        densityDissipation: 0.55,
        velocityDissipation: 0.22,
        pressureDecay: 0.82,
        curlStrength: 26,
        splatForce: 5200,
        baseRadius: 0.0021,
        minRadius: 0.00045,
        pullStrength: 42,
        pullRadius: 0.018,
        opacity: 1.0,
        palette: 'auto'
    };

    var PALETTES = {
        ink:  { ink: [0.09, 0.08, 0.06],  sheen: [1.0, 0.98, 0.94] },
        void: { ink: [0.02, 0.02, 0.02],  sheen: [0.91, 0.89, 0.85] }
    };

    /* ================================================================
     * [SHADERS] — GLSL ES 1.00
     * ================================================================ */
    var VERT = [
        'precision highp float;',
        'attribute vec2 aPos;',
        'varying vec2 vUv;',
        'varying vec2 vL;',
        'varying vec2 vR;',
        'varying vec2 vT;',
        'varying vec2 vB;',
        'uniform vec2 uTexel;',
        'void main(){',
        '    vUv = aPos * 0.5 + 0.5;',
        '    vL = vUv - vec2(uTexel.x, 0.0);',
        '    vR = vUv + vec2(uTexel.x, 0.0);',
        '    vT = vUv + vec2(0.0, uTexel.y);',
        '    vB = vUv - vec2(0.0, uTexel.y);',
        '    gl_Position = vec4(aPos, 0.0, 1.0);',
        '}'
    ].join('\n');

    // Advection with viscosity decay + magnetic attractor pulling fluid toward cursor
    var FRAG_ADVECTION = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D uVelocity;',
        'uniform sampler2D uSource;',
        'uniform vec2 uTexel;',
        'uniform float uDt;',
        'uniform float uDecay;',
        'uniform float uAspect;',
        'uniform vec2 uAttractor;',
        'uniform float uPull;',
        'uniform float uPullRadius;',
        'void main(){',
        '    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;',
        '    vec4 result = texture2D(uSource, coord);',
        '    vec2 toA = uAttractor - vUv;',
        '    toA.x *= uAspect;',
        '    float d2 = dot(toA, toA);',
        '    float mag = uPull * exp(-d2 / uPullRadius);',
        '    result.xy += (toA / (sqrt(d2) + 1e-5)) * mag * uDt;',
        '    float decay = 1.0 + uDecay * uDt;',
        '    gl_FragColor = result / decay;',
        '}'
    ].join('\n');

    // Gaussian splat — velocity impulses and dye droplets
    var FRAG_SPLAT = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D uTarget;',
        'uniform vec2 uPoint;',
        'uniform vec3 uValue;',
        'uniform float uRadius;',
        'uniform float uAspect;',
        'void main(){',
        '    vec2 p = vUv - uPoint;',
        '    p.x *= uAspect;',
        '    float g = exp(-dot(p, p) / uRadius);',
        '    vec3 base = texture2D(uTarget, vUv).xyz;',
        '    gl_FragColor = vec4(base + g * uValue, 1.0);',
        '}'
    ].join('\n');

    var FRAG_CURL = [
        'precision highp float;',
        'varying vec2 vUv;',
        'varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
        'uniform sampler2D uVelocity;',
        'void main(){',
        '    float L = texture2D(uVelocity, vL).y;',
        '    float R = texture2D(uVelocity, vR).y;',
        '    float T = texture2D(uVelocity, vT).x;',
        '    float B = texture2D(uVelocity, vB).x;',
        '    float vort = R - L - T + B;',
        '    gl_FragColor = vec4(0.5 * vort, 0.0, 0.0, 1.0);',
        '}'
    ].join('\n');

    // Vorticity confinement — restores swirling eddy currents lost to numerics
    var FRAG_VORTICITY = [
        'precision highp float;',
        'varying vec2 vUv;',
        'varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
        'uniform sampler2D uVelocity;',
        'uniform sampler2D uCurl;',
        'uniform float uCurlStrength;',
        'uniform float uDt;',
        'void main(){',
        '    float L = texture2D(uCurl, vL).x;',
        '    float R = texture2D(uCurl, vR).x;',
        '    float T = texture2D(uCurl, vT).x;',
        '    float B = texture2D(uCurl, vB).x;',
        '    float C = texture2D(uCurl, vUv).x;',
        '    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));',
        '    force /= length(force) + 1e-4;',
        '    force *= uCurlStrength * C;',
        '    force.y *= -1.0;',
        '    vec2 vel = texture2D(uVelocity, vUv).xy;',
        '    vel = clamp(vel + force * uDt, -1000.0, 1000.0);',
        '    gl_FragColor = vec4(vel, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG_DIVERGENCE = [
        'precision highp float;',
        'varying vec2 vUv;',
        'varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
        'uniform sampler2D uVelocity;',
        'void main(){',
        '    float L = texture2D(uVelocity, vL).x;',
        '    float R = texture2D(uVelocity, vR).x;',
        '    float T = texture2D(uVelocity, vT).y;',
        '    float B = texture2D(uVelocity, vB).y;',
        '    vec2 C = texture2D(uVelocity, vUv).xy;',
        '    if (vL.x < 0.0) { L = -C.x; }',
        '    if (vR.x > 1.0) { R = -C.x; }',
        '    if (vT.y > 1.0) { T = -C.y; }',
        '    if (vB.y < 0.0) { B = -C.y; }',
        '    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG_PRESSURE = [
        'precision highp float;',
        'varying vec2 vUv;',
        'varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
        'uniform sampler2D uPressure;',
        'uniform sampler2D uDivergence;',
        'void main(){',
        '    float L = texture2D(uPressure, vL).x;',
        '    float R = texture2D(uPressure, vR).x;',
        '    float T = texture2D(uPressure, vT).x;',
        '    float B = texture2D(uPressure, vB).x;',
        '    float div = texture2D(uDivergence, vUv).x;',
        '    gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG_GRADIENT_SUB = [
        'precision highp float;',
        'varying vec2 vUv;',
        'varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;',
        'uniform sampler2D uPressure;',
        'uniform sampler2D uVelocity;',
        'void main(){',
        '    float L = texture2D(uPressure, vL).x;',
        '    float R = texture2D(uPressure, vR).x;',
        '    float T = texture2D(uPressure, vT).x;',
        '    float B = texture2D(uPressure, vB).x;',
        '    vec2 vel = texture2D(uVelocity, vUv).xy;',
        '    vel -= vec2(R - L, T - B);',
        '    gl_FragColor = vec4(vel, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG_CLEAR = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D uTexture;',
        'uniform float uValue;',
        'void main(){',
        '    gl_FragColor = uValue * texture2D(uTexture, vUv);',
        '}'
    ].join('\n');

    //__APPEND__
    // Display: fresnel/spec wet shading, simplex turbulence, speed-gated
    // chromatic aberration + CRT scanlines, organic alpha dissolve.
    var FRAG_DISPLAY = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D uDensity;',
        'uniform vec2 uTexel;',
        'uniform float uTime;',
        'uniform float uSpeed;',
        'uniform vec3 uInk;',
        'uniform vec3 uSheen;',
        'uniform float uOpacity;',
        '',
        '// Ashima Arts 2D simplex noise (MIT)',
        'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }',
        'float snoise(vec2 v){',
        '    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
        '    vec2 i  = floor(v + dot(v, C.yy));',
        '    vec2 x0 = v - i + dot(i, C.xx);',
        '    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
        '    vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;',
        '    i = mod(i, 289.0);',
        '    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
        '    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
        '    m = m*m; m = m*m;',
        '    vec3 x = 2.0 * fract(p * C.www) - 1.0;',
        '    vec3 h = abs(x) - 0.5;',
        '    vec3 ox = floor(x + 0.5);',
        '    vec3 a0 = x - ox;',
        '    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
        '    vec3 g;',
        '    g.x  = a0.x * x0.x + h.x * x0.y;',
        '    g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
        '    return 130.0 * dot(m, g);',
        '}',
        '',
        'float dens(vec2 uv){ return texture2D(uDensity, uv).x; }',
        '',
        'void main(){',
        '    vec2 uv = vUv;',
        '    float t = uTime * 0.35;',
        '    float n1 = snoise(uv * 7.0 + t);',
        '    float n2 = snoise(uv * 13.0 - t * 1.3);',
        '',
        '    // monochrome chromatic aberration - gated by cursor acceleration',
        '    vec2 rad = uv - 0.5;',
        '    float ab = uSpeed * 0.0075 * (0.6 + 0.4 * n1);',
        '    float dr = dens(uv + rad * ab + n1 * 0.0025);',
        '    float dg = dens(uv + n2 * 0.0015);',
        '    float db = dens(uv - rad * ab - n2 * 0.0025);',
        '    float density = (dr + dg + db) / 3.0;',
        '',
        '    // wet surface normal from density gradient',
        '    vec2 e = uTexel * 1.5;',
        '    float gx = dens(uv + vec2(e.x, 0.0)) - dens(uv - vec2(e.x, 0.0));',
        '    float gy = dens(uv + vec2(0.0, e.y)) - dens(uv - vec2(0.0, e.y));',
        '    vec3 nrm = normalize(vec3(-gx * 6.0, -gy * 6.0, 1.0));',
        '',
        '    vec3 V = vec3(0.0, 0.0, 1.0);',
        '    vec3 L = normalize(vec3(-0.35, 0.55, 0.75));',
        '    float diff = max(dot(nrm, L), 0.0);',
        '    float spec = pow(max(dot(reflect(-L, nrm), V), 0.0), 48.0);',
        '    float fres = pow(1.0 - clamp(nrm.z, 0.0, 1.0), 2.5);',
        '',
        '    vec3 col = mix(uInk, uInk * 1.6 + uSheen * 0.05, diff * 0.25);',
        '    col += uSheen * (spec * 0.85 + fres * 0.30);',
        '    col *= 1.0 + (dr - db) * uSpeed * 0.6;',
        '',
        '    // CRT scanlines: faint always, glitchy only while moving fast',
        '    float scan = sin(gl_FragCoord.y * 1.7 + uTime * 8.0) * 0.5 + 0.5;',
        '    col *= 1.0 - 0.03 * scan;',
        '    col *= 1.0 - uSpeed * 0.16 * scan;',
        '',
        '    float alpha = clamp(density * 1.4, 0.0, 1.0) * uOpacity;',
        '    gl_FragColor = vec4(col * alpha, alpha);',
        '}'
    ].join('\n');

    /* ================================================================
     * [GL CORE] — programs, FBOs, fullscreen quad
     * ================================================================ */
    function compileShader(gl, type, source) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            throw new Error('FerroFluid shader error: ' + gl.getShaderInfoLog(sh));
        }
        return sh;
    }

    function createProgram(gl, vertSrc, fragSrc) {
        var prog = gl.createProgram();
        gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, vertSrc));
        gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
        gl.bindAttribLocation(prog, 0, 'aPos'); // must bind before link
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error('FerroFluid link error: ' + gl.getProgramInfoLog(prog));
        }
        var uniforms = {};
        var n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < n; i++) {
            var name = gl.getActiveUniform(prog, i).name;
            uniforms[name] = gl.getUniformLocation(prog, name);
        }
        return { program: prog, uniforms: uniforms };
    }

    function createFBO(gl, w, h, type, filter) {
        var texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);

        var fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
            texture: texture, fbo: fbo, width: w, height: h,
            texelX: 1 / w, texelY: 1 / h,
            attach: function (id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            }
        };
    }

    function createDoubleFBO(gl, w, h, type, filter) {
        var a = createFBO(gl, w, h, type, filter);
        var b = createFBO(gl, w, h, type, filter);
        return {
            width: w, height: h, texelX: a.texelX, texelY: a.texelY,
            read: a, write: b,
            swap: function () { var t = this.read; this.read = this.write; this.write = t; }
        };
    }

    /* ================================================================
     * [SIMULATION]
     * ================================================================ */
    function FerroFluid(canvas, opts) {
        var cfg = {};
        var k;
        for (k in DEFAULTS) cfg[k] = DEFAULTS[k];
        for (k in (opts || {})) cfg[k] = opts[k];

        this.canvas = canvas;
        this.cfg = cfg;
        this.destroyed = false;
        this._raf = null;
        this._lastT = null;
        this._frame = 0;
        this._lastMove = performance.now();
        this.speedSmoothed = 0;

        var gl = canvas.getContext('webgl', {
            alpha: true, premultipliedAlpha: true,
            depth: false, stencil: false, antialias: false,
            preserveDrawingBuffer: false
        }) || canvas.getContext('experimental-webgl');
        if (!gl) throw new Error('WebGL unavailable');

        // half-float render targets are mandatory for signed velocity fields
        var extHF = gl.getExtension('OES_texture_half_float');
        if (!extHF) throw new Error('OES_texture_half_float unsupported');
        var extLin = gl.getExtension('OES_texture_half_float_linear');
        this.gl = gl;
        this.halfType = extHF.HALF_FLOAT_OES;
        this.linearFilter = extLin ? gl.LINEAR : gl.NEAREST;

        // capability probe: verify we can actually render into a half-float FBO
        (function probe() {
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, extHF.HALF_FLOAT_OES, null);
            var fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(fb);
            gl.deleteTexture(tex);
            if (!ok) throw new Error('half-float framebuffer rendering unsupported');
        })();


        this.coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
        if (this.coarse) {
            cfg.simRes = 96; cfg.dyeRes = 256; cfg.pressureIters = 12; // throttle mobile
        }

        // palette auto-detect: light page -> dark ink liquid, dark page -> void mercury
        if (cfg.palette === 'auto') {
            var bg = '';
            try { bg = getComputedStyle(document.body).backgroundColor || ''; } catch (e) {}
            var m = bg.match(/[\d.]+/g);
            var lum = 1;
            if (m && m.length >= 3) lum = (0.2126 * parseFloat(m[0]) + 0.7152 * parseFloat(m[1]) + 0.0722 * parseFloat(m[2])) / 255;
            cfg.palette = lum > 0.5 ? 'ink' : 'void';
        }
        this.palette = PALETTES[cfg.palette] || PALETTES.ink;

        this._setupQuad(gl);
        this.progs = {
            advection: createProgram(gl, VERT, FRAG_ADVECTION),
            splat: createProgram(gl, VERT, FRAG_SPLAT),
            curl: createProgram(gl, VERT, FRAG_CURL),
            vorticity: createProgram(gl, VERT, FRAG_VORTICITY),
            divergence: createProgram(gl, VERT, FRAG_DIVERGENCE),
            pressure: createProgram(gl, VERT, FRAG_PRESSURE),
            gradient: createProgram(gl, VERT, FRAG_GRADIENT_SUB),
            clear: createProgram(gl, VERT, FRAG_CLEAR),
            display: createProgram(gl, VERT, FRAG_DISPLAY)
        };

        this._resize();
        var self = this;
        this._onResize = function () { self._resize(); };
        global.addEventListener('resize', this._onResize);

        this.pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, dx: 0, dy: 0, speed: 0, moved: false };
        this._bindInput();

        this._raf = global.requestAnimationFrame(function (t) { self._tick(t); });
    }

    FerroFluid.prototype._setupQuad = function (gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        var self = this;
        this._blit = function (target) {
            if (target === null) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
                gl.viewport(0, 0, target.width, target.height);
            }
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        };
    };

    FerroFluid.prototype._res = function (a, b, cap) {
        var ratio = a / b;
        return ratio > 1 ? Math.round(cap * ratio) : Math.round(cap);
    };

    FerroFluid.prototype._resize = function () {
        var gl = this.gl;
        var dpr = Math.min(window.devicePixelRatio || 1, this.coarse ? 1.25 : 2); // high-DPI aware
        var w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
        var h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
        if (this.density && this.canvas.width === w && this.canvas.height === h) return;
        this.canvas.width = w;
        this.canvas.height = h;

        var simW = this._res(w, h, this.cfg.simRes);
        var simH = this._res(h, w, this.cfg.simRes);
        var dyeW = this._res(w, h, this.cfg.dyeRes);
        var dyeH = this._res(h, w, this.cfg.dyeRes);
        var t = this.halfType, f = this.linearFilter;

        this.velocity = createDoubleFBO(gl, simW, simH, t, f);
        this.pressure = createDoubleFBO(gl, simW, simH, t, f);
        this.divergence = createFBO(gl, simW, simH, t, gl.NEAREST);
        this.curl = createFBO(gl, simW, simH, t, gl.NEAREST);
        this.density = createDoubleFBO(gl, dyeW, dyeH, t, f);
    };

    FerroFluid.prototype._use = function (p) {
        this.gl.useProgram(p.program);
        return p.uniforms;
    };

    FerroFluid.prototype._step = function (dt) {
        var gl = this.gl, P = this.progs;
        var tx = this.velocity.texelX, ty = this.velocity.texelY;
        var cfg = this.cfg;

        // -- advect velocity (viscous decay + magnetic pull toward cursor)
        var U = this._use(P.advection);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(U.uSource, this.velocity.read.attach(1));
        gl.uniform1f(U.uDt, dt);
        gl.uniform1f(U.uDecay, cfg.velocityDissipation);
        gl.uniform1f(U.uAspect, this.canvas.width / this.canvas.height);
        gl.uniform2f(U.uAttractor, this.pointer.x, 1.0 - this.pointer.y);
        gl.uniform1f(U.uPull, cfg.pullStrength * this.speedSmoothed);
        gl.uniform1f(U.uPullRadius, cfg.pullRadius);
        this._blit(this.velocity.write);
        this.velocity.swap();

        // -- vorticity confinement: restore swirling eddy currents
        U = this._use(P.curl);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(0));
        this._blit(this.curl);

        U = this._use(P.vorticity);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(U.uCurl, this.curl.attach(1));
        gl.uniform1f(U.uCurlStrength, cfg.curlStrength);
        gl.uniform1f(U.uDt, dt);
        this._blit(this.velocity.write);
        this.velocity.swap();

        // -- projection: divergence -> pressure (Jacobi) -> gradient subtract
        U = this._use(P.divergence);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(0));
        this._blit(this.divergence);

        U = this._use(P.clear);
        gl.uniform1i(U.uTexture, this.pressure.read.attach(0));
        gl.uniform1f(U.uValue, cfg.pressureDecay);
        this._blit(this.pressure.write);
        this.pressure.swap();

        U = this._use(P.pressure);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uDivergence, this.divergence.attach(0));
        for (var i = 0; i < cfg.pressureIters; i++) {
            gl.uniform1i(U.uPressure, this.pressure.read.attach(1));
            this._blit(this.pressure.write);
            this.pressure.swap();
        }

        U = this._use(P.gradient);
        gl.uniform2f(U.uTexel, tx, ty);
        gl.uniform1i(U.uPressure, this.pressure.read.attach(0));
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(1));
        this._blit(this.velocity.write);
        this.velocity.swap();

        // -- advect dye (visible liquid) with slower organic fade
        U = this._use(P.advection);
        gl.uniform2f(U.uTexel, this.density.texelX, this.density.texelY);
        gl.uniform1i(U.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(U.uSource, this.density.read.attach(1));
        gl.uniform1f(U.uDt, dt);
        gl.uniform1f(U.uDecay, cfg.densityDissipation);
        gl.uniform1f(U.uAspect, this.canvas.width / this.canvas.height);
        gl.uniform1f(U.uPull, 0.0);
        this._blit(this.density.write);
        this.density.swap();
    };

    // Dynamic splatting: velocity impulse + dye injection in one pass pair
    FerroFluid.prototype._splat = function (x, y, dx, dy, radius, amount) {
        var gl = this.gl;
        var U = this._use(this.progs.splat);
        gl.uniform1f(U.uAspect, this.canvas.width / this.canvas.height);
        gl.uniform2f(U.uPoint, x, 1.0 - y);
        gl.uniform1f(U.uRadius, radius);

        gl.uniform1i(U.uTarget, this.velocity.read.attach(0));
        gl.uniform3f(U.uValue, dx, dy, 0);
        this._blit(this.velocity.write);
        this.velocity.swap();

        gl.uniform1i(U.uTarget, this.density.read.attach(0));
        gl.uniform3f(U.uValue, amount, amount, amount);
        this._blit(this.density.write);
        this.density.swap();
    };

    FerroFluid.prototype._emit = function () {
        var p = this.pointer, cfg = this.cfg;
        if (!p.moved) return;
        p.moved = false;

        var snorm = Math.min(p.speed / 30, 1);   // normalized acceleration energy

        // surface tension snap: faster cursor -> tighter, sharper spikes
        var radius = cfg.baseRadius + (cfg.minRadius - cfg.baseRadius) * snorm;
        var amt = 0.25 + snorm * 0.55;

        // main ferro-spike along motion vector
        this._splat(p.x, p.y, p.dx * cfg.splatForce, p.dy * cfg.splatForce, radius, amt);

        // droplet separation — satellite beads peel off sideways at speed
        if (snorm > 0.35) {
            var count = 2 + Math.floor(snorm * 3);
            var baseAng = Math.atan2(p.dy, p.dx) + Math.PI / 2;
            for (var i = 0; i < count; i++) {
                var ang = baseAng + (Math.random() - 0.5) * 1.4;
                var dist = (0.01 + Math.random() * 0.03) * snorm;
                var jig = 0.75 + Math.random() * 0.5;
                this._splat(
                    p.x + Math.cos(ang) * dist,
                    p.y + Math.sin(ang) * dist,
                    p.dx * cfg.splatForce * 0.45 * jig,
                    p.dy * cfg.splatForce * 0.45 * jig,
                    radius * (0.4 + Math.random() * 0.6),
                    0.14 + snorm * 0.3
                );
            }
        }

        // noise-based turbulence kick at high acceleration
        if (snorm > 0.6) {
            var t = performance.now() / 1000;
            this._splat(p.x, p.y,
                Math.sin(t * 31.0) * snorm * 140,
                Math.cos(t * 27.0) * snorm * 140,
                radius * 3, 0);
        }
    };

    FerroFluid.prototype._tick = function (t) {
        var self = this;
        if (this.destroyed) return;
        this._raf = global.requestAnimationFrame(function (n) { self._tick(n); });
        if (document.hidden || this.paused) { this._lastT = t; return; }

        var dt = this._lastT === null ? 16 : Math.min(33, t - this._lastT);
        this._lastT = t;
        this._frame++;

        // battery saver: idle >4s without input -> simulate sparsely
        if (performance.now() - this._lastMove > 4000 && (this._frame % 6) !== 0) return;

        // smooth pointer energy drives the glitch/aberration gates
        var target = Math.min(this.pointer.speed / 30, 1);
        this.speedSmoothed += (target - this.speedSmoothed) * 0.08;

        this._step(dt / 1000);
        this._emit();
        this._render(t / 1000);
    };

    FerroFluid.prototype._render = function (time) {
        var gl = this.gl;
        var U = this._use(this.progs.display);
        gl.uniform2f(U.uTexel, this.density.texelX, this.density.texelY);
        gl.uniform1i(U.uDensity, this.density.read.attach(0));
        gl.uniform1f(U.uTime, time);
        gl.uniform1f(U.uSpeed, this.speedSmoothed);
        gl.uniform3f(U.uInk, this.palette.ink[0], this.palette.ink[1], this.palette.ink[2]);
        gl.uniform3f(U.uSheen, this.palette.sheen[0], this.palette.sheen[1], this.palette.sheen[2]);
        gl.uniform1f(U.uOpacity, this.cfg.opacity);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this._blit(null);
    };

    /* ================================================================
     * [INPUT] — pointer tracking with velocity measurement
     * ================================================================ */
    FerroFluid.prototype._bindInput = function () {
        var self = this, p = this.pointer;
        function onMove(cx, cy) {
            var nx = cx / window.innerWidth;
            var ny = cy / window.innerHeight;
            var dx = nx - p.px, dy = ny - p.py;
            p.speed = Math.sqrt(dx * dx + dy * dy) * 1000;
            p.dx = dx; p.dy = dy;
            p.px = nx; p.py = ny;
            p.x = nx; p.y = ny;
            p.moved = true;
            self._lastMove = performance.now();
        }
        this._onMoveMouse = function (e) { onMove(e.clientX, e.clientY); };
        this._onMoveTouch = function (e) {
            if (e.touches && e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
        };
        window.addEventListener('pointermove', this._onMoveMouse, { passive: true });
        window.addEventListener('touchmove', this._onMoveTouch, { passive: true });
    };

    FerroFluid.prototype.destroy = function () {
        this.destroyed = true;
        if (this._raf) cancelAnimationFrame(this._raf);
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('pointermove', this._onMoveMouse);
        window.removeEventListener('touchmove', this._onMoveTouch);
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        var ext = this.gl && this.gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
    };

    /* ================================================================
     * [BOOTSTRAP]
     * ================================================================ */
    function injectCanvas(zIndex) {
        var c = document.createElement('canvas');
        c.id = 'ferrofluid-canvas';
        c.setAttribute('aria-hidden', 'true');
        c.style.cssText =
            'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
            'pointer-events:none;z-index:' + zIndex + ';display:block;';
        document.body.appendChild(c);
        return c;
    }

    global.FerroFluid = {
        /**
         * @param {Object} [opts] see DEFAULTS; opts.canvas overrides auto-injection
         * @returns {FerroFluid|null} controller with .destroy(), or null if unsupported
         */
        init: function (opts) {
            opts = opts || {};
            try {
                var canvas = opts.canvas || injectCanvas(opts.zIndex != null ? opts.zIndex : DEFAULTS.zIndex);
                return new FerroFluid(canvas, opts);
            } catch (err) {
                // graceful degradation — the host page must never break
                if (typeof console !== 'undefined' && console.info) console.info('FerroFluid disabled:', err.message);
                return null;
            }
        }
    };

})(typeof window !== 'undefined' ? window : this);
