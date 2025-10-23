# bun-webview

A modern, lightweight, and cross-platform library for creating **web-based GUIs for desktop applications** using the [Bun runtime](https://bun.sh). Build beautiful desktop applications with HTML, CSS, and JavaScript.

## ✨ Features

- **Cross-platform**: Works on Windows, macOS, and Linux
- **Lightweight**: Minimal dependencies, small footprint
- **Modern API**: TypeScript-first design with EventEmitter pattern
- **JavaScript bindings**: Call JavaScript functions from native code and vice versa
- **Single executable**: Compile your app into a standalone binary with Bun
- **Non-blocking**: Run your webview in a non-blocking manner

## 📦 Installation

```bash
bun add github:WhiteFox125/bun-webview
```

## 🚀 Quick Start

Create a simple "Hello World" application:

```typescript
import WebView, { HINT } from "bun-webview";

const webview = new WebView();
webview.create(true); // true for debug mode
webview.title = "My First Webview App";
webview.size = { width: 800, height: 600, hint: HINT.NONE };
webview.html = `
  <html>
    <body>
      <h1>Hello from bun v${Bun.version}!</h1>
    </body>
  </html>
`;
```

## 🔌 Advanced Usage

### JavaScript Bindings

Call JavaScript functions from your Bun application and vice versa:

```typescript
import WebView from "bun-webview";

const webview = new WebView();
webview.create();

// Bind a function to be called from JavaScript
webview.bindings.set("greet", (name) => {
  console.log(`Hello, ${name}!`);
  return `Welcome to bun-webview, ${name}!`;
});

webview.html = `
  <html>
    <body>
      <input type="text" id="name" placeholder="Enter your name">
      <button onclick="callGreet()">Greet</button>
      <p id="result"></p>
      <script>
        async function callGreet() {
          const name = document.getElementById('name').value;
          const result = await call('greet', name);
          document.getElementById('result').textContent = result;
        }
      </script>
    </body>
  </html>
`;
```

### Evaluate JavaScript in the Webview

Execute JavaScript code within the webview context and get the results:

```typescript
import WebView from "bun-webview";

const webview = new WebView();
webview.create();
webview.html = "<html><body><h1 id='title'>Hello</h1></body></html>";

// Change title and get the new value
webview
  .eval(`return document.getElementById('title').textContent = 'Hello from Bun!'`)
  .then((result) => console.log("New title:", result)); // "Hello from Bun!"
```

### Handling Window Events

```typescript
import WebView from "bun-webview";

const webview = new WebView();

webview.on("create", () => {
  console.log("Window created");
});

webview.on("closed", () => {
  console.log("Window closed");
});

webview.on("destroy", () => {
  console.log("Window destroyed");
});

// Handle all windows closed
WebView.on("window-all-closed", () => {
  console.log("All windows closed, exiting application");
  process.exit(0);
});

webview.create();
webview.html = "<html><body><h1>Hello World</h1></body></html>";
```

## 📦 Creating a Single Executable

Bun allows you to compile your application into a single executable:

```bash
bun build --compile --minify --sourcemap ./app.ts --outfile myapp
```

### Hide Terminal Window (Windows)

By default, a terminal window will open when running the executable. To hide it:

```bash
.\node_modules\bun-webview\scripts\hidecmd.bat myapp.exe
```

## 🤝 Credits

This project is built upon the excellent work of:

- [webview](https://github.com/exoRift/webview) - The core native library
- [webview-bun](https://github.com/tr1ckydev/webview-bun) - Initial Bun implementation

---

> **Note**: This is a community project and is not affiliated with the Bun and WebView projects or its maintainers.

> bun-webview © 2025 - Created with ❤️ by WhiteFox125
