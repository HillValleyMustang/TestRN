/// <reference types="https://raw.githubusercontent.com/denoland/deno/main/cli/tsc/dts/lib.deno.ns.d.ts" />

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined;
    }
  }
}

export {};