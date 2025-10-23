import EventEmitter from "node:events";
import NativeWebView, { HINT, type NativeWebViewEvents, type Size } from "./NativeWebView";

interface WebViewAppEvents {
  "window-all-closed": [];
}

const app = new EventEmitter<WebViewAppEvents>();

const instances = new Set<WebView>();

function onDestroy(webview: WebView) {
  if (instances.size === 0) return;
  instances.delete(webview);
  if (instances.size === 0) {
    app.emit("window-all-closed");
  }
}

function serializeError(error: any) {
  if (typeof error !== "object" || error === null) return error;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      line: (error as any).line,
      column: (error as any).column,
      stack: error.stack,
      cause: error.cause,
    };
  }
  return error;
}

type EvaluationCallback = (error: Error | null, result?: any) => void;

class WebView extends EventEmitter<NativeWebViewEvents> {
  readonly native = new NativeWebView();
  readonly bindings = new Map<string, (...args: any[]) => any>();
  private readonly pendingEvals = new Map<string, EvaluationCallback>();

  constructor() {
    super();

    this.bindings.set("__evalReply", (requestId: string, error: any, result: any) => {
      const callback = this.pendingEvals.get(requestId);
      if (!callback) return;
      this.pendingEvals.delete(requestId);

      if (error) callback(Object.assign(new Error(error.message), error));
      else callback(null, result);
    });

    this.native
      .on("create", () => {
        instances.add(this);
        this.emit("create");
      })
      .on("closed", () => {
        this.emit("closed");
      })
      .on("destroy", () => {
        this.emit("destroy");
        for (const cb of this.pendingEvals.values()) cb(new Error("WebView destroyed"));
        this.pendingEvals.clear();

        onDestroy(this);
      });
  }

  create(debug: boolean = false): this {
    if (this.native.handle !== null) return this;
    this.native.create(debug);

    this.native.bind("__call", async (seq, req) => {
      const [methodName, ...methodArgs] = JSON.parse(req);
      const method = this.bindings.get(methodName);

      const timeoutId = setTimeout(() => cb?.(false, new Error("Timeout")), 60e3);
      let cb: ((success: boolean, result: any) => void) | null = (
        success: boolean,
        result: any
      ) => {
        clearTimeout(timeoutId);
        cb = null;
        let serialized;

        if (success) {
          serialized = [null, result];
        } else {
          serialized = [serializeError(result)];
        }

        try {
          serialized = JSON.stringify(serialized);
        } catch (e) {
          serialized = JSON.stringify([serializeError(e)]);
          success = false;
        }

        this.native.return(seq, success ? 0 : 1, serialized);
      };

      let result: any;
      let success = false;
      if (method) {
        try {
          result = await Promise.resolve(method(...methodArgs));
          success = true;
        } catch (err) {
          result = err ?? new Error("Unknown error in bound method");
        }
      } else {
        result = new ReferenceError(`'${methodName}' is not defined`);
      }

      cb?.(success, result);
    });

    this.native.runNonBlocking();
    return this;
  }

  destroy(): void {
    this.native.destroy();
  }

  set title(value: string) {
    this.native.set_title(value);
  }

  set size(value: Size) {
    this.native.set_size(value);
  }

  set html(value: string) {
    this.native.set_html(value);
  }

  set url(value: string) {
    this.native.navigate(value);
  }

  eval<T extends any = any>(script: string | (() => T), timeoutMs = 60e3): Promise<T> {
    if (this.native.handle === null) throw new Error("WebView handle is null");

    const requestId = Math.random().toString(36).slice(2);
    const evalCode = script instanceof Function ? script.toString() : `async ()=>{${script};}`;
    const executionScript = `
        Promise.resolve((${evalCode})()).then(
          (result) => __call("__evalReply", "${requestId}", null, result),
          (error) => {
            console.error(error);
            if (typeof error === "object" && error !== null && error instanceof Error)
              error = {
                name: error.name,
                message: error.message,
                line: error.line,
                column: error.column,
                stack: error.stack,
                cause: error.cause,
              };
            __call("__evalReply", "${requestId}", error);
          }
        );
    `;

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => evaluationCallback(new Error("Timeout")), timeoutMs);
      const evaluationCallback: EvaluationCallback = (error, result) => {
        clearTimeout(timeoutId);
        if (!this.pendingEvals.has(requestId)) return;
        this.pendingEvals.delete(requestId);
        if (error) reject(error);
        else resolve(result);
      };

      this.pendingEvals.set(requestId, evaluationCallback);
      this.native.eval(executionScript);
    });
  }
}

export default new Proxy(WebView, {
  get(_, key) {
    const target = Reflect.has(app, key) ? app : WebView;
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  },
  construct(_, args) {
    return Reflect.construct(WebView, args);
  },
}) as typeof WebView & EventEmitter<WebViewAppEvents>;

export { HINT };

export type { Size };
