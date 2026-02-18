export const last = (A) => A[A.length - 1];

export const append_el = (tag, par, attributes = {}) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attributes)) { el[k] = v; }
    par.appendChild(el);
    return el;
};
