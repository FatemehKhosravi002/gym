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
