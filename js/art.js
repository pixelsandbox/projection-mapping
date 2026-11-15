// Mario Wall — pixel art, drawn for this app. Each sprite is a text map (one letter per pixel) plus a
// palette; it is baked once into a tiny canvas and scaled up with nearest-neighbour filtering.
(function (g) {
  'use strict';
  const MW = g.MW = g.MW || {};

  const PAL = {
    black: '#000000', white: '#f8f8f8', red: '#e03a1e', brick: '#c25a1c', brickHi: '#f6b49a',
    orange: '#ff9a3c', brown: '#7a3a0c', skin: '#f6b07a', blue: '#2c4ee0', green: '#14a83c',
    lgreen: '#8ad624', dgreen: '#0b5a24', ugBlue: '#1e5ff0', ugLight: '#5cc4fa', gray: '#c0c0c8',
    dgray: '#78788a', yellow: '#fde3a4', gold: '#ffbb12', pink: '#f77fe0', lava: '#ff4a1a',
  };

  const makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  function rgbOf(col) {
    if (col[0] === '#') { const n = parseInt(col.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = col.match(/\d+/g).map(Number); return [m[0], m[1], m[2]];
  }
  // Lighten (k > 0) or darken (k < 0) a colour.
  function tint(col, k) {
    const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
    const [r, gg, b] = rgbOf(col); return `rgb(${f(r)},${f(gg)},${f(b)})`;
  }
  // Bake a letter map into a canvas through ImageData (one pass, no per-pixel fills).
  function fromMap(rows, colors, flip) {
    const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const c = makeCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), memo = {};
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const col = colors[row[i]]; if (!col) continue;
        const rgb = memo[col] || (memo[col] = rgbOf(col)), k = (j * w + (flip ? w - 1 - i : i)) * 4;
        img.data[k] = rgb[0]; img.data[k + 1] = rgb[1]; img.data[k + 2] = rgb[2]; img.data[k + 3] = 255;
      }
    });
    x.putImageData(img, 0, 0); return c;
  }

  // ---------------- heroes ----------------
  // Letters: R cap/shirt, B overalls, S skin, H hair & moustache, E eye, Y buttons, N shoes.
  const HERO_HEAD = [
    '.....RRRRRR.....', '...RRRRRRRRRR...', '...RRRRRRRRRRRR.', '...HHSSSSES.....',
    '..HSHSSSSESSS...', '..HSHHSSSSSSSS..', '..HHSSSSHHHHH...', '....SSSSSSSS....',
  ];
  const HERO_STAND = HERO_HEAD.concat([
    '...RRBRRRRB.....', '..RRRBRRRRBRR...', '.SSRRBBBBBBRRSS.', '.SSSBYBBBBYBSSS.',
    '..SSBBBBBBBBSS..', '....BBB..BBB....', '...NNN....NNN...', '..NNNN....NNNN..',
  ]);
  const HERO_WALK1 = HERO_HEAD.concat([
    '...RRBRRRRB..SS.', '..SRRBRRRRBRRSS.', '.SSRRBBBBBBRR...', '.SS.BYBBBBYBB...',
    '....BBBBBBBBB...', '...BBB...BBBB...', '..NNN......NNN..', '.NNNN.....NNNN..',
  ]);
  const HERO_WALK2 = HERO_HEAD.concat([
    '....RRBRRB......', '...RRRBRRBRR....', '...RRSSBBBRR....', '....SSSYBB......',
    '....BBBBBB......', '.....BBBBB......', '.....NNNNN......', '....NNNNNN......',
  ]);
  const HERO_JUMP = [
    '.............SSS', '.....RRRRRR..SSS', '...RRRRRRRRRRRSS', '...HHSSSSES..RR.',
    '..HSHSSSSESSSRR.', '..HSHHSSSSSSSRR.', '..HHSSSSHHHHHR..', '....SSSSSSSSR...',
    '..RRRRBRRRRBR...', '.RRRRRBBRRRBR...', 'SSRRRRBYBBBYB...', 'SSS.BBBBBBBBBNN.',
    'SS.BBBBBBBBBBNN.', '..NBBBBBB...NN..', '..NNN...........', '..NN............',
  ];
  const HERO_PAL = {
    mario: { R: '#e03a1e', B: '#2c4ee0', S: PAL.skin, H: '#5a2c0c', E: '#1c0c04', Y: '#ffd23a', N: '#6e3610' },
    luigi: { R: '#14a83c', B: '#2c4ee0', S: PAL.skin, H: '#5a2c0c', E: '#1c0c04', Y: '#ffd23a', N: '#6e3610' },
    wario: { R: '#ffd21c', B: '#7a1cc0', S: PAL.skin, H: '#3c2008', E: '#1c0c04', Y: PAL.white, N: '#0b6a2c' },
    waluigi: { R: '#7a1cc8', B: '#2a2a38', S: PAL.skin, H: '#3c2008', E: '#1c0c04', Y: '#ffd23a', N: '#ff8a1c' },
    fire: { R: PAL.white, B: '#e03a1e', S: PAL.skin, H: '#5a2c0c', E: '#1c0c04', Y: '#ffd23a', N: '#a0280c' },
    ice: { R: '#a8e4fc', B: '#2058c8', S: PAL.skin, H: '#5a2c0c', E: '#1c0c04', Y: PAL.white, N: '#1c3c8c' },
    star1: { R: PAL.white, B: '#e03a1e', S: PAL.skin, H: '#e03a1e', E: PAL.black, Y: '#ffd23a', N: '#e03a1e' },
    star2: { R: '#8ad624', B: '#ff9a3c', S: PAL.skin, H: '#14a83c', E: PAL.black, Y: PAL.white, N: '#14a83c' },
    star3: { R: '#ffbb12', B: '#c25a1c', S: '#ff9a3c', H: '#7a3a0c', E: PAL.black, Y: '#fde3a4', N: '#7a3a0c' },
  };
  const heroFrames = p => ({ stand: fromMap(HERO_STAND, p), walk1: fromMap(HERO_WALK1, p), walk2: fromMap(HERO_WALK2, p), jump: fromMap(HERO_JUMP, p) });

  const TOAD = [
    '....WWWWWWWW....', '..WWWRRRRWWWWW..', '.WWRRRRRRWWRRWW.', 'WWWRRRRRRWRRRRWW',
    'WRRWRRRRWWRRRRWW', 'WRRWWWWWWWWRRWWW', '.WWWWWWWWWWWWWW.', '...SSSSSSSSSS...',
    '...SSKSSSSKSS...', '...SSKSSSSKSS...', '....SSSSSSSS....', '...BBWWWWWWBB...',
    '..SBBBWWWWBBBS..', '..SSBBBBBBBBSS..', '....WWW..WWW....', '...OOOO..OOOO...',
  ];
  const PEACH = [
    '.....Y.Y.Y......', '.....YYYYY......', '....HHHHHHH.....', '...HHSSSSSHH....',
    '...HSKSSKSSH....', '...HSSSSSSSH....', '...HHSSRSSHH....', '..HHHHSSSHHHH...',
    '..HHHPPPPPHHH...', '..HHPPPPPPPHH...', '.SSPPPPPPPPPSS..', '.SS.PPBBPPP.SS..',
    '....PPPPPPP.....', '...PPPPPPPPP....', '...PPPPPPPPP....', '..PPPPPPPPPPP...',
    '..PPPPPPPPPPP...', '.PPPPPPPPPPPPP..', '.DPPPPPPPPPPPD..', '.DDDDDDDDDDDDD..',
  ];
  const YOSHI = [
    '.........GGGG...', '.......GGGGGGGG.', '......GWWGGGGGGG', '......GWKGGGGGGG',
    '......GWKGGGGGWG', '.....GGGGGGGGGGG', '.....GGGGGGGGGG.', '....RGGGGWWWWW..',
    '...RRRGGWWW.....', '..RRRRGWWWW.....', '..GGGGGWWWW.....', '.GGGGGGWWWWW....',
    'GGGGGGGWWWWW....', 'GGG.GGGGWWWW....', '.....GGGGGGG....', '.....GG...GG....',
    '....OOO..OOOO...', '...OOOO..OOOOO..',
  ];

  const CAPTAIN = TOAD.map((r, j) => (j === 3 ? 'WWWRRRLLRWRRRRWW' : j === 4 ? 'WRRWRRLLWWRRRRWW' : r));
  const DK = [
    '.......BBBBBBB..........', '.....BBBBBBBBBBB........', '....BBBBBBBBBBBBB.......', '...BBBSSSSBSSSSBBB......',
    '...BBSSWKSSSWKSSBB......', '...BBSSWKSSSWKSSBB......', '..BBBSSSSSSSSSSSBBB.....', '..BBSSSSSKKSSSSSSBB.....',
    '..BBSSSSSSSSSSSSSBB.....', '..BBBSSKKKKKKKSSBBB.....', '...BBBSSSSSSSSSBBB......', '.BBBBBBBRRRRRBBBBBBB....',
    'BBBBBBBRRYRYRRBBBBBBB...', 'BBSSBBBBRRRRRBBBBSSBB...', 'BSSSBBBBBRRRBBBBBSSSB...', 'BSSSBBBBBBRBBBBBBSSSB...',
    'BSSBBBBBBBBBBBBBBBSSB...', '.SS.BBBBBBBBBBBBB.SS....', '....BBBBBBBBBBBBB.......', '....BBBBB...BBBBB.......',
    '...SSSSS.....SSSSS......', '..SSSSSS.....SSSSSS.....',
  ];

  // ---------------- enemies ----------------
  // N body, K brows & feet, W eye, E pupil, T fang, F lower body.
  const GOOMBA = [
    '......NNNN......', '....NNNNNNNN....', '...NNNNNNNNNN...', '..NNKKNNNNKKNN..',
    '.NNNNKKNNKKNNNN.', '.NNWWKNNNNKWWNN.', 'NNNWEKNNNNKEWNNN', 'NNNWWWNNNNWWWNNN',
    'NNNNNNNNNNNNNNNN', '.NNNNTNNNNTNNNN.', '..NNNNNNNNNNNN..', '....FFFFFFFF....',
    '...FFFFFFFFFF...', '..KKFFFFFFFFKK..', '.KKKKKF..FKKKKK.', '.KKKKK....KKKKK.',
  ];
  const KOOPA_TOP = [
    '..SSS...........', '.SSSSS..........', '.SWKSSS.........', 'SSKKSSS.........',
    'SSSSSSS.........', 'SSSSSSS.........', '.SSSSSS.........', '...SSSS.........',
    '...SSSS..GGGG...', '...SSS..GGWWGG..', '..SSS..GGWGGWGG.', '..SSS.GGWGGGGWGG',
    '..SSSGGWGGGGGGWG', '..SSSGWGGGGGGGGW', '...SSGWGGGGGGGGW', '...SSGGWGGGGGGWG',
    '....SGGGWWWWWWGG', '....WWWWWWWWWWW.',
  ];
  const KOOPA1 = KOOPA_TOP.concat(['.....SSS...SSS..', '....OOOO..OOOO..', '....OOOOO.OOOOO.']);
  const KOOPA2 = KOOPA_TOP.concat(['......SSSSSS....', '.....OOOOOO.....', '.....OOOOOOO....']);
  const SHELL = [
    '.....GGGGGG.....', '...GGWGGGGWGG...', '..GGWGGGGGGWGG..', '.GGWGGGGGGGGWGG.',
    '.GWGGGGGGGGGGWG.', 'GWWWWWWWWWWWWWWG', 'WWWWWWWWWWWWWWWW', '.WWWWWWWWWWWWWW.', '..SSSSSSSSSSSS..',
  ];
  const BOO = [
    '.....KKKKKK.....', '...KKWWWWWWKK...', '..KWWWWWWWWWWK..', '.KWWWWWWWWWWWWK.',
    '.KWWKWWWWKWWWWK.', 'KWWWKWWWWKWWWWWK', 'KWWWWWWWWWWWWWWK', 'KWWKKKKKKKKWWWWK',
    'KWWKRRRRRRKWWWWK', 'KWWWKRRRRKWWWWWK', 'KWWWWKKKKWWWWWWK', '.KWWWWWWWWWWWWK.',
    '.KWWWWWWWWWWWWKK', '..KWWWWWWWWWKWK.', '...KKWWWKKWKK...', '.....KKK..K.....',
  ];
  const PIRANHA_STEM = [
    '......GGGG......', '..GG...GG...GG..', '.GGGG..GG..GGGG.', 'GGLGGG.GG.GGGLGG',
    '.GGLGGGGGGGGLGG.', '..GGGGGGGGGGGG..', '......GGGG......', '.......GG.......',
  ];
  const PIRANHA_OPEN = [
    '.RRRR......RRRR.', 'RRWRRR....RRRWRR', 'RRRRRRW..WRRRRRR', 'RWRRRRW..WRRRRWR',
    'RRRRRW....WRRRRR', '.RRRRW....WRRRR.', '..RRRRW..WRRRR..', '....RRRRRRRR....',
  ].concat(PIRANHA_STEM);
  const PIRANHA_SHUT = [
    '.....RRRRRR.....', '...RRWRRRRWRR...', '..RRRRRRRRRRRR..', '.RRWRRRRRRRRWRR.',
    '.RRRRRRWWRRRRRR.', '..RRRRWWWWRRRR..', '...RRRRRRRRRR...', '.....RRRRRR.....',
  ].concat(PIRANHA_STEM);
  const BULLET = [
    '.....KKKKKKKK...', '...KKKKKKKKKKK.G', '..KKKWWWKKKKKKGG', '.KKKWWKWWKKKKKGG',
    '.KKKWKKKWKKKKKGG', 'KKKKWWKWWKKKKKGG', 'KKKKKWWWKKKKKKGG', 'KKKKKKKKKKKKKKGG',
    'KKWWWKKKKKKKKKGG', '.KKWWWWWWKKKKKGG', '.KKKKKKKKKKKKKGG', '..KKKKKKKKKKKKGG',
    '...KKKKKKKKKKK.G', '.....KKKKKKKK...',
  ];
  // R body, W fins & eye, E pupil.
  const FISH = [
    '.....RRRRR......', '...RRRRRRRRR.W..', '..RRWWRRRRRRWWW.', '.RRWWEWRRRRRWWWW', 'RRRRWWRRRRRRWWW.',
    'RRRRRRRRRRRRRW..', 'RRRRRRRRRRRRRWW.', '.RRRRRRRRRRRWWWW', '..RRRRRRRRR.WWW.', '...RRRRRRRR..W..', '.....RRRR.......',
  ];
  // W horns/eyes/teeth/spikes, R hair, G skin, E pupil, N nostril, Y belly, S shell, K claws.
  const BOWSER = [
    '..W.......W.............', '..WW.....WW.............', '..RRRRRRRRRR............', '.RRGGGGGGGGGR...........',
    'RRGGGGGGGGGGGG..........', 'RGGWWGGGGWWGGGG.........', 'RGGWEGGGGWEGGGG..SS.SS..', 'GGGGGGGGGGGGGGG.SWWSWWS.',
    'GGNGGNGGGGGGGG.SSSSSSSSS', 'GGGGGGGGGGGGGG.SSWSSSWSS', '.GWGWGWGWGWG...SSSSSSSSS', '..GGGGGGGGG....SSSWSSSWS',
    '...YYYYYGGGGGSSSSSSSSSS.', '..YYYYYYYGGGGGSSSSSSSS..', '.GYYYYYYYYGGGGGSSSSS....', 'GGYYYYYYYYGGGGGG........',
    'GG.YYYYYYYGGGGGG........', '...YYYYYYGGGGGGG........', '....GGGG...GGGGG........', '...GGGGG...GGGGGG.......',
    '..KKKKK...KKKKKK........',
  ];

  const BUZZY = [
    '....KKKKKKK.....', '..KKBBBBBBBKK...', '.KBBLLBBBBBBBK..', 'KBBLBBBBBBBBBBK.', 'KBBBBBBBBBBBBBK.', 'KBBBBBBBBBBBBBSS',
    'KKBBBBBBBBBBBSKS', '.KKKKKKKKKKKKSSS', '..OO.....OO.....', '.OOO....OOO.....',
  ];
  const SHYGUY = [
    '.....RRRRRR.....', '....RWWWWWWR....', '...RWWKWWKWWR...', '...RWWKWWKWWR...', '...RWWWWWWWWR...', '...RWWWKKWWWR...',
    '....RWWWWWWR....', '...RRRRRRRRRR...', '..RRRRRRRRRRRR..', '..RRBBBBBBBBRR..', '..RRRRRRRRRRRR..', '...RRRRRRRRRR...',
    '...BBBB..BBBB...', '..BBBBB..BBBBB..',
  ];
  const BOBOMB = [
    '.......Y........', '.......W........', '......KK........', '....KKKKKK......', '...KKKKKKKK.GG..', '..KKHWKKWKKKG...',
    '..KKWWKKWWKKGG..', '..KKWWKKWWKKKG..', '..KKKKKKKKKKK...', '..KKKKKKKKKKK...', '...KKKKKKKKK....', '....KKKKKKK.....',
    '...OOO...OOO....', '..OOOO..OOOO....',
  ];
  const BLOOPER = [
    '......WW......', '.....WWWW.....', '....WWWWWW....', '...WWWWWWWW...', '...WKWWWWKW...', '...WKWWWWKW...',
    '..WWWWWWWWWW..', '..WWWWWWWWWW..', '..GGGGGGGGGG..', '..WW.WW.WW.WW.', '..W..W..W..W..', '.W..W..W..W...', '.W..W..W..W...',
  ];
  const HAMMER = [
    '.....GGGG.......', '....GGGGGG......', '...GGWGGGGG.....', '...SSSSSSG......', '..SSWKSSSS......', '..SSKKSSSS......',
    '..SSSSSSSS......', '...SSSSSS.......', '...GGGGGGG......', '..GGWWGGGGG.SS..', '.SGWGGGWGGGSS...', 'SSGWGGGGWGG.....',
    'SSGGWGGGWGG.....', '..GGGWWWGGG.....', '...WWWWWWW......', '...SSS.SSS......', '..OOOO.OOOO.....', '..OOOOO.OOOOO...',
  ];
  const SPINY = [
    '..W...W...W.....', '.WRW.WRW.WRW....', '.RRRRRRRRRRRW...', 'WRRWRRRRWRRRRW..', 'RRRRRRRRRRRRRR..', 'RRWRRRRWRRRRRRS.',
    'RRRRRRRRRRRRRSSS', 'RRRRRRRRRRRRSKSS', 'WWWWWWWWWWWWSSSS', '.WWWWWWWWWWW.SS.', '..OO....OO......', '.OOO...OOO......',
  ];
  const THWOMP = [
    '.K..K..K..K..K..K..K..K.', 'KGGGGGGGGGGGGGGGGGGGGGGK', '.GLLLLLLLLLLLLLLLLLLLLG.', 'KGLGGGGGGGGGGGGGGGGGGLGK',
    '.GLGKKGGGGGGGGGGGGKKGLG.', 'KGLGGKKKGGGGGGGGKKKGGLGK', '.GLGGGWWKGGGGGGKWWGGGLG.', 'KGLGGWWKKGGGGGGKKWWGGLGK',
    '.GLGGWWKKGGGGGGKKWWGGLG.', 'KGLGGGWWGGGGGGGGWWGGGLGK', '.GLGGGGGGGGGGGGGGGGGGLG.', 'KGLGGGGGGGGGGGGGGGGGGLGK',
    '.GLGGKKKKKKKKKKKKKKGGLG.', 'KGLGGKWKWKWKWKWKWKKGGLGK', '.GLGGKKWKWKWKWKWKWKGGLG.', 'KGLGGKKKKKKKKKKKKKKGGLGK',
    '.GLGGGGGGGGGGGGGGGGGGLG.', 'KGLLLLLLLLLLLLLLLLLLLLGK', '.GGGGGGGGGGGGGGGGGGGGGG.', '.K..K..K..K..K..K..K..K.',
  ];
  const PODOBOO = [
    '....YYYY....', '..YYOOOOYY..', '.YOORRRROOY.', '.YORRRRRROY.', 'YORRWKRWKROY', 'YORRWKRWKROY', 'YORRRRRRRROY',
    '.YORRRRRROY.', '.YOORRRROOY.', '..YYOOOOYY..', '...Y.YY.Y...', '..Y..YY..Y..', '.....Y......',
  ];
  const CHOMP_TOP = ['.....KKKKKK.....', '...KKKKKKKKKK...', '..KKHHKKKKKKKK..', '.KKHWWKKKKKKKKK.', '.KKWWKWKKKKKKKK.', 'KKKWKKWKKKKKKKKK', 'KKKKWWKKKKKKKKKK'];
  const CHOMP_BOT = ['.KKKKKKKKKKKKKK.', '..KKKKKKKKKKKK..', '...KKKKKKKKKK...', '.....KKKKKK.....'];
  const CHOMP_OPEN = CHOMP_TOP.concat(['.WKKKKKKKKKKKKKK', '..WWKKKKKKKKKKKK', '...RRWKKKKKKKKKK', '..RRRWKKKKKKKKKK', '.WWWWKKKKKKKKKK.'], CHOMP_BOT);
  const CHOMP_SHUT = CHOMP_TOP.concat(['KKKKKKKKKKKKKKKK', 'WWWWKKKKKKKKKKKK', 'KWKWKKKKKKKKKKKK', 'KKKKKKKKKKKKKKKK', '.KKKKKKKKKKKKKK.'], CHOMP_BOT);
  const LAKITU = [
    '.....SSSS.......', '....SSSSSS......', '...SWWKWWKS.....', '...SWWKWWKS.....', '...SSSSSSSS.....', '....SSSSSS......',
    '.....SSSS.......', '....GGGGGG......', '...GWGGGGWG.....', '..GWGGGGGGWG....', '..WWWWWWWWWW....', '...SS....SS.....',
    '....CCCCC.......', '..CCCCCCCCC.CC..', '.CCCCCCCCCCCCCC.', 'CCCKCCCCKCCCCCCC', 'CCCKCCCCKCCCCCCC', 'CCCCCCCCCCCCCCCC',
    '.CCCCCCCCCCCCCC.', '..BBBBBBBBBBBB..',
  ];
  const SPRING = [
    'RRRRRRRRRRRRRRRR', 'RWWWWWWWWWWWWWWR', 'RRRRRRRRRRRRRRRR', '....GG....GG....', '...GG....GG.....', '....GG....GG....',
    '.....GG....GG...', '....GG....GG....', '...GG....GG.....', '....GG....GG....', '.....GG....GG...', '....GG....GG....',
    'RRRRRRRRRRRRRRRR', 'RWWWWWWWWWWWWWWR', 'RRRRRRRRRRRRRRRR',
  ];
  const PSWITCH = [
    '....BBBBBBBB....', '...BLLLLLLLLB...', '..BLLBBBBBLLLB..', '..BLLBLLLLBLLB..', '..BLLBLLLLBLLB..', '..BLLBBBBBLLLB..',
    '..BLLBLLLLLLLB..', '..BLLBLLLLLLLB..', '..BBBBBBBBBBBB..', '.KKKKKKKKKKKKKK.', 'KGGGGGGGGGGGGGGK', 'KKKKKKKKKKKKKKKK',
  ];
  const SIGN = [
    'BBBBBBBBBBBB....', 'BOOOOOOOOOOOB...', 'BOOOOOOOWOOOOB..', 'BOOWWWWWWWOOOOB.', 'BOOOOOOOWOOOOB..', 'BOOOOOOOOOOOB...',
    'BBBBBBBBBBBB....', '.....BB.........', '.....BB.........', '.....BB.........', '.....BB.........', '....BBBB........',
  ];

  // ---------------- items ----------------
  const STAR = [
    '.......YY.......', '.......YY.......', '......YWYY......', '......YWYY......', '.....YYYYYY.....',
    'YYYYYYYYYYYYYYYY', '.YYYYYYYYYYYYYY.', '..YYYYEYYEYYYY..', '...YYYEYYEYYY...', '....YYYYYYYY....',
    '....YYYYYYYY....', '...YYYYYYYYYY...', '...YYYYYYYYYY...', '..YYYYY..YYYYY..', '..YYY......YYY..', '.YY..........YY.',
  ];
  // K outline, R cap, W spots, C stalk.
  const MUSHROOM = [
    '.....KKKKKK.....', '...KKRRRRRRKK...', '..KRRRWWWWRRRK..', '.KRRRWWWWWWRRRK.', '.KRRRWWWWWWRRRK.',
    'KRWWRRWWWWRRWWRK', 'KWWWWRRRRRRWWWWK', 'KWWWWRRRRRRWWWWK', 'KRWWRRRRRRRRWWRK', 'KRRRRRRRRRRRRRRK',
    '.KKKKKKKKKKKKKK.', '..KCCKCCCCKCCK..', '..KCCKCCCCKCCK..', '..KCCCCCCCCCCK..', '...KCCCCCCCCK...', '....KKKKKKKK....',
  ];
  const FLOWER = [
    '....KKKKKKKK....', '..KKOOOOOOOOKK..', '.KOOYYYYYYYYOOK.', 'KOOYYWWWWWWYYOOK',
    'KOOYYWWWWWWYYOOK', '.KOOYYYYYYYYOOK.', '..KKOOOOOOOOKK..', '....KKKKKKKK....',
    '.......GG.......', '.GGG...GG...GGG.', 'GGGGG..GG..GGGGG', 'GGGGGG.GG.GGGGGG',
    '.GGGGGGGGGGGGGG.', '..GGGGGGGGGGGG..', '....GGGGGGGG....', '......GGGG......',
  ];
  const COIN = [
    '...KKKK...', '..KYYYYK..', '.KYYWYYYK.', '.KYWYYYYK.', 'KYYWYYYOYK', 'KYYWYYYOYK',
    'KYYWYYYOYK', 'KYYWYYYOYK', 'KYYWYYYOYK', 'KYYWYYYOYK', '.KYWYYYOK.', '.KYYYYOOK.', '..KYYYYK..', '...KKKK...',
  ];
  const LEAF = [
    '.........KK.....', '.......KKOOK....', '.....KKOOOOK....', '....KOOOYOOK....', '...KOOOYOOOK....', '..KOOOYOOOOK....',
    '..KOOYOOOOK.....', '.KOOYOOOOOK.....', '.KOYOOOOOK......', '.KYOOOOKK.......', '.KYOOKK.........', 'KKKKK...........', 'K...............',
  ];
  const KEY = [
    '....KKKK........', '...KYYYYK.......', '..KYYKKYYK......', '..KYK..KYK......', '..KYYKKYYK......', '...KYYYYK.......',
    '....KYYK........', '....KYYK........', '....KYYKKK......', '....KYYYYK......', '....KYYKKK......', '....KYYKK.......',
    '....KYYYYK......', '....KKKKKK......',
  ];
  const PMOON = [
    '.....YYYYYY.....', '...YYYYYYYYYY...', '..YYYOOOOOOYYY..', '.YYOOOYYYYYOOYY.', '.YYOOYYYYYYYOYY.', 'YYOOYYYYKYYYYOYY',
    'YYOYYYYYKYYYYOYY', 'YYOYYYYYYYYYYOYY', 'YYOYYYYYYYYYOOYY', 'YYOOYYYYYYYOOYY.', '.YYOOYYYYYOOYYY.', '.YYYOOOOOOOYYY..',
    '..YYYYYYYYYYY...', '...YYYYYYYYY....', '.....YYYYY......',
  ];
  const NOTE = [
    'KKKKKKKKKKKKKKKK', 'KWWWWWWWWWWWWWWK', 'KWWWWWWKKKKWWWWK', 'KWWWWWWKWWKKWWWK', 'KWWWWWWKWWWKKWWK', 'KWWWWWWKWWWWWWWK',
    'KWWWWWWKWWWWWWWK', 'KWWWWWWKWWWWWWWK', 'KWWWKKKKWWWWWWWK', 'KWWKKKKKWWWWWWWK', 'KWWKKKKKWWWWWWWK', 'KWWWKKKWWWWWWWWK',
    'KWWWWWWWWWWWWWWK', 'KWWWWWWWWWWWWWWK', 'KWWWWWWWWWWWWWWK', 'KKKKKKKKKKKKKKKK',
  ];
  const SNOWMAN = [
    '.....KKKKK......', '.....KKKKK......', '....KKKKKKK.....', '....WWWWWWW.....', '...WWKWWWKWW....', '...WWWWOOWWW....',
    '...WWWWWWWWW....', '....WWWWWWW.....', '...RRRRRRRRR....', '..WWWWRRWWWWW...', '.WWWWWWWWWWWWW..', 'WWWWWWKWWWWWWWW.',
    'WWWWWWWWWWWWWWW.', 'WWWWWWKWWWWWWWW.', 'WWWWWWWWWWWWWWW.', '.WWWWWWWWWWWWW..', '..WWWWWWWWWWW...',
  ];
  const CACTUS = [
    '......GGGG......', '.....GGLGGG.....', '.....GLGGGG.....', '.....GLGGGG.....', '.GG..GLGGGG.....', 'GGLG.GLGGGG..GG.',
    'GLGG.GLGGGG.GGLG', 'GLGG.GLGGGG.GLGG', 'GLGGGGLGGGG.GLGG', 'GLGGGGLGGGGGGLGG', '.GGGGGLGGGGGGGG.', '.....GLGGGG.....',
    '.....GLGGGG.....', '.....GLGGGG.....', '.....GLGGGG.....', '.....GLGGGG.....', '....DDDDDDDD....', '....DDDDDDDD....',
  ];
  // ---------------- tiles (16x16) ----------------
  const QGLYPH = ['.XXXX.', 'XX..XX', 'XX..XX', '...XX.', '..XX..', '..XX..', '......', '..XX..', '..XX..'];
  function bevel(x, fill, edge) {
    x.fillStyle = edge; x.fillRect(0, 0, 16, 16);
    x.fillStyle = fill; x.fillRect(1, 1, 14, 14);
    x.fillStyle = tint(fill, 0.45); x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14);
    x.fillStyle = tint(fill, -0.25); x.fillRect(1, 14, 14, 1); x.fillRect(14, 1, 1, 14);
  }
  function qBlock(fill) {
    const c = makeCanvas(16, 16), x = c.getContext('2d'), edge = '#7a3a08';
    bevel(x, fill, edge);
    x.fillStyle = edge; [[3, 3], [12, 3], [3, 12], [12, 12]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
    const each = fn => QGLYPH.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') fn(5 + i, 3 + j); }));
    x.fillStyle = 'rgba(0,0,0,0.4)'; each((a, b) => x.fillRect(a + 1, b + 1, 1, 1));
    x.fillStyle = edge; each((a, b) => x.fillRect(a, b, 1, 1));
    return c;
  }
  function usedBlock(col, hi) {
    const c = makeCanvas(16, 16), x = c.getContext('2d'), dk = tint(col, -0.5);
    x.fillStyle = dk; x.fillRect(0, 0, 16, 16); x.fillStyle = col; x.fillRect(1, 1, 14, 14);
    x.fillStyle = hi; x.fillRect(1, 1, 13, 1); x.fillRect(1, 1, 1, 13);
    x.fillStyle = dk; [[3, 3], [11, 3], [3, 11], [11, 11]].forEach(([a, b]) => x.fillRect(a, b, 2, 2));
    return c;
  }
  // Running-bond bricks: each brick gets a lit top edge and a shaded right edge.
  function brick(base, hi) {
    const c = makeCanvas(16, 16), x = c.getContext('2d'), sh = tint(base, -0.3);
    x.fillStyle = '#140a06'; x.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const y = row * 4, off = row % 2 ? 4 : 0;
      for (let bx = -8; bx < 16; bx += 8) {
        const x0 = bx + off;
        x.fillStyle = base; x.fillRect(x0, y, 7, 3);
        x.fillStyle = hi; x.fillRect(x0, y, 7, 1);
        x.fillStyle = sh; x.fillRect(x0 + 6, y + 1, 1, 2);
      }
    }
    return c;
  }
  // Cracked stone ground block.
  function ground(base, hi) {
    const c = makeCanvas(16, 16), x = c.getContext('2d'), dk = tint(base, -0.45);
    x.fillStyle = dk; x.fillRect(0, 0, 16, 16); x.fillStyle = base; x.fillRect(1, 1, 14, 14);
    x.fillStyle = hi; x.fillRect(1, 1, 14, 1); x.fillRect(1, 1, 1, 14); x.fillRect(4, 4, 2, 1);
    x.fillStyle = dk; x.fillRect(2, 14, 13, 1); x.fillRect(14, 2, 1, 13);
    x.fillRect(6, 6, 1, 3); x.fillRect(7, 9, 3, 1); x.fillRect(10, 10, 1, 2); x.fillRect(3, 10, 2, 1);
    return c;
  }

  // World themes cycle while playing (overworld → underground → castle → forest).
  const THEMES = [
    { name: 'overworld', b: [PAL.brick, PAL.brickHi], s: ['#a0400c', '#fc9838'], neon: '#ff4d3a', neon2: '#ffd23a' },
    { name: 'underground', b: [PAL.ugBlue, PAL.ugLight], s: ['#0038a8', '#3cbcfc'], neon: '#3cbcfc', neon2: '#a07cff' },
    { name: 'castle', b: [PAL.dgray, PAL.gray], s: ['#5c5c5c', '#bcbcbc'], neon: '#f8b800', neon2: '#ff5a2a' },
    { name: 'forest', b: ['#00a844', '#b8f818'], s: ['#005800', '#80d010'], neon: '#80ff40', neon2: '#3cfcd8' },
  ];
  function iceTile() {
    const c = makeCanvas(16, 16), x = c.getContext('2d');
    x.fillStyle = '#3cbcfc'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#a8e4fc'; x.fillRect(1, 1, 14, 14);
    x.fillStyle = '#d8f4ff'; x.fillRect(1, 1, 14, 2); x.fillRect(1, 1, 2, 14);
    x.fillStyle = PAL.white; for (let k = 0; k < 5; k++) x.fillRect(4 + k, 9 - k, 1, 1); x.fillRect(11, 4, 1, 1);
    x.fillStyle = '#5cc8fc'; x.fillRect(15, 0, 1, 16); x.fillRect(0, 15, 16, 1);
    return c;
  }
  function goldTile(hi) {
    const c = makeCanvas(16, 16), x = c.getContext('2d');
    x.fillStyle = '#883000'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#f8b800'; x.fillRect(0, 0, 15, 15);
    x.fillStyle = hi ? PAL.white : '#fce0a8'; x.fillRect(0, 0, 15, 1); x.fillRect(0, 0, 1, 15); x.fillRect(3, 3, 3, 1); x.fillRect(3, 3, 1, 3);
    x.fillStyle = '#c87800'; x.fillRect(4, 11, 8, 1); x.fillRect(11, 4, 1, 8);
    return c;
  }
  const tiles = {
    ice: iceTile(), gold: [goldTile(false), goldTile(true)], castle: brick('#7c7c7c', '#c8c8c8'),
    q: [qBlock(PAL.orange), qBlock(PAL.gold), qBlock('#fcd8a8')],
    used: usedBlock(PAL.brown, PAL.orange),
    brick: THEMES.map(t => brick(t.b[0], t.b[1])),
    ground: THEMES.map(t => ground(t.b[0], t.b[1])),
    stone: THEMES.map(t => usedBlock(t.s[0], t.s[1])),
  };

  // ---------------- procedural pixel helpers ----------------
  function disk(x, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      x.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
    }
  }
  // Puffy shape (cloud / bush): outline pass then fill pass.
  function puffs(x, w, h, col, line, shade, eyes) {
    const r = Math.max(3, Math.min(Math.floor(h * 0.42), 12));
    const n = Math.max(1, Math.round((w - 2 * r) / (r * 1.2)));
    const cs = [];
    for (let i = 0; i <= n; i++) cs.push([Math.round(r + 1 + (w - 2 * r - 2) * (n ? i / n : 0.5)), r + 1 + ((i % 2) ? 1 : 0)]);
    const pass = (col2, grow) => {
      x.fillStyle = col2;
      cs.forEach(([cx, cy]) => disk(x, cx, cy, r + grow));
      x.fillRect(1 - grow, r + 1, w - 2 + 2 * grow, h - r - 2 + grow);
    };
    pass(line, 1); pass(col, 0);
    if (shade) { x.fillStyle = shade; x.fillRect(2, h - 4, w - 4, 2); }
    if (eyes && w >= 14) {
      x.fillStyle = PAL.black;
      const ex = Math.round(w / 2), ey = Math.max(3, Math.round(r * 0.9));
      x.fillRect(ex - 3, ey, 1, 3); x.fillRect(ex + 2, ey, 1, 3);
    }
  }
  function pipeInto(x, ox, oy, w, h) {
    const lip = Math.max(3, Math.min(8, Math.floor(h * 0.3)));
    const stripes = (x0, y0, ww, hh) => {
      x.fillStyle = '#00a800'; x.fillRect(x0, y0, ww, hh);
      x.fillStyle = '#b8f818'; x.fillRect(x0 + Math.max(1, Math.round(ww * 0.12)), y0, Math.max(1, Math.round(ww * 0.1)), hh);
      x.fillStyle = '#80d010'; x.fillRect(x0 + Math.max(2, Math.round(ww * 0.26)), y0, Math.max(1, Math.round(ww * 0.14)), hh);
      x.fillStyle = '#005800'; x.fillRect(x0 + Math.round(ww * 0.72), y0, Math.max(1, Math.round(ww * 0.08)), hh);
      x.fillRect(x0 + Math.round(ww * 0.86), y0, Math.max(1, Math.round(ww * 0.06)), hh);
    };
    const inset = Math.max(1, Math.round(w * 0.07));
    x.fillStyle = PAL.black; x.fillRect(ox + inset, oy + lip, w - inset * 2, h - lip);
    stripes(ox + inset + 1, oy + lip, w - inset * 2 - 2, h - lip);
    x.fillStyle = PAL.black; x.fillRect(ox, oy, w, lip);
    stripes(ox + 1, oy + 1, w - 2, lip - 2);
  }
  function art(w, h, fn) { const c = makeCanvas(w, h); fn(c.getContext('2d'), w, h); return c; }

  const pipeArt = art(32, 32, (x) => pipeInto(x, 0, 0, 32, 32));
  const cloudArt = art(36, 24, (x, w, h) => puffs(x, w, h, PAL.white, PAL.ugLight, '#a8e4fc', true));
  const bushArt = art(36, 18, (x, w, h) => puffs(x, w, h, PAL.lgreen, PAL.dgreen, PAL.green, true));
  const hillArt = art(48, 28, (x, w, h) => {
    const rowHalf = y => (w / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((h - y) / h, 2)));
    for (let y = 0; y < h; y++) {
      const hw = Math.round(rowHalf(y + 0.5));
      x.fillStyle = PAL.dgreen; x.fillRect(Math.round(w / 2 - hw), y, hw * 2, 1);
      x.fillStyle = PAL.green; x.fillRect(Math.round(w / 2 - hw) + 1, y + 1, Math.max(0, hw * 2 - 2), 1);
    }
    x.fillStyle = PAL.dgreen;
    [[18, 12], [28, 16], [22, 20]].forEach(([a, b]) => { x.fillRect(a, b, 2, 4); x.fillRect(a - 1, b + 1, 4, 2); });
  });
  const flagPole = art(20, 88, (x) => {
    x.fillStyle = PAL.dgreen; disk(x, 10, 4, 4); x.fillStyle = PAL.lgreen; disk(x, 10, 4, 3);
    x.fillStyle = '#e8f8d0'; x.fillRect(9, 8, 2, 72);
    x.fillStyle = PAL.lgreen; x.fillRect(11, 8, 1, 72);
    x.drawImage(usedBlock(PAL.brown, PAL.orange), 2, 80, 16, 8);
  });
  const flagCloth = fromMap([
    '.........WW', '.......WWWW', '.....WWWWWW', '...WWGGWWWW', '.WWWGGGGWWW',
    'WWWWGGGGWWW', '.WWWWGGWWWW', '...WWWWWWWW', '.....WWWWWW', '.......WWWW', '.........WW',
  ], { W: PAL.white, G: PAL.green });
  const castleArt = art(64, 56, (x) => {
    const bricks = (x0, y0, w, h) => {
      x.fillStyle = PAL.brick; x.fillRect(x0, y0, w, h);
      x.fillStyle = PAL.black;
      for (let y = y0 + 3; y < y0 + h; y += 4) x.fillRect(x0, y, w, 1);
      for (let r = 0, y = y0; y < y0 + h; y += 4, r++) for (let xx = x0 + (r % 2 ? 4 : 0); xx < x0 + w; xx += 8) x.fillRect(xx, y, 1, 3);
    };
    bricks(0, 24, 64, 32); bricks(16, 8, 32, 16);
    for (let i = 0; i < 8; i += 2) bricks(i * 8, 16, 8, 8);
    for (let i = 0; i < 4; i += 2) bricks(16 + i * 8, 0, 8, 8);
    bricks(40, 0, 8, 8);
    x.fillStyle = PAL.black;
    x.fillRect(26, 44, 12, 12); disk(x, 31, 44, 6); x.fillRect(25, 44, 14, 12);
    x.fillRect(22, 12, 4, 8); x.fillRect(38, 12, 4, 8);
  });

  const palmArt = art(36, 56, (x) => {
    for (let k = 0; k < 9; k++) { const cx = 14 + Math.round(Math.sin(k / 9 * 1.6) * 6), cy = 52 - k * 5; x.fillStyle = '#6b3410'; x.fillRect(cx - 3, cy - 5, 7, 6); x.fillStyle = '#c87840'; x.fillRect(cx - 2, cy - 4, 5, 3); }
    const fr = (dx, dy) => { for (let k = 0; k < 9; k++) { const px = 20 + dx * k, py = 10 + dy * k + (k * k) / 6; x.fillStyle = PAL.dgreen; x.fillRect(px - 1, py - 1, 4, 4); x.fillStyle = PAL.green; x.fillRect(px, py, 3, 2); } };
    fr(1.6, -0.4); fr(-1.6, -0.4); fr(1.1, 0.3); fr(-1.1, 0.3); fr(0.4, -0.9);
    x.fillStyle = '#883000'; disk(x, 18, 13, 2); disk(x, 22, 14, 2);
  });
  const doorArt = art(18, 32, (x) => {
    x.fillStyle = '#5c2c08'; x.fillRect(0, 4, 18, 28); disk(x, 9, 9, 9); x.fillRect(0, 9, 18, 23);
    x.fillStyle = '#c84c0c'; x.fillRect(2, 8, 14, 24); disk(x, 9, 9, 7);
    x.fillStyle = '#883000'; x.fillRect(8, 4, 2, 28); x.fillRect(2, 16, 14, 1); x.fillRect(2, 24, 14, 1);
    x.fillStyle = PAL.gold; x.fillRect(12, 19, 2, 2);
  });
  const checkArt = art(14, 40, (x) => {
    x.fillStyle = '#7c7c7c'; x.fillRect(2, 2, 2, 36); x.fillStyle = PAL.white; x.fillRect(2, 2, 1, 36);
    x.fillStyle = '#5c5c5c'; x.fillRect(0, 36, 6, 4);
    x.fillStyle = PAL.dgray; x.fillRect(4, 3, 9, 7); x.fillStyle = PAL.gray; x.fillRect(4, 3, 9, 1);
  });
  const starsArt = art(48, 24, (x) => {
    [[4, 4], [14, 10], [24, 3], [33, 13], [42, 6], [8, 18], [28, 20], [44, 19], [19, 15]].forEach(([a, b], i) => {
      x.fillStyle = i % 3 ? PAL.white : PAL.gold; x.fillRect(a, b, 1, 1); x.fillRect(a - 1, b, 3, 1); x.fillRect(a, b - 1, 1, 3); if (i % 2 === 0) { x.fillRect(a - 2, b, 5, 1); x.fillRect(a, b - 2, 1, 5); }
    });
  });
  const nightMoonArt = art(24, 24, (x) => {
    x.fillStyle = '#fce8a0'; disk(x, 12, 12, 10); x.globalCompositeOperation = 'destination-out'; disk(x, 17, 9, 9); x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#e8c860'; x.fillRect(5, 13, 2, 2); x.fillRect(8, 18, 2, 1);
  });
  const lampArt = art(12, 44, (x) => {
    x.fillStyle = '#3c3c4c'; x.fillRect(5, 10, 2, 32); x.fillRect(3, 40, 6, 4);
    x.fillStyle = '#5c5c6c'; x.fillRect(2, 2, 8, 2); x.fillRect(3, 9, 6, 2);
    x.fillStyle = '#fce8a0'; x.fillRect(3, 4, 6, 5); x.fillStyle = PAL.white; x.fillRect(4, 5, 2, 2);
  });
  const treeArt = art(32, 48, (x) => {
    x.fillStyle = '#3c1800'; x.fillRect(12, 28, 8, 20); x.fillStyle = '#883000'; x.fillRect(13, 28, 6, 20); x.fillStyle = '#c84c0c'; x.fillRect(14, 30, 2, 18);
    const blob = (col, g) => { x.fillStyle = col; disk(x, 16, 13, 12 + g); disk(x, 8, 22, 8 + g); disk(x, 24, 22, 8 + g); disk(x, 16, 24, 8 + g); };
    blob(PAL.dgreen, 1); blob(PAL.green, 0);
    x.fillStyle = PAL.lgreen; disk(x, 12, 9, 3); disk(x, 6, 19, 2); disk(x, 21, 17, 2);
  });
  const fenceArt = art(32, 16, (x) => {
    for (let i = 0; i < 4; i++) { const px = 2 + i * 8; x.fillStyle = '#7c7c7c'; x.fillRect(px, 3, 5, 13); x.fillStyle = PAL.white; x.fillRect(px, 3, 4, 13); x.fillRect(px + 1, 1, 2, 2); }
    x.fillStyle = '#7c7c7c'; x.fillRect(0, 6, 32, 3); x.fillRect(0, 11, 32, 3); x.fillStyle = PAL.white; x.fillRect(0, 6, 32, 2); x.fillRect(0, 11, 32, 2);
  });
  const firebarArt = art(40, 40, (x) => {
    for (let k = 1; k <= 4; k++) { const cx = 20 + k * 4, cy = 20 - k * 4; x.fillStyle = PAL.red; disk(x, cx, cy, 3); x.fillStyle = PAL.orange; disk(x, cx, cy, 2); x.fillStyle = PAL.gold; x.fillRect(cx - 1, cy - 1, 2, 2); }
    x.drawImage(usedBlock(PAL.brown, PAL.orange), 13, 13, 14, 14);
  });

  // ---------------- sprites ----------------
  const goombaPal = { N: '#b45a26', K: '#1e0e06', W: PAL.white, E: PAL.black, T: PAL.white, F: '#f2c48e' };
  const koopaPal = { S: '#f8d878', W: PAL.white, K: PAL.black, G: PAL.green, O: PAL.orange };
  const sprites = {
    hero: {}, toad: fromMap(TOAD, { W: PAL.white, R: PAL.red, S: PAL.skin, K: PAL.black, B: PAL.blue, O: PAL.brown }),
    peach: fromMap(PEACH, { Y: PAL.gold, H: '#f8d038', S: '#fcc8a0', K: PAL.black, R: PAL.red, P: PAL.pink, B: '#3cbcfc', D: '#b8288c' }),
    yoshi: fromMap(YOSHI, { G: '#3cd800', W: PAL.white, K: PAL.black, R: PAL.red, O: PAL.orange }),
    yoshiRed: fromMap(YOSHI, { G: '#f03c28', W: PAL.white, K: PAL.black, R: '#3cd800', O: PAL.orange }),
    yoshiBlue: fromMap(YOSHI, { G: '#3c84f8', W: PAL.white, K: PAL.black, R: PAL.red, O: PAL.orange }),
    daisy: fromMap(PEACH, { Y: PAL.gold, H: '#c8641c', S: '#fcc8a0', K: PAL.black, R: PAL.red, P: '#fcb000', B: '#3cd800', D: '#e06000' }),
    rosalina: fromMap(PEACH, { Y: '#e8f0ff', H: '#f4ecd0', S: '#fcd8b8', K: PAL.black, R: '#e85080', P: '#7ad4fc', B: PAL.gold, D: '#3c8ce0' }),
    toadette: fromMap(TOAD, { W: '#f878b8', R: PAL.white, S: PAL.skin, K: PAL.black, B: '#f878b8', O: '#883000' }),
    captain: fromMap(CAPTAIN, { W: PAL.white, R: PAL.red, L: PAL.gold, S: PAL.skin, K: PAL.black, B: '#2038ec', O: '#883000' }),
    buzzy: fromMap(BUZZY, { K: '#1c2448', B: '#3c58b8', L: '#8cb4f8', S: '#fcc848', O: PAL.orange }),
    buzzyShell: fromMap(SHELL, { G: '#3c58b8', W: '#8cb4f8', S: '#1c2448' }),
    shyguy: fromMap(SHYGUY, { R: PAL.red, W: PAL.white, K: PAL.black, B: '#2038ec' }),
    bobomb: fromMap(BOBOMB, { K: '#2c2c3c', H: '#7c7c9c', W: PAL.white, G: PAL.gold, Y: PAL.gold, O: PAL.orange }),
    bobombLit: fromMap(BOBOMB, { K: '#d82800', H: '#fc9838', W: PAL.white, G: PAL.gold, Y: PAL.white, O: PAL.orange }),
    blooper: fromMap(BLOOPER, { W: PAL.white, K: PAL.black, G: PAL.gray }),
    hammer: fromMap(HAMMER, { G: PAL.green, W: PAL.white, S: '#f8d878', K: PAL.black, O: PAL.orange }),
    drybones: [fromMap(KOOPA1, { S: '#e8e8e8', W: PAL.white, K: PAL.black, G: '#9c9c9c', O: '#bcbcbc' }), fromMap(KOOPA2, { S: '#e8e8e8', W: PAL.white, K: PAL.black, G: '#9c9c9c', O: '#bcbcbc' })],
    dk: fromMap(DK, { B: '#6b3410', S: '#f8b878', W: PAL.white, K: PAL.black, R: PAL.red, Y: PAL.gold }),
    goomba: [fromMap(GOOMBA, goombaPal), fromMap(GOOMBA, goombaPal, true)],
    koopa: [fromMap(KOOPA1, koopaPal), fromMap(KOOPA2, koopaPal)], shell: fromMap(SHELL, koopaPal),
    boo: fromMap(BOO, { K: '#3c3c5c', W: PAL.white, R: PAL.red }),
    piranha: [fromMap(PIRANHA_OPEN, { R: PAL.red, W: PAL.white, G: PAL.green, L: PAL.lgreen }), fromMap(PIRANHA_SHUT, { R: PAL.red, W: PAL.white, G: PAL.green, L: PAL.lgreen })],
    bowser: fromMap(BOWSER, { W: PAL.white, R: '#e03a1e', G: '#48b020', E: PAL.black, N: '#1c4c10', Y: '#fde3a4', S: '#0f6a2a', K: '#3a2a10' }),
    bowserHit: fromMap(BOWSER, { W: '#e03a1e', R: PAL.white, G: PAL.white, E: '#e03a1e', N: PAL.white, Y: PAL.white, S: PAL.white, K: PAL.white }),
    bullet: fromMap(BULLET, { K: '#383848', W: PAL.white, G: PAL.gray }),
    cheep: fromMap(FISH, { R: PAL.red, W: PAL.white, E: PAL.black }),
    star: [fromMap(STAR, { Y: PAL.gold, W: PAL.white, E: PAL.black }), fromMap(STAR, { Y: PAL.white, W: PAL.gold, E: PAL.black }), fromMap(STAR, { Y: PAL.orange, W: PAL.white, E: PAL.black })],
    mushroom: fromMap(MUSHROOM, { K: PAL.black, R: PAL.red, W: PAL.white, C: '#fde3a4' }),
    oneup: fromMap(MUSHROOM, { K: PAL.black, R: PAL.green, W: PAL.white, C: '#fde3a4' }),
    flower: [fromMap(FLOWER, { K: PAL.red, O: PAL.orange, Y: PAL.yellow, W: PAL.white, G: PAL.green }),
      fromMap(FLOWER, { K: PAL.gold, O: PAL.red, Y: PAL.orange, W: PAL.yellow, G: PAL.green })],
    coin: fromMap(COIN, { K: '#883000', Y: PAL.gold, W: PAL.white, O: PAL.orange }),
    spiny: fromMap(SPINY, { W: PAL.white, R: PAL.red, S: '#fcc848', K: PAL.black, O: PAL.orange }),
    thwomp: fromMap(THWOMP, { K: '#2c2c3c', G: '#8c8ca4', L: '#d4d4e4', W: PAL.white }),
    podoboo: fromMap(PODOBOO, { Y: PAL.gold, O: PAL.orange, R: PAL.red, W: PAL.white, K: PAL.black }),
    chomp: [fromMap(CHOMP_OPEN, { K: '#24243a', H: '#6c6c90', W: PAL.white, R: PAL.red }), fromMap(CHOMP_SHUT, { K: '#24243a', H: '#6c6c90', W: PAL.white, R: PAL.red })],
    lakitu: fromMap(LAKITU, { S: '#f8d878', W: PAL.white, K: PAL.black, G: PAL.green, C: PAL.white, B: '#a8e4fc' }),
    spring: fromMap(SPRING, { R: PAL.red, W: PAL.white, G: PAL.gray }),
    pswitch: fromMap(PSWITCH, { B: PAL.blue, L: '#5c94fc', K: '#3c3c4c', G: PAL.gray }),
    sign: fromMap(SIGN, { B: '#6b3a10', O: '#e0a060', W: PAL.white }),
    tree: treeArt, fence: fenceArt, firebar: firebarArt,
    leaf: fromMap(LEAF, { K: '#883000', O: PAL.orange, Y: PAL.gold }),
    iceflower: [fromMap(FLOWER, { K: '#3cbcfc', O: '#a8e4fc', Y: PAL.white, W: '#3cbcfc', G: PAL.green }), fromMap(FLOWER, { K: PAL.white, O: '#3cbcfc', Y: '#a8e4fc', W: PAL.white, G: PAL.green })],
    redcoin: fromMap(COIN, { K: '#580000', Y: '#e83020', W: '#fcbcb0', O: '#a01000' }),
    key: fromMap(KEY, { K: '#883000', Y: PAL.gold }),
    pmoon: fromMap(PMOON, { Y: PAL.gold, O: '#fce0a8', K: PAL.black }),
    mega: fromMap(MUSHROOM, { K: PAL.black, R: '#f87800', W: PAL.gold, C: '#fde3a4' }),
    note: fromMap(NOTE, { K: '#3c3c4c', W: PAL.white }),
    snowman: fromMap(SNOWMAN, { K: '#2c2c3c', W: PAL.white, O: PAL.orange, R: PAL.red }),
    cactus: fromMap(CACTUS, { G: PAL.green, L: PAL.lgreen, D: '#c84c0c' }),
    palm: palmArt, door: doorArt, checkpoint: checkArt, stars: starsArt, nightmoon: nightMoonArt, lamp: lampArt,
    qblock: tiles.q, used: tiles.used, brick: tiles.brick[0],
    pipe: pipeArt, cloud: cloudArt, bush: bushArt, hill: hillArt, flag: flagPole, flagCloth, castle: castleArt,
  };
  for (const k in HERO_PAL) sprites.hero[k] = heroFrames(HERO_PAL[k]);

  // Element catalogue. face: which way the sprite looks by default (+1 right, -1 left).
  const ELEMENTS = [
    { type: 'mario', cat: 'heroes', name: 'Mario', img: sprites.hero.mario.stand, face: 1 },
    { type: 'luigi', cat: 'heroes', name: 'Luigi', img: sprites.hero.luigi.stand, face: 1 },
    { type: 'toad', cat: 'heroes', name: 'Toad', img: sprites.toad, face: 1 },
    { type: 'peach', cat: 'heroes', name: 'Peach', img: sprites.peach, face: 1 },
    { type: 'yoshi', cat: 'heroes', name: 'Yoshi', img: sprites.yoshi, face: 1 },
    { type: 'daisy', cat: 'heroes', name: 'Daisy', img: sprites.daisy, face: 1 },
    { type: 'rosalina', cat: 'heroes', name: 'Rosalina', img: sprites.rosalina, face: 1 },
    { type: 'toadette', cat: 'heroes', name: 'Toadette', img: sprites.toadette, face: 1 },
    { type: 'captain', cat: 'heroes', name: 'Captain Toad', img: sprites.captain, face: 1 },
    { type: 'dk', cat: 'heroes', name: 'Donkey Kong', img: sprites.dk, face: 1 },
    { type: 'yoshiRed', cat: 'heroes', name: 'Red Yoshi', img: sprites.yoshiRed, face: 1 },
    { type: 'yoshiBlue', cat: 'heroes', name: 'Blue Yoshi', img: sprites.yoshiBlue, face: 1 },
    { type: 'wario', cat: 'heroes', name: 'Wario', img: sprites.hero.wario.stand, face: 1 },
    { type: 'waluigi', cat: 'heroes', name: 'Waluigi', img: sprites.hero.waluigi.stand, face: 1 },
    { type: 'goomba', cat: 'enemies', name: 'Goomba', img: sprites.goomba[0], face: -1 },
    { type: 'koopa', cat: 'enemies', name: 'Koopa', img: sprites.koopa[0], face: -1 },
    { type: 'piranha', cat: 'enemies', name: 'Piranha', img: sprites.piranha[0], face: 1 },
    { type: 'boo', cat: 'enemies', name: 'Boo', img: sprites.boo, face: -1 },
    { type: 'bowser', cat: 'enemies', name: 'Bowser', img: sprites.bowser, face: -1 },
    { type: 'bullet', cat: 'enemies', name: 'Bullet', img: sprites.bullet, face: -1 },
    { type: 'cheep', cat: 'enemies', name: 'Cheep', img: sprites.cheep, face: -1 },
    { type: 'hammer', cat: 'enemies', name: 'Hammer Bro', img: sprites.hammer, face: -1 },
    { type: 'buzzy', cat: 'enemies', name: 'Buzzy', img: sprites.buzzy, face: 1 },
    { type: 'shyguy', cat: 'enemies', name: 'Shy Guy', img: sprites.shyguy, face: 1 },
    { type: 'bobomb', cat: 'enemies', name: 'Bob-omb', img: sprites.bobomb, face: -1 },
    { type: 'blooper', cat: 'enemies', name: 'Blooper', img: sprites.blooper, face: 1 },
    { type: 'drybones', cat: 'enemies', name: 'Dry Bones', img: sprites.drybones[0], face: -1 },
    { type: 'thwomp', cat: 'enemies', name: 'Thwomp', img: sprites.thwomp, face: 1 },
    { type: 'podoboo', cat: 'enemies', name: 'Podoboo', img: sprites.podoboo, face: 1 },
    { type: 'spiny', cat: 'enemies', name: 'Spiny', img: sprites.spiny, face: 1 },
    { type: 'chomp', cat: 'enemies', name: 'Chomp', img: sprites.chomp[0], face: -1 },
    { type: 'lakitu', cat: 'enemies', name: 'Lakitu', img: sprites.lakitu, face: 1 },
    { type: 'firebar', cat: 'enemies', name: 'Fire Bar', img: firebarArt, face: 1 },
    { type: 'qblock', cat: 'items', name: '? Block', img: tiles.q[0], face: 1 },
    { type: 'brick', cat: 'items', name: 'Brick', img: tiles.brick[0], face: 1 },
    { type: 'coin', cat: 'items', name: 'Coin', img: sprites.coin, face: 1 },
    { type: 'mushroom', cat: 'items', name: 'Mushroom', img: sprites.mushroom, face: 1 },
    { type: 'oneup', cat: 'items', name: '1-Up', img: sprites.oneup, face: 1 },
    { type: 'star', cat: 'items', name: 'Star', img: sprites.star[0], face: 1 },
    { type: 'flower', cat: 'items', name: 'Fire Flower', img: sprites.flower[0], face: 1 },
    { type: 'leaf', cat: 'items', name: 'Super Leaf', img: sprites.leaf, face: 1 },
    { type: 'iceflower', cat: 'items', name: 'Ice Flower', img: sprites.iceflower[0], face: 1 },
    { type: 'mega', cat: 'items', name: 'Mega Mushroom', img: sprites.mega, face: 1 },
    { type: 'redcoin', cat: 'items', name: 'Red Coin', img: sprites.redcoin, face: 1 },
    { type: 'key', cat: 'items', name: 'Key', img: sprites.key, face: 1 },
    { type: 'pmoon', cat: 'items', name: 'Power Moon', img: sprites.pmoon, face: 1 },
    { type: 'note', cat: 'items', name: 'Note Block', img: sprites.note, face: 1 },
    { type: 'used', cat: 'items', name: 'Empty Block', img: tiles.used, face: 1 },
    { type: 'spring', cat: 'items', name: 'Spring', img: sprites.spring, face: 1 },
    { type: 'pswitch', cat: 'items', name: 'P-Switch', img: sprites.pswitch, face: 1 },
    { type: 'pipe', cat: 'world', name: 'Pipe', img: pipeArt, face: 1 },
    { type: 'cloud', cat: 'world', name: 'Cloud', img: cloudArt, face: 1 },
    { type: 'bush', cat: 'world', name: 'Bush', img: bushArt, face: 1 },
    { type: 'hill', cat: 'world', name: 'Hill', img: hillArt, face: 1 },
    { type: 'flag', cat: 'world', name: 'Flag', img: flagPole, face: 1 },
    { type: 'castle', cat: 'world', name: 'Castle', img: castleArt, face: 1 },
    { type: 'tree', cat: 'world', name: 'Tree', img: treeArt, face: 1 },
    { type: 'fence', cat: 'world', name: 'Fence', img: fenceArt, face: 1 },
    { type: 'sign', cat: 'world', name: 'Sign', img: sprites.sign, face: 1 },
    { type: 'palm', cat: 'world', name: 'Palm Tree', img: palmArt, face: 1 },
    { type: 'cactus', cat: 'world', name: 'Cactus', img: sprites.cactus, face: 1 },
    { type: 'snowman', cat: 'world', name: 'Snowman', img: sprites.snowman, face: 1 },
    { type: 'door', cat: 'world', name: 'Door', img: doorArt, face: 1 },
    { type: 'checkpoint', cat: 'world', name: 'Checkpoint', img: checkArt, face: 1 },
    { type: 'lamp', cat: 'world', name: 'Lamp Post', img: lampArt, face: 1 },
    { type: 'stars', cat: 'world', name: 'Night Stars', img: starsArt, face: 1 },
    { type: 'nightmoon', cat: 'world', name: 'Moon', img: nightMoonArt, face: 1 },
  ];
  const BY_TYPE = {}; ELEMENTS.forEach(e => { BY_TYPE[e.type] = e; e.w = e.img.width; e.h = e.img.height; });
  const CAT_ORDER = { world: 0, items: 1, enemies: 2, heroes: 3 };

  const SKINS = [
    { id: 'blank', name: 'Blank', tip: 'Blank|An invisible platform. Nothing lights up on the wall, but characters can still stand and walk on it. Great for real shelves and ledges.' },
    { id: 'brick', name: 'Brick', tip: 'Brick|Classic brick blocks. Their colour changes with the world theme while playing.' },
    { id: 'q', name: '? Blocks', tip: '? Blocks|Shimmering question blocks. Now and then one bumps and pops a coin.' },
    { id: 'ground', name: 'Ground', tip: 'Ground|Solid ground tiles. Perfect for the floor line or a long shelf.' },
    { id: 'stone', name: 'Stone', tip: 'Stone|Hard riveted blocks, recoloured for each world theme.' },
    { id: 'pipe', name: 'Pipe', tip: 'Pipe|A green warp pipe. Draw it tall and narrow, then put a Piranha Plant on top.' },
    { id: 'cloud', name: 'Cloud', tip: 'Cloud|A fluffy cloud platform Mario can walk on.' },
    { id: 'neon', name: 'Neon', tip: 'Neon|A glowing outline with a moving scan line. Pulses with the music; looks amazing traced around real objects.' },
    { id: 'lava', name: 'Lava', tip: 'Lava|Bubbling lava. Mario never walks on it, he jumps over it.' },
    { id: 'water', name: 'Water', tip: 'Water|Rippling water with rising bubbles. Mario jumps over it. Add a Cheep Cheep or Blooper.' },
    { id: 'ice', name: 'Ice', tip: 'Ice|Frozen ice blocks with a glint that sweeps across.' },
    { id: 'gold', name: 'Gold', tip: 'Gold|Shiny gold blocks that sparkle.' },
    { id: 'grass', name: 'Grass', tip: 'Grass|A grassy dirt ledge, like the hills in later Mario games.' },
    { id: 'mushroom', name: 'Mushroom', tip: 'Mushroom|A giant red spotted mushroom-top platform.' },
    { id: 'castle', name: 'Castle', tip: 'Castle|Grey castle bricks with battlements along the top.' },
    { id: 'rainbow', name: 'Rainbow', tip: 'Rainbow|Rainbow Road! Moving colour stripes with twinkling stars.' },
    { id: 'bridge', name: 'Bridge', tip: 'Bridge|A wooden rope bridge.' },
  ];
  const TIPS = {
    mario: 'Mario|The star of your wall. Walks across your boxes and jumps from box to box in time with the beat. Always on the wall: you can move him but not remove him.',
    luigi: 'Luigi|Follows Mario along the same path, a moment behind. Give him his own motion to make him patrol instead.',
    toad: 'Toad|Cheers from his spot and hops now and then. Sends hearts when Mario passes by.',
    peach: 'Princess Peach|Waits on her box. Sends hearts when Mario reaches her.',
    yoshi: 'Yoshi|Hangs out and hops now and then. Set a motion to make him walk around.',
    goomba: 'Goomba|Walks back and forth on its box. Mario stomps it, and it comes back a few seconds later.',
    koopa: 'Koopa Troopa|Patrols its box. A stomp turns it into a sliding shell.',
    piranha: 'Piranha Plant|Rises up, chomps, then hides again. Place it on top of a pipe.',
    boo: 'Boo|Floats around and covers its face whenever Mario looks at it.',
    bowser: 'Bowser|Breathes fire every couple of bars. Three hits from Mario and he is out (for a while).',
    bullet: 'Bullet Bill|Flies across the wall, then reloads. Use the motion dots to choose how far it flies.',
    cheep: 'Cheep Cheep|Swims back and forth. Looks great over lava.',
    qblock: '? Block|Bumps and pops a coin now and then. Mario can hit it too.',
    brick: 'Brick|Breaks into pieces when Mario touches it, then rebuilds itself.',
    coin: 'Coin|Spins in place. Mario collects it with a sparkle.',
    mushroom: 'Super Mushroom|Mario grows big for a while when he grabs it.',
    oneup: '1-Up Mushroom|An extra life: Mario grabs it and 1UP pops up.',
    star: 'Super Star|Mario becomes invincible and flashes rainbow colours.',
    flower: 'Fire Flower|Mario throws bouncing fireballs in time with the music.',
    pipe: 'Pipe (decor)|A decorative pipe. To make a pipe Mario can stand on, draw a box and pick the Pipe skin.',
    cloud: 'Cloud|Drifts gently in the sky.',
    bush: 'Bush|Scenery for the ground. Rustles now and then.',
    hill: 'Hill|Background scenery for the ground.',
    flag: 'Flagpole|When Mario reaches it, the flag slides down and fireworks go off.',
    castle: 'Castle|Windows light up now and then. When Mario arrives: COURSE CLEAR and fireworks.',
    daisy: 'Princess Daisy|Cheers from her box with a hop now and then. Sends hearts when Mario visits.',
    rosalina: 'Rosalina|Floats in a shower of star sparkles now and then. Sends hearts when Mario visits.',
    toadette: 'Toadette|Toad\'s bubbly friend. Hops now and then and cheers when Mario passes.',
    captain: 'Captain Toad|The explorer with the headlamp. Hops now and then; give him motion to make him explore.',
    dk: 'Donkey Kong|Big, strong and loud: now and then he stomps so hard the whole wall shakes.',
    yoshiRed: 'Red Yoshi|A red Yoshi. Hops now and then; give him motion to make him walk around.',
    yoshiBlue: 'Blue Yoshi|A blue Yoshi. Hops now and then; give him motion to make him walk around.',
    leaf: 'Super Leaf|Mario grows a raccoon tail and floats through his jumps for a while.',
    iceflower: 'Ice Flower|Mario throws icy balls in time with the music that freeze enemies.',
    mega: 'Mega Mushroom|Mario turns GIANT for a few seconds and every landing shakes the wall.',
    redcoin: 'Red Coin|Collect all the red coins on your wall for a big bonus and a Star.',
    key: 'Key|When Mario grabs it, every Door on the wall unlocks with sparkles.',
    pmoon: 'Power Moon|The big prize: a POWER MOON celebration with fireworks.',
    note: 'Note Block|Bounces to the music on every beat. Mario boings off it like a spring.',
    used: 'Empty Block|A plain used block. Good for building little stairs and walls.',
    palm: 'Palm Tree|Tropical scenery that sways now and then.',
    cactus: 'Cactus|Desert scenery for the ground.',
    snowman: 'Snowman|Winter scenery. Hops now and then.',
    door: 'Door|Opens with a glow when Mario reaches it, or when he grabs a Key.',
    checkpoint: 'Checkpoint|The midway flag: it turns into Mario\'s flag when he passes.',
    lamp: 'Lamp Post|A street lamp whose light pulses softly with the music.',
    stars: 'Night Stars|A cluster of twinkling stars for the sky.',
    nightmoon: 'Moon|A crescent moon for a night sky.',
    hammer: 'Hammer Bro|Hops on the beat and throws spinning hammers every bar. Mario can stomp him.',
    buzzy: 'Buzzy Beetle|A tough blue beetle that patrols its box. A stomp turns it into a sliding shell.',
    shyguy: 'Shy Guy|A masked little walker that patrols its box. Easy to stomp.',
    bobomb: 'Bob-omb|Walks around, then lights its fuse and explodes every few bars, shaking the wall. Comes back after.',
    blooper: 'Blooper|A squid that darts upward on the beat and drifts back down. Great over water.',
    drybones: 'Dry Bones|A skeleton Koopa. Stomp it and it collapses into a pile of bones, then pulls itself back together.',
    wario: 'Wario|Mario\'s greedy rival. Hops now and then; give him motion to make him stomp around.',
    waluigi: 'Waluigi|Luigi\'s lanky rival. Hops now and then; give him motion to make him patrol.',
    thwomp: 'Thwomp|An angry stone block that slams down on the beat and shakes the wall. Drag its cyan dot to set how far it falls.',
    podoboo: 'Podoboo|A lava bubble that leaps up and falls back on the beat. Put it on lava. Drag the cyan dot to set the jump height.',
    spiny: 'Spiny|A spiky shell that patrols its box. Too sharp to stomp: Mario hops over it (a Star beats it).',
    chomp: 'Chain Chomp|Chained to its post, it lunges and snaps on the beat. Drag the cyan dot to set how far it lunges.',
    lakitu: 'Lakitu|Rides a cloud across the sky and drops Spinies every few bars.',
    firebar: 'Fire Bar|A chain of fireballs that spins one full turn per bar, locked to the music.',
    spring: 'Spring|Mario lands on it and gets launched high into the air.',
    pswitch: 'P-Switch|When Mario steps on it, every brick turns into coins for a few seconds.',
    tree: 'Tree|Background scenery that rustles now and then.',
    fence: 'Fence|Background scenery for the ground.',
    sign: 'Arrow sign|Points the way. Nice at Mario\'s starting spot.',
  };
  // Pixel text: each glyph is 7 rows of 5-bit masks (see font.js). Drawn twice when a shadow is given.
  function drawText(ctx, str, x, y, scale, color, shadow) {
    const glyphs = [...String(str)].map(ch => MW.FONT[ch] || MW.FONT[ch.toUpperCase()] || MW.FONT[' ']);
    const paint = (col, dx, dy) => {
      ctx.fillStyle = col;
      glyphs.forEach((rows, k) => rows.forEach((bits, j) => {
        for (let i = 0; i < 5; i++) if (bits & (16 >> i)) ctx.fillRect(x + (k * 6 + i) * scale + dx, y + j * scale + dy, scale, scale);
      }));
    };
    if (shadow) paint(shadow, scale, scale);
    paint(color, 0, 0);
  }
  const textWidth = (s, scale) => (String(s).length * 6 - 1) * scale;

  MW.Art = { PAL, THEMES, tiles, sprites, ELEMENTS, BY_TYPE, CAT_ORDER, SKINS, TIPS, makeCanvas, fromMap, disk, puffs, pipeInto, drawText, textWidth };
})(window);
