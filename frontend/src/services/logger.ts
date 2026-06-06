const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const CURRENT_LEVEL: LogLevel = import.meta.env.DEV ? "debug" : "warn";

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function format(level: LogLevel, module: string, message: string): string {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 23);
    return `${ts} | ${level.toUpperCase().padEnd(5)} | ${module} | ${message}`;
}

export function getLogger(module: string) {
    return {
        debug: (message: string, ...args: unknown[]) => {
            if (shouldLog("debug")) console.debug(format("debug", module, message), ...args);
        },
        info: (message: string, ...args: unknown[]) => {
            if (shouldLog("info")) console.info(format("info", module, message), ...args);
        },
        warn: (message: string, ...args: unknown[]) => {
            if (shouldLog("warn")) console.warn(format("warn", module, message), ...args);
        },
        error: (message: string, ...args: unknown[]) => {
            if (shouldLog("error")) console.error(format("error", module, message), ...args);
        },
    };
}