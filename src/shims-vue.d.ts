// Stopgap. vue-tsc's Volar layer does not register the .vue extension when run
// under Bun, so TypeScript drops every SFC from the program and `import App from
// './App.vue'` fails to resolve. This shim restores resolution.
//
// The cost is real: components typed this way are `any`, so `bun run typecheck`
// checks the .ts files and almost nothing inside a component. The fix is to run
// vue-tsc under Node, which is what CI should do. Delete this file when it does.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
