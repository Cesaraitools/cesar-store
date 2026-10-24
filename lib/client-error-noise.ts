export type ClientErrorNoiseContext = {
  column?: number;
  kind?: string;
  line?: number;
  source?: string;
};

export type ClientErrorNoiseDetails = {
  message: string;
  stack?: string;
};

function isUnattributableScriptError(
  details: ClientErrorNoiseDetails,
  context: ClientErrorNoiseContext
) {
  const normalizedMessage = details.message.trim().replace(/\.$/, "");

  return (
    context.kind === "error" &&
    normalizedMessage === "Script error" &&
    !context.source &&
    !context.line &&
    !context.column
  );
}

export function isKnownClientErrorNoise(
  details: ClientErrorNoiseDetails,
  context: ClientErrorNoiseContext = {}
) {
  const stack = details.stack ?? "";
  const combined = `${details.message}\n${stack}`;

  return (
    isUnattributableScriptError(details, context) ||
    (/window\.webkit\.messageHandlers/.test(details.message) &&
      /sendDataToNative|app:\/\//.test(stack)) ||
    (details.message === "Error invoking postMessage: Java object is gone" &&
      /navigation_performance_logger_android/.test(stack)) ||
    (/Cannot read properties of null \(reading '(document|live)'\)/.test(
      details.message
    ) && /panel\.js|vendors-async\.js/.test(stack)) ||
    (/Failed to execute 'selectNode' on 'Range'/.test(details.message) &&
      /_next-live\/feedback/.test(stack)) ||
    (/Cannot read properties of undefined \(reading 'getReader'\)/.test(
      details.message
    ) && /ext:core\/01_core\.js|<script>/.test(stack)) ||
    /chrome-extension:|moz-extension:/.test(combined)
  );
}
