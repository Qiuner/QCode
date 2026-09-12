const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const revealItems = document.querySelectorAll('.reveal')
if (reduceMotion) revealItems.forEach(item => item.classList.add('visible'))
else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target) }
    })
  }, { threshold: 0.14 })
  revealItems.forEach(item => observer.observe(item))
}
