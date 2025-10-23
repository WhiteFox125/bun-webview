import * as BunFFI from "bun:ffi";

let libPath;

if (process.env.WEBVIEW_PATH) {
  libPath = { default: process.env.WEBVIEW_PATH };
} else if (process.platform === "win32") {
  //@ts-expect-error
  libPath = await import("../build/webview.dll");
} else if (process.platform === "linux") {
  libPath = await import(`../build/webview-${process.arch}.so`);
} else if (process.platform === "darwin") {
  //@ts-expect-error
  libPath = await import("../build/webview.dylib");
} else {
  throw new Error(`Unsupported platform: ${process.platform}`);
}

const lib = BunFFI.dlopen(libPath.default, {
  webview_create: { args: ["i32", "ptr"], returns: "ptr" },
  webview_destroy: { args: ["ptr"], returns: "void" },
  webview_run: { args: ["ptr"], returns: "void" },
  webview_terminate: { args: ["ptr"], returns: "void" },
  webview_dispatch: { args: ["ptr", "function"], returns: "void" },
  webview_get_window: { args: ["ptr"], returns: "ptr" },
  //webview_get_native_handle: { args: ["ptr", "ptr?"], returns: "ptr" },
  webview_set_title: { args: ["ptr", "ptr"], returns: "void" },
  webview_set_size: { args: ["ptr", "i32", "i32", "i32"], returns: "void" },
  webview_navigate: { args: ["ptr", "ptr"], returns: "void" },
  webview_set_html: { args: ["ptr", "ptr"], returns: "void" },
  webview_init: { args: ["ptr", "ptr"], returns: "void" },
  webview_eval: { args: ["ptr", "ptr"], returns: "void" },
  webview_bind: { args: ["ptr", "ptr", "function", "ptr"], returns: "void" },
  webview_unbind: { args: ["ptr", "ptr"], returns: "void" },
  webview_pump_msgloop: { args: ["ptr", "i32"], returns: "i32" },
  webview_return: { args: ["ptr", "ptr", "i32", "ptr"], returns: "void" },
});

const encoder = new TextEncoder();

export default {
  symbols: lib.symbols,
  close: lib.close,
  encodeCString: (value: string) => BunFFI.ptr(encoder.encode(value + "\0")),
};
