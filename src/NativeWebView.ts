import * as BunFFI from "bun:ffi";
import EventEmitter from "node:events";
import lib from "./lib";

export interface Size {
  width: number;
  height: number;
  hint: HINT;
}

export const enum HINT {
  NONE,
  MIN,
  MAX,
  FIXED,
}

interface NativeWebViewEvents {
  create: [];
  closed: [];
  destroy: [];
}

export default class NativeWebView extends EventEmitter<NativeWebViewEvents> {
  handle: BunFFI.Pointer | null = null;
  readonly callbacks = new Map<string, BunFFI.JSCallback>();

  constructor() {
    super();
  }

  create(debug: boolean = false, window: BunFFI.Pointer | null = null): void {
    if (this.handle !== null) return;
    this.handle = lib.symbols.webview_create(+debug, window);
    if (this.handle === null) throw new Error("Failed to create native webview handle.");
    this.emit("create");
  }

  destroy(emit: boolean = true): void {
    if (this.handle === null) return;
    if (emit) this.emit("destroy");
    for (const [cbName, cb] of this.callbacks.entries()) {
      this.unbind(cbName);
      cb.close();
    }
    this.callbacks.clear();
    lib.symbols.webview_terminate(this.handle);
    lib.symbols.webview_destroy(this.handle);
    this.handle = null;
  }

  run() {
    lib.symbols.webview_run(this.handle);
    this.destroy();
  }

  //terminate;

  //dispatch;

  get_window() {
    return lib.symbols.webview_get_window(this.handle);
  }

  //get_native_handle;

  set_title(title: string): void {
    lib.symbols.webview_set_title(this.handle, lib.encodeCString(title));
  }

  set_size(size: Size): void {
    lib.symbols.webview_set_size(this.handle, size.width, size.height, size.hint);
  }

  navigate(url: string): void {
    lib.symbols.webview_navigate(this.handle, lib.encodeCString(url));
  }

  set_html(html: string): void {
    lib.symbols.webview_set_html(this.handle, lib.encodeCString(html));
  }

  init(source: string): void {
    lib.symbols.webview_init(this.handle, lib.encodeCString(source));
  }

  eval(source: string): void {
    lib.symbols.webview_eval(this.handle, lib.encodeCString(source));
  }

  bind(
    name: string,
    callback: (seq: string, req: string, arg: BunFFI.Pointer | null) => void,
    arg: BunFFI.Pointer | null = null
  ) {
    const cb = new BunFFI.JSCallback(
      (seqPtr: BunFFI.Pointer, reqPtr: BunFFI.Pointer, arg: BunFFI.Pointer | null) => {
        const seq: any = seqPtr ? new BunFFI.CString(seqPtr) : "";
        const req: any = reqPtr ? new BunFFI.CString(reqPtr) : "";
        callback(seq, req, arg);
      },
      { args: ["ptr", "ptr", "ptr"], returns: "void" }
    );
    this.callbacks.set(name, cb);
    lib.symbols.webview_bind(this.handle, lib.encodeCString(name), cb.ptr, arg);
  }

  unbind(name: string) {
    lib.symbols.webview_unbind(this.handle, lib.encodeCString(name));
    this.callbacks.get(name)?.close();
    this.callbacks.delete(name);
  }

  return(seq: string, status: number, result: string) {
    lib.symbols.webview_return(
      this.handle,
      lib.encodeCString(seq),
      status,
      lib.encodeCString(result)
    );
  }

  pump(block: boolean = false): boolean {
    return !!lib.symbols.webview_pump_msgloop(this.handle, +block);
  }

  runNonBlocking(): void {
    const step = () => {
      if (this.handle) {
        if (this.pump(false)) {
          setImmediate(step);
        } else {
          this.emit("closed");
          this.destroy(false);
        }
      }
    };
    step();
  }
}
