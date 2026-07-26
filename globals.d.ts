// Declaración global para permitir imports de CSS plano (side-effect imports),
// como `import './globals.css'` en app/layout.tsx.
// Next.js ya tipa los CSS Modules (*.module.css) pero no los CSS "globales".
declare module '*.css'
