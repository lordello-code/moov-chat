import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function err(message: string, code = 'ERROR', status = 400) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function unauthorized() {
  return err('Unauthorized', 'UNAUTHORIZED', 401)
}

export function forbidden() {
  return err('Forbidden', 'FORBIDDEN', 403)
}

export function notFound(resource = 'Resource') {
  return err(`${resource} not found`, 'NOT_FOUND', 404)
}
