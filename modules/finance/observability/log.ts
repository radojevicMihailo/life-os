type LogLevel = "error" | "info" | "warn";

export type OperationalContext = Record<string, unknown> & {
  durationMs?: number;
  errorCode?: string;
  provider?: string;
  requestId?: string;
  status?: string;
};

export interface OperationalLogger {
  error(event: string, context?: OperationalContext): void;
  info(event: string, context?: OperationalContext): void;
  warn(event: string, context?: OperationalContext): void;
}

interface LoggerOptions {
  now?: () => Date;
  write?: (line: string) => void;
}

const EVENT_NAME = /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)*$/;

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sanitizeContext(context: OperationalContext) {
  const durationMs =
    typeof context.durationMs === "number" &&
    Number.isFinite(context.durationMs) &&
    context.durationMs >= 0
      ? Math.round(context.durationMs)
      : undefined;

  return {
    requestId: stringValue(context.requestId),
    durationMs,
    provider: stringValue(context.provider),
    status: stringValue(context.status),
    errorCode: stringValue(context.errorCode),
  };
}

export function createOperationalLogger(options: LoggerOptions = {}): OperationalLogger {
  const now = options.now ?? (() => new Date());
  const write = options.write ?? ((line: string) => process.stdout.write(`${line}\n`));

  function log(level: LogLevel, event: string, context: OperationalContext = {}) {
    if (!EVENT_NAME.test(event)) {
      throw new Error("invalid_operational_event_name");
    }

    const safeContext = sanitizeContext(context);
    write(
      JSON.stringify({
        timestamp: now().toISOString(),
        level,
        event,
        ...Object.fromEntries(
          Object.entries(safeContext).filter(([, value]) => value !== undefined),
        ),
      }),
    );
  }

  return {
    error: (event, context) => log("error", event, context),
    info: (event, context) => log("info", event, context),
    warn: (event, context) => log("warn", event, context),
  };
}

export const operationalLogger = createOperationalLogger();
