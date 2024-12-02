/// <reference lib="dom" />
import '@testing-library/jest-dom'

declare module 'expect' {
  interface Matchers<R> {
    toBeInTheDocument(): R
    toBeVisible(): R
    toBeDisabled(): R
    toHaveValue(value: unknown): R
  }
}
