// Standalone /presale route — redirects into the presale section on the home page
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function PresalePage() {
  const navigate = useNavigate()
  useEffect(() => { void navigate('/', { replace: true }) }, [navigate])
  return null
}
