// Configuración de MathJax para renderizado de fórmulas LaTeX
window.MathJax = {
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']]
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea']
  }
};
