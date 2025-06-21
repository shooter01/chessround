// ChessgroundWithPromotion.tsx

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key, Piece, Role, Color } from 'chessground/types';
import { Chess } from 'chessops/chess';
import { makeBoardFen } from 'chessops/fen';
import { parseUci } from 'chessops/util';
import { chessgroundDests } from 'chessops/compat';
import { render, Vnode } from 'mithril';
import h from 'mithril/hyperscript';
import './assets/chessground.css'; // Импортируем стили
import './assets/theme.css'; // Импортируем стили
import './assets/3d.css'; // Импортируем стили
import './assets/examples.css'; // Импортируем стили
import './assets/promotion.css'; // Импортируем стили
import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';

// Сторонние стили promotion
// import 'chessground-promotion/src/index.css';
// ————— Promotion classes (из вашего примера) —————

type OnMove = (orig: Key, dest: Key, captured?: Piece) => void;
type OnPromotion = (orig: Key, dest: Key, captured?: Piece, role?: Role) => void;

const kPromotionRoles: Role[] = ['queen', 'knight', 'rook', 'bishop'];
const isPromotion = (orig: Key, dest: Key, piece: Piece): boolean =>
  piece.role === 'pawn' &&
  ((piece.color === 'white' && dest[1] === '8') || (piece.color === 'black' && dest[1] === '1'));

type Resolve = (role?: Role) => void;
interface State {
  dest: Key;
  color: Color;
  resolve: Resolve;
}

class ChessgroundPromotion {
  private state?: State;
  constructor(
    private el: HTMLElement,
    private getCg: () => Api,
  ) {
    this.redraw();
  }
  patch(onMove: OnMove, onPromotion: OnPromotion): OnMove {
    return (orig, dest, captured) => {
      const piece = this.getCg().state.pieces.get(dest);
      if (!piece) return;
      if (!isPromotion(orig, dest, piece)) {
        onMove(orig, dest, captured);
        return;
      }
      this.prompt(dest, piece.color).then((role) => {
        if (role)
          this.getCg().setPieces(new Map([[dest, { color: piece.color, role, promoted: true }]]));
        onPromotion(orig, dest, captured, role);
      });
    };
  }
  prompt(dest: Key, color: Color): Promise<Role | undefined> {
    return new Promise((resolve) => {
      this.state = { dest, color, resolve };
      this.redraw();
    }).finally(() => {
      this.state = undefined;
      this.redraw();
    });
  }
  redraw() {
    this.el.classList.toggle('cg-promotion--open', !!this.state);
    render(this.el, this.view());
  }
  view(): Vnode {
    if (!this.state) return h('cg-helper', h('cg-container', h('cg-board')));
    const { dest, color, resolve } = this.state;
    const cg = this.getCg();
    let file = dest.charCodeAt(0) - 97;
    let rank = color === 'white' ? 0 : 7;
    let step = color === 'white' ? 1 : -1;
    if (cg.state.orientation === 'black') {
      file = 7 - file;
      rank = 7 - rank;
      step = -step;
    }
    return h(
      'cg-helper',
      h(
        'cg-container',
        h(
          'cg-board',
          { onclick: () => resolve(undefined) },
          kPromotionRoles.map((role, i) =>
            h(
              'square',
              {
                style: `top:${(rank + i * step) * 12.5}%;left:${file * 12.5}%`,
                onclick: () => resolve(role),
              },
              h(`piece.${color}.${role}`),
            ),
          ),
        ),
      ),
    );
  }
}

// ————— UCI wrapper —————

type OnUci = (uci?: string) => void;

const roleToChar = (s: string) => (s === 'knight' ? 'n' : s[0]);
const toUci = (o: Key, d: Key, p?: Role) => o + d + (p ? roleToChar(p) : '');

class ChessgroundUci {
  public cg!: Api;
  public cgPromotion: ChessgroundPromotion;
  constructor(
    private el: HTMLElement,
    private onUci: OnUci,
    config?: Config,
  ) {
    const boardEl = document.createElement('div');
    const promoEl = document.createElement('div');
    boardEl.classList.add('cg', 'cg-wrap');
    promoEl.classList.add('cg-promotion', 'cg-wrap');
    el.append(boardEl, promoEl);
    this.cgPromotion = new ChessgroundPromotion(promoEl, () => this.cg);
    // @ts-ignore
    this.cg = Chessground(boardEl, config && this.patch(config));
  }
  patch(cfg: Config): Config {
    cfg.events = cfg.events || {};
    cfg.events.move = this.cgPromotion.patch(this.onMove.bind(this), this.onPromotion.bind(this));
    return cfg;
  }
  set(cfg: Config) {
    this.cg.set(this.patch(cfg));
  }
  private onMove(o: Key, d: Key) {
    this.onUci(toUci(o, d));
  }
  private onPromotion(o: Key, d: Key, _, r?: Role) {
    this.onUci(r ? toUci(o, d, r) : undefined);
  }
}

// ————— React component —————

export default function ChessgroundApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  // useRef вместо state, чтобы не вызывать лишние рендеры
  const cgRef = useRef<ChessgroundUci>();
  const [orientation, setOrientation] = useState<Color>('white');
  const [freeMode, setFreeMode] = useState(true);
  const [freeFen, setFreeFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  const [position] = useState(() => Chess.default());

  // config builder (без зависимости от cgRef)
  const makeConfig = useCallback(
    () => ({
      orientation,
      fen: freeMode ? freeFen : makeBoardFen(position.board),
      turnColor: freeMode ? undefined : position.turn,
      lastMove: undefined,
      movable: freeMode
        ? { free: true, color: 'both', dests: undefined }
        : { free: false, color: position.turn, dests: chessgroundDests(position) },
    }),
    [orientation, freeMode, freeFen, position],
  );

  // UCI callback, ссылаемся на cgRef.current
  const onUci = useCallback<OnUci>(
    (uci) => {
      const uciApi = cgRef.current;
      if (!uciApi) return;
      if (!uci) {
        uciApi.set(makeConfig());
        return;
      }
      if (freeMode) {
        setFreeFen(uciApi.cg.getFen());
        return;
      }
      position.play(parseUci(uci)!);
      uciApi.set(makeConfig());
    },
    [freeMode, makeConfig, position],
  );

  // монтируем-размонтируем Чессграунд единожды
  useEffect(() => {
    if (!containerRef.current) return;
    const uci = new ChessgroundUci(containerRef.current, onUci, makeConfig());
    cgRef.current = uci;
    return () => uci.cg.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // пустой массив — монтируем только раз

  return (
    <div style={{ textAlign: 'center' }}>
      <div ref={containerRef} style={{ width: 400, height: 400, margin: '0 auto' }} />
      <div style={{ marginTop: 12 }}>
        <label style={{ marginRight: 16 }}>
          <input
            type="checkbox"
            checked={orientation === 'black'}
            onChange={(e) => {
              const black = (e.currentTarget as HTMLInputElement).checked;
              const newOri: Color = black ? 'black' : 'white';
              setOrientation(newOri);
              cgRef.current?.set({ orientation: newOri });
              cgRef.current?.cgPromotion.redraw();
            }}
          />{' '}
          Flip board
        </label>
        <label>
          <input
            type="checkbox"
            checked={freeMode}
            onChange={(e) => {
              const fm = (e.currentTarget as HTMLInputElement).checked;
              setFreeMode(fm);
              cgRef.current?.set(makeConfig());
            }}
          />{' '}
          Free mode
        </label>
      </div>
    </div>
  );
}
