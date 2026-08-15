/**
 * Ramify first-run onboarding helper.
 *
 * Framework-free and dependency-free: works with nothing but a DOM element.
 * This file is NOT loaded by landing.html - it exists for the app UI
 * (index.html / app.js) to import and mount inside the app itself.
 *
 * Usage from app.js:
 *
 *   import { shouldShowOnboarding, mountOnboarding } from './landing.js'
 *
 *   if (shouldShowOnboarding()) {
 *     const onboarding = mountOnboarding(document.getElementById('onboarding-root'), {
 *       onDone: () => {
 *         // called once, whether the user finished all 3 steps or skipped.
 *         // e.g. hide/remove #onboarding-root, focus the board, etc.
 *       }
 *     })
 *     // optional: onboarding.close() to dismiss it programmatically later.
 *   }
 *
 * mountOnboarding() renders into whatever container element you give it, so
 * the host page decides whether that container is an overlay, a slide-down
 * banner, or an inline panel - this module only owns the 3-step content and
 * its own scoped styles (injected once into <head>, namespaced so they
 * cannot collide with the host app's own CSS).
 */

const STORAGE_KEY = 'ramify:onboarding:v1'
const STYLE_ID = 'ramify-onboarding-styles'

const STEPS = [
  {
    title: 'Import a game you already played',
    body: 'Paste a game from Lichess or Chess.com. Ramify reviews it exactly like one played inside the app, no reformatting needed.',
  },
  {
    title: 'Or play one right now',
    body: 'No import needed. Open Play, pick a side and a level, and make your first move against Stockfish.',
  },
  {
    title: 'See your first review',
    body: 'Every game gets scored move by move, with the real reason behind your best and worst moments, then turned into drills built just for you.',
  },
]

function readFlag() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage disabled or unavailable (private mode, locked-down browser, etc).
    return 'seen'
  }
}

function writeFlag() {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'seen')
  } catch {
    // Fail soft: nothing to persist to, the caller still gets onDone().
  }
}

/**
 * True only until the welcome flow has been shown once (or skipped once).
 * Safe to call on every page load; backed by localStorage under the key
 * "ramify:onboarding:v1". If localStorage is unavailable, this returns
 * false so a broken environment never shows a popup it cannot dismiss
 * permanently.
 */
export function shouldShowOnboarding() {
  return readFlag() !== 'seen'
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.ramify-onb {
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
  background: var(--card, #ffffff);
  color: var(--foreground, #0a0a0a);
  border: 1px solid var(--border, #e5e5e5);
  border-radius: var(--radius-lg, 0.5rem);
  padding: 20px 22px;
  max-width: 440px;
  box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
}
.ramify-onb * { box-sizing: border-box; }
.ramify-onb-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.ramify-onb-step-label { font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--muted-foreground, #737373); margin: 0; }
.ramify-onb-skip {
  background: transparent;
  border: 1px solid var(--border, #e5e5e5);
  color: var(--muted-foreground, #737373);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.ramify-onb-skip:hover { color: var(--foreground, #0a0a0a); border-color: var(--muted-foreground, #737373); }
.ramify-onb-heading { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: var(--foreground, #0a0a0a); }
.ramify-onb-body { font-size: 14.5px; line-height: 1.55; color: var(--muted-foreground, #737373); margin: 0 0 18px; }
.ramify-onb-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.ramify-onb-dots { display: flex; gap: 6px; }
.ramify-onb-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border, #e5e5e5); display: inline-block; }
.ramify-onb-dot.is-active { background: var(--foreground, #0a0a0a); }
.ramify-onb-actions { display: flex; gap: 8px; }
.ramify-onb-back, .ramify-onb-next {
  border-radius: var(--radius-md, 0.375rem);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--border, #e5e5e5);
}
.ramify-onb-back { background: transparent; color: var(--muted-foreground, #737373); }
.ramify-onb-back:hover { color: var(--foreground, #0a0a0a); }
.ramify-onb-back[hidden] { display: none; }
.ramify-onb-next { background: var(--primary, #171717); border-color: var(--primary, #171717); color: var(--primary-foreground, #fafafa); }
.ramify-onb-next:hover { filter: brightness(1.25); }
.ramify-onb-skip:focus-visible,
.ramify-onb-back:focus-visible,
.ramify-onb-next:focus-visible {
  outline: 2px solid var(--ring, #0a0a0a);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .ramify-onb, .ramify-onb * { transition: none !important; animation: none !important; }
}
`
  document.head.appendChild(style)
}

/**
 * Mounts the 3-step welcome flow into `container` (replacing its contents).
 * Calls `onDone()` exactly once, whether the user completes all 3 steps,
 * clicks Skip, or presses Escape - in every case the flow is marked seen
 * first, so shouldShowOnboarding() returns false afterwards.
 *
 * Returns `{ close() }` so the host can dismiss it programmatically (for
 * example if the user starts playing a move before finishing the steps),
 * or `null` if `container` was not provided.
 */
export function mountOnboarding(container, { onDone } = {}) {
  if (!container) return null

  injectStyles()

  let step = 0
  let done = false
  const previouslyFocused = document.activeElement

  container.innerHTML = ''

  const card = document.createElement('div')
  card.className = 'ramify-onb'
  card.setAttribute('role', 'region')
  card.setAttribute('aria-label', 'Welcome to Ramify')

  const top = document.createElement('div')
  top.className = 'ramify-onb-top'

  const stepLabel = document.createElement('p')
  stepLabel.className = 'ramify-onb-step-label'

  const skipBtn = document.createElement('button')
  skipBtn.type = 'button'
  skipBtn.className = 'ramify-onb-skip'
  skipBtn.textContent = 'Skip'
  skipBtn.setAttribute('aria-label', 'Skip the welcome guide')

  top.appendChild(stepLabel)
  top.appendChild(skipBtn)

  const heading = document.createElement('h2')
  heading.className = 'ramify-onb-heading'
  heading.setAttribute('tabindex', '-1')

  const body = document.createElement('p')
  body.className = 'ramify-onb-body'

  const bottom = document.createElement('div')
  bottom.className = 'ramify-onb-bottom'

  const dots = document.createElement('div')
  dots.className = 'ramify-onb-dots'
  dots.setAttribute('aria-hidden', 'true')

  const actions = document.createElement('div')
  actions.className = 'ramify-onb-actions'

  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'ramify-onb-back'
  backBtn.textContent = 'Back'

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = 'ramify-onb-next'

  actions.appendChild(backBtn)
  actions.appendChild(nextBtn)
  bottom.appendChild(dots)
  bottom.appendChild(actions)

  card.appendChild(top)
  card.appendChild(heading)
  card.appendChild(body)
  card.appendChild(bottom)

  function finish() {
    if (done) return
    done = true
    writeFlag()
    document.removeEventListener('keydown', onKeydown)
    if (container.contains(card)) container.removeChild(card)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    if (typeof onDone === 'function') onDone()
  }

  function onKeydown(event) {
    if (event.key === 'Escape') finish()
  }

  function render() {
    const current = STEPS[step]
    stepLabel.textContent = `Step ${step + 1} of ${STEPS.length}`
    heading.textContent = current.title
    body.textContent = current.body
    backBtn.hidden = step === 0
    nextBtn.textContent = step === STEPS.length - 1 ? 'Start playing' : 'Next'
    dots.innerHTML = ''
    STEPS.forEach((_, i) => {
      const dot = document.createElement('span')
      dot.className = 'ramify-onb-dot' + (i === step ? ' is-active' : '')
      dots.appendChild(dot)
    })
    heading.focus()
  }

  skipBtn.addEventListener('click', finish)
  backBtn.addEventListener('click', () => {
    if (step > 0) {
      step -= 1
      render()
    }
  })
  nextBtn.addEventListener('click', () => {
    if (step < STEPS.length - 1) {
      step += 1
      render()
    } else {
      finish()
    }
  })
  document.addEventListener('keydown', onKeydown)

  container.appendChild(card)
  render()

  return { close: finish }
}
