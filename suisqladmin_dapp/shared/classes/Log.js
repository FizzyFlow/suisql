// const winston = require('winston');
// const Transport = winston.Transport;

const levels = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 4,
    };

const methods = {
        error: 'error',
        warn: 'warn',
        info: 'info',
        debug: 'log',
    };

let level = 'debug';

const log = (method, ...args) => {
    const val = levels[method];
    const mappedMethod = methods[method];

    if (val <= levels[level]) {
        // eslint-disable-next-line
        console[mappedMethod].apply(this, args);
    }
};
const error = (...args) => {
    args.unshift('error');
    log.apply(this, args);
};
const warn = (...args) => {
    args.unshift('warn');
    log.apply(this, args);
};
const info = (...args) => {
    args.unshift('info');
    log.apply(this, args);
};
const debug = (...args) => {
    args.unshift('debug');
    log.apply(this, args);
};

log.error = error;
log.warn = warn;
log.info = info;
log.debug = debug;

const stringToHash = function(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

const getRandomHSLColor = function(pseudoRandom) {
    const random = stringToHash(pseudoRandom) % 360;

    // Generate a random hue, fixed saturation and lightness
    const hue = Math.floor(random);
    const saturation = 100; // keep it fully saturated
    const lightness = 10; // standard lightness for bright colors
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const getContrastingHSLColor = function(hsl) {
    const hue = (parseInt(hsl.substring(4, hsl.indexOf(','))) + 180) % 360;
    const paleSaturation = 50; // lower saturation for a pale look
    const paleLightness = 85; // higher lightness for pale appearance
    return `hsl(${hue}, ${paleSaturation}%, ${paleLightness}%)`;
}

const tag = (name) => {
    const tagLog = (method, ...args) => {
        const color = getRandomHSLColor(name);
        const background = getContrastingHSLColor(color);

        args.unshift('color: '+color+'; font-style: italic; background-color: '+background+'; padding: 2px 10px;');
        args.unshift('%c'+name);
        args.unshift(method);
        log.apply(this, args);
    };
    
    return {
        warn: (...args) => { args.unshift('warn'); tagLog.apply(this, args); },
        info: (...args) => { args.unshift('info'); tagLog.apply(this, args); },
        debug: (...args) => { args.unshift('debug'); tagLog.apply(this, args); },
        error: (...args) => { args.unshift('error'); tagLog.apply(this, args); },
    };
};

log.tag = tag;

export default {
    log: log,
    warn: warn,
    info: info,
    debug: debug,
    error: error,

    tag: tag,
};