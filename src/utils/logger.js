const isDev = import.meta.env.DEV;

export const log   = (...args) => { if (isDev) console.log(...args); };
export const warn  = (...args) => { if (isDev) console.warn(...args); };
export const error = (...args) => { if (isDev) console.error(...args); };

export default { log, warn, error };
