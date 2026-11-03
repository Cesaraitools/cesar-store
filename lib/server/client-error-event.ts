export type ClientStackFrame = {
  filename: string;
  function?: string;
  lineno: number;
  colno: number;
};

const MINIFIED_REACT_ERROR_PATTERN = /Minified React error #(\d+)\b/;
const CHROME_STACK_FRAME_PATTERN =
  /^at\s+(?:(.*?)\s+\()?(.+):(\d+):(\d+)\)?$/;
const SAFARI_STACK_FRAME_PATTERN = /^(.*?)@(.+):(\d+):(\d+)$/;

export function getMinifiedReactErrorCode(message: string) {
  return message.match(MINIFIED_REACT_ERROR_PATTERN)?.[1] ?? null;
}

export function getClientErrorFingerprint(message: string) {
  const reactErrorCode = getMinifiedReactErrorCode(message);
  return reactErrorCode
    ? ["client-react-error", reactErrorCode]
    : undefined;
}

function parseStackFrame(line: string): ClientStackFrame | null {
  const normalizedLine = line.trim();
  if (!normalizedLine) return null;

  const chromeMatch = normalizedLine.match(CHROME_STACK_FRAME_PATTERN);
  if (chromeMatch) {
    return {
      function: chromeMatch[1] || undefined,
      filename: chromeMatch[2],
      lineno: Number(chromeMatch[3]),
      colno: Number(chromeMatch[4]),
    };
  }

  const safariMatch = normalizedLine.match(SAFARI_STACK_FRAME_PATTERN);
  if (!safariMatch) return null;

  return {
    function: safariMatch[1] || undefined,
    filename: safariMatch[2],
    lineno: Number(safariMatch[3]),
    colno: Number(safariMatch[4]),
  };
}

export function parseClientStack(stack?: string) {
  if (!stack) return [];

  return stack
    .split(/\r?\n/)
    .map(parseStackFrame)
    .filter((frame): frame is ClientStackFrame => frame !== null)
    .slice(0, 50)
    .reverse();
}
