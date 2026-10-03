'use client'

import { sileo } from 'sileo'

export const notify = {
  success: (title: string, description?: string) => {
    return sileo.success({
      title,
      description,
      position: 'top-center',
    })
  },

  error: (title: string, description?: string) => {
    return sileo.error({
      title,
      description,
      position: 'top-center',
    })
  },

  warning: (title: string, description?: string) => {
    return sileo.warning({
      title,
      description,
      position: 'top-center',
    })
  },

  info: (title: string, description?: string) => {
    return sileo.info({
      title,
      description,
      position: 'top-center',
    })
  },

  // Acción con botón de confirmación/interacción
  action: (options: {
    title: string
    description?: string
    buttonText: string
    onAction: () => void
  }) => {
    return sileo.action({
      title: options.title,
      description: options.description,
      position: 'top-center',
      button: {
        title: options.buttonText,
        onClick: options.onAction,
      },
    })
  },

  // Envoltura de promesas asíncronas
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: unknown) => string)
    }
  ) => {
    return sileo.promise(promise, {
      position: 'top-center',
      loading: { title: messages.loading, position: 'top-center' },
      success: (data: T) => ({
        title: typeof messages.success === 'function' ? messages.success(data) : messages.success,
        position: 'top-center',
      }),
      error: (err: unknown) => ({
        title: typeof messages.error === 'function' ? messages.error(err) : messages.error,
        position: 'top-center',
      }),
    })
  },

  dismiss: (id: string) => sileo.dismiss(id),
  clear: () => sileo.clear('top-center'),
}

export { sileo }
