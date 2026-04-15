/**
 * Ink ripple click effect composable.
 * Creates a radial ripple animation from the click point, styled like ink spreading.
 */
export function useInkRipple() {
  function createRipple(event) {
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    const ripple = document.createElement('span')
    ripple.className = 'ink-ripple'
    const size = Math.max(rect.width, rect.height) * 2
    ripple.style.width = size + 'px'
    ripple.style.height = size + 'px'
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px'
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px'
    el.appendChild(ripple)
    ripple.addEventListener('animationend', () => ripple.remove())
  }
  return { createRipple }
}
