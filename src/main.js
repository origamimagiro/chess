import { build_icons        } from "./icons.js";
import { build_gui, draw    } from "./gui.js";
import { state_2_FEN, FEN_2_state, xy_2_sq, x_2_f, y_2_r } from "./fen.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export const p_2_color = (p) => ((p >= 'a') ? 'b' : ((p >= 'A') ? 'w' : '.'));
export const p_2_type  = (p) => (p == '.') ? '.' : p.toUpperCase();

const copy_board = (B1, B2) => {
    for (let y = 0; y < 8; ++y) { for (let x = 0; x < 8; ++x) {
        B2[y][x] = B1[y][x];
    } }
};

const state_2_key = (state) => state_2_FEN(state).split(" ")[0];

window.onload = () => {
    build_icons();
    const {reset, undo, dump, submit, gui} = build_gui();
    gui.state = FEN_2_state(START);
    gui.map.set(state_2_key(gui.state), 1);
    for (let y = 0; y < 8; ++y) { for (let x = 0; x < 8; ++x) {
        gui.board_divs[y][x].onclick = () => click_square(x, y, gui);
    } }
    const clear_state = () => {
        gui.state = undefined;
        gui.history.length = 0;
        gui.active = undefined;
        gui.promotion = false;
        gui.map.clear();
    };
    reset.onclick = () => {
        clear_state();
        gui.state = FEN_2_state(START);
        gui.map.set(state_2_key(gui.state), 1);
        update(gui);
    }
    undo.onclick = () => {
        if (gui.history.length == 0) { return; }
        const key = state_2_key(gui.state);
        const k = gui.map.get(key);
        if (k == 1) {
            gui.map.delete(key);
        } else {
            gui.map.set(key, k - 1);
        }
        const [state, move] = gui.history.pop(); 
        gui.state = state;
        gui.active = undefined;
        update(gui);
    };
    dump.onclick = () => console.log("GUI", gui);
    submit.onclick = () => {
        const state = FEN_2_state(data.value);
        if (state != undefined) {
            clear_state();
            gui.map.set(state_2_key(state), 1);
            gui.state = state;
        }
        update(gui);
    };
    update(gui);
};

const MOVES = {
    N: [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
    K: [[-1,-1],[-1,1],[1,-1],[1,1],[0,-1],[-1,0],[0,1],[1,0]],
    R: [[-1,0],[1,0],[0,-1],[0,1]],
    B: [[-1,-1],[1,-1],[-1,1],[1,1]],
    Q: [[-1,-1],[1,-1],[-1,1],[1,1],[-1,0],[1,0],[0,-1],[0,1]],
};

export const accessible_moves = (x, y, board, enpassant, castle, A) => {
    // format for a move: [type, dst, aux]
    // type one of {move: m, capture: x, castle: c, promotion: p}
    // dst [dx, dy] is the destination
    // aux is {
    //      undefined if type is m
    //      [cp, cx, cy] if type is x (piece type and location)
    //      [rsx, rsy, rdx, rdy] if type is c castle (rook start and end)
    // }
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
                out.push(["m", [x, y1]]);
                if ((y == ((w == 'w') ? 6 : 1)) && (board[y1 + dy][x] == '.')) {
                    out.push(["m", [x, y1 + dy]]);
                }
            }
            for (const [x1, lim] of [[x - 1, -1], [x + 1, 8]]) {
                if (x1 == lim) { continue; }
                const p1 = board[y1][x1];
                if ((A != undefined) && (p_2_color(p1) != b)) { continue; }
                out.push(["x", [x1, y1], [p1, x1, y1]]);
            }
            if (enpassant != undefined) {
                const [ex, ey] = enpassant;
                if ((y == ((w == 'w') ? 3 : 4)) && (Math.abs(x - ex) == 1)) {
                    out.push(["x", [ex, y1], [board[y][ex], ex, y]]);
                }
            }
            break;
        case 'K':
            if (castle != undefined) {
                if ((board[y][5] == '.') &&
                    (board[y][6] == '.') && castle[w][0] &&
                    ((A == undefined) || (!A[y][4] && !A[y][5] && !A[y][6]))
                ) {
                    out.push(["c", [6, y], [7, y, 5, y]]);
                }
                if ((board[y][1] == '.') &&
                    (board[y][2] == '.') &&
                    (board[y][3] == '.') && castle[w][1] &&
                    ((A == undefined) || (!A[y][2] && !A[y][3] && !A[y][4]))
                ) {
                    out.push(["c", [2, y], [0, y, 3, y]]);
                }
            } // fallthrough
        case 'N':
            for (const [dx, dy] of MOVES[t]) {
                const x1 = x + dx; if ((x1 < 0) || (x1 > 7)) { continue; }
                const y1 = y + dy; if ((y1 < 0) || (y1 > 7)) { continue; }
                const p1 = board[y1][x1];
                const c1 = p_2_color(p1);
                if (c1 == w) { continue; }
                if ((t == 'K') && (A != undefined) && A[y1][x1]) { continue; }
                out.push((c1 == b)
                    ? ["x", [x1, y1], [p1, x1, y1]]
                    : ["m", [x1, y1]]
                );
            }
            break;
        case 'Q': case 'B': case 'R':
            for (const [dx, dy] of MOVES[t]) {
                for (let x1 = x + dx, y1 = y + dy;
                    ((x1 + 1) % 9) && ((y1 + 1) % 9); x1 += dx, y1 += dy
                ) {
                    const p1 = board[y1][x1];
                    const c1 = p_2_color(p1);
                    if (c1 == '.') {
                        out.push(["m", [x1, y1]]);
                        continue;
                    }
                    if (c1 != w) {
                        out.push(["x", [x1, y1], [p1, x1, y1]]);
                    }
                    break;
                }
            }
    }
    return out;
};

const make_move = (sx, sy, move, board) => {
    const [type, [dx, dy], aux] = move;
    if (type == 'c') {          // castle
        const [rsx, rsy, rdx, rdy] = aux;
        board[rdy][rdx] = board[rsy][rsx];
        board[rsy][rsx] = '.';
    } else if (type == 'x') {   // capture
        const [cp, cx, cy] = aux;
        board[cy][cx] = '.';
    }
    board[dy][dx] = board[sy][sx];
    board[sy][sx] = '.';
};

export const attacked = (board, side) => {
    const A = Array(8).fill().map(() => Array(8).fill(0));
    for (let y = 0; y < 8; ++y) {
        for (let x = 0; x < 8; ++x) {
            const p = board[y][x];
            if (p_2_color(p) != side) { continue; }
            const t = p_2_type(p);
            const moves = accessible_moves(x, y, board);
            for (const move of moves) {
                const [dx, dy] = move[1];
                if ((t == 'P') && (x == dx)) { continue; }
                A[dy][dx] = 1;
            }
        }
    }
    return A;
};

export const filter_moves = (x, y, board, turn, moves) => {
    const b = (turn == 'w') ? 'b' : 'w';
    const B = Array(8).fill().map(() => Array(8).fill());
    return moves.filter((move) => {
        copy_board(board, B);
        make_move(x, y, move, B);
        const A = attacked(B, b);
        for (let ky = 0; ky < 8; ++ky) {
            for (let kx = 0; kx < 8; ++kx) {
                const p = B[ky][kx];
                const c = p_2_color(p);
                const t = p_2_type(p);
                if ((c != turn) || (t != 'K')) { continue; }
                return !A[ky][kx];
            }
        }
        return true;
    });
};

const update = (gui) => {
    const {board, turn, castle, enpassant} = gui.state;
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
            const moves = filter_moves(x, y, board, turn, raw);
            if (moves.length > 0) { stale = false; }
            gui.moves[y][x] = moves;
        }
    }
    const key = state_2_key(gui.state);
    if ((gui.map.get(key) == 3) ||
        ((pieces == 2) && (kings[b] != undefined) && (kings[w] != undefined))
    ) {
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
    if (gui.history.length > 0) {
        const [state, move] = gui.history[gui.history.length - 1];
        move[4] = gui.status;
        const alg = board_move_2_alg(state, move, gui.state);;
        move[5] = alg;
    }
    draw(gui);
};

const PROMO_MAP = {
    Q: "R", R: "B", B: "N", N: "Q",
    q: "r", r: "b", b: "n", n: "q",
};

const click_square = (x, y, gui) => {
    const state = gui.state;
    if (gui.promotion) {
        const [ax, ay] = gui.active;
        if ((x == ax) && (y == ay)) {
            const p = PROMO_MAP[state.board[y][x]];
            state.board[y][x] = p;
            gui.history[gui.history.length - 1][1][3] = p;
        } else {
            gui.promotion = false;
            gui.active = undefined;
        }
        update(gui);
        return;
    }
    if (gui.active == undefined) {
        const p = state.board[y][x];
        const c = p_2_color(p);
        if (c != state.turn) { return; }
        gui.active = [x, y];
        update(gui);
    } else {
        const [sx, sy] = gui.active;
        for (const m of gui.moves[sy][sx]) {
            const [type, [dx, dy], aux] = m;
            if ((x != dx) || (y != dy)) { continue; }
            const board = Array(8).fill().map(() => Array(8).fill("."));
            copy_board(state.board, board);
            const t = p_2_type(board[sy][sx]);
            const enpassant = ((t == 'P') && (Math.abs(dy - sy) == 2))
                ? [dx, dy] : undefined;
            const halfmove = ((t == 'P') || (type == "x"))
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
            gui.state = {board, turn, castle, enpassant, halfmove, move};
            gui.history.push([state, [type, [sx, sy], [dx, dy], aux,
                gui.status, undefined]]);
            const key = state_2_key(gui.state);
            gui.map.set(key, 1 + (gui.map.get(key) ?? 0));
            break;
        }
        if (!gui.promotion) { gui.active = undefined; }
        update(gui);
    }
};

const board_move_2_alg = (s1, move, s2) => {
    const [type, [sx, sy], [dx, dy], aux, status] = move;
    const {board, turn, enpassant, castle} = s1;
    const p = board[sy][sx];
    const t = p_2_type(p);
    if (type == 'c') { return (dx == 6) ? '0-0' : '0-0-0'; }
    const suff = (
        (status == "check") ? "+" : (
        (status == "checkmate") ? "++" : ""
    ));
    let pre = ((type == 'x') ? 'x' : '') + xy_2_sq(dx, dy);
    if (t == 'P') {
        if (type == 'x') { pre = x_2_f(sx) + pre; }
        const t2 = p_2_type(s2.board[dy][dx]);
        if (t2 != 'P') { pre += "=" + t2; }
    } else {
        const same = [];
        const b = (turn == 'w') ? 'b' : 'w';
        const A = attacked(board, b);
        let dup = false, row = false, col = false;
        for (let y = 0; y < 8; ++y) {
            for (let x = 0; x < 8; ++x) {
                if (board[y][x] != p) { continue; }
                if ((sx == x) && (sy == y)) { continue; }
                const raw = accessible_moves(x, y, board, enpassant, castle, A);
                const moves = filter_moves(x, y, board, turn, raw);
                for (const m of moves) {
                    const [type, [dx2, dy2], aux] = m;
                    if ((dx == dx2) && (dy == dy2)) {
                        dup = true;
                        row ||= (y == sy);
                        col ||= (x == sx);
                    }
                }            
            }
        }
        const amb = !dup ? "" : (
            (row && col) ? xy_2_sq(sx, sy) : (
            col ? y_2_r(sy) : x_2_f(sx)
        ));
        pre = t + amb + pre; 
    }
    return pre + suff;
};
