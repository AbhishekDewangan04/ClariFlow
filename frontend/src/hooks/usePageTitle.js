import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ClariFlow` : 'ClariFlow'
  }, [title])
}
