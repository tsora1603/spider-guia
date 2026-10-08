export default {
  // Caminhos relativos mantêm o mesmo build publicável em Netlify e GitHub Pages.
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true
  }
};
