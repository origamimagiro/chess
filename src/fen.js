// https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation

export const x_2_f = (x) => String.fromCodePoint('a'.charCodeAt(0) + x);
const f_2_x = (f) => f.charCodeAt(0) - 'a'.charCodeAt(0);
export const y_2_r = (y) => 8 - y;
const r_2_y = (r) => 8 - Number(r);
export const xy_2_sq = (x, y) => [x_2_f(x), y_2_r(y)].join("");
const sq_2_xy = (sq) => [f_2_x(sq[0]), r_2_y(sq[1])];

const FENcastle_2_castle = (c) => { return {
    w: Array.from("KQ").map(v => c.includes(v)),
    b: Array.from("kq").map(v => c.includes(v)),
}; }

const castle_2_FENcastle = (castle) => {
    const c = [
        castle.w[0] ? 'K' : '', castle.w[1] ? 'Q' : '',
        castle.b[0] ? 'k' : '', castle.b[1] ? 'q' : '',
    ].join("");
    return (c == '') ? '-' : c;
}

export const FEN_2_state = (FEN) => {
    const board = Array(8).fill().map(() => Array(8).fill("."));
    const components = FEN.split(" ");
    if (components.length != 6) {
        console.log("FEN does not have correct number of fields");
        return;
    }
    const [B, turn, c, e, h, m] = components;
    if ((turn != 'b') && (turn != 'w')) {
        console.log("FEN turn field malformed");
        return;
    }
    if ((e != '-') && ((e.length != 2) ||
        (e[0] < 'a') || (e[0] > 'h') || (e[1] < '1') || (e[1] > '8')
    )) {
        console.log("FEN enpassant field malformed");
        return;
    }
    const enpassant = (e == "-") ? undefined : sq_2_xy(e);
    if (c != '-') {
        for (const a of c) {
            if (!("KQkq".includes(a))) {
                console.log("FEN castle field malformed");
                return;
            }
        }
    }
    const castle = FENcastle_2_castle(c);
    const halfmove = parseInt(h), move = parseInt(m);
    if (isNaN(halfmove)) {
        console.log("FEN halfmove field malformed");
        return;
    }
    if (isNaN(move)) {
        console.log("FEN move field malformed");
        return;
    }
    const R = B.split("/");
    if (R.length != 8) {
        console.log("FEN board data does not have 8 rows");
        return;
    }
    for (let i = 0; i < 8; ++i) {
        let j = 0;
        for (const c of R[i]) {
            if (('0' <= c) && (c <= '9')) {
                j += (c - '0');
            } else if ('PpNnBbRrQqKk'.includes(c)){
                board[i][j] = c;
                ++j;
            } else {
                console.log("FEN board data contains invalid character");
                return;
            }
        }
        if (j != 8) {
            console.log("FEN board row data too much or not enough");
            return;
        }
    }
    return {board, turn, castle, enpassant, halfmove, move};
}

export const state_2_FEN = (state) => {
    const {board, turn, castle, enpassant, halfmove, move} = state;
    const e = (!enpassant) ? '-' : xy_2_sq(enpassant[0], enpassant[1]);
    const c = castle_2_FENcastle(castle);
    const B = [];
    for (let i = 0; i < 8; ++i) {
        if (i > 0) { B.push("/"); }
        let k = 0;
        for (let j = 0; j < 8; ++j) {
            const b = board[i][j];
            if (b == '.') {
                ++k;
            } else {
                if (k != 0) { B.push(k); k = 0; }
                B.push(b);
            }
        }
        if (k != 0) { B.push(k); }
    }
    return [B.join(""), turn, c, e, halfmove, move].join(" ");
}

