/**
 * Frontend unit tests for the shared utilities (node:test, no new packages).
 *
 *   npm run test:utils
 *
 * Node strips the TypeScript types on import, so the same files the app uses
 * are tested directly.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { toPersianDigits } from '../src/utils/persianDigits.ts'
import { apiErrorMessage, firstError, getFieldErrors } from '../src/utils/apiError.ts'
import { toJalali, toJalaliMonth } from '../src/utils/jalali.ts'
import { bmiOf, changeSinceStart, formatChange, niceTicks, normalize } from '../src/utils/progress.ts'

const drfError = (data) => ({ response: { data } })

test('toPersianDigits converts every ASCII digit', () => {
  assert.equal(toPersianDigits(1234567890), '۱۲۳۴۵۶۷۸۹۰')
  assert.equal(toPersianDigits('برنامه 12'), 'برنامه ۱۲')
})

test('apiErrorMessage prefers detail, then field messages', () => {
  assert.equal(apiErrorMessage(drfError({ detail: 'توکن نامعتبر است' })), 'توکن نامعتبر است')
  assert.equal(apiErrorMessage(drfError({ username: ['این نام کاربری قبلاً ثبت شده است.'] })), 'این نام کاربری قبلاً ثبت شده است.')
  assert.equal(apiErrorMessage(drfError('خطای متنی')), 'خطای متنی')
  assert.equal(apiErrorMessage(new Error('boom'), 'پیش‌فرض'), 'پیش‌فرض')
})

test('getFieldErrors maps DRF field errors, including nested ones', () => {
  const errors = getFieldErrors(
    drfError({
      username: ['این نام کاربری قبلاً ثبت شده است.'],
      password: ['رمز عبور کوتاه است.'],
      profile: { phone: ['شماره نامعتبر است.'] },
    }),
  )
  assert.deepEqual(errors, {
    username: 'این نام کاربری قبلاً ثبت شده است.',
    password: 'رمز عبور کوتاه است.',
    profile: 'شماره نامعتبر است.',
  })
  assert.equal(firstError(errors), 'این نام کاربری قبلاً ثبت شده است.')
  assert.deepEqual(getFieldErrors(new Error('no response')), {})
})

test('Jalali formatting keeps Persian digits and month names', () => {
  assert.equal(toJalali('2026-03-21'), '۱ فروردین ۱۴۰۵')
  assert.equal(toJalaliMonth('2026-03-21'), 'فروردین ۱۴۰۵')
})

test('bmiOf needs both weight and a positive height', () => {
  assert.equal(bmiOf(85, 180), 26.2)
  assert.equal(bmiOf(85, null), null)
  assert.equal(bmiOf(null, 180), null)
  assert.equal(bmiOf(85, 0), null)
})

test('changeSinceStart reports last minus first and stays null below 2 points', () => {
  assert.equal(changeSinceStart([90, 88, 85.5]), -4.5)
  assert.equal(changeSinceStart([80]), null)
  assert.equal(changeSinceStart([]), null)
  assert.equal(changeSinceStart([70, 70]), 0)
})

test('niceTicks covers the data range with evenly spaced round ticks', () => {
  const ticks = niceTicks(83.4, 91.2, 4)
  assert.ok(ticks.length >= 2)
  assert.ok(ticks[0] <= 83.4)
  assert.ok(ticks[ticks.length - 1] >= 91.2)
  const step = ticks[1] - ticks[0]
  for (let i = 2; i < ticks.length; i += 1) {
    assert.ok(Math.abs((ticks[i] - ticks[i - 1]) - step) < 1e-9)
  }
  // A single value must still produce a readable axis.
  const flat = niceTicks(80, 80)
  assert.ok(flat[0] < 80 && flat[flat.length - 1] > 80)
})

test('normalize maps values into 0..1 and survives a zero range', () => {
  assert.equal(normalize(5, 0, 10), 0.5)
  assert.equal(normalize(10, 0, 10), 1)
  assert.equal(normalize(7, 7, 7), 0.5)
})

test('formatChange renders Persian units and the direction sign', () => {
  assert.equal(formatChange(-2.5, 'کیلوگرم'), '−2.5 کیلوگرم')
  assert.equal(formatChange(1.2, 'کیلوگرم'), '+1.2 کیلوگرم')
  assert.equal(formatChange(0, 'کیلوگرم'), 'بدون تغییر')
  assert.equal(formatChange(null, 'کیلوگرم'), '—')
})
