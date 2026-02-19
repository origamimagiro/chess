import { state_2_FEN, xy_2_sq, x_2_f, y_2_r } from "./fen.js";
import { p_2_color, p_2_type,
    accessible_moves, filter_moves, attacked,
} from "./main.js";

export const append_el = (tag, par, attributes = {}) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attributes)) { el[k] = v; }
    par.appendChild(el);
    return el;
};

export const build_gui = () => {
    const B = document.body;
    const board = append_el("div", B, {id: "board"});
    const data = append_el("textarea", B, {id: "data", rows: 1, cols: 93});
    const game = append_el("textarea", B, {id: "game"});
    game.disabled = true;
    const reset  = append_el("button", B, {id:  "reset", innerHTML:  "Reset"});
    const undo   = append_el("button", B, {id:   "undo", innerHTML:   "Undo"});
    const dump   = append_el("button", B, {id:   "dump", innerHTML:   "Dump"});
    const submit = append_el("button", B, {id: "submit", innerHTML: "Submit"});
    const gui = {state: undefined, history: [], data, game,
        board_divs: undefined, taken_divs: undefined,
        active: undefined, promotion: false,
        moves: Array(8).fill().map(() => Array(8).fill().map(() => [])),
    };
    gui.board_divs = Array(8).fill().map((_, y) =>
        Array(8).fill().map((_, x) => {
            const div = append_el("div", board, {id: `B${x},${y}`});
            div.style.top = `${y * 32}px`;
            div.style.left = `${x * 32}px`;
            return div;
        })
    );
    const grave = append_el("div", B, {id: "grave"});
    gui.taken_divs = Object.fromEntries(['w', 'b'].map((c, i) => [c,
        Array(16).fill().map((_, j) => {
            const div = append_el("div", grave, {id: `T${c}${j}`});
            div.style.top  = `${i * 16}px`;
            div.style.left = `${j * 16}px`;
            return div;
        })
    ]));
    return {reset, undo, dump, submit, gui};
};

const ORDER = {
    p: 1, n: 2, b: 3, r: 4, q: 5,
    P: 1, N: 2, B: 3, R: 4, Q: 5,
};
export const draw = (gui) => {
    const {board, turn} = gui.state;
    for (let y = 0; y < 8; ++y) {
        for (let x = 0; x < 8; ++x) {
            const div = gui.board_divs[y][x];
            div.className = '';
            div.classList.add("square");
            div.classList.add(((x + y) % 2) ? "light" : "dark");
            const p = board[y][x];
            if (p != '.') { div.classList.add(p); }
            if ((p_2_type(p) == 'K') &&
                (gui.status != "normal") &&
                ((gui.status == "stalemate") || (p_2_color(p) == turn))
            ) {
                div.classList.add(gui.status);
            }
        }
    }
    const pieces = {
        p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
        P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1,
    };
    for (let y = 0; y < 8; ++y) {
        for (let x = 0; x < 8; ++x) {
            const p = board[y][x];
            const c = p_2_color(p);
            if (p == '.') { continue; }
            if (pieces[p] == 0) {
                pieces[(c == 'w') ? 'P' : p] -= 1;
            } else {
                pieces[p] -= 1;
            }
        }
    }
    const taken = {w: [], b: []};
    for (const [p, k] of Object.entries(pieces)) {
        const c = p_2_color(p);
        for (let i = 0; i < k; ++i) {
            taken[c].push(p);
        }
    }
    for (const c of ['w', 'b']) {
        taken[c].sort((a, b) => ORDER[b] - ORDER[a]);
    }
    for (const c of ['w', 'b']) {
        for (let i = 0; i < 16; ++i) {
            gui.taken_divs[c][i].className = '';
            gui.taken_divs[c][i].classList.add("taken");
        }
        for (let i = 0; i < taken[c].length; ++i) {
            const p = taken[c][i];
            gui.taken_divs[c][i].classList.add(p);
        }
    }
    if (gui.active != undefined) {
        const [x, y] = gui.active;
        if (gui.promotion) {
            gui.board_divs[y][x].classList.add("move");
        } else {
            gui.board_divs[y][x].classList.add("active");
            for (const move of gui.moves[y][x]) {
                const [type, [dx, dy]] = move;
                gui.board_divs[dy][dx].classList.add(
                    (type == 'x') ? "take" : "move");
            }
        }
    }
    gui.data.value = state_2_FEN(gui.state);
    if (gui.history.length > 0) {
        const [state, move] = gui.history[gui.history.length - 1];
        gui.game.value = board_move_2_alg(state, move, gui.state);
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
