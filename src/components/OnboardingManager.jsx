import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import OnboardingTutorial from './OnboardingTutorial'

function OnboardingManager({ shouldShowAfterTerms = false }) {
  const { user } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const [isReplay, setIsReplay] = useState(false)

  useEffect(() => {
    // Only check if we should show after terms acceptance
    if (shouldShowAfterTerms) {
      checkAndShowOnboarding()
    }
  }, [shouldShowAfterTerms, user])

  const checkAndShowOnboarding = () => {
    const onboardingCompleted = localStorage.getItem('onboardingCompleted')

    // Show tutorial if not completed yet
    if (onboardingCompleted !== 'true') {
      setShowTutorial(true)
      setIsReplay(false)
    }
  }

  const handleClose = () => {
    setShowTutorial(false)
  }

  if (!showTutorial) return null

  return (
    <OnboardingTutorial onClose={handleClose} isReplay={isReplay} />
  )
}

export default OnboardingManager

