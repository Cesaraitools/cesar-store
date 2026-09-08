type SentryLikeEvent = {
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          filename?: string;
        }>;
      };
    }>;
  };
};

function normalizeInjectedFilename(filename: string) {
  return filename.replace(/^app:\/\/\/?/, "");
}

export function isInjectedRuntimeStreamReaderNoise(event: SentryLikeEvent) {
  const exceptionValues = event.exception?.values ?? [];

  return exceptionValues.some((exception) => {
    const frames = exception.stacktrace?.frames ?? [];
    const filenames = frames.map((frame) =>
      normalizeInjectedFilename(frame.filename ?? "")
    );
    const hasAnonymousInjectedScript = filenames.includes("<script>");
    const hasExternalRuntimeFrame = filenames.includes("ext:core/01_core.js");

    return (
      exception.type === "TypeError" &&
      exception.value ===
        "Cannot read properties of undefined (reading 'getReader')" &&
      hasAnonymousInjectedScript &&
      hasExternalRuntimeFrame
    );
  });
}
