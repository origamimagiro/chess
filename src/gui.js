import { state_2_FEN } from "./fen.js";
import { p_2_color, p_2_type } from "./main.js";

export const append_el = (tag, par, attributes = {}) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attributes)) { el[k] = v; }
    par.appendChild(el);
    return el;
};

export const build_gui = () => {
    const B = document.body;
    const board = append_el("div", B, {id: "board"});
    const data = append_el("textarea", B, {id: "data"});
    const game = append_el("textarea", B, {id: "game"});
    game.disabled = true;
    const reset  = append_el("button", B, {id:  "reset", innerHTML:  "Reset"});
    const undo   = append_el("button", B, {id:   "undo", innerHTML:   "Undo"});
    const dump   = append_el("button", B, {id:   "dump", innerHTML:   "Dump"});
    const submit = append_el("button", B, {id: "submit", innerHTML: "Submit"});
    const gui = {state: undefined, history: [], map: new Map(), data, game,
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
    const lines = [];
    const w = 10;
    for (const [state, m] of gui.history) {
        const {turn, move} = state;
        const L = [];
        if ((turn == 'w') || (lines.length == 0)) { 
            L.push(`${move}. `.padStart(5));
            if (turn == 'b') { L.push(''.padEnd(w)); }
        }
        L.push(`${m[5]}`.padEnd(w));
        L.push((turn == 'w') ? "" : "\n");
        lines.push(L.join("")); 
    }
    gui.game.value = lines.join("");
    gui.game.scrollTop = gui.game.scrollHeight;
    gui.data.value = state_2_FEN(gui.state);
};
