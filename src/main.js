import { last               } from "./utilities.js";
import { build_icons        } from "./icons.js";
import { build_gui, draw    } from "./gui.js";
import { FEN_2_state        } from "./fen.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const p_2_color = (p) => ((p >= 'a') ? 'b' : ((p >= 'A') ? 'w' : '.'));
export const p_2_type  = (p) => (p == '.') ? '.' : p.toUpperCase();
export const is_capture = (m) => ((m[1] != undefined) && (m[2] == undefined));

const copy_board = (B1, B2) => {
    for (let y = 0; y < 8; ++y) { for (let x = 0; x < 8; ++x) {
        B2[y][x] = B1[y][x];
    } }
};

window.onload = () => {
    build_icons();
    const states = [FEN_2_state(START)];
    const {reset, undo, dump, submit, gui} = build_gui();
    for (let y = 0; y < 8; ++y) { for (let x = 0; x < 8; ++x) {
        gui.board_divs[y][x].onclick = () => click_square(x, y, states, gui);
    } }
    const clear_state = () => {
        states.length = 0;
        gui.active = undefined;
        gui.promotion = false;
    };
    reset.onclick = () => {
        clear_state();
        const state = FEN_2_state(START);
        states.push(state);
        update(state, gui);
    }
    undo.onclick = () => {
        if (states.length == 1) { return; }
        states.pop();
        gui.active = undefined;
        const state = last(states);
        update(state, gui);
    };
    dump.onclick = () => {
        console.log("States", states);
        console.log("GUI", gui);
    };
    submit.onclick = () => {
        const state = FEN_2_state(data.value);
        if (state != undefined) {
            clear_state();
            states.push(state);
        }
        update(last(states), gui);
    };
    update(last(states), gui);
};

const MOVES = {
    N: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    K: [[-1,-1],[-1,1],[1,-1],[1,1],[0,-1],[-1,0],[0,1],[1,0]],
    R: [[-1,0],[1,0],[0,-1],[0,1]],
    B: [[-1,-1],[1,-1],[-1,1],[1,1]],
    Q: [[-1,-1],[1,-1],[-1,1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
};

const accessible_moves = (x, y, board, enpassant, castle, A) => {
    const p = board[y][x];
    const w = p_2_color(p);
    const b = (w == 'w') ? 'b' : 'w';
    const t = p_2_type(p);
    const out = [];
    switch (t) {
        case 'P':
            if ((y % 7) == 0) { console.log("ERROR: pawn on rank 1 or 8"); }
            const dy = (w == 'w') ? -1 : 1;
            const y1 = y + dy;
            if ((board[y1][x] == '.') && (A != undefined)) {
                out.push([[x, y1]]);
                if ((y == ((w == 'w') ? 6 : 1)) && (board[y1 + dy][x] == '.')) {
                    out.push([[x, y1 + dy]]);
                }
            }
            for (const [x1, lim] of [[x - 1, -1], [x + 1, 8]]) {
                if (x1 == lim) { continue; }
                const p1 = board[y1][x1];
                if ((A != undefined) && (p_2_color(p1) != b)) { continue; }
                out.push([[x1, y1], [x1, y1]]);
            }
            if (enpassant != undefined) {
                const [ex, ey] = enpassant;
                if ((y == ((w == 'w') ? 3 : 4)) && (Math.abs(x - ex) == 1)) {
                    out.push([[ex, y1], [ex, y]]);
                }
            }
            break;
        case 'K':
            if (castle != undefined) {
                if ((board[y][5] == '.') &&
                    (board[y][6] == '.') && castle[w][0] &&
                    ((A == undefined) || (!A[y][4] && !A[y][5] && !A[y][6]))
                ) {
                    out.push([[6, y], [7, y], [5, y]]);
                }
                if ((board[y][1] == '.') &&
                    (board[y][2] == '.') &&
                    (board[y][3] == '.') && castle[w][1] &&
                    ((A == undefined) || (!A[y][2] && !A[y][3] && !A[y][4]))
                ) {
                    out.push([[2, y], [0, y], [3, y]]);
                }
            } // fallthrough
        case 'N':
            for (const [dx, dy] of MOVES[t]) {
                const x1 = x + dx; if ((x1 < 0) || (x1 > 7)) { continue; }
                const y1 = y + dy; if ((y1 < 0) || (y1 > 7)) { continue; }
                const c = p_2_color(board[y1][x1]);
                if (c == w) { continue; }
                if ((t == 'K') && (A != undefined) && A[y1][x1]) { continue; }
                out.push((c == b) ? [[x1, y1], [x1, y1]] : [[x1, y1]]);
            }
            break;
        case 'Q': case 'B': case 'R':
            for (const [dx, dy] of MOVES[t]) {
                for (let x1 = x + dx, y1 = y + dy;
                    ((x1 + 1) % 9) && ((y1 + 1) % 9); x1 += dx, y1 += dy
                ) {
                    const c1 = p_2_color(board[y1][x1]);
                    if (c1 == '.') { out.push([[x1, y1]]); continue; }
                    if (c1 != w)   { out.push([[x1, y1], [x1, y1]]); }
                    break;
                }
            }
    }
    return out;
};

const make_move = (sx, sy, move, board) => {
    const [dx, dy] = move[0];
    if (move[2] != undefined) { // castle
        const [rx, ry] = move[1];
        const [drx, dry] = move[2];
        board[dry][drx] = board[ry][rx];
        board[ry][rx] = '.';
    } else if (move[1] != undefined) { // capture
        const [cx, cy] = move[1];
        board[cy][cx] = '.';
    }
    board[dy][dx] = board[sy][sx];
    board[sy][sx] = '.';
};

const attacked = (board, side) => {
    const A = Array(8).fill().map(() => Array(8).fill(0));
    for (let y = 0; y < 8; ++y) {
        for (let x = 0; x < 8; ++x) {
            const p = board[y][x];
            if (p_2_color(p) != side) { continue; }
            const t = p_2_type(p);
            const moves = accessible_moves(x, y, board);
            for (const move of moves) {
                const [dx, dy] = move[0];
                if ((t == 'P') && (x == dx)) { continue; }
                A[dy][dx] = 1;
            }
        }
    }
    return A;
};

const update = (state, gui) => {
    const {board, turn, castle, enpassant} = state;
    const b = (turn == 'w') ? 'b' : 'w';
    const kings = {b: undefined, w: undefined};
    const A = attacked(board, b);
    let stale = true, pieces = 0;
    for (let y = 0; y < 8; ++y) { for (let x = 0; x < 8; ++x) {
        gui.moves[y][x] = [];
    } }
    for (let y = 0; y < 8; ++y) {
        for (let x = 0; x < 8; ++x) {
            const p = board[y][x];
            if (p == '.') { continue; }
            pieces += 1;
            const c = p_2_color(p);
            const t = p_2_type(p);
            if (t == 'K') { kings[c] = [x, y]; }
            if (c != turn) { gui.moves[y][x] = []; continue; }
            const raw = accessible_moves(x, y, board, enpassant, castle, A);
            const B = Array(8).fill().map(() => Array(8).fill());
            const moves = raw.filter((move) => {
                copy_board(board, B);
                make_move(x, y, move, B);
                const A_ = attacked(B, b);
                for (let ky = 0; ky < 8; ++ky) {
                    for (let kx = 0; kx < 8; ++kx) {
                        const p = B[ky][kx];
                        const c = p_2_color(p);
                        const t = p_2_type(p);
                        if ((c != turn) || (t != 'K')) { continue; }
                        return !A_[ky][kx];
                    }
                }
                return true;
            });
            if (moves.length > 0) { stale = false; }
            gui.moves[y][x] = moves;
        }
    }
    if ((pieces == 2) && (kings[b] != undefined) && (kings[w] != undefined)) {
        stale = true;
        for (const c of ['w', 'b']) {
            const [kx, ky] = kings[c];
            gui.moves[ky][kx] = [];
        }
    }
    const [kx, ky] = kings[turn];
    gui.status = (A[ky][kx]
        ? (stale ? "checkmate" : "check")
        : (stale ? "stalemate" : "normal")
    );
    draw(state, gui);
};

const PROMO_MAP = {
    Q: "R", R: "B", B: "N", N: "Q",
    q: "r", r: "b", b: "n", n: "q",
};

const click_square = (x, y, states, gui) => {
    const state = states[states.length - 1];
    if (gui.promotion) {
        const [ax, ay] = gui.active;
        if ((x == ax) && (y == ay)) {
            state.board[y][x] = PROMO_MAP[state.board[y][x]];
        } else {
            gui.promotion = false;
            gui.active = undefined;
        }
        update(last(states), gui);
        return;
    }
    if (gui.active == undefined) {
        const p = state.board[y][x];
        const c = p_2_color(p);
        if (c != state.turn) { return; }
        gui.active = [x, y];
    } else {
        const [sx, sy] = gui.active;
        for (const m of gui.moves[sy][sx]) {
            const [dx, dy] = m[0];
            if ((x != dx) || (y != dy)) { continue; }
            const board = Array(8).fill().map(() => Array(8).fill("."));
            copy_board(state.board, board);
            const t = p_2_type(board[sy][sx]);
            const enpassant = ((t == 'P') && (Math.abs(dy - sy) == 2))
                ? [dx, dy] : undefined;
            const halfmove = ((t == 'P') || is_capture(m))
                ? 0 : (state.halfmove + 1);
            const castle = {
                w: state.castle.w.map(a => a),
                b: state.castle.b.map(a => a),
            };
            for (const [s, x] of [[0, 7], [1, 0]]) {
                if (castle[state.turn][s] && ((t == 'K') || (
                    (sx == x) && (sy == ((state.turn == 'w') ? 7 : 0))
                ))) { castle[state.turn][s] = false; }
            }
            make_move(sx, sy, m, board);
            if ((t == 'P') && ((dy % 7) == 0)) {
                board[dy][dx] = (state.turn == 'w') ? 'Q' : 'q';
                gui.promotion = true;
                gui.active = [dx, dy];
            }
            const turn = (state.turn == 'w') ? 'b' : 'w';
            const move = state.move + ((turn == 'w') ? 1 : 0);
            states.push({board, turn, castle, enpassant, halfmove, move});
            break;
        }
        if (!gui.promotion) { gui.active = undefined; }
    }
    update(last(states), gui);
};
